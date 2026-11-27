jest.unmock('@aws-sdk/lib-dynamodb');
jest.unmock('@aws-sdk/client-dynamodb');
jest.unmock('@aws-sdk/client-cognito-identity-provider');
import { BatchWriteCommand, DeleteCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { AdminDeleteUserCommand, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { AccountDeletionService, stageOf, tableName } from '../../../src/services/account-deletion.service';

type Cmd = any;

/** Minimal fake: answers by command class and records every call in order. */
function fakeClient(answer: (c: Cmd) => any) {
  const calls: Cmd[] = [];
  return {
    calls,
    send: jest.fn(async (c: Cmd) => {
      calls.push(c);
      return answer(c) ?? {};
    }),
  };
}

const ENV = { SUBSCRIPTIONS_TABLE_NAME: 'memory-game-subscriptions-prod', GAMES_TABLE_NAME: 'memory-game-games-prod' };
const NOW = new Date('2026-11-26T12:00:00Z');

function setup(opts: { record?: any; items?: Record<string, any[]>; cognitoUser?: string | null; stripeSubs?: any[] } = {}) {
  const ddb = fakeClient((c) => {
    if (c instanceof GetCommand) return { Item: opts.record };
    if (c instanceof QueryCommand) {
      const key = String(c.input.IndexName ? `${c.input.TableName}#${c.input.IndexName}` : c.input.TableName);
      return { Items: opts.items?.[key] ?? [] };
    }
    if (c instanceof BatchWriteCommand) return { UnprocessedItems: {} };
    return {};
  });
  const cognito = fakeClient((c) => {
    if (c instanceof ListUsersCommand) {
      return { Users: opts.cognitoUser === null ? [] : [{ Username: opts.cognitoUser ?? 'Google_123' }] };
    }
    return {};
  });
  const cancel = jest.fn(async (id: string) => ({ id, status: 'canceled' }));
  const list = jest.fn(async () => ({ data: opts.stripeSubs ?? [] }));
  const stripe = { subscriptions: { cancel, list } } as any;
  const service = new AccountDeletionService({
    ddb: ddb as any,
    cognito: cognito as any,
    stripe: async () => stripe,
    userPoolId: 'us-east-1_pool',
    env: ENV,
    now: () => NOW,
  });
  return { service, ddb, cognito, cancel, list };
}

describe('table names', () => {
  it('derives the stage from a known table name', () => {
    expect(stageOf(ENV)).toBe('prod');
    expect(tableName(ENV, 'REVIEWS_TABLE_NAME', 'reviews')).toBe('memory-game-reviews-prod');
    expect(tableName({ ...ENV, REVIEWS_TABLE_NAME: 'custom' }, 'REVIEWS_TABLE_NAME', 'reviews')).toBe('custom');
  });

  it('refuses to guess without any table name', () => {
    expect(() => stageOf({})).toThrow();
  });
});

describe('AccountDeletionService.deleteAccount', () => {
  it('deletes every user row and the login, and removes the login last', async () => {
    const { service, ddb, cognito } = setup({
      record: { userId: 'u1', tier: 'FREE' },
      items: {
        'memory-game-games-prod': [{ userId: 'u1', gameId: 'g1', score: 5 }, { userId: 'u1', gameId: 'g2' }],
        'memory-game-reviews-prod': [{ PK: 'USER#u1', SK: 'REVIEW#MEMORY_MATCH', stars: 5 }],
        'memory-game-leaderboard-entries-prod#UserScoreHistoryIndex': [
          { gameType: 'MEMORY_MATCH', scoreTimestamp: '0100#t', userId: 'u1' },
        ],
      },
    });

    const result = await service.deleteAccount('u1');

    expect(result).toEqual({ deleted: true, appleSubscriptionActive: false, stripeSubscriptionsCancelled: 0 });
    const batches = ddb.calls.filter((c) => c instanceof BatchWriteCommand).map((c) => c.input.RequestItems);
    expect(batches).toContainEqual({
      'memory-game-games-prod': [
        { DeleteRequest: { Key: { userId: 'u1', gameId: 'g1' } } },
        { DeleteRequest: { Key: { userId: 'u1', gameId: 'g2' } } },
      ],
    });
    expect(batches).toContainEqual({
      'memory-game-reviews-prod': [{ DeleteRequest: { Key: { PK: 'USER#u1', SK: 'REVIEW#MEMORY_MATCH' } } }],
    });
    expect(batches).toContainEqual({
      'memory-game-leaderboard-entries-prod': [
        { DeleteRequest: { Key: { gameType: 'MEMORY_MATCH', scoreTimestamp: '0100#t' } } },
      ],
    });
    const singles = ddb.calls.filter((c) => c instanceof DeleteCommand).map((c) => c.input.TableName);
    expect(singles).toEqual(
      expect.arrayContaining([
        'memory-game-email-prefs-prod',
        'memory-game-rate-limits-prod',
        'memory-game-rate-limit-buckets-prod',
        'memory-game-user-settings-prod',
        'memory-game-users-prod',
        'memory-game-subscriptions-prod',
      ])
    );
    const queried = ddb.calls.filter((c) => c instanceof QueryCommand).map((c) => c.input.TableName);
    expect(queried).toEqual(
      expect.arrayContaining([
        'memory-game-achievements-prod',
        'memory-game-language-progress-prod',
        'memory-game-language-results-prod',
        'memory-game-quest-progress-prod',
        'memory-game-user-aggregates-prod',
        'memory-game-leaderboards-prod',
      ])
    );
    const del = cognito.calls.find((c) => c instanceof AdminDeleteUserCommand)!;
    expect(del.input).toEqual({ UserPoolId: 'us-east-1_pool', Username: 'Google_123' });
    // The login goes after all data.
    const lastDdb = Math.max(...ddb.send.mock.invocationCallOrder);
    const cognitoDelete = cognito.send.mock.invocationCallOrder[cognito.calls.indexOf(del)];
    expect(cognitoDelete).toBeGreaterThan(lastDdb);
  });

  it('cancels every chargeable Stripe subscription of the customer before deleting data', async () => {
    const { service, ddb, cancel, list } = setup({
      record: { userId: 'u1', sources: { stripe: { tier: 'LIGHT', status: 'ACTIVE', customerId: 'cus_1', externalId: 'sub_1' } } },
      stripeSubs: [
        { id: 'sub_1', status: 'active' },
        { id: 'sub_old', status: 'canceled' },
        { id: 'sub_2', status: 'past_due' },
      ],
    });

    const result = await service.deleteAccount('u1');

    expect(list).toHaveBeenCalledWith({ customer: 'cus_1', status: 'all', limit: 100 });
    expect(cancel.mock.calls.map((c) => c[0]).sort()).toEqual(['sub_1', 'sub_2']);
    expect(result.stripeSubscriptionsCancelled).toBe(2);
    const firstDelete = ddb.send.mock.invocationCallOrder[ddb.calls.findIndex((c) => !(c instanceof GetCommand))];
    expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(firstDelete);
  });

  it('treats an already removed Stripe subscription as done', async () => {
    const { service, cancel } = setup({ record: { userId: 'u1', stripeSubscriptionId: 'sub_gone' } });
    cancel.mockRejectedValueOnce(Object.assign(new Error('No such subscription'), { code: 'resource_missing' }));
    await expect(service.deleteAccount('u1')).resolves.toMatchObject({ deleted: true, stripeSubscriptionsCancelled: 0 });
  });

  it('stops before deleting anything when Stripe fails, so the user can retry', async () => {
    const { service, ddb, cognito, cancel } = setup({ record: { userId: 'u1', stripeSubscriptionId: 'sub_1' } });
    cancel.mockRejectedValueOnce(Object.assign(new Error('Stripe down'), { code: 'api_error' }));
    await expect(service.deleteAccount('u1')).rejects.toThrow('Stripe down');
    expect(ddb.calls.filter((c) => !(c instanceof GetCommand))).toHaveLength(0);
    expect(cognito.calls).toHaveLength(0);
  });

  it('reports an active App Store subscription and frees its binding', async () => {
    const { service, ddb } = setup({
      record: {
        userId: 'u1',
        sources: { apple: { tier: 'STANDARD', status: 'ACTIVE', externalId: 'otx_9', expiresAt: '2026-12-20T00:00:00Z' } },
      },
    });
    const result = await service.deleteAccount('u1');
    expect(result.appleSubscriptionActive).toBe(true);
    const keys = ddb.calls.filter((c) => c instanceof DeleteCommand).map((c: any) => c.input.Key.userId);
    expect(keys).toContain('apple#otx_9');
  });

  it('does not report an App Store subscription that has expired', async () => {
    const { service } = setup({
      record: { userId: 'u1', sources: { apple: { tier: 'LIGHT', status: 'ACTIVE', externalId: 'otx_1', expiresAt: '2026-11-01T00:00:00Z' } } },
    });
    expect((await service.deleteAccount('u1')).appleSubscriptionActive).toBe(false);
  });

  it('finishes when the login is already gone', async () => {
    const { service, cognito } = setup({ cognitoUser: null });
    await expect(service.deleteAccount('u1')).resolves.toMatchObject({ deleted: true });
    expect(cognito.calls.some((c) => c instanceof AdminDeleteUserCommand)).toBe(false);
  });

  it('does not touch the daily-challenge table when DAILY_CHALLENGE_TABLE_NAME is unset', async () => {
    const { service, ddb } = setup();
    await service.deleteAccount('u1');
    const tables = ddb.calls.map((c) => c.input?.TableName ?? Object.keys(c.input?.RequestItems ?? {})[0]);
    expect(tables.some((t) => String(t).includes('daily-challenge'))).toBe(false);
  });

  it('deletes the user\'s challenge scores through user-index when the table is set', async () => {
    const ddb = fakeClient((c) => {
      if (c instanceof QueryCommand && c.input.TableName === 'memory-game-daily-challenge-prod') {
        return {
          Items: [
            { pk: '2026-11-25', sk: 'SCORE#u1', userId: 'u1', bestScore: 900 },
            { pk: '2026-11-26', sk: 'SCORE#u1', userId: 'u1', bestScore: 1000 },
          ],
        };
      }
      if (c instanceof QueryCommand) return { Items: [] };
      if (c instanceof BatchWriteCommand) return { UnprocessedItems: {} };
      return {};
    });
    const cognito = fakeClient((c) => (c instanceof ListUsersCommand ? { Users: [{ Username: 'u1' }] } : {}));
    const service = new AccountDeletionService({
      ddb: ddb as any,
      cognito: cognito as any,
      stripe: async () => ({}) as any,
      userPoolId: 'us-east-1_pool',
      env: { ...ENV, DAILY_CHALLENGE_TABLE_NAME: 'memory-game-daily-challenge-prod' },
      now: () => NOW,
    });
    await service.deleteAccount('u1');
    const query = ddb.calls.find((c) => c instanceof QueryCommand && c.input.TableName === 'memory-game-daily-challenge-prod');
    expect(query.input).toMatchObject({
      IndexName: 'user-index',
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': 'u1' },
    });
    const batches = ddb.calls.filter((c) => c instanceof BatchWriteCommand).map((c) => c.input.RequestItems);
    expect(batches).toContainEqual({
      'memory-game-daily-challenge-prod': [
        { DeleteRequest: { Key: { pk: '2026-11-25', sk: 'SCORE#u1' } } },
        { DeleteRequest: { Key: { pk: '2026-11-26', sk: 'SCORE#u1' } } },
      ],
    });
  });

  it('requires a user id', async () => {
    const { service } = setup();
    await expect(service.deleteAccount('')).rejects.toThrow('userId is required');
  });
});
