// tests/setup.ts auto-mocks the SDK; this suite uses aws-sdk-client-mock on the real clients.
jest.unmock("@aws-sdk/lib-dynamodb");
jest.unmock("@aws-sdk/client-dynamodb");
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SubscriptionTier } from '@memory-game/shared';
import { SubscriptionRepository } from '../../../src/repositories/subscription.repository';
import { PlanEvent } from '../../../src/services/entitlement';

const ddb = mockClient(DynamoDBDocumentClient);

const baseEvent: PlanEvent = {
  userId: 'u1',
  source: 'apple',
  tier: SubscriptionTier.Standard,
  status: 'ACTIVE',
  expiresAt: new Date(Date.now() + 30 * 86400000),
  externalId: 'otx_1',
  eventAt: new Date(),
  eventId: 'n1',
};

function conditionalFailure() {
  const e = new Error('The conditional request failed');
  e.name = 'ConditionalCheckFailedException';
  return e;
}

describe('SubscriptionRepository.applyEvent', () => {
  beforeEach(() => ddb.reset());

  it('creates a new record only if none exists', async () => {
    ddb.on(GetCommand).resolves({});
    ddb.on(PutCommand).resolves({});
    const result = await new SubscriptionRepository().applyEvent(baseEvent);
    expect(result.changed).toBe(true);
    const put = ddb.commandCalls(PutCommand)[0].args[0].input;
    expect(put.ConditionExpression).toBe('attribute_not_exists(userId)');
    expect(put.Item!.sources.apple.tier).toBe(SubscriptionTier.Standard);
  });

  it('locks on version for new-format records', async () => {
    ddb.on(GetCommand).resolves({ Item: { userId: 'u1', version: 4, sources: {} } });
    ddb.on(PutCommand).resolves({});
    await new SubscriptionRepository().applyEvent(baseEvent);
    const put = ddb.commandCalls(PutCommand)[0].args[0].input;
    expect(put.ConditionExpression).toBe('#v = :v');
    expect(put.ExpressionAttributeValues).toEqual({ ':v': 4 });
    expect(put.Item!.version).toBe(5);
  });

  it('locks on updatedAt for legacy records', async () => {
    ddb.on(GetCommand).resolves({ Item: { userId: 'u1', tier: 'LIGHT', status: 'ACTIVE', updatedAt: '2026-07-01T00:00:00Z' } });
    ddb.on(PutCommand).resolves({});
    await new SubscriptionRepository().applyEvent(baseEvent);
    const put = ddb.commandCalls(PutCommand)[0].args[0].input;
    expect(put.ConditionExpression).toBe('attribute_not_exists(#v) AND #u = :u');
    // The legacy grant is kept as its own source next to the new Apple entry.
    expect(Object.keys(put.Item!.sources).sort()).toEqual(['apple', 'manual']);
  });

  it('re-reads and retries when another write won the race', async () => {
    ddb.on(GetCommand)
      .resolvesOnce({ Item: { userId: 'u1', version: 1, sources: {} } })
      .resolves({ Item: { userId: 'u1', version: 2, sources: {} } });
    ddb.on(PutCommand).rejectsOnce(conditionalFailure()).resolves({});
    const result = await new SubscriptionRepository().applyEvent(baseEvent);
    expect(result.changed).toBe(true);
    const puts = ddb.commandCalls(PutCommand);
    expect(puts).toHaveLength(2);
    expect(puts[1].args[0].input.ExpressionAttributeValues).toEqual({ ':v': 2 });
  });

  it('does not write a duplicate event', async () => {
    ddb.on(GetCommand).resolves({
      Item: {
        userId: 'u1',
        version: 1,
        sources: { apple: { tier: 'STANDARD', status: 'ACTIVE', lastEventAt: new Date().toISOString(), lastEventId: 'n1' } },
      },
    });
    const result = await new SubscriptionRepository().applyEvent(baseEvent);
    expect(result).toEqual({ changed: false, reason: 'duplicate' });
    expect(ddb.commandCalls(PutCommand)).toHaveLength(0);
  });
});
