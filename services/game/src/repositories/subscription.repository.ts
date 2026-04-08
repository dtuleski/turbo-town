import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
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

  /**
   * Update subscription (for Stripe integration)
   */
  async updateSubscription(data: {
    userId: string;
    tier?: SubscriptionTier;
    status?: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  }): Promise<void> {
    try {
      const now = new Date();
      
      // Get existing subscription
      const existing = await this.getByUserId(data.userId);
      
      const subscription = {
        userId: data.userId,
        tier: data.tier || existing?.tier || SubscriptionTier.Free,
        status: data.status || existing?.status || 'ACTIVE',
        stripeCustomerId: data.stripeCustomerId || existing?.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId || existing?.stripeSubscriptionId,
        currentPeriodStart: data.currentPeriodStart ? data.currentPeriodStart.toISOString() : existing?.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd ? data.currentPeriodEnd.toISOString() : existing?.currentPeriodEnd,
        startDate: existing?.startDate || now.toISOString(),
        createdAt: existing?.createdAt || now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: subscription,
        })
      );
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }
}
