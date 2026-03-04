import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SubscriptionTier } from '@memory-game/shared';
import { Subscription, SubscriptionRepository as ISubscriptionRepository } from '../types';
import { mapDynamoDBError } from '../utils/error-mapper';

const dynamoDBClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.SUBSCRIPTIONS_TABLE_NAME!;

/**
 * Subscription Repository (Read-Only)
 * Subscriptions are owned by Payment Service
 */
export class SubscriptionRepository implements ISubscriptionRepository {
  /**
   * Get subscription by user ID
   * No caching - need real-time tier validation
   */
  async getByUserId(userId: string): Promise<Subscription | null> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { userId },
        })
      );

      return result.Item ? (result.Item as Subscription) : null;
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Get subscription tier for user
   * Returns FREE if no subscription found
   */
  async getTier(userId: string): Promise<SubscriptionTier> {
    const subscription = await this.getByUserId(userId);

    if (!subscription || subscription.status !== 'ACTIVE') {
      return SubscriptionTier.Free;
    }

    return subscription.tier;
  }
}
