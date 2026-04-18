/**
 * Space Entry Game — Difficulty configurations and game constants
 */

export type SpaceEntryDifficulty = 'easy' | 'medium' | 'hard'

export interface DifficultyConfig {
  idealAngleMin: number
  idealAngleMax: number
  tolerance: number
  initialHeatShield: number
  baseDegradationRate: number
  referenceAngle: number
  turbulenceRange: number // 0 for easy/medium
}

export const DIFFICULTY_CONFIGS: Record<SpaceEntryDifficulty, DifficultyConfig> = {
  easy: {
    idealAngleMin: 5,
    idealAngleMax: 12,
    tolerance: 3,
    initialHeatShield: 100,
    baseDegradationRate: 15,
    referenceAngle: 8.5,
    turbulenceRange: 0,
  },
  medium: {
    idealAngleMin: 5.5,
    idealAngleMax: 9,
    tolerance: 1.5,
    initialHeatShield: 80,
    baseDegradationRate: 25,
    referenceAngle: 7.25,
    turbulenceRange: 0,
  },
  hard: {
    idealAngleMin: 6,
    idealAngleMax: 8,
    tolerance: 0.5,
    initialHeatShield: 60,
    baseDegradationRate: 35,
    referenceAngle: 7,
    turbulenceRange: 0.5,
  },
}

export const ANIMATION_DURATION_MS = { min: 3000, max: 6000 }
export const MAX_GAME_TIME_SECONDS = 600
export const BASE_VELOCITY = 7800 // m/s (approximate orbital velocity)
