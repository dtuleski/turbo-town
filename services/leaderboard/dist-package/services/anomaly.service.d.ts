/**
 * Anomaly Detection Service
 *
 * Detects suspicious scoring patterns to prevent cheating:
 * - Statistical outlier detection (z-score > 3)
 * - Velocity detection (too many games too quickly)
 * - Pattern detection (repeated identical scores)
 */
import { GameType, Difficulty, LeaderboardEntry } from '../types';
export interface AnomalyFlags {
    isStatisticalOutlier: boolean;
    isVelocityAnomaly: boolean;
    isPatternAnomaly: boolean;
    isSuspicious: boolean;
    reasons: string[];
}
export interface GameStatistics {
    gameType: GameType;
    difficulty: Difficulty;
    mean: number;
    stdDev: number;
    sampleSize: number;
    lastUpdated: string;
}
export interface VelocityCheck {
    gamesInLastMinute: number;
    gamesInLastDay: number;
    isExcessive: boolean;
}
export declare class AnomalyService {
    private docClient;
    private statisticsTableName;
    private leaderboardTableName;
    private readonly MAX_GAMES_PER_MINUTE;
    private readonly MAX_GAMES_PER_DAY;
    private readonly Z_SCORE_THRESHOLD;
    private readonly IDENTICAL_SCORE_THRESHOLD;
    private readonly TIME_CONSISTENCY_THRESHOLD;
    constructor(statisticsTableName?: string, leaderboardTableName?: string);
    /**
     * Detect anomalies in a leaderboard entry
     */
    detectAnomalies(entry: LeaderboardEntry, gameStats?: GameStatistics): Promise<AnomalyFlags>;
    /**
     * Check if score is a statistical outlier using z-score
     */
    private isStatisticalOutlier;
    /**
     * Check velocity: detect users completing games too quickly
     */
    private checkVelocity;
    /**
     * Check for suspicious patterns: repeated identical scores or consistent times
     */
    private checkPatterns;
    /**
     * Get game statistics for outlier detection
     */
    getGameStatistics(gameType: GameType, difficulty: Difficulty): Promise<GameStatistics | null>;
    /**
     * Update game statistics (batch job)
     * Calculates mean and standard deviation for each game type and difficulty
     */
    updateGameStatistics(gameType: GameType): Promise<void>;
    /**
     * Get valid difficulties for a game type
     */
    private getDifficultiesForGameType;
}
//# sourceMappingURL=anomaly.service.d.ts.map