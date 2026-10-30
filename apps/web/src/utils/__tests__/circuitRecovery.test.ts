import { describe, expect, it } from 'vitest'
import { circuitReducer, createInitialState, selectSubmissionPayload } from '../circuitBuilderState'
import type { CircuitAction, CircuitBuilderState } from '../circuitBuilderState'
import { evaluate, evaluateSuccess, isEvaluationError } from '../circuitEngine'
import type { CircuitResult } from '../circuitEngine'
import { mustLevel } from './circuitTestLayouts'

const LEVEL = mustLevel('cb-06-short-circuit-recovery')

function run(state: CircuitBuilderState, actions: readonly CircuitAction[]): CircuitBuilderState {
  return actions.reduce(circuitReducer, state)
}

function evaluateState(state: CircuitBuilderState): CircuitResult {
  const outcome = evaluate(state.layout, state.switches, state.environment)
  if (isEvaluationError(outcome)) throw new Error(outcome.errorCode)
  return outcome
}

describe('CB-3.8 recovery flow (reducer + real engine)', () => {
  const placed = run(createInitialState(LEVEL), [
    { type: 'place', kind: 'battery', cell: { col: 0, row: 0 } },
    { type: 'place', kind: 'resistor', cell: { col: 1, row: 0 } },
    { type: 'place', kind: 'led', cell: { col: 2, row: 0 } },
    { type: 'place', kind: 'wire', cell: { col: 3, row: 0 } },
    { type: 'connect', from: { elementId: 'e1', terminalIndex: 0 }, to: { elementId: 'e2', terminalIndex: 0 } },
    { type: 'connect', from: { elementId: 'e2', terminalIndex: 1 }, to: { elementId: 'e3', terminalIndex: 0 } },
    { type: 'connect', from: { elementId: 'e3', terminalIndex: 1 }, to: { elementId: 'e4', terminalIndex: 0 } },
    { type: 'connect', from: { elementId: 'e4', terminalIndex: 1 }, to: { elementId: 'e1', terminalIndex: 1 } },
  ])

  it('starts solved before anything goes wrong', () => {
    expect(evaluateSuccess(LEVEL, evaluateState(placed)).satisfied).toBe(true)
  })

  it('shorts, blows the fuse, resets, repairs and solves with one counted fault', () => {
    const shorted = run(placed, [
      // Battery + straight to the wire: a 0 ohm path across the battery.
      { type: 'connect', from: { elementId: 'e1', terminalIndex: 0 }, to: { elementId: 'e4', terminalIndex: 0 } },
    ])
    const shortConnection = shorted.layout.connections[shorted.layout.connections.length - 1]
    if (shortConnection === undefined) throw new Error('no connection')

    const shortResult = evaluateState(shorted)
    const codes = shortResult.faults.map((f) => f.code)
    expect(codes).toContain('SHORT_CIRCUIT')
    expect(evaluateSuccess(LEVEL, shortResult).satisfied).toBe(false)

    const blown = circuitReducer(shorted, { type: 'faultsEvaluated', codes })
    expect(blown.fuseBlown).toBe(true)
    expect(blown.metrics.faultCount).toBe(1)

    // The same fault set on the next frame is the same event.
    expect(circuitReducer(blown, { type: 'faultsEvaluated', codes }).metrics.faultCount).toBe(1)

    const reset = circuitReducer(blown, { type: 'resetFuse' })
    expect(reset.fuseBlown).toBe(false)
    expect(reset.metrics.faultCount).toBe(1)

    const repaired = circuitReducer(reset, { type: 'disconnect', connectionId: shortConnection.id })
    const repairedResult = evaluateState(repaired)
    expect(repairedResult.faults.some((f) => f.code === 'SHORT_CIRCUIT')).toBe(false)
    expect(evaluateSuccess(LEVEL, repairedResult).satisfied).toBe(true)

    const payload = selectSubmissionPayload(repaired)
    expect(payload.levelId).toBe(LEVEL.id)
    expect(payload.faultCount).toBe(1)
  })

  it('counts a second short after reset as a new event', () => {
    const connectShort: CircuitAction = {
      type: 'connect',
      from: { elementId: 'e1', terminalIndex: 0 },
      to: { elementId: 'e4', terminalIndex: 0 },
    }
    const first = run(placed, [connectShort])
    const codes = evaluateState(first).faults.map((f) => f.code)
    const afterFirst = run(first, [{ type: 'faultsEvaluated', codes }, { type: 'resetFuse' }])
    const again = circuitReducer(afterFirst, { type: 'faultsEvaluated', codes })
    expect(again.fuseBlown).toBe(true)
    expect(again.metrics.faultCount).toBe(2)
  })
})
