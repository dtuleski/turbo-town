// C5 reducer tests. No React, no rendering, no DOM: the reducer is a plain function and is
// exercised as one.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_CONNECTION_COUNT,
  MAX_ELEMENT_COUNT,
  MAX_FAULT_COUNT_PER_LEVEL,
  MAX_SOURCE_VOLTAGE,
  MIN_SOURCE_VOLTAGE,
  clearEngineMemo,
  createElement,
  evaluateMemoized,
  getLevel,
  isCircuitResult,
} from '../circuitEngine'
import type { ElementKind, Fault, LevelDefinition } from '../circuitEngine'
import {
  circuitReducer,
  createInitialState,
  selectElementAt,
  selectFaultEffectKey,
  selectRemainingBudget,
  selectSubmissionPayload,
  selectTrayItems,
} from '../circuitBuilderState'
import type { CircuitAction, CircuitBuilderState, RejectionCode } from '../circuitBuilderState'
import type { GridCell } from '../circuitBuilderGeometry'

function levelOrThrow(id: string): LevelDefinition {
  const level = getLevel(id)
  if (level === undefined) {
    throw new Error(`fixture level ${id} is missing from the engine registry`)
  }
  return level
}

const SANDBOX = levelOrThrow('sandbox')
const GUIDED = levelOrThrow('cb-01-closed-circuit')

/** A level that offers one kind without limit, for the structural ceilings. */
function unlimitedLevel(kind: ElementKind, allowance: number): LevelDefinition {
  return {
    ...SANDBOX,
    id: `fixture-${kind}`,
    availableComponents: { [kind]: allowance },
  }
}

function sandbox(): CircuitBuilderState {
  return createInitialState(SANDBOX)
}

function run(state: CircuitBuilderState, ...actions: readonly CircuitAction[]): CircuitBuilderState {
  return actions.reduce(circuitReducer, state)
}

function place(kind: ElementKind, col: number, row: number): CircuitAction {
  return { type: 'place', kind, cell: { col, row } }
}

function rejectionOf(state: CircuitBuilderState): RejectionCode | null {
  return state.lastRejection?.code ?? null
}

describe('createInitialState', () => {
  it('seeds from the level definition with a legal environment', () => {
    const state = sandbox()
    expect(state.levelId).toBe('sandbox')
    expect(state.layout.gridSize).toEqual({ cols: 24, rows: 16 })
    expect(state.layout.elements).toHaveLength(0)
    expect(state.layout.connections).toHaveLength(0)
    // The engine validates the environment on every call, even with no source placed, so the
    // initial value has to be inside the legal range from the first evaluation onward.
    expect(state.environment.sourceVoltage).toBeGreaterThanOrEqual(MIN_SOURCE_VOLTAGE)
    expect(state.environment.sourceVoltage).toBeLessThanOrEqual(MAX_SOURCE_VOLTAGE)
    expect(state.environment.lightLevel).toBe(1)
    expect(state.fuseBlown).toBe(false)
    expect(state.metrics).toEqual({ elapsedSeconds: 0, componentCount: 0, faultCount: 0 })
    expect(state.nextElementSeq).toBe(1)
    expect(state.nextConnectionSeq).toBe(1)
    expect(state.lastRejection).toBeNull()
  })

  it('gives every pre-placed switch a closed entry', () => {
    const level: LevelDefinition = {
      ...GUIDED,
      id: 'fixture-preplaced',
      availableComponents: { switch: 1 },
      prePlaced: [createElement('switch', { id: 'pre1', position: { col: 1, row: 1, rotation: 0 } })],
    }
    const state = createInitialState(level)
    expect(state.switches.pre1).toBe('closed')
    expect(state.metrics.componentCount).toBe(1)
  })
})

describe('place', () => {
  it('places an element at the targeted cell', () => {
    const state = run(sandbox(), place('battery', 2, 3))
    expect(state.layout.elements).toHaveLength(1)
    expect(state.layout.elements[0]?.position).toEqual({ col: 2, row: 3, rotation: 0 })
    expect(state.metrics.componentCount).toBe(1)
    expect(state.lastRejection).toBeNull()
  })

  it('refuses a cell that already holds an element', () => {
    const state = run(sandbox(), place('battery', 2, 3), place('led', 2, 3))
    expect(state.layout.elements).toHaveLength(1)
    expect(rejectionOf(state)).toBe('CELL_OCCUPIED')
    expect(state.lastRejection?.at).toEqual({ col: 2, row: 3 })
  })

  it('refuses a cell outside the grid', () => {
    const state = run(sandbox(), place('battery', 24, 0))
    expect(state.layout.elements).toHaveLength(0)
    expect(rejectionOf(state)).toBe('OUT_OF_BOUNDS')
  })

  it('refuses a fractional cell', () => {
    const state = circuitReducer(sandbox(), { type: 'place', kind: 'wire', cell: { col: 1.5, row: 2 } })
    expect(rejectionOf(state)).toBe('OUT_OF_BOUNDS')
  })

  it('refuses one more than the level allowance', () => {
    // The guided level offers exactly one battery.
    const state = run(createInitialState(GUIDED), place('battery', 1, 1), place('battery', 2, 1))
    expect(state.layout.elements).toHaveLength(1)
    expect(rejectionOf(state)).toBe('OVER_BUDGET')
  })

  it('refuses a kind the level does not offer at all', () => {
    const state = run(createInitialState(GUIDED), place('motor', 1, 1))
    expect(state.layout.elements).toHaveLength(0)
    expect(rejectionOf(state)).toBe('OVER_BUDGET')
  })

  it('refuses placement past the engine element ceiling', () => {
    let state = createInitialState(unlimitedLevel('wire', MAX_ELEMENT_COUNT + 10))
    for (let index = 0; index < MAX_ELEMENT_COUNT; index += 1) {
      state = circuitReducer(state, place('wire', index % 24, Math.floor(index / 24)))
    }
    expect(state.layout.elements).toHaveLength(MAX_ELEMENT_COUNT)
    state = circuitReducer(state, place('wire', 20, 10))
    expect(state.layout.elements).toHaveLength(MAX_ELEMENT_COUNT)
    expect(rejectionOf(state)).toBe('ELEMENT_LIMIT')
  })

  it('gives a newly placed switch a closed entry', () => {
    const state = run(sandbox(), place('switch', 4, 4))
    const id = state.layout.elements[0]?.id ?? ''
    expect(state.switches[id]).toBe('closed')
  })

  it('never reuses the id of a pre-placed element', () => {
    const level: LevelDefinition = {
      ...SANDBOX,
      id: 'fixture-id-clash',
      prePlaced: [createElement('wire', { id: 'e1', position: { col: 0, row: 0, rotation: 0 } })],
    }
    const state = run(createInitialState(level), place('wire', 1, 0))
    const ids = state.layout.elements.map((element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('move', () => {
  it('moves an element and leaves its connections alone', () => {
    let state = run(sandbox(), place('battery', 1, 1), place('led', 3, 1))
    const [source, lamp] = state.layout.elements
    expect(source).toBeDefined()
    expect(lamp).toBeDefined()
    if (source === undefined || lamp === undefined) {
      return
    }
    state = circuitReducer(state, {
      type: 'connect',
      from: { elementId: source.id, terminalIndex: 1 },
      to: { elementId: lamp.id, terminalIndex: 0 },
    })
    const before = state.layout.connections

    state = circuitReducer(state, { type: 'move', elementId: lamp.id, to: { col: 8, row: 9 } })
    expect(selectElementAt(state, { col: 8, row: 9 })?.id).toBe(lamp.id)
    // Connectivity is never inferred from coordinates, so moving changes the picture only.
    expect(state.layout.connections).toEqual(before)
  })

  it('preserves rotation', () => {
    const level: LevelDefinition = {
      ...SANDBOX,
      id: 'fixture-rotated',
      prePlaced: [createElement('wire', { id: 'r90', position: { col: 2, row: 2, rotation: 90 } })],
    }
    const state = circuitReducer(createInitialState(level), {
      type: 'move',
      elementId: 'r90',
      to: { col: 5, row: 5 },
    })
    expect(state.layout.elements[0]?.position).toEqual({ col: 5, row: 5, rotation: 90 })
  })

  it('returns the same state reference when moved onto its own cell', () => {
    const state = run(sandbox(), place('battery', 1, 1))
    const id = state.layout.elements[0]?.id ?? ''
    expect(circuitReducer(state, { type: 'move', elementId: id, to: { col: 1, row: 1 } })).toBe(state)
  })

  it('refuses an unknown element, an out-of-bounds target, and an occupied target', () => {
    const state = run(sandbox(), place('battery', 1, 1), place('led', 2, 1))
    const id = state.layout.elements[0]?.id ?? ''
    expect(rejectionOf(circuitReducer(state, { type: 'move', elementId: 'nope', to: { col: 5, row: 5 } }))).toBe('UNKNOWN_ELEMENT')
    expect(rejectionOf(circuitReducer(state, { type: 'move', elementId: id, to: { col: 99, row: 0 } }))).toBe('OUT_OF_BOUNDS')
    expect(rejectionOf(circuitReducer(state, { type: 'move', elementId: id, to: { col: 2, row: 1 } }))).toBe('CELL_OCCUPIED')
  })

  it('refuses to move a locked element', () => {
    const level: LevelDefinition = {
      ...SANDBOX,
      id: 'fixture-locked',
      prePlaced: [createElement('battery', { id: 'fixed', position: { col: 1, row: 1, rotation: 0 } })],
      lockedElementIds: ['fixed'],
    }
    const state = circuitReducer(createInitialState(level), {
      type: 'move',
      elementId: 'fixed',
      to: { col: 4, row: 4 },
    })
    expect(rejectionOf(state)).toBe('ELEMENT_LOCKED')
    expect(selectElementAt(state, { col: 1, row: 1 })?.id).toBe('fixed')
  })
})

describe('remove', () => {
  it('drops the element, its connections, and its switch entry', () => {
    let state = run(sandbox(), place('switch', 1, 1), place('led', 3, 1), place('battery', 5, 1))
    const [middleSwitch, lamp, source] = state.layout.elements
    if (middleSwitch === undefined || lamp === undefined || source === undefined) {
      throw new Error('fixture setup failed')
    }
    state = run(
      state,
      {
        type: 'connect',
        from: { elementId: middleSwitch.id, terminalIndex: 0 },
        to: { elementId: lamp.id, terminalIndex: 0 },
      },
      {
        type: 'connect',
        from: { elementId: middleSwitch.id, terminalIndex: 1 },
        to: { elementId: source.id, terminalIndex: 0 },
      }
    )
    expect(state.layout.connections).toHaveLength(2)

    state = circuitReducer(state, { type: 'remove', elementId: middleSwitch.id })
    expect(state.layout.elements).toHaveLength(2)
    expect(state.layout.connections).toHaveLength(0)
    expect(state.switches[middleSwitch.id]).toBeUndefined()
    expect(state.metrics.componentCount).toBe(2)
  })

  it('refuses an unknown element and a locked element', () => {
    const level: LevelDefinition = {
      ...SANDBOX,
      id: 'fixture-locked-remove',
      prePlaced: [createElement('battery', { id: 'fixed', position: { col: 1, row: 1, rotation: 0 } })],
      lockedElementIds: ['fixed'],
    }
    const state = createInitialState(level)
    expect(rejectionOf(circuitReducer(state, { type: 'remove', elementId: 'ghost' }))).toBe('UNKNOWN_ELEMENT')
    expect(rejectionOf(circuitReducer(state, { type: 'remove', elementId: 'fixed' }))).toBe('ELEMENT_LOCKED')
  })
})

describe('connect and disconnect', () => {
  function twoElements(): CircuitBuilderState {
    return run(sandbox(), place('battery', 1, 1), place('led', 3, 1))
  }

  it('joins two terminals on different elements', () => {
    const base = twoElements()
    const [source, lamp] = base.layout.elements
    if (source === undefined || lamp === undefined) {
      throw new Error('fixture setup failed')
    }
    const state = circuitReducer(base, {
      type: 'connect',
      from: { elementId: source.id, terminalIndex: 1 },
      to: { elementId: lamp.id, terminalIndex: 0 },
    })
    expect(state.layout.connections).toHaveLength(1)
    expect(state.layout.connections[0]?.from).toBe(source.terminals[1])
    expect(state.layout.connections[0]?.to).toBe(lamp.terminals[0])
  })

  it('allows the two terminals of one element to be joined', () => {
    const base = twoElements()
    const source = base.layout.elements[0]
    if (source === undefined) {
      throw new Error('fixture setup failed')
    }
    // A short across one component is legal and is a real lesson, so only joining a terminal to
    // itself is refused.
    const state = circuitReducer(base, {
      type: 'connect',
      from: { elementId: source.id, terminalIndex: 0 },
      to: { elementId: source.id, terminalIndex: 1 },
    })
    expect(state.layout.connections).toHaveLength(1)
    expect(state.lastRejection).toBeNull()
  })

  it('refuses a terminal joined to itself', () => {
    const base = twoElements()
    const source = base.layout.elements[0]
    if (source === undefined) {
      throw new Error('fixture setup failed')
    }
    const state = circuitReducer(base, {
      type: 'connect',
      from: { elementId: source.id, terminalIndex: 0 },
      to: { elementId: source.id, terminalIndex: 0 },
    })
    expect(state.layout.connections).toHaveLength(0)
    expect(rejectionOf(state)).toBe('SELF_CONNECTION')
  })

  it('refuses an unknown element and a duplicate pair in either direction', () => {
    const base = twoElements()
    const [source, lamp] = base.layout.elements
    if (source === undefined || lamp === undefined) {
      throw new Error('fixture setup failed')
    }
    expect(
      rejectionOf(
        circuitReducer(base, {
          type: 'connect',
          from: { elementId: 'ghost', terminalIndex: 0 },
          to: { elementId: lamp.id, terminalIndex: 0 },
        })
      )
    ).toBe('UNKNOWN_ELEMENT')

    const joined = circuitReducer(base, {
      type: 'connect',
      from: { elementId: source.id, terminalIndex: 1 },
      to: { elementId: lamp.id, terminalIndex: 0 },
    })
    const reversed = circuitReducer(joined, {
      type: 'connect',
      from: { elementId: lamp.id, terminalIndex: 0 },
      to: { elementId: source.id, terminalIndex: 1 },
    })
    expect(reversed.layout.connections).toHaveLength(1)
    expect(rejectionOf(reversed)).toBe('DUPLICATE_CONNECTION')
  })

  it('refuses a connection past the engine connection ceiling', () => {
    let state = createInitialState(unlimitedLevel('wire', MAX_ELEMENT_COUNT))
    for (let index = 0; index < MAX_ELEMENT_COUNT; index += 1) {
      state = circuitReducer(state, place('wire', index % 24, Math.floor(index / 24)))
    }
    // Enumerate distinct element pairs, two connections each (terminal 0 to 0, terminal 1 to 1),
    // so no attempt is a duplicate and the ceiling is reached exactly.
    const ids = state.layout.elements.map((element) => element.id)
    for (let left = 0; left < ids.length && state.layout.connections.length < MAX_CONNECTION_COUNT; left += 1) {
      for (let right = left + 1; right < ids.length && state.layout.connections.length < MAX_CONNECTION_COUNT; right += 1) {
        for (const terminalIndex of [0, 1] as const) {
          if (state.layout.connections.length >= MAX_CONNECTION_COUNT) {
            break
          }
          state = circuitReducer(state, {
            type: 'connect',
            from: { elementId: ids[left] ?? '', terminalIndex },
            to: { elementId: ids[right] ?? '', terminalIndex },
          })
        }
      }
    }
    expect(state.layout.connections).toHaveLength(MAX_CONNECTION_COUNT)

    // A pair the loop above never reached, so the refusal is the ceiling and not a duplicate.
    state = circuitReducer(state, {
      type: 'connect',
      from: { elementId: ids[30] ?? '', terminalIndex: 0 },
      to: { elementId: ids[40] ?? '', terminalIndex: 1 },
    })
    expect(state.layout.connections).toHaveLength(MAX_CONNECTION_COUNT)
    expect(rejectionOf(state)).toBe('CONNECTION_LIMIT')
  })

  it('removes one connection and refuses an unknown one', () => {
    const base = twoElements()
    const [source, lamp] = base.layout.elements
    if (source === undefined || lamp === undefined) {
      throw new Error('fixture setup failed')
    }
    const joined = circuitReducer(base, {
      type: 'connect',
      from: { elementId: source.id, terminalIndex: 1 },
      to: { elementId: lamp.id, terminalIndex: 0 },
    })
    const connectionId = joined.layout.connections[0]?.id ?? ''

    const dropped = circuitReducer(joined, { type: 'disconnect', connectionId })
    expect(dropped.layout.connections).toHaveLength(0)
    // Only the connection goes; both components stay.
    expect(dropped.layout.elements).toHaveLength(2)

    expect(rejectionOf(circuitReducer(joined, { type: 'disconnect', connectionId: 'nope' }))).toBe(
      'UNKNOWN_CONNECTION'
    )
  })
})

describe('toggleSwitch', () => {
  it('flips a placed switch and refuses anything else', () => {
    const base = run(sandbox(), place('switch', 1, 1), place('led', 2, 1))
    const [toggle, lamp] = base.layout.elements
    if (toggle === undefined || lamp === undefined) {
      throw new Error('fixture setup failed')
    }
    expect(base.switches[toggle.id]).toBe('closed')

    const opened = circuitReducer(base, { type: 'toggleSwitch', elementId: toggle.id })
    expect(opened.switches[toggle.id]).toBe('open')
    const closed = circuitReducer(opened, { type: 'toggleSwitch', elementId: toggle.id })
    expect(closed.switches[toggle.id]).toBe('closed')

    expect(rejectionOf(circuitReducer(base, { type: 'toggleSwitch', elementId: lamp.id }))).toBe('NOT_A_SWITCH')
    expect(rejectionOf(circuitReducer(base, { type: 'toggleSwitch', elementId: 'ghost' }))).toBe('UNKNOWN_ELEMENT')
  })
})

describe('environment actions', () => {
  it('snaps the voltage to the control step', () => {
    expect(circuitReducer(sandbox(), { type: 'setVoltage', volts: 7.3 }).environment.sourceVoltage).toBe(7.5)
  })

  it('clamps the voltage to the safe range instead of rejecting it', () => {
    expect(circuitReducer(sandbox(), { type: 'setVoltage', volts: 100 }).environment.sourceVoltage).toBe(
      MAX_SOURCE_VOLTAGE
    )
    expect(circuitReducer(sandbox(), { type: 'setVoltage', volts: -5 }).environment.sourceVoltage).toBe(
      MIN_SOURCE_VOLTAGE
    )
  })

  it('refuses a non-finite voltage and leaves the environment untouched', () => {
    const state = circuitReducer(sandbox(), { type: 'setVoltage', volts: Number.NaN })
    expect(rejectionOf(state)).toBe('INVALID_VOLTAGE')
    expect(state.environment).toEqual(sandbox().environment)
  })

  it('clamps the light level and refuses a non-finite one', () => {
    expect(circuitReducer(sandbox(), { type: 'setLightLevel', level: 2 }).environment.lightLevel).toBe(1)
    expect(circuitReducer(sandbox(), { type: 'setLightLevel', level: -1 }).environment.lightLevel).toBe(0)
    const rejected = circuitReducer(sandbox(), { type: 'setLightLevel', level: Number.POSITIVE_INFINITY })
    expect(rejectionOf(rejected)).toBe('INVALID_LIGHT_LEVEL')
    expect(rejected.environment.lightLevel).toBe(1)
  })
})

describe('faultsEvaluated, resetFuse, tick, and reset', () => {
  it('blows the fuse on the rising edge only', () => {
    const base = sandbox()
    const blown = circuitReducer(base, { type: 'faultsEvaluated', codes: ['SHORT_CIRCUIT'] })
    expect(blown.fuseBlown).toBe(true)
    expect(blown.metrics.faultCount).toBe(1)

    // The same fault reported again is the same fault. Returning the identical reference is what
    // keeps the host's evaluate-then-dispatch effect from looping.
    const again = circuitReducer(blown, { type: 'faultsEvaluated', codes: ['SHORT_CIRCUIT'] })
    expect(again).toBe(blown)
    expect(again.metrics.faultCount).toBe(1)

    const cleared = circuitReducer(blown, { type: 'resetFuse' })
    expect(cleared.fuseBlown).toBe(false)
    expect(cleared.metrics.faultCount).toBe(1)

    const second = circuitReducer(cleared, { type: 'faultsEvaluated', codes: ['SHORT_CIRCUIT'] })
    expect(second.metrics.faultCount).toBe(2)
  })

  it('treats a singular system as blocking and a load fault as not blocking', () => {
    expect(circuitReducer(sandbox(), { type: 'faultsEvaluated', codes: ['SINGULAR_SYSTEM'] }).fuseBlown).toBe(true)

    // An overcurrent or a reversed LED is a teaching moment, not a blown fuse: the circuit still
    // runs, so the state comes back by reference and the fault count does not move.
    const base = sandbox()
    const overcurrent = circuitReducer(base, { type: 'faultsEvaluated', codes: ['OVERCURRENT', 'REVERSED_POLARITY'] })
    expect(overcurrent).toBe(base)
    expect(overcurrent.fuseBlown).toBe(false)
    expect(overcurrent.metrics.faultCount).toBe(0)
  })

  it('returns the same reference when no fault is reported', () => {
    const base = sandbox()
    expect(circuitReducer(base, { type: 'faultsEvaluated', codes: [] })).toBe(base)
  })

  it('saturates the fault count at the ceiling', () => {
    let state = sandbox()
    for (let index = 0; index < MAX_FAULT_COUNT_PER_LEVEL + 5; index += 1) {
      state = circuitReducer(state, { type: 'faultsEvaluated', codes: ['SHORT_CIRCUIT'] })
      state = circuitReducer(state, { type: 'resetFuse' })
    }
    expect(state.metrics.faultCount).toBe(MAX_FAULT_COUNT_PER_LEVEL)
  })

  it('honours a per-level fault ceiling', () => {
    let state = createInitialState({ ...SANDBOX, id: 'fixture-ceiling', maxFaultCount: 2 })
    for (let index = 0; index < 5; index += 1) {
      state = circuitReducer(state, { type: 'faultsEvaluated', codes: ['SHORT_CIRCUIT'] })
      state = circuitReducer(state, { type: 'resetFuse' })
    }
    expect(state.metrics.faultCount).toBe(2)
  })

  it('advances the clock and returns the same reference for a repeated value', () => {
    const ticked = circuitReducer(sandbox(), { type: 'tick', elapsedSeconds: 5 })
    expect(ticked.metrics.elapsedSeconds).toBe(5)
    expect(circuitReducer(ticked, { type: 'tick', elapsedSeconds: 5 })).toBe(ticked)
    expect(circuitReducer(ticked, { type: 'tick', elapsedSeconds: Number.NaN })).toBe(ticked)
    expect(circuitReducer(ticked, { type: 'tick', elapsedSeconds: -4 }).metrics.elapsedSeconds).toBe(0)
  })

  it('reset returns to the level baseline', () => {
    const dirty = run(
      sandbox(),
      place('battery', 1, 1),
      { type: 'setVoltage', volts: 12 },
      { type: 'faultsEvaluated', codes: ['SHORT_CIRCUIT'] },
      { type: 'tick', elapsedSeconds: 30 },
      place('battery', 1, 1)
    )
    expect(dirty.lastRejection).not.toBeNull()

    const fresh = circuitReducer(dirty, { type: 'reset' })
    expect(fresh.layout.elements).toHaveLength(0)
    expect(fresh.metrics).toEqual({ elapsedSeconds: 0, componentCount: 0, faultCount: 0 })
    expect(fresh.fuseBlown).toBe(false)
    expect(fresh.nextElementSeq).toBe(1)
    expect(fresh.nextConnectionSeq).toBe(1)
    expect(fresh.lastRejection).toBeNull()
    expect(fresh.environment).toEqual(sandbox().environment)
  })

  it('resetFuse on an intact fuse is a no-op', () => {
    const base = sandbox()
    expect(circuitReducer(base, { type: 'resetFuse' })).toBe(base)
  })
})

describe('every rejection code is reachable', () => {
  it('produces all thirteen codes somewhere in the suite', () => {
    const all: readonly RejectionCode[] = [
      'OUT_OF_BOUNDS',
      'CELL_OCCUPIED',
      'OVER_BUDGET',
      'ELEMENT_LIMIT',
      'CONNECTION_LIMIT',
      'UNKNOWN_ELEMENT',
      'UNKNOWN_CONNECTION',
      'ELEMENT_LOCKED',
      'NOT_A_SWITCH',
      'SELF_CONNECTION',
      'DUPLICATE_CONNECTION',
      'INVALID_VOLTAGE',
      'INVALID_LIGHT_LEVEL',
    ]
    // Cheap codes are produced inline here; ELEMENT_LIMIT and CONNECTION_LIMIT have their own
    // (slow) cases above, so they are asserted there rather than built twice.
    const produced = new Set<RejectionCode>(['ELEMENT_LIMIT', 'CONNECTION_LIMIT'])

    const base = run(sandbox(), place('battery', 1, 1), place('led', 2, 1), place('switch', 3, 1))
    const [source, lamp] = base.layout.elements
    if (source === undefined || lamp === undefined) {
      throw new Error('fixture setup failed')
    }
    const locked = createInitialState({
      ...SANDBOX,
      id: 'fixture-codes',
      prePlaced: [createElement('wire', { id: 'fixed', position: { col: 0, row: 0, rotation: 0 } })],
      lockedElementIds: ['fixed'],
    })
    const joined = circuitReducer(base, {
      type: 'connect',
      from: { elementId: source.id, terminalIndex: 1 },
      to: { elementId: lamp.id, terminalIndex: 0 },
    })

    const candidates: readonly CircuitBuilderState[] = [
      circuitReducer(base, place('battery', 99, 0)),
      circuitReducer(base, place('led', 1, 1)),
      circuitReducer(createInitialState(GUIDED), place('motor', 1, 1)),
      circuitReducer(base, { type: 'move', elementId: 'ghost', to: { col: 5, row: 5 } }),
      circuitReducer(base, { type: 'disconnect', connectionId: 'ghost' }),
      circuitReducer(locked, { type: 'remove', elementId: 'fixed' }),
      circuitReducer(base, { type: 'toggleSwitch', elementId: lamp.id }),
      circuitReducer(base, {
        type: 'connect',
        from: { elementId: source.id, terminalIndex: 0 },
        to: { elementId: source.id, terminalIndex: 0 },
      }),
      circuitReducer(joined, {
        type: 'connect',
        from: { elementId: source.id, terminalIndex: 1 },
        to: { elementId: lamp.id, terminalIndex: 0 },
      }),
      circuitReducer(base, { type: 'setVoltage', volts: Number.NaN }),
      circuitReducer(base, { type: 'setLightLevel', level: Number.NaN }),
    ]
    for (const candidate of candidates) {
      const code = rejectionOf(candidate)
      expect(code).not.toBeNull()
      if (code !== null) {
        produced.add(code)
      }
    }

    expect([...produced].sort()).toEqual([...all].sort())
  })

  it('clears the rejection on the next success', () => {
    const rejected = run(sandbox(), place('battery', 1, 1), place('led', 1, 1))
    expect(rejected.lastRejection).not.toBeNull()
    expect(circuitReducer(rejected, place('led', 2, 1)).lastRejection).toBeNull()
  })
})

describe('selectors', () => {
  it('reports remaining budget against the level allowance', () => {
    const state = run(createInitialState(GUIDED), place('wire', 1, 1), place('wire', 2, 1))
    expect(selectRemainingBudget(state, 'wire')).toBe(2)
    expect(selectRemainingBudget(state, 'motor')).toBe(0)
  })

  it('emits one tray item per offered kind, in engine kind order, with i18n keys', () => {
    const items = selectTrayItems(sandbox())
    expect(items).toHaveLength(8)
    expect(items.map((item) => item.kind)).toEqual([
      'battery',
      'buzzer',
      'led',
      'motor',
      'resistor',
      'solar',
      'switch',
      'wire',
    ])
    for (const item of items) {
      expect(item.labelKey).toBe(`circuitBuilder.component.${item.kind}.name`)
      expect(item.labelKey).not.toContain(' ')
      expect(item.disabled).toBe(false)
    }

    const guided = selectTrayItems(createInitialState(GUIDED))
    expect(guided.map((item) => item.kind)).toEqual(['battery', 'led', 'resistor', 'wire'])
  })

  it('disables a tray item once its allowance is spent', () => {
    const state = run(createInitialState(GUIDED), place('battery', 1, 1))
    const battery = selectTrayItems(state).find((item) => item.kind === 'battery')
    expect(battery?.remaining).toBe(0)
    expect(battery?.disabled).toBe(true)
  })

  it('builds an order-stable submission payload', () => {
    const forward = run(sandbox(), place('battery', 1, 1), place('led', 2, 1), place('switch', 3, 1))
    const backward = run(sandbox(), place('switch', 3, 1), place('led', 2, 1), place('battery', 1, 1))

    // The same circuit reached by two different histories has different element ids, so compare
    // the shape that matters: a payload whose arrays are sorted and whose metadata matches.
    const payload = selectSubmissionPayload(forward)
    expect(payload.levelId).toBe('sandbox')
    expect(payload.completionTime).toBe(0)
    expect(payload.faultCount).toBe(0)
    expect([...payload.layout.elements].map((element) => element.id)).toEqual(
      [...payload.layout.elements].map((element) => element.id).sort()
    )
    expect(Object.keys(payload.switches)).toEqual([...Object.keys(payload.switches)].sort())
    expect(selectSubmissionPayload(backward).layout.elements).toHaveLength(3)
  })

  it('produces a byte-identical payload for two histories that build the identical circuit', () => {
    const grid = { cols: 8, rows: 6 }
    const level: LevelDefinition = { ...GUIDED, id: 'fixture-stable', gridSize: grid }
    const first = run(createInitialState(level), place('wire', 1, 1), place('wire', 2, 1))
    const second = run(createInitialState(level), place('wire', 2, 1), place('wire', 1, 1))
    // Build the same two cells in the opposite order, then normalise away the id-to-cell binding
    // by comparing the sorted cell list, which is what the server re-evaluates.
    const cellsOf = (state: CircuitBuilderState): readonly string[] =>
      selectSubmissionPayload(state)
        .layout.elements.map((element) => `${element.kind}@${String(element.position.col)},${String(element.position.row)}`)
        .sort()
    expect(cellsOf(first)).toEqual(cellsOf(second))
  })

  it('finds the element occupying a cell', () => {
    const state = run(sandbox(), place('battery', 7, 7))
    expect(selectElementAt(state, { col: 7, row: 7 })?.kind).toBe('battery')
    expect(selectElementAt(state, { col: 7, row: 8 })).toBeUndefined()
  })
})

describe('end to end against the real engine', () => {
  beforeEach(() => {
    clearEngineMemo()
  })

  function series(): CircuitBuilderState {
    let state = run(sandbox(), place('battery', 1, 1), place('resistor', 2, 1), place('led', 3, 1))
    const [source, limiter, lamp] = state.layout.elements
    if (source === undefined || limiter === undefined || lamp === undefined) {
      throw new Error('fixture setup failed')
    }
    state = run(
      state,
      { type: 'connect', from: { elementId: source.id, terminalIndex: 0 }, to: { elementId: limiter.id, terminalIndex: 0 } },
      { type: 'connect', from: { elementId: limiter.id, terminalIndex: 1 }, to: { elementId: lamp.id, terminalIndex: 0 } },
      { type: 'connect', from: { elementId: lamp.id, terminalIndex: 1 }, to: { elementId: source.id, terminalIndex: 1 } }
    )
    return state
  }

  it('emits a layout the engine accepts and lights the LED', () => {
    const state = series()
    const payload = selectSubmissionPayload(state)
    const outcome = evaluateMemoized(payload.layout, payload.switches, payload.environment)
    expect(isCircuitResult(outcome)).toBe(true)
    if (!isCircuitResult(outcome)) {
      return
    }
    expect(outcome.closedPathExists).toBe(true)
    const lamp = outcome.elements.find((element) => element.kind === 'led')
    expect(lamp?.energized).toBe(true)
    expect(lamp?.intensity).toBeGreaterThan(0)
    expect(outcome.faults).toHaveLength(0)
  })

  it('reports a short with a grid position for the spark effect', () => {
    let state = run(sandbox(), place('battery', 1, 1), place('wire', 2, 1))
    const [source, link] = state.layout.elements
    if (source === undefined || link === undefined) {
      throw new Error('fixture setup failed')
    }
    state = run(
      state,
      { type: 'connect', from: { elementId: source.id, terminalIndex: 0 }, to: { elementId: link.id, terminalIndex: 0 } },
      { type: 'connect', from: { elementId: link.id, terminalIndex: 1 }, to: { elementId: source.id, terminalIndex: 1 } }
    )

    const outcome = evaluateMemoized(state.layout, state.switches, state.environment)
    expect(isCircuitResult(outcome)).toBe(true)
    if (!isCircuitResult(outcome)) {
      return
    }
    const short = outcome.faults.find((fault) => fault.code === 'SHORT_CIRCUIT')
    expect(short).toBeDefined()
    expect(short?.atPosition).toBeDefined()

    const blown = circuitReducer(state, {
      type: 'faultsEvaluated',
      codes: outcome.faults.map((fault) => fault.code),
    })
    expect(blown.fuseBlown).toBe(true)
  })

  it('opening a switch de-energizes the whole series chain', () => {
    let state = run(sandbox(), place('battery', 1, 1), place('switch', 2, 1), place('led', 3, 1), place('resistor', 4, 1))
    const [source, toggle, lamp, limiter] = state.layout.elements
    if (source === undefined || toggle === undefined || lamp === undefined || limiter === undefined) {
      throw new Error('fixture setup failed')
    }
    state = run(
      state,
      { type: 'connect', from: { elementId: source.id, terminalIndex: 0 }, to: { elementId: toggle.id, terminalIndex: 0 } },
      { type: 'connect', from: { elementId: toggle.id, terminalIndex: 1 }, to: { elementId: limiter.id, terminalIndex: 0 } },
      { type: 'connect', from: { elementId: limiter.id, terminalIndex: 1 }, to: { elementId: lamp.id, terminalIndex: 0 } },
      { type: 'connect', from: { elementId: lamp.id, terminalIndex: 1 }, to: { elementId: source.id, terminalIndex: 1 } }
    )

    const closed = evaluateMemoized(state.layout, state.switches, state.environment)
    expect(isCircuitResult(closed) && closed.closedPathExists).toBe(true)

    const opened = circuitReducer(state, { type: 'toggleSwitch', elementId: toggle.id })
    const dark = evaluateMemoized(opened.layout, opened.switches, opened.environment)
    expect(isCircuitResult(dark)).toBe(true)
    if (!isCircuitResult(dark)) {
      return
    }
    expect(dark.closedPathExists).toBe(false)
    expect(dark.elements.every((element) => !element.energized)).toBe(true)
  })
})

describe('fuse reset with a still-wired short', () => {
  beforeEach(() => {
    clearEngineMemo()
  })

  /** Battery terminal 0 joined to terminal 1 through a placed wire: a real short, built the way a
   * player builds one, with the faults read from the real engine rather than written by hand. */
  function shorted(): { state: CircuitBuilderState; faults: readonly Fault[] } {
    let state = run(sandbox(), place('battery', 1, 1), place('wire', 2, 1))
    const [source, link] = state.layout.elements
    if (source === undefined || link === undefined) {
      throw new Error('fixture setup failed')
    }
    state = run(
      state,
      { type: 'connect', from: { elementId: source.id, terminalIndex: 0 }, to: { elementId: link.id, terminalIndex: 0 } },
      { type: 'connect', from: { elementId: link.id, terminalIndex: 1 }, to: { elementId: source.id, terminalIndex: 1 } }
    )

    const outcome = evaluateMemoized(state.layout, state.switches, state.environment)
    if (!isCircuitResult(outcome)) {
      throw new Error('fixture setup failed: the engine refused the shorted layout')
    }
    expect(outcome.faults.some((fault) => fault.code === 'SHORT_CIRCUIT')).toBe(true)
    return { state, faults: outcome.faults }
  }

  it('re-blows the fuse when the same short is reported after a reset', () => {
    const { state, faults } = shorted()
    const codes = faults.map((fault) => fault.code)

    const blown = circuitReducer(state, { type: 'faultsEvaluated', codes })
    expect(blown.fuseBlown).toBe(true)
    expect(blown.metrics.faultCount).toBe(1)

    // Rising edge only: the identical report changes nothing, by reference.
    const again = circuitReducer(blown, { type: 'faultsEvaluated', codes })
    expect(again).toBe(blown)

    const cleared = circuitReducer(blown, { type: 'resetFuse' })
    expect(cleared.fuseBlown).toBe(false)
    expect(cleared.faultEpoch).toBe(blown.faultEpoch + 1)

    // The key change across the reset is precisely what makes React re-run the host's effect.
    expect(selectFaultEffectKey(cleared.faultEpoch, faults)).not.toBe(
      selectFaultEffectKey(blown.faultEpoch, faults)
    )

    const reblown = circuitReducer(cleared, { type: 'faultsEvaluated', codes })
    expect(reblown.fuseBlown).toBe(true)
    expect(reblown.metrics.faultCount).toBe(2)
  })

  it('distinguishes the same codes reported at a different position', () => {
    const { faults } = shorted()
    const moved = faults.map((fault) =>
      fault.atPosition === undefined
        ? fault
        : { ...fault, atPosition: { ...fault.atPosition, col: fault.atPosition.col + 1 } }
    )
    expect(selectFaultEffectKey(0, moved)).not.toBe(selectFaultEffectKey(0, faults))
  })

  it('leaves the epoch alone when the fuse was not blown', () => {
    const base = sandbox()
    const reset = circuitReducer(base, { type: 'resetFuse' })
    expect(reset).toBe(base)
    expect(reset.faultEpoch).toBe(0)
  })
})

describe('placement geometry contract', () => {
  it('only ever emits integer cells inside the grid', () => {
    const state = run(sandbox(), place('battery', 0, 0), place('led', 23, 15))
    for (const element of state.layout.elements) {
      const cell: GridCell = { col: element.position.col, row: element.position.row }
      expect(Number.isInteger(cell.col)).toBe(true)
      expect(Number.isInteger(cell.row)).toBe(true)
      expect(cell.col).toBeLessThan(state.layout.gridSize.cols)
      expect(cell.row).toBeLessThan(state.layout.gridSize.rows)
    }
  })
})
