import { GameRepository } from '../repositories/game.repository';
import { RateLimitRepository } from '../repositories/rate-limit.repository';
import { AchievementRepository } from '../repositories/achievement.repository';
import { ThemeRepository } from '../repositories/theme.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { GameCatalogRepository } from '../repositories/game-catalog.repository';
import { GameService } from '../services/game.service';
import { AdminService } from '../services/admin.service';
import { StripeService } from '../services/stripe.service';
import { LanguageHandler } from './language.handler';
import { LanguageRepository } from '../repositories/language.repository';
import { ScoreCalculatorService } from '../services/score-calculator.service';
import { RateLimiterService } from '../services/rate-limiter.service';
import { AchievementTrackerService } from '../services/achievement-tracker.service';
import { EventPublisherService } from '../services/event-publisher.service';
import { ReviewService } from '../services/review.service';
import { EmailPrefsService } from '../services/email-prefs.service';
import {
  validateStartGameInput,
  validateCompleteGameInput,
  validateGameHistoryInput,
} from '../utils/validation';
import { sanitizeError } from '../utils/error-mapper';
import { logger } from '../utils/logger';
import { GraphQLContext, GraphQLResponse } from '../types';

const ADMIN_EMAILS = ['diegotuleski@gmail.com', 'diego.tuleski@gmail.com', 'benjamintuleski@gmail.com'];
const ADMIN_USERNAMES = ['dtuleski', 'bentuleski'];

function isAdminUser(username?: string, email?: string): boolean {
  return ADMIN_USERNAMES.includes(username || '') || ADMIN_EMAILS.includes(email || '');
}

/**
 * GraphQL Handler
 * Routes GraphQL operations to appropriate service methods
 */

export class GameHandler {
  private gameService: GameService;
  private adminService: AdminService;
  private stripeService: StripeService;
  private languageHandler: LanguageHandler;
  private languageRepository: LanguageRepository;
  private gameCatalogRepository: GameCatalogRepository;
  private subscriptionRepository: SubscriptionRepository;
  private reviewService: ReviewService;
  private emailPrefsService: EmailPrefsService;

  constructor() {
    // Initialize repositories
    const gameRepository = new GameRepository();
    const rateLimitRepository = new RateLimitRepository();
    const achievementRepository = new AchievementRepository();
    const themeRepository = new ThemeRepository();
    this.subscriptionRepository = new SubscriptionRepository();
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
      this.subscriptionRepository,
      scoreCalculator,
      rateLimiter,
      achievementTracker,
      eventPublisher
    );

    // Initialize admin service
    this.adminService = new AdminService();
    
    // Initialize Stripe service
    this.stripeService = new StripeService();
    
    // Initialize language handler
    this.languageHandler = new LanguageHandler();
    
    // Initialize language repository for admin functions
    this.languageRepository = new LanguageRepository();
    
    // Initialize review service
    this.reviewService = new ReviewService();
    this.emailPrefsService = new EmailPrefsService();
  }

  /**
   * Handle GraphQL request
   */
  async handleRequest(context: GraphQLContext): Promise<GraphQLResponse> {
    const { query, variables, operationName, userId, username, email } = context;

    try {
      // Parse operation name from query if not provided
      const operation = operationName || this.extractOperationName(query);
      
      // Normalize operation name to match GraphQL schema field names (camelCase)
      const normalizedOp = operation.charAt(0).toLowerCase() + operation.slice(1);

      logger.debug('Handling GraphQL operation', { operation, normalizedOp, userId, username });

      // Route to appropriate resolver
      const result = await this.routeOperation(operation, variables, userId, username, email);

      // Ensure proper GraphQL response format using normalized operation name
      const response = {
        data: {
          [normalizedOp]: result
        }
      };

      logger.debug('GraphQL response prepared', { 
        operation: normalizedOp, 
        hasResult: !!result,
        resultType: Array.isArray(result) ? 'array' : typeof result,
        resultLength: Array.isArray(result) ? result.length : undefined
      });

      return response;
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
        return this.completeGame(userId, variables.input, username);

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

      // Stripe mutations
      case 'createCheckoutSession':
        return this.createCheckoutSession(userId, username, email, variables.input);

      case 'createPortalSession':
        return this.createPortalSession(userId);

      // Language learning queries and mutations
      case 'getLanguageWords':
        return this.languageHandler.getLanguageWords({}, {
          languageCode: variables.languageCode,
          category: variables.category,
          difficulty: variables.difficulty,
          count: variables.count
        }, { userId });

      case 'saveLanguageGameResult':
        return this.languageHandler.saveLanguageGameResult({}, {
          input: variables.input
        }, { userId, username: username || '' });

      case 'getUserLanguageProgress':
        return this.languageHandler.getUserLanguageProgress({}, {}, { userId });

      case 'getLanguageProgressByCode':
        return this.languageHandler.getLanguageProgressByCode({}, {
          languageCode: variables.languageCode
        }, { userId });

      // Admin - Language Data Management
      case 'getAllLanguageWords':
        return this.getAllLanguageWords(userId, username, email);

      case 'getLanguageWordById':
        return this.getLanguageWordById(userId, variables.wordId, username, email);

      case 'updateLanguageWord':
        return this.updateLanguageWord(userId, variables.input, username, email);

      case 'createLanguageWord':
        return this.createLanguageWord(userId, variables.input, username, email);

      case 'deleteLanguageWord':
        return this.deleteLanguageWord(userId, variables.wordId, username, email);

      // Admin - Subscription Management
      case 'updateUserSubscription':
        return this.updateUserSubscription(userId, variables.input, username, email);

      // Reviews
      case 'submitGameReview':
        return this.reviewService.submitReview(userId, variables.input);

      case 'getUserReview':
        return { rating: await this.reviewService.getUserReview(userId, variables.gameType) };

      case 'getReviewStats':
        return this.reviewService.getReviewStats();

      // Email Preferences
      case 'getEmailPrefs':
        return (await this.emailPrefsService.getPrefs(userId)) || { userId, dailyDigest: false };

      case 'setEmailPrefs':
        return this.emailPrefsService.setPrefs(userId, email || '', username || '', variables.input.dailyDigest);

      case 'adminSetEmailPrefs':
        if (!isAdminUser(username, email)) throw new Error('Unauthorized: Admin only');
        return this.emailPrefsService.setPrefs(
          variables.input.userId,
          variables.input.email || '',
          variables.input.username || '',
          variables.input.dailyDigest
        );

      case 'adminGetAllEmailPrefs':
        if (!isAdminUser(username, email)) throw new Error('Unauthorized: Admin only');
        return { users: await this.emailPrefsService.getOptedInUsers() };

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
    };
  }

  /**
   * Mutation: completeGame
   */
  private async completeGame(userId: string, input: any, username?: string): Promise<any> {
    const validated = validateCompleteGameInput(input);
    const result = await this.gameService.completeGame(userId, validated, username || 'Unknown');

    return {
      id: result.game.id,
      status: result.game.status,
      completedAt: result.game.completedAt,
      completionTime: result.game.completionTime,
      attempts: result.game.attempts,
      score: result.game.score,
      scoreBreakdown: result.scoreBreakdown || null,
      leaderboardRank: null,
      achievements: result.achievements.map((a) => ({
        type: a.achievementType,
        unlocked: a.completed,
        progress: a.progress,
      })),
    };
  }

  /**
   * Query: getGame
   */
  private async getGame(userId: string, gameId: string): Promise<any> {
    const game = await this.gameService.getGame(userId, gameId);

    return {
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
    };
  }

  /**
   * Query: getGameHistory
   */
  private async getGameHistory(userId: string, input: any): Promise<any> {
    const validated = validateGameHistoryInput(input);
    const result = await this.gameService.getGameHistory(userId, validated);

    return {
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
    };
  }

  /**
   * Query: getUserStatistics
   */
  private async getUserStatistics(userId: string): Promise<any> {
    const stats = await this.gameService.getUserStatistics(userId);

    // Return stats directly, not wrapped in another object
    return stats;
  }

  /**
   * Query: canStartGame
   */
  private async canStartGame(userId: string): Promise<any> {
    const result = await this.gameService.canStartGame(userId);

    return {
      canPlay: result.canPlay,
      rateLimit: {
        tier: result.rateLimit.tier,
        limit: result.rateLimit.limit,
        used: result.rateLimit.used,
        remaining: result.rateLimit.remaining,
        resetAt: result.rateLimit.resetAt.toISOString(),
      },
      message: result.message,
    };
  }

  /**
   * Query: listAvailableGames
   */
  private async listAvailableGames(): Promise<any> {
    const games = await this.gameCatalogRepository.getAllGames();
    return games;
  }

  /**
   * Query: getAdminAnalytics (Admin only)
   */
  private async getAdminAnalytics(userId: string, username?: string, email?: string): Promise<any> {
    // Check if user is admin by username or email
    const isAdmin = isAdminUser(username, email);
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const analytics = await this.adminService.getAdminAnalytics();

    // Return the analytics directly, not wrapped in another object
    return analytics;
  }

  /**
   * Query: listAllUsers (Admin only)
   */
  private async listAllUsers(userId: string, username?: string, email?: string, input?: any): Promise<any> {
    // Check if user is admin by username or email
    const isAdmin = isAdminUser(username, email);
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const result = await this.adminService.listAllUsers(input);

    // Return the result directly, not wrapped in another object
    return result;
  }

  /**
   * Mutation: createCheckoutSession (Stripe)
   */
  private async createCheckoutSession(
    userId: string,
    username?: string,
    email?: string,
    input?: any
  ): Promise<any> {
    if (!email) {
      throw new Error('Email required for checkout');
    }

    if (!input?.priceId || !input?.tier) {
      throw new Error('priceId and tier are required');
    }

    logger.info('Creating checkout session', { userId, tier: input.tier });

    const result = await this.stripeService.createCheckoutSession({
      userId,
      email,
      priceId: input.priceId,
      tier: input.tier,
    });

    // Return the result directly, not wrapped in another object
    return {
      sessionId: result.sessionId,
      url: result.url,
    };
  }

  /**
   * Mutation: createPortalSession (Stripe)
   */
  private async createPortalSession(userId: string): Promise<any> {
    logger.info('Creating portal session', { userId });

    // Get customer ID from subscription
    const subscription = await this.subscriptionRepository.getByUserId(userId);

    if (!subscription?.stripeCustomerId) {
      throw new Error('No active subscription found. Please subscribe first.');
    }

    const result = await this.stripeService.createPortalSession({
      customerId: subscription.stripeCustomerId,
    });

    // Return the result directly, not wrapped in another object
    return {
      url: result.url,
    };
  }

  /**
   * Query: getAllLanguageWords (Admin only)
   */
  private async getAllLanguageWords(userId: string, username?: string, email?: string): Promise<any> {
    // Check if user is admin
    const isAdmin = isAdminUser(username, email);
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const words = await this.languageRepository.getAllLanguageWords();
    return words;
  }

  /**
   * Query: getLanguageWordById (Admin only)
   */
  private async getLanguageWordById(userId: string, wordId: string, username?: string, email?: string): Promise<any> {
    // Check if user is admin
    const isAdmin = isAdminUser(username, email);
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const word = await this.languageRepository.getLanguageWordById(wordId);
    if (!word) {
      throw new Error(`Language word not found: ${wordId}`);
    }
    
    return word;
  }

  /**
   * Mutation: updateLanguageWord (Admin only)
   */
  private async updateLanguageWord(userId: string, input: any, username?: string, email?: string): Promise<any> {
    // Check if user is admin
    const isAdmin = isAdminUser(username, email);
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const updatedWord = await this.languageRepository.updateLanguageWord(input.wordId, {
      imageUrl: input.imageUrl,
      distractorImages: input.distractorImages,
      translations: input.translations
    });
    
    return updatedWord;
  }

  /**
   * Mutation: createLanguageWord (Admin only)
   */
  private async createLanguageWord(userId: string, input: any, username?: string, email?: string): Promise<any> {
    const isAdmin = isAdminUser(username, email);
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    return this.languageRepository.createLanguageWord({
      category: input.category,
      difficulty: input.difficulty,
      languageCode: input.languageCode || 'multi',
      translations: input.translations,
      imageUrl: input.imageUrl,
      distractorImages: input.distractorImages || [],
    });
  }

  /**
   * Mutation: deleteLanguageWord (Admin only)
   */
  private async deleteLanguageWord(userId: string, wordId: string, username?: string, email?: string): Promise<any> {
    const isAdmin = isAdminUser(username, email);
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    await this.languageRepository.deleteLanguageWord(wordId);
    return { success: true, wordId };
  }

  /**
   * Mutation: updateUserSubscription (Admin only)
   */
  private async updateUserSubscription(userId: string, input: any, username?: string, email?: string): Promise<any> {
    // Check if user is admin
    const isAdmin = isAdminUser(username, email);
    
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Update subscription in database
    await this.subscriptionRepository.updateSubscription({
      userId: input.userId,
      tier: input.tier,
      status: input.status,
    });

    return {
      userId: input.userId,
      tier: input.tier,
      status: input.status,
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
