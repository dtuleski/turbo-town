import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mutate = vi.fn()
const query = vi.fn()
vi.mock('../client', () => ({ gameClient: { mutate: (...a: unknown[]) => mutate(...a), query: (...a: unknown[]) => query(...a) } }))

import { completeGame, startGame } from '../game'
import { questResultStore } from '@/utils/questResultStore'

const replace = vi.fn()
const QUEST = '?difficulty=easy&quest=brain-peaks:bp-02-math:0'

function setSearch(search: string): void {
  vi.stubGlobal('window', { location: { search, replace } })
}

const NEVER = Symbol('never')
const settled = (p: Promise<unknown>): Promise<unknown> =>
  Promise.race([p, new Promise((r) => setTimeout(() => r(NEVER), 30))])

const RESULT = { id: 'g1', canPlay: false }

beforeEach(() => {
  mutate.mockReset()
  query.mockReset()
  replace.mockReset()
  questResultStore.set(null)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('startGame quest context', () => {
  it('sends questContext for a valid quest param', async () => {
    setSearch(QUEST)
    mutate.mockResolvedValue({ data: { startGame: RESULT } })
    await startGame({ themeId: 'MATH_CHALLENGE', difficulty: 1 })
    expect(mutate.mock.calls[0][0].variables.input.questContext).toEqual({
      worldId: 'brain-peaks',
      nodeId: 'bp-02-math',
      legIndex: 0,
    })
  })

  it('sends none and keeps canPlay for a non-quest start', async () => {
    setSearch('?difficulty=easy')
    mutate.mockResolvedValue({ data: { startGame: RESULT } })
    const result = await startGame({ themeId: 'MATH_CHALLENGE', difficulty: 1 })
    expect(mutate.mock.calls[0][0].variables.input.questContext).toBeUndefined()
    expect(result.canPlay).toBe(false)
  })

  it('treats an invalid quest param as absent', async () => {
    setSearch('?quest=bad')
    mutate.mockResolvedValue({ data: { startGame: RESULT } })
    const result = await startGame({ themeId: 'MATH_CHALLENGE', difficulty: 1 })
    expect(mutate.mock.calls[0][0].variables.input.questContext).toBeUndefined()
    expect(result.canPlay).toBe(false)
  })

  it.each(['BOND_AND_BURN', 'TRAFFIC_LAB', 'MINI_GOLF', 'CIRCUIT_BUILDER'])(
    'last allowed play works for %s in quest mode only',
    async (themeId) => {
      mutate.mockResolvedValue({ data: { startGame: { ...RESULT, themeId } } })
      setSearch(QUEST)
      expect((await startGame({ themeId, difficulty: 1 })).canPlay).toBe(true)
      setSearch('?difficulty=easy')
      expect((await startGame({ themeId, difficulty: 1 })).canPlay).toBe(false)
    }
  )

  it('does not force canPlay when the id is empty', async () => {
    setSearch(QUEST)
    mutate.mockResolvedValue({ data: { startGame: { id: '', canPlay: false } } })
    expect((await startGame({ themeId: 'MINI_GOLF', difficulty: 1 })).canPlay).toBe(false)
  })

  it.each([
    ['message', { message: 'Rate limit exceeded' }],
    ['code', { message: 'x', graphQLErrors: [{ extensions: { code: 'RATE_LIMIT_EXCEEDED' } }] }],
  ])('rate-limit error (%s) goes to the map with startFailed=rate and never settles', async (_n, err) => {
    setSearch(QUEST)
    mutate.mockRejectedValue(err)
    const caught = vi.fn()
    const outcome = await settled(startGame({ themeId: 'MINI_GOLF', difficulty: 1 }).catch(caught))
    expect(outcome).toBe(NEVER)
    expect(replace).toHaveBeenCalledWith('/quest-map?startFailed=rate')
    expect(caught).not.toHaveBeenCalled()
  })

  it('other quest error goes to the map with startFailed=quest', async () => {
    setSearch(QUEST)
    mutate.mockRejectedValue(new Error('Invalid request'))
    expect(await settled(startGame({ themeId: 'SCRATCH_CODING', difficulty: 1 }))).toBe(NEVER)
    expect(replace).toHaveBeenCalledWith('/quest-map?startFailed=quest')
  })

  it('non-quest errors rethrow', async () => {
    setSearch('')
    mutate.mockRejectedValue(new Error('boom'))
    await expect(startGame({ themeId: 'MINI_GOLF', difficulty: 1 })).rejects.toThrow('boom')
    expect(replace).not.toHaveBeenCalled()
  })

  it('clears a stale result on start', async () => {
    setSearch('')
    questResultStore.set({ worldId: 'w', nodeId: 'n', kind: 'GAME', score: 1, thresholds: [1, 2, 3], stars: 1, bestStars: 1, newlyUnlocked: [], worldCleared: false, badgesAwarded: [] })
    mutate.mockResolvedValue({ data: { startGame: RESULT } })
    await startGame({ themeId: 'MATH_CHALLENGE', difficulty: 1 })
    expect(questResultStore.get()).toBeNull()
  })
})

describe('completeGame quest field', () => {
  const quest = { worldId: 'w', nodeId: 'n', kind: 'GAME', score: 5, thresholds: [1, 2, 3], stars: 1, bestStars: 1, newlyUnlocked: [], worldCleared: false, badgesAwarded: [] }
  it('stores quest and clears on null', async () => {
    mutate.mockResolvedValueOnce({ data: { completeGame: { id: 'g', quest } } })
    await completeGame({ gameId: 'g', completionTime: 1, attempts: 1 })
    expect(questResultStore.get()).toEqual(quest)
    mutate.mockResolvedValueOnce({ data: { completeGame: { id: 'g', quest: null } } })
    await completeGame({ gameId: 'g', completionTime: 1, attempts: 1 })
    expect(questResultStore.get()).toBeNull()
  })
})
