"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameHandler = void 0;
const game_repository_1 = require("../repositories/game.repository");
const rate_limit_repository_1 = require("../repositories/rate-limit.repository");
const achievement_repository_1 = require("../repositories/achievement.repository");
const theme_repository_1 = require("../repositories/theme.repository");
const subscription_repository_1 = require("../repositories/subscription.repository");
const game_catalog_repository_1 = require("../repositories/game-catalog.repository");
const game_service_1 = require("../services/game.service");
const admin_service_1 = require("../services/admin.service");
const stripe_service_1 = require("../services/stripe.service");
const language_handler_1 = require("./language.handler");
const language_repository_1 = require("../repositories/language.repository");
const score_calculator_service_1 = require("../services/score-calculator.service");
const rate_limiter_service_1 = require("../services/rate-limiter.service");
const achievement_tracker_service_1 = require("../services/achievement-tracker.service");
const event_publisher_service_1 = require("../services/event-publisher.service");
const validation_1 = require("../utils/validation");
const error_mapper_1 = require("../utils/error-mapper");
const logger_1 = require("../utils/logger");
/**
 * GraphQL Handler
 * Routes GraphQL operations to appropriate service methods
 */
class GameHandler {
    constructor() {
        // Initialize repositories
        const gameRepository = new game_repository_1.GameRepository();
        const rateLimitRepository = new rate_limit_repository_1.RateLimitRepository();
        const achievementRepository = new achievement_repository_1.AchievementRepository();
        const themeRepository = new theme_repository_1.ThemeRepository();
        this.subscriptionRepository = new subscription_repository_1.SubscriptionRepository();
        this.gameCatalogRepository = new game_catalog_repository_1.GameCatalogRepository();
        // Initialize services
        const scoreCalculator = new score_calculator_service_1.ScoreCalculatorService();
        const rateLimiter = new rate_limiter_service_1.RateLimiterService(rateLimitRepository);
        const achievementTracker = new achievement_tracker_service_1.AchievementTrackerService(achievementRepository, gameRepository);
        const eventPublisher = new event_publisher_service_1.EventPublisherService();
        // Initialize game service
        this.gameService = new game_service_1.GameService(gameRepository, themeRepository, this.subscriptionRepository, scoreCalculator, rateLimiter, achievementTracker, eventPublisher);
        // Initialize admin service
        this.adminService = new admin_service_1.AdminService();
        // Initialize Stripe service
        this.stripeService = new stripe_service_1.StripeService();
        // Initialize language handler
        this.languageHandler = new language_handler_1.LanguageHandler();
        // Initialize language repository for admin functions
        this.languageRepository = new language_repository_1.LanguageRepository();
    }
    /**
     * Handle GraphQL request
     */
    async handleRequest(context) {
        const { query, variables, operationName, userId, username, email } = context;
        try {
            // Parse operation name from query if not provided
            const operation = operationName || this.extractOperationName(query);
            // Normalize operation name to match GraphQL schema field names (camelCase)
            const normalizedOp = operation.charAt(0).toLowerCase() + operation.slice(1);
            logger_1.logger.debug('Handling GraphQL operation', { operation, normalizedOp, userId, username });
            // Route to appropriate resolver
            const result = await this.routeOperation(operation, variables, userId, username, email);
            // Ensure proper GraphQL response format using normalized operation name
            const response = {
                data: {
                    [normalizedOp]: result
                }
            };
            logger_1.logger.debug('GraphQL response prepared', {
                operation: normalizedOp,
                hasResult: !!result,
                resultType: Array.isArray(result) ? 'array' : typeof result,
                resultLength: Array.isArray(result) ? result.length : undefined
            });
            return response;
        }
        catch (error) {
            logger_1.logger.error('GraphQL operation failed', error, {
                operationName,
                userId,
                username,
            });
            const sanitized = (0, error_mapper_1.sanitizeError)(error);
            return {
                errors: [
                    {
                        message: sanitized.message,
                        extensions: {
                            code: sanitized.code || 'INTERNAL_ERROR',
                        },
                    },
                ],
            };
        }
    }
    /**
     * Route operation to appropriate resolver
     */
    async routeOperation(operation, variables = {}, userId, username, email) {
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
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }
    /**
     * Mutation: startGame
     */
    async startGame(userId, input) {
        const validated = (0, validation_1.validateStartGameInput)(input);
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
    async completeGame(userId, input, username) {
        const validated = (0, validation_1.validateCompleteGameInput)(input);
        const result = await this.gameService.completeGame(userId, validated, username || 'Unknown');
        return {
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
        };
    }
    /**
     * Query: getGame
     */
    async getGame(userId, gameId) {
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
    async getGameHistory(userId, input) {
        const validated = (0, validation_1.validateGameHistoryInput)(input);
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
    async getUserStatistics(userId) {
        const stats = await this.gameService.getUserStatistics(userId);
        // Return stats directly, not wrapped in another object
        return stats;
    }
    /**
     * Query: canStartGame
     */
    async canStartGame(userId) {
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
    async listAvailableGames() {
        const games = await this.gameCatalogRepository.getAllGames();
        return games;
    }
    /**
     * Query: getAdminAnalytics (Admin only)
     */
    async getAdminAnalytics(userId, username, email) {
        // Check if user is admin by username or email
        const isAdmin = username === 'dtuleski' ||
            email === 'diego.tuleski@gmail.com' ||
            email === 'diegotuleski@gmail.com';
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
    async listAllUsers(userId, username, email, input) {
        // Check if user is admin by username or email
        const isAdmin = username === 'dtuleski' ||
            email === 'diego.tuleski@gmail.com' ||
            email === 'diegotuleski@gmail.com';
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
    async createCheckoutSession(userId, username, email, input) {
        if (!email) {
            throw new Error('Email required for checkout');
        }
        if (!input?.priceId || !input?.tier) {
            throw new Error('priceId and tier are required');
        }
        logger_1.logger.info('Creating checkout session', { userId, tier: input.tier });
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
    async createPortalSession(userId) {
        logger_1.logger.info('Creating portal session', { userId });
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
    async getAllLanguageWords(userId, username, email) {
        // Check if user is admin
        const isAdmin = username === 'dtuleski' ||
            email === 'diego.tuleski@gmail.com' ||
            email === 'diegotuleski@gmail.com';
        if (!isAdmin) {
            throw new Error('Unauthorized: Admin access required');
        }
        const words = await this.languageRepository.getAllLanguageWords();
        return words;
    }
    /**
     * Query: getLanguageWordById (Admin only)
     */
    async getLanguageWordById(userId, wordId, username, email) {
        // Check if user is admin
        const isAdmin = username === 'dtuleski' ||
            email === 'diego.tuleski@gmail.com' ||
            email === 'diegotuleski@gmail.com';
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
    async updateLanguageWord(userId, input, username, email) {
        // Check if user is admin
        const isAdmin = username === 'dtuleski' ||
            email === 'diego.tuleski@gmail.com' ||
            email === 'diegotuleski@gmail.com';
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
     * Extract operation name from GraphQL query
     */
    extractOperationName(query) {
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
exports.GameHandler = GameHandler;
//# sourceMappingURL=game.handler.js.map