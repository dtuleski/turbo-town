"use strict";
/**
 * Rate Limiting Utility
 *
 * Implements token bucket algorithm for rate limiting using DynamoDB.
 * Default limits: 100 requests per minute per user.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.RateLimitError = void 0;
exports.enforceRateLimit = enforceRateLimit;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
class RateLimitError extends Error {
    constructor(message, retryAfter, remainingTokens) {
        super(message);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
        this.remainingTokens = remainingTokens;
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Rate Limiter class implementing token bucket algorithm
 */
class RateLimiter {
    constructor(dynamoClient, config = {}) {
        this.client = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
        this.config = {
            capacity: config.capacity || 100,
            refillRate: config.refillRate || 100, // 100 tokens per minute
            tableName: config.tableName || process.env.RATE_LIMIT_TABLE_NAME || 'RateLimitBuckets',
        };
    }
    /**
     * Check if request is allowed and consume a token if so
     *
     * @param userId - User ID to check rate limit for
     * @returns RateLimitResult with allowed status and remaining tokens
     */
    async checkRateLimit(userId) {
        const bucket = await this.getBucket(userId);
        const now = Date.now();
        // Refill tokens based on time elapsed
        const elapsedMs = now - bucket.lastRefill;
        const elapsedMinutes = elapsedMs / 60000; // Convert to minutes
        const tokensToAdd = Math.floor(elapsedMinutes * this.config.refillRate);
        if (tokensToAdd > 0) {
            bucket.tokens = Math.min(this.config.capacity, bucket.tokens + tokensToAdd);
            bucket.lastRefill = now;
        }
        // Check if tokens available
        if (bucket.tokens > 0) {
            bucket.tokens -= 1;
            await this.updateBucket(bucket);
            return {
                allowed: true,
                remainingTokens: bucket.tokens,
                resetTime: this.calculateResetTime(bucket),
            };
        }
        // Rate limit exceeded
        const resetTime = this.calculateResetTime(bucket);
        const retryAfter = Math.ceil((resetTime - now) / 1000); // Convert to seconds
        return {
            allowed: false,
            remainingTokens: 0,
            resetTime,
            retryAfter,
        };
    }
    /**
     * Get rate limit bucket for user, creating if doesn't exist
     *
     * @param userId - User ID
     * @returns RateLimitBucket
     */
    async getBucket(userId) {
        try {
            const result = await this.client.send(new lib_dynamodb_1.GetCommand({
                TableName: this.config.tableName,
                Key: { userId },
            }));
            if (result.Item) {
                return result.Item;
            }
            // Create new bucket with full capacity
            const now = Date.now();
            return {
                userId,
                tokens: this.config.capacity,
                lastRefill: now,
                expiresAt: Math.floor(now / 1000) + 3600, // Expire in 1 hour
            };
        }
        catch (error) {
            throw new Error(`Failed to get rate limit bucket: ${error.message}`);
        }
    }
    /**
     * Update rate limit bucket in DynamoDB
     *
     * @param bucket - RateLimitBucket to update
     */
    async updateBucket(bucket) {
        try {
            // Update TTL to 1 hour from now
            bucket.expiresAt = Math.floor(Date.now() / 1000) + 3600;
            await this.client.send(new lib_dynamodb_1.PutCommand({
                TableName: this.config.tableName,
                Item: bucket,
            }));
        }
        catch (error) {
            throw new Error(`Failed to update rate limit bucket: ${error.message}`);
        }
    }
    /**
     * Calculate when bucket will have at least 1 token
     *
     * @param bucket - Current bucket state
     * @returns Timestamp in milliseconds
     */
    calculateResetTime(bucket) {
        if (bucket.tokens > 0) {
            return Date.now();
        }
        // Calculate time needed to refill 1 token
        const timePerToken = 60000 / this.config.refillRate; // milliseconds per token
        return bucket.lastRefill + timePerToken;
    }
    /**
     * Get current rate limit status without consuming a token
     *
     * @param userId - User ID
     * @returns Current token count and reset time
     */
    async getRateLimitStatus(userId) {
        const bucket = await this.getBucket(userId);
        const now = Date.now();
        // Calculate tokens with refill but don't update
        const elapsedMs = now - bucket.lastRefill;
        const elapsedMinutes = elapsedMs / 60000;
        const tokensToAdd = Math.floor(elapsedMinutes * this.config.refillRate);
        const currentTokens = Math.min(this.config.capacity, bucket.tokens + tokensToAdd);
        return {
            remainingTokens: currentTokens,
            resetTime: this.calculateResetTime(bucket),
        };
    }
    /**
     * Reset rate limit for a user (admin function)
     *
     * @param userId - User ID to reset
     */
    async resetRateLimit(userId) {
        const now = Date.now();
        const bucket = {
            userId,
            tokens: this.config.capacity,
            lastRefill: now,
            expiresAt: Math.floor(now / 1000) + 3600,
        };
        await this.updateBucket(bucket);
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Middleware-style function to check rate limit and throw error if exceeded
 *
 * @param rateLimiter - RateLimiter instance
 * @param userId - User ID to check
 * @throws RateLimitError if rate limit exceeded
 * @returns RateLimitResult if allowed
 */
async function enforceRateLimit(rateLimiter, userId) {
    const result = await rateLimiter.checkRateLimit(userId);
    if (!result.allowed) {
        throw new RateLimitError('Rate limit exceeded. Please try again later.', result.retryAfter, result.remainingTokens);
    }
    return result;
}
//# sourceMappingURL=ratelimit.util.js.map