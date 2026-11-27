import { ROUTES } from '@/config/constants'
import { isChallengeDay } from '@/utils/challengeShared'

/** Where a failed challenge start or an unusable challenge sends the player. */
export const CHALLENGE_FAILED_URL = `${ROUTES.HUB}?challengeFailed=1`

/**
 * Reads `challenge=<YYYY-MM-DD>` from a query string. Anything that is not a real calendar day returns
 * null; it never throws. With several `challenge` params the first one is used. The web does not check
 * that the day is today: the server does.
 */
export function parseChallengeParam(search: string): { day: string } | null {
  try {
    const raw = new URLSearchParams(search).get('challenge')
    return raw !== null && isChallengeDay(raw) ? { day: raw } : null
  } catch {
    return null
  }
}

/** Launch table (W2): server theme id -> game page, for the games with a web challenge mode. */
export const CHALLENGE_LAUNCH_TABLE: Readonly<Record<string, string>> = Object.freeze({
  CODE_A_BOT: ROUTES.CODE_A_BOT_GAME,
  SUDOKU: ROUTES.SUDOKU_GAME,
  MATH_CHALLENGE: ROUTES.MATH_GAME,
  MATH_MAZE: ROUTES.MATH_MAZE_GAME,
  WORD_PUZZLE: ROUTES.WORD_PUZZLE_GAME,
  HANGMAN: ROUTES.HANGMAN_GAME,
})

/**
 * The game URL for a challenge: `<route>?difficulty=medium&challenge=<day>` (every challenge is
 * medium, plan Q7). Null for a theme without a web challenge mode or an invalid day.
 */
export function buildChallengeUrl(challenge: { gameId: string; themeId: string; day: string }): string | null {
  if (!Object.prototype.hasOwnProperty.call(CHALLENGE_LAUNCH_TABLE, challenge.themeId)) return null
  if (!isChallengeDay(challenge.day)) return null
  const query = new URLSearchParams()
  query.set('difficulty', 'medium')
  query.set('challenge', challenge.day)
  return `${CHALLENGE_LAUNCH_TABLE[challenge.themeId]}?${query.toString()}`
}
