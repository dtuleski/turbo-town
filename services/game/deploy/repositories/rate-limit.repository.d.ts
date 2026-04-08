import { SubscriptionTier } from '@memory-game/shared';
import { RateLimit, RateLimitRepository as IRateLimitRepository } from '../types';
export declare class RateLimitRepository implements IRateLimitRepository {
    /**
     * Get rate limit for user
     */
    get(userId: string): Promise<RateLimit | null>;
    /**
     * Create or update rate limit
     */
    upsert(rateLimit: RateLimit): Promise<RateLimit>;
    /**
     * Increment usage count
     */
    increment(userId: string): Promise<RateLimit>;
    /**
     * Reset rate limit (called at midnight UTC)
     */
    reset(userId: string, tier: SubscriptionTier): Promise<RateLimit>;
}
//# sourceMappingURL=rate-limit.repository.d.ts.map