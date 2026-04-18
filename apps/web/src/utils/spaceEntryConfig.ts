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
  countdownSeconds: number // time limit to set angle
  showAngleHint: boolean // whether to show the safe range hint
  showTrajectoryColor: boolean // whether trajectory arc shows color feedback
  hintText: string // i18n key for the hint text
  showThrusterPower: boolean // whether thruster power slider is shown
  showLateralCorrection: boolean // whether lateral correction slider is shown
  optimalThrusterPower: number // the ideal thruster power for this difficulty (50-70)
  thrusterTolerance: number // how far from optimal before accuracy drops
  tutorialKey: string // i18n key for tutorial text
  latSensitivity: number // how much 1° angle moves landing lat
  lngSensitivity: number // how much 1° lateral moves landing lng
  distancePenalty: number // how fast accuracy drops with distance
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
    countdownSeconds: 60,
    showAngleHint: true,
    showTrajectoryColor: true,
    hintText: 'spaceEntry.hintEasy',
    showThrusterPower: false,
    showLateralCorrection: false,
    optimalThrusterPower: 60,
    thrusterTolerance: 30,
    tutorialKey: 'spaceEntry.tutorialEasy',
    latSensitivity: 2,
    lngSensitivity: 0,
    distancePenalty: 0.5,
  },
  medium: {
    idealAngleMin: 5.5,
    idealAngleMax: 9,
    tolerance: 1.5,
    initialHeatShield: 80,
    baseDegradationRate: 25,
    referenceAngle: 7.25,
    turbulenceRange: 0,
    countdownSeconds: 30,
    showAngleHint: true,
    showTrajectoryColor: false,
    hintText: 'spaceEntry.hintMedium',
    showThrusterPower: true,
    showLateralCorrection: false,
    optimalThrusterPower: 65,
    thrusterTolerance: 15,
    tutorialKey: 'spaceEntry.tutorialMedium',
    latSensitivity: 4,
    lngSensitivity: 0,
    distancePenalty: 1,
  },
  hard: {
    idealAngleMin: 6,
    idealAngleMax: 8,
    tolerance: 0.5,
    initialHeatShield: 60,
    baseDegradationRate: 35,
    referenceAngle: 7,
    turbulenceRange: 0.5,
    countdownSeconds: 15,
    showAngleHint: false,
    showTrajectoryColor: false,
    hintText: '',
    showThrusterPower: true,
    showLateralCorrection: true,
    optimalThrusterPower: 70,
    thrusterTolerance: 10,
    tutorialKey: 'spaceEntry.tutorialHard',
    latSensitivity: 6,
    lngSensitivity: 3,
    distancePenalty: 2,
  },
}

export const ANIMATION_DURATION_MS = { min: 3000, max: 6000 }
export const MAX_GAME_TIME_SECONDS = 600
export const BASE_VELOCITY = 7800 // m/s (approximate orbital velocity)
