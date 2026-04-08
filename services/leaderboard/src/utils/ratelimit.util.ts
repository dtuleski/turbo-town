/**
 * Rate Limiting Utility
 * 
 * Implements token bucket algorithm for rate limiting using DynamoDB.
 * Default limits: 100 requests per minute per user.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

export interface RateLimitBucket {
  userId: string;
  tokens: number;
  lastRefill: number; // Timestamp in milliseconds
  expiresAt: number; // TTL for DynamoDB (Unix timestamp in seconds)
}

export interface RateLimitConfig {
  capacity: number; // Maximum tokens in bucket
  refillRate: number; // Tokens added per minute
  tableName: string; // DynamoDB table name
}

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  resetTime: number; // Timestamp when bucket will be full again
  retryAfter?: number; // Seconds to wait before retry (only if denied)
}

export class RateLimitError extends Error {
  public readonly retryAfter: number;
  public readonly remainingTokens: number;

  constructor(message: string, retryAfter: number, remainingTokens: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.remainingTokens = remainingTokens;
  }
}

/**
 * Rate Limiter class implementing token bucket algorithm
 */
export class RateLimiter {
  private client: DynamoDBDocumentClient;
  private config: RateLimitConfig;

  constructor(
    dynamoClient: DynamoDBClient,
    config: Partial<RateLimitConfig> = {}
  ) {
    this.client = DynamoDBDocumentClient.from(dynamoClient);
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
  async checkRateLimit(userId: string): Promise<RateLimitResult> {
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
  private async getBucket(userId: string): Promise<RateLimitBucket> {
    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.config.tableName,
          Key: { userId },
        })
      );

      if (result.Item) {
        return result.Item as RateLimitBucket;
      }

      // Create new bucket with full capacity
      const now = Date.now();
      return {
        userId,
        tokens: this.config.capacity,
        lastRefill: now,
        expiresAt: Math.floor(now / 1000) + 3600, // Expire in 1 hour
      };
    } catch (error) {
      throw new Error(`Failed to get rate limit bucket: ${(error as Error).message}`);
    }
  }

  /**
   * Update rate limit bucket in DynamoDB
   * 
   * @param bucket - RateLimitBucket to update
   */
  private async updateBucket(bucket: RateLimitBucket): Promise<void> {
    try {
      // Update TTL to 1 hour from now
      bucket.expiresAt = Math.floor(Date.now() / 1000) + 3600;

      await this.client.send(
        new PutCommand({
          TableName: this.config.tableName,
          Item: bucket,
        })
      );
    } catch (error) {
      throw new Error(`Failed to update rate limit bucket: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate when bucket will have at least 1 token
   * 
   * @param bucket - Current bucket state
   * @returns Timestamp in milliseconds
   */
  private calculateResetTime(bucket: RateLimitBucket): number {
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
  async getRateLimitStatus(userId: string): Promise<{
    remainingTokens: number;
    resetTime: number;
  }> {
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
  async resetRateLimit(userId: string): Promise<void> {
    const now = Date.now();
    const bucket: RateLimitBucket = {
      userId,
      tokens: this.config.capacity,
      lastRefill: now,
      expiresAt: Math.floor(now / 1000) + 3600,
    };

    await this.updateBucket(bucket);
  }
}

/**
 * Middleware-style function to check rate limit and throw error if exceeded
 * 
 * @param rateLimiter - RateLimiter instance
 * @param userId - User ID to check
 * @throws RateLimitError if rate limit exceeded
 * @returns RateLimitResult if allowed
 */
export async function enforceRateLimit(
  rateLimiter: RateLimiter,
  userId: string
): Promise<RateLimitResult> {
  const result = await rateLimiter.checkRateLimit(userId);

  if (!result.allowed) {
    throw new RateLimitError(
      'Rate limit exceeded. Please try again later.',
      result.retryAfter!,
      result.remainingTokens
    );
  }

  return result;
}
