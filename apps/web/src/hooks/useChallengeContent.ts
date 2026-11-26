import { useEffect, useState } from 'react'
import { getDailyChallenge } from '@/api/challenge'
import { CHALLENGE_FAILED_URL, parseChallengeParam } from '@/utils/challengeLaunch'
import { selectChallengeContent, type ContentOf } from '@/utils/challengeContent'
import type { ChallengeContentKind } from '@/utils/challengeShared'

export type ChallengeContentState<K extends ChallengeContentKind> =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'ready'; content: ContentOf<K>; day: string; difficulty: number }

const currentSearch = (): string => (typeof window !== 'undefined' ? window.location.search : '')

/**
 * Given-content mode (W3). Without a valid `?challenge=<day>` the status is `off` from the first
 * render and nothing is loaded, so the page runs its own generator as before. With it, the hook loads
 * today's challenge; when it is not this game's challenge for that day (or fails to load), the player
 * goes back to the hub with `challengeFailed=1`.
 */
export function useChallengeContent<K extends ChallengeContentKind>(kind: K): ChallengeContentState<K> {
  const [state, setState] = useState<ChallengeContentState<K>>(() =>
    parseChallengeParam(currentSearch()) ? { status: 'loading' } : { status: 'off' }
  )

  useEffect(() => {
    const param = parseChallengeParam(currentSearch())
    if (!param) return
    let cancelled = false
    getDailyChallenge().then((challenge) => {
      if (cancelled) return
      const content = selectChallengeContent(challenge, kind, param.day)
      if (!challenge || !content) {
        window.location.replace(CHALLENGE_FAILED_URL)
        return
      }
      setState({ status: 'ready', content, day: challenge.day, difficulty: challenge.difficulty })
    })
    return () => {
      cancelled = true
    }
  }, [kind])

  return state
}
