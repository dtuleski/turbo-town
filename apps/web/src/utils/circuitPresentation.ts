// Circuit Builder — presentation helper (Constraint A).
//
// Engine values are referenced to the positive rail and signed by current direction; learners
// expect a positive supply and positive drops. This module is the only place that converts. The
// engine is untouched.
//
// Pure and React-free. Numeric disclosure (FR-CB-34) is enforced here by construction: a tier
// builds its objects from an explicit field list, so a number that a tier must not show is never
// present on the object rather than merely hidden by the UI.
//
// Units are SI symbols (V, Ω, A and mA). They are formatted with Intl.NumberFormat so the decimal
// separator follows the locale (comma for pt and es); they are not words and so do not live in the
// locale files.

import { DEFAULT_RESISTOR_RESISTANCE, ELEMENT_SPECS } from './circuitEngine'
import type {
  CircuitLayout,
  CircuitResult,
  ElementKind,
  ElementResult,
  NumericDisclosure,
} from './circuitEngine'

export type DisclosureTier = NumericDisclosure
export type ElementVisualState = 'lit' | 'dim' | 'dark' | 'spark'
export type BrightnessLabel = 'off' | 'dim' | 'medium' | 'bright'

export interface PresentedElement {
  elementId: string
  kind: ElementKind
  /** Every tier. */
  state: ElementVisualState
  /** Qualitative and above. */
  brightness?: BrightnessLabel
  /** Qualitative and above: dimensionless, 0..1. */
  relativeBrightness?: number
  /** Values and above: volts, never negative. */
  voltage?: number
  /** Values and above: ohms, never negative. Loads only. */
  resistance?: number
  /** Full only: amperes, never negative. */
  current?: number
}

export interface PresentedCircuit {
  tier: DisclosureTier
  elements: PresentedElement[]
  /** Values and above. */
  supplyVoltage?: number
  /** Full only. */
  totalResistance?: number
  totalCurrent?: number
}

/** Below this intensity a lit rated load reads as dim. */
const DIM_INTENSITY = 0.4
/** Below this intensity (and above dim) a load reads as medium. */
const MEDIUM_INTENSITY = 0.75

/** Kinds whose result carries a meaningful brightness: they declare a rated current. */
function isRatedKind(kind: ElementKind): boolean {
  return ELEMENT_SPECS[kind].ratedCurrent !== undefined
}

/** Kinds that report a resistance to the learner. */
const RESISTANCE_KINDS: readonly ElementKind[] = ['resistor', 'led', 'motor', 'buzzer']

/**
 * A finite number becomes its magnitude. Anything else (NaN, Infinity) and negative zero become 0,
 * so no presented number is ever negative, `-0` or non-finite.
 */
export function toDisplayMagnitude(n: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    return 0
  }
  const magnitude = Math.abs(n)
  return magnitude === 0 ? 0 : magnitude
}

/**
 * Node potentials shifted so the lowest node is exactly 0 V and every other node is above it.
 * The engine references the positive terminal, so raw values are zero or negative.
 */
export function positiveNodePotentials(result: CircuitResult): Record<string, number> {
  const entries = Object.entries(result.nodeVoltages).filter(([, value]) => Number.isFinite(value))
  const potentials: Record<string, number> = {}
  if (entries.length === 0) {
    return potentials
  }
  let min = Infinity
  for (const [, value] of entries) {
    if (value < min) {
      min = value
    }
  }
  for (const [node, value] of entries) {
    const shifted = value - min
    potentials[node] = shifted > 0 ? shifted : 0
  }
  return potentials
}

/** `V`, `ohm` or `A` with the locale's decimal separator. Currents below 1 A read in mA. */
export function formatQuantity(value: number, unit: 'V' | 'ohm' | 'A', locale: string): string {
  const magnitude = toDisplayMagnitude(value)
  const format = (n: number, maximumFractionDigits: number): string => {
    const options = { maximumFractionDigits }
    try {
      return new Intl.NumberFormat(locale, options).format(n)
    } catch {
      return new Intl.NumberFormat('en', options).format(n)
    }
  }
  if (unit === 'A') {
    if (magnitude < 1) {
      return `${format(toDisplayMagnitude(magnitude * 1000), 1)} mA`
    }
    return `${format(magnitude, 2)} A`
  }
  if (unit === 'V') {
    return `${format(magnitude, 2)} V`
  }
  return `${format(magnitude, 1)} Ω`
}

