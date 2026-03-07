import { GameRepository } from '../repositories/game.repository';
import { RateLimitRepository } from '../repositories/rate-limit.repository';
import { AchievementRepository } from '../repositories/achievement.repository';
import { ThemeRepository } from '../repositories/theme.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { GameCatalogRepository } from '../repositories/game-catalog.repository';
import { GameService } from '../services/game.service';
import { AdminService } from '../services/admin.service';
import { ScoreCalculatorService } from '../services/score-calculator.service';
import { RateLimiterService } from '../services/rate-limiter.service';
import { AchievementTrackerService } from '../services/achievement-tracker.service';
import { EventPublisherService } from '../services/event-publisher.service';
import {
  validateStartGameInput,
  validateCompleteGameInput,
  validateGameHistoryInput,
} from '../utils/validation';
import { sanitizeError } from '../utils/error-mapper';
import { logger } from '../utils/logger';
import { GraphQLContext, GraphQLResponse } from '../types';

/**
 * GraphQL Handler
 * Routes GraphQL operations to appropriate service methods
 */

export class GameHandler {
  private gameService: GameService;
  private adminService: AdminService;
  private gameCatalogRepository: GameCatalogRepository;

  constructor() {
    // Initialize repositories
    const gameRepository = new GameRepository();
    const rateLimitRepository = new RateLimitRepository();
    const achievementRepository = new AchievementRepository();
    const themeRepository = new ThemeRepository();
    const subscriptionRepository = new SubscriptionRepository();
    this.gameCatalogRepository = new GameCatalogRepository();

    // Initialize services
    const scoreCalculator = new ScoreCalculatorService();
    const rateLimiter = new RateLimiterService(rateLimitRepository);
    const achievementTracker = new AchievementTrackerService(
      achievementRepository,
      gameRepository
    );
    const eventPublisher = new EventPublisherService();

    // Initialize game service
    this.gameService = new GameService(
      gameRepository,
      themeRepository,
      subscriptionRepository,
      scoreCalculator,
      rateLimiter,
      achievementTracker,
      eventPublisher
    );

    // Initialize admin service
    this.adminService = new AdminService();
  }

  /**
   * Handle GraphQL request
   */
  async handleRequest(context: GraphQLContext): Promise<GraphQLResponse> {
    const { query, variables, operationName, userId, username, email } = context;

    try {
      // Parse operation name from query if not provided
      const operation = operationName || this.extractOperationName(query);

      logger.debug('Handling GraphQL operation', { operation, userId, username });

      // Route to appropriate resolver
      const data = await this.routeOperation(operation, variables, userId, username, email);

      return { data };
    } catch (error) {
      logger.error('GraphQL operation failed', error as Error, {
        operationName,
        userId,
        username,
      });

      const sanitized = sanitizeError(error as Error);

      return {
        errors: [
          {
            message: sanitized.message,
            extensions: {
              code: (sanitized as any).code || 'INTERNAL_ERROR',
            },
          },
        ],
      };
    }
  }

  /**
   * Route operation to appropriate resolver
   */
  private async routeOperation(
    operation: string,
    variables: Record<string, any> = {},
    userId: string,
    username?: string,
    email?: string
  ): Promise<any> {
    // Normalize operation name to lowercase for case-insensitive matching
    const normalizedOp = operation.charAt(0).toLowerCase() + operation.slice(1);
    
    switch (normalizedOp) {
      // Mutations
      case 'startGame':
        return this.startGame(userId, variables.input);

      case 'completeGame':
        return this.completeGame(userId, variables.input);

      // Queries
      case 'getGame':
        return this.getGame(userId, variables.gameId);

      case 'getGameHistory':
        return this.getGameHistory(userId, variables.input);

      case 'getUserStatistics':
        return this.getUserStatistics(userId);

      case 'canStartGame':
        return this.canStartGame(userId);

      case 'listAvailableGames':
        return this.listAvailableGames();

      // Admin queries
      case 'getAdminAnalytics':
        return this.getAdminAnalytics(userId, username, email);

      case 'listAllUsers':
        return this.listAllUsers(userId, username, email, variables.input);

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Mutation: startGame
   */
  private async startGame(userId: string, input: any): Promise<any> {
    const validated = validateStartGameInput(input);
    const result = await this.gameService.startGame(userId, validated);

    return {
      startGame: {
        id: result.game.id,
        userId: result.game.userId,
        themeId: result.game.themeId,
        difficulty: result.game.difficulty,
        status: result.game.status,
        startedAt: result.game.startedAt,
        canPlay: result.canPlay,
        rateLimit: {
          tier: result.rateLimit.tier,
          limit: result.rateLimit.limit,
          used: result.rateLimit.used,
          remaining: result.rateLimit.remaining,
          resetAt: typeof result.rateLimit.resetAt === 'string' 
            ? result.rateLimit.resetAt 
            : result.rateLimit.resetAt.toISOString(),
        },
      },
    };
  }

  /**
   * Mutation: completeGame
   */
  private async completeGame(userId: string, input: any): Promise<any> {
    const validated = validateCompleteGameInput(input);
    const result = await this.gameService.completeGame(userId, validated);

    return {
      completeGame: {
        id: result.game.id,
        status: result.game.status,
        completedAt: result.game.completedAt,
        completionTime: result.game.completionTime,
        attempts: result.game.attempts,
        score: result.game.score,
        achievements: result.achievements.map((a) => ({
          type: a.achievementType,
          unlocked: a.completed,
          progress: a.progress,
        })),
      },
    };
  }

  /**
   * Query: getGame
   */
  private async getGame(userId: string, gameId: string): Promise<any> {
    const game = await this.gameService.getGame(userId, gameId);

    return {
      getGame: {
        id: game.id,
        userId: game.userId,
        themeId: game.themeId,
        difficulty: game.difficulty,
        status: game.status,
        startedAt: game.startedAt,
        completedAt: game.completedAt,
        completionTime: game.completionTime,
        attempts: game.attempts,
        score: game.score,
      },
    };
  }

  /**
   * Query: getGameHistory
   */
  private async getGameHistory(userId: string, input: any): Promise<any> {
    const validated = validateGameHistoryInput(input);
    const result = await this.gameService.getGameHistory(userId, validated);

    return {
      getGameHistory: {
        games: result.games.map((g) => ({
          id: g.id,
          themeId: g.themeId,
          themeName: '', // TODO: Populate from theme
          difficulty: g.difficulty,
          completedAt: g.completedAt,
          completionTime: g.completionTime,
          attempts: g.attempts,
          score: g.score,
        })),
        pagination: {
          total: result.pagination.total,
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          hasMore: result.pagination.hasMore,
        },
      },
    };
  }

  /**
   * Query: getUserStatistics
   */
  private async getUserStatistics(userId: string): Promise<any> {
    const stats = await this.gameService.getUserStatistics(userId);

    return {
      getUserStatistics: stats,
    };
  }

  /**
   * Query: canStartGame
   */
  private async canStartGame(userId: string): Promise<any> {
    const result = await this.gameService.canStartGame(userId);

    return {
      canStartGame: {
        canPlay: result.canPlay,
        rateLimit: {
          tier: result.rateLimit.tier,
          limit: result.rateLimit.limit,
          used: result.rateLimit.used,
          remaining: result.rateLimit.remaining,
          resetAt: result.rateLimit.resetAt.toISOString(),
        },
        message: result.message,
      },
    };
  }

  /**
   * Query: listAvailableGames
   */
  private async listAvailableGames(): Promise<any> {
    const games = await this.gameCatalogRepository.getAllGames();

    return {
      listAvailableGames: games,
    };
  }

  /**
   * Query: getAdminAnalytics (Admin only)
   */
  private async getAdminAnalytics(userId: string, username?: string, email?: string): Promise<any> {
    // Check if user is admin by username or email
    const isAdmin = username === 'dtuleski' || 
                    email === 'diego.tuleski@gmail.com' || 
                    email === 'diegotuleski@gmail.com';
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const analytics = await this.adminService.getAdminAnalytics();

    return {
      getAdminAnalytics: analytics,
    };
  }

  /**
   * Query: listAllUsers (Admin only)
   */
  private async listAllUsers(userId: string, username?: string, email?: string, input: any): Promise<any> {
    // Check if user is admin by username or email
    const isAdmin = username === 'dtuleski' || 
                    email === 'diego.tuleski@gmail.com' || 
                    email === 'diegotuleski@gmail.com';
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const result = await this.adminService.listAllUsers(input);

    return {
      listAllUsers: result,
    };
  }

  /**
   * Extract operation name from GraphQL query
   */
  private extractOperationName(query: string): string {
    // Try to match named operation: query OperationName { ... }
    const namedMatch = query.match(/(?:mutation|query)\s+(\w+)/);
    if (namedMatch) {
      return namedMatch[1];
    }

    // Try to match unnamed operation and extract first field: query { fieldName ... }
    const unnamedMatch = query.match(/(?:mutation|query)\s*\{\s*(\w+)/);
    if (unnamedMatch) {
      return unnamedMatch[1];
    }

    return 'unknown';
  }
}
