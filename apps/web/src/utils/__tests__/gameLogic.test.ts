import { describe, it, expect } from 'vitest'
import { generateCards, checkMatch, countMatchedPairs, resolvePair } from '../gameLogic'
import type { GameState } from '@/types/game'

const newGame = (): GameState => ({
  theme: 'ANIMALS',
  difficulty: 'EASY',
  cards: generateCards('ANIMALS', 'EASY'),
  status: 'IN_PROGRESS',
  attempts: 0,
  matches: 0,
  score: 0,
  startTime: Date.now(),
  endTime: null,
  elapsedTime: 0,
})

const flip = (state: GameState, ...ids: string[]): GameState => ({
  ...state,
  cards: state.cards.map(c => (ids.includes(c.id) ? { ...c, isFlipped: true } : c)),
})

describe('Memory Match card logic', () => {
  it('starts every card face-down and unmatched', () => {
    const cards = generateCards('ANIMALS', 'EASY')
    expect(cards).toHaveLength(12)
    expect(cards.every(c => !c.isFlipped && !c.isMatched)).toBe(true)
  })

  it('matches identical values and rejects different values or the same card', () => {
    const cards = generateCards('ANIMALS', 'EASY')
    const a = cards.find(c => c.id === '0-1')!
    const b = cards.find(c => c.id === '0-2')!
    const other = cards.find(c => c.id === '1-1')!
    expect(checkMatch(a, b)).toBe(true)
    expect(checkMatch(a, a)).toBe(false)
    expect(checkMatch(a, other)).toBe(false)
  })

  it('a matching pair increments matches by exactly 1', () => {
    const next = resolvePair(flip(newGame(), '0-1', '0-2'), '0-1', '0-2')
    expect(next.matches).toBe(1)
    expect(next.attempts).toBe(1)
    expect(next.cards.filter(c => c.isMatched).map(c => c.id).sort()).toEqual(['0-1', '0-2'])
  })

  it('resolving the same pair twice (StrictMode double-invoked updater) does not double count', () => {
    const once = resolvePair(flip(newGame(), '0-1', '0-2'), '0-1', '0-2')
    const twice = resolvePair(once, '0-1', '0-2')
    expect(twice.matches).toBe(1)
    expect(twice.attempts).toBe(1)
  })

  it('a miss flips both cards back face-down and counts one attempt', () => {
    const missed = resolvePair(flip(newGame(), '0-1', '1-1'), '0-1', '1-1')
    expect(missed.matches).toBe(0)
    expect(missed.attempts).toBe(1)
    expect(missed.cards.every(c => !c.isFlipped && !c.isMatched)).toBe(true)
    expect(resolvePair(missed, '0-1', '1-1').attempts).toBe(1)
  })

  it('match counter equals matched cards / 2 through a full game', () => {
    let state = newGame()
    for (let i = 0; i < 6; i++) {
      state = resolvePair(flip(state, `${i}-1`, `${i}-2`), `${i}-1`, `${i}-2`)
      expect(state.matches).toBe(countMatchedPairs(state.cards))
      expect(state.matches).toBe(i + 1)
    }
    expect(state.endTime).not.toBeNull()
  })
})
