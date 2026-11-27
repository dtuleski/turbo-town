import type { ChallengeContent, ChallengeDay, ChallengeSettings } from '@memory-game/shared';

/** The caller's own best for a day. */
export interface ChallengeMyEntry {
  bestScore: number;
  rank: number;
  achievedAt: string;
}

/** `getDailyChallenge` before JSON-encoding `settings` and `content`. */
export interface DailyChallengeView {
  day: ChallengeDay;
  gameId: string;
  themeId: string;
  difficulty: number;
  settings: ChallengeSettings;
  content: ChallengeContent;
  /** ISO, next Eastern midnight. */
  endsAt: string;
  me: ChallengeMyEntry | null;
}

/** A leaderboard row: username only, never a user id (SECURITY-08). */
export interface ChallengeEntry {
  rank: number;
  username: string;
  score: number;
  achievedAt: string;
  isMe: boolean;
}

export interface ChallengeLeaderboardView {
  day: ChallengeDay;
  gameId: string;
  themeId: string;
  /** The day has ended (results are final). */
  final: boolean;
  entries: ChallengeEntry[];
  me: ChallengeMyEntry | null;
}

/** `completeGame.challenge`: absent for non-challenge games or when the hook failed. */
export interface ChallengeCompletion {
  day: ChallengeDay;
  recorded: boolean;
  bestScore: number | null;
  rank: number | null;
  isNewBest: boolean;
}
