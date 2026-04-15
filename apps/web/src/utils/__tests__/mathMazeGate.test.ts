import { describe, it, expect } from 'vitest'
import {
  generateEquation,
  checkEquationAnswer,
  getEquationConfig,
} from '../mazeEquations'
import type { MathEquation, DifficultyLevel } from '../mazeGenerator'

/**
 * Task 8.2 — Unit tests for GatePrompt logic (equation checking & gate state)
 * Tests checkEquationAnswer behavior, equation display, and gate state transitions.
 * Validates: Requirements 4.2, 4.3, 4.6, 4.7, 4.8
 */

describe('Math Maze Gate — equation checking and gate state logic', () => {
  // --- checkEquationAnswer ---

  it('returns true for a correct answer', () => {
    const eq: MathEquation = { display: '3 + 4 = ?', answer: 7, operation: 'addition' }
    expect(checkEquationAnswer(eq, 7)).toBe(true)
  })

  it('returns false for an incorrect answer', () => {
    const eq: MathEquation = { display: '3 + 4 = ?', answer: 7, operation: 'addition' }
    expect(checkEquationAnswer(eq, 8)).toBe(false)
  })

  it('returns false for a close but wrong answer', () => {
    const eq: MathEquation = { display: '10 − 3 = ?', answer: 7, operation: 'subtraction' }
    expect(checkEquationAnswer(eq, 6)).toBe(false)
  })

  it('handles negative input correctly', () => {
    const eq: MathEquation = { display: '5 − 8 = ?', answer: -3, operation: 'subtraction' }
    expect(checkEquationAnswer(eq, -3)).toBe(true)
    expect(checkEquationAnswer(eq, 3)).toBe(false)
  })

  it('handles zero answer correctly', () => {
    const eq: MathEquation = { display: '5 − 5 = ?', answer: 0, operation: 'subtraction' }
    expect(checkEquationAnswer(eq, 0)).toBe(true)
    expect(checkEquationAnswer(eq, 1)).toBe(false)
  })

  // --- Gate state transitions ---

  it('gate transitions to open on correct answer', () => {
    const eq: MathEquation = { display: '2 × 5 = ?', answer: 10, operation: 'multiplication' }
    const correct = checkEquationAnswer(eq, 10)
    const newState = correct ? 'open' : 'blocked'
    expect(newState).toBe('open')
  })

  it('gate transitions to blocked on incorrect answer', () => {
    const eq: MathEquation = { display: '2 × 5 = ?', answer: 10, operation: 'multiplication' }
    const correct = checkEquationAnswer(eq, 11)
    const newState = correct ? 'open' : 'blocked'
    expect(newState).toBe('blocked')
  })

  // --- Equation generation per difficulty ---

  it('easy equations use only addition and subtraction', () => {
    const config = getEquationConfig('easy')
    expect(config.operations).toEqual(['addition', 'subtraction'])
    expect(config.maxOperand).toBe(20)
  })

  it('medium equations include all four basic operations', () => {
    const config = getEquationConfig('medium')
    expect(config.operations).toEqual(['addition', 'subtraction', 'multiplication', 'division'])
    expect(config.maxOperand).toBe(50)
  })

  it('hard equations include advanced operations', () => {
    const config = getEquationConfig('hard')
    expect(config.operations).toContain('power')
    expect(config.operations).toContain('root')
    expect(config.operations).toContain('algebra')
  })

  it('generated equations always have integer answers', () => {
    const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard']
    for (const diff of difficulties) {
      for (let i = 0; i < 20; i++) {
        const eq = generateEquation(diff)
        expect(Number.isInteger(eq.answer)).toBe(true)
      }
    }
  })

  it('generated equations have a non-empty display string', () => {
    const eq = generateEquation('easy')
    expect(eq.display.length).toBeGreaterThan(0)
    expect(eq.display).toContain('?')
  })
})
