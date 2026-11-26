import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/config/constants'
import { CHALLENGE_FAILED_URL, CHALLENGE_LAUNCH_TABLE, buildChallengeUrl, parseChallengeParam } from '../challengeLaunch'

describe('parseChallengeParam', () => {
  it('reads a real calendar day', () => {
    expect(parseChallengeParam('?difficulty=medium&challenge=2026-11-26')).toEqual({ day: '2026-11-26' })
    expect(parseChallengeParam('challenge=2028-02-29')).toEqual({ day: '2028-02-29' })
  })

  it.each(['', '?difficulty=medium', '?challenge=', '?challenge=today', '?challenge=2026-11-31', '?challenge=2026-1-5', '?challenge=2026-11-26T00:00', '?challenge=%E0%A4%A'])(
    'returns null for %s',
    (search) => {
      expect(parseChallengeParam(search)).toBeNull()
    }
  )

  it('uses the first challenge param', () => {
    expect(parseChallengeParam('?challenge=2026-11-26&challenge=2026-11-27')).toEqual({ day: '2026-11-26' })
    expect(parseChallengeParam('?challenge=bad&challenge=2026-11-27')).toBeNull()
  })
})

describe('buildChallengeUrl', () => {
  it.each([
    ['code-a-bot', 'CODE_A_BOT', ROUTES.CODE_A_BOT_GAME],
    ['sudoku', 'SUDOKU', ROUTES.SUDOKU_GAME],
    ['math-challenge', 'MATH_CHALLENGE', ROUTES.MATH_GAME],
    ['math-maze', 'MATH_MAZE', ROUTES.MATH_MAZE_GAME],
    ['word-puzzle', 'WORD_PUZZLE', ROUTES.WORD_PUZZLE_GAME],
    ['hangman', 'HANGMAN', ROUTES.HANGMAN_GAME],
  ])('launches %s on its game page at medium', (gameId, themeId, route) => {
    const url = buildChallengeUrl({ gameId, themeId, day: '2026-11-26' })
    expect(url).toBe(`${route}?difficulty=medium&challenge=2026-11-26`)
    expect(parseChallengeParam((url as string).slice(route.length))).toEqual({ day: '2026-11-26' })
  })

  it('covers exactly the first batch', () => {
    expect(Object.keys(CHALLENGE_LAUNCH_TABLE).sort()).toEqual(
      ['CODE_A_BOT', 'HANGMAN', 'MATH_CHALLENGE', 'MATH_MAZE', 'SUDOKU', 'WORD_PUZZLE'].sort()
    )
  })

  it('returns null for an unknown theme or an invalid day', () => {
    expect(buildChallengeUrl({ gameId: 'memory-match', themeId: 'ANIMALS', day: '2026-11-26' })).toBeNull()
    expect(buildChallengeUrl({ gameId: 'x', themeId: 'toString', day: '2026-11-26' })).toBeNull()
    expect(buildChallengeUrl({ gameId: 'sudoku', themeId: 'SUDOKU', day: '2026-11-26&quest=a:b:0' })).toBeNull()
  })

  it('sends failures to the hub with challengeFailed=1', () => {
    expect(CHALLENGE_FAILED_URL).toBe('/hub?challengeFailed=1')
  })
})
