import { beforeEach, describe, expect, it } from 'vitest'
import {
  CONSUMED_KEYS,
  beginTrayDrag,
  createInitialSelection,
  intentToAction,
  resolveKeyIntent,
  resolvePointerIntent,
  resolveTrayIntent,
} from '../circuitBuilderInteraction'
import type { SelectionState } from '../circuitBuilderInteraction'
import {
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  TAP_SLOP,
  cellToPoint,
  computeViewport,
} from '../circuitBuilderGeometry'
import type { GridCell, HitTarget, Viewport } from '../circuitBuilderGeometry'
import { circuitReducer, createInitialState } from '../circuitBuilderState'
import type { CircuitAction, CircuitBuilderState } from '../circuitBuilderState'
import {
  MIN_VISIBLE_INTENSITY,
  clearEngineMemo,
  evaluateMemoized,
  getLevel,
  isCircuitResult,
} from '../circuitEngine'
import type { ElementKind, LevelDefinition } from '../circuitEngine'

function levelOrThrow(id: string): LevelDefinition {
  const level = getLevel(id)
  if (level === undefined) {
    throw new Error(`fixture level ${id} is missing from the engine registry`)
  }
  return level
}

const SANDBOX = levelOrThrow('sandbox')
const VIEWPORT: Viewport = computeViewport(
  { width: CIRCUIT_CANVAS_WIDTH, height: CIRCUIT_CANVAS_HEIGHT },
  SANDBOX.gridSize
)

function stateWith(...actions: readonly CircuitAction[]): CircuitBuilderState {
  return actions.reduce(circuitReducer, createInitialState(SANDBOX))
}

function selectionAt(cell: GridCell, overrides: Partial<SelectionState> = {}): SelectionState {
  return { ...createInitialSelection(), cursor: cell, ...overrides }
}

function cellHit(cell: GridCell): HitTarget {
  return { kind: 'cell', cell }
}

function elementHit(elementId: string, cell: GridCell, elementKind: ElementKind): HitTarget {
  return { kind: 'element', elementId, cell, elementKind }
}

function terminalHit(
  elementId: string,
  cell: GridCell,
  elementKind: ElementKind,
  terminalIndex: 0 | 1
): HitTarget {
  return { kind: 'terminal', elementId, terminalIndex, cell, elementKind }
}

// ---------------------------------------------------------------------------
// The headline guarantee: one selection object, one intent vocabulary.
// ---------------------------------------------------------------------------

describe('pointer and keyboard are the same model', () => {
  it('place: a tap on an armed empty cell equals Enter on an armed cursor cell', () => {
    const cell: GridCell = { col: 4, row: 3 }
    const state = stateWith()
    const selection = selectionAt(cell, { armedKind: 'wire' })

    const pointer = resolvePointerIntent('up', cellToPoint(cell, VIEWPORT), cellHit(cell), selection)
    const keyboard = resolveKeyIntent('Enter', false, selection, state)

    expect(pointer.intent).toEqual(keyboard.intent)
    expect(pointer.intent).toEqual({ type: 'placeAt', cell })
    expect(pointer.selection).toEqual(keyboard.selection)
    expect(intentToAction(pointer.intent ?? { type: 'cancel' }, selection, state)).toEqual(
      intentToAction(keyboard.intent ?? { type: 'cancel' }, selection, state)
    )
  })

  it('toggle: a tap on a switch equals Enter on a switch under the cursor', () => {
    const cell: GridCell = { col: 2, row: 2 }
    const state = stateWith({ type: 'place', kind: 'switch', cell })
    const toggle = state.layout.elements[0]
    if (toggle === undefined) {
      throw new Error('fixture setup failed')
    }
    const selection = selectionAt(cell)

    const pointer = resolvePointerIntent(
      'up',
      cellToPoint(cell, VIEWPORT),
      elementHit(toggle.id, cell, 'switch'),
      selection
    )
    const keyboard = resolveKeyIntent('Enter', false, selection, state)

    expect(pointer.intent).toEqual(keyboard.intent)
    expect(pointer.intent).toEqual({ type: 'toggleSwitch', elementId: toggle.id })
    expect(pointer.selection).toEqual(keyboard.selection)
  })

  it('connect: releasing on a terminal equals Enter over the target element', () => {
    const fromCell: GridCell = { col: 1, row: 1 }
    const toCell: GridCell = { col: 3, row: 1 }
    const state = stateWith(
      { type: 'place', kind: 'battery', cell: fromCell },
      { type: 'place', kind: 'led', cell: toCell }
    )
    const [source, lamp] = state.layout.elements
    if (source === undefined || lamp === undefined) {
      throw new Error('fixture setup failed')
    }
    const selection = selectionAt(toCell, {
      pendingTerminal: { elementId: source.id, terminalIndex: 1 },
    })

    const pointer = resolvePointerIntent(
      'up',
      cellToPoint(toCell, VIEWPORT),
      terminalHit(lamp.id, toCell, 'led', 0),
      selection
    )
    const keyboard = resolveKeyIntent('Enter', false, selection, state)

    expect(pointer.intent).toEqual(keyboard.intent)
    expect(pointer.intent).toEqual({ type: 'completeConnection', elementId: lamp.id, terminalIndex: 0 })
    expect(pointer.selection).toEqual(keyboard.selection)
    expect(pointer.selection.pendingTerminal).toBeNull()
    expect(intentToAction(pointer.intent ?? { type: 'cancel' }, selection, state)).toEqual({
      type: 'connect',
      from: { elementId: source.id, terminalIndex: 1 },
      to: { elementId: lamp.id, terminalIndex: 0 },
    })
  })

  // Without Shift+Enter the keyboard could only ever complete on terminal 0, so a keyboard player
  // could build a strict subset of the circuits a pointer player can. These two cases are the
  // proof that the subset is gone: the shift flag is the only difference between them.
  it('connect: Shift+Enter over the target equals a pointer release on that target\u2019s terminal 1', () => {
    const fromCell: GridCell = { col: 1, row: 1 }
    const toCell: GridCell = { col: 3, row: 1 }
    const state = stateWith(
      { type: 'place', kind: 'battery', cell: fromCell },
      { type: 'place', kind: 'led', cell: toCell }
    )
    const [source, lamp] = state.layout.elements
    if (source === undefined || lamp === undefined) {
      throw new Error('fixture setup failed')
    }
    const selection = selectionAt(toCell, {
      pendingTerminal: { elementId: source.id, terminalIndex: 0 },
    })

    const pointer = resolvePointerIntent(
      'up',
      cellToPoint(toCell, VIEWPORT),
      terminalHit(lamp.id, toCell, 'led', 1),
      selection
    )
    const keyboard = resolveKeyIntent('Enter', true, selection, state)

    expect(pointer.intent).toEqual(keyboard.intent)
    expect(keyboard.intent).toEqual({
      type: 'completeConnection',
      elementId: lamp.id,
      terminalIndex: 1,
    })
    expect(pointer.selection).toEqual(keyboard.selection)
    expect(keyboard.selection.pendingTerminal).toBeNull()

    const expected = {
      type: 'connect',
      from: { elementId: source.id, terminalIndex: 0 },
      to: { elementId: lamp.id, terminalIndex: 1 },
    }
    expect(intentToAction(keyboard.intent ?? { type: 'cancel' }, selection, state)).toEqual(expected)
    expect(intentToAction(pointer.intent ?? { type: 'cancel' }, selection, state)).toEqual(expected)
  })

  it('connect: from one pending selection, Enter reaches terminal 0 and Shift+Enter terminal 1', () => {
    const fromCell: GridCell = { col: 1, row: 1 }
    const toCell: GridCell = { col: 3, row: 1 }
    const state = stateWith(
      { type: 'place', kind: 'battery', cell: fromCell },
      { type: 'place', kind: 'led', cell: toCell }
    )
    const [source, lamp] = state.layout.elements
    if (source === undefined || lamp === undefined) {
      throw new Error('fixture setup failed')
    }
    const selection = selectionAt(toCell, {
      pendingTerminal: { elementId: source.id, terminalIndex: 0 },
    })

    for (const [shift, terminalIndex] of [
      [false, 0],
      [true, 1],
    ] as const) {
      const keyboard = resolveKeyIntent('Enter', shift, selection, state)
      const pointer = resolvePointerIntent(
        'up',
        cellToPoint(toCell, VIEWPORT),
        terminalHit(lamp.id, toCell, 'led', terminalIndex),
        selection
      )
      expect(keyboard.intent).toEqual({
        type: 'completeConnection',
        elementId: lamp.id,
        terminalIndex,
      })
      expect(intentToAction(keyboard.intent ?? { type: 'cancel' }, selection, state)).toEqual(
        intentToAction(pointer.intent ?? { type: 'cancel' }, selection, state)
      )
    }
  })

  it('Shift+Enter with nothing pending is a selection, never a half-formed connection', () => {
    const cell: GridCell = { col: 3, row: 1 }
    const state = stateWith({ type: 'place', kind: 'led', cell })
    const lamp = state.layout.elements[0]
    if (lamp === undefined) {
      throw new Error('fixture setup failed')
    }
    const selection = selectionAt(cell)
    expect(selection.pendingTerminal).toBeNull()

    const keyboard = resolveKeyIntent('Enter', true, selection, state)
    expect(keyboard.intent).toEqual({ type: 'selectElement', elementId: lamp.id })
    expect(intentToAction(keyboard.intent ?? { type: 'cancel' }, selection, state)).toBeNull()
    // And the premise check in `intentToAction` is the second lock: even handed the completion
    // intent directly, with nothing pending there is no action to produce.
    expect(
      intentToAction(
        { type: 'completeConnection', elementId: lamp.id, terminalIndex: 1 },
        selection,
        state
      )
    ).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// The consumed-key vocabulary, and the no-focus-trap guard
// ---------------------------------------------------------------------------

describe('CONSUMED_KEYS', () => {
  const cell: GridCell = { col: 2, row: 2 }
  const state = stateWith({ type: 'place', kind: 'switch', cell })
  // A switch under the cursor makes every branch of the resolver reachable from one selection:
  // arrows move, Enter and Space toggle, c and C begin a connection, Delete and Backspace remove,
  // Escape cancels.
  const selection = selectionAt(cell)

  function actsOn(key: string): boolean {
    const resolved = resolveKeyIntent(key, false, selection, state)
    return resolved.intent !== null || resolved.selection !== selection
  }

  it('contains every key the resolver acts on', () => {
    for (const key of CONSUMED_KEYS) {
      expect(actsOn(key)).toBe(true)
    }
  })

  it('does not contain Tab, so focus can never be trapped in the canvas', () => {
    expect(CONSUMED_KEYS.has('Tab')).toBe(false)
    expect(actsOn('Tab')).toBe(false)
  })

  it('leaves every other key to the browser', () => {
    for (const key of ['Tab', 'q', 'F5', 'Home', 'End', 'PageDown', 'Shift', 'z']) {
      expect(CONSUMED_KEYS.has(key)).toBe(false)
      expect(actsOn(key)).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// Tap-then-tap, the touch fallback
// ---------------------------------------------------------------------------

describe('tap to arm, tap to place', () => {
  it('arms a tray kind and keeps it armed after a placement', () => {
    const armed = resolveTrayIntent('wire', createInitialSelection())
    expect(armed.intent).toEqual({ type: 'selectTrayComponent', kind: 'wire' })
    expect(armed.selection.armedKind).toBe('wire')

    const cell: GridCell = { col: 5, row: 5 }
    const down = resolvePointerIntent('down', cellToPoint(cell, VIEWPORT), cellHit(cell), armed.selection)
    expect(down.intent).toBeNull()

    const up = resolvePointerIntent('up', cellToPoint(cell, VIEWPORT), cellHit(cell), down.selection)
    expect(up.intent).toEqual({ type: 'placeAt', cell })
    // Still armed, so several wires can be placed with single taps.
    expect(up.selection.armedKind).toBe('wire')
  })

  it('moves the shared cursor to the tapped cell', () => {
    const armed = resolveTrayIntent('wire', createInitialSelection())
    const cell: GridCell = { col: 9, row: 4 }
    const up = resolvePointerIntent('up', cellToPoint(cell, VIEWPORT), cellHit(cell), armed.selection)
    expect(up.selection.cursor).toEqual(cell)
  })

  it('Escape disarms and reports a cancel', () => {
    const armed = resolveTrayIntent('led', createInitialSelection())
    const escaped = resolveKeyIntent('Escape', false, armed.selection, stateWith())
    expect(escaped.intent).toEqual({ type: 'cancel' })
    expect(escaped.selection.armedKind).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

describe('drawing a connection', () => {
  const fromCell: GridCell = { col: 1, row: 1 }
  const toCell: GridCell = { col: 3, row: 1 }

  function twoElements(): {
    state: CircuitBuilderState
    sourceId: string
    lampId: string
  } {
    const state = stateWith(
      { type: 'place', kind: 'battery', cell: fromCell },
      { type: 'place', kind: 'led', cell: toCell }
    )
    const [source, lamp] = state.layout.elements
    if (source === undefined || lamp === undefined) {
      throw new Error('fixture setup failed')
    }
    return { state, sourceId: source.id, lampId: lamp.id }
  }

  it('starts on a terminal and completes on a different one', () => {
    const { sourceId, lampId } = twoElements()
    const down = resolvePointerIntent(
      'down',
      cellToPoint(fromCell, VIEWPORT),
      terminalHit(sourceId, fromCell, 'battery', 1),
      createInitialSelection()
    )
    expect(down.intent).toEqual({ type: 'beginConnection', elementId: sourceId, terminalIndex: 1 })
    expect(down.selection.pendingTerminal).toEqual({ elementId: sourceId, terminalIndex: 1 })

    const up = resolvePointerIntent(
      'up',
      cellToPoint(toCell, VIEWPORT),
      terminalHit(lampId, toCell, 'led', 0),
      down.selection
    )
    expect(up.intent).toEqual({ type: 'completeConnection', elementId: lampId, terminalIndex: 0 })
    expect(up.selection.pendingTerminal).toBeNull()
  })

  it('abandons the attempt when released on empty space, with feedback', () => {
    const { sourceId } = twoElements()
    const down = resolvePointerIntent(
      'down',
      cellToPoint(fromCell, VIEWPORT),
      terminalHit(sourceId, fromCell, 'battery', 1),
      createInitialSelection()
    )
    const empty: GridCell = { col: 7, row: 7 }
    const up = resolvePointerIntent('up', cellToPoint(empty, VIEWPORT), cellHit(empty), down.selection)
    expect(up.intent).toEqual({ type: 'cancel' })
    expect(up.selection.pendingTerminal).toBeNull()
  })

  it('reports a cancel when released on the terminal it started from', () => {
    const { sourceId } = twoElements()
    const down = resolvePointerIntent(
      'down',
      cellToPoint(fromCell, VIEWPORT),
      terminalHit(sourceId, fromCell, 'battery', 1),
      createInitialSelection()
    )
    const up = resolvePointerIntent(
      'up',
      cellToPoint(fromCell, VIEWPORT),
      terminalHit(sourceId, fromCell, 'battery', 1),
      down.selection
    )
    expect(up.intent).toEqual({ type: 'cancel' })
    expect(up.selection.pendingTerminal).toBeNull()
  })

  it('arms a connection from the keyboard, with shift picking the second terminal', () => {
    const { state, sourceId } = twoElements()
    const selection = selectionAt(fromCell)
    expect(resolveKeyIntent('c', false, selection, state).intent).toEqual({
      type: 'beginConnection',
      elementId: sourceId,
      terminalIndex: 0,
    })
    expect(resolveKeyIntent('C', true, selection, state).intent).toEqual({
      type: 'beginConnection',
      elementId: sourceId,
      terminalIndex: 1,
    })
  })
})

// ---------------------------------------------------------------------------
// Drag lifecycle
// ---------------------------------------------------------------------------

describe('drag versus tap', () => {
  const cell: GridCell = { col: 2, row: 2 }
  const elsewhere: GridCell = { col: 6, row: 6 }

  function withSwitch(): { state: CircuitBuilderState; id: string } {
    const state = stateWith({ type: 'place', kind: 'switch', cell })
    const element = state.layout.elements[0]
    if (element === undefined) {
      throw new Error('fixture setup failed')
    }
    return { state, id: element.id }
  }

  it('a press and release inside the slop is a tap, which toggles a switch', () => {
    const { id } = withSwitch()
    const origin = cellToPoint(cell, VIEWPORT)
    const down = resolvePointerIntent('down', origin, elementHit(id, cell, 'switch'), createInitialSelection())
    expect(down.intent).toEqual({ type: 'selectElement', elementId: id })
    expect(down.selection.drag?.moved).toBe(false)

    const nudged = resolvePointerIntent(
      'move',
      { x: origin.x + TAP_SLOP - 1, y: origin.y },
      elementHit(id, cell, 'switch'),
      down.selection
    )
    expect(nudged.selection.drag?.moved).toBe(false)

    const up = resolvePointerIntent('up', origin, elementHit(id, cell, 'switch'), nudged.selection)
    expect(up.intent).toEqual({ type: 'toggleSwitch', elementId: id })
    expect(up.selection.drag).toBeNull()
  })

  it('a press and release beyond the slop is a move', () => {
    const { state, id } = withSwitch()
    const origin = cellToPoint(cell, VIEWPORT)
    const down = resolvePointerIntent('down', origin, elementHit(id, cell, 'switch'), createInitialSelection())
    const dragged = resolvePointerIntent(
      'move',
      cellToPoint(elsewhere, VIEWPORT),
      cellHit(elsewhere),
      down.selection
    )
    expect(dragged.selection.drag?.moved).toBe(true)
    expect(dragged.selection.drag?.overCell).toEqual(elsewhere)

    const up = resolvePointerIntent(
      'up',
      cellToPoint(elsewhere, VIEWPORT),
      cellHit(elsewhere),
      dragged.selection
    )
    expect(up.intent).toEqual({ type: 'moveElementTo', elementId: id, cell: elsewhere })
    expect(up.selection.drag).toBeNull()
    expect(intentToAction(up.intent ?? { type: 'cancel' }, dragged.selection, state)).toEqual({
      type: 'move',
      elementId: id,
      to: elsewhere,
    })
  })

  it('a tray drag dropped on a cell places, and dropped on an occupied cell still places so the reducer can refuse it', () => {
    const state = stateWith({ type: 'place', kind: 'battery', cell })
    const occupant = state.layout.elements[0]
    if (occupant === undefined) {
      throw new Error('fixture setup failed')
    }

    const dragging = beginTrayDrag('led', createInitialSelection())
    expect(dragging.drag?.source).toEqual({ from: 'tray', kind: 'led' })

    const onEmpty = resolvePointerIntent(
      'up',
      cellToPoint(elsewhere, VIEWPORT),
      cellHit(elsewhere),
      dragging
    )
    expect(onEmpty.intent).toEqual({ type: 'placeAt', cell: elsewhere })
    expect(intentToAction(onEmpty.intent ?? { type: 'cancel' }, dragging, state)).toEqual({
      type: 'place',
      kind: 'led',
      cell: elsewhere,
    })

    const onOccupied = resolvePointerIntent(
      'up',
      cellToPoint(cell, VIEWPORT),
      elementHit(occupant.id, cell, 'battery'),
      dragging
    )
    expect(onOccupied.intent).toEqual({ type: 'placeAt', cell })
    const refused = circuitReducer(
      state,
      intentToAction(onOccupied.intent ?? { type: 'cancel' }, dragging, state) ?? { type: 'resetFuse' }
    )
    expect(refused.lastRejection?.code).toBe('CELL_OCCUPIED')
  })

  it('the cancel phase clears both the drag and the pending terminal', () => {
    const { id } = withSwitch()
    const origin = cellToPoint(cell, VIEWPORT)
    const down = resolvePointerIntent('down', origin, elementHit(id, cell, 'switch'), createInitialSelection())
    const armed: SelectionState = {
      ...down.selection,
      pendingTerminal: { elementId: id, terminalIndex: 0 },
      armedKind: 'wire',
    }
    const cancelled = resolvePointerIntent('cancel', origin, cellHit(cell), armed)
    expect(cancelled.intent).toEqual({ type: 'cancel' })
    expect(cancelled.selection.drag).toBeNull()
    expect(cancelled.selection.pendingTerminal).toBeNull()
    expect(cancelled.selection.armedKind).toBeNull()
  })

  it('a tap on a connection removes it', () => {
    const state = stateWith(
      { type: 'place', kind: 'battery', cell: { col: 1, row: 1 } },
      { type: 'place', kind: 'led', cell: { col: 3, row: 1 } }
    )
    const [source, lamp] = state.layout.elements
    if (source === undefined || lamp === undefined) {
      throw new Error('fixture setup failed')
    }
    const joined = circuitReducer(state, {
      type: 'connect',
      from: { elementId: source.id, terminalIndex: 1 },
      to: { elementId: lamp.id, terminalIndex: 0 },
    })
    const connectionId = joined.layout.connections[0]?.id ?? ''

    const up = resolvePointerIntent(
      'up',
      cellToPoint({ col: 2, row: 1 }, VIEWPORT),
      { kind: 'connection', connectionId },
      createInitialSelection()
    )
    expect(up.intent).toEqual({ type: 'removeConnection', connectionId })
    expect(intentToAction(up.intent ?? { type: 'cancel' }, createInitialSelection(), joined)).toEqual({
      type: 'disconnect',
      connectionId,
    })
  })
})

// ---------------------------------------------------------------------------
// Keyboard cursor
// ---------------------------------------------------------------------------

describe('keyboard cursor', () => {
  const state = stateWith()

  it('moves one cell per arrow press', () => {
    const start = selectionAt({ col: 5, row: 5 })
    expect(resolveKeyIntent('ArrowUp', false, start, state).selection.cursor).toEqual({ col: 5, row: 4 })
    expect(resolveKeyIntent('ArrowDown', false, start, state).selection.cursor).toEqual({ col: 5, row: 6 })
    expect(resolveKeyIntent('ArrowLeft', false, start, state).selection.cursor).toEqual({ col: 4, row: 5 })
    expect(resolveKeyIntent('ArrowRight', false, start, state).selection.cursor).toEqual({ col: 6, row: 5 })
    expect(resolveKeyIntent('ArrowUp', false, start, state).intent).toEqual({
      type: 'moveCursor',
      direction: 'up',
    })
  })

  it('clamps at all four edges', () => {
    const { cols, rows } = state.layout.gridSize
    const topLeft = selectionAt({ col: 0, row: 0 })
    expect(resolveKeyIntent('ArrowUp', false, topLeft, state).selection.cursor).toEqual({ col: 0, row: 0 })
    expect(resolveKeyIntent('ArrowLeft', false, topLeft, state).selection.cursor).toEqual({ col: 0, row: 0 })

    const bottomRight = selectionAt({ col: cols - 1, row: rows - 1 })
    expect(resolveKeyIntent('ArrowDown', false, bottomRight, state).selection.cursor).toEqual({
      col: cols - 1,
      row: rows - 1,
    })
    expect(resolveKeyIntent('ArrowRight', false, bottomRight, state).selection.cursor).toEqual({
      col: cols - 1,
      row: rows - 1,
    })
  })

  it('deletes the element under the cursor', () => {
    const cell: GridCell = { col: 4, row: 4 }
    const placed = stateWith({ type: 'place', kind: 'motor', cell })
    const id = placed.layout.elements[0]?.id ?? ''
    expect(resolveKeyIntent('Delete', false, selectionAt(cell), placed).intent).toEqual({
      type: 'removeElement',
      elementId: id,
    })
    expect(resolveKeyIntent('Backspace', false, selectionAt(cell), placed).intent).toEqual({
      type: 'removeElement',
      elementId: id,
    })
    expect(resolveKeyIntent('Delete', false, selectionAt({ col: 9, row: 9 }), placed).intent).toBeNull()
  })

  it('returns the identical selection object for an unmapped key', () => {
    const selection = selectionAt({ col: 3, row: 3 })
    const result = resolveKeyIntent('q', false, selection, state)
    expect(result.intent).toBeNull()
    expect(result.selection).toBe(selection)
  })

  it('selects a non-switch element under the cursor', () => {
    const cell: GridCell = { col: 2, row: 6 }
    const placed = stateWith({ type: 'place', kind: 'buzzer', cell })
    const id = placed.layout.elements[0]?.id ?? ''
    const result = resolveKeyIntent('Enter', false, selectionAt(cell), placed)
    expect(result.intent).toEqual({ type: 'selectElement', elementId: id })
    expect(result.selection.selectedElementId).toBe(id)
  })
})

// ---------------------------------------------------------------------------
// intentToAction fails closed
// ---------------------------------------------------------------------------

describe('intentToAction', () => {
  const state = stateWith()

  it('refuses to place with nothing armed', () => {
    expect(
      intentToAction({ type: 'placeAt', cell: { col: 1, row: 1 } }, createInitialSelection(), state)
    ).toBeNull()
  })

  it('refuses to connect with nothing pending', () => {
    expect(
      intentToAction(
        { type: 'completeConnection', elementId: 'e1', terminalIndex: 0 },
        createInitialSelection(),
        state
      )
    ).toBeNull()
  })

  it('refuses an action naming an element that no longer exists', () => {
    const selection = selectionAt({ col: 1, row: 1 })
    expect(intentToAction({ type: 'removeElement', elementId: 'gone' }, selection, state)).toBeNull()
    expect(
      intentToAction({ type: 'moveElementTo', elementId: 'gone', cell: { col: 2, row: 2 } }, selection, state)
    ).toBeNull()
    expect(intentToAction({ type: 'toggleSwitch', elementId: 'gone' }, selection, state)).toBeNull()
    expect(intentToAction({ type: 'removeConnection', connectionId: 'gone' }, selection, state)).toBeNull()
  })

  it('maps selection-only intents to no action at all', () => {
    const selection = selectionAt({ col: 1, row: 1 }, { armedKind: 'wire' })
    expect(intentToAction({ type: 'selectTrayComponent', kind: 'wire' }, selection, state)).toBeNull()
    expect(intentToAction({ type: 'selectElement', elementId: 'e1' }, selection, state)).toBeNull()
    expect(intentToAction({ type: 'beginConnection', elementId: 'e1', terminalIndex: 0 }, selection, state)).toBeNull()
    expect(intentToAction({ type: 'moveCursor', direction: 'up' }, selection, state)).toBeNull()
    expect(intentToAction({ type: 'cancel' }, selection, state)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// The automatable half of CB-6.1: an Easy level completed without a pointer.
//
// Nothing but `resolveTrayIntent`, `resolveKeyIntent` and `intentToAction` folded through
// `circuitReducer` — the same three functions the component calls — and the real engine passes
// judgement at the end. The human half of CB-6.1 (focus visibility, real browser key events, tab
// order) stays manual.
// ---------------------------------------------------------------------------

describe('a full Easy level by keyboard alone', () => {
  beforeEach(() => {
    clearEngineMemo()
  })

  interface Session {
    state: CircuitBuilderState
    selection: SelectionState
  }

  /** One key press, end to end: resolve, map, reduce. The reducer only ever sees what
   * `intentToAction` produced, so a key that maps to nothing changes no circuit. */
  function press(session: Session, key: string, shift = false): Session {
    const resolved = resolveKeyIntent(key, shift, session.selection, session.state)
    const action =
      resolved.intent === null
        ? null
        : intentToAction(resolved.intent, session.selection, session.state)
    return {
      state: action === null ? session.state : circuitReducer(session.state, action),
      selection: resolved.selection,
    }
  }

  /** Enter on a tray button. Arming is selection-only, so it must map to no action at all. */
  function arm(session: Session, kind: ElementKind): Session {
    const resolved = resolveTrayIntent(kind, session.selection)
    expect(intentToAction(resolved.intent ?? { type: 'cancel' }, session.selection, session.state)).toBeNull()
    return { state: session.state, selection: resolved.selection }
  }

  /** Arrow keys only — no coordinate is ever assigned to the cursor directly. */
  function arrowTo(session: Session, cell: GridCell): Session {
    let current = session
    while (current.selection.cursor.col < cell.col) current = press(current, 'ArrowRight')
    while (current.selection.cursor.col > cell.col) current = press(current, 'ArrowLeft')
    while (current.selection.cursor.row < cell.row) current = press(current, 'ArrowDown')
    while (current.selection.cursor.row > cell.row) current = press(current, 'ArrowUp')
    expect(current.selection.cursor).toEqual(cell)
    return current
  }

  function place(session: Session, kind: ElementKind, cell: GridCell): Session {
    const placed = press(arrowTo(arm(session, kind), cell), 'Enter')
    expect(placed.state.lastRejection).toBeNull()
    return placed
  }

  it('places three components and joins them into an energised closed circuit', () => {
    const level = levelOrThrow('cb-01-closed-circuit')
    const batteryCell: GridCell = { col: 1, row: 1 }
    const resistorCell: GridCell = { col: 3, row: 1 }
    const lampCell: GridCell = { col: 5, row: 1 }

    let session: Session = {
      state: createInitialState(level),
      selection: createInitialSelection(),
    }

    session = place(session, 'battery', batteryCell)
    session = place(session, 'resistor', resistorCell)
    session = place(session, 'led', lampCell)
    expect(session.state.layout.elements).toHaveLength(3)

    // Escape drops the still-armed tray kind, so the wiring that follows cannot place anything.
    session = press(session, 'Escape')
    expect(session.selection.armedKind).toBeNull()

    // battery terminal 0 -> resistor terminal 0: c starts on the first terminal, Enter finishes
    // on the first terminal.
    session = press(arrowTo(session, batteryCell), 'c')
    session = press(arrowTo(session, resistorCell), 'Enter')

    // resistor terminal 1 -> LED terminal 0: Shift+C starts on the second terminal.
    session = press(arrowTo(session, resistorCell), 'C', true)
    session = press(arrowTo(session, lampCell), 'Enter')

    // LED terminal 1 -> battery terminal 1: Shift+Enter finishes on the second terminal. This
    // closing connection is the one the keyboard could not make before.
    session = press(arrowTo(session, lampCell), 'C', true)
    session = press(arrowTo(session, batteryCell), 'Enter', true)

    expect(session.state.lastRejection).toBeNull()
    expect(session.state.layout.connections).toHaveLength(3)
    expect(session.state.fuseBlown).toBe(false)

    const outcome = evaluateMemoized(
      session.state.layout,
      session.state.switches,
      session.state.environment
    )
    expect(isCircuitResult(outcome)).toBe(true)
    if (!isCircuitResult(outcome)) {
      return
    }
    expect(outcome.faults).toEqual([])
    expect(outcome.closedPathExists).toBe(true)
    const lamp = outcome.elements.find((element) => element.kind === 'led')
    expect(lamp?.energized).toBe(true)
    expect(lamp?.intensity ?? 0).toBeGreaterThan(MIN_VISIBLE_INTENSITY)
  })
})
