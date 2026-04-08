/**
 * Leaderboard Repository
 *
 * Handles DynamoDB operations for the LeaderboardEntries table.
 */
import { LeaderboardEntry, CreateLeaderboardEntryInput, QueryLeaderboardInput, GameType } from '../types';
export declare class LeaderboardRepository {
    private client;
    private tableName;
    constructor(tableName?: string);
    /**
     * Create a new leaderboard entry
     */
    createEntry(input: CreateLeaderboardEntryInput): Promise<LeaderboardEntry>;
    /**
     * Query leaderboard entries by game type and timeframe
     */
    queryByGameTypeAndTimeframe(input: QueryLeaderboardInput): Promise<LeaderboardEntry[]>;
    /**
     * Query user's score history
     */
    queryUserHistory(userId: string, gameType?: GameType, limit?: number): Promise<LeaderboardEntry[]>;
    /**
     * Get ISO week string (YYYY-Www format)
     */
    private getISOWeek;
    /**
     * Clear all leaderboard entries (admin only)
     */
    clearAllEntries(): Promise<void>;
}
//# sourceMappingURL=leaderboard.repository.d.ts.map