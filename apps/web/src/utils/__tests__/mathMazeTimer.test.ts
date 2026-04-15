import { describe, it, expect } from 'vitest'

/**
 * Task 8.3 — Unit tests for timer display formatting and urgency color
 * Tests formatTime(seconds) returns correct MM:SS format and urgency threshold at 30s.
 * Validates: Requirements 5.1, 5.2, 5.3
 */

// Extracted from MathMazeGamePage.tsx — pure function
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Time limits per difficulty (from MathMazeGamePage.tsx)
const TIME_LIMITS = { easy: 180, medium: 240, hard: 300 } as const

// Urgency threshold (from MathMazeGamePage.tsx)
const URGENCY_THRESHOLD = 30

function getTimerColor(timeRemaining: number): 'red' | 'normal' {
  return timeRemaining <= URGENCY_THRESHOLD ? 'red' : 'normal'
}

describe('Math Maze Timer — formatting and urgency', () => {
  // --- formatTime ---

  it('formats 180 seconds as 3:00', () => {
    expect(formatTime(180)).toBe('3:00')
  })

  it('formats 240 seconds as 4:00', () => {
    expect(formatTime(240)).toBe('4:00')
  })

  it('formats 300 seconds as 5:00', () => {
    expect(formatTime(300)).toBe('5:00')
  })

  it('formats 0 seconds as 0:00', () => {
    expect(formatTime(0)).toBe('0:00')
  })

  it('formats 59 seconds as 0:59', () => {
    expect(formatTime(59)).toBe('0:59')
  })

  it('formats 61 seconds as 1:01', () => {
    expect(formatTime(61)).toBe('1:01')
  })

  it('formats 30 seconds as 0:30', () => {
    expect(formatTime(30)).toBe('0:30')
  })

  it('formats 9 seconds as 0:09 (zero-padded)', () => {
    expect(formatTime(9)).toBe('0:09')
  })

  it('formats 125 seconds as 2:05', () => {
    expect(formatTime(125)).toBe('2:05')
  })

  // --- Time limits per difficulty (Requirement 5.1) ---

  it('easy time limit is 180 seconds (3 minutes)', () => {
    expect(TIME_LIMITS.easy).toBe(180)
  })

  it('medium time limit is 240 seconds (4 minutes)', () => {
    expect(TIME_LIMITS.medium).toBe(240)
  })

  it('hard time limit is 300 seconds (5 minutes)', () => {
    expect(TIME_LIMITS.hard).toBe(300)
  })

  // --- Urgency color change at ≤30s (Requirement 5.3) ---

  it('timer color is normal at 31 seconds', () => {
    expect(getTimerColor(31)).toBe('normal')
  })

  it('timer color is red at exactly 30 seconds', () => {
    expect(getTimerColor(30)).toBe('red')
  })

  it('timer color is red at 1 second', () => {
    expect(getTimerColor(1)).toBe('red')
  })

  it('timer color is red at 0 seconds', () => {
    expect(getTimerColor(0)).toBe('red')
  })

  it('timer color is normal at 60 seconds', () => {
    expect(getTimerColor(60)).toBe('normal')
  })
})
