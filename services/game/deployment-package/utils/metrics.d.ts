import { SubscriptionTier, AchievementType } from '@memory-game/shared';
/**
 * Publish custom metrics to CloudWatch
 */
export declare class MetricsPublisher {
    /**
     * Publish GamesStarted metric
     */
    publishGameStarted(difficulty: number, tier: SubscriptionTier): Promise<void>;
    /**
     * Publish GamesCompleted metric
     */
    publishGameCompleted(difficulty: number, tier: SubscriptionTier, score: number): Promise<void>;
    /**
     * Publish RateLimitExceeded metric
     */
    publishRateLimitExceeded(tier: SubscriptionTier): Promise<void>;
    /**
     * Publish AchievementUnlocked metric
     */
    publishAchievementUnlocked(type: AchievementType): Promise<void>;
}
export declare const metricsPublisher: MetricsPublisher;
//# sourceMappingURL=metrics.d.ts.map