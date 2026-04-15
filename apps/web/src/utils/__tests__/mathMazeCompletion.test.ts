import { describe, it, expect } from 'vitest'
import { calculateMazeScore, type MazeGameResult } from '../mazeScoringUtils'

/**
 * Task 8.4 — Unit tests for game completion flow
 * Tests calculateMazeScore with different completion reasons and parameters,
 * and verifies correct completion messages per reason.
 * Validates: Requirements 5.4, 5.5, 5.6, 7.1, 7.2, 7.3, 7.4, 7.5
 */

// Completion messages (from en.json i18n keys)
type CompletionReason = 'exit-reached' | 'time-up' | 'no-path'

function getCompletionMessage(reason: CompletionReason): string {
  const messages: Record<CompletionReason, string> = {
    'exit-reached': 'Maze Complete!',
    'time-up': "Time's Up!",
    'no-path': 'No Path Available!',
  }
  return messages[reason]
}

describe('Math Maze Completion — scoring and messages', () => {
  // --- Completion messages per reason ---

  it('exit-reached shows "Maze Complete!" message', () => {
    expect(getCompletionMessage('exit-reached')).toBe('Maze Complete!')
  })

  it('time-up shows "Time\'s Up!" message', () => {
    expect(getCompletionMessage('time-up')).toBe("Time's Up!")
  })

  it('no-path shows "No Path Available!" message', () => {
    expect(getCompletionMessage('no-path')).toBe('No Path Available!')
  })

  // --- Score calculation: difficulty multipliers (Requirement 7.2) ---

  it('easy difficulty multiplier is 1.0', () => {
    const result = calculateMazeScore({
      difficulty: 'easy',
      completionTime: 90,
      totalTime: 180,
      gatesAttempted: 3,
      gatesSolved: 3,
      collectiblesGathered: 0,
      totalCollectibles: 3,
      reachedExit: true,
    })
    expect(result.difficultyMultiplier).toBe(1.0)
  })

  it('medium difficulty multiplier is 1.5', () => {
    const result = calculateMazeScore({
      difficulty: 'medium',
      completionTime: 120,
      totalTime: 240,
      gatesAttempted: 5,
      gatesSolved: 5,
      collectiblesGathered: 0,
      totalCollectibles: 4,
      reachedExit: true,
    })
    expect(result.difficultyMultiplier).toBe(1.5)
  })

  it('hard difficulty multiplier is 2.0', () => {
    const result = calculateMazeScore({
      difficulty: 'hard',
      completionTime: 150,
      totalTime: 300,
      gatesAttempted: 8,
      gatesSolved: 8,
      collectiblesGathered: 0,
      totalCollectibles: 5,
      reachedExit: true,
    })
    expect(result.difficultyMultiplier).toBe(2.0)
  })

  // --- Speed bonus (Requirement 7.3) ---

  it('speed bonus is higher when completing faster', () => {
    const fast = calculateMazeScore({
      difficulty: 'easy', completionTime: 30, totalTime: 180,
      gatesAttempted: 3, gatesSolved: 3, collectiblesGathered: 0,
      totalCollectibles: 3, reachedExit: true,
    })
    const slow = calculateMazeScore({
      difficulty: 'easy', completionTime: 170, totalTime: 180,
      gatesAttempted: 3, gatesSolved: 3, collectiblesGathered: 0,
      totalCollectibles: 3, reachedExit: true,
    })
    expect(fast.speedBonus).toBeGreaterThan(slow.speedBonus)
  })

  it('speed bonus has a minimum of 0.1', () => {
    // completionTime > totalTime edge case
    const result = calculateMazeScore({
      difficulty: 'easy', completionTime: 200, totalTime: 180,
      gatesAttempted: 3, gatesSolved: 3, collectiblesGathered: 0,
      totalCollectibles: 3, reachedExit: false,
    })
    expect(result.speedBonus).toBeGreaterThanOrEqual(0.1)
  })

  // --- Accuracy bonus (Requirement 7.4) ---

  it('accuracy bonus is 1.5 with perfect accuracy', () => {
    const result = calculateMazeScore({
      difficulty: 'easy', completionTime: 90, totalTime: 180,
      gatesAttempted: 5, gatesSolved: 5, collectiblesGathered: 0,
      totalCollectibles: 3, reachedExit: true,
    })
    // accuracyBonus = 1 + (5/5) * 0.5 = 1.5
    expect(result.accuracyBonus).toBe(1.5)
  })

  it('accuracy bonus is 1.0 with zero gates solved', () => {
    const result = calculateMazeScore({
      difficulty: 'easy', completionTime: 90, totalTime: 180,
      gatesAttempted: 3, gatesSolved: 0, collectiblesGathered: 0,
      totalCollectibles: 3, reachedExit: false,
    })
    // accuracyBonus = 1 + (0/3) * 0.5 = 1.0
    expect(result.accuracyBonus).toBe(1.0)
  })

  it('accuracy bonus handles zero attempts gracefully', () => {
    const result = calculateMazeScore({
      difficulty: 'easy', completionTime: 90, totalTime: 180,
      gatesAttempted: 0, gatesSolved: 0, collectiblesGathered: 0,
      totalCollectibles: 3, reachedExit: false,
    })
    // accuracyBonus = 1 + (0 / max(1, 0)) * 0.5 = 1.0
    expect(result.accuracyBonus).toBe(1.0)
  })

  // --- Collectible bonus (Requirement 7.5) ---

  it('collectible bonus is 50 per collectible gathered', () => {
    const result = calculateMazeScore({
      difficulty: 'easy', completionTime: 90, totalTime: 180,
      gatesAttempted: 3, gatesSolved: 3, collectiblesGathered: 4,
      totalCollectibles: 5, reachedExit: true,
    })
    expect(result.collectibleBonus).toBe(200) // 4 × 50
  })

  it('collectible bonus is 0 when none gathered', () => {
    const result = calculateMazeScore({
      difficulty: 'easy', completionTime: 90, totalTime: 180,
      gatesAttempted: 3, gatesSolved: 3, collectiblesGathered: 0,
      totalCollectibles: 5, reachedExit: true,
    })
    expect(result.collectibleBonus).toBe(0)
  })

  // --- Full formula verification (Requirement 7.1) ---

  it('final score matches the formula exactly', () => {
    const input: MazeGameResult = {
      difficulty: 'medium',
      completionTime: 120,
      totalTime: 240,
      gatesAttempted: 6,
      gatesSolved: 4,
      collectiblesGathered: 3,
      totalCollectibles: 5,
      reachedExit: true,
    }
    const result = calculateMazeScore(input)

    const expectedDiffMult = 1.5
    const expectedSpeedBonus = Math.max(0.1, 1 + (240 - 120) / 240)
    const expectedAccuracyBonus = 1 + (4 / Math.max(1, 6)) * 0.5
    const expectedCollectibleBonus = 3 * 50
    const expectedFinal =
      Math.round(1000 * expectedDiffMult * expectedSpeedBonus * expectedAccuracyBonus) +
      expectedCollectibleBonus

    expect(result.difficultyMultiplier).toBe(expectedDiffMult)
    expect(result.speedBonus).toBeCloseTo(expectedSpeedBonus)
    expect(result.accuracyBonus).toBeCloseTo(expectedAccuracyBonus)
    expect(result.collectibleBonus).toBe(expectedCollectibleBonus)
    expect(result.finalScore).toBe(expectedFinal)
  })

  it('base score is always 1000', () => {
    const result = calculateMazeScore({
      difficulty: 'hard', completionTime: 100, totalTime: 300,
      gatesAttempted: 10, gatesSolved: 8, collectiblesGathered: 5,
      totalCollectibles: 8, reachedExit: true,
    })
    expect(result.baseScore).toBe(1000)
  })
})
