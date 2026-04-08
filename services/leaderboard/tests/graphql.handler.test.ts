/**
 * Integration Tests for GraphQL Handler
 * 
 * Tests all GraphQL resolvers with authentication and rate limiting.
 */

import { GraphQLHandler, AppSyncEvent } from '../src/handlers/graphql.handler';
import { LeaderboardService } from '../src/services/leaderboard.service';
import { RateLimiter, RateLimitError } from '../src/utils/ratelimit.util';
import { AuthenticationError } from '../src/utils/auth.util';
import {
  GameType,
  Timeframe,
  LeaderboardResponse,
  UserRankResponse,
  LeaderboardEntry,
} from '../src/types';

// Mock dependencies
jest.mock('../src/services/leaderboard.service');
jest.mock('../src/utils/ratelimit.util');
jest.mock('../src/utils/auth.util');

describe('GraphQLHandler', () => {
  let handler: GraphQLHandler;
  let mockLeaderboardService: jest.Mocked<LeaderboardService>;
  let mockRateLimiter: jest.Mocked<RateLimiter>;

  // Mock auth module
  const mockAuthenticateRequest = jest.fn();
  const mockAuth = require('../src/utils/auth.util');
  mockAuth.authenticateRequest = mockAuthenticateRequest;

  // Mock rate limit module
  const mockEnforceRateLimit = jest.fn();
  const mockRateLimit = require('../src/utils/ratelimit.util');
  mockRateLimit.enforceRateLimit = mockEnforceRateLimit;

  beforeEach(() => {
    // Create mock instances
    mockLeaderboardService = new LeaderboardService() as jest.Mocked<LeaderboardService>;
    mockRateLimiter = new RateLimiter({} as any) as jest.Mocked<RateLimiter>;

    // Create handler with mocks
    handler = new GraphQLHandler(mockLeaderboardService, mockRateLimiter);

    // Setup default auth mock - will be overridden in specific tests
    mockAuthenticateRequest.mockResolvedValue({
      userId: 'user-123',
      username: 'testuser',
    });

    // Setup default rate limit mock - will be overridden in specific tests
    mockEnforceRateLimit.mockResolvedValue({
      allowed: true,
      remainingTokens: 99,
      resetTime: Date.now() + 60000,
    });
  });

  afterEach(() => {
    // Reset all mocks after each test
    jest.resetAllMocks();
  });

  describe('getLeaderboard resolver', () => {
    const mockLeaderboardResponse: LeaderboardResponse = {
      entries: [
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#2000#TIMESTAMP#2026-03-11T10:00:00.000Z',
          userId: 'user-456',
          username: 'topplayer',
          score: 2000,
          gameId: 'game-1',
          difficulty: 'HARD' as any,
          completionTime: 30,
          accuracy: 0.95,
          timestamp: '2026-03-11T10:00:00.000Z',
          date: '2026-03-11',
          week: '2026-W10',
          month: '2026-03',
          rank: 1,
          isCurrentUser: false,
        },
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#1500#TIMESTAMP#2026-03-11T11:00:00.000Z',
          userId: 'user-123',
          username: 'testuser',
          score: 1500,
          gameId: 'game-2',
          difficulty: 'MEDIUM' as any,
          completionTime: 45,
          accuracy: 0.85,
          timestamp: '2026-03-11T11:00:00.000Z',
          date: '2026-03-11',
          week: '2026-W10',
          month: '2026-03',
          rank: 2,
          isCurrentUser: true,
        },
      ],
      currentUserEntry: {
        gameType: GameType.MEMORY_MATCH,
        scoreTimestamp: 'SCORE#1500#TIMESTAMP#2026-03-11T11:00:00.000Z',
        userId: 'user-123',
        username: 'testuser',
        score: 1500,
        gameId: 'game-2',
        difficulty: 'MEDIUM' as any,
        completionTime: 45,
        accuracy: 0.85,
        timestamp: '2026-03-11T11:00:00.000Z',
        date: '2026-03-11',
        week: '2026-W10',
        month: '2026-03',
        rank: 2,
        isCurrentUser: true,
      },
      totalEntries: 2,
      timeframe: Timeframe.DAILY,
    };

    it('should successfully query leaderboard', async () => {
      // Setup
      mockLeaderboardService.getLeaderboard = jest
        .fn()
        .mockResolvedValue(mockLeaderboardResponse);

      const event: AppSyncEvent = {
        info: {
          fieldName: 'getLeaderboard',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: GameType.MEMORY_MATCH,
          timeframe: Timeframe.DAILY,
          limit: 100,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute
      const result = await handler.handleQuery(event);

      // Verify
      expect(mockAuthenticateRequest).toHaveBeenCalledWith(
        event.request.headers,
        expect.any(String),
        expect.any(String)
      );
      expect(mockEnforceRateLimit).toHaveBeenCalledWith(
        mockRateLimiter,
        'user-123'
      );
      expect(mockLeaderboardService.getLeaderboard).toHaveBeenCalledWith(
        GameType.MEMORY_MATCH,
        Timeframe.DAILY,
        'user-123',
        100
      );
      expect(result).toEqual(mockLeaderboardResponse);
    });

    it('should use default limit of 100', async () => {
      // Setup
      mockLeaderboardService.getLeaderboard = jest
        .fn()
        .mockResolvedValue(mockLeaderboardResponse);

      const event: AppSyncEvent = {
        info: {
          fieldName: 'getLeaderboard',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: GameType.MEMORY_MATCH,
          timeframe: Timeframe.DAILY,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute
      await handler.handleQuery(event);

      // Verify
      expect(mockLeaderboardService.getLeaderboard).toHaveBeenCalledWith(
        GameType.MEMORY_MATCH,
        Timeframe.DAILY,
        'user-123',
        100
      );
    });

    it('should reject invalid game type', async () => {
      // Setup
      const event: AppSyncEvent = {
        info: {
          fieldName: 'getLeaderboard',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: 'INVALID_GAME',
          timeframe: Timeframe.DAILY,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute & Verify
      await expect(handler.handleQuery(event)).rejects.toThrow('Invalid gameType');
    });

    it('should reject invalid timeframe', async () => {
      // Setup
      const event: AppSyncEvent = {
        info: {
          fieldName: 'getLeaderboard',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: GameType.MEMORY_MATCH,
          timeframe: 'INVALID_TIMEFRAME',
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute & Verify
      await expect(handler.handleQuery(event)).rejects.toThrow('Invalid timeframe');
    });

    it('should reject limit out of bounds', async () => {
      // Setup
      const event: AppSyncEvent = {
        info: {
          fieldName: 'getLeaderboard',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: GameType.MEMORY_MATCH,
          timeframe: Timeframe.DAILY,
          limit: 200,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute & Verify
      await expect(handler.handleQuery(event)).rejects.toThrow(
        'Limit must be between 1 and 100'
      );
    });
  });

  describe('getUserRank resolver', () => {
    const mockUserRankResponse: UserRankResponse = {
      rank: 5,
      score: 1500,
      gameType: GameType.MATH_CHALLENGE,
      timeframe: Timeframe.WEEKLY,
      totalPlayers: 100,
      percentile: 95.0,
    };

    it('should successfully query user rank', async () => {
      // Setup
      mockLeaderboardService.getUserRank = jest
        .fn()
        .mockResolvedValue(mockUserRankResponse);

      const event: AppSyncEvent = {
        info: {
          fieldName: 'getUserRank',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: GameType.MATH_CHALLENGE,
          timeframe: Timeframe.WEEKLY,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute
      const result = await handler.handleQuery(event);

      // Verify
      expect(mockAuthenticateRequest).toHaveBeenCalled();
      expect(mockEnforceRateLimit).toHaveBeenCalled();
      expect(mockLeaderboardService.getUserRank).toHaveBeenCalledWith(
        'user-123',
        GameType.MATH_CHALLENGE,
        Timeframe.WEEKLY
      );
      expect(result).toEqual(mockUserRankResponse);
    });

    it('should return null if user has no rank', async () => {
      // Setup
      mockLeaderboardService.getUserRank = jest.fn().mockResolvedValue(null);

      const event: AppSyncEvent = {
        info: {
          fieldName: 'getUserRank',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: GameType.WORD_PUZZLE,
          timeframe: Timeframe.MONTHLY,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute
      const result = await handler.handleQuery(event);

      // Verify
      expect(result).toBeNull();
    });

    it('should reject invalid game type', async () => {
      // Setup
      const event: AppSyncEvent = {
        info: {
          fieldName: 'getUserRank',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: 'INVALID_GAME',
          timeframe: Timeframe.WEEKLY,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute & Verify
      await expect(handler.handleQuery(event)).rejects.toThrow('Invalid gameType');
    });
  });

  describe('getUserScoreHistory resolver', () => {
    const mockScoreHistory: LeaderboardEntry[] = [
      {
        gameType: GameType.LANGUAGE_LEARNING,
        scoreTimestamp: 'SCORE#1800#TIMESTAMP#2026-03-11T10:00:00.000Z',
        userId: 'user-123',
        username: 'testuser',
        score: 1800,
        gameId: 'game-1',
        difficulty: 'ADVANCED' as any,
        completionTime: 120,
        accuracy: 0.9,
        timestamp: '2026-03-11T10:00:00.000Z',
        date: '2026-03-11',
        week: '2026-W10',
        month: '2026-03',
      },
      {
        gameType: GameType.LANGUAGE_LEARNING,
        scoreTimestamp: 'SCORE#1600#TIMESTAMP#2026-03-10T15:00:00.000Z',
        userId: 'user-123',
        username: 'testuser',
        score: 1600,
        gameId: 'game-2',
        difficulty: 'INTERMEDIATE' as any,
        completionTime: 150,
        accuracy: 0.85,
        timestamp: '2026-03-10T15:00:00.000Z',
        date: '2026-03-10',
        week: '2026-W10',
        month: '2026-03',
      },
    ];

    it('should successfully query user score history', async () => {
      // Setup
      mockLeaderboardService.getUserScoreHistory = jest
        .fn()
        .mockResolvedValue(mockScoreHistory);

      const event: AppSyncEvent = {
        info: {
          fieldName: 'getUserScoreHistory',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: GameType.LANGUAGE_LEARNING,
          limit: 50,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute
      const result = await handler.handleQuery(event);

      // Verify
      expect(mockAuthenticateRequest).toHaveBeenCalled();
      expect(mockEnforceRateLimit).toHaveBeenCalled();
      expect(mockLeaderboardService.getUserScoreHistory).toHaveBeenCalledWith(
        'user-123',
        GameType.LANGUAGE_LEARNING,
        50
      );
      expect(result).toEqual(mockScoreHistory);
    });

    it('should query all games if gameType not specified', async () => {
      // Setup
      mockLeaderboardService.getUserScoreHistory = jest
        .fn()
        .mockResolvedValue(mockScoreHistory);

      const event: AppSyncEvent = {
        info: {
          fieldName: 'getUserScoreHistory',
          parentTypeName: 'Query',
        },
        arguments: {
          limit: 50,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute
      await handler.handleQuery(event);

      // Verify
      expect(mockLeaderboardService.getUserScoreHistory).toHaveBeenCalledWith(
        'user-123',
        undefined,
        50
      );
    });

    it('should use default limit of 50', async () => {
      // Setup
      mockLeaderboardService.getUserScoreHistory = jest
        .fn()
        .mockResolvedValue(mockScoreHistory);

      const event: AppSyncEvent = {
        info: {
          fieldName: 'getUserScoreHistory',
          parentTypeName: 'Query',
        },
        arguments: {},
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute
      await handler.handleQuery(event);

      // Verify
      expect(mockLeaderboardService.getUserScoreHistory).toHaveBeenCalledWith(
        'user-123',
        undefined,
        50
      );
    });

    it('should reject limit out of bounds', async () => {
      // Setup
      const event: AppSyncEvent = {
        info: {
          fieldName: 'getUserScoreHistory',
          parentTypeName: 'Query',
        },
        arguments: {
          limit: 150,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute & Verify
      await expect(handler.handleQuery(event)).rejects.toThrow(
        'Limit must be between 1 and 100'
      );
    });
  });

  describe('Authentication', () => {
    it('should authenticate valid requests', async () => {
      // Setup
      mockLeaderboardService.getLeaderboard = jest.fn().mockResolvedValue({
        entries: [],
        totalEntries: 0,
        timeframe: Timeframe.DAILY,
      });

      const event: AppSyncEvent = {
        info: {
          fieldName: 'getLeaderboard',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: GameType.MEMORY_MATCH,
          timeframe: Timeframe.DAILY,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute
      await handler.handleQuery(event);

      // Verify authentication was called
      expect(mockAuthenticateRequest).toHaveBeenCalledWith(
        event.request.headers,
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limit for all requests', async () => {
      // Setup
      mockLeaderboardService.getLeaderboard = jest.fn().mockResolvedValue({
        entries: [],
        totalEntries: 0,
        timeframe: Timeframe.DAILY,
      });

      const event: AppSyncEvent = {
        info: {
          fieldName: 'getLeaderboard',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: GameType.MEMORY_MATCH,
          timeframe: Timeframe.DAILY,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute
      await handler.handleQuery(event);

      // Verify rate limit was checked
      expect(mockEnforceRateLimit).toHaveBeenCalledWith(
        mockRateLimiter,
        'user-123'
      );
    });

    it('should allow request when rate limit not exceeded', async () => {
      // Setup
      mockEnforceRateLimit.mockResolvedValue({
        allowed: true,
        remainingTokens: 50,
        resetTime: Date.now() + 60000,
      });

      mockLeaderboardService.getLeaderboard = jest.fn().mockResolvedValue({
        entries: [],
        totalEntries: 0,
        timeframe: Timeframe.DAILY,
      });

      const event: AppSyncEvent = {
        info: {
          fieldName: 'getLeaderboard',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: GameType.MEMORY_MATCH,
          timeframe: Timeframe.DAILY,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute
      await handler.handleQuery(event);

      // Verify
      expect(mockEnforceRateLimit).toHaveBeenCalledWith(
        mockRateLimiter,
        'user-123'
      );
      expect(mockLeaderboardService.getLeaderboard).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown field name', async () => {
      // Setup
      const event: AppSyncEvent = {
        info: {
          fieldName: 'unknownField',
          parentTypeName: 'Query',
        },
        arguments: {},
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute & Verify
      await expect(handler.handleQuery(event)).rejects.toThrow('Unknown field');
    });

    it('should handle service errors', async () => {
      // Setup
      mockLeaderboardService.getLeaderboard = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      const event: AppSyncEvent = {
        info: {
          fieldName: 'getLeaderboard',
          parentTypeName: 'Query',
        },
        arguments: {
          gameType: GameType.MEMORY_MATCH,
          timeframe: Timeframe.DAILY,
        },
        request: {
          headers: {
            authorization: 'Bearer valid-token',
          },
        },
      };

      // Execute & Verify
      await expect(handler.handleQuery(event)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
});
