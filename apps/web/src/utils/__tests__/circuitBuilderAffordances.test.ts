import { describe, expect, it } from 'vitest'
import {
  connectionTargets,
  partCaption,
  polarityMarks,
  selectActionBar,
} from '../circuitBuilderAffordances'
import { createInitialSelection } from '../circuitBuilderInteraction'
import { circuitReducer, createInitialState } from '../circuitBuilderState'
import type { CircuitAction } from '../circuitBuilderState'
import { getLevel } from '../circuitEngine'
import type { LevelDefinition } from '../circuitEngine'

function level(id: string): LevelDefinition {
  const found = getLevel(id)
  if (found === undefined) throw new Error(`missing ${id}`)
  return found
}

function build(...actions: readonly CircuitAction[]) {
  return actions.reduce(circuitReducer, createInitialState(level('sandbox')))
}

const TWO_PARTS = build(
  { type: 'place', kind: 'battery', cell: { col: 1, row: 1 } },
  { type: 'place', kind: 'led', cell: { col: 4, row: 1 } }
)

describe('connectionTargets', () => {
  it('lists every dot except the pending one', () => {
    const targets = connectionTargets(TWO_PARTS.layout, { elementId: 'e1', terminalIndex: 0 })
    expect(targets).toEqual([
      { elementId: 'e1', terminalIndex: 1 },
      { elementId: 'e2', terminalIndex: 0 },
      { elementId: 'e2', terminalIndex: 1 },
    ])
  })

  it('leaves out dots that are already linked to the pending dot', () => {
    const linked = circuitReducer(TWO_PARTS, {
      type: 'connect',
      from: { elementId: 'e1', terminalIndex: 0 },
      to: { elementId: 'e2', terminalIndex: 0 },
    })
    const targets = connectionTargets(linked.layout, { elementId: 'e1', terminalIndex: 0 })
    expect(targets).not.toContainEqual({ elementId: 'e2', terminalIndex: 0 })
    expect(targets).toContainEqual({ elementId: 'e2', terminalIndex: 1 })
  })

  it('returns nothing for an unknown element', () => {
    expect(connectionTargets(TWO_PARTS.layout, { elementId: 'nope', terminalIndex: 0 })).toEqual([])
  })
})

describe('selectActionBar', () => {
  it('offers Remove only for a selected, existing, unlocked part', () => {
    expect(selectActionBar(TWO_PARTS, createInitialSelection()).removableElementId).toBeNull()
    const selected = { ...createInitialSelection(), selectedElementId: 'e2' }
    expect(selectActionBar(TWO_PARTS, selected).removableElementId).toBe('e2')
    const stale = { ...createInitialSelection(), selectedElementId: 'gone' }
    expect(selectActionBar(TWO_PARTS, stale).removableElementId).toBeNull()
    const locked = { ...TWO_PARTS, lockedElementIds: ['e2'] }
    expect(selectActionBar(locked, selected).removableElementId).toBeNull()
  })

  it('offers Cancel while a tray part is armed or a link is half made', () => {
    expect(selectActionBar(TWO_PARTS, createInitialSelection()).canCancel).toBe(false)
    expect(selectActionBar(TWO_PARTS, { ...createInitialSelection(), armedKind: 'led' }).canCancel).toBe(true)
    expect(
      selectActionBar(TWO_PARTS, {
        ...createInitialSelection(),
        pendingTerminal: { elementId: 'e1', terminalIndex: 0 },
      }).canCancel
    ).toBe(true)
  })
})

describe('polarity marks and captions', () => {
  it('marks sources and the LED, and nothing else', () => {
    expect(polarityMarks('battery')).toEqual(['+', '\u2212'])
    expect(polarityMarks('solar')).toEqual(['+', '\u2212'])
    expect(polarityMarks('led')).toEqual(['+', '\u2212'])
    for (const kind of ['resistor', 'wire', 'switch', 'motor', 'buzzer'] as const) {
      expect(polarityMarks(kind)).toBeNull()
    }
  })

  it('adds a direction arrow to polarized parts only', () => {
    expect(partCaption('led', 'LED')).toBe('LED \u2192')
    expect(partCaption('resistor', 'RES')).toBe('RES')
  })
})
