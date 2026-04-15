import type { DifficultyLevel } from './mazeGenerator'

export interface MazeGameResult {
  difficulty: DifficultyLevel
  completionTime: number      // seconds elapsed
  totalTime: number           // total allowed time
  gatesAttempted: number
  gatesSolved: number
  collectiblesGathered: number
  totalCollectibles: number
  totalGates: number          // total gates in the maze
  stepsTaken: number          // total movement steps
  reachedExit: boolean
}

export interface MazeScoreBreakdown {
  baseScore: number
  difficultyMultiplier: number
  speedBonus: number
  accuracyBonus: number
  efficiencyBonus: number     // fewer steps = higher bonus
  gatesSolvedBonus: number    // more gates solved = more points
  collectibleBonus: number
  finalScore: number
}

const DIFFICULTY_MULTIPLIERS: Record<DifficultyLevel, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
}

// Optimal step counts per difficulty (approximate shortest path length)
const OPTIMAL_STEPS: Record<DifficultyLevel, number> = {
  easy: 12,
  medium: 18,
  hard: 24,
}

export function calculateMazeScore(result: MazeGameResult): MazeScoreBreakdown {
  const baseScore = 1000
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[result.difficulty]

  // Speed bonus: faster = higher (min 0.1)
  const speedBonus = Math.max(0.1, 1 + (result.totalTime - result.completionTime) / result.totalTime)

  // Accuracy bonus: correct answers / attempts (rewards not guessing wrong)
  const accuracyBonus = 1 + (result.gatesSolved / Math.max(1, result.gatesAttempted)) * 0.5

  // Efficiency bonus: fewer steps = higher multiplier
  // If steps <= optimal, bonus is 1.5x. Degrades as steps increase.
  const optimalSteps = OPTIMAL_STEPS[result.difficulty]
  const stepRatio = Math.max(1, result.stepsTaken) / optimalSteps
  const efficiencyBonus = Math.max(0.5, 1.5 / stepRatio)

  // Gates solved bonus: 100 points per gate solved — rewards seeking out gates
  const gatesSolvedBonus = result.gatesSolved * 100

  // Collectible bonus: 50 per collectible
  const collectibleBonus = result.collectiblesGathered * 50

  const finalScore = Math.round(
    baseScore * difficultyMultiplier * speedBonus * accuracyBonus * efficiencyBonus
  ) + gatesSolvedBonus + collectibleBonus

  return {
    baseScore,
    difficultyMultiplier,
    speedBonus,
    accuracyBonus,
    efficiencyBonus,
    gatesSolvedBonus,
    collectibleBonus,
    finalScore,
  }
}
