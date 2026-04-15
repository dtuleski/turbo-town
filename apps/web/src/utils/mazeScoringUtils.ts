import type { DifficultyLevel } from './mazeGenerator'

export interface MazeGameResult {
  difficulty: DifficultyLevel
  completionTime: number      // seconds elapsed
  totalTime: number           // total allowed time
  gatesAttempted: number
  gatesSolved: number
  collectiblesGathered: number
  totalCollectibles: number
  reachedExit: boolean
}

export interface MazeScoreBreakdown {
  baseScore: number
  difficultyMultiplier: number
  speedBonus: number
  accuracyBonus: number
  collectibleBonus: number
  finalScore: number
}

const DIFFICULTY_MULTIPLIERS: Record<DifficultyLevel, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
}

export function calculateMazeScore(result: MazeGameResult): MazeScoreBreakdown {
  const baseScore = 1000
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[result.difficulty]
  const speedBonus = Math.max(0.1, 1 + (result.totalTime - result.completionTime) / result.totalTime)
  const accuracyBonus = 1 + (result.gatesSolved / Math.max(1, result.gatesAttempted)) * 0.5
  const collectibleBonus = result.collectiblesGathered * 50
  const finalScore = Math.round(baseScore * difficultyMultiplier * speedBonus * accuracyBonus) + collectibleBonus

  return {
    baseScore,
    difficultyMultiplier,
    speedBonus,
    accuracyBonus,
    collectibleBonus,
    finalScore,
  }
}
