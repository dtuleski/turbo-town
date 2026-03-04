import { Game, GameStatus, SubscriptionTier, AuthorizationError, NotFoundError } from '@memory-game/shared';
import { GameRepository } from '../repositories/game.repository';
import { ThemeRepository } from '../repositories/theme.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { ScoreCalculatorService } from './score-calculator.service';
import { RateLimiterService } from './rate-limiter.service';
import { AchievementTrackerService } from './achievement-tracker.service';
import { EventPublisherService } from './event-publisher.service';
import {
  StartGameInput,
  CompleteGameInput,
  GameHistoryInput,
  StartGameResponse,
  CompleteGameResponse,
  GameHistoryResponse,
  CanStartGameResponse,
  RateLimitInfo,
} from '../types';
import { validateCompletionTime, validateAttempts } from '../utils/validation';
import { ErrorMessages, ErrorCodes } from '../utils/error-mapper';
import { logger } from '../utils/logger';
import { metricsPublisher } from '../utils/metrics';
import { statisticsCache } from '../utils/cache';

/**
 * Game Service
 * Core business logic for game lifecycle management
 */

export class GameService {
  constructor(
    private gameRepository: GameRepository,
    private themeRepository: ThemeRepository,
    private subscriptionRepository: SubscriptionRepository,
    private scoreCalculator: ScoreCalculatorService,
    private rateLimiter: RateLimiterService,
    private achievementTracker: AchievementTrackerService,
    private eventPublisher: EventPublisherService
  ) {}

  /**
   * Start a new game
   */
  async startGame(userId: string, input: StartGameInput): Promise<StartGameResponse> {
    logger.info('Starting game', { userId, themeId: input.themeId, difficulty: input.difficulty });

    // Get user's subscription tier
    const tier = await this.subscriptionRepository.getTier(userId);

    // Check rate limit
    await this.rateLimiter.checkLimit(userId, tier);

    // Validate theme exists and is published
    await this.themeRepository.validateTheme(input.themeId);

    // Create game record
    const game = await this.gameRepository.create({
      userId,
      themeId: input.themeId,
      difficulty: input.difficulty,
      status: GameStatus.InProgress,
      startedAt: new Date(),
      attempts: 0,
      score: 0,
    });

    // Increment rate limit usage
    const rateLimit = await this.rateLimiter.incrementUsage(userId);

    // Publish metrics
    await metricsPublisher.publishGameStarted(input.difficulty, tier);

    // Build rate limit info
    const limit = this.rateLimiter.getTierLimit(tier);
    const rateLimitInfo: RateLimitInfo = {
      tier,
      limit,
      used: rateLimit.count,
      remaining: limit - rateLimit.count,
      resetAt: rateLimit.resetAt,
    };

    logger.info('Game started successfully', {
      userId,
      gameId: game.id,
      tier,
      rateLimit: rateLimitInfo,
    });

    return {
      game,
      canPlay: rateLimitInfo.remaining > 0,
      rateLimit: rateLimitInfo,
    };
  }

  /**
   * Complete a game
   */
  async completeGame(userId: string, input: CompleteGameInput): Promise<CompleteGameResponse> {
    logger.info('Completing game', { userId, gameId: input.gameId });

    // Get game
    const game = await this.gameRepository.getById(input.gameId, userId);
    if (!game) {
      throw new NotFoundError(ErrorMessages.GAME_NOT_FOUND);
    }

    // Verify ownership
    if (game.userId !== userId) {
      throw new AuthorizationError(ErrorMessages.GAME_NOT_OWNED);
    }

    // Verify game status
    if (game.status !== GameStatus.InProgress) {
      throw new AuthorizationError(ErrorMessages.GAME_ALREADY_COMPLETED);
    }

    // Validate completion time
    const timeValidation = validateCompletionTime(input.completionTime, game.difficulty);
    if (!timeValidation.valid) {
      throw new AuthorizationError(timeValidation.reason!);
    }

    // Validate attempts
    const attemptsValidation = validateAttempts(input.attempts, game.difficulty);
    if (!attemptsValidation.valid) {
      throw new AuthorizationError(attemptsValidation.reason!);
    }

    // Calculate score
    const score = this.scoreCalculator.calculateScore(
      game.difficulty,
      input.completionTime,
      input.attempts
    );

    // Update game record
    const completedGame = await this.gameRepository.update(input.gameId, {
      status: GameStatus.Completed,
      completedAt: new Date(),
      completionTime: input.completionTime,
      attempts: input.attempts,
      score,
    }, userId);

    // Track achievements (synchronous)
    const achievements = await this.achievementTracker.trackCompletion(
      userId,
      input.gameId,
      game.difficulty,
      input.completionTime,
      input.attempts,
      game.themeId
    );

    // Get user tier for metrics
    const tier = await this.subscriptionRepository.getTier(userId);

    // Publish metrics
    await metricsPublisher.publishGameCompleted(game.difficulty, tier, score);

    // Publish GameCompleted event (async, fire-and-forget)
    this.eventPublisher.publishGameCompleted({
      gameId: completedGame.id,
      userId: completedGame.userId,
      userName: '', // TODO: Get from user service
      themeId: completedGame.themeId,
      difficulty: completedGame.difficulty,
      score: completedGame.score!,
      completionTime: completedGame.completionTime!,
      attempts: completedGame.attempts!,
      completedAt: new Date(completedGame.completedAt!),
    });

    // Invalidate statistics cache
    statisticsCache.delete(userId);

    logger.info('Game completed successfully', {
      userId,
      gameId: completedGame.id,
      score,
      achievementsUnlocked: achievements.length,
    });

    return {
      game: completedGame,
      achievements,
    };
  }

