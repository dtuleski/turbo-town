import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getDailyChallenge = vi.fn()
const getChallengeLeaderboard = vi.fn()
vi.mock('@/api/challenge', () => ({
  getDailyChallenge: (...a: unknown[]) => getDailyChallenge(...a),
  getChallengeLeaderboard: (...a: unknown[]) => getChallengeLeaderboard(...a),
}))

import DailyChallengeCard, {
  CARD_TOP_COUNT,
  DailyChallengeCardView,
  hasChallengeFailedFlag,
  loadDailyChallengeCard,
  resultsUrl,
} from '../DailyChallengeCard'
import { decode, renderMarkup } from '@/test/renderWithProviders'
import { DAY, makeChallenge, makeEntries, makeLeaderboard } from '@/test/challengeFixtures'

const card = (data: Parameters<typeof DailyChallengeCardView>[0]['data'], failed = false): string =>
  decode(renderMarkup(<DailyChallengeCardView data={data} failed={failed} />))

beforeEach(() => {
  getDailyChallenge.mockReset()
  getChallengeLeaderboard.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DailyChallengeCardView with data', () => {
  const html = card({
    challenge: makeChallenge({ me: { bestScore: 870, rank: 3, achievedAt: '2026-11-26T15:00:00.000Z' } }),
    leaderboard: makeLeaderboard({ entries: makeEntries(5, 3) }),
  })

  it('names the card and the game', () => {
    expect(html).toContain('Daily Challenge')
    expect(html).toContain('Code-a-Bot')
  })

  it('links Play to the challenge URL from buildChallengeUrl, as a 44px target', () => {
    expect(html).toMatch(
      /<a (?=[^>]*href="\/code-a-bot\/game\?difficulty=medium&challenge=2026-11-26")(?=[^>]*min-h-\[44px\])[^>]*>Play the challenge<\/a>/
    )
  })

  it("shows the player's best and rank", () => {
    expect(html).toContain('Your best today: 870 (rank #3)')
  })

  it('lists the top 5 and marks the player', () => {
    const rows = [...html.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    expect(rows).toEqual(['#1 player1 1000', '#2 player2 990', '#3 player3 (you) 980', '#4 player4 970', '#5 player5 960'])
  })

  it('says when the challenge ends and links to the results page for the day', () => {
    expect(html).toContain('Ends at midnight Eastern Time.')
    expect(html).toContain(`href="/challenge/results?day=${DAY}"`)
  })

  it('shows no failure notice', () => {
    expect(html).not.toContain('role="status"')
  })
})

describe('DailyChallengeCardView variants', () => {
  it('invites a player who has not played and shows at most 5 rows', () => {
    const html = card({ challenge: makeChallenge(), leaderboard: makeLeaderboard({ entries: makeEntries(8) }) })
    expect(html).toContain("You have not played today's challenge yet.")
    expect(html.match(/<li/g)).toHaveLength(CARD_TOP_COUNT)
  })

  it('shows an empty leaderboard message', () => {
    const html = card({ challenge: makeChallenge(), leaderboard: makeLeaderboard({ entries: [] }) })
    expect(html).toContain('No scores yet. Be the first!')
  })

  it('keeps the card without a leaderboard when only the leaderboard failed', () => {
    const html = card({ challenge: makeChallenge(), leaderboard: null })
    expect(html).toContain('Play the challenge')
    expect(html).not.toContain("Today's top 5")
  })

  it('has no Play link for a game without a web challenge mode', () => {
    const html = card({ challenge: makeChallenge({ gameId: 'mini-golf', themeId: 'MINI_GOLF' }), leaderboard: null })
    expect(html).toContain('Mini Golf')
    expect(html).not.toContain('Play the challenge')
  })

  it('renders nothing without data', () => {
    expect(card(null)).toBe('')
  })

  it('shows only the notice when a challenge start failed and there is no data', () => {
    const html = card(null, true)
    expect(html).toContain('role="status"')
    expect(html).toContain('This challenge is not available right now.')
    expect(html).not.toContain('daily-challenge-card')
  })

  it('shows the notice above the card when both apply', () => {
    const html = card({ challenge: makeChallenge(), leaderboard: null }, true)
    expect(html.indexOf('role="status"')).toBeLessThan(html.indexOf('daily-challenge-card'))
  })
})

describe('DailyChallengeCard container', () => {
  it('renders nothing before the challenge loads', () => {
    getDailyChallenge.mockReturnValue(new Promise(() => {}))
    getChallengeLeaderboard.mockReturnValue(new Promise(() => {}))
    expect(renderMarkup(<DailyChallengeCard />, ['/hub'])).toBe('')
  })

  it('shows the notice for /hub?challengeFailed=1', () => {
    getDailyChallenge.mockReturnValue(new Promise(() => {}))
    getChallengeLeaderboard.mockReturnValue(new Promise(() => {}))
    expect(decode(renderMarkup(<DailyChallengeCard />, ['/hub?challengeFailed=1']))).toContain(
      'This challenge is not available right now.'
    )
  })

  it('reads the flag only when it is exactly 1', () => {
    expect(hasChallengeFailedFlag('?challengeFailed=1')).toBe(true)
    expect(hasChallengeFailedFlag('?challengeFailed=0')).toBe(false)
    expect(hasChallengeFailedFlag('')).toBe(false)
  })
})

describe('loadDailyChallengeCard', () => {
  it("returns today's challenge with its top 5", async () => {
    const challenge = makeChallenge()
    const leaderboard = makeLeaderboard()
    getDailyChallenge.mockResolvedValue(challenge)
    getChallengeLeaderboard.mockResolvedValue(leaderboard)
    expect(await loadDailyChallengeCard()).toEqual({ challenge, leaderboard })
    expect(getChallengeLeaderboard).toHaveBeenCalledWith(undefined, 5)
  })

  it('returns null when getDailyChallenge returns null (feature off)', async () => {
    getDailyChallenge.mockResolvedValue(null)
    getChallengeLeaderboard.mockResolvedValue(makeLeaderboard())
    expect(await loadDailyChallengeCard()).toBeNull()
  })

  it('returns null when getDailyChallenge throws', async () => {
    getDailyChallenge.mockRejectedValue(new Error('boom'))
    getChallengeLeaderboard.mockResolvedValue(makeLeaderboard())
    expect(await loadDailyChallengeCard()).toBeNull()
  })

  it('drops a leaderboard that failed or belongs to another day', async () => {
    getDailyChallenge.mockResolvedValue(makeChallenge())
    getChallengeLeaderboard.mockRejectedValueOnce(new Error('boom'))
    expect((await loadDailyChallengeCard())?.leaderboard).toBeNull()
    getChallengeLeaderboard.mockResolvedValueOnce(makeLeaderboard({ day: '2026-11-25' }))
    expect((await loadDailyChallengeCard())?.leaderboard).toBeNull()
  })

  it('builds the results URL for a day', () => {
    expect(resultsUrl(DAY)).toBe('/challenge/results?day=2026-11-26')
  })
})
