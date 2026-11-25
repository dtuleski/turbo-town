import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SubscriptionTier } from '@memory-game/shared';
import { Subscription, SubscriptionRepository as ISubscriptionRepository } from '../types';
import { mapDynamoDBError } from '../utils/error-mapper';
import { logger } from '../utils/logger';
import {
  ApplyResult,
  EffectivePlan,
  PlanEvent,
  PlanRecord,
  applyPlanEvent,
  effectivePlan,
} from '../services/entitlement';

const dynamoDBClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.SUBSCRIPTIONS_TABLE_NAME!;
const STRIPE_CUSTOMER_INDEX = 'StripeCustomerIndex';
const MAX_WRITE_ATTEMPTS = 3;

/**
 * Subscription (plan) repository.
 *
 * Every plan change goes through `applyEvent`, which applies the shared rules
 * in services/entitlement.ts and writes with an optimistic lock, so concurrent
 * events from different providers can't overwrite each other.
 */
export class SubscriptionRepository implements ISubscriptionRepository {
  async getRecord(userId: string): Promise<PlanRecord | null> {
    try {
      const result = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { userId } }));
      return (result.Item as PlanRecord) ?? null;
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /** Legacy shape, used by callers that read stripeCustomerId and friends. */
  async getByUserId(userId: string): Promise<Subscription | null> {
    return (await this.getRecord(userId)) as unknown as Subscription | null;
  }

  async getByStripeCustomerId(customerId: string): Promise<PlanRecord | null> {
    try {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: STRIPE_CUSTOMER_INDEX,
          KeyConditionExpression: 'stripeCustomerId = :c',
          ExpressionAttributeValues: { ':c': customerId },
          Limit: 2,
        })
      );
      const items = (result.Items as PlanRecord[] | undefined) ?? [];
      if (items.length > 1) {
        logger.warn('Stripe customer id maps to more than one user', { customerId });
      }
      return items[0] ?? null;
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  async getPlan(userId: string, now: Date = new Date()): Promise<EffectivePlan & { record: PlanRecord | null }> {
    const record = await this.getRecord(userId);
    return { ...effectivePlan(record, now), record };
  }

  /**
   * Tier used for every access check: the highest tier among the sources that
   * are active and not past expiry (plus a 1-day grace). FREE otherwise.
   */
  async getTier(userId: string): Promise<SubscriptionTier> {
    return (await this.getPlan(userId)).tier;
  }

  /**
   * The only way to change a plan. Reads the record, applies the event, and
   * writes only if nobody changed the record in between (retries otherwise).
   */
  async applyEvent(event: PlanEvent): Promise<ApplyResult> {
    for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
      const current = await this.getRecord(event.userId);
      const result = applyPlanEvent(current, event);
      if (!result.changed) {
        logger.info('Plan event ignored', {
          userId: event.userId,
          source: event.source,
          eventId: event.eventId,
          reason: result.reason,
        });
        return result;
      }
      try {
        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: result.record,
            ...this.lockFor(current),
          })
        );
        logger.info('Plan event applied', {
          userId: event.userId,
          source: event.source,
          eventId: event.eventId,
          status: event.status,
          tier: result.record.tier,
        });
        return result;
      } catch (error) {
        if ((error as Error).name === 'ConditionalCheckFailedException' && attempt < MAX_WRITE_ATTEMPTS) {
          logger.warn('Plan record changed during update, retrying', { userId: event.userId, attempt });
          continue;
        }
        throw mapDynamoDBError(error as Error);
      }
    }
    throw new Error('Unreachable');
  }

  private lockFor(current: PlanRecord | null): {
    ConditionExpression: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, unknown>;
  } {
    if (!current) {
      return { ConditionExpression: 'attribute_not_exists(userId)' };
    }
    if (current.version !== undefined) {
      return {
        ConditionExpression: '#v = :v',
        ExpressionAttributeNames: { '#v': 'version' },
        ExpressionAttributeValues: { ':v': current.version },
      };
    }
    // Legacy record without a version: lock on updatedAt.
    if (current.updatedAt === undefined) {
      return {
        ConditionExpression: 'attribute_not_exists(#v) AND attribute_not_exists(#u)',
        ExpressionAttributeNames: { '#v': 'version', '#u': 'updatedAt' },
      };
    }
    return {
      ConditionExpression: 'attribute_not_exists(#v) AND #u = :u',
      ExpressionAttributeNames: { '#v': 'version', '#u': 'updatedAt' },
      ExpressionAttributeValues: { ':u': current.updatedAt },
    };
  }
}
