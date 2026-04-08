/**
 * Event Handler for EventBridge GameCompleted Events
 * 
 * Main entry point for processing game completion events.
 * Orchestrates score calculation, anomaly detection, and leaderboard updates.
 */

import { EventBridgeEvent } from 'aws-lambda';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { ScoringService } from '../services/scoring.service';
import { AnomalyService } from '../services/anomaly.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { GameType, Difficulty, PerformanceMetrics } from '../types';

// EventBridge event detail structure
export interface GameCompletedDetail {
  gameId: string;
  userId: string;
  username: string;
  gameType: GameType;
  difficulty: Difficulty;
  score: number; // Score calculated by game service
  completionTime: number;
  accuracy: number;
  performanceMetrics: PerformanceMetrics;
  timestamp: string;
}

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  backoffMultiplier: 2,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

export class EventHandler {
  private scoringService: ScoringService;
  private anomalyService: AnomalyService;
  private leaderboardService: LeaderboardService;
  private cloudWatchClient: CloudWatchClient;

  constructor(
    scoringService?: ScoringService,
    anomalyService?: AnomalyService,
    leaderboardService?: LeaderboardService
  ) {
    this.scoringService = scoringService || new ScoringService();
    this.anomalyService = anomalyService || new AnomalyService();
    this.leaderboardService = leaderboardService || new LeaderboardService();
    this.cloudWatchClient = new CloudWatchClient({});
  }

  /**
   * Main handler for GameCompleted events
   */
  async handleGameCompletedEvent(
    event: EventBridgeEvent<'GameCompleted', GameCompletedDetail>
  ): Promise<void> {
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
      const validation = this.scoringService.validateScore(
        detail.gameType,
        finalScore,
        detail.completionTime,
        accuracy
      );

      if (!validation.valid) {
        throw new Error(`Score validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 4: Detect anomalies
      const gameStats = await this.anomalyService.getGameStatistics(
        detail.gameType,
        detail.difficulty
      );

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

      const anomalyFlags = await this.anomalyService.detectAnomalies(
        leaderboardEntry,
        gameStats || undefined
      );

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
    } catch (error) {
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
  private validateEvent(detail: GameCompletedDetail): void {
    const errors: string[] = [];

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
    if (!Object.values(GameType).includes(detail.gameType)) {
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
  private async withRetry<T>(
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= RETRY_CONFIG.maxAttempts) {
        console.error(`Max retry attempts (${RETRY_CONFIG.maxAttempts}) reached`);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
        RETRY_CONFIG.maxDelay
      );

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
  private async emitMetric(
    metricName: string,
    value: number,
    gameType: GameType
  ): Promise<void> {
    try {
      await this.cloudWatchClient.send(
        new PutMetricDataCommand({
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
        })
      );
    } catch (error) {
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
  private extractDate(timestamp: string): string {
    return timestamp.split('T')[0];
  }

  /**
   * Extract week in YYYY-Www format (ISO week)
   */
  private extractWeek(timestamp: string): string {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const week = this.getISOWeek(date);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  /**
   * Extract month in YYYY-MM format
   */
  private extractMonth(timestamp: string): string {
    return timestamp.substring(0, 7); // YYYY-MM
  }

  /**
   * Get ISO week number
   */
  private getISOWeek(date: Date): number {
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

/**
 * Lambda handler function
 */
export const handler = async (
  event: EventBridgeEvent<'GameCompleted', GameCompletedDetail>
): Promise<void> => {
  const eventHandler = new EventHandler();
  await eventHandler.handleGameCompletedEvent(event);
};
