/**
 * Aggregate Repository
 *
 * Handles DynamoDB operations for the UserAggregates table.
 */
import { UserAggregate, UpdateAggregateInput, GameType } from '../types';
export declare class AggregateRepository {
    private client;
    private tableName;
    constructor(tableName?: string);
    /**
     * Get user aggregate for a specific game type
     */
    getAggregate(userId: string, gameType: GameType): Promise<UserAggregate | null>;
    /**
     * Get top aggregates for leaderboard (sorted by best score)
     */
    getTopAggregates(gameType: GameType, limit?: number): Promise<UserAggregate[]>;
    /**
     * Update user aggregate with new score
     */
    updateAggregate(input: UpdateAggregateInput): Promise<UserAggregate>;
    /**
     * Get ISO week string (YYYY-Www format)
     */
    private getISOWeek;
}
//# sourceMappingURL=aggregate.repository.d.ts.map