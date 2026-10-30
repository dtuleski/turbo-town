import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RESISTOR_RESISTANCE,
  createElement,
  createLayout,
} from '../circuitEngine'
import type { CircuitLayout, CircuitResult } from '../circuitEngine'
import {
  formatQuantity,
  positiveNodePotentials,
  presentCircuit,
  toDisplayMagnitude,
} from '../circuitPresentation'
import type { DisclosureTier, PresentedCircuit } from '../circuitPresentation'
import {
  BATTERY_FIGHT,
  EMPTY,
  LONE_BATTERY,
  MIXED,
  OPEN_SWITCH,
  PARALLEL,
  REVERSED_LED,
  REVERSED_SUPPLY,
  SERIES,
  SHORTED,
  TEST_GRID,
  envAt,
  layoutFromRecipe,
  solveLayout,
} from './circuitTestLayouts'
import type { Recipe } from './circuitTestLayouts'

const TIERS: readonly DisclosureTier[] = ['none', 'qualitative', 'values', 'full']

function build(recipe: Recipe, volts = 9): { layout: CircuitLayout; result: CircuitResult } {
  const layout = layoutFromRecipe(recipe, TEST_GRID)
  return { layout, result: solveLayout(layout, recipe.switches, envAt(volts)) }
}

function numbersOf(presented: PresentedCircuit): number[] {
  const values: number[] = []
  const push = (v: unknown): void => {
    if (typeof v === 'number') values.push(v)
  }
  push(presented.supplyVoltage)
  push(presented.totalResistance)
  push(presented.totalCurrent)
  for (const e of presented.elements) {
    push(e.relativeBrightness)
    push(e.voltage)
    push(e.resistance)
    push(e.current)
  }
  return values
}

function expectCleanNumbers(presented: PresentedCircuit): void {
  for (const n of numbersOf(presented)) {
    expect(Number.isFinite(n)).toBe(true)
    expect(n).toBeGreaterThanOrEqual(0)
    expect(Object.is(n, -0)).toBe(false)
  }
}

function byId(presented: PresentedCircuit, id: string): PresentedCircuit['elements'][number] {
  const found = presented.elements.find((e) => e.elementId === id)
  if (found === undefined) throw new Error(`no element ${id}`)
  return found
}

describe('raw engine data is signed (so the helper is needed)', () => {
  it('series loop: node voltages and the battery current are negative', () => {
    const { result } = build(SERIES)
    expect(Math.min(...Object.values(result.nodeVoltages))).toBeLessThan(0)
    const battery = result.elements.find((e) => e.elementId === 'e1')
    expect(battery?.current).toBeLessThan(0)
  })

  it('reversed LED: the raw LED drop is negative', () => {
    const { result } = build(REVERSED_LED)
    const led = result.elements.find((e) => e.elementId === 'e3')
    expect(led?.voltageDrop).toBeLessThan(0)
  })
})

describe('presentCircuit: series', () => {
  const { layout, result } = build(SERIES)
  const full = presentCircuit(result, layout, 'full')

  it('reports a positive supply close to the set voltage', () => {
    expect(full.supplyVoltage).toBeGreaterThan(8.9)
    expect(full.supplyVoltage).toBeLessThanOrEqual(9)
  })

  it('has no negative number anywhere', () => {
    expectCleanNumbers(full)
  })

  it('satisfies KVL within 1e-6: load drops sum to the supply', () => {
    const drops = ['e2', 'e3'].reduce((sum, id) => sum + (byId(full, id).voltage ?? 0), 0)
    expect(Math.abs(drops - (full.supplyVoltage ?? 0))).toBeLessThan(1e-6)
  })

  it('has the same current through every element', () => {
    const current = byId(full, 'e1').current ?? 0
    expect(Math.abs((byId(full, 'e2').current ?? 0) - current)).toBeLessThan(1e-9)
    expect(Math.abs((byId(full, 'e3').current ?? 0) - current)).toBeLessThan(1e-9)
  })

  it('reports total resistance as supply over current', () => {
    const r = full.totalResistance ?? 0
    expect(r).toBeGreaterThan(499)
    expect(r).toBeLessThan(502)
    expect(Math.abs(r * (full.totalCurrent ?? 0) - (full.supplyVoltage ?? 0))).toBeLessThan(0.05)
  })

  it('reads the placed resistor as the default 470 ohm', () => {
    expect(byId(full, 'e2').resistance).toBe(DEFAULT_RESISTOR_RESISTANCE)
    expect(DEFAULT_RESISTOR_RESISTANCE).toBe(470)
  })
})

describe('presentCircuit: parallel', () => {
  const { layout, result } = build(PARALLEL)
  const full = presentCircuit(result, layout, 'full')

  it('gives every branch the supply voltage', () => {
    const supply = full.supplyVoltage ?? 0
    expect(supply).toBeGreaterThan(8)
    expect(Math.abs((byId(full, 'e2').voltage ?? 0) - supply)).toBeLessThan(1e-6)
    expect(Math.abs((byId(full, 'e3').voltage ?? 0) - supply)).toBeLessThan(1e-6)
  })

  it('has branch currents that sum to the total current', () => {
    const sum = (byId(full, 'e2').current ?? 0) + (byId(full, 'e3').current ?? 0)
    expect(Math.abs(sum - (full.totalCurrent ?? 0))).toBeLessThan(1e-9)
    expect(Math.abs(sum - (byId(full, 'e1').current ?? 0))).toBeLessThan(1e-9)
  })

  it('has no negative number anywhere', () => {
    expectCleanNumbers(full)
  })
})

describe('presentCircuit: reversed and fault layouts', () => {
  it('shows a reversed LED positive while keeping the fault state', () => {
    const { layout, result } = build(REVERSED_LED)
    const full = presentCircuit(result, layout, 'full')
    expect(result.faults.some((f) => f.code === 'REVERSED_POLARITY')).toBe(true)
    expect(byId(full, 'e3').state).toBe('spark')
    expect(byId(full, 'e3').voltage).toBeGreaterThanOrEqual(0)
    expectCleanNumbers(full)
  })

  it('shows a fully reversed supply with positive numbers', () => {
    const { layout, result } = build(REVERSED_SUPPLY)
    expectCleanNumbers(presentCircuit(result, layout, 'full'))
  })

  it('stays clean on a short circuit', () => {
    const { layout, result } = build(SHORTED)
    expect(result.faults.some((f) => f.code === 'SHORT_CIRCUIT')).toBe(true)
    const full = presentCircuit(result, layout, 'full')
    expectCleanNumbers(full)
    expect(byId(full, 'e2').state).toBe('spark')
  })

  it('stays clean when two sources fight', () => {
    const { layout, result } = build(BATTERY_FIGHT)
    expectCleanNumbers(presentCircuit(result, layout, 'full'))
  })

  it('stays clean with an open switch and reports the loads dark', () => {
    const { layout, result } = build(OPEN_SWITCH)
    const full = presentCircuit(result, layout, 'full')
    expectCleanNumbers(full)
    expect(byId(full, 'e4').state).toBe('dark')
    expect(byId(full, 'e4').brightness).toBe('off')
    expect(full.totalCurrent).toBe(0)
    expect(full.totalResistance).toBe(0)
  })

  it('stays clean for a lone battery and an empty layout', () => {
    for (const recipe of [LONE_BATTERY, EMPTY]) {
      const { layout, result } = build(recipe)
      for (const tier of TIERS) {
        expectCleanNumbers(presentCircuit(result, layout, tier))
      }
    }
  })
})

describe('presentCircuit: voltage sweep 1.5 to 12 V', () => {
  const recipes: ReadonlyArray<readonly [string, Recipe]> = [
    ['series', SERIES],
    ['parallel', PARALLEL],
    ['mixed', MIXED],
    ['reversed', REVERSED_LED],
    ['reversed supply', REVERSED_SUPPLY],
    ['short', SHORTED],
  ]

  for (const [name, recipe] of recipes) {
    it(`never emits a negative, -0 or non-finite number: ${name}`, () => {
      for (let volts = 1.5; volts <= 12; volts += 0.5) {
        const { layout, result } = build(recipe, volts)
        for (const tier of TIERS) {
          expectCleanNumbers(presentCircuit(result, layout, tier))
        }
      }
    })
  }

  it('keeps KVL and branch sums at every voltage', () => {
    for (let volts = 1.5; volts <= 12; volts += 0.5) {
      const series = build(SERIES, volts)
      const s = presentCircuit(series.result, series.layout, 'full')
      const drops = (byId(s, 'e2').voltage ?? 0) + (byId(s, 'e3').voltage ?? 0)
      expect(Math.abs(drops - (s.supplyVoltage ?? 0))).toBeLessThan(1e-6)

      const parallel = build(PARALLEL, volts)
      const p = presentCircuit(parallel.result, parallel.layout, 'full')
      const branches = (byId(p, 'e2').current ?? 0) + (byId(p, 'e3').current ?? 0)
      expect(Math.abs(branches - (p.totalCurrent ?? 0))).toBeLessThan(1e-6)
    }
  })
})

describe('presentCircuit: tier gating', () => {
  const { layout, result } = build(MIXED)
  const keysOf = (tier: DisclosureTier): Set<string> => {
    const keys = new Set<string>()
    const presented = presentCircuit(result, layout, tier)
    for (const e of presented.elements) {
      for (const k of Object.keys(e)) keys.add(k)
    }
    return keys
  }

  it('none: exactly elementId, kind and state, and no totals', () => {
    const presented = presentCircuit(result, layout, 'none')
    for (const e of presented.elements) {
      expect(Object.keys(e).sort()).toEqual(['elementId', 'kind', 'state'])
    }
    expect(presented.supplyVoltage).toBeUndefined()
    expect(presented.totalResistance).toBeUndefined()
    expect(presented.totalCurrent).toBeUndefined()
    expect(numbersOf(presented)).toEqual([])
  })

  it('qualitative: adds brightness only', () => {
    expect([...keysOf('qualitative')].sort()).toEqual(
      ['brightness', 'elementId', 'kind', 'relativeBrightness', 'state'].sort()
    )
    const presented = presentCircuit(result, layout, 'qualitative')
    expect(presented.supplyVoltage).toBeUndefined()
    expect(presented.totalCurrent).toBeUndefined()
  })

  it('values: adds voltage, resistance and supply, not current', () => {
    const keys = keysOf('values')
    expect(keys.has('voltage')).toBe(true)
    expect(keys.has('resistance')).toBe(true)
    expect(keys.has('current')).toBe(false)
    const presented = presentCircuit(result, layout, 'values')
    expect(presented.supplyVoltage).toBeGreaterThan(0)
    expect(presented.totalResistance).toBeUndefined()
    expect(presented.totalCurrent).toBeUndefined()
  })

  it('full: adds current and totals', () => {
    expect(keysOf('full').has('current')).toBe(true)
    const presented = presentCircuit(result, layout, 'full')
    expect(presented.totalCurrent).toBeGreaterThan(0)
    expect(presented.totalResistance).toBeGreaterThan(0)
  })

  it('key sets form a subset chain', () => {
    const chain = TIERS.map((tier) => keysOf(tier))
    for (let i = 1; i < chain.length; i += 1) {
      const previous = chain[i - 1]
      const current = chain[i]
      if (previous === undefined || current === undefined) throw new Error('chain')
      for (const key of previous) {
        expect(current.has(key)).toBe(true)
      }
      expect(current.size).toBeGreaterThan(previous.size)
    }
  })

  it('reports resistance only for resistor, led, motor and buzzer', () => {
    const presented = presentCircuit(result, layout, 'values')
    for (const e of presented.elements) {
      const hasResistance = e.resistance !== undefined
      expect(hasResistance).toBe(['resistor', 'led', 'motor', 'buzzer'].includes(e.kind))
    }
  })

  it('reads a pre-set resistor value from the layout params', () => {
    const custom = createLayout(
      [
        createElement('battery', { id: 'b' }),
        createElement('resistor', { id: 'r', params: { resistance: 220 } }),
        createElement('led', { id: 'l' }),
      ],
      [
        { id: 'c1', from: 'b:0', to: 'r:0' },
        { id: 'c2', from: 'r:1', to: 'l:0' },
        { id: 'c3', from: 'l:1', to: 'b:1' },
      ],
      TEST_GRID
    )
    const r = solveLayout(custom, {})
    expect(byId(presentCircuit(r, custom, 'values'), 'r').resistance).toBe(220)
  })

  it('relative brightness is within 0..1 and 1 for the brightest rated load', () => {
    const presented = presentCircuit(result, layout, 'qualitative')
    const rel = presented.elements
      .filter((e) => ['led', 'motor', 'buzzer'].includes(e.kind))
      .map((e) => e.relativeBrightness ?? -1)
    expect(Math.max(...rel)).toBe(1)
    for (const v of rel) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})

describe('positiveNodePotentials', () => {
  it('has an exact zero minimum and nothing below it', () => {
    const { result } = build(SERIES)
    const potentials = positiveNodePotentials(result)
    const values = Object.values(potentials)
    expect(Math.min(...values)).toBe(0)
    expect(Object.is(Math.min(...values), -0)).toBe(false)
    expect(Math.max(...values)).toBeGreaterThan(8.9)
    for (const v of values) expect(v).toBeGreaterThanOrEqual(0)
  })

  it('returns an empty record for an empty node set', () => {
    const { result } = build(EMPTY)
    expect(positiveNodePotentials({ ...result, nodeVoltages: {} })).toEqual({})
  })

  it('drops non-finite potentials', () => {
    const { result } = build(SERIES)
    const poisoned: CircuitResult = { ...result, nodeVoltages: { a: -5, b: Number.NaN, c: 0 } }
    expect(positiveNodePotentials(poisoned)).toEqual({ a: 0, c: 5 })
  })
})

describe('toDisplayMagnitude', () => {
  it('maps negatives, -0 and non-finite values to non-negative finite numbers', () => {
    expect(toDisplayMagnitude(-3.5)).toBe(3.5)
    expect(Object.is(toDisplayMagnitude(-0), 0)).toBe(true)
    expect(toDisplayMagnitude(Number.NaN)).toBe(0)
    expect(toDisplayMagnitude(Number.POSITIVE_INFINITY)).toBe(0)
    expect(toDisplayMagnitude(Number.NEGATIVE_INFINITY)).toBe(0)
    expect(toDisplayMagnitude(2)).toBe(2)
  })
})

describe('formatQuantity', () => {
  it('uses the locale decimal separator', () => {
    expect(formatQuantity(8.99, 'V', 'en')).toBe('8.99 V')
    expect(formatQuantity(8.99, 'V', 'pt-BR')).toBe('8,99 V')
    expect(formatQuantity(8.99, 'V', 'es')).toBe('8,99 V')
  })

  it('reads currents below one ampere in mA', () => {
    expect(formatQuantity(0.0179, 'A', 'en')).toBe('17.9 mA')
    expect(formatQuantity(1.5, 'A', 'en')).toBe('1.5 A')
  })

  it('formats ohms with the omega symbol', () => {
    expect(formatQuantity(470, 'ohm', 'en')).toBe('470 Ω')
  })

  it('never prints a negative sign', () => {
    for (const unit of ['V', 'ohm', 'A'] as const) {
      expect(formatQuantity(-4.2, unit, 'en')).not.toContain('-')
      expect(formatQuantity(-0, unit, 'en')).not.toContain('-')
      expect(formatQuantity(Number.NaN, unit, 'en')).not.toContain('NaN')
    }
  })

  it('falls back to English for an invalid locale tag', () => {
    expect(formatQuantity(3, 'V', 'not a locale!!')).toBe('3 V')
  })
})