function brightnessLabel(intensity: number): BrightnessLabel {
  if (!(intensity > 0)) {
    return 'off'
  }
  if (intensity < DIM_INTENSITY) {
    return 'dim'
  }
  return intensity < MEDIUM_INTENSITY ? 'medium' : 'bright'
}

function visualState(
  element: ElementResult,
  faulted: ReadonlySet<string>,
  intensity: number
): ElementVisualState {
  if (faulted.has(element.elementId)) {
    return 'spark'
  }
  if (!element.energized) {
    return 'dark'
  }
  return isRatedKind(element.kind) && intensity < DIM_INTENSITY ? 'dim' : 'lit'
}

function resistanceOf(kind: ElementKind, layout: CircuitLayout, elementId: string): number | undefined {
  if (!RESISTANCE_KINDS.includes(kind)) {
    return undefined
  }
  const fixed = ELEMENT_SPECS[kind].resistance
  if (fixed !== undefined) {
    return toDisplayMagnitude(fixed)
  }
  const placed = layout.elements.find((candidate) => candidate.id === elementId)
  const custom = placed?.params?.resistance
  return toDisplayMagnitude(typeof custom === 'number' ? custom : DEFAULT_RESISTOR_RESISTANCE)
}

/** The source delivering the most current; ties broken by id so the choice is stable. */
function dominantSource(result: CircuitResult): ElementResult | undefined {
  let best: ElementResult | undefined
  for (const element of result.elements) {
    if (!ELEMENT_SPECS[element.kind].isSource) {
      continue
    }
    const current = toDisplayMagnitude(element.current)
    const bestCurrent = best === undefined ? -1 : toDisplayMagnitude(best.current)
    if (current > bestCurrent || (current === bestCurrent && best !== undefined && element.elementId < best.elementId)) {
      best = element
    }
  }
  return best
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }
  return value > 1 ? 1 : value
}

/**
 * Present a raw engine result at a disclosure tier. Every number is a non-negative finite
 * magnitude. Tiers are cumulative: none ⊂ qualitative ⊂ values ⊂ full.
 */
export function presentCircuit(
  result: CircuitResult,
  layout: CircuitLayout,
  tier: DisclosureTier
): PresentedCircuit {
  const faulted = new Set<string>()
  for (const fault of result.faults) {
    for (const id of fault.elementIds) {
      faulted.add(id)
    }
  }

  let maxRatedIntensity = 0
  for (const element of result.elements) {
    if (isRatedKind(element.kind)) {
      maxRatedIntensity = Math.max(maxRatedIntensity, clampUnit(element.intensity))
    }
  }

  const showBrightness = tier !== 'none'
  const showValues = tier === 'values' || tier === 'full'
  const showFull = tier === 'full'

  const elements: PresentedElement[] = result.elements.map((element) => {
    const intensity = clampUnit(element.intensity)
    const presented: PresentedElement = {
      elementId: element.elementId,
      kind: element.kind,
      state: visualState(element, faulted, intensity),
    }
    if (showBrightness) {
      presented.brightness = brightnessLabel(intensity)
      presented.relativeBrightness =
        isRatedKind(element.kind) && maxRatedIntensity > 0 ? intensity / maxRatedIntensity : 0
    }
    if (showValues) {
      presented.voltage = toDisplayMagnitude(element.voltageDrop)
      const resistance = resistanceOf(element.kind, layout, element.elementId)
      if (resistance !== undefined) {
        presented.resistance = resistance
      }
    }
    if (showFull) {
      presented.current = toDisplayMagnitude(element.current)
    }
    return presented
  })

  const presented: PresentedCircuit = { tier, elements }
  if (showValues) {
    const source = dominantSource(result)
    presented.supplyVoltage = source === undefined ? 0 : toDisplayMagnitude(source.voltageDrop)
  }
  if (showFull) {
    presented.totalResistance = result.closedPathExists ? toDisplayMagnitude(result.totalResistance) : 0
    presented.totalCurrent = result.closedPathExists ? toDisplayMagnitude(result.totalCurrent) : 0
  }
  return presented
}
