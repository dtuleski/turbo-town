import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QuestResultPayload } from '@/types/quest'
import { questResultStore } from '../questResultStore'

const RESULT: QuestResultPayload = {
  worldId: 'brain-peaks',
  nodeId: 'bp-01-memory',
  kind: 'GAME',
  score: 1500,
  thresholds: [1450, 2300, 2650],
  stars: 1,
  bestStars: 1,
  newlyUnlocked: ['bp-02-math'],
  worldCleared: false,
  badgesAwarded: [],
}

describe('questResultStore', () => {
  afterEach(() => questResultStore.set(null))

  it('starts empty and holds what was set', () => {
    expect(questResultStore.get()).toBeNull()
    questResultStore.set(RESULT)
    expect(questResultStore.get()).toBe(RESULT)
  })

  it('clear empties it', () => {
    questResultStore.set(RESULT)
    questResultStore.clear()
    expect(questResultStore.get()).toBeNull()
  })

  it('notifies subscribers until they unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = questResultStore.subscribe(listener)
    questResultStore.set(RESULT)
    expect(listener).toHaveBeenCalledTimes(1)
    questResultStore.clear()
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    questResultStore.set(RESULT)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('clear on an empty store does not notify', () => {
    const listener = vi.fn()
    const unsubscribe = questResultStore.subscribe(listener)
    questResultStore.clear()
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })
})
