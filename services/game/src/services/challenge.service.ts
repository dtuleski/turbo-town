import {
  AppError,
  ValidationError,
  addDays,
  challengeDayBounds,
  challengeDayOf,
  drawChallenge,
  eligibleRotation,
  expectedTotals,
  generateContent,
  isChallengeDay,
} from '@memory-game/shared';
import type { ChallengeDay, Game } from '@memory-game/shared';
import { ChallengeRepository } from '../repositories/challenge.repository';
import type { StoredChallenge, StoredScore } from '../repositories/challenge.repository';
import type { CompleteGameInput } from '../types';
import type {
  ChallengeCompletion,
  ChallengeLeaderboardView,
  ChallengeMyEntry,
  DailyChallengeView,
} from '../types/challenge';
import { logger } from '../utils/logger';

/** The single message every rejected challenge start returns (SECURITY-09). */
export const CHALLENGE_UNAVAILABLE_MESSAGE = 'This challenge is not available right now.';

/** Fixed reasons; logged only, never returned to the caller. */
type StartRejectReason = 'BAD_SHAPE' | 'WRONG_DAY' | 'UNAVAILABLE' | 'MISMATCH';
type NotRecordedReason = 'LATE' | 'NO_CHALLENGE' | 'MISMATCH' | 'TOTALS';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const RESULTS_TOP = 3;

function clampLimit(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(raw)));
}

/**
 * Daily Challenge orchestration (G2). The draw, content and totals come from the pure shared core;
 * this class reads, decides with them and writes. The stored CHALLENGE item is the truth.
 */
export class ChallengeService {
  constructor(
    private readonly repo: ChallengeRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  private today(): ChallengeDay {
    return challengeDayOf(this.now());
  }

  /** Draws and stores the day once (S1); every caller gets the stored item. */
  async ensureChallenge(day: ChallengeDay): Promise<StoredChallenge> {
    const existing = await this.repo.getChallenge(day);
    if (existing) return existing;
    const previous = await this.repo.getChallenge(addDays(day, -1));
    const entry = drawChallenge(day, eligibleRotation(), previous?.gameId);
    const item: StoredChallenge = {
      day,
      gameId: entry.gameId,
      themeId: entry.themeId,
      difficulty: entry.difficulty,
      settings: { ...entry.settings },
      content: generateContent(entry, day),
      createdAt: this.now().toISOString(),
    };
    if ((await this.repo.createChallenge(item)) === 'created') {
      logger.info('Daily challenge drawn', { day, gameId: item.gameId });
      return item;
    }
    const stored = await this.repo.getChallenge(day);
    if (!stored) throw new AppError('INTERNAL_ERROR', 'Daily challenge could not be read', 500);
    return stored;
  }

  private async myEntry(day: ChallengeDay, userId: string): Promise<ChallengeMyEntry | null> {
    const score = await this.repo.getScore(day, userId);
    return score ? this.entryOf(score) : null;
  }

  private async entryOf(score: StoredScore): Promise<ChallengeMyEntry> {
    const ahead = await this.repo.countAhead(score.day, score.rankKey);
    return { bestScore: score.bestScore, rank: ahead + 1, achievedAt: score.achievedAt };
  }

  async getToday(userId: string): Promise<DailyChallengeView> {
    const day = this.today();
    const c = await this.ensureChallenge(day);
    return {
      day,
      gameId: c.gameId,
      themeId: c.themeId,
      difficulty: c.difficulty,
      settings: c.settings,
      content: c.content,
      endsAt: challengeDayBounds(day).end.toISOString(),
      me: await this.myEntry(day, userId),
    };
  }

  /** Start check (S2). Every failure throws the one generic message, before any play is used. */
  async validateStart(input: unknown, themeId: string, difficulty: number): Promise<{ day: ChallengeDay }> {
    const reject = (reason: StartRejectReason, ids?: Record<string, unknown>): never => {
      logger.warn('Challenge start rejected', { reason, ...ids });
      throw new ValidationError(CHALLENGE_UNAVAILABLE_MESSAGE);
    };
    const day = typeof input === 'object' && input !== null ? (input as { day?: unknown }).day : undefined;
    if (!isChallengeDay(day)) return reject('BAD_SHAPE');
    if (day !== this.today()) return reject('WRONG_DAY', { day });
    let challenge: StoredChallenge;
    try {
      challenge = await this.ensureChallenge(day);
    } catch (error) {
      logger.error('Challenge start could not load the challenge', error as Error, { day });
      return reject('UNAVAILABLE', { day });
    }
    if (challenge.themeId !== themeId || challenge.difficulty !== difficulty) {
      return reject('MISMATCH', { day });
    }
    return { day };
  }

  /**
   * Completion check (S2): records the best score only for a game finished during its challenge day
   * with the challenge's game and the content's totals. Callers treat any throw as "no result".
   */
  async applyCompletion(
    userId: string,
    username: string,
    game: Game,
    score: number,
    metrics: CompleteGameInput
  ): Promise<ChallengeCompletion> {
    const day = game.challengeDay as ChallengeDay;
    const notRecorded = (reason: NotRecordedReason): ChallengeCompletion => {
      logger.warn('Challenge completion not recorded', { userId, gameId: game.id, day, reason });
      return { day, recorded: false, bestScore: null, rank: null, isNewBest: false };
    };
    const now = this.now();
    if (challengeDayOf(now) !== day) return notRecorded('LATE');
    const challenge = await this.repo.getChallenge(day);
    if (!challenge) return notRecorded('NO_CHALLENGE');
    if (challenge.themeId !== game.themeId || challenge.difficulty !== game.difficulty) {
      return notRecorded('MISMATCH');
    }
    const totals = expectedTotals(challenge.content);
    if (totals.totalQuestions !== undefined && metrics.totalQuestions !== totals.totalQuestions) {
      return notRecorded('TOTALS');
    }
    if (totals.totalWords !== undefined && metrics.totalWords !== totals.totalWords) {
      return notRecorded('TOTALS');
    }
    if (
      (metrics.correctAnswers !== undefined && metrics.totalQuestions !== undefined && metrics.correctAnswers > metrics.totalQuestions) ||
      (metrics.wordsFound !== undefined && metrics.totalWords !== undefined && metrics.wordsFound > metrics.totalWords)
    ) {
      return notRecorded('TOTALS');
    }
    const { updated, best } = await this.repo.putBestScore(day, userId, username, score, now.toISOString());
    const mine = await this.entryOf(best);
    return { day, recorded: true, bestScore: mine.bestScore, rank: mine.rank, isNewBest: updated };
  }

  /** Leaderboard of today or an earlier day (S3). Usernames only, never user ids. */
  async getLeaderboard(userId: string, rawDay?: unknown, rawLimit?: unknown): Promise<ChallengeLeaderboardView | null> {
    const today = this.today();
    const day = rawDay === undefined || rawDay === null ? today : rawDay;
    if (!isChallengeDay(day) || day > today) throw new ValidationError('Invalid challenge day');
    const limit = clampLimit(rawLimit);
    const challenge = day === today ? await this.ensureChallenge(day) : await this.repo.getChallenge(day);
    if (!challenge) return null;
    const top = await this.repo.topScores(day, limit);
    const entries = top.map((s, i) => ({
      rank: i + 1,
      username: s.username,
      score: s.bestScore,
      achievedAt: s.achievedAt,
      isMe: s.userId === userId,
    }));
    const mineInTop = entries.find((e) => e.isMe);
    const me = mineInTop
      ? { bestScore: mineInTop.score, rank: mineInTop.rank, achievedAt: mineInTop.achievedAt }
      : await this.myEntry(day, userId);
    return { day, gameId: challenge.gameId, themeId: challenge.themeId, final: day < today, entries, me };
  }

  /** The user's best and rank on a day, or null when they did not play it (digest, DC1). */
  async getMyEntry(day: ChallengeDay, userId: string): Promise<ChallengeMyEntry | null> {
    return this.myEntry(day, userId);
  }
  /** True when the user has a score for the day (the noon push skips them, FR-DC-22). */
  async hasPlayed(day: ChallengeDay, userId: string): Promise<boolean> {
    return (await this.repo.getScore(day, userId)) !== null;
  }
  /** A finished day for the digest (DC1): the challenge, the top players and the user's own entry. */
  async getDayResults(
    day: ChallengeDay,
    userId?: string,
    limit = RESULTS_TOP
  ): Promise<{ challenge: StoredChallenge | null; top: StoredScore[]; me: ChallengeMyEntry | null }> {
    const challenge = await this.repo.getChallenge(day);
    if (!challenge) return { challenge: null, top: [], me: null };
    const top = await this.repo.topScores(day, clampLimit(limit));
    const me = userId ? await this.myEntry(day, userId) : null;
    return { challenge, top, me };
  }
}

/** Off (undefined) unless DAILY_CHALLENGE_TABLE_NAME is set (NFR-DC-7). */
export function createChallengeService(env: Record<string, string | undefined>): ChallengeService | undefined {
  const table = env.DAILY_CHALLENGE_TABLE_NAME;
  if (!table) return undefined;
  return new ChallengeService(new ChallengeRepository(undefined, table));
}
