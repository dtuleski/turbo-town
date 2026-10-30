// Circuit Builder - slider value text gated by numeric disclosure (FR-CB-34).
// Pure and React-free. Returns the numeric suffix a slider may show, or null when the tier must
// show no digits or unit tokens (none and qualitative).
import type { NumericDisclosure } from './circuitEngine'

export type SliderKind = 'voltage' | 'light'

export function sliderValueText(
  tier: NumericDisclosure,
  kind: SliderKind,
  value: number
): string | null {
  if (tier !== 'values' && tier !== 'full') return null
  return kind === 'voltage' ? `${value} V` : `${Math.round(value * 100)}%`
}