  /**
   * Get game by ID
   */
  async getGame(userId: string, gameId: string): Promise<Game> {
    const game = await this.gameRepository.getById(gameId, userId);

    if (!game) {
      throw new NotFoundError(ErrorMessages.GAME_NOT_FOUND);
    }

    // Verify ownership
    if (game.userId !== userId) {
      throw new AuthorizationError(ErrorMessages.GAME_NOT_OWNED);
    }

    return game;
  }

  /**
   * Get game history (paid users only)
   */
  async getGameHistory(userId: string, input: GameHistoryInput): Promise<GameHistoryResponse> {
    logger.info('Getting game history', { userId, input });

    // Check subscription tier
    const tier = await this.subscriptionRepository.getTier(userId);
    if (tier === SubscriptionTier.Free) {
      throw new AuthorizationError(
        ErrorMessages.PAID_FEATURE_REQUIRED('Game history', ['LIGHT', 'STANDARD', 'PREMIUM'])
      );
    }

    // Build filters
    const filters: Record<string, any> = {
      status: GameStatus.Completed,
    };

    if (input.themeId) {
      filters.themeId = input.themeId;
    }

    if (input.difficulty) {
      filters.difficulty = input.difficulty;
    }

    // Query games
    const games = await this.gameRepository.queryByUser(userId, {
      limit: input.pageSize || 20,
      sortOrder: input.sortOrder || 'desc',
      filters,
    });

    // TODO: Apply date range filters
    // TODO: Implement pagination with lastEvaluatedKey

    // Calculate pagination info
    const total = games.length; // TODO: Get actual total count
    const page = input.page || 1;
    const pageSize = input.pageSize || 20;

    return {
      games,
      pagination: {
        total,
        page,
        pageSize,
        hasMore: games.length === pageSize,
      },
    };
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId: string): Promise<any> {
    logger.info('Getting user statistics', { userId });

    // Check cache first
    const cached = statisticsCache.get(userId);
    if (cached) {
      logger.debug('Statistics cache hit', { userId });
      return cached;
    }

    // Query all completed games
    const games = await this.gameRepository.queryByUser(userId, {
      limit: 1000,
      filters: { status: GameStatus.Completed },
    });

    if (games.length === 0) {
      return {
        totalGames: 0,
        totalCompletedGames: 0,
        averageScore: 0,
        bestScore: 0,
        averageCompletionTime: 0,
        fastestCompletionTime: 0,
        totalAttempts: 0,
        averageAttempts: 0,
        favoriteTheme: null,
        favoriteDifficulty: 0,
        currentStreak: 0,
        longestStreak: 0,
      };
    }

    // Calculate statistics
    const scores = games.map((g) => g.score || 0);
    const times = games.map((g) => g.completionTime || 0);
    const attempts = games.map((g) => g.attempts || 0);

    const themeCount = new Map<string, number>();
    games.forEach((g) => {
      themeCount.set(g.themeId, (themeCount.get(g.themeId) || 0) + 1);
    });

    const difficultyCount = new Map<number, number>();
    games.forEach((g) => {
      difficultyCount.set(g.difficulty, (difficultyCount.get(g.difficulty) || 0) + 1);
    });

    const favoriteThemeId = Array.from(themeCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
    const favoriteDifficulty = Array.from(difficultyCount.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    const statistics = {
      totalGames: games.length,
      totalCompletedGames: games.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      bestScore: Math.max(...scores),
      averageCompletionTime: times.reduce((a, b) => a + b, 0) / times.length,
      fastestCompletionTime: Math.min(...times),
      totalAttempts: attempts.reduce((a, b) => a + b, 0),
      averageAttempts: attempts.reduce((a, b) => a + b, 0) / attempts.length,
      favoriteTheme: favoriteThemeId
        ? {
            id: favoriteThemeId,
            name: '', // TODO: Get theme name
          }
        : null,
      favoriteDifficulty: favoriteDifficulty || 0,
      currentStreak: 0, // TODO: Calculate streak
      longestStreak: 0, // TODO: Calculate longest streak
    };

    // Cache for 5 minutes
    statisticsCache.set(userId, statistics);

    logger.info('User statistics calculated', { userId, totalGames: games.length });

    return statistics;
  }

  /**
   * Check if user can start a game
   */
  async canStartGame(userId: string): Promise<CanStartGameResponse> {
    const tier = await this.subscriptionRepository.getTier(userId);
    const limit = this.rateLimiter.getTierLimit(tier);
    const rateLimit = await this.gameRepository.queryByUser(userId, { limit: 1 });

    // TODO: Get actual rate limit from RateLimits table

    return {
      canPlay: true, // TODO: Implement actual check
      rateLimit: {
        tier,
        limit,
        used: 0,
        remaining: limit,
        resetAt: this.rateLimiter.getNextMidnightUTC(),
      },
      message: undefined,
    };
  }
}
