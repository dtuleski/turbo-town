/**
 * Event Handler for EventBridge GameCompleted Events
 *
 * Main entry point for processing game completion events.
 * Orchestrates score calculation, anomaly detection, and leaderboard updates.
 */
import { EventBridgeEvent } from 'aws-lambda';
import { ScoringService } from '../services/scoring.service';
import { AnomalyService } from '../services/anomaly.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { GameType, Difficulty, PerformanceMetrics } from '../types';
export interface GameCompletedDetail {
    gameId: string;
    userId: string;
    username: string;
    gameType: GameType;
    difficulty: Difficulty;
    score: number;
    completionTime: number;
    accuracy: number;
    performanceMetrics: PerformanceMetrics;
    timestamp: string;
}
export declare class EventHandler {
    private scoringService;
    private anomalyService;
    private leaderboardService;
    private cloudWatchClient;
    constructor(scoringService?: ScoringService, anomalyService?: AnomalyService, leaderboardService?: LeaderboardService);
    /**
     * Main handler for GameCompleted events
     */
    handleGameCompletedEvent(event: EventBridgeEvent<'GameCompleted', GameCompletedDetail>): Promise<void>;
    /**
     * Validate event structure and required fields
     */
    private validateEvent;
    /**
     * Execute function with exponential backoff retry
     */
    private withRetry;
    /**
     * Emit CloudWatch metric
     */
    private emitMetric;
    /**
     * Extract date in YYYY-MM-DD format
     */
    private extractDate;
    /**
     * Extract week in YYYY-Www format (ISO week)
     */
    private extractWeek;
    /**
     * Extract month in YYYY-MM format
     */
    private extractMonth;
    /**
     * Get ISO week number
     */
    private getISOWeek;
}
/**
 * Lambda handler function
 */
export declare const handler: (event: EventBridgeEvent<"GameCompleted", GameCompletedDetail>) => Promise<void>;
//# sourceMappingURL=event.handler.d.ts.map