"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const shared_1 = require("@memory-game/shared");
const validation_1 = require("../utils/validation");
const error_mapper_1 = require("../utils/error-mapper");
const logger_1 = require("../utils/logger");
const metrics_1 = require("../utils/metrics");
const cache_1 = require("../utils/cache");
/**
 * Game Service
 * Core business logic for game lifecycle management
 */
class GameService {
    constructor(gameRepository, themeRepository, subscriptionRepository, scoreCalculator, rateLimiter, achievementTracker, eventPublisher) {
        this.gameRepository = gameRepository;
        this.themeRepository = themeRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.scoreCalculator = scoreCalculator;
        this.rateLimiter = rateLimiter;
        this.achievementTracker = achievementTracker;
        this.eventPublisher = eventPublisher;
    }
    /**
     * Start a new game
     */
    async startGame(userId, input) {
        logger_1.logger.info('Starting game', { userId, themeId: input.themeId, difficulty: input.difficulty });
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
            status: shared_1.GameStatus.InProgress,
            startedAt: new Date(),
            attempts: 0,
            score: 0,
        });
        // Increment rate limit usage
        const rateLimit = await this.rateLimiter.incrementUsage(userId);
        // Publish metrics
        await metrics_1.metricsPublisher.publishGameStarted(input.difficulty, tier);
        // Build rate limit info
        const limit = this.rateLimiter.getTierLimit(tier);
        const rateLimitInfo = {
            tier,
            limit,
            used: rateLimit.count,
            remaining: limit - rateLimit.count,
            resetAt: rateLimit.resetAt,
        };
        logger_1.logger.info('Game started successfully', {
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
    async completeGame(userId, input, username) {
        logger_1.logger.info('Completing game', { userId, gameId: input.gameId });
        // Get game
        const game = await this.gameRepository.getById(input.gameId, userId);
        if (!game) {
            throw new shared_1.NotFoundError(error_mapper_1.ErrorMessages.GAME_NOT_FOUND);
        }
        // Verify ownership
        if (game.userId !== userId) {
            throw new shared_1.AuthorizationError(error_mapper_1.ErrorMessages.GAME_NOT_OWNED);
        }
        // Verify game status
        if (game.status !== shared_1.GameStatus.InProgress) {
            throw new shared_1.AuthorizationError(error_mapper_1.ErrorMessages.GAME_ALREADY_COMPLETED);
        }
        // Validate completion time
        const timeValidation = (0, validation_1.validateCompletionTime)(input.completionTime, game.difficulty);
        if (!timeValidation.valid) {
            throw new shared_1.AuthorizationError(timeValidation.reason);
        }
        // Validate attempts (only for Memory Match which uses pairs-based logic)
        if (!['MATH_CHALLENGE', 'WORD_PUZZLE', 'LANGUAGE_LEARNING'].includes(game.themeId)) {
            const attemptsValidation = (0, validation_1.validateAttempts)(input.attempts, game.difficulty);
            if (!attemptsValidation.valid) {
                throw new shared_1.AuthorizationError(attemptsValidation.reason);
            }
        }
        // Calculate score
        const score = this.scoreCalculator.calculateScore(game.difficulty, input.completionTime, input.attempts);
        // Update game record
        const completedGame = await this.gameRepository.update(input.gameId, {
            status: shared_1.GameStatus.Completed,
            completedAt: new Date(),
            completionTime: input.completionTime,
            attempts: input.attempts,
            score,
        }, userId);
        // Track achievements (synchronous)
        const achievements = await this.achievementTracker.trackCompletion(userId, input.gameId, game.difficulty, input.completionTime, input.attempts, game.themeId);
        // Get user tier for metrics
        const tier = await this.subscriptionRepository.getTier(userId);
        // Publish metrics
        await metrics_1.metricsPublisher.publishGameCompleted(game.difficulty, tier, score);
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
        }
        else if (game.themeId === 'WORD_PUZZLE') {
            gameType = 'WORD_PUZZLE';
            // For Word Puzzle: accuracy = wordsFound / totalWords
            const wordsFound = input.wordsFound || 0;
            const totalWords = input.totalWords || 1;
            accuracy = totalWords > 0 ? wordsFound / totalWords : 0;
            avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / (wordsFound || 1)));
        }
        else if (game.themeId === 'LANGUAGE_LEARNING') {
            gameType = 'LANGUAGE_LEARNING';
            // For Language Learning: accuracy = correctAnswers / totalQuestions
            const correctAnswers = input.correctAnswers || 0;
            const totalQuestions = input.totalQuestions || 1;
            accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
            avgResponseTimeSeconds = Math.max(1, Math.round(input.completionTime / totalQuestions));
        }
        else {
            // Memory Match (default)
            // Map difficulty to pairs: 1->6, 2->12, 3->18, 4->24, 5->30
            const pairsMap = { 1: 6, 2: 12, 3: 18, 4: 24, 5: 30 };
            const pairs = pairsMap[game.difficulty] || 12;
            const minAttempts = pairs * 2; // Perfect game = 2 attempts per pair
            accuracy = Math.max(0, Math.min(1, 1 - (input.attempts - minAttempts) / minAttempts));
            avgResponseTimeSeconds = Math.max(1, Math.round(completedGame.completionTime / input.attempts));
        }
        // Publish GameCompleted event
        // completionTime is already in seconds from the input
        // Ensure minimum 1 second to avoid validation errors
        const completionTimeSeconds = Math.max(1, completedGame.completionTime);
        logger_1.logger.info('Publishing GameCompleted event', {
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
            gameType: gameType,
            difficulty: game.difficulty <= 3 ? 'EASY' : game.difficulty <= 5 ? 'MEDIUM' : 'HARD',
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
        cache_1.statisticsCache.delete(userId);
        logger_1.logger.info('Game completed successfully', {
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
    async getGame(userId, gameId) {
        const game = await this.gameRepository.getById(gameId, userId);
        if (!game) {
            throw new shared_1.NotFoundError(error_mapper_1.ErrorMessages.GAME_NOT_FOUND);
        }
        // Verify ownership
        if (game.userId !== userId) {
            throw new shared_1.AuthorizationError(error_mapper_1.ErrorMessages.GAME_NOT_OWNED);
        }
        return game;
    }
    /**
     * Get game history (paid users only)
     */
    async getGameHistory(userId, input) {
        logger_1.logger.info('Getting game history', { userId, input });
        // Check subscription tier
        const tier = await this.subscriptionRepository.getTier(userId);
        if (tier === shared_1.SubscriptionTier.Free) {
            throw new shared_1.AuthorizationError(error_mapper_1.ErrorMessages.PAID_FEATURE_REQUIRED('Game history', ['LIGHT', 'STANDARD', 'PREMIUM']));
        }
        // Build filters
        const filters = {
            status: shared_1.GameStatus.Completed,
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
    async getUserStatistics(userId) {
        logger_1.logger.info('Getting user statistics', { userId });
        // Check cache first
        const cached = cache_1.statisticsCache.get(userId);
        if (cached) {
            logger_1.logger.debug('Statistics cache hit', { userId });
            return cached;
        }
        // Query all completed games
        const games = await this.gameRepository.queryByUser(userId, {
            limit: 1000,
            filters: { status: shared_1.GameStatus.Completed },
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
        const themeCount = new Map();
        games.forEach((g) => {
            themeCount.set(g.themeId, (themeCount.get(g.themeId) || 0) + 1);
        });
        const difficultyCount = new Map();
        games.forEach((g) => {
            difficultyCount.set(g.difficulty, (difficultyCount.get(g.difficulty) || 0) + 1);
        });
        const favoriteThemeId = Array.from(themeCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
        const favoriteDifficulty = Array.from(difficultyCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
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
        cache_1.statisticsCache.set(userId, statistics);
        logger_1.logger.info('User statistics calculated', { userId, totalGames: games.length });
        return statistics;
    }
    /**
     * Check if user can start a game
     */
    async canStartGame(userId) {
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
exports.GameService = GameService;
//# sourceMappingURL=game.service.js.map