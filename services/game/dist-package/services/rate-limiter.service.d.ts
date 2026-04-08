import { SubscriptionTier } from '@memory-game/shared';
import { RateLimitRepository } from '../repositories/rate-limit.repository';
import { RateLimit } from '../types';
/**
 * Rate Limiter Service
 * Enforces tier-based game limits
 */
export declare class RateLimiterService {
    private rateLimitRepository;
    constructor(rateLimitRepository: RateLimitRepository);
    /**
     * Check if user can start a new game
     * Throws RateLimitError if limit exceeded
     */
    checkLimit(userId: string, tier: SubscriptionTier): Promise<void>;
    /**
     * Increment usage count after game start
     */
    incrementUsage(userId: string): Promise<RateLimit>;
    /**
     * Get rate limit for tier
     */
    getTierLimit(tier: SubscriptionTier): number;
    /**
     * Get next midnight UTC
     */
    getNextMidnightUTC(): Date;
    /**
     * Check if reset time has passed
     */
    private isExpired;
}
//# sourceMappingURL=rate-limiter.service.d.ts.map