"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.GraphQLHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const leaderboard_service_1 = require("../services/leaderboard.service");
const ratelimit_util_1 = require("../utils/ratelimit.util");
const auth_util_1 = require("../utils/auth.util");
const types_1 = require("../types");
class GraphQLHandler {
    constructor(leaderboardService, rateLimiter) {
        this.leaderboardService = leaderboardService || new leaderboard_service_1.LeaderboardService();
        this.rateLimiter = rateLimiter || new ratelimit_util_1.RateLimiter(new client_dynamodb_1.DynamoDBClient({}));
        this.userPoolId = process.env.COGNITO_USER_POOL_ID || '';
        this.region = process.env.AWS_REGION || 'us-east-1';
    }
    /**
     * Main handler for GraphQL queries
     */
    async handleQuery(event) {
        try {
            console.log('Processing GraphQL query:', {
                fieldName: event.info.fieldName,
                arguments: event.arguments,
            });
            // Step 1: Authenticate request
            const authContext = await (0, auth_util_1.authenticateRequest)(event.request.headers, this.userPoolId, this.region);
            console.log('Request authenticated:', {
                userId: authContext.userId,
                username: authContext.username,
            });
            // Step 2: Check rate limit
            const rateLimitResult = await (0, ratelimit_util_1.enforceRateLimit)(this.rateLimiter, authContext.userId);
            console.log('Rate limit check passed:', {
                remainingTokens: rateLimitResult.remainingTokens,
            });
            // Step 3: Route to appropriate resolver
            let result;
            switch (event.info.fieldName) {
                case 'getLeaderboard':
                    result = await this.getLeaderboardResolver(event.arguments, authContext.userId);
                    break;
                case 'getUserRank':
                    result = await this.getUserRankResolver(event.arguments, authContext.userId);
                    break;
                case 'getUserScoreHistory':
                    result = await this.getUserScoreHistoryResolver(event.arguments, authContext.userId);
                    break;
                default:
                    throw this.createError(`Unknown field: ${event.info.fieldName}`, 'UNKNOWN_FIELD', 400);
            }
            console.log('Query processed successfully:', {
                fieldName: event.info.fieldName,
            });
            return result;
        }
        catch (error) {
            console.error('Error processing GraphQL query:', {
                fieldName: event.info.fieldName,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            // Re-throw to let AppSync handle error formatting
            throw error;
        }
    }
    /**
     * Resolver for getLeaderboard query
     */
    async getLeaderboardResolver(args, userId) {
        // Validate arguments
        this.validateGameType(args.gameType);
        this.validateTimeframe(args.timeframe);
        const limit = args.limit || 100;
        if (limit < 1 || limit > 100) {
            throw this.createError('Limit must be between 1 and 100', 'INVALID_ARGUMENT', 400);
        }
        // Query leaderboard
        const leaderboard = await this.leaderboardService.getLeaderboard(args.gameType, args.timeframe, userId, limit);
        return leaderboard;
    }
    /**
     * Resolver for getUserRank query
     */
    async getUserRankResolver(args, userId) {
        // Validate arguments
        this.validateGameType(args.gameType);
        this.validateTimeframe(args.timeframe);
        // Query user rank
        const userRank = await this.leaderboardService.getUserRank(userId, args.gameType, args.timeframe);
        return userRank;
    }
    /**
     * Resolver for getUserScoreHistory query
     */
    async getUserScoreHistoryResolver(args, userId) {
        // Validate arguments
        if (args.gameType) {
            this.validateGameType(args.gameType);
        }
        const limit = args.limit || 50;
        if (limit < 1 || limit > 100) {
            throw this.createError('Limit must be between 1 and 100', 'INVALID_ARGUMENT', 400);
        }
        // Query user score history
        const history = await this.leaderboardService.getUserScoreHistory(userId, args.gameType, limit);
        return history;
    }
    /**
     * Validate game type
     */
    validateGameType(gameType) {
        if (!Object.values(types_1.GameType).includes(gameType)) {
            throw this.createError(`Invalid gameType: ${gameType}. Must be one of: ${Object.values(types_1.GameType).join(', ')}`, 'INVALID_GAME_TYPE', 400);
        }
    }
    /**
     * Validate timeframe
     */
    validateTimeframe(timeframe) {
        if (!Object.values(types_1.Timeframe).includes(timeframe)) {
            throw this.createError(`Invalid timeframe: ${timeframe}. Must be one of: ${Object.values(types_1.Timeframe).join(', ')}`, 'INVALID_TIMEFRAME', 400);
        }
    }
    /**
     * Create a GraphQL error
     */
    createError(message, code, statusCode) {
        const error = new Error(message);
        error.extensions = {
            code,
            statusCode,
        };
        return error;
    }
}
exports.GraphQLHandler = GraphQLHandler;
/**
 * Lambda handler function for AppSync
 */
const handler = async (event) => {
    const graphqlHandler = new GraphQLHandler();
    return await graphqlHandler.handleQuery(event);
};
exports.handler = handler;
//# sourceMappingURL=graphql.handler.js.map