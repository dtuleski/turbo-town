// Circuit Builder — interaction controller (component C2).
//
// Pointer input and keyboard input both pass through a pure resolver here. The two resolvers read
// and write THE SAME `SelectionState` and emit THE SAME `InteractionIntent` union, and
// `intentToAction` is the only route from an intent to a reducer action. That is the structural
// reason the keyboard model a later unit finishes cannot drift into a parallel implementation:
// there is one selection object and one intent vocabulary, and the equivalence is directly
// assertable in a test.
//
// Nothing here touches `window`, `document`, or an event object. The React layer extracts a key, a
// shift flag, and a logical canvas point before calling in.

import type { ElementId, ElementKind } from './circuitEngine'
import type { GridCell, HitTarget, Point } from './circuitBuilderGeometry'
import { TAP_SLOP } from './circuitBuilderGeometry'
import type { CircuitAction, CircuitBuilderState, TerminalRef } from './circuitBuilderState'
import { selectElementAt } from './circuitBuilderState'

export type InteractionIntent =
  | { type: 'selectTrayComponent'; kind: ElementKind }
  | { type: 'placeAt'; cell: GridCell }
  | { type: 'moveElementTo'; elementId: ElementId; cell: GridCell }
  | { type: 'selectElement'; elementId: ElementId }
  | { type: 'beginConnection'; elementId: ElementId; terminalIndex: 0 | 1 }
  | { type: 'completeConnection'; elementId: ElementId; terminalIndex: 0 | 1 }
  | { type: 'removeElement'; elementId: ElementId }
  | { type: 'removeConnection'; connectionId: string }
  | { type: 'toggleSwitch'; elementId: ElementId }
  | { type: 'moveCursor'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'cancel' }

export type DragSource =
  | { from: 'tray'; kind: ElementKind }
  | { from: 'canvas'; elementId: ElementId }

export interface DragState {
  source: DragSource
  /** Logical-canvas point where the press began, for the tap-versus-drag test. */
  origin: Point
  at: Point
  overCell: GridCell | null
  moved: boolean
}

/** ONE object. Both input paths read and write this and nothing else. */
export interface SelectionState {
  armedKind: ElementKind | null
  selectedElementId: ElementId | null
  pendingTerminal: TerminalRef | null
  cursor: GridCell
  drag: DragState | null
}

export type PointerPhase = 'down' | 'move' | 'up' | 'cancel'

/**
 * Whether a pointer phase carries real USER ACTIVATION.
 *
 * `down` and `up` are a press and a release; `move` fires on a plain hover and `cancel` on the
 * pointer leaving the canvas, and neither is an activation a browser will accept.
 *
 * This lives here, next to `PointerPhase`, rather than inside the surface component, because it is
 * the one rule a test can actually reach: `apps/web` has no DOM environment, so a component cannot
 * be rendered, and a predicate is the only form in which "a hover must not unlock audio" can be
 * pinned down. The audio context is created at most once per session and `unlock()` is one-shot by
 * lifecycle state, so spending it on a hover permanently costs the session its sound on any browser
 * that rejects `resume()` outside a gesture (CB-6.5).
 */
export function isActivatingPhase(phase: PointerPhase): boolean {
  return phase === 'down' || phase === 'up'
}

export interface IntentResult {
  selection: SelectionState
  intent: InteractionIntent | null
}

export function createInitialSelection(): SelectionState {
  return {
    armedKind: null,
    selectedElementId: null,
    pendingTerminal: null,
    cursor: { col: 0, row: 0 },
    drag: null,
  }
}

/** The cell a hit implies, when it implies one. Used to keep the keyboard cursor in step with the
 * pointer, so the two input paths genuinely share one position. */
function cellOf(hit: HitTarget): GridCell | null {
  if (hit.kind === 'cell' || hit.kind === 'element' || hit.kind === 'terminal') {
    return hit.cell
  }
  return null
}

function withCursor(selection: SelectionState, hit: HitTarget): SelectionState {
  const cell = cellOf(hit)
  if (cell === null || (cell.col === selection.cursor.col && cell.row === selection.cursor.row)) {
    return selection
  }
  return { ...selection, cursor: cell }
}

/** Everything a cancel drops: the in-flight drag, the half-drawn connection, and the armed tray
 * kind. Escape and a cancelled pointer gesture both land here. */
function clearTransient(selection: SelectionState): SelectionState {
  if (
    selection.drag === null &&
    selection.pendingTerminal === null &&
    selection.armedKind === null
  ) {
    return selection
  }
  return { ...selection, drag: null, pendingTerminal: null, armedKind: null }
}

function pointerDown(point: Point, hit: HitTarget, selection: SelectionState): IntentResult {
  const positioned = withCursor(selection, hit)
  switch (hit.kind) {
    case 'terminal':
      return {
        selection: {
          ...positioned,
          pendingTerminal: { elementId: hit.elementId, terminalIndex: hit.terminalIndex },
        },
        intent: {
          type: 'beginConnection',
          elementId: hit.elementId,
          terminalIndex: hit.terminalIndex,
        },
      }
    case 'element':
      return {
        selection: {
          ...positioned,
          selectedElementId: hit.elementId,
          drag: {
            source: { from: 'canvas', elementId: hit.elementId },
            origin: point,
            at: point,
            overCell: hit.cell,
            moved: false,
          },
        },
        intent: { type: 'selectElement', elementId: hit.elementId },
      }
    default:
      return { selection: positioned, intent: null }
  }
}

function pointerMove(point: Point, hit: HitTarget, selection: SelectionState): IntentResult {
  const drag = selection.drag
  if (drag === null) {
    return { selection, intent: null }
  }
  const travelled = Math.hypot(point.x - drag.origin.x, point.y - drag.origin.y)
  return {
    selection: {
      ...selection,
      drag: {
        ...drag,
        at: point,
        overCell: cellOf(hit),
        moved: drag.moved || travelled > TAP_SLOP,
      },
    },
    intent: null,
  }
}

function pointerUpOnTerminal(
  hit: Extract<HitTarget, { kind: 'terminal' }>,
  selection: SelectionState
): IntentResult {
  const positioned = withCursor(selection, hit)
  const pending = selection.pendingTerminal
  if (pending !== null) {
    const sameTerminal =
      pending.elementId === hit.elementId && pending.terminalIndex === hit.terminalIndex
    return {
      selection: { ...positioned, pendingTerminal: null, drag: null },
      intent: sameTerminal
        ? { type: 'cancel' }
        : {
            type: 'completeConnection',
            elementId: hit.elementId,
            terminalIndex: hit.terminalIndex,
          },
    }
  }
  if (selection.drag !== null) {
    return { selection: { ...positioned, drag: null }, intent: { type: 'cancel' } }
  }
  return { selection: positioned, intent: null }
}

function pointerUpOnElement(
  hit: Extract<HitTarget, { kind: 'element' }>,
  selection: SelectionState
): IntentResult {
  const positioned = withCursor(selection, hit)
  const drag = selection.drag
  if (drag !== null && drag.source.from === 'tray') {
    // Dropped onto an occupied cell. The intent is still emitted so the reducer can refuse it with
    // CELL_OCCUPIED and the player sees why nothing appeared.
    return {
      selection: { ...positioned, drag: null },
      intent: { type: 'placeAt', cell: hit.cell },
    }
  }
  if (drag !== null && drag.source.from === 'canvas' && drag.moved) {
    return {
      selection: { ...positioned, drag: null },
      intent: {
        type: 'moveElementTo',
        elementId: drag.source.elementId,
        cell: hit.cell,
      },
    }
  }
  if (hit.elementKind === 'switch') {
    return {
      selection: { ...positioned, drag: null },
      intent: { type: 'toggleSwitch', elementId: hit.elementId },
    }
  }
  return { selection: drag === null ? positioned : { ...positioned, drag: null }, intent: null }
}

function pointerUpOnCell(
  hit: Extract<HitTarget, { kind: 'cell' }>,
  selection: SelectionState
): IntentResult {
  const positioned = withCursor(selection, hit)
  const drag = selection.drag
  if (drag !== null && drag.source.from === 'tray') {
    return {
      selection: { ...positioned, drag: null },
      intent: { type: 'placeAt', cell: hit.cell },
    }
  }
  if (drag !== null && drag.source.from === 'canvas' && drag.moved) {
    return {
      selection: { ...positioned, drag: null },
      intent: {
        type: 'moveElementTo',
        elementId: drag.source.elementId,
        cell: hit.cell,
      },
    }
  }
  if (drag === null && selection.armedKind !== null) {
    // The tray kind stays armed, so several wires can be placed with single taps.
    return { selection: positioned, intent: { type: 'placeAt', cell: hit.cell } }
  }
  return { selection: drag === null ? positioned : { ...positioned, drag: null }, intent: null }
}

function pointerUp(hit: HitTarget, selection: SelectionState): IntentResult {
  if (hit.kind === 'terminal') {
    return pointerUpOnTerminal(hit, selection)
  }

  // A connection gesture released anywhere other than a terminal is abandoned, and says so. This
  // is the visible feedback for "press on a terminal and release on empty space".
  if (selection.pendingTerminal !== null) {
    return {
      selection: { ...withCursor(selection, hit), pendingTerminal: null, drag: null },
      intent: { type: 'cancel' },
    }
  }

  switch (hit.kind) {
    case 'element':
      return pointerUpOnElement(hit, selection)
    case 'cell':
      return pointerUpOnCell(hit, selection)
    case 'connection':
      if (selection.drag === null) {
        return { selection, intent: { type: 'removeConnection', connectionId: hit.connectionId } }
      }
      return { selection: { ...selection, drag: null }, intent: { type: 'cancel' } }
    default:
      if (selection.drag === null) {
        return { selection, intent: null }
      }
      return { selection: { ...selection, drag: null }, intent: { type: 'cancel' } }
  }
}

export function resolvePointerIntent(
  phase: PointerPhase,
  point: Point,
  hit: HitTarget,
  selection: SelectionState
): IntentResult {
  switch (phase) {
    case 'down':
      return pointerDown(point, hit, selection)
    case 'move':
      return pointerMove(point, hit, selection)
    case 'up':
      return pointerUp(hit, selection)
    default:
      return { selection: clearTransient(selection), intent: { type: 'cancel' } }
  }
}

const ARROW_DIRECTIONS: Readonly<Record<string, 'up' | 'down' | 'left' | 'right'>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

function movedCursor(
  cursor: GridCell,
  direction: 'up' | 'down' | 'left' | 'right',
  state: CircuitBuilderState
): GridCell {
  const { cols, rows } = state.layout.gridSize
  const col = direction === 'left' ? cursor.col - 1 : direction === 'right' ? cursor.col + 1 : cursor.col
  const row = direction === 'up' ? cursor.row - 1 : direction === 'down' ? cursor.row + 1 : cursor.row
  return {
    col: Math.min(cols - 1, Math.max(0, col)),
    row: Math.min(rows - 1, Math.max(0, row)),
  }
}

/**
 * Enter (or Space) on whatever the cursor is over: place, complete a connection, toggle, select.
 *
 * `shift` picks the TARGET terminal exactly as `c` / `Shift+C` picks the SOURCE one — shift means
 * "the second terminal" on both sides of a connection, so there is one convention to learn rather
 * than two. Without it the keyboard could only ever complete on terminal 0, which is a strict
 * subset of the circuits the pointer can build, because a pointer release completes on whichever
 * terminal it landed on.
 *
 * The flag is an argument and nothing more: no field is added to `SelectionState`, no member to
 * `InteractionIntent`, and `intentToAction` is untouched, so the keyboard cannot grow state of its
 * own that the pointer path does not share.
 */
function activateAtCursor(
  selection: SelectionState,
  state: CircuitBuilderState,
  shift: boolean
): IntentResult {
  const element = selectElementAt(state, selection.cursor)

  if (selection.armedKind !== null && element === undefined) {
    return { selection, intent: { type: 'placeAt', cell: selection.cursor } }
  }
  if (selection.pendingTerminal !== null) {
    if (element === undefined) {
      return { selection: { ...selection, pendingTerminal: null }, intent: { type: 'cancel' } }
    }
    return {
      selection: { ...selection, pendingTerminal: null },
      intent: {
        type: 'completeConnection',
        elementId: element.id,
        terminalIndex: shift ? 1 : 0,
      },
    }
  }
  if (element === undefined) {
    return { selection, intent: null }
  }
  if (element.kind === 'switch') {
    return { selection, intent: { type: 'toggleSwitch', elementId: element.id } }
  }
  return {
    selection: { ...selection, selectedElementId: element.id },
    intent: { type: 'selectElement', elementId: element.id },
  }
}

/**
 * Every key the canvas acts on, and therefore every key it must stop the browser from also acting
 * on — Space and the arrows would otherwise scroll the page out from under the player mid-build.
 *
 * It lives beside the resolver rather than in the canvas component because it is input vocabulary,
 * not DOM: it describes what `resolveKeyIntent` responds to. Exporting it makes two properties
 * assertable in a plain test — that the set and the resolver agree, and that `Tab` is NOT a member,
 * so focus can never be trapped inside the canvas.
 */
export const CONSUMED_KEYS: ReadonlySet<string> = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
  ' ',
  'Delete',
  'Backspace',
  'Escape',
  'c',
  'C',
])

/**
 * The keyboard half of the controller.
 *
 * A deliberately small vocabulary — arrows, Enter or Space, `c`, Delete, Escape — and `shift` as
 * the single modifier, which selects the second terminal on both ends of a connection: `Shift+C`
 * starts from terminal 1, `Shift+Enter` completes on terminal 1. Because it returns the same
 * `SelectionState` and the same intents as the pointer path, everything it can do is automatically
 * consistent with the mouse.
 */
export function resolveKeyIntent(
  key: string,
  shift: boolean,
  selection: SelectionState,
  state: CircuitBuilderState
): IntentResult {
  const direction = ARROW_DIRECTIONS[key]
  if (direction !== undefined) {
    return {
      selection: { ...selection, cursor: movedCursor(selection.cursor, direction, state) },
      intent: { type: 'moveCursor', direction },
    }
  }

  if (key === 'Enter' || key === ' ') {
    return activateAtCursor(selection, state, shift)
  }

  if (key === 'c' || key === 'C') {
    const element = selectElementAt(state, selection.cursor)
    if (element === undefined) {
      return { selection, intent: null }
    }
    const terminalIndex: 0 | 1 = shift ? 1 : 0
    return {
      selection: { ...selection, pendingTerminal: { elementId: element.id, terminalIndex } },
      intent: { type: 'beginConnection', elementId: element.id, terminalIndex },
    }
  }

  if (key === 'Delete' || key === 'Backspace') {
    const element = selectElementAt(state, selection.cursor)
    if (element === undefined) {
      return { selection, intent: null }
    }
    return { selection, intent: { type: 'removeElement', elementId: element.id } }
  }

  if (key === 'Escape') {
    return { selection: clearTransient(selection), intent: { type: 'cancel' } }
  }

  // Unmapped: the identical selection object comes back, so the host can skip a state update.
  return { selection, intent: null }
}

/** Arming a tray kind. The same function serves a click, a tap, and Enter on the tray button,
 * because a real `<button>` is focusable and Enter-activated. */
export function resolveTrayIntent(kind: ElementKind, selection: SelectionState): IntentResult {
  return {
    selection: { ...selection, armedKind: kind, pendingTerminal: null },
    intent: { type: 'selectTrayComponent', kind },
  }
}

/**
 * Start an HTML5 or touch drag from the tray.
 *
 * The kind is armed as well as held in the drag, so the tray highlights the right button during
 * the drag and a drag abandoned mid-air leaves the player armed rather than empty-handed.
 */
export function beginTrayDrag(kind: ElementKind, selection: SelectionState): SelectionState {
  return {
    ...selection,
    armedKind: kind,
    pendingTerminal: null,
    drag: {
      source: { from: 'tray', kind },
      origin: { x: -1, y: -1 },
      at: { x: -1, y: -1 },
      overCell: null,
      moved: false,
    },
  }
}

/**
 * The only route from an intent to a reducer action.
 *
 * `selection` must be the selection the intent was resolved FROM, not the one the resolver
 * returned: `completeConnection` reads `pendingTerminal`, which the resolver has already cleared.
 *
 * Returns `null` rather than a half-formed action whenever the premise is missing — nothing armed,
 * nothing pending, or an element id that no longer exists because the layout changed between the
 * frame the player aimed at and this dispatch. Failing closed here means a stale gesture does
 * nothing instead of raising a rejection the player cannot explain.
 */
export function intentToAction(
  intent: InteractionIntent,
  selection: SelectionState,
  state: CircuitBuilderState
): CircuitAction | null {
  const exists = (elementId: ElementId): boolean =>
    state.layout.elements.some((element) => element.id === elementId)

  switch (intent.type) {
    case 'placeAt': {
      const kind =
        selection.drag !== null && selection.drag.source.from === 'tray'
          ? selection.drag.source.kind
          : selection.armedKind
      return kind === null ? null : { type: 'place', kind, cell: intent.cell }
    }
    case 'moveElementTo':
      return exists(intent.elementId)
        ? { type: 'move', elementId: intent.elementId, to: intent.cell }
        : null
    case 'completeConnection': {
      const pending = selection.pendingTerminal
      if (pending === null || !exists(pending.elementId) || !exists(intent.elementId)) {
        return null
      }
      return {
        type: 'connect',
        from: pending,
        to: { elementId: intent.elementId, terminalIndex: intent.terminalIndex },
      }
    }
    case 'removeElement':
      return exists(intent.elementId) ? { type: 'remove', elementId: intent.elementId } : null
    case 'removeConnection':
      return state.layout.connections.some((connection) => connection.id === intent.connectionId)
        ? { type: 'disconnect', connectionId: intent.connectionId }
        : null
    case 'toggleSwitch':
      return exists(intent.elementId)
        ? { type: 'toggleSwitch', elementId: intent.elementId }
        : null
    default:
      // selectTrayComponent, selectElement, beginConnection, moveCursor, cancel change the
      // selection only. They are not circuit edits.
      return null
  }
}
