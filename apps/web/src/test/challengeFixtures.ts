import type { ChallengeEntry, ChallengeLeaderboardView, DailyChallengeView } from '@/types/challenge'

export const DAY = '2026-11-26'

export function makeChallenge(overrides: Partial<DailyChallengeView> = {}): DailyChallengeView {
  return {
    day: DAY,
    gameId: 'code-a-bot',
    themeId: 'CODE_A_BOT',
    difficulty: 2,
    settings: { levels: 5 },
    content: { kind: 'code-a-bot', difficulty: 'medium', levelNumbers: [1, 2, 3, 4, 5] },
    endsAt: '2026-11-27T05:00:00.000Z',
    me: null,
    ...overrides,
  } as DailyChallengeView
}

export function makeEntries(count: number, meRank?: number): ChallengeEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    username: `player${i + 1}`,
    score: 1000 - i * 10,
    achievedAt: `2026-11-26T1${i % 10}:00:00.000Z`,
    isMe: meRank === i + 1,
  }))
}

export function makeLeaderboard(overrides: Partial<ChallengeLeaderboardView> = {}): ChallengeLeaderboardView {
  return {
    day: DAY,
    gameId: 'code-a-bot',
    themeId: 'CODE_A_BOT',
    final: false,
    entries: makeEntries(5),
    me: null,
    ...overrides,
  }
}
