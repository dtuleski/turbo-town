import { describe, expect, it, vi } from 'vitest'

const getChallengeLeaderboard = vi.fn()
vi.mock('@/api/challenge', () => ({ getChallengeLeaderboard: (...a: unknown[]) => getChallengeLeaderboard(...a) }))

import ChallengeResultsPage, { ChallengeResultsView, formatChallengeDay, resultsDay } from '../ChallengeResultsPage'
import { decode, renderMarkup } from '@/test/renderWithProviders'
import { makeEntries, makeLeaderboard } from '@/test/challengeFixtures'

const view = (props: Parameters<typeof ChallengeResultsView>[0]): string => decode(renderMarkup(<ChallengeResultsView {...props} />))

describe('resultsDay', () => {
  it('accepts a real calendar day', () => {
    expect(resultsDay('?day=2026-11-25')).toBe('2026-11-25')
  })

  it.each(['', '?day=', '?day=2026-11-31', '?day=yesterday', '?other=2026-11-25'])('is undefined (today) for %j', (search) => {
    expect(resultsDay(search)).toBeUndefined()
  })
})

describe('ChallengeResultsView', () => {
  it("shows the day's game, winner, top 10 and own rank for a final day", () => {
    const html = view({
      loading: false,
      data: makeLeaderboard({
        day: '2026-11-25',
        gameId: 'sudoku',
        themeId: 'SUDOKU',
        final: true,
        entries: makeEntries(12, 4),
        me: { bestScore: 970, rank: 4, achievedAt: '2026-11-25T14:00:00.000Z' },
      }),
    })
    expect(html).toContain('Daily Challenge results')
    expect(html).toContain('November 25, 2026')
    expect(html).toContain('Sudoku')
    expect(html).toContain('Winner: player1 with 1000 points')
    expect(html.match(/<li/g)).toHaveLength(10)
    expect(html).toContain('#4 player4 (you)')
    expect(html).toContain('You finished #4 with 970 points.')
    expect(html).not.toContain('still running')
  })

  it('says the challenge is still running for today and invites a player who did not play', () => {
    const html = view({ loading: false, data: makeLeaderboard() })
    expect(html).toContain('The challenge is still running.')
    expect(html).toContain('You did not play this challenge.')
    expect(html).toContain('href="/hub"')
  })

  it('handles a day nobody played', () => {
    const html = view({ loading: false, data: makeLeaderboard({ final: true, entries: [] }) })
    expect(html).toContain('Nobody played this challenge.')
    expect(html).not.toContain('<li')
  })

  it('shows a message when there are no results (no challenge that day, feature off or error)', () => {
    expect(view({ loading: false, data: null })).toContain('There are no challenge results for this day.')
  })

  it('shows a loading line first', () => {
    expect(view({ loading: true, data: null })).toContain('Loading results...')
  })
})

describe('ChallengeResultsPage', () => {
  it('starts in the loading state', () => {
    getChallengeLeaderboard.mockReturnValue(new Promise(() => {}))
    expect(decode(renderMarkup(<ChallengeResultsPage />, ['/challenge/results?day=2026-11-25']))).toContain('Loading results...')
  })

  it('formats a day as a calendar date in the UI language', () => {
    expect(formatChallengeDay('2026-11-25', 'en')).toBe('November 25, 2026')
    expect(formatChallengeDay('2026-11-25', 'pt')).toBe('25 de novembro de 2026')
  })
})
