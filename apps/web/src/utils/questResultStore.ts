import { useSyncExternalStore } from 'react'
import type { QuestResultPayload } from '@/types/quest'

/**
 * Holds the quest result of the last completeGame so ScoreBreakdownModal (R2) and the map (unlock
 * animation) can read it without any prop change on the 22 game pages. In memory only.
 */
let current: QuestResultPayload | null = null
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

export const questResultStore = {
  get(): QuestResultPayload | null {
    return current
  },
  set(result: QuestResultPayload | null): void {
    current = result
    emit()
  },
  clear(): void {
    if (current === null) return
    current = null
    emit()
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function useQuestResult(): QuestResultPayload | null {
  return useSyncExternalStore(questResultStore.subscribe, questResultStore.get, questResultStore.get)
}
