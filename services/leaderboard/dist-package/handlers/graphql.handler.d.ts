/**
 * GraphQL Handler for Leaderboard Queries
 *
 * Handles GraphQL queries from AppSync:
 * - getLeaderboard: Query leaderboard rankings
 * - getUserRank: Get user's current rank
 * - getUserScoreHistory: Get user's score history
 *
 * Implements authentication and rate limiting middleware.
 */
import { LeaderboardService } from '../services/leaderboard.service';
import { RateLimiter } from '../utils/ratelimit.util';
export interface AppSyncEvent {
    info: {
        fieldName: string;
        parentTypeName: string;
    };
    arguments: Record<string, any>;
    request: {
        headers: Record<string, string>;
    };
    identity?: {
        sub: string;
        username?: string;
    };
}
export interface AppSyncResult {
    statusCode: number;
    body?: any;
    headers?: Record<string, string>;
}
export interface GraphQLError {
    message: string;
    extensions: {
        code: string;
        statusCode: number;
        [key: string]: any;
    };
}
export declare class GraphQLHandler {
    private leaderboardService;
    private rateLimiter;
    private userPoolId;
    private region;
    constructor(leaderboardService?: LeaderboardService, rateLimiter?: RateLimiter);
    /**
     * Main handler for GraphQL queries
     */
    handleQuery(event: AppSyncEvent): Promise<any>;
    /**
     * Resolver for getLeaderboard query
     */
    private getLeaderboardResolver;
    /**
     * Resolver for getUserRank query
     */
    private getUserRankResolver;
    /**
     * Resolver for getUserScoreHistory query
     */
    private getUserScoreHistoryResolver;
    /**
     * Resolver for clearAllRecords mutation (admin only)
     */
    private clearAllRecordsResolver;
    /**
     * Validate game type
     */
    private validateGameType;
    /**
     * Validate timeframe
     */
    private validateTimeframe;
    /**
     * Create a GraphQL error
     */
    private createError;
}
/**
 * Lambda handler function for AppSync
 */
export declare const handler: (event: AppSyncEvent) => Promise<any>;
//# sourceMappingURL=graphql.handler.d.ts.map