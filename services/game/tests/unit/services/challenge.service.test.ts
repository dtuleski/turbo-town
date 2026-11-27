/**
 * DC2 - ChallengeService over the real repository and an in-memory table, with a fixed clock.
 */
jest.unmock('@aws-sdk/lib-dynamodb');
jest.unmock('@aws-sdk/client-dynamodb');
// These fixtures play Code-a-Bot, so the draw is pinned to it. The real first-batch rotation (six
// games) runs in challenge.service.rotation.test.ts.
jest.mock('@memory-game/shared', () => {
  const actual = jest.requireActual('@memory-game/shared');
  return {
    ...actual,
    eligibleRotation: () => actual.CHALLENGE_ROTATION.filter((e: { gameId: string }) => e.gameId === 'code-a-bot'),
  };
});

import { GameStatus, ValidationError } from '@memory-game/shared';
import type { Game } from '@memory-game/shared';
import { CHALLENGE_UNAVAILABLE_MESSAGE, createChallengeService } from '../../../src/services/challenge.service';
import type { CompleteGameInput } from '../../../src/types';
import { challengeRig } from '../challenge-fixtures';

const DAY = '2026-11-26'; // clock 17:00Z = 12:00 EST

function challengeGame(over: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    userId: 'u1',
    themeId: 'CODE_A_BOT',
    difficulty: 2,
    status: GameStatus.InProgress,
    startedAt: new Date(),
    attempts: 0,
    score: 0,
    challengeDay: DAY,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

const metrics = (over: Partial<CompleteGameInput> = {}): CompleteGameInput => ({
  gameId: 'g1',
  completionTime: 120,
  attempts: 1,
  correctAnswers: 5,
  totalQuestions: 5,
  ...over,
});

describe('createChallengeService', () => {
  it('is off without DAILY_CHALLENGE_TABLE_NAME', () => {
    expect(createChallengeService({})).toBeUndefined();
    expect(createChallengeService({ DAILY_CHALLENGE_TABLE_NAME: '' })).toBeUndefined();
    expect(createChallengeService({ DAILY_CHALLENGE_TABLE_NAME: 'memory-game-daily-challenge-dev' })).toBeDefined();
  });
});

describe('ensureChallenge (S1)', () => {
  it('draws once, stores the item and serves the stored item afterwards', async () => {
    const { service, table } = challengeRig();
    const first = await service.ensureChallenge(DAY);
    expect(first).toMatchObject({
      day: DAY,
      gameId: 'code-a-bot',
      themeId: 'CODE_A_BOT',
      difficulty: 2,
      settings: { levels: 5 },
      content: { kind: 'code-a-bot', difficulty: 'medium', levelNumbers: [1, 2, 3, 4, 5] },
    });
    // The previous day is read for the no-repeat rule.
    expect(table.calls.some((c) => c.input?.Key?.pk === '2026-11-25')).toBe(true);
    // A stored item wins over any redraw, even if it differs from what the code would draw now.
    table.items.set(`${DAY}|CHALLENGE`, { ...table.get(DAY, 'CHALLENGE'), gameId: 'stored-game' });
    expect((await service.ensureChallenge(DAY)).gameId).toBe('stored-game');
  });

  it('re-reads the winner when another writer created the day first', async () => {
    const { service, table, repo } = challengeRig();
    const winner = { pk: DAY, sk: 'CHALLENGE', gameId: 'winner', themeId: 'CODE_A_BOT', difficulty: 2, settings: {}, content: { kind: 'code-a-bot' }, createdAt: 'x' };
    const realGet = repo.getChallenge.bind(repo);
    let reads = 0;
    jest.spyOn(repo, 'getChallenge').mockImplementation(async (day) => {
      reads++;
      // First read misses; the other writer lands before our conditional put.
      if (day === DAY && reads === 1) {
        table.items.set(`${DAY}|CHALLENGE`, winner);
        return null;
      }
      return realGet(day);
    });
    expect((await service.ensureChallenge(DAY)).gameId).toBe('winner');
  });
});

describe('validateStart (S2)', () => {
  it('accepts today with the challenge game and difficulty', async () => {
    const { service } = challengeRig();
    await expect(service.validateStart({ day: DAY }, 'CODE_A_BOT', 2)).resolves.toEqual({ day: DAY });
  });

  const bad: [string, unknown, string, number][] = [
    ['not an object', 'nope', 'CODE_A_BOT', 2],
    ['null', null, 'CODE_A_BOT', 2],
    ['no day', {}, 'CODE_A_BOT', 2],
    ['malformed day', { day: '2026-11-31' }, 'CODE_A_BOT', 2],
    ['yesterday', { day: '2026-11-25' }, 'CODE_A_BOT', 2],
    ['tomorrow', { day: '2026-11-27' }, 'CODE_A_BOT', 2],
    ['wrong theme', { day: DAY }, 'SUDOKU', 2],
    ['wrong difficulty', { day: DAY }, 'CODE_A_BOT', 3],
  ];
  it.each(bad)('%s -> the one generic message', async (_n, ctx, themeId, difficulty) => {
    const { service } = challengeRig();
    const attempt = service.validateStart(ctx, themeId, difficulty);
    await expect(attempt).rejects.toBeInstanceOf(ValidationError);
    await expect(service.validateStart(ctx, themeId, difficulty)).rejects.toThrow(CHALLENGE_UNAVAILABLE_MESSAGE);
  });

  it('a database failure is also the generic message', async () => {
    const { service, table } = challengeRig();
    table.failNext.error = Object.assign(new Error('boom'), { name: 'ProvisionedThroughputExceededException' });
    await expect(service.validateStart({ day: DAY }, 'CODE_A_BOT', 2)).rejects.toThrow(CHALLENGE_UNAVAILABLE_MESSAGE);
  });

  it('uses the Eastern day, not the UTC day', async () => {
    const { service, clock } = challengeRig('2026-11-27T03:00:00.000Z'); // 22:00 EST on the 26th
    await expect(service.validateStart({ day: DAY }, 'CODE_A_BOT', 2)).resolves.toEqual({ day: DAY });
    clock.now = new Date('2026-11-27T05:00:00.000Z');
    await expect(service.validateStart({ day: DAY }, 'CODE_A_BOT', 2)).rejects.toThrow(CHALLENGE_UNAVAILABLE_MESSAGE);
  });
});

describe('applyCompletion (S2, FR-DC-17 to FR-DC-19)', () => {
  it('records the best, keeps an equal score with the earlier time, replaces on a higher one', async () => {
    const { service, clock } = challengeRig();
    await service.ensureChallenge(DAY);
    const first = await service.applyCompletion('u1', 'ana', challengeGame(), 900, metrics());
    expect(first).toEqual({ day: DAY, recorded: true, bestScore: 900, rank: 1, isNewBest: true });

    clock.now = new Date('2026-11-26T18:00:00.000Z');
    const tie = await service.applyCompletion('u1', 'ana', challengeGame(), 900, metrics());
    expect(tie).toEqual({ day: DAY, recorded: true, bestScore: 900, rank: 1, isNewBest: false });
    const board = await service.getLeaderboard('u1');
    expect(board?.entries[0]?.achievedAt).toBe('2026-11-26T17:00:00.000Z');

    const higher = await service.applyCompletion('u1', 'ana', challengeGame(), 1000, metrics());
    expect(higher).toEqual({ day: DAY, recorded: true, bestScore: 1000, rank: 1, isNewBest: true });
  });

  it('ranks ties by the earlier time (FR-DC-18)', async () => {
    const { service, clock } = challengeRig();
    await service.ensureChallenge(DAY);
    await service.applyCompletion('u1', 'ana', challengeGame(), 900, metrics());
    clock.now = new Date('2026-11-26T18:00:00.000Z');
    const later = await service.applyCompletion('u2', 'bo', challengeGame({ userId: 'u2' }), 900, metrics());
    expect(later.rank).toBe(2);
    const better = await service.applyCompletion('u3', 'cy', challengeGame({ userId: 'u3' }), 901, metrics());
    expect(better.rank).toBe(1);
  });

  it('does not record a completion after Eastern midnight', async () => {
    const { service, clock, table } = challengeRig();
    await service.ensureChallenge(DAY);
    clock.now = new Date('2026-11-27T05:00:01.000Z');
    const result = await service.applyCompletion('u1', 'ana', challengeGame(), 900, metrics());
    expect(result).toEqual({ day: DAY, recorded: false, bestScore: null, rank: null, isNewBest: false });
    expect(table.get(DAY, 'SCORE#u1')).toBeUndefined();
  });

  it.each([
    ['totalQuestions different from expectedTotals', metrics({ totalQuestions: 4, correctAnswers: 4 })],
    ['totalQuestions missing', metrics({ totalQuestions: undefined })],
    ['correctAnswers above totalQuestions', metrics({ correctAnswers: 6 })],
  ])('does not record with %s', async (_n, m) => {
    const { service, table } = challengeRig();
    await service.ensureChallenge(DAY);
    const result = await service.applyCompletion('u1', 'ana', challengeGame(), 900, m);
    expect(result.recorded).toBe(false);
    expect(table.get(DAY, 'SCORE#u1')).toBeUndefined();
  });

  it('does not record for another game or difficulty, or without a stored challenge', async () => {
    const { service } = challengeRig();
    expect((await service.applyCompletion('u1', 'ana', challengeGame(), 900, metrics())).recorded).toBe(false);
    await service.ensureChallenge(DAY);
    expect((await service.applyCompletion('u1', 'ana', challengeGame({ themeId: 'SUDOKU' }), 900, metrics())).recorded).toBe(false);
    expect((await service.applyCompletion('u1', 'ana', challengeGame({ difficulty: 3 }), 900, metrics())).recorded).toBe(false);
  });
});

describe('getToday and getLeaderboard (S3)', () => {
  async function seeded() {
    const rig = challengeRig();
    await rig.service.ensureChallenge(DAY);
    const scores: [string, string, number][] = [
      ['u1', 'ana', 900],
      ['u2', 'bo', 1200],
      ['u3', 'cy', 700],
      ['u4', 'di', 1000],
    ];
    for (const [userId, username, score] of scores) {
      await rig.service.applyCompletion(userId, username, challengeGame({ userId }), score, metrics());
    }
    return rig;
  }

  it('getToday returns the challenge, its end and my entry', async () => {
    const { service } = await seeded();
    const view = await service.getToday('u1');
    expect(view).toMatchObject({
      day: DAY,
      gameId: 'code-a-bot',
      themeId: 'CODE_A_BOT',
      difficulty: 2,
      endsAt: '2026-11-27T05:00:00.000Z',
      me: { bestScore: 900, rank: 3, achievedAt: '2026-11-26T17:00:00.000Z' },
    });
    expect((await service.getToday('nobody')).me).toBeNull();
  });

  it('lists usernames in rank order, never user ids, with me outside the top', async () => {
    const { service } = await seeded();
    const board = await service.getLeaderboard('u3', undefined, 2);
    expect(board).toEqual({
      day: DAY,
      gameId: 'code-a-bot',
      themeId: 'CODE_A_BOT',
      final: false,
      entries: [
        { rank: 1, username: 'bo', score: 1200, achievedAt: '2026-11-26T17:00:00.000Z', isMe: false },
        { rank: 2, username: 'di', score: 1000, achievedAt: '2026-11-26T17:00:00.000Z', isMe: false },
      ],
      me: { bestScore: 700, rank: 4, achievedAt: '2026-11-26T17:00:00.000Z' },
    });
    expect(JSON.stringify(board)).not.toMatch(/u[1-4]/);
    expect((await service.getLeaderboard('u2'))?.me).toEqual({ bestScore: 1200, rank: 1, achievedAt: '2026-11-26T17:00:00.000Z' });
  });

  it('clamps the limit to 1..50 (default 10)', async () => {
    const { service, table } = await seeded();
    const limits = async (raw: unknown) => {
      table.send.mockClear();
      await service.getLeaderboard('u1', undefined, raw);
      return table.calls.filter((c) => c.input?.Limit !== undefined).pop()?.input.Limit;
    };
    expect(await limits(undefined)).toBe(10);
    expect(await limits(0)).toBe(1);
    expect(await limits(500)).toBe(50);
    expect(await limits(3.7)).toBe(3);
    expect(await limits('7')).toBe(10);
  });

  it('accepts a past day (final) and rejects future or malformed days', async () => {
    const { service, clock } = await seeded();
    clock.now = new Date('2026-11-27T15:00:00.000Z');
    const past = await service.getLeaderboard('u1', DAY);
    expect(past?.final).toBe(true);
    expect(past?.entries).toHaveLength(4);
    await expect(service.getLeaderboard('u1', '2026-11-28')).rejects.toThrow('Invalid challenge day');
    await expect(service.getLeaderboard('u1', 'yesterday')).rejects.toBeInstanceOf(ValidationError);
    await expect(service.getLeaderboard('u1', '2026-11-01')).resolves.toBeNull();
  });

  it('getDayResults returns the top 3 and my entry', async () => {
    const { service } = await seeded();
    const results = await service.getDayResults(DAY, 'u3');
    expect(results.challenge?.gameId).toBe('code-a-bot');
    expect(results.top.map((s) => s.username)).toEqual(['bo', 'di', 'ana']);
    expect(results.me).toMatchObject({ bestScore: 700, rank: 4 });
    expect(await service.getDayResults('2026-11-01')).toEqual({ challenge: null, top: [], me: null });
  });
});
