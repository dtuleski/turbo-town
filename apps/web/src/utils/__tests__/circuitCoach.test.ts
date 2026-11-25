import { describe, expect, it } from 'vitest'
import { COACH_STORAGE_KEY, markCoachSeen, shouldAutoOpenCoach } from '../circuitCoach'
import type { CoachStorage } from '../circuitCoach'

function fakeStorage(): CoachStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

describe('circuit coach memory', () => {
  it('opens on a first visit and not after it was dismissed', () => {
    const storage = fakeStorage()
    expect(shouldAutoOpenCoach(storage)).toBe(true)
    markCoachSeen(storage)
    expect(storage.data.get(COACH_STORAGE_KEY)).toBe('1')
    expect(shouldAutoOpenCoach(storage)).toBe(false)
  })

  it('falls back to showing the coach when storage is missing or throws', () => {
    const broken: CoachStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(shouldAutoOpenCoach(null)).toBe(true)
    expect(shouldAutoOpenCoach(broken)).toBe(true)
    expect(() => {
      markCoachSeen(broken)
      markCoachSeen(null)
    }).not.toThrow()
  })
})
