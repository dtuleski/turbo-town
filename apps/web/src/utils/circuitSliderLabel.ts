// Circuit Builder - slider value text gated by numeric disclosure (FR-CB-34).
// Pure and React-free. Returns the numeric suffix a slider may show, or null when the tier must
// show no digits or unit tokens (none and qualitative).
import type { LevelDefinition, NumericDisclosure } from './circuitEngine'

export type SliderKind = 'voltage' | 'light'

export function sliderValueText(
  tier: NumericDisclosure,
  kind: SliderKind,
  value: number
): string | null {
  if (tier !== 'values' && tier !== 'full') return null
  return kind === 'voltage' ? `${value} V` : `${Math.round(value * 100)}%`
}

/** The slider's visible label: always the name, followed by the value when the tier shows one. */
export function sliderLabel(name: string, valueText: string | null): string {
  return valueText === null ? name : `${name}: ${valueText}`
}

/**
 * Whether the Light level slider can matter on a level: only a solar panel reads the light level,
 * whether the player may place one or the level pre-places one.
 */
export function levelOffersSolar(
  level: Pick<LevelDefinition, 'availableComponents' | 'prePlaced'>
): boolean {
  return (
    (level.availableComponents.solar ?? 0) > 0 ||
    level.prePlaced.some((element) => element.kind === 'solar')
  )
}
