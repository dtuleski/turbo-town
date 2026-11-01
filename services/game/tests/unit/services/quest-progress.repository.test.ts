/**
 * QM2 - QuestProgressRepository: conditional versioned save, conflict translation, fail closed.
 */
// tests/setup.ts auto-mocks lib-dynamodb; this suite needs real command objects to read `.input`.
jest.unmock('@aws-sdk/lib-dynamodb');

import { QuestProgressRepository, QuestVersionConflictError } from '../../../src/repositories/quest-progress.repository';
import type { WorldProgress } from '@memory-game/shared';

const progress: WorldProgress = {
  worldId: 'brain-peaks',
  nodes: {},
  totalStars: 0,
  badges: [],
  version: 0,
  updatedAt: '2026-01-15T12:00:00.000Z',
};

function repoWith(send: jest.Mock) {
  return new QuestProgressRepository({ send }, 'memory-game-quest-progress-test');
}

describe('QuestProgressRepository.saveWorld', () => {
  it('writes version expected+1 with a version condition and bound values only', async () => {
    const send = jest.fn(async () => ({}));
    await repoWith(send).saveWorld('u1', progress, 4);
    const input = (send.mock.calls[0] as any[])[0].input;
    expect(input.TableName).toBe('memory-game-quest-progress-test');
    expect(input.Item).toMatchObject({ userId: 'u1', worldId: 'brain-peaks', version: 5 });
    expect(input.ConditionExpression).toBe('attribute_not_exists(userId) OR #version = :expected');
    expect(input.ExpressionAttributeValues).toEqual({ ':expected': 4 });
  });

  it('omits activeGauntlet when there is none', async () => {
    const send = jest.fn(async () => ({}));
    await repoWith(send).saveWorld('u1', progress, 0);
    expect((send.mock.calls[0] as any[])[0].input.Item).not.toHaveProperty('activeGauntlet');
  });

  it('translates ConditionalCheckFailedException into QuestVersionConflictError', async () => {
    const send = jest.fn(async () => {
      throw Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' });
    });
    await expect(repoWith(send).saveWorld('u1', progress, 1)).rejects.toBeInstanceOf(QuestVersionConflictError);
  });

  it('maps other errors without leaking the SDK message', async () => {
    const send = jest.fn(async () => {
      throw Object.assign(new Error('arn:aws:secret-detail'), { name: 'SomethingElse' });
    });
    await expect(repoWith(send).saveWorld('u1', progress, 1)).rejects.toThrow('Database error occurred');
  });
});

describe('QuestProgressRepository reads', () => {
  it('getWorld returns undefined for a missing item', async () => {
    const send = jest.fn(async () => ({}));
    await expect(repoWith(send).getWorld('u1', 'brain-peaks')).resolves.toBeUndefined();
    expect((send.mock.calls[0] as any[])[0].input.Key).toEqual({ userId: 'u1', worldId: 'brain-peaks' });
  });

  it('getWorld fails closed on a corrupt item', async () => {
    const send = jest.fn(async () => ({ Item: { userId: 'u1', worldId: 'brain-peaks', version: 'x' } }));
    await expect(repoWith(send).getWorld('u1', 'brain-peaks')).rejects.toThrow('Quest progress item is invalid');
  });

  it('listWorlds queries by the key condition with bound values', async () => {
    const send = jest.fn(async () => ({
      Items: [{ ...progress, userId: 'u1', version: 2 }],
    }));
    const worlds = await repoWith(send).listWorlds('u1');
    expect(worlds).toHaveLength(1);
    const input = (send.mock.calls[0] as any[])[0].input;
    expect(input.KeyConditionExpression).toBe('userId = :userId');
    expect(input.ExpressionAttributeValues).toEqual({ ':userId': 'u1' });
  });

  it('fails closed when the table name is not configured', async () => {
    const saved = process.env.QUEST_PROGRESS_TABLE_NAME;
    delete process.env.QUEST_PROGRESS_TABLE_NAME;
    try {
      const repo = new QuestProgressRepository({ send: jest.fn() });
      await expect(repo.getWorld('u1', 'brain-peaks')).rejects.toThrow('Quest progress is not configured');
      await expect(repo.saveWorld('u1', progress, 0)).rejects.toThrow('Quest progress is not configured');
    } finally {
      if (saved !== undefined) process.env.QUEST_PROGRESS_TABLE_NAME = saved;
    }
  });
});
