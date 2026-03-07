import { SubscriptionTier, RateLimitError } from '@memory-game/shared';
import { RateLimitRepository } from '../repositories/rate-limit.repository';
import { RateLimit } from '../types';
import { ErrorMessages } from '../utils/error-mapper';
import { logger } from '../utils/logger';

/**
 * Rate Limiter Service
 * Enforces tier-based game limits
 */

export class RateLimiterService {
  constructor(private rateLimitRepository: RateLimitRepository) {}

  /**
   * Check if user can start a new game
   * Throws RateLimitError if limit exceeded
   */
  async checkLimit(userId: string, tier: SubscriptionTier): Promise<void> {
    const limit = this.getTierLimit(tier);
    const rateLimit = await this.rateLimitRepository.get(userId);

    // No rate limit record or expired - create new one
    if (!rateLimit || this.isExpired(rateLimit.resetAt)) {
      await this.rateLimitRepository.reset(userId, tier);
      return;
    }

    // Check if limit exceeded
    if (rateLimit.count >= limit) {
      logger.warn('Rate limit exceeded', {
        userId,
        tier,
        count: rateLimit.count,
        limit,
        resetAt: rateLimit.resetAt,
      });

      throw new RateLimitError(ErrorMessages.RATE_LIMIT_EXCEEDED(rateLimit.resetAt));
    }

    logger.debug('Rate limit check passed', {
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
  async incrementUsage(userId: string): Promise<RateLimit> {
    return this.rateLimitRepository.increment(userId);
  }

  /**
   * Get rate limit for tier
   */
  getTierLimit(tier: SubscriptionTier): number {
    switch (tier) {
      case SubscriptionTier.Free:
        return 3;
      case SubscriptionTier.Light:
        return 20; // Basic plan: $1.99/month
      case SubscriptionTier.Standard:
        return 999999; // Premium plan: $9.99/month (unlimited)
      case SubscriptionTier.Premium:
        return 999999; // Premium plan: $9.99/month (unlimited)
      default:
        return 3;
    }
  }

  /**
   * Get next midnight UTC
   */
  getNextMidnightUTC(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Check if reset time has passed
   */
  private isExpired(resetAt: Date): boolean {
    return new Date(resetAt) < new Date();
  }
}
