// Playtest repro: a correct Level 1 ring must read as energised, wiring must work from taps alone,
// and a second wire on an already-wired terminal must not be refused as a duplicate.
import { describe, expect, it } from 'vitest'
import {
  cellToPoint,
  computeViewport,
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  hitTest,
  terminalAnchor,
} from '../circuitBuilderGeometry'
import type { GridCell, Viewport } from '../circuitBuilderGeometry'
import { createInitialSelection, intentToAction, resolvePointerIntent } from '../circuitBuilderInteraction'
import type { PointerPhase, SelectionState } from '../circuitBuilderInteraction'
import { circuitReducer, createInitialState } from '../circuitBuilderState'
import type { CircuitAction, CircuitBuilderState } from '../circuitBuilderState'
import { evaluateMemoized, getLevel, isCircuitResult } from '../circuitEngine'
import type { LevelDefinition } from '../circuitEngine'

const LEVEL1 = getLevel('cb-01-closed-circuit') as LevelDefinition
const VIEWPORT: Viewport = computeViewport(
  { width: CIRCUIT_CANVAS_WIDTH, height: CIRCUIT_CANVAS_HEIGHT },
  LEVEL1.gridSize
)
const CELLS: Record<string, GridCell> = {
  e1: { col: 1, row: 1 }, // battery
  e2: { col: 3, row: 1 }, // resistor
  e3: { col: 5, row: 1 }, // led
}

function build(): CircuitBuilderState {
  const place = (kind: 'battery' | 'resistor' | 'led', cell: GridCell): CircuitAction => ({
    type: 'place',
    kind,
    cell,
  })
  return [place('battery', CELLS.e1), place('resistor', CELLS.e2), place('led', CELLS.e3)].reduce(
    circuitReducer,
    createInitialState(LEVEL1)
  )
}

function connect(
  state: CircuitBuilderState,
  a: [string, 0 | 1],
  b: [string, 0 | 1]
): CircuitBuilderState {
  return circuitReducer(state, {
    type: 'connect',
    from: { elementId: a[0], terminalIndex: a[1] },
    to: { elementId: b[0], terminalIndex: b[1] },
  })
}

function energised(state: CircuitBuilderState): boolean {
  const outcome = evaluateMemoized(state.layout, state.switches, state.environment)
  return isCircuitResult(outcome) && outcome.elements.some((item) => item.energized)
}

/** Drives the real pointer pipeline: hit test, resolver, intent mapping, reducer. */
function pointer(
  session: { state: CircuitBuilderState; selection: SelectionState },
  phase: PointerPhase,
  elementId: string,
  terminalIndex: 0 | 1
) {
  const element = session.state.layout.elements.find((item) => item.id === elementId)
  if (element === undefined) throw new Error('missing element')
  const point = terminalAnchor(element, terminalIndex, VIEWPORT)
  const hit = hitTest(point, session.state.layout, VIEWPORT)
  const resolved = resolvePointerIntent(phase, point, hit, session.selection)
  const action =
    resolved.intent === null ? null : intentToAction(resolved.intent, session.selection, session.state)
  return {
    state: action === null ? session.state : circuitReducer(session.state, action),
    selection: resolved.selection,
  }
}

function tap(
  session: { state: CircuitBuilderState; selection: SelectionState },
  elementId: string,
  terminalIndex: 0 | 1
) {
  return pointer(pointer(session, 'down', elementId, terminalIndex), 'up', elementId, terminalIndex)
}

describe('Level 1 ring (playtest repro)', () => {
  it('energises when wired in the forward direction', () => {
    let state = build()
    state = connect(state, ['e1', 0], ['e2', 0])
    state = connect(state, ['e2', 1], ['e3', 0])
    state = connect(state, ['e3', 1], ['e1', 1])
    expect(state.lastRejection).toBeNull()
    expect(energised(state)).toBe(true)
  })

  it('allows a second wire on a terminal that already has one', () => {
    let state = build()
    state = connect(state, ['e1', 0], ['e2', 0])
    state = connect(state, ['e1', 0], ['e3', 1])
    expect(state.lastRejection).toBeNull()
    expect(state.layout.connections).toHaveLength(2)
  })

  it('refuses only the same pair, in either order', () => {
    let state = connect(build(), ['e1', 0], ['e2', 0])
    state = connect(state, ['e2', 0], ['e1', 0])
    expect(state.lastRejection?.code).toBe('DUPLICATE_CONNECTION')
  })

  it('wires the whole ring with taps alone (tap a dot, then tap another dot)', () => {
    let session = { state: build(), selection: createInitialSelection() }
    session = tap(session, 'e1', 0)
    session = tap(session, 'e2', 0)
    session = tap(session, 'e2', 1)
    session = tap(session, 'e3', 0)
    session = tap(session, 'e3', 1)
    session = tap(session, 'e1', 1)
    expect(session.state.lastRejection).toBeNull()
    expect(session.state.layout.connections).toHaveLength(3)
    expect(energised(session.state)).toBe(true)
  })

  it('still wires by dragging from one dot to another', () => {
    let session = { state: build(), selection: createInitialSelection() }
    session = pointer(session, 'down', 'e1', 0)
    session = pointer(session, 'up', 'e2', 0)
    expect(session.state.layout.connections).toHaveLength(1)
  })

  it('cellToPoint is used', () => {
    expect(cellToPoint(CELLS.e1, VIEWPORT).x).toBeGreaterThan(0)
  })
})
