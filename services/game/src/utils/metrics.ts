import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { SubscriptionTier, AchievementType } from '@memory-game/shared';
import { logger } from './logger';

const cloudwatch = new CloudWatchClient({});
const NAMESPACE = 'MemoryGame/GameService';

/**
 * Publish custom metrics to CloudWatch
 */
export class MetricsPublisher {
  /**
   * Publish GamesStarted metric
   */
  async publishGameStarted(difficulty: number, tier: SubscriptionTier): Promise<void> {
    try {
      await cloudwatch.send(
        new PutMetricDataCommand({
          Namespace: NAMESPACE,
          MetricData: [
            {
              MetricName: 'GamesStarted',
              Value: 1,
              Unit: 'Count',
              Timestamp: new Date(),
              Dimensions: [
                { Name: 'Difficulty', Value: difficulty.toString() },
                { Name: 'Tier', Value: tier },
              ],
            },
          ],
        })
      );
    } catch (error) {
      logger.error('Failed to publish GamesStarted metric', error as Error);
    }
  }

  /**
   * Publish GamesCompleted metric
   */
  async publishGameCompleted(
    difficulty: number,
    tier: SubscriptionTier,
    score: number
  ): Promise<void> {
    try {
      await cloudwatch.send(
        new PutMetricDataCommand({
          Namespace: NAMESPACE,
          MetricData: [
            {
              MetricName: 'GamesCompleted',
              Value: 1,
              Unit: 'Count',
              Timestamp: new Date(),
              Dimensions: [
                { Name: 'Difficulty', Value: difficulty.toString() },
                { Name: 'Tier', Value: tier },
              ],
            },
            {
              MetricName: 'GameScore',
              Value: score,
              Unit: 'None',
              Timestamp: new Date(),
              Dimensions: [{ Name: 'Difficulty', Value: difficulty.toString() }],
            },
          ],
        })
      );
    } catch (error) {
      logger.error('Failed to publish GamesCompleted metric', error as Error);
    }
  }

  /**
   * Publish RateLimitExceeded metric
   */
  async publishRateLimitExceeded(tier: SubscriptionTier): Promise<void> {
    try {
      await cloudwatch.send(
        new PutMetricDataCommand({
          Namespace: NAMESPACE,
          MetricData: [
            {
              MetricName: 'RateLimitExceeded',
              Value: 1,
              Unit: 'Count',
              Timestamp: new Date(),
              Dimensions: [{ Name: 'Tier', Value: tier }],
            },
          ],
        })
      );
    } catch (error) {
      logger.error('Failed to publish RateLimitExceeded metric', error as Error);
    }
  }

  /**
   * Publish AchievementUnlocked metric
   */
  async publishAchievementUnlocked(type: AchievementType): Promise<void> {
    try {
      await cloudwatch.send(
        new PutMetricDataCommand({
          Namespace: NAMESPACE,
          MetricData: [
            {
              MetricName: 'AchievementUnlocked',
              Value: 1,
              Unit: 'Count',
              Timestamp: new Date(),
              Dimensions: [{ Name: 'Type', Value: type }],
            },
          ],
        })
      );
    } catch (error) {
      logger.error('Failed to publish AchievementUnlocked metric', error as Error);
    }
  }
}

// Singleton instance
export const metricsPublisher = new MetricsPublisher();
