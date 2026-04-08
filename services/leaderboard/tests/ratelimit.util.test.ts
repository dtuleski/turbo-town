/**
 * Unit tests for Rate Limiting Utility
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import {
  RateLimiter,
  RateLimitError,
  enforceRateLimit,
  RateLimitBucket,
} from '../src/utils/ratelimit.util';

const dynamoMock = mockClient(DynamoDBDocumentClient);

describe('Rate Limiting Utility', () => {
  let rateLimiter: RateLimiter;
  const mockTableName = 'TestRateLimitBuckets';
  const mockUserId = 'user-123';

  beforeEach(() => {
    dynamoMock.reset();
    rateLimiter = new RateLimiter(new DynamoDBClient({}), {
      capacity: 10,
      refillRate: 10, // 10 tokens per minute
      tableName: mockTableName,
    });
  });

  describe('RateLimiter', () => {
    describe('checkRateLimit', () => {
      it('should allow request when bucket has tokens', async () => {
        const now = Date.now();
        const mockBucket: RateLimitBucket = {
          userId: mockUserId,
          tokens: 5,
          lastRefill: now,
          expiresAt: Math.floor(now / 1000) + 3600,
        };

        dynamoMock.on(GetCommand).resolves({ Item: mockBucket });
        dynamoMock.on(PutCommand).resolves({});

        const result = await rateLimiter.checkRateLimit(mockUserId);

        expect(result.allowed).toBe(true);
        expect(result.remainingTokens).toBe(4); // 5 - 1 consumed
        expect(result.resetTime).toBeGreaterThanOrEqual(now);
      });

      it('should deny request when bucket has no tokens', async () => {
        const now = Date.now();
        const mockBucket: RateLimitBucket = {
          userId: mockUserId,
          tokens: 0,
          lastRefill: now,
          expiresAt: Math.floor(now / 1000) + 3600,
        };

        dynamoMock.on(GetCommand).resolves({ Item: mockBucket });

        const result = await rateLimiter.checkRateLimit(mockUserId);

        expect(result.allowed).toBe(false);
        expect(result.remainingTokens).toBe(0);
        expect(result.retryAfter).toBeGreaterThan(0);
        expect(result.resetTime).toBeGreaterThan(now);
      });

      it('should create new bucket with full capacity for new user', async () => {
        dynamoMock.on(GetCommand).resolves({}); // No existing bucket
        dynamoMock.on(PutCommand).resolves({});

        const result = await rateLimiter.checkRateLimit(mockUserId);

        expect(result.allowed).toBe(true);
        expect(result.remainingTokens).toBe(9); // 10 - 1 consumed

        // Verify PutCommand was called
        const putCalls = dynamoMock.commandCalls(PutCommand);
        expect(putCalls.length).toBe(1);
        expect(putCalls[0].args[0].input.Item?.userId).toBe(mockUserId);
      });

      it('should refill tokens based on elapsed time', async () => {
        const now = Date.now();
        const oneMinuteAgo = now - 60000; // 1 minute ago

        const mockBucket: RateLimitBucket = {
          userId: mockUserId,
          tokens: 0,
          lastRefill: oneMinuteAgo,
          expiresAt: Math.floor(now / 1000) + 3600,
        };

        dynamoMock.on(GetCommand).resolves({ Item: mockBucket });
        dynamoMock.on(PutCommand).resolves({});

        const result = await rateLimiter.checkRateLimit(mockUserId);

        // Should have refilled 10 tokens (10 tokens per minute)
        expect(result.allowed).toBe(true);
        expect(result.remainingTokens).toBe(9); // 10 refilled - 1 consumed
      });

      it('should not exceed capacity when refilling', async () => {
        const now = Date.now();
        const fiveMinutesAgo = now - 300000; // 5 minutes ago

        const mockBucket: RateLimitBucket = {
          userId: mockUserId,
          tokens: 5,
          lastRefill: fiveMinutesAgo,
          expiresAt: Math.floor(now / 1000) + 3600,
        };

        dynamoMock.on(GetCommand).resolves({ Item: mockBucket });
        dynamoMock.on(PutCommand).resolves({});

        const result = await rateLimiter.checkRateLimit(mockUserId);

        // Should cap at capacity (10), not 5 + 50 = 55
        expect(result.allowed).toBe(true);
        expect(result.remainingTokens).toBe(9); // Capped at 10, then consumed 1
      });

      it('should update bucket with new TTL', async () => {
        const now = Date.now();
        const mockBucket: RateLimitBucket = {
          userId: mockUserId,
          tokens: 5,
          lastRefill: now,
          expiresAt: Math.floor(now / 1000) + 3600,
        };

        dynamoMock.on(GetCommand).resolves({ Item: mockBucket });
        dynamoMock.on(PutCommand).resolves({});

        await rateLimiter.checkRateLimit(mockUserId);

        const putCalls = dynamoMock.commandCalls(PutCommand);
        expect(putCalls.length).toBe(1);

        const updatedBucket = putCalls[0].args[0].input.Item as RateLimitBucket;
        expect(updatedBucket.expiresAt).toBeGreaterThanOrEqual(Math.floor(now / 1000) + 3600);
      });

      it('should handle partial refill correctly', async () => {
        const now = Date.now();
        const thirtySecondsAgo = now - 30000; // 30 seconds ago

        const mockBucket: RateLimitBucket = {
          userId: mockUserId,
          tokens: 0,
          lastRefill: thirtySecondsAgo,
          expiresAt: Math.floor(now / 1000) + 3600,
        };

        dynamoMock.on(GetCommand).resolves({ Item: mockBucket });
        dynamoMock.on(PutCommand).resolves({});

        const result = await rateLimiter.checkRateLimit(mockUserId);

        // 30 seconds = 0.5 minutes, so 5 tokens refilled (10 per minute)
        expect(result.allowed).toBe(true);
        expect(result.remainingTokens).toBe(4); // 5 refilled - 1 consumed
      });

      it('should throw error if DynamoDB get fails', async () => {
        dynamoMock.on(GetCommand).rejects(new Error('DynamoDB error'));

        await expect(rateLimiter.checkRateLimit(mockUserId)).rejects.toThrow(
          'Failed to get rate limit bucket'
        );
      });

      it('should throw error if DynamoDB put fails', async () => {
        const now = Date.now();
        const mockBucket: RateLimitBucket = {
          userId: mockUserId,
          tokens: 5,
          lastRefill: now,
          expiresAt: Math.floor(now / 1000) + 3600,
        };

        dynamoMock.on(GetCommand).resolves({ Item: mockBucket });
        dynamoMock.on(PutCommand).rejects(new Error('DynamoDB error'));

        await expect(rateLimiter.checkRateLimit(mockUserId)).rejects.toThrow(
          'Failed to update rate limit bucket'
        );
      });
    });

    describe('getRateLimitStatus', () => {
      it('should return current status without consuming token', async () => {
        const now = Date.now();
        const mockBucket: RateLimitBucket = {
          userId: mockUserId,
          tokens: 7,
          lastRefill: now,
          expiresAt: Math.floor(now / 1000) + 3600,
        };

        dynamoMock.on(GetCommand).resolves({ Item: mockBucket });

        const status = await rateLimiter.getRateLimitStatus(mockUserId);

        expect(status.remainingTokens).toBe(7);
        expect(status.resetTime).toBeGreaterThanOrEqual(now);

        // Verify no PutCommand was called (no token consumed)
        const putCalls = dynamoMock.commandCalls(PutCommand);
        expect(putCalls.length).toBe(0);
      });

      it('should calculate tokens with refill', async () => {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        const mockBucket: RateLimitBucket = {
          userId: mockUserId,
          tokens: 2,
          lastRefill: oneMinuteAgo,
          expiresAt: Math.floor(now / 1000) + 3600,
        };

        dynamoMock.on(GetCommand).resolves({ Item: mockBucket });

        const status = await rateLimiter.getRateLimitStatus(mockUserId);

        // Should show 10 tokens (capped at capacity) without consuming
        expect(status.remainingTokens).toBe(10);
      });
    });

    describe('resetRateLimit', () => {
      it('should reset bucket to full capacity', async () => {
        dynamoMock.on(PutCommand).resolves({});

        await rateLimiter.resetRateLimit(mockUserId);

        const putCalls = dynamoMock.commandCalls(PutCommand);
        expect(putCalls.length).toBe(1);

        const bucket = putCalls[0].args[0].input.Item as RateLimitBucket;
        expect(bucket.userId).toBe(mockUserId);
        expect(bucket.tokens).toBe(10); // Full capacity
        expect(bucket.lastRefill).toBeGreaterThan(0);
        expect(bucket.expiresAt).toBeGreaterThan(0);
      });
    });

    describe('constructor', () => {
      it('should use default config values', () => {
        const limiter = new RateLimiter(new DynamoDBClient({}));

        // Test by checking behavior with defaults
        expect(limiter).toBeInstanceOf(RateLimiter);
      });

      it('should use custom config values', () => {
        const limiter = new RateLimiter(new DynamoDBClient({}), {
          capacity: 50,
          refillRate: 25,
          tableName: 'CustomTable',
        });

        expect(limiter).toBeInstanceOf(RateLimiter);
      });

      it('should use environment variable for table name if not provided', () => {
        process.env.RATE_LIMIT_TABLE_NAME = 'EnvTable';

        const limiter = new RateLimiter(new DynamoDBClient({}));

        expect(limiter).toBeInstanceOf(RateLimiter);

        delete process.env.RATE_LIMIT_TABLE_NAME;
      });
    });
  });

  describe('enforceRateLimit', () => {
    it('should return result if rate limit is not exceeded', async () => {
      const now = Date.now();
      const mockBucket: RateLimitBucket = {
        userId: mockUserId,
        tokens: 5,
        lastRefill: now,
        expiresAt: Math.floor(now / 1000) + 3600,
      };

      dynamoMock.on(GetCommand).resolves({ Item: mockBucket });
      dynamoMock.on(PutCommand).resolves({});

      const result = await enforceRateLimit(rateLimiter, mockUserId);

      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBe(4);
    });

    it('should throw RateLimitError if rate limit is exceeded', async () => {
      const now = Date.now();
      const mockBucket: RateLimitBucket = {
        userId: mockUserId,
        tokens: 0,
        lastRefill: now,
        expiresAt: Math.floor(now / 1000) + 3600,
      };

      dynamoMock.on(GetCommand).resolves({ Item: mockBucket });

      await expect(enforceRateLimit(rateLimiter, mockUserId)).rejects.toThrow(RateLimitError);

      try {
        await enforceRateLimit(rateLimiter, mockUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).message).toBe(
          'Rate limit exceeded. Please try again later.'
        );
        expect((error as RateLimitError).retryAfter).toBeGreaterThan(0);
        expect((error as RateLimitError).remainingTokens).toBe(0);
      }
    });
  });

  describe('RateLimitError', () => {
    it('should create error with correct properties', () => {
      const error = new RateLimitError('Test error', 30, 0);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Test error');
      expect(error.retryAfter).toBe(30);
      expect(error.remainingTokens).toBe(0);
    });
  });

  describe('Token bucket algorithm edge cases', () => {
    it('should handle multiple rapid requests correctly', async () => {
      const now = Date.now();
      let currentTokens = 5;

      dynamoMock.on(GetCommand).callsFake(() => {
        return Promise.resolve({
          Item: {
            userId: mockUserId,
            tokens: currentTokens,
            lastRefill: now,
            expiresAt: Math.floor(now / 1000) + 3600,
          },
        });
      });

      dynamoMock.on(PutCommand).callsFake((input: any) => {
        currentTokens = input.Item.tokens;
        return Promise.resolve({});
      });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkRateLimit(mockUserId);
        expect(result.allowed).toBe(true);
      }

      // 6th request should be denied
      const result = await rateLimiter.checkRateLimit(mockUserId);
      expect(result.allowed).toBe(false);
    });

    it('should calculate correct retry time when bucket is empty', async () => {
      const now = Date.now();
      const mockBucket: RateLimitBucket = {
        userId: mockUserId,
        tokens: 0,
        lastRefill: now,
        expiresAt: Math.floor(now / 1000) + 3600,
      };

      dynamoMock.on(GetCommand).resolves({ Item: mockBucket });

      const result = await rateLimiter.checkRateLimit(mockUserId);

      expect(result.allowed).toBe(false);
      // With 10 tokens per minute, 1 token takes 6 seconds
      expect(result.retryAfter).toBe(6);
    });

    it('should handle zero elapsed time correctly', async () => {
      const now = Date.now();
      const mockBucket: RateLimitBucket = {
        userId: mockUserId,
        tokens: 3,
        lastRefill: now, // Same time as now
        expiresAt: Math.floor(now / 1000) + 3600,
      };

      dynamoMock.on(GetCommand).resolves({ Item: mockBucket });
      dynamoMock.on(PutCommand).resolves({});

      const result = await rateLimiter.checkRateLimit(mockUserId);

      // No refill should occur, just consume 1 token
      expect(result.allowed).toBe(true);
      expect(result.remainingTokens).toBe(2);
    });
  });
});
