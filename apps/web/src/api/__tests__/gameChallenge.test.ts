import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mutate = vi.fn()
const query = vi.fn()
vi.mock('../client', () => ({ gameClient: { mutate: (...a: unknown[]) => mutate(...a), query: (...a: unknown[]) => query(...a) } }))

import { completeGame, startGame } from '../game'
import { getChallengeLeaderboard, getDailyChallenge, parseDailyChallenge } from '../challenge'

const replace = vi.fn()
const CHALLENGE = '?difficulty=medium&challenge=2026-11-26'

function setSearch(search: string): void {
  vi.stubGlobal('window', { location: { search, replace } })
}

const NEVER = Symbol('never')
const settled = (p: Promise<unknown>): Promise<unknown> =>
  Promise.race([p, new Promise((r) => setTimeout(() => r(NEVER), 30))])

const RESULT = { id: 'g1', canPlay: false }
const sentInput = () => mutate.mock.calls[0][0].variables.input

beforeEach(() => {
  mutate.mockReset()
  query.mockReset()
  replace.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('startGame challenge context', () => {
  it('sends challengeContext for ?challenge=<valid day> and treats the accepted start as playable', async () => {
    setSearch(CHALLENGE)
    mutate.mockResolvedValue({ data: { startGame: RESULT } })
    const result = await startGame({ themeId: 'SUDOKU', difficulty: 2 })
    expect(sentInput()).toEqual({ themeId: 'SUDOKU', difficulty: 2, challengeContext: { day: '2026-11-26' } })
    expect(sentInput().questContext).toBeUndefined()
    expect(result.canPlay).toBe(true)
  })

  it.each(['', '?difficulty=medium', '?challenge=2026-11-31', '?challenge=today'])(
    'sends no challengeContext for %j and keeps the normal path',
    async (search) => {
      setSearch(search)
      mutate.mockResolvedValue({ data: { startGame: RESULT } })
      const result = await startGame({ themeId: 'SUDOKU', difficulty: 2 })
      expect(sentInput()).toEqual({ themeId: 'SUDOKU', difficulty: 2 })
      expect(result.canPlay).toBe(false)
    }
  )

  it('lets the quest param win when both are present', async () => {
    setSearch('?difficulty=easy&quest=brain-peaks:bp-02-math:0&challenge=2026-11-26')
    mutate.mockResolvedValue({ data: { startGame: RESULT } })
    await startGame({ themeId: 'MATH_CHALLENGE', difficulty: 1 })
    expect(sentInput().questContext).toEqual({ worldId: 'brain-peaks', nodeId: 'bp-02-math', legIndex: 0 })
    expect(sentInput().challengeContext).toBeUndefined()
  })

  it('goes to the hub with challengeFailed=1 on a rejected start and never settles', async () => {
    setSearch(CHALLENGE)
    mutate.mockRejectedValue(new Error('This challenge is not available right now.'))
    const caught = vi.fn()
    expect(await settled(startGame({ themeId: 'SUDOKU', difficulty: 2 }).catch(caught))).toBe(NEVER)
    expect(replace).toHaveBeenCalledWith('/hub?challengeFailed=1')
    expect(caught).not.toHaveBeenCalled()
  })

  it('passes a rate-limit error to the page (its rate-limit screen), without redirecting', async () => {
    setSearch(CHALLENGE)
    mutate.mockRejectedValue({ message: 'x', graphQLErrors: [{ extensions: { code: 'RATE_LIMIT_EXCEEDED' } }] })
    await expect(startGame({ themeId: 'SUDOKU', difficulty: 2 })).rejects.toMatchObject({ message: 'x' })
    expect(replace).not.toHaveBeenCalled()
  })

  it('does not force canPlay when the id is empty', async () => {
    setSearch(CHALLENGE)
    mutate.mockResolvedValue({ data: { startGame: { id: '', canPlay: false } } })
    expect((await startGame({ themeId: 'SUDOKU', difficulty: 2 })).canPlay).toBe(false)
  })
})

describe('completeGame challenge field', () => {
  it('selects challenge { day recorded bestScore rank isNewBest } and returns it', async () => {
    const challenge = { day: '2026-11-26', recorded: true, bestScore: 900, rank: 2, isNewBest: true }
    mutate.mockResolvedValue({ data: { completeGame: { id: 'g', quest: null, challenge } } })
    const result = await completeGame({ gameId: 'g', completionTime: 1, attempts: 1 })
    expect(result.challenge).toEqual(challenge)
    const doc = JSON.stringify(mutate.mock.calls[0][0].mutation)
    for (const field of ['challenge', 'recorded', 'bestScore', 'isNewBest']) expect(doc).toContain(field)
  })
})

describe('challenge API', () => {
  const RAW = {
    day: '2026-11-26',
    gameId: 'code-a-bot',
    themeId: 'CODE_A_BOT',
    difficulty: 2,
    settings: '{"levels":5}',
    content: '{"kind":"code-a-bot","difficulty":"medium","levelNumbers":[1,2,3,4,5]}',
    endsAt: '2026-11-27T05:00:00.000Z',
    me: null,
  }

  it('getDailyChallenge parses settings and content', async () => {
    query.mockResolvedValue({ data: { getDailyChallenge: RAW } })
    expect(await getDailyChallenge()).toEqual({
      ...RAW,
      settings: { levels: 5 },
      content: { kind: 'code-a-bot', difficulty: 'medium', levelNumbers: [1, 2, 3, 4, 5] },
    })
    expect(query.mock.calls[0][0].fetchPolicy).toBe('network-only')
  })

  it('returns null when the feature is off, on errors and on bad content', async () => {
    query.mockResolvedValueOnce({ data: { getDailyChallenge: null } })
    expect(await getDailyChallenge()).toBeNull()
    query.mockRejectedValueOnce(new Error('network'))
    expect(await getDailyChallenge()).toBeNull()
    expect(parseDailyChallenge({ ...RAW, content: '{' })).toBeNull()
    expect(parseDailyChallenge({ ...RAW, content: '{"kind":"sudoku"}' })).toBeNull()
    expect(parseDailyChallenge({ ...RAW, settings: 5 })).toBeNull()
  })

  it('getChallengeLeaderboard passes day and limit and returns null on error', async () => {
    const board = { day: '2026-11-25', gameId: 'sudoku', themeId: 'SUDOKU', final: true, entries: [], me: null }
    query.mockResolvedValueOnce({ data: { getChallengeLeaderboard: board } })
    expect(await getChallengeLeaderboard('2026-11-25', 5)).toBe(board)
    expect(query.mock.calls[0][0].variables).toEqual({ day: '2026-11-25', limit: 5 })
    query.mockRejectedValueOnce(new Error('boom'))
    expect(await getChallengeLeaderboard()).toBeNull()
  })
})
