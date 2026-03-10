"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsPublisher = exports.MetricsPublisher = void 0;
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const logger_1 = require("./logger");
const cloudwatch = new client_cloudwatch_1.CloudWatchClient({});
const NAMESPACE = 'MemoryGame/GameService';
/**
 * Publish custom metrics to CloudWatch
 */
class MetricsPublisher {
    /**
     * Publish GamesStarted metric
     */
    async publishGameStarted(difficulty, tier) {
        try {
            await cloudwatch.send(new client_cloudwatch_1.PutMetricDataCommand({
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
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to publish GamesStarted metric', error);
        }
    }
    /**
     * Publish GamesCompleted metric
     */
    async publishGameCompleted(difficulty, tier, score) {
        try {
            await cloudwatch.send(new client_cloudwatch_1.PutMetricDataCommand({
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
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to publish GamesCompleted metric', error);
        }
    }
    /**
     * Publish RateLimitExceeded metric
     */
    async publishRateLimitExceeded(tier) {
        try {
            await cloudwatch.send(new client_cloudwatch_1.PutMetricDataCommand({
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
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to publish RateLimitExceeded metric', error);
        }
    }
    /**
     * Publish AchievementUnlocked metric
     */
    async publishAchievementUnlocked(type) {
        try {
            await cloudwatch.send(new client_cloudwatch_1.PutMetricDataCommand({
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
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to publish AchievementUnlocked metric', error);
        }
    }
}
exports.MetricsPublisher = MetricsPublisher;
// Singleton instance
exports.metricsPublisher = new MetricsPublisher();
//# sourceMappingURL=metrics.js.map