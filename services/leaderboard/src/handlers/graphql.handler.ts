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

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LeaderboardService } from '../services/leaderboard.service';
import { RateLimiter, enforceRateLimit } from '../utils/ratelimit.util';
import { authenticateRequest, AuthenticationError, AuthContext } from '../utils/auth.util';
import { GameType, Timeframe, LeaderboardResponse, UserRankResponse, LeaderboardEntry } from '../types';

// AppSync event structure
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

// AppSync result structure
export interface AppSyncResult {
  statusCode: number;
  body?: any;
  headers?: Record<string, string>;
}

// GraphQL error structure
export interface GraphQLError {
  message: string;
  extensions: {
    code: string;
    statusCode: number;
    [key: string]: any;
  };
}

export class GraphQLHandler {
  private leaderboardService: LeaderboardService;
  private rateLimiter: RateLimiter;
  private userPoolId: string;
  private region: string;

  constructor(
    leaderboardService?: LeaderboardService,
    rateLimiter?: RateLimiter
  ) {
    this.leaderboardService = leaderboardService || new LeaderboardService();
    this.rateLimiter = rateLimiter || new RateLimiter(new DynamoDBClient({}));
    this.userPoolId = process.env.COGNITO_USER_POOL_ID || '';
    this.region = process.env.AWS_REGION || 'us-east-1';
  }

  /**
   * Main handler for GraphQL queries
   */
  async handleQuery(event: AppSyncEvent): Promise<any> {
    try {
      console.log('Processing GraphQL query:', {
        fieldName: event.info.fieldName,
        arguments: event.arguments,
      });

      // Step 1: Authenticate request
      const authContext = await authenticateRequest(
        event.request.headers,
        this.userPoolId,
        this.region
      );

      console.log('Request authenticated:', {
        userId: authContext.userId,
        username: authContext.username,
      });

      // Step 2: Check rate limit
      const rateLimitResult = await enforceRateLimit(
        this.rateLimiter,
        authContext.userId
      );

      console.log('Rate limit check passed:', {
        remainingTokens: rateLimitResult.remainingTokens,
      });

      // Step 3: Route to appropriate resolver
      let result: any;
      switch (event.info.fieldName) {
        case 'getLeaderboard':
          result = await this.getLeaderboardResolver(
            event.arguments as {
              gameType: GameType;
              timeframe: Timeframe;
              limit?: number;
            },
            authContext.userId
          );
          break;

        case 'getUserRank':
          result = await this.getUserRankResolver(
            event.arguments as {
              gameType: GameType;
              timeframe: Timeframe;
            },
            authContext.userId
          );
          break;

        case 'getUserScoreHistory':
          result = await this.getUserScoreHistoryResolver(
            event.arguments as {
              gameType?: GameType;
              limit?: number;
            },
            authContext.userId
          );
          break;

        case 'clearAllRecords':
          result = await this.clearAllRecordsResolver(authContext);
          break;

        default:
          throw this.createError(
            `Unknown field: ${event.info.fieldName}`,
            'UNKNOWN_FIELD',
            400
          );
      }

      console.log('Query processed successfully:', {
        fieldName: event.info.fieldName,
      });

      return result;
    } catch (error) {
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
  private async getLeaderboardResolver(
    args: {
      gameType: GameType;
      timeframe: Timeframe;
      limit?: number;
    },
    userId: string
  ): Promise<LeaderboardResponse> {
    // Validate arguments
    this.validateGameType(args.gameType);
    this.validateTimeframe(args.timeframe);

    const limit = args.limit || 100;
    if (limit < 1 || limit > 100) {
      throw this.createError(
        'Limit must be between 1 and 100',
        'INVALID_ARGUMENT',
        400
      );
    }

    // Query leaderboard
    const leaderboard = await this.leaderboardService.getLeaderboard(
      args.gameType,
      args.timeframe,
      userId,
      limit
    );

    return leaderboard;
  }

  /**
   * Resolver for getUserRank query
   */
  private async getUserRankResolver(
    args: {
      gameType: GameType;
      timeframe: Timeframe;
    },
    userId: string
  ): Promise<UserRankResponse | null> {
    // Validate arguments
    this.validateGameType(args.gameType);
    this.validateTimeframe(args.timeframe);

    // Query user rank
    const userRank = await this.leaderboardService.getUserRank(
      userId,
      args.gameType,
      args.timeframe
    );

    return userRank;
  }

  /**
   * Resolver for getUserScoreHistory query
   */
  private async getUserScoreHistoryResolver(
    args: {
      gameType?: GameType;
      limit?: number;
    },
    userId: string
  ): Promise<LeaderboardEntry[]> {
    // Validate arguments
    if (args.gameType) {
      this.validateGameType(args.gameType);
    }

    const limit = args.limit || 50;
    if (limit < 1 || limit > 100) {
      throw this.createError(
        'Limit must be between 1 and 100',
        'INVALID_ARGUMENT',
        400
      );
    }

    // Query user score history
    const history = await this.leaderboardService.getUserScoreHistory(
      userId,
      args.gameType,
      limit
    );

    return history;
  }

  /**
   * Resolver for clearAllRecords mutation (admin only)
   */
  private async clearAllRecordsResolver(
    authContext: AuthContext
  ): Promise<{ success: boolean; message: string }> {
    const ADMIN_EMAILS = ['diegotuleski@gmail.com', 'diego.tuleski@gmail.com', 'benjamintuleski@gmail.com'];
    
    // Check if user is admin
    if (!ADMIN_EMAILS.includes(authContext.email || '')) {
      throw this.createError(
        'Unauthorized: Admin access required',
        'UNAUTHORIZED',
        403
      );
    }

    console.log('Admin clearing all leaderboard records:', {
      userId: authContext.userId,
      email: authContext.email,
    });

    // Clear all records
    const result = await this.leaderboardService.clearAllRecords();

    console.log('All leaderboard records cleared successfully');

    return result;
  }

  /**
   * Validate game type
   */
  private validateGameType(gameType: string): void {
    if (!Object.values(GameType).includes(gameType as GameType)) {
      throw this.createError(
        `Invalid gameType: ${gameType}. Must be one of: ${Object.values(GameType).join(', ')}`,
        'INVALID_GAME_TYPE',
        400
      );
    }
  }

  /**
   * Validate timeframe
   */
  private validateTimeframe(timeframe: string): void {
    if (!Object.values(Timeframe).includes(timeframe as Timeframe)) {
      throw this.createError(
        `Invalid timeframe: ${timeframe}. Must be one of: ${Object.values(Timeframe).join(', ')}`,
        'INVALID_TIMEFRAME',
        400
      );
    }
  }

  /**
   * Create a GraphQL error
   */
  private createError(message: string, code: string, statusCode: number): Error {
    const error = new Error(message) as Error & { extensions?: any };
    error.extensions = {
      code,
      statusCode,
    };
    return error;
  }
}

/**
 * Lambda handler function for AppSync
 */
export const handler = async (event: AppSyncEvent): Promise<any> => {
  const graphqlHandler = new GraphQLHandler();
  return await graphqlHandler.handleQuery(event);
};
