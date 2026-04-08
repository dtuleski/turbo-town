/**
 * Leaderboard Service
 *
 * Business logic for leaderboard management, including:
 * - Retrieving leaderboard rankings
 * - Calculating user ranks and percentiles
 * - Managing leaderboard entries and user aggregates
 */
import { LeaderboardRepository } from '../repositories/leaderboard.repository';
import { AggregateRepository } from '../repositories/aggregate.repository';
import { GameType, Timeframe, LeaderboardResponse, UserRankResponse, LeaderboardEntry, CreateLeaderboardEntryInput, UpdateAggregateInput } from '../types';
export declare class LeaderboardService {
    private leaderboardRepo;
    private aggregateRepo;
    constructor(leaderboardRepo?: LeaderboardRepository, aggregateRepo?: AggregateRepository);
    /**
     * Get leaderboard with rankings for a specific game type and timeframe
     */
    getLeaderboard(gameType: GameType, timeframe: Timeframe, userId?: string, limit?: number): Promise<LeaderboardResponse>;
    /**
     * Get OVERALL leaderboard for time-based queries (DAILY, WEEKLY, MONTHLY)
     * Aggregates best scores across all game types for each user in the time period
     */
    private getOverallTimeBasedLeaderboard;
    /**
     * Get user's rank for a specific game type and timeframe
     */
    getUserRank(userId: string, gameType: GameType, timeframe: Timeframe): Promise<UserRankResponse | null>;
    /**
     * Get user's score history
     */
    getUserScoreHistory(userId: string, gameType?: GameType, limit?: number): Promise<LeaderboardEntry[]>;
    /**
     * Create a new leaderboard entry
     */
    createLeaderboardEntry(input: CreateLeaderboardEntryInput): Promise<LeaderboardEntry>;
    /**
     * Update user aggregate with new score
     */
    updateUserAggregate(input: UpdateAggregateInput): Promise<void>;
    /**
     * Clear all leaderboard records (admin only)
     */
    clearAllRecords(): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Calculate ranks for leaderboard entries
     * Entries with the same score get the same rank
     */
    private calculateRanks;
}
//# sourceMappingURL=leaderboard.service.d.ts.map