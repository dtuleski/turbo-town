// Circuit Builder — surface state, actions, validation, and selectors (component C5).
//
// A plain reducer: no React import, no DOM, no clock, no random source. Every action is validated
// here and nowhere else, so the engine never receives a layout it would reject and the UI always
// has a stable reason code to show.
//
// Rejections are reported as CODES, never messages. Copy lives in the locale files, and nothing
// from the engine's internals is ever surfaced to a player (SECURITY-09).

import {
  MAX_CONNECTION_COUNT,
  MAX_ELEMENT_COUNT,
  MAX_FAULT_COUNT_PER_LEVEL,
  MAX_LIGHT_LEVEL,
  MAX_SOURCE_VOLTAGE,
  MIN_LIGHT_LEVEL,
  MIN_SOURCE_VOLTAGE,
  SOURCE_VOLTAGE_STEP,
  ELEMENT_KINDS,
  compareIdsLocal,
  connectTerminals,
  createElement,
  terminalOf,
} from './circuitEngine'
import type {
  CircuitElement,
  CircuitLayout,
  ElementId,
  ElementKind,
  Environment,
  Fault,
  FaultCode,
  LevelDefinition,
  SwitchState,
  SwitchStates,
} from './circuitEngine'
import type { GridCell } from './circuitBuilderGeometry'

export interface TerminalRef {
  elementId: ElementId
  terminalIndex: 0 | 1
}

export type RejectionCode =
  | 'OUT_OF_BOUNDS'
  | 'CELL_OCCUPIED'
  | 'OVER_BUDGET'
  | 'ELEMENT_LIMIT'
  | 'CONNECTION_LIMIT'
  | 'UNKNOWN_ELEMENT'
  | 'UNKNOWN_CONNECTION'
  | 'ELEMENT_LOCKED'
  | 'NOT_A_SWITCH'
  | 'SELF_CONNECTION'
  | 'DUPLICATE_CONNECTION'
  | 'INVALID_VOLTAGE'
  | 'INVALID_LIGHT_LEVEL'

export interface CircuitMetrics {
  elapsedSeconds: number
  componentCount: number
  faultCount: number
}

export interface CircuitBuilderState {
  /**
   * The level this surface is driving.
   *
   * Held in state because the reducer is pure: `reset` has to rebuild from the level definition
   * and `faultsEvaluated` has to read the level's fault ceiling, and neither can reach outside.
   */
  level: LevelDefinition
  levelId: string
  layout: CircuitLayout
  switches: SwitchStates
  environment: Environment
  fuseBlown: boolean
  /**
   * Monotonic counter bumped by every `resetFuse` that actually clears a blown fuse.
   *
   * The engine reports the same fault codes for the same circuit, so without this an identical
   * short after a reset is indistinguishable from the one already handled. See
   * `selectFaultEffectKey`.
   */
  faultEpoch: number
  metrics: CircuitMetrics
  /** Per-kind placement allowance, from `level.availableComponents`. */
  budget: Partial<Record<ElementKind, number>>
  lockedElementIds: readonly ElementId[]
  nextElementSeq: number
  nextConnectionSeq: number
  /** Stable code for UI feedback. NEVER a message, never engine internals (SECURITY-09). */
  lastRejection: { code: RejectionCode; at: GridCell | null } | null
}

export type CircuitAction =
  | { type: 'place'; kind: ElementKind; cell: GridCell }
  | { type: 'move'; elementId: ElementId; to: GridCell }
  | { type: 'remove'; elementId: ElementId }
  | { type: 'connect'; from: TerminalRef; to: TerminalRef }
  | { type: 'disconnect'; connectionId: string }
  | { type: 'toggleSwitch'; elementId: ElementId }
  | { type: 'setVoltage'; volts: number }
  | { type: 'setLightLevel'; level: number }
  | { type: 'resetFuse' }
  | { type: 'tick'; elapsedSeconds: number }
  | { type: 'reset' }
  | { type: 'faultsEvaluated'; codes: readonly FaultCode[] }

export interface CircuitSubmissionDraft {
  levelId: string
  layout: CircuitLayout
  switches: SwitchStates
  environment: Environment
  completionTime: number
  faultCount: number
}

export interface TrayItem {
  kind: ElementKind
  /** i18n key, never a literal label (NFR-CB-17). */
  labelKey: string
  budget: number
  remaining: number
  disabled: boolean
}

/** Initial supply voltage: mid-range, on the engine's 0.5 V step, and the value U2's hand-verified
 * reference figures use. */
const INITIAL_SOURCE_VOLTAGE = 9

/** Full illumination, so a solar panel works the moment it is wired. */
const INITIAL_LIGHT_LEVEL = 1

/** Faults that blow the fuse. Both mean the circuit as built cannot run. */
const BLOCKING_FAULTS: readonly FaultCode[] = ['SHORT_CIRCUIT', 'SINGULAR_SYSTEM']

function switchEntriesFor(elements: readonly CircuitElement[]): SwitchStates {
  const states: Record<string, SwitchState> = {}
  for (const element of elements) {
    if (element.kind === 'switch') {
      states[element.id] = 'closed'
    }
  }
  return states
}

export function createInitialState(level: LevelDefinition): CircuitBuilderState {
  const elements = [...level.prePlaced]
  return {
    level,
    levelId: level.id,
    layout: { elements, connections: [], gridSize: level.gridSize },
    switches: switchEntriesFor(elements),
    environment: { sourceVoltage: INITIAL_SOURCE_VOLTAGE, lightLevel: INITIAL_LIGHT_LEVEL },
    fuseBlown: false,
    faultEpoch: 0,
    metrics: { elapsedSeconds: 0, componentCount: elements.length, faultCount: 0 },
    budget: { ...level.availableComponents },
    lockedElementIds: [...level.lockedElementIds],
    nextElementSeq: 1,
    nextConnectionSeq: 1,
    lastRejection: null,
  }
}

function reject(
  state: CircuitBuilderState,
  code: RejectionCode,
  at: GridCell | null = null
): CircuitBuilderState {
  return { ...state, lastRejection: { code, at } }
}

/**
 * The single place a successful mutation produces the next state.
 *
 * `componentCount` is recomputed here and only here, so it cannot drift from the layout, and every
 * success clears `lastRejection` in one place rather than in twelve.
 */
function commit(
  state: CircuitBuilderState,
  changes: Partial<CircuitBuilderState> & { layout?: CircuitLayout }
): CircuitBuilderState {
  const layout = changes.layout ?? state.layout
  const metrics = changes.metrics ?? state.metrics
  return {
    ...state,
    ...changes,
    layout,
    metrics: { ...metrics, componentCount: layout.elements.length },
    lastRejection: null,
  }
}

function elementById(state: CircuitBuilderState, id: ElementId): CircuitElement | undefined {
  return state.layout.elements.find((element) => element.id === id)
}

function isInsideGrid(cell: GridCell, state: CircuitBuilderState): boolean {
  return (
    Number.isInteger(cell.col) &&
    Number.isInteger(cell.row) &&
    cell.col >= 0 &&
    cell.row >= 0 &&
    cell.col < state.layout.gridSize.cols &&
    cell.row < state.layout.gridSize.rows
  )
}

export function selectElementAt(
  state: CircuitBuilderState,
  cell: GridCell
): CircuitElement | undefined {
  return state.layout.elements.find(
    (element) => element.position.col === cell.col && element.position.row === cell.row
  )
}

/**
 * How many more of a kind the player may place.
 *
 * Every element of that kind in the layout counts, pre-placed ones included, so the level's
 * declared allowance is a true total and never a per-session top-up.
 */
export function selectRemainingBudget(state: CircuitBuilderState, kind: ElementKind): number {
  const allowance = state.budget[kind] ?? 0
  const placed = state.layout.elements.filter((element) => element.kind === kind).length
  return allowance - placed
}

export function selectTrayItems(state: CircuitBuilderState): readonly TrayItem[] {
  return ELEMENT_KINDS.filter((kind) => state.budget[kind] !== undefined).map((kind) => {
    const remaining = selectRemainingBudget(state, kind)
    return {
      kind,
      labelKey: `circuitBuilder.component.${kind}.name`,
      budget: state.budget[kind] ?? 0,
      remaining,
      disabled: remaining <= 0,
    }
  })
}

/**
 * Exactly what the backend will later receive, minus the session's `gameId`.
 *
 * Elements, connections, and switch keys are sorted so that two play histories which arrive at the
 * same circuit produce byte-identical payloads. The engine is order-independent, so sorting buys
 * nothing there — it matters only here and in the memo key, which is why it is done at those two
 * boundaries and not kept in state.
 */
export function selectSubmissionPayload(state: CircuitBuilderState): CircuitSubmissionDraft {
  const switches: Record<string, SwitchState> = {}
  for (const elementId of Object.keys(state.switches).sort(compareIdsLocal)) {
    const value = state.switches[elementId]
    if (value !== undefined) {
      switches[elementId] = value
    }
  }
  return {
    levelId: state.levelId,
    layout: {
      elements: [...state.layout.elements].sort((left, right) =>
        compareIdsLocal(left.id, right.id)
      ),
      connections: [...state.layout.connections].sort((left, right) =>
        compareIdsLocal(left.id, right.id)
      ),
      gridSize: state.layout.gridSize,
    },
    switches,
    environment: { ...state.environment },
    completionTime: state.metrics.elapsedSeconds,
    faultCount: state.metrics.faultCount,
  }
}

/**
 * A stable key identifying one fault *event*, for the host's post-evaluation effects.
 *
 * The epoch is part of the key because an identical fault set reported after a fuse reset is a
 * NEW event, not the one already handled: the recurrence of a still-wired short IS the lesson
 * (CB-3.8). Keying on the codes alone leaves the key unchanged across a reset, React skips the
 * effect, and the fuse never returns.
 *
 * Each fault contributes its position as well as its code, because a code set alone cannot
 * distinguish one short from a different short with the same codes — so moving a short to a new
 * cell has to produce a new key for the spark to be re-emitted there.
 */
export function selectFaultEffectKey(faultEpoch: number, faults: readonly Fault[]): string {
  const parts = faults.map(
    (fault) =>
      `${fault.code}@${String(fault.atPosition?.col ?? '-')},${String(fault.atPosition?.row ?? '-')}`
  )
  return `${String(faultEpoch)}|${parts.join(';')}`
}

/** Next free `e<n>` id. The loop guards against colliding with a pre-placed element's id, which
 * the engine would reject as a duplicate and which would fail the whole evaluation. */
function nextElementId(state: CircuitBuilderState): { id: ElementId; seq: number } {
  let seq = state.nextElementSeq
  let id = `e${String(seq)}`
  while (state.layout.elements.some((element) => element.id === id)) {
    seq += 1
    id = `e${String(seq)}`
  }
  return { id, seq }
}

function nextConnectionId(state: CircuitBuilderState): { id: string; seq: number } {
  let seq = state.nextConnectionSeq
  let id = `c${String(seq)}`
  while (state.layout.connections.some((connection) => connection.id === id)) {
    seq += 1
    id = `c${String(seq)}`
  }
  return { id, seq }
}

function applyPlace(
  state: CircuitBuilderState,
  kind: ElementKind,
  cell: GridCell
): CircuitBuilderState {
  if (!isInsideGrid(cell, state)) {
    return reject(state, 'OUT_OF_BOUNDS', cell)
  }
  if (selectElementAt(state, cell) !== undefined) {
    return reject(state, 'CELL_OCCUPIED', cell)
  }
  if (selectRemainingBudget(state, kind) <= 0) {
    return reject(state, 'OVER_BUDGET', cell)
  }
  if (state.layout.elements.length >= MAX_ELEMENT_COUNT) {
    return reject(state, 'ELEMENT_LIMIT', cell)
  }

  const { id, seq } = nextElementId(state)
  const element = createElement(kind, {
    id,
    position: { col: cell.col, row: cell.row, rotation: 0 },
  })
  // A switch with no entry reads as OPEN inside the engine, so a switch placed without one would
  // be born dead. Writing 'closed' is what makes a freshly placed switch behave as drawn.
  const switches: SwitchStates =
    kind === 'switch' ? { ...state.switches, [id]: 'closed' } : state.switches

  return commit(state, {
    layout: { ...state.layout, elements: [...state.layout.elements, element] },
    switches,
    nextElementSeq: seq + 1,
  })
}

function applyMove(
  state: CircuitBuilderState,
  elementId: ElementId,
  to: GridCell
): CircuitBuilderState {
  const element = elementById(state, elementId)
  if (element === undefined) {
    return reject(state, 'UNKNOWN_ELEMENT')
  }
  if (state.lockedElementIds.includes(elementId)) {
    return reject(state, 'ELEMENT_LOCKED', to)
  }
  if (!isInsideGrid(to, state)) {
    return reject(state, 'OUT_OF_BOUNDS', to)
  }
  if (element.position.col === to.col && element.position.row === to.row) {
    return state
  }
  const occupant = selectElementAt(state, to)
  if (occupant !== undefined) {
    return reject(state, 'CELL_OCCUPIED', to)
  }

  // Connections are deliberately untouched: connectivity is never inferred from coordinates
  // (FR-CB-4), so moving an element rearranges the picture and not the circuit.
  return commit(state, {
    layout: {
      ...state.layout,
      elements: state.layout.elements.map((candidate) =>
        candidate.id === elementId
          ? {
              ...candidate,
              position: { col: to.col, row: to.row, rotation: candidate.position.rotation },
            }
          : candidate
      ),
    },
  })
}

function applyRemove(state: CircuitBuilderState, elementId: ElementId): CircuitBuilderState {
  const element = elementById(state, elementId)
  if (element === undefined) {
    return reject(state, 'UNKNOWN_ELEMENT')
  }
  if (state.lockedElementIds.includes(elementId)) {
    return reject(state, 'ELEMENT_LOCKED')
  }

  const terminals = new Set<string>(element.terminals)
  const switches = { ...state.switches }
  // A switch entry naming an element that no longer exists invalidates the whole layout inside the
  // engine, so the entry goes with the element.
  delete switches[elementId]

  return commit(state, {
    layout: {
      ...state.layout,
      elements: state.layout.elements.filter((candidate) => candidate.id !== elementId),
      connections: state.layout.connections.filter(
        (connection) => !terminals.has(connection.from) && !terminals.has(connection.to)
      ),
    },
    switches,
  })
}

function applyConnect(
  state: CircuitBuilderState,
  from: TerminalRef,
  to: TerminalRef
): CircuitBuilderState {
  const fromElement = elementById(state, from.elementId)
  const toElement = elementById(state, to.elementId)
  if (fromElement === undefined || toElement === undefined) {
    return reject(state, 'UNKNOWN_ELEMENT')
  }
  // Terminal 0 to terminal 1 of the SAME element is allowed: it is a legal short across one
  // component and a real lesson. Only joining a terminal to itself is refused.
  if (from.elementId === to.elementId && from.terminalIndex === to.terminalIndex) {
    return reject(state, 'SELF_CONNECTION')
  }

  const fromNode = terminalOf(fromElement, from.terminalIndex)
  const toNode = terminalOf(toElement, to.terminalIndex)
  const duplicate = state.layout.connections.some(
    (connection) =>
      (connection.from === fromNode && connection.to === toNode) ||
      (connection.from === toNode && connection.to === fromNode)
  )
  if (duplicate) {
    return reject(state, 'DUPLICATE_CONNECTION')
  }
  if (state.layout.connections.length >= MAX_CONNECTION_COUNT) {
    return reject(state, 'CONNECTION_LIMIT')
  }

  const { id, seq } = nextConnectionId(state)
  return commit(state, {
    layout: {
      ...state.layout,
      connections: [...state.layout.connections, connectTerminals(fromNode, toNode, id)],
    },
    nextConnectionSeq: seq + 1,
  })
}

function applyDisconnect(state: CircuitBuilderState, connectionId: string): CircuitBuilderState {
  if (!state.layout.connections.some((connection) => connection.id === connectionId)) {
    return reject(state, 'UNKNOWN_CONNECTION')
  }
  return commit(state, {
    layout: {
      ...state.layout,
      connections: state.layout.connections.filter(
        (connection) => connection.id !== connectionId
      ),
    },
  })
}

function applyToggleSwitch(state: CircuitBuilderState, elementId: ElementId): CircuitBuilderState {
  const element = elementById(state, elementId)
  if (element === undefined) {
    return reject(state, 'UNKNOWN_ELEMENT')
  }
  if (element.kind !== 'switch') {
    return reject(state, 'NOT_A_SWITCH')
  }
  // An absent entry reads as open inside the engine, so the first toggle of one yields 'closed'.
  const next: SwitchState = state.switches[elementId] === 'closed' ? 'open' : 'closed'
  return commit(state, { switches: { ...state.switches, [elementId]: next } })
}

/**
 * Snap to the control's step, then clamp to the legal range.
 *
 * Clamping rather than rejecting is what "the voltage cannot be set outside the defined safe
 * range" asks for, and it guarantees the environment stays valid for the engine, which validates
 * it on every call even when no source is placed.
 */
function applySetVoltage(state: CircuitBuilderState, volts: number): CircuitBuilderState {
  if (!Number.isFinite(volts)) {
    return reject(state, 'INVALID_VOLTAGE')
  }
  const snapped = Math.round(volts / SOURCE_VOLTAGE_STEP) * SOURCE_VOLTAGE_STEP
  const clamped = Math.min(MAX_SOURCE_VOLTAGE, Math.max(MIN_SOURCE_VOLTAGE, snapped))
  return commit(state, { environment: { ...state.environment, sourceVoltage: clamped } })
}

function applySetLightLevel(state: CircuitBuilderState, level: number): CircuitBuilderState {
  if (!Number.isFinite(level)) {
    return reject(state, 'INVALID_LIGHT_LEVEL')
  }
  const clamped = Math.min(MAX_LIGHT_LEVEL, Math.max(MIN_LIGHT_LEVEL, level))
  return commit(state, { environment: { ...state.environment, lightLevel: clamped } })
}

/**
 * Move the engine's fault report into surface state.
 *
 * The engine reports a fault together with the true currents and never zeroes a shorted circuit,
 * by design, so that the server can re-evaluate the identical layout. Blowing the fuse is this
 * reducer's job, and suppressing the glow is the renderer's.
 *
 * Only the RISING edge counts, so a short that persists across many evaluations is one fault, not
 * one per frame — and returning the same state reference when nothing changed is what keeps the
 * host's dispatch-after-evaluate effect from looping.
 */
function applyFaultsEvaluated(
  state: CircuitBuilderState,
  codes: readonly FaultCode[]
): CircuitBuilderState {
  const blocking = codes.some((code) => BLOCKING_FAULTS.includes(code))
  if (!blocking || state.fuseBlown) {
    return state
  }
  const ceiling = state.level.maxFaultCount ?? MAX_FAULT_COUNT_PER_LEVEL
  return {
    ...state,
    fuseBlown: true,
    metrics: {
      ...state.metrics,
      faultCount: Math.min(state.metrics.faultCount + 1, ceiling),
    },
  }
}

export function circuitReducer(
  state: CircuitBuilderState,
  action: CircuitAction
): CircuitBuilderState {
  switch (action.type) {
    case 'place':
      return applyPlace(state, action.kind, action.cell)
    case 'move':
      return applyMove(state, action.elementId, action.to)
    case 'remove':
      return applyRemove(state, action.elementId)
    case 'connect':
      return applyConnect(state, action.from, action.to)
    case 'disconnect':
      return applyDisconnect(state, action.connectionId)
    case 'toggleSwitch':
      return applyToggleSwitch(state, action.elementId)
    case 'setVoltage':
      return applySetVoltage(state, action.volts)
    case 'setLightLevel':
      return applySetLightLevel(state, action.level)
    case 'resetFuse':
      // The fault has already been counted. Clearing the fuse keeps the attempt alive without
      // erasing what happened. The epoch bump is what lets the host notice that a still-wired
      // short is a NEW event rather than the one it already handled.
      return state.fuseBlown
        ? commit(state, { fuseBlown: false, faultEpoch: state.faultEpoch + 1 })
        : state
    case 'tick': {
      // `tick` and `faultsEvaluated` are the two actions the host dispatches on its own, not in
      // response to the player, so neither clears `lastRejection` — a one-second clock must not
      // erase the feedback for a refused placement before the player has read it.
      const seconds = Math.max(0, Math.floor(action.elapsedSeconds))
      if (!Number.isFinite(seconds) || seconds === state.metrics.elapsedSeconds) {
        return state
      }
      return { ...state, metrics: { ...state.metrics, elapsedSeconds: seconds } }
    }
    case 'reset':
      return createInitialState(state.level)
    case 'faultsEvaluated':
      return applyFaultsEvaluated(state, action.codes)
    default:
      return state
  }
}
