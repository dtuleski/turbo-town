import { describe, expect, it } from 'vitest'
import { levelOffersSolar, sliderLabel, sliderValueText } from '../circuitSliderLabel'
import { getLevel, listLevels } from '../circuitEngine'

describe('sliderValueText', () => {
  it('shows no digits or units for none and qualitative', () => {
    for (const tier of ['none', 'qualitative'] as const) {
      expect(sliderValueText(tier, 'voltage', 9)).toBeNull()
      expect(sliderValueText(tier, 'light', 1)).toBeNull()
    }
  })

  it('shows numbers for values and full', () => {
    for (const tier of ['values', 'full'] as const) {
      expect(sliderValueText(tier, 'voltage', 9)).toBe('9 V')
      expect(sliderValueText(tier, 'light', 0.55)).toBe('55%')
    }
  })
})

describe('sliderLabel', () => {
  it('keeps the name when no value is shown', () => {
    expect(sliderLabel('Supply voltage', null)).toBe('Supply voltage')
  })

  it('keeps the name in front of the value', () => {
    expect(sliderLabel('Supply voltage', '9 V')).toBe('Supply voltage: 9 V')
  })
})

describe('levelOffersSolar', () => {
  it('is false for the first level and true for any level that offers a solar panel', () => {
    const first = getLevel('cb-01-closed-circuit')
    if (first === undefined) throw new Error('missing cb-01')
    expect(levelOffersSolar(first)).toBe(false)
    const withSolar = listLevels().filter((level) => (level.availableComponents.solar ?? 0) > 0)
    expect(withSolar.length).toBeGreaterThan(0)
    for (const level of withSolar) expect(levelOffersSolar(level)).toBe(true)
  })

  it('counts a pre-placed solar panel', () => {
    expect(
      levelOffersSolar({
        availableComponents: {},
        prePlaced: [
          { id: 's', kind: 'solar', terminals: ['s:0', 's:1'], position: { col: 0, row: 0, rotation: 0 } },
        ],
      })
    ).toBe(true)
  })
})
