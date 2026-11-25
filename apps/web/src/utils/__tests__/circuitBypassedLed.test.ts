import { describe, expect, it } from 'vitest'
import { evaluateSuccess } from '../circuitEngine'
import { isGlowing } from '../circuitBuilderRenderer'
import { isConnectionEnergized } from '../circuitPresentation'
import { mustLevel, solveRecipe } from './circuitTestLayouts'
import type { Recipe } from './circuitTestLayouts'

/** Owner-reported layout: the LED's right terminal connects to nothing and the battery's right
 * terminal lands on the LED's LEFT terminal, so the LED is bypassed. */
const BYPASSED_LED: Recipe = {
  placed: [
    ['e1', 'battery'],
    ['e2', 'resistor'],
    ['e3', 'led'],
  ],
  conns: [
    ['e1:0', 'e2:0'],
    ['e2:1', 'e3:0'],
    ['e1:1', 'e3:0'],
  ],
  switches: {},
}

describe('bypassed LED on cb-01', () => {
  const level = mustLevel('cb-01-closed-circuit')
  const { result } = solveRecipe(level, BYPASSED_LED)
  const byId = new Map(result.elements.map((entry) => [entry.elementId, entry]))

  it('is not a solution', () => {
    expect(evaluateSuccess(level, result).satisfied).toBe(false)
  })

  it('does not draw the LED, or the line joining it, as lit', () => {
    expect(isGlowing(byId.get('e3'))).toBe(false)
    expect(isConnectionEnergized(byId.get('e1'), byId.get('e3'), false)).toBe(false)
    expect(isConnectionEnergized(byId.get('e2'), byId.get('e3'), false)).toBe(false)
  })

  it('still lights the real loop through the resistor', () => {
    expect(isConnectionEnergized(byId.get('e1'), byId.get('e2'), false)).toBe(true)
  })

  it('treats a missing result as dark', () => {
    expect(isGlowing(undefined)).toBe(false)
  })
})
