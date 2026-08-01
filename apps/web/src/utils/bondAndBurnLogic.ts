// Bond & Burn: Game Logic Utilities

import {
  type Recipe,
  type DifficultyConfig,
  type Element,
  ELEMENTS,
  RECIPES,
  DIFFICULTY_CONFIGS,
  checkRecipeComplete,
  getTotalIngredientsCount,
  getRandomElement,
  selectRecipes,
} from './bondAndBurnData'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface GameState {
  phase: 'playing' | 'meltdown' | 'complete'
  difficulty: Difficulty
  currentRecipeIndex: number
  recipes: Recipe[]
  chamber: string[] // element symbols in the chamber
  heatLevel: number // 0-100
  score: number
  combo: number
  timer: number // seconds elapsed
  roundsCompleted: number
  totalAttempts: number // total grab attempts (for accuracy calc)
  wrongAttempts: number // wrong grabs
}

export interface ConveyorElement {
  id: string
  element: Element
  position: number // 0-100 (percentage across belt)
  spawnedAt: number // timestamp for animation calc
}

/**
 * Calculate updated heat level, clamped between 0 and 100.
 */
export function calculateHeat(current: number, delta: number): number {
  return Math.max(0, Math.min(100, current + delta))
}

/**
 * Calculate score for a completed recipe.
 * Base points × speed bonus × combo multiplier.
 */
export function calculateRecipeScore(
  recipe: Recipe,
  timeTaken: number,
  combo: number,
  difficulty: Difficulty
): number {
  // Difficulty multiplier
  const diffMultiplier = difficulty === 'easy' ? 1.0 : difficulty === 'medium' ? 1.5 : 2.0

  // Speed bonus: max 2x if done in under 5 seconds, linear decay to 1x at 20s
  const speedBonus = timeTaken <= 5
    ? 2.0
    : timeTaken >= 20
      ? 1.0
      : 2.0 - ((timeTaken - 5) / 15) * 1.0

  // Combo multiplier: caps at 3x
  const comboMultiplier = Math.min(3, combo)

  return Math.round(recipe.points * diffMultiplier * speedBonus * comboMultiplier)
}

/**
 * Calculate final score (capped at 8000).
 */
export function calculateFinalScore(totalScore: number): number {
  return Math.min(8000, totalScore)
}

/**
 * Determine if an element can be placed in the current recipe.
 * Returns true if the recipe needs more of this element.
 */
export function canPlaceElement(chamber: string[], recipe: Recipe, element: string): boolean {
  const currentCount = chamber.filter(s => s === element).length
  const needed = recipe.ingredients.find(i => i.symbol === element)
  if (!needed) return false
  return currentCount < needed.count
}

/**
 * Get mascot message based on game state.
 */
export function getMascotMessage(state: GameState): { text: string; mood: 'idle' | 'success' | 'worried' | 'panic' | 'meltdown' | 'funfact' } {
  if (state.phase === 'meltdown') {
    return { text: 'MELTDOWN! 💥', mood: 'meltdown' }
  }
  if (state.phase === 'complete') {
    return { text: 'Lab mission complete! Great work, scientist! 🎉', mood: 'success' }
  }
  if (state.heatLevel >= 85) {
    return { text: "Cool it down! Complete a reaction! 🔥", mood: 'panic' }
  }
  if (state.heatLevel >= 60) {
    return { text: "It's getting hot in here! 🥵", mood: 'worried' }
  }
  return { text: 'Grab the right elements from the belt!', mood: 'idle' }
}

/**
 * Difficulty number for API (1-3).
 */
export function difficultyToNumber(difficulty: Difficulty): number {
  return difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
}

// Re-export data utilities for convenience
export {
  checkRecipeComplete,
  getTotalIngredientsCount,
  getRandomElement,
  selectRecipes,
  ELEMENTS,
  RECIPES,
  DIFFICULTY_CONFIGS,
}
export type { Recipe, DifficultyConfig, Element }
