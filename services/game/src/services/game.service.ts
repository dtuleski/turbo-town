import { Game, GameStatus, SubscriptionTier, AuthorizationError, NotFoundError, ValidationError } from '@memory-game/shared';
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
import {
  CIRCUIT_BUILDER_THEME_ID,
  CIRCUIT_SUBMISSION_REJECTED_MESSAGE,
} from '../utils/circuit-builder';
import { validateCircuitSubmission } from '../utils/circuit-validation';
import { reevaluateCircuitSubmission } from './circuit-reevaluation.service';

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

    // Check if game requires a paid subscription (any tier above FREE)
    const PAID_GAMES = ['SPACE_ENTRY', 'SCRATCH_CODING', 'BOND_AND_BURN', 'TRAFFIC_LAB', 'MINI_GOLF', 'LANGUAGE_PRONUNCIATION', CIRCUIT_BUILDER_THEME_ID];
    if (PAID_GAMES.includes(input.themeId) && tier === SubscriptionTier.Free) {
      throw new AuthorizationError('This game requires a paid subscription. Upgrade to play!');
    }

    // Super Hard difficulty (4) requires paid subscription on any game
    if (input.difficulty >= 4 && tier === SubscriptionTier.Free) {
      throw new AuthorizationError('Super Hard difficulty requires a paid subscription. Upgrade to play!');
    }

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

    // Circuit Builder is scored from a server-re-evaluated layout, not from client-reported
    // attempts/accuracy, so it takes its own path. Every other game is untouched: this branch
    // returns before any of the generic logic below runs.
    if (game.themeId === CIRCUIT_BUILDER_THEME_ID) {
      return this.completeCircuitBuilderGame(userId, input, username, game);
    }

    // Validate completion time
    const timeValidation = validateCompletionTime(input.completionTime, game.difficulty);
    if (!timeValidation.valid) {
      throw new AuthorizationError(timeValidation.reason!);
    }

    // Validate attempts (only for Memory Match which uses pairs-based logic)
    if (!['MATH_CHALLENGE', 'WORD_PUZZLE', 'LANGUAGE_LEARNING', 'LANGUAGE_PRONUNCIATION', 'SUDOKU', 'JIGSAW_PUZZLE', 'BUBBLE_POP', 'SEQUENCE_MEMORY', 'CODE_A_BOT', 'GEO_QUIZ', 'HISTORY_QUIZ', 'CIVICS_QUIZ', 'COLOR_BY_NUMBER', 'HANGMAN', 'TIC_TAC_TOE', 'MATH_MAZE', 'PATTERN_RECALL', 'SPACE_ENTRY', 'SCRATCH_CODING', 'BOND_AND_BURN', 'TRAFFIC_LAB', 'MINI_GOLF'].includes(game.themeId)) {
      const attemptsValidation = validateAttempts(input.attempts, game.difficulty);
      if (!attemptsValidation.valid) {
        throw new AuthorizationError(attemptsValidation.reason!);
      }
    }

    // Calculate accuracy for non-Memory-Match games BEFORE score calculation
    let preAccuracy: number | undefined
    if (['MATH_CHALLENGE', 'WORD_PUZZLE', 'LANGUAGE_LEARNING', 'LANGUAGE_PRONUNCIATION', 'SUDOKU', 'JIGSAW_PUZZLE', 'BUBBLE_POP', 'SEQUENCE_MEMORY', 'CODE_A_BOT', 'GEO_QUIZ', 'HISTORY_QUIZ', 'CIVICS_QUIZ', 'COLOR_BY_NUMBER', 'HANGMAN', 'TIC_TAC_TOE', 'MATH_MAZE', 'PATTERN_RECALL', 'SPACE_ENTRY', 'SCRATCH_CODING', 'BOND_AND_BURN', 'TRAFFIC_LAB', 'MINI_GOLF'].includes(game.themeId)) {
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
      preAccuracy,
      game.themeId
    );

    // Apply score cap based on game type and difficulty
    const PREMIUM_GAME_THEMES = ['SCRATCH_CODING', 'SPACE_ENTRY', 'BOND_AND_BURN', 'TRAFFIC_LAB', 'MINI_GOLF', 'LANGUAGE_PRONUNCIATION'];
    let scoreCap: number;
    if (game.themeId === 'MINI_GOLF') {
      // Mini Golf: no hard cap — let speed differentiate top players
      scoreCap = 99999; // effectively uncapped
    } else if (game.difficulty >= 4) {
      // Super Hard difficulty on any game caps at 8000
      scoreCap = 8000;
    } else if (PREMIUM_GAME_THEMES.includes(game.themeId)) {
      scoreCap = 8000;
    } else {
      scoreCap = 6000;
    }
    const score = Math.min(scoreBreakdownForEvent.finalScore, scoreCap);
    
    // Update breakdown to reflect capped score
    if (scoreBreakdownForEvent.finalScore > scoreCap) {
      scoreBreakdownForEvent.finalScore = scoreCap;
    }

    // Update game record
    const completedGame = await this.gameRepository.update(input.gameId, {
      status: GameStatus.Completed,
      completedAt: new Date(),
      completionTime: input.completionTime,
      attempts: input.attempts,
      score,
    }, userId);

    // Track achievements (non-blocking — don't let failures prevent leaderboard recording)
    let achievements: any[] = [];
    try {
      achievements = await this.achievementTracker.trackCompletion(
        userId,
        input.gameId,
        game.difficulty,
        input.completionTime,
        input.attempts,
        game.themeId
      );
    } catch (achievementError) {
      logger.error('Achievement tracking failed', achievementError as Error, { userId, gameId: input.gameId });
    }

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
    } else if (game.themeId === 'LANGUAGE_PRONUNCIATION') {
      gameType = 'LANGUAGE_PRONUNCIATION';
      // For Language Pronunciation: accuracy = correctAnswers (words scored >= 71) / totalQuestions
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
    } else if (game.themeId === 'SCRATCH_CODING') {
      gameType = 'SCRATCH_CODING';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'BOND_AND_BURN') {
      gameType = 'BOND_AND_BURN';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'TRAFFIC_LAB') {
      gameType = 'TRAFFIC_LAB';
      const correctAnswers = input.correctAnswers || 0;
      const totalQuestions = input.totalQuestions || 1;
      accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (totalQuestions || 1)));
    } else if (game.themeId === 'MINI_GOLF') {
      gameType = 'MINI_GOLF';
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

    // Use the same score breakdown that was used to compute the stored score
    const scoreBreakdown = scoreBreakdownForEvent;

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
   * Complete a Circuit Builder game (S3).
   *
   * Authoritative path: the submitted layout is bounded (E1), re-evaluated by the shared
   * engine and checked against the level's success predicate (E2), and only then scored from
   * server-verified metrics (E3). The client's own claim of success or score is never read.
   *
   * Fails closed at every step (SECURITY-11, SECURITY-15): each rejection below happens
   * BEFORE the game record is updated, so a refused submission writes no score, publishes no
   * leaderboard event, emits no metric, and leaves the game IN_PROGRESS for another attempt.
   * Every cause throws the identical generic message, so a probing client gets no oracle
   * telling it which bound it hit.
   *
   * Nothing from the submitted layout is ever logged - no layout, no serialized payload, no
   * token, no PII (NFR-CB-20, SECURITY-03). Only whitelisted scalars travel to CloudWatch.
   */
  private async completeCircuitBuilderGame(
    userId: string,
    input: CompleteGameInput,
    username: string,
    game: Game
  ): Promise<CompleteGameResponse> {
    // E1: bounded validation before any processing.
    const validated = validateCircuitSubmission(input.circuitSubmission, input.completionTime);
    if (!validated.ok) {
      logger.warn('Circuit submission rejected', {
        userId,
        gameId: input.gameId,
        stage: 'validation',
      });
      throw new ValidationError(CIRCUIT_SUBMISSION_REJECTED_MESSAGE);
    }
    const submission = validated.value;

    // Reuse the existing per-difficulty completion-time floor, but surface the same generic
    // message rather than the helper's descriptive reason.
    const timeValidation = validateCompletionTime(submission.completionTime, game.difficulty);
    if (!timeValidation.valid) {
      logger.warn('Circuit submission rejected', {
        userId,
        gameId: input.gameId,
        levelId: submission.levelId,
        stage: 'completionTime',
      });
      throw new ValidationError(CIRCUIT_SUBMISSION_REJECTED_MESSAGE);
    }

    // E2: authoritative re-evaluation against the claimed level.
    const reevaluation = reevaluateCircuitSubmission(submission, game.difficulty);
    if (!reevaluation.ok) {
      logger.warn('Circuit submission rejected', {
        userId,
        gameId: input.gameId,
        levelId: submission.levelId,
        stage: 'reevaluation',
        reason: reevaluation.reason,
        errorCode: reevaluation.errorCode,
        elementCount: submission.layout.elements.length,
      });
      throw new ValidationError(CIRCUIT_SUBMISSION_REJECTED_MESSAGE);
    }

    // E3: score from server-verified metrics only.
    const scoreBreakdown = this.scoreCalculator.calculateCircuitBuilderBreakdown(
      reevaluation.verifiedMetrics,
      reevaluation.level,
      game.difficulty
    );
    const score = scoreBreakdown.finalScore;

    // `attempts` is stored as 1: the schema requires the field, and Circuit Builder has no
    // attempt concept. It is deliberately not overloaded with the component count, which the
    // leaderboard's anomaly service would read as an attempt count.
    const completedGame = await this.gameRepository.update(input.gameId, {
      status: GameStatus.Completed,
      completedAt: new Date(),
      completionTime: submission.completionTime,
      attempts: 1,
      score,
    }, userId);

    // Track achievements (non-blocking — same contract as the generic path)
    let achievements: any[] = [];
    try {
      achievements = await this.achievementTracker.trackCompletion(
        userId,
        input.gameId,
        game.difficulty,
        submission.completionTime,
        1,
        game.themeId
      );
    } catch (achievementError) {
      logger.error('Achievement tracking failed', achievementError as Error, { userId, gameId: input.gameId });
    }

    const tier = await this.subscriptionRepository.getTier(userId);
    await metricsPublisher.publishGameCompleted(game.difficulty, tier, score);

    const completionTimeSeconds = Math.max(1, completedGame.completionTime!);

    await this.eventPublisher.publishGameCompleted({
      gameId: input.gameId,
      userId: completedGame.userId,
      username: username,
      gameType: CIRCUIT_BUILDER_THEME_ID,
      difficulty: game.difficulty <= 1 ? 'EASY' : game.difficulty <= 2 ? 'MEDIUM' : 'HARD',
      score,
      completionTime: completionTimeSeconds,
      accuracy: scoreBreakdown.accuracy,
      performanceMetrics: {
        // hintsUsed and pauseCount are fixed at 0 rather than echoed from the client: Circuit
        // Builder has no hint or pause mechanism, and the leaderboard's anomaly service reads
        // these fields, so feeding it unverified numbers would be worse than feeding it none.
        // averageResponseTime is the completion time, this game having one submission.
        attempts: 1,
        hintsUsed: 0,
        pauseCount: 0,
        averageResponseTime: completionTimeSeconds,
      },
      timestamp: new Date().toISOString(),
    });

    statisticsCache.delete(userId);

    logger.info('Circuit Builder game completed', {
      userId,
      gameId: completedGame.id,
      levelId: submission.levelId,
      componentCount: reevaluation.verifiedMetrics.componentCount,
      faultCount: reevaluation.verifiedMetrics.faultCount,
      unresolvedFaultCount: reevaluation.verifiedMetrics.unresolvedFaultCount,
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
