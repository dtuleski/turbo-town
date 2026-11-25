// Circuit Builder - first-time coach overlay memory. Pure apart from the storage handed in, so a
// test can pass a fake. Storage can be missing or throw (private mode, blocked cookies); every
// path then falls back to "show the coach", which is dismissible and costs the player nothing.

export const COACH_STORAGE_KEY = 'circuitBuilder.coachSeen.v1'

export type CoachStorage = Pick<Storage, 'getItem' | 'setItem'>

/** The browser's local storage, or null when it is unavailable. */
export function browserCoachStorage(): CoachStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** True until the player has dismissed the coach once. */
export function shouldAutoOpenCoach(storage: CoachStorage | null): boolean {
  if (storage === null) return true
  try {
    return storage.getItem(COACH_STORAGE_KEY) !== '1'
  } catch {
    return true
  }
}

/** Remember the dismissal. Failure to persist is silent. */
export function markCoachSeen(storage: CoachStorage | null): void {
  if (storage === null) return
  try {
    storage.setItem(COACH_STORAGE_KEY, '1')
  } catch {
    // Nothing to do: the coach will simply show again next visit.
  }
}
