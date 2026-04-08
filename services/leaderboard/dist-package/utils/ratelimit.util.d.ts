/**
 * Rate Limiting Utility
 *
 * Implements token bucket algorithm for rate limiting using DynamoDB.
 * Default limits: 100 requests per minute per user.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
export interface RateLimitBucket {
    userId: string;
    tokens: number;
    lastRefill: number;
    expiresAt: number;
}
export interface RateLimitConfig {
    capacity: number;
    refillRate: number;
    tableName: string;
}
export interface RateLimitResult {
    allowed: boolean;
    remainingTokens: number;
    resetTime: number;
    retryAfter?: number;
}
export declare class RateLimitError extends Error {
    readonly retryAfter: number;
    readonly remainingTokens: number;
    constructor(message: string, retryAfter: number, remainingTokens: number);
}
/**
 * Rate Limiter class implementing token bucket algorithm
 */
export declare class RateLimiter {
    private client;
    private config;
    constructor(dynamoClient: DynamoDBClient, config?: Partial<RateLimitConfig>);
    /**
     * Check if request is allowed and consume a token if so
     *
     * @param userId - User ID to check rate limit for
     * @returns RateLimitResult with allowed status and remaining tokens
     */
    checkRateLimit(userId: string): Promise<RateLimitResult>;
    /**
     * Get rate limit bucket for user, creating if doesn't exist
     *
     * @param userId - User ID
     * @returns RateLimitBucket
     */
    private getBucket;
    /**
     * Update rate limit bucket in DynamoDB
     *
     * @param bucket - RateLimitBucket to update
     */
    private updateBucket;
    /**
     * Calculate when bucket will have at least 1 token
     *
     * @param bucket - Current bucket state
     * @returns Timestamp in milliseconds
     */
    private calculateResetTime;
    /**
     * Get current rate limit status without consuming a token
     *
     * @param userId - User ID
     * @returns Current token count and reset time
     */
    getRateLimitStatus(userId: string): Promise<{
        remainingTokens: number;
        resetTime: number;
    }>;
    /**
     * Reset rate limit for a user (admin function)
     *
     * @param userId - User ID to reset
     */
    resetRateLimit(userId: string): Promise<void>;
}
/**
 * Middleware-style function to check rate limit and throw error if exceeded
 *
 * @param rateLimiter - RateLimiter instance
 * @param userId - User ID to check
 * @throws RateLimitError if rate limit exceeded
 * @returns RateLimitResult if allowed
 */
export declare function enforceRateLimit(rateLimiter: RateLimiter, userId: string): Promise<RateLimitResult>;
//# sourceMappingURL=ratelimit.util.d.ts.map