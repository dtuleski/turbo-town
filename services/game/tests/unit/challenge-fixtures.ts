/**
 * DC2 - in-memory fake of the daily-challenge table for the challenge suites. It understands exactly
 * the commands ChallengeRepository sends (Get, conditional Put, Query on rank-index incl. COUNT), so
 * the real repository and service run on top of it. Suites using it must
 * `jest.unmock('@aws-sdk/lib-dynamodb')` to get real command objects with `.input`.
 */
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ChallengeRepository } from '../../src/repositories/challenge.repository';
import { ChallengeService } from '../../src/services/challenge.service';

export const TABLE = 'memory-game-daily-challenge-test';

type Item = Record<string, any>;

function conditionFailed(): Error {
  return Object.assign(new Error('The conditional request failed'), { name: 'ConditionalCheckFailedException' });
}

export function memoryTable(opts: { pageSize?: number } = {}) {
  const items = new Map<string, Item>();
  const key = (pk: string, sk: string) => `${pk}|${sk}`;
  const calls: any[] = [];
  const failNext: { error?: Error } = {};

  const send = jest.fn(async (cmd: any) => {
    calls.push(cmd);
    if (failNext.error) {
      const e = failNext.error;
      failNext.error = undefined;
      throw e;
    }
    const input = cmd.input;
    if (cmd instanceof GetCommand) {
      const item = items.get(key(input.Key.pk, input.Key.sk));
      return item ? { Item: structuredClone(item) } : {};
    }
    if (cmd instanceof PutCommand) {
      const k = key(input.Item.pk, input.Item.sk);
      const existing = items.get(k);
      if (input.ConditionExpression === 'attribute_not_exists(pk)' && existing) throw conditionFailed();
      if (input.ConditionExpression === 'attribute_not_exists(bestScore) OR bestScore < :s') {
        if (existing && existing.bestScore !== undefined && !(existing.bestScore < input.ExpressionAttributeValues[':s'])) {
          throw conditionFailed();
        }
      }
      items.set(k, structuredClone(input.Item));
      return {};
    }
    if (cmd instanceof QueryCommand && input.IndexName === 'rank-index') {
      const d = input.ExpressionAttributeValues[':d'];
      const k = input.ExpressionAttributeValues[':k'];
      const all = [...items.values()]
        .filter((i) => i.rankPk === d && (k === undefined || i.rankKey < k))
        .sort((a, b) => (a.rankKey < b.rankKey ? -1 : a.rankKey > b.rankKey ? 1 : 0));
      if (input.Select === 'COUNT') {
        // Paginate COUNT like DynamoDB does for large partitions.
        const size = opts.pageSize ?? all.length;
        const offset = input.ExclusiveStartKey ? input.ExclusiveStartKey.offset : 0;
        const count = Math.min(size, all.length - offset);
        const next = offset + count;
        return { Count: count, ...(next < all.length ? { LastEvaluatedKey: { offset: next } } : {}) };
      }
      return { Items: all.slice(0, input.Limit ?? all.length).map((i) => structuredClone(i)) };
    }
    throw new Error(`memoryTable: unexpected command ${cmd?.constructor?.name}`);
  });

  return { items, calls, send, failNext, get: (pk: string, sk: string) => items.get(key(pk, sk)) };
}

/** Real service over the fake table, with a settable clock. */
export function challengeRig(startIso = '2026-11-26T17:00:00.000Z', opts: { pageSize?: number } = {}) {
  const table = memoryTable(opts);
  const clock = { now: new Date(startIso) };
  const repo = new ChallengeRepository({ send: table.send }, TABLE);
  const service = new ChallengeService(repo, () => clock.now);
  return { table, clock, repo, service };
}
