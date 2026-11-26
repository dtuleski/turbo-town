/**
 * DC3 - ChallengeService with the real first-batch rotation (six eligible games): draws, start
 * validation and recorded completions for whatever game each day draws.
 */
jest.unmock('@aws-sdk/lib-dynamodb');
jest.unmock('@aws-sdk/client-dynamodb');
import { GameStatus, addDays, challengeDayBounds, eligibleRotation, expectedTotals } from '@memory-game/shared';
import type { Game } from '@memory-game/shared';
import type { CompleteGameInput } from '../../../src/types';
import { challengeRig } from '../challenge-fixtures';

const FIRST_DAY = '2026-11-26';
const FIRST_BATCH = ['code-a-bot', 'sudoku', 'math-challenge', 'math-maze', 'word-puzzle', 'hangman'];

/** Noon Eastern on `day`. */
const noonOf = (day: string): Date => new Date(challengeDayBounds(day).start.getTime() + 12 * 3600 * 1000);

describe('ChallengeService with the first-batch rotation', () => {
  it('has the six first-batch games eligible', () => {
    expect(eligibleRotation().map((e) => e.gameId).sort()).toEqual([...FIRST_BATCH].sort());
  });

  it('draws first-batch games without consecutive repeats and records completions with the expected totals', async () => {
    const { service, clock } = challengeRig(noonOf(FIRST_DAY).toISOString());
    const drawn: string[] = [];
    for (let i = 0; i < 14; i++) {
      const day = addDays(FIRST_DAY, i);
      clock.now = noonOf(day);
      const challenge = await service.ensureChallenge(day);
      expect(FIRST_BATCH).toContain(challenge.gameId);
      expect(challenge.content.kind).toBe(challenge.gameId);
      expect(challenge.difficulty).toBe(2);
      if (i > 0) expect(challenge.gameId).not.toBe(drawn[i - 1]);
      drawn.push(challenge.gameId);

      await expect(service.validateStart({ day }, challenge.themeId, 2)).resolves.toEqual({ day });

      const totals = expectedTotals(challenge.content);
      const metrics: CompleteGameInput = {
        gameId: `g-${day}`,
        completionTime: 100,
        attempts: 1,
        ...(totals.totalQuestions !== undefined
          ? { totalQuestions: totals.totalQuestions, correctAnswers: totals.totalQuestions }
          : {}),
        ...(totals.totalWords !== undefined ? { totalWords: totals.totalWords, wordsFound: totals.totalWords } : {}),
      };
      const game = {
        id: `g-${day}`,
        userId: 'u1',
        themeId: challenge.themeId,
        difficulty: 2,
        status: GameStatus.InProgress,
        startedAt: clock.now,
        attempts: 0,
        score: 0,
        challengeDay: day,
      } as Game;
      const result = await service.applyCompletion('u1', 'ana', game, 500 + i, metrics);
      expect(result).toEqual({ day, recorded: true, bestScore: 500 + i, rank: 1, isNewBest: true });

      // One question fewer than the content is not recorded.
      const short: CompleteGameInput =
        metrics.totalWords !== undefined
          ? { ...metrics, totalWords: metrics.totalWords - 1, wordsFound: metrics.totalWords - 1 }
          : { ...metrics, totalQuestions: (metrics.totalQuestions as number) - 1, correctAnswers: 0 };
      expect((await service.applyCompletion('u2', 'bo', { ...game, userId: 'u2' }, 900, short)).recorded).toBe(false);
    }
    expect(new Set(drawn).size).toBeGreaterThanOrEqual(3);
  });

  it('serves stored content that survives the JSON encoding of getDailyChallenge', async () => {
    const { service } = challengeRig(noonOf(FIRST_DAY).toISOString());
    const view = await service.getToday('u1');
    expect(JSON.parse(JSON.stringify(view.content))).toEqual(view.content);
    expect(view.content.kind).toBe(view.gameId);
  });
});
