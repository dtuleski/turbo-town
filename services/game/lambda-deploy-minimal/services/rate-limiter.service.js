"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiterService = void 0;
const shared_1 = require("@memory-game/shared");
const error_mapper_1 = require("../utils/error-mapper");
const logger_1 = require("../utils/logger");
/**
 * Rate Limiter Service
 * Enforces tier-based game limits
 */
class RateLimiterService {
    constructor(rateLimitRepository) {
        this.rateLimitRepository = rateLimitRepository;
    }
    /**
     * Check if user can start a new game
     * Throws RateLimitError if limit exceeded
     */
    async checkLimit(userId, tier) {
        const limit = this.getTierLimit(tier);
        const rateLimit = await this.rateLimitRepository.get(userId);
        // No rate limit record or expired - create new one
        if (!rateLimit || this.isExpired(rateLimit.resetAt)) {
            await this.rateLimitRepository.reset(userId, tier);
            return;
        }
        // Check if limit exceeded
        if (rateLimit.count >= limit) {
            logger_1.logger.warn('Rate limit exceeded', {
                userId,
                tier,
                count: rateLimit.count,
                limit,
                resetAt: rateLimit.resetAt,
            });
            throw new shared_1.RateLimitError(error_mapper_1.ErrorMessages.RATE_LIMIT_EXCEEDED(rateLimit.resetAt));
        }
        logger_1.logger.debug('Rate limit check passed', {
            userId,
            tier,
            count: rateLimit.count,
            limit,
            remaining: limit - rateLimit.count,
        });
    }
    /**
     * Increment usage count after game start
     */
    async incrementUsage(userId) {
        return this.rateLimitRepository.increment(userId);
    }
    /**
     * Get rate limit for tier
     */
    getTierLimit(tier) {
        switch (tier) {
            case shared_1.SubscriptionTier.Free:
                return 3;
            case shared_1.SubscriptionTier.Light:
                return 20; // Basic plan: $1.99/month
            case shared_1.SubscriptionTier.Standard:
                return 999999; // Premium plan: $9.99/month (unlimited)
            case shared_1.SubscriptionTier.Premium:
                return 999999; // Premium plan: $9.99/month (unlimited)
            default:
                return 3;
        }
    }
    /**
     * Get next midnight UTC
     */
    getNextMidnightUTC() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        return tomorrow;
    }
    /**
     * Check if reset time has passed
     */
    isExpired(resetAt) {
        return new Date(resetAt) < new Date();
    }
}
exports.RateLimiterService = RateLimiterService;
//# sourceMappingURL=rate-limiter.service.js.map