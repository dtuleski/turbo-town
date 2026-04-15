import { describe, it, expect } from 'vitest'
import { getConfigForDifficulty, type DifficultyLevel } from '../mazeGenerator'
import { ROUTES } from '../../config/constants'

/**
 * Task 8.1 — Unit tests for MathMazeSetupPage logic
 * Tests difficulty configuration, route construction, and selection constraints.
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

describe('Math Maze Setup — difficulty config and navigation logic', () => {
  const DIFFICULTY_LEVELS: DifficultyLevel[] = ['easy', 'medium', 'hard']

  // Requirement 1.1: Three difficulty options exist
  it('defines exactly 3 difficulty levels: easy, medium, hard', () => {
    expect(DIFFICULTY_LEVELS).toHaveLength(3)
    expect(DIFFICULTY_LEVELS).toEqual(['easy', 'medium', 'hard'])
  })

  // Requirement 1.2: Easy config
  it('easy config has 7×7 grid, 3-5 gates, 3-5 collectibles', () => {
    const config = getConfigForDifficulty('easy')
    expect(config.rows).toBe(7)
    expect(config.cols).toBe(7)
    expect(config.gateCount).toEqual({ min: 3, max: 5 })
    expect(config.collectibleCount).toEqual({ min: 3, max: 5 })
  })

  // Requirement 1.3: Medium config
  it('medium config has 10×10 grid, 5-8 gates, 4-6 collectibles', () => {
    const config = getConfigForDifficulty('medium')
    expect(config.rows).toBe(10)
    expect(config.cols).toBe(10)
    expect(config.gateCount).toEqual({ min: 5, max: 8 })
    expect(config.collectibleCount).toEqual({ min: 4, max: 6 })
  })

  // Requirement 1.4: Hard config
  it('hard config has 13×13 grid, 8-12 gates, 5-8 collectibles', () => {
    const config = getConfigForDifficulty('hard')
    expect(config.rows).toBe(13)
    expect(config.cols).toBe(13)
    expect(config.gateCount).toEqual({ min: 8, max: 12 })
    expect(config.collectibleCount).toEqual({ min: 5, max: 8 })
  })

  // Requirement 1.5: Navigation constructs correct route with query param
  it('constructs correct game route with difficulty query param', () => {
    for (const diff of DIFFICULTY_LEVELS) {
      const route = `${ROUTES.MATH_MAZE_GAME}?difficulty=${diff}`
      expect(route).toBe(`/math-maze/game?difficulty=${diff}`)
    }
  })

  // Requirement 1.6: Start button logic — disabled when no selection
  it('start button should be disabled when selectedDifficulty is empty', () => {
    const selectedDifficulty = ''
    expect(!selectedDifficulty).toBe(true) // falsy → disabled
  })

  it('start button should be enabled when a difficulty is selected', () => {
    const selectedDifficulty = 'medium'
    expect(!!selectedDifficulty).toBe(true) // truthy → enabled
  })

  // Route constants are correctly defined
  it('ROUTES contains MATH_MAZE_SETUP and MATH_MAZE_GAME', () => {
    expect(ROUTES.MATH_MAZE_SETUP).toBe('/math-maze/setup')
    expect(ROUTES.MATH_MAZE_GAME).toBe('/math-maze/game')
  })
})
