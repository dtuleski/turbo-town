"use strict";
/**
 * Event Handler for EventBridge GameCompleted Events
 *
 * Main entry point for processing game completion events.
 * Orchestrates score calculation, anomaly detection, and leaderboard updates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.EventHandler = void 0;
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const scoring_service_1 = require("../services/scoring.service");
const anomaly_service_1 = require("../services/anomaly.service");
const leaderboard_service_1 = require("../services/leaderboard.service");
const types_1 = require("../types");
// Retry configuration
const RETRY_CONFIG = {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
};
class EventHandler {
    constructor(scoringService, anomalyService, leaderboardService) {
        this.scoringService = scoringService || new scoring_service_1.ScoringService();
        this.anomalyService = anomalyService || new anomaly_service_1.AnomalyService();
        this.leaderboardService = leaderboardService || new leaderboard_service_1.LeaderboardService();
        this.cloudWatchClient = new client_cloudwatch_1.CloudWatchClient({});
    }
    /**
     * Main handler for GameCompleted events
     */
    async handleGameCompletedEvent(event) {
        const startTime = Date.now();
        const detail = event.detail;
        try {
            console.log('Processing GameCompleted event:', {
                gameId: detail.gameId,
                userId: detail.userId,
                gameType: detail.gameType,
            });
            // Step 1: Validate event
            this.validateEvent(detail);
            // Step 2: Use score from game service (single source of truth)
            const finalScore = detail.score;
            const accuracy = detail.accuracy;
            console.log('Using score from game service:', {
                gameId: detail.gameId,
                finalScore: finalScore,
            });
            // Step 3: Validate score
            const validation = this.scoringService.validateScore(detail.gameType, finalScore, detail.completionTime, accuracy);
            if (!validation.valid) {
                throw new Error(`Score validation failed: ${validation.errors.join(', ')}`);
            }
            // Step 4: Detect anomalies
            const gameStats = await this.anomalyService.getGameStatistics(detail.gameType, detail.difficulty);
            const leaderboardEntry = {
                gameType: detail.gameType,
                scoreTimestamp: `SCORE#${finalScore}#TIMESTAMP#${detail.timestamp}`,
                userId: detail.userId,
                username: detail.username,
                score: finalScore,
                gameId: detail.gameId,
                difficulty: detail.difficulty,
                completionTime: detail.completionTime,
                accuracy: accuracy,
                timestamp: detail.timestamp,
                date: this.extractDate(detail.timestamp),
                week: this.extractWeek(detail.timestamp),
                month: this.extractMonth(detail.timestamp),
                metadata: detail.performanceMetrics,
            };
            const anomalyFlags = await this.anomalyService.detectAnomalies(leaderboardEntry, gameStats || undefined);
            if (anomalyFlags.isSuspicious) {
                console.warn('Anomaly detected:', {
                    gameId: detail.gameId,
                    userId: detail.userId,
                    reasons: anomalyFlags.reasons,
                });
                // Emit anomaly metric
                await this.emitMetric('AnomalyDetected', 1, detail.gameType);
            }
            // Step 5: Create leaderboard entry with retry
            await this.withRetry(async () => {
                await this.leaderboardService.createLeaderboardEntry({
                    gameId: detail.gameId,
                    userId: detail.userId,
                    username: detail.username,
                    gameType: detail.gameType,
                    score: finalScore,
                    difficulty: detail.difficulty,
                    completionTime: detail.completionTime,
                    accuracy: accuracy,
                    timestamp: detail.timestamp,
                    metadata: detail.performanceMetrics,
                    suspicious: anomalyFlags.isSuspicious,
                });
            });
            console.log('Leaderboard entry created:', {
                gameId: detail.gameId,
                score: finalScore,
            });
            // Step 6: Update user aggregates with retry
            await this.withRetry(async () => {
                await this.leaderboardService.updateUserAggregate({
                    userId: detail.userId,
                    gameType: detail.gameType,
                    username: detail.username,
                    score: finalScore,
                    timestamp: detail.timestamp,
                });
            });
            console.log('User aggregate updated:', {
                userId: detail.userId,
                gameType: detail.gameType,
            });
            // Step 7: Emit success metrics
            const latency = Date.now() - startTime;
            await this.emitMetric('LeaderboardEventProcessed', 1, detail.gameType);
            await this.emitMetric('LeaderboardEventLatency', latency, detail.gameType);
            console.log('Event processed successfully:', {
                gameId: detail.gameId,
                latency: `${latency}ms`,
            });
        }
        catch (error) {
            // Emit error metric
            await this.emitMetric('LeaderboardEventError', 1, detail.gameType);
            console.error('Error processing GameCompleted event:', {
                gameId: detail.gameId,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            // Re-throw to trigger retry or DLQ
            throw error;
        }
    }
    /**
     * Validate event structure and required fields
     */
    validateEvent(detail) {
        const errors = [];
        if (!detail.gameId) {
            errors.push('gameId is required');
        }
        if (!detail.userId) {
            errors.push('userId is required');
        }
        if (!detail.username) {
            errors.push('username is required');
        }
        if (!detail.gameType) {
            errors.push('gameType is required');
        }
        if (!Object.values(types_1.GameType).includes(detail.gameType)) {
            errors.push(`Invalid gameType: ${detail.gameType}`);
        }
        if (!detail.difficulty) {
            errors.push('difficulty is required');
        }
        if (typeof detail.score !== 'number' || detail.score < 0) {
            errors.push('score must be a non-negative number');
        }
        if (typeof detail.completionTime !== 'number' || detail.completionTime <= 0) {
            errors.push('completionTime must be a positive number');
        }
        if (typeof detail.accuracy !== 'number' || detail.accuracy < 0 || detail.accuracy > 1) {
            errors.push('accuracy must be a number between 0 and 1');
        }
        if (!detail.timestamp) {
            errors.push('timestamp is required');
        }
        if (!detail.performanceMetrics) {
            errors.push('performanceMetrics is required');
        }
        if (errors.length > 0) {
            throw new Error(`Event validation failed: ${errors.join(', ')}`);
        }
    }
    /**
     * Execute function with exponential backoff retry
     */
    async withRetry(fn, attempt = 1) {
        try {
            return await fn();
        }
        catch (error) {
            if (attempt >= RETRY_CONFIG.maxAttempts) {
                console.error(`Max retry attempts (${RETRY_CONFIG.maxAttempts}) reached`);
                throw error;
            }
            // Calculate delay with exponential backoff
            const delay = Math.min(RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1), RETRY_CONFIG.maxDelay);
            console.warn(`Retry attempt ${attempt} after ${delay}ms:`, {
                error: error instanceof Error ? error.message : String(error),
            });
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay));
            // Retry
            return this.withRetry(fn, attempt + 1);
        }
    }
    /**
     * Emit CloudWatch metric
     */
    async emitMetric(metricName, value, gameType) {
        try {
            await this.cloudWatchClient.send(new client_cloudwatch_1.PutMetricDataCommand({
                Namespace: 'LeaderboardService',
                MetricData: [
                    {
                        MetricName: metricName,
                        Value: value,
                        Unit: metricName.includes('Latency') ? 'Milliseconds' : 'Count',
                        Timestamp: new Date(),
                        Dimensions: [
                            {
                                Name: 'GameType',
                                Value: gameType,
                            },
                        ],
                    },
                ],
            }));
        }
        catch (error) {
            // Log but don't fail on metric emission errors
            console.error('Failed to emit CloudWatch metric:', {
                metricName,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * Extract date in YYYY-MM-DD format
     */
    extractDate(timestamp) {
        return timestamp.split('T')[0];
    }
    /**
     * Extract week in YYYY-Www format (ISO week)
     */
    extractWeek(timestamp) {
        const date = new Date(timestamp);
        const year = date.getUTCFullYear();
        const week = this.getISOWeek(date);
        return `${year}-W${String(week).padStart(2, '0')}`;
    }
    /**
     * Extract month in YYYY-MM format
     */
    extractMonth(timestamp) {
        return timestamp.substring(0, 7); // YYYY-MM
    }
    /**
     * Get ISO week number
     */
    getISOWeek(date) {
        const target = new Date(date.valueOf());
        const dayNumber = (date.getUTCDay() + 6) % 7;
        target.setUTCDate(target.getUTCDate() - dayNumber + 3);
        const firstThursday = target.valueOf();
        target.setUTCMonth(0, 1);
        if (target.getUTCDay() !== 4) {
            target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
        }
        return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    }
}
exports.EventHandler = EventHandler;
/**
 * Lambda handler function
 */
const handler = async (event) => {
    const eventHandler = new EventHandler();
    await eventHandler.handleGameCompletedEvent(event);
};
exports.handler = handler;
//# sourceMappingURL=event.handler.js.map