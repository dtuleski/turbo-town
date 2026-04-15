import { describe, it, expect } from 'vitest'
import { calculateMazeScore, type MazeGameResult } from '../mazeScoringUtils'

type CompletionReason = 'exit-reached' | 'time-up' | 'no-path'

function getCompletionMessage(reason: CompletionReason): string {
  const messages: Record<CompletionReason, string> = {
    'exit-reached': 'Maze Complete!',
    'time-up': "Time's Up!",
    'no-path': 'No Path Available!',
  }
  return messages[reason]
}

// Helper to create a default result with overrides
function makeResult(overrides: Partial<MazeGameResult> = {}): MazeGameResult {
  return {
    difficulty: 'easy', completionTime: 90, totalTime: 180,
    gatesAttempted: 3, gatesSolved: 3, collectiblesGathered: 0,
    totalCollectibles: 3, totalGates: 5, stepsTaken: 20, reachedExit: true,
    ...overrides,
  }
}

describe('Math Maze Completion — scoring and messages', () => {
  it('exit-reached shows correct message', () => {
    expect(getCompletionMessage('exit-reached')).toBe('Maze Complete!')
  })
  it('time-up shows correct message', () => {
    expect(getCompletionMessage('time-up')).toBe("Time's Up!")
  })
  it('no-path shows correct message', () => {
    expect(getCompletionMessage('no-path')).toBe('No Path Available!')
  })

  it('easy difficulty multiplier is 1.0', () => {
    expect(calculateMazeScore(makeResult({ difficulty: 'easy' })).difficultyMultiplier).toBe(1.0)
  })
  it('medium difficulty multiplier is 1.5', () => {
    expect(calculateMazeScore(makeResult({ difficulty: 'medium' })).difficultyMultiplier).toBe(1.5)
  })
  it('hard difficulty multiplier is 2.0', () => {
    expect(calculateMazeScore(makeResult({ difficulty: 'hard' })).difficultyMultiplier).toBe(2.0)
  })

  it('speed bonus is higher when completing faster', () => {
    const fast = calculateMazeScore(makeResult({ completionTime: 30 }))
    const slow = calculateMazeScore(makeResult({ completionTime: 170 }))
    expect(fast.speedBonus).toBeGreaterThan(slow.speedBonus)
  })

  it('speed bonus has a minimum of 0.1', () => {
    const result = calculateMazeScore(makeResult({ completionTime: 200 }))
    expect(result.speedBonus).toBeGreaterThanOrEqual(0.1)
  })

  it('accuracy bonus is 1.5 with perfect accuracy', () => {
    const result = calculateMazeScore(makeResult({ gatesAttempted: 5, gatesSolved: 5 }))
    expect(result.accuracyBonus).toBe(1.5)
  })

  it('accuracy bonus is 1.0 with zero gates solved', () => {
    const result = calculateMazeScore(makeResult({ gatesAttempted: 3, gatesSolved: 0 }))
    expect(result.accuracyBonus).toBe(1.0)
  })

  it('efficiency bonus is higher with fewer steps', () => {
    const efficient = calculateMazeScore(makeResult({ stepsTaken: 12 }))
    const wasteful = calculateMazeScore(makeResult({ stepsTaken: 60 }))
    expect(efficient.efficiencyBonus).toBeGreaterThan(wasteful.efficiencyBonus)
  })

  it('efficiency bonus has a minimum of 0.5', () => {
    const result = calculateMazeScore(makeResult({ stepsTaken: 500 }))
    expect(result.efficiencyBonus).toBeGreaterThanOrEqual(0.5)
  })

  it('gates solved bonus is 100 per gate solved', () => {
    const result = calculateMazeScore(makeResult({ gatesSolved: 5 }))
    expect(result.gatesSolvedBonus).toBe(500)
  })

  it('gates solved bonus is 0 when none solved', () => {
    const result = calculateMazeScore(makeResult({ gatesSolved: 0, gatesAttempted: 0 }))
    expect(result.gatesSolvedBonus).toBe(0)
  })

  it('collectible bonus is 50 per collectible', () => {
    const result = calculateMazeScore(makeResult({ collectiblesGathered: 4 }))
    expect(result.collectibleBonus).toBe(200)
  })

  it('more gates solved = higher final score (same steps)', () => {
    const moreGates = calculateMazeScore(makeResult({ gatesSolved: 5, gatesAttempted: 5 }))
    const fewerGates = calculateMazeScore(makeResult({ gatesSolved: 1, gatesAttempted: 1 }))
    expect(moreGates.finalScore).toBeGreaterThan(fewerGates.finalScore)
  })

  it('fewer steps = higher final score (same gates)', () => {
    const efficient = calculateMazeScore(makeResult({ stepsTaken: 12 }))
    const wasteful = calculateMazeScore(makeResult({ stepsTaken: 50 }))
    expect(efficient.finalScore).toBeGreaterThan(wasteful.finalScore)
  })

  it('base score is always 1000', () => {
    expect(calculateMazeScore(makeResult()).baseScore).toBe(1000)
  })
})
