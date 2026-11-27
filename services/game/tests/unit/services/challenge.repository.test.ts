/**
 * DC2 - ChallengeRepository: item shapes, conditional writes, rank-index queries, fail closed.
 */
// tests/setup.ts auto-mocks lib-dynamodb; this suite needs real command objects to read `.input`.
jest.unmock('@aws-sdk/lib-dynamodb');

import { ChallengeRepository, rankKeyFor } from '../../../src/repositories/challenge.repository';
import type { StoredChallenge } from '../../../src/repositories/challenge.repository';
import { TABLE, memoryTable } from '../challenge-fixtures';

const challenge: StoredChallenge = {
  day: '2026-11-26',
  gameId: 'code-a-bot',
  themeId: 'CODE_A_BOT',
  difficulty: 2,
  settings: { levels: 5 },
  content: { kind: 'code-a-bot', difficulty: 'medium', levelNumbers: [1, 2, 3, 4, 5] },
  createdAt: '2026-11-26T05:00:00.000Z',
};

function inputOf(send: jest.Mock, i = 0): any {
  return (send.mock.calls[i] as any[])[0].input;
}

describe('rankKeyFor', () => {
  it('orders higher scores first, then the earlier time', () => {
    const keys = [
      rankKeyFor(900, '2026-11-26T10:00:00.000Z'),
      rankKeyFor(1200, '2026-11-26T12:00:00.000Z'),
      rankKeyFor(900, '2026-11-26T09:00:00.000Z'),
      rankKeyFor(0, '2026-11-26T08:00:00.000Z'),
    ].sort();
    expect(keys).toEqual([
      '999999998799#2026-11-26T12:00:00.000Z',
      '999999999099#2026-11-26T09:00:00.000Z',
      '999999999099#2026-11-26T10:00:00.000Z',
      '999999999999#2026-11-26T08:00:00.000Z',
    ]);
  });
});

describe('ChallengeRepository', () => {
  it('creates the CHALLENGE item once with attribute_not_exists(pk)', async () => {
    const t = memoryTable();
    const repo = new ChallengeRepository({ send: t.send }, TABLE);
    await expect(repo.createChallenge(challenge)).resolves.toBe('created');
    const input = inputOf(t.send);
    expect(input.TableName).toBe(TABLE);
    expect(input.ConditionExpression).toBe('attribute_not_exists(pk)');
    expect(input.Item).toEqual({
      pk: '2026-11-26',
      sk: 'CHALLENGE',
      gameId: 'code-a-bot',
      themeId: 'CODE_A_BOT',
      difficulty: 2,
      settings: { levels: 5 },
      content: challenge.content,
      createdAt: challenge.createdAt,
    });
    await expect(repo.createChallenge({ ...challenge, gameId: 'other' })).resolves.toBe('exists');
    await expect(repo.getChallenge('2026-11-26')).resolves.toEqual(challenge);
  });

  it('returns null for a missing day and fails closed on a corrupt item', async () => {
    const t = memoryTable();
    const repo = new ChallengeRepository({ send: t.send }, TABLE);
    await expect(repo.getChallenge('2026-11-25')).resolves.toBeNull();
    t.items.set('2026-11-24|CHALLENGE', { pk: '2026-11-24', sk: 'CHALLENGE', gameId: 'x' });
    await expect(repo.getChallenge('2026-11-24')).rejects.toThrow('Challenge item is invalid');
  });

  it('putBestScore writes a first score and only a strictly higher one after it', async () => {
    const t = memoryTable();
    const repo = new ChallengeRepository({ send: t.send }, TABLE);
    const first = await repo.putBestScore('2026-11-26', 'u1', 'ana', 900, '2026-11-26T10:00:00.000Z');
    expect(first.updated).toBe(true);
    const input = inputOf(t.send);
    expect(input.ConditionExpression).toBe('attribute_not_exists(bestScore) OR bestScore < :s');
    expect(input.ExpressionAttributeValues).toEqual({ ':s': 900 });
    expect(input.Item).toEqual({
      pk: '2026-11-26',
      sk: 'SCORE#u1',
      userId: 'u1',
      username: 'ana',
      bestScore: 900,
      achievedAt: '2026-11-26T10:00:00.000Z',
      rankPk: '2026-11-26',
      rankKey: rankKeyFor(900, '2026-11-26T10:00:00.000Z'),
    });

    // Equal score: kept, with the earlier time.
    const tie = await repo.putBestScore('2026-11-26', 'u1', 'ana', 900, '2026-11-26T11:00:00.000Z');
    expect(tie.updated).toBe(false);
    expect(tie.best.achievedAt).toBe('2026-11-26T10:00:00.000Z');

    // Lower score: kept.
    expect((await repo.putBestScore('2026-11-26', 'u1', 'ana', 100, '2026-11-26T12:00:00.000Z')).updated).toBe(false);

    // Higher score: replaces.
    const better = await repo.putBestScore('2026-11-26', 'u1', 'ana', 950, '2026-11-26T13:00:00.000Z');
    expect(better).toMatchObject({ updated: true, best: { bestScore: 950, achievedAt: '2026-11-26T13:00:00.000Z' } });
    expect(t.get('2026-11-26', 'SCORE#u1')?.bestScore).toBe(950);
  });

  it('topScores queries rank-index ascending with the limit', async () => {
    const t = memoryTable();
    const repo = new ChallengeRepository({ send: t.send }, TABLE);
    await repo.putBestScore('2026-11-26', 'u1', 'ana', 900, '2026-11-26T10:00:00.000Z');
    await repo.putBestScore('2026-11-26', 'u2', 'bo', 1200, '2026-11-26T11:00:00.000Z');
    await repo.putBestScore('2026-11-26', 'u3', 'cy', 900, '2026-11-26T09:00:00.000Z');
    await repo.putBestScore('2026-11-25', 'u4', 'di', 5000, '2026-11-25T09:00:00.000Z');
    t.send.mockClear();
    const top = await repo.topScores('2026-11-26', 2);
    expect(top.map((s) => s.username)).toEqual(['bo', 'cy']);
    const input = inputOf(t.send);
    expect(input).toMatchObject({
      TableName: TABLE,
      IndexName: 'rank-index',
      KeyConditionExpression: 'rankPk = :d',
      ExpressionAttributeValues: { ':d': '2026-11-26' },
      ScanIndexForward: true,
      Limit: 2,
    });
  });

  it('countAhead counts lower rank keys with Select COUNT across pages', async () => {
    const t = memoryTable({ pageSize: 2 });
    const repo = new ChallengeRepository({ send: t.send }, TABLE);
    for (let i = 0; i < 5; i++) {
      await repo.putBestScore('2026-11-26', `u${i}`, `p${i}`, 1000 + i, `2026-11-26T1${i}:00:00.000Z`);
    }
    t.send.mockClear();
    await expect(repo.countAhead('2026-11-26', rankKeyFor(1000, '2026-11-26T10:00:00.000Z'))).resolves.toBe(4);
    expect(t.send).toHaveBeenCalledTimes(2);
    expect(inputOf(t.send)).toMatchObject({
      IndexName: 'rank-index',
      KeyConditionExpression: 'rankPk = :d AND rankKey < :k',
      Select: 'COUNT',
    });
    await expect(repo.countAhead('2026-11-26', rankKeyFor(2000, '2026-11-26T10:00:00.000Z'))).resolves.toBe(0);
  });

  it('maps other errors without leaking the SDK message', async () => {
    const t = memoryTable();
    const repo = new ChallengeRepository({ send: t.send }, TABLE);
    t.failNext.error = Object.assign(new Error('arn:aws:secret-detail'), { name: 'SomethingElse' });
    await expect(repo.getScore('2026-11-26', 'u1')).rejects.toThrow('Database error occurred');
  });

  it('refuses to run without a table name', async () => {
    const saved = process.env.DAILY_CHALLENGE_TABLE_NAME;
    delete process.env.DAILY_CHALLENGE_TABLE_NAME;
    const repo = new ChallengeRepository({ send: jest.fn() });
    await expect(repo.getChallenge('2026-11-26')).rejects.toThrow('Daily challenge is not configured');
    if (saved !== undefined) process.env.DAILY_CHALLENGE_TABLE_NAME = saved;
  });
});
