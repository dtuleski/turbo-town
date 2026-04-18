/**
 * Space Entry Game — Spatial Precision Physics
 *
 * New model: the player adjusts controls to overlap a predicted landing spot
 * (green dot) with a target (red dot) on a globe, then fires.
 *
 * Controls → landing position:
 *   Entry Angle  → latitude offset
 *   Thruster Power → distance multiplier (medium/hard)
 *   Lateral Correction → longitude offset (hard only)
 */

import type { DifficultyConfig } from './spaceEntryConfig'

export type Outcome = 'SUCCESSFUL_LANDING' | 'ORBITAL_BURN_UP' | 'SKIP_OFF'

export interface LandingPrediction {
  predictedLat: number // -90 to 90
  predictedLng: number // -180 to 180
  distanceKm: number // great-circle distance from target
  accuracy: number // 0–100 (100 = perfect landing)
  heatShieldRemaining: number // 0–100
  outcome: Outcome
}

/* ------------------------------------------------------------------ */
/*  Haversine distance (km) between two lat/lng pairs                 */
/* ------------------------------------------------------------------ */
const EARTH_RADIUS_KM = 6371

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/* ------------------------------------------------------------------ */
/*  Heat-shield degradation (steeper angle = more heat)               */
/* ------------------------------------------------------------------ */
export function calculateHeatShieldDegradation(
  entryAngle: number,
  config: DifficultyConfig,
): number {
  const degradation =
    config.baseDegradationRate * (entryAngle / config.referenceAngle)
  return Math.max(0, degradation)
}

/* ------------------------------------------------------------------ */
/*  Core prediction — pure function                                   */
/* ------------------------------------------------------------------ */
export function predictLanding(
  targetLat: number,
  targetLng: number,
  entryAngle: number,
  thrusterPower: number,
  lateralCorrection: number,
  config: DifficultyConfig,
  turbulenceOffset: number = 0,
): LandingPrediction {
  // --- latitude offset from entry angle ---
  const effectiveAngle = entryAngle + turbulenceOffset
  let latOffset = (effectiveAngle - config.referenceAngle) * config.latSensitivity

  // --- longitude offset from lateral correction ---
  let lngOffset = lateralCorrection * config.lngSensitivity

  // --- thruster distance multiplier ---
  const distanceMultiplier =
    1 + (thrusterPower - config.optimalThrusterPower) * 0.02
  latOffset *= distanceMultiplier
  lngOffset *= distanceMultiplier

  // --- predicted position (clamped to valid ranges) ---
  const predictedLat = Math.max(-90, Math.min(90, targetLat + latOffset))
  const predictedLng = Math.max(-180, Math.min(180, targetLng + lngOffset))

  // --- distance & accuracy ---
  const distanceKm = haversineDistance(predictedLat, predictedLng, targetLat, targetLng)
  const accuracy = Math.max(0, Math.min(100, 100 - distanceKm * config.distancePenalty))

  // --- heat shield ---
  const degradation = calculateHeatShieldDegradation(effectiveAngle, config)
  const heatShieldRemaining = Math.max(0, Math.min(100, config.initialHeatShield - degradation))

  // --- outcome ---
  let outcome: Outcome
  if (heatShieldRemaining <= 0) {
    outcome = 'ORBITAL_BURN_UP'
  } else if (accuracy <= 20) {
    outcome = 'SKIP_OFF'
  } else {
    outcome = 'SUCCESSFUL_LANDING'
  }

  return {
    predictedLat,
    predictedLng,
    distanceKm,
    accuracy,
    heatShieldRemaining,
    outcome,
  }
}
