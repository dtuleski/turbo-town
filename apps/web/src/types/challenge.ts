import type { ChallengeContent, ChallengeSettings } from '@/utils/challengeShared'

/**
 * Web copies of the Daily Challenge response contracts. The server owns the originals in
 * services/game/src/types/challenge.ts; `settings` and `content` arrive as JSON text and are parsed
 * by src/api/challenge.ts.
 */
export interface ChallengeMyEntry {
  bestScore: number
  rank: number
  achievedAt: string
}

export interface DailyChallengeView {
  day: string
  gameId: string
  themeId: string
  difficulty: number
  settings: ChallengeSettings
  content: ChallengeContent
  /** ISO, next Eastern midnight. */
  endsAt: string
  me: ChallengeMyEntry | null
}

export interface ChallengeEntry {
  rank: number
  username: string
  score: number
  achievedAt: string
  isMe: boolean
}

export interface ChallengeLeaderboardView {
  day: string
  gameId: string
  themeId: string
  final: boolean
  entries: ChallengeEntry[]
  me: ChallengeMyEntry | null
}

/** `completeGame.challenge`: null for non-challenge games or when not recorded by the hook. */
export interface ChallengeCompletionResult {
  day: string
  recorded: boolean
  bestScore: number | null
  rank: number | null
  isNewBest: boolean
}
