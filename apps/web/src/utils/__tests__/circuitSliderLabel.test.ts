import { describe, expect, it } from 'vitest'
import { sliderValueText } from '../circuitSliderLabel'

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
