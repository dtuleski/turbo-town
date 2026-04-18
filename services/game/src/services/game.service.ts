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
  async completeGame(userId: string, input: CompleteGameInput, username: string): Promise<CompleteGameResponse> {
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

    // Validate attempts (only for Memory Match which uses pairs-based logic)
    if (!['MATH_CHALLENGE', 'WORD_PUZZLE', 'LANGUAGE_LEARNING', 'SUDOKU', 'JIGSAW_PUZZLE', 'BUBBLE_POP', 'SEQUENCE_MEMORY', 'CODE_A_BOT', 'GEO_QUIZ', 'HISTORY_QUIZ', 'CIVICS_QUIZ', 'COLOR_BY_NUMBER', 'HANGMAN', 'TIC_TAC_TOE', 'MATH_MAZE', 'PATTERN_RECALL', 'SPACE_ENTRY'].includes(game.themeId)) {
      const attemptsValidation = validateAttempts(input.attempts, game.difficulty);
      if (!attemptsValidation.valid) {
        throw new AuthorizationError(attemptsValidation.reason!);
      }
    }

    // Calculate accuracy for non-Memory-Match games BEFORE score calculation
    let preAccuracy: number | undefined
    if (['MATH_CHALLENGE', 'WORD_PUZZLE', 'LANGUAGE_LEARNING', 'SUDOKU', 'JIGSAW_PUZZLE', 'BUBBLE_POP', 'SEQUENCE_MEMORY', 'CODE_A_BOT', 'GEO_QUIZ', 'HISTORY_QUIZ', 'CIVICS_QUIZ', 'COLOR_BY_NUMBER', 'HANGMAN', 'TIC_TAC_TOE', 'MATH_MAZE', 'PATTERN_RECALL', 'SPACE_ENTRY'].includes(game.themeId)) {
      if (game.themeId === 'WORD_PUZZLE') {
        const wordsFound = input.wordsFound || 0;
        const totalWords = input.totalWords || 1;
        preAccuracy = totalWords > 0 ? wordsFound / totalWords : 0;
      } else {
        const correctAnswers = input.correctAnswers || 0;
        const totalQuestions = input.totalQuestions || 1;
        preAccuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      }
    }

    // Calculate score (with accuracy override for non-Memory-Match games)
    const scoreBreakdownForEvent = this.scoreCalculator.calculateScoreBreakdown(
      game.difficulty,
      input.completionTime,
      input.attempts,
      preAccuracy
    );
    const score = scoreBreakdownForEvent.finalScore;

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

    // Calculate accuracy and performance metrics based on game type
    let accuracy = 0;
    let avgResponseTimeSeconds = 1;
    let gameType = 'MEMORY_MATCH'; // Default
    
    // Determine game type from themeId
    if (game.themeId === 'MATH_CHALLENGE') {
      gameType = 'MATH_CHALLENGE';
      // For Math Challenge: accuracy = correctAnswers / totalQuestions
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / totalQuestions));
    } else if (game.themeId === 'WORD_PUZZLE') {
      gameType = 'WORD_PUZZLE';
      // For Word Puzzle: accuracy = wordsFound / totalWords
      const wordsFound = input.wordsFound || 0;
      const totalWords = input.totalWords || 1;
      accuracy = totalWords > 0 ? wordsFound / totalWords : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (wordsFound || 1)));
    } else if (game.themeId === 'LANGUAGE_LEARNING') {
      gameType = 'LANGUAGE_LEARNING';
      // For Language Learning: accuracy = correctAnswers / totalQuestions
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / totalQuestions));
    } else if (game.themeId === 'SUDOKU') {
      gameType = 'SUDOKU';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / totalQuestions));
    } else if (game.themeId === 'JIGSAW_PUZZLE') {
      gameType = 'JIGSAW_PUZZLE';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'BUBBLE_POP') {
      gameType = 'BUBBLE_POP';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'SEQUENCE_MEMORY') {
      gameType = 'SEQUENCE_MEMORY';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'CODE_A_BOT') {
      gameType = 'CODE_A_BOT';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'GEO_QUIZ') {
      gameType = 'GEO_QUIZ';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'HISTORY_QUIZ') {
      gameType = 'HISTORY_QUIZ';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'CIVICS_QUIZ') {
      gameType = 'CIVICS_QUIZ';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'COLOR_BY_NUMBER') {
      gameType = 'COLOR_BY_NUMBER';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'HANGMAN') {
      gameType = 'HANGMAN';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'TIC_TAC_TOE') {
      gameType = 'TIC_TAC_TOE';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'MATH_MAZE') {
      gameType = 'MATH_MAZE';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'PATTERN_RECALL') {
      gameType = 'PATTERN_RECALL';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'SPACE_ENTRY') {
      gameType = 'SPACE_ENTRY';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else {
      // Memory Match (default)
      // Map difficulty to pairs: 1->6, 2->12, 3->18, 4->24, 5->30
      const pairsMap: Record<number, number> = { 1: 6, 2: 12, 3: 18, 4: 24, 5: 30 };
      const pairs = pairsMap[game.difficulty] || 12;
      const minAttempts = pairs * 2; // Perfect game = 2 attempts per pair
      accuracy = Math.max(0, Math.min(1, 1 - (input.attempts - minAttempts) / minAttempts));
      avgResponseTimeSeconds = Math.max(1, Math.round(completedGame.completionTime! / input.attempts));
    }

    // Publish GameCompleted event
    // completionTime is already in seconds from the input
    // Ensure minimum 1 second to avoid validation errors
    const completionTimeSeconds = Math.max(1, completedGame.completionTime!);

    logger.info('Publishing GameCompleted event', {
      gameId: input.gameId,
      userId: completedGame.userId,
      username: username,
      gameType,
      completionTimeSeconds,
    });

    await this.eventPublisher.publishGameCompleted({
      gameId: input.gameId, // Use input.gameId instead of completedGame.id
      userId: completedGame.userId,
      username: username,
      gameType: gameType as any,
      difficulty: game.difficulty <= 1 ? 'EASY' : game.difficulty <= 2 ? 'MEDIUM' : 'HARD',
      score: score, // Include the calculated score
      completionTime: completionTimeSeconds,
      accuracy: accuracy,
      performanceMetrics: {
        attempts: input.attempts,
        correctAnswers: input.correctAnswers,
        totalQuestions: input.totalQuestions,
        wordsFound: input.wordsFound,
        totalWords: input.totalWords,
        hintsUsed: input.hintsUsed || 0,
        pauseCount: input.pauseCount || 0,
        averageResponseTime: avgResponseTimeSeconds,
      },
      timestamp: new Date().toISOString(),
    });

    // Invalidate statistics cache
    statisticsCache.delete(userId);

    // Calculate score breakdown for frontend display
    const scoreBreakdown = this.scoreCalculator.calculateScoreBreakdown(
      game.difficulty,
      input.completionTime,
      input.attempts,
      accuracy
    );

    logger.info('Game completed successfully', {
      userId,
      gameId: completedGame.id,
      score,
      achievementsUnlocked: achievements.length,
    });

    return {
      game: completedGame,
      achievements,
      scoreBreakdown,
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
