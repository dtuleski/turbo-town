/**
 * Space Entry Game — Pure physics functions for trajectory calculation
 * No side effects — all randomness is injected via parameters.
 */

import type { DifficultyConfig } from './spaceEntryConfig'

export type Outcome = 'SUCCESSFUL_LANDING' | 'ORBITAL_BURN_UP' | 'SKIP_OFF'

export interface TrajectoryResult {
  outcome: Outcome
  landingZoneAccuracy: number // 0–100
  heatShieldRemaining: number // 0–100
  finalAngle: number // effective angle after turbulence
  thrusterAccuracy: number // 0–100
  lateralAccuracy: number // 0–100
}

/**
 * Determine outcome from effective angle and difficulty thresholds.
 * - Below idealAngleMin - tolerance → SKIP_OFF
 * - Above idealAngleMax + tolerance → ORBITAL_BURN_UP
 * - Otherwise → SUCCESSFUL_LANDING
 */
export function determineOutcome(
  effectiveAngle: number,
  config: DifficultyConfig
): Outcome {
  if (effectiveAngle < config.idealAngleMin - config.tolerance) {
    return 'SKIP_OFF'
  }
  if (effectiveAngle > config.idealAngleMax + config.tolerance) {
    return 'ORBITAL_BURN_UP'
  }
  return 'SUCCESSFUL_LANDING'
}

/**
 * Calculate heat shield degradation.
 * Formula: baseDegradationRate × (entryAngle / referenceAngle) × atmosphericDensity
 * Returns a non-negative degradation amount.
 */
export function calculateHeatShieldDegradation(
  entryAngle: number,
  atmosphericDensity: number,
  config: DifficultyConfig
): number {
  const degradation =
    config.baseDegradationRate *
    (entryAngle / config.referenceAngle) *
    atmosphericDensity
  return Math.max(0, degradation)
}

/**
 * Calculate landing accuracy based on angular deviation from ideal.
 * Zero deviation → 100, maximum tolerated deviation → 0.
 */
export function calculateLandingAccuracy(
  entryAngle: number,
  idealAngle: number,
  tolerance: number
): number {
  const deviation = Math.abs(entryAngle - idealAngle)
  if (tolerance <= 0) return deviation === 0 ? 100 : 0
  const accuracy = Math.max(0, 100 * (1 - deviation / tolerance))
  return accuracy
}

/**
 * Core trajectory calculator — pure function.
 * Applies turbulence offset, determines outcome, computes degradation,
 * checks shield depletion override, and returns TrajectoryResult.
 */
export function calculateTrajectory(
  entryAngle: number,
  atmosphericDensity: number,
  config: DifficultyConfig,
  turbulenceOffset: number = 0,
  thrusterPower: number = 60,
  lateralCorrection: number = 0
): TrajectoryResult {
  // Apply turbulence to get effective angle
  const effectiveAngle = entryAngle + turbulenceOffset

  // Determine base outcome
  let outcome = determineOutcome(effectiveAngle, config)

  // Compute heat shield degradation (thruster power adds extra degradation)
  const degradation = calculateHeatShieldDegradation(
    effectiveAngle,
    atmosphericDensity,
    config
  ) + thrusterPower * 0.1
  const heatShieldRemaining = Math.max(0, config.initialHeatShield - degradation)

  // Heat shield depletion overrides outcome to burn-up
  if (heatShieldRemaining <= 0) {
    outcome = 'ORBITAL_BURN_UP'
  }

  // Compute landing accuracy (use midpoint of ideal range as the ideal angle)
  const idealAngle = (config.idealAngleMin + config.idealAngleMax) / 2
  // Use the full half-range + tolerance as the tolerance for accuracy calculation
  const accuracyTolerance = (config.idealAngleMax - config.idealAngleMin) / 2 + config.tolerance
  const baseAccuracy = calculateLandingAccuracy(
    effectiveAngle,
    idealAngle,
    accuracyTolerance
  )

  // Thruster accuracy penalty: being far from optimal reduces accuracy
  const thrusterAccuracy = Math.max(0, 100 - Math.abs(thrusterPower - config.optimalThrusterPower) / config.thrusterTolerance * 50)

  // Lateral penalty: any lateral offset reduces accuracy
  const lateralAccuracy = Math.max(0, 100 - Math.abs(lateralCorrection) * 5)

  // Final accuracy = min(baseAccuracy, thrusterAccuracy) * (lateralAccuracy / 100)
  const landingZoneAccuracy = Math.min(baseAccuracy, thrusterAccuracy) * (lateralAccuracy / 100)

  return {
    outcome,
    landingZoneAccuracy: Math.min(100, Math.max(0, landingZoneAccuracy)),
    heatShieldRemaining: Math.min(100, Math.max(0, heatShieldRemaining)),
    finalAngle: effectiveAngle,
    thrusterAccuracy: Math.min(100, Math.max(0, thrusterAccuracy)),
    lateralAccuracy: Math.min(100, Math.max(0, lateralAccuracy)),
  }
}
