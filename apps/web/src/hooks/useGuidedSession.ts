import { useEffect, useRef, useSyncExternalStore } from 'react'
import { completeGame, startGame } from '@/api/game'
import { createGuidedSession } from '@/services/circuitGameSession'
import type { GuidedSession, GuidedSessionState } from '@/services/circuitGameSession'
import type { LevelDefinition } from '@/utils/circuitEngine'
import { lazyRefValue } from '@/utils/lazyRef'

export interface UseGuidedSession {
  session: GuidedSession
  state: GuidedSessionState
}

/**
 * React binding for the guided session. The session is built once per mount with the real API
 * wrappers, the real clock and `setTimeout`; all behaviour lives in the service.
 *
 * `start()` runs in an effect and `detach()` in its cleanup. The service memoises the start, so a
 * development-mode unmount and remount costs one allowance, not two. A caller that needs a new
 * session for another level must remount this hook (give the component a `key`).
 *
 * This is the only module on the guided side that imports API values.
 */
export function useGuidedSession(level: LevelDefinition): UseGuidedSession {
  const cell = useRef<GuidedSession | null>(null)
  const session = lazyRefValue(cell, () =>
    createGuidedSession({
      api: { startGame, completeGame },
      level,
      now: Date.now,
      schedule: (fn, ms) => {
        const id = setTimeout(fn, ms)
        return () => {
          clearTimeout(id)
        }
      },
    })
  )

  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState)

  useEffect(() => {
    void session.start()
    return () => {
      session.detach()
    }
  }, [session])

  return { session, state }
}
