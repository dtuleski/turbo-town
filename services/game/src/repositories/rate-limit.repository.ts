import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { SubscriptionTier } from '@memory-game/shared';
import { RateLimit, RateLimitRepository as IRateLimitRepository } from '../types';
import { mapDynamoDBError } from '../utils/error-mapper';

const dynamoDBClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.RATE_LIMITS_TABLE_NAME!;

export class RateLimitRepository implements IRateLimitRepository {
  /**
   * Get rate limit for user
   */
  async get(userId: string): Promise<RateLimit | null> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { userId },
        })
      );

      return result.Item ? (result.Item as RateLimit) : null;
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Create or update rate limit
   */
  async upsert(rateLimit: RateLimit): Promise<RateLimit> {
    const now = new Date();
    const nowISO = now.toISOString();
    const dbItem = {
      userId: rateLimit.userId,
      tier: rateLimit.tier,
      count: rateLimit.count,
      resetAt: rateLimit.resetAt instanceof Date ? rateLimit.resetAt.toISOString() : rateLimit.resetAt,
      updatedAt: nowISO,
      expiresAt: Math.floor((rateLimit.resetAt instanceof Date ? rateLimit.resetAt : new Date(rateLimit.resetAt)).getTime() / 1000),
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: dbItem,
        })
      );

      return {
        userId: rateLimit.userId,
        tier: rateLimit.tier,
        count: rateLimit.count,
        resetAt: rateLimit.resetAt instanceof Date ? rateLimit.resetAt : new Date(rateLimit.resetAt),
        expiresAt: Math.floor((rateLimit.resetAt instanceof Date ? rateLimit.resetAt : new Date(rateLimit.resetAt)).getTime() / 1000),
        updatedAt: now,
      };
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Increment usage count
   */
  async increment(userId: string): Promise<RateLimit> {
    const now = new Date().toISOString();

    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { userId },
          UpdateExpression: 'SET #count = #count + :inc, #updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#count': 'count',
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: {
            ':inc': 1,
            ':updatedAt': now,
          },
          ReturnValues: 'ALL_NEW',
        })
      );

      return result.Attributes as RateLimit;
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Reset rate limit (called at midnight UTC)
   */
  async reset(userId: string, tier: SubscriptionTier): Promise<RateLimit> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    // TTL: 48 hours from now (for cleanup)
    const expiresAt = Math.floor(Date.now() / 1000) + 48 * 60 * 60;

    const rateLimit: RateLimit = {
      userId,
      tier,
      count: 0,
      resetAt: tomorrow.toISOString() as any,
      expiresAt,
      updatedAt: now.toISOString() as any,
    };

    return this.upsert(rateLimit);
  }
}
