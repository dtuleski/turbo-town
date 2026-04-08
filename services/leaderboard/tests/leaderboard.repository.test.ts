/**
 * Unit tests for LeaderboardRepository
 */

import { LeaderboardRepository } from '../src/repositories/leaderboard.repository';
import { GameType, Difficulty, Timeframe } from '../src/types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Mock DynamoDB client
jest.mock('@aws-sdk/client-dynamodb');

describe('LeaderboardRepository', () => {
  let repository: LeaderboardRepository;
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockSend = jest.fn();
    (DynamoDBClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
    repository = new LeaderboardRepository('TestLeaderboardTable');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEntry', () => {
    it('should create a leaderboard entry with correct attributes', async () => {
      mockSend.mockResolvedValue({});

      const input = {
        gameId: 'game-123',
        userId: 'user-456',
        username: 'testuser',
        gameType: GameType.MEMORY_MATCH,
        score: 1500,
        difficulty: Difficulty.MEDIUM,
        completionTime: 45,
        accuracy: 0.85,
        timestamp: '2026-03-11T10:30:00.000Z',
      };

      const result = await repository.createEntry(input);

      expect(result).toMatchObject({
        gameId: 'game-123',
        userId: 'user-456',
        username: 'testuser',
        gameType: GameType.MEMORY_MATCH,
        score: 1500,
        difficulty: Difficulty.MEDIUM,
        completionTime: 45,
        accuracy: 0.85,
      });

      expect(result.scoreTimestamp).toMatch(/^SCORE#0000001500#TIMESTAMP#/);
      expect(result.date).toBe('2026-03-11');
      expect(result.week).toMatch(/^\d{4}-W\d{2}$/);
      expect(result.month).toBe('2026-03');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle metadata and suspicious flag', async () => {
      mockSend.mockResolvedValue({});

      const input = {
        gameId: 'game-123',
        userId: 'user-456',
        username: 'testuser',
        gameType: GameType.MATH_CHALLENGE,
        score: 2000,
        difficulty: Difficulty.HARD,
        completionTime: 30,
        accuracy: 1.0,
        timestamp: '2026-03-11T10:30:00.000Z',
        metadata: { attempts: 10 },
        suspicious: true,
      };

      const result = await repository.createEntry(input);

      expect(result.metadata).toEqual({ attempts: 10 });
      expect(result.suspicious).toBe(true);
    });
  });

  describe('queryByGameTypeAndTimeframe', () => {
    it('should query daily leaderboard', async () => {
      const mockItems = [
        {
          gameType: { S: 'MEMORY_MATCH' },
          scoreTimestamp: { S: 'SCORE#0000001500#TIMESTAMP#2026-03-11T10:30:00.000Z' },
          userId: { S: 'user-1' },
          username: { S: 'user1' },
          score: { N: '1500' },
        },
      ];

      mockSend.mockResolvedValue({ Items: mockItems });

      const result = await repository.queryByGameTypeAndTimeframe({
        gameType: GameType.MEMORY_MATCH,
        timeframe: Timeframe.DAILY,
        limit: 100,
      });

      expect(result).toHaveLength(1);
      expect(result[0].gameType).toBe('MEMORY_MATCH');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should query weekly leaderboard', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await repository.queryByGameTypeAndTimeframe({
        gameType: GameType.MATH_CHALLENGE,
        timeframe: Timeframe.WEEKLY,
        limit: 50,
      });

      expect(result).toHaveLength(0);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should query monthly leaderboard', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await repository.queryByGameTypeAndTimeframe({
        gameType: GameType.WORD_PUZZLE,
        timeframe: Timeframe.MONTHLY,
        limit: 100,
      });

      expect(result).toHaveLength(0);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should query all-time leaderboard', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await repository.queryByGameTypeAndTimeframe({
        gameType: GameType.LANGUAGE_LEARNING,
        timeframe: Timeframe.ALL_TIME,
        limit: 100,
      });

      expect(result).toHaveLength(0);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw error for unknown timeframe', async () => {
      await expect(
        repository.queryByGameTypeAndTimeframe({
          gameType: GameType.MEMORY_MATCH,
          timeframe: 'INVALID' as Timeframe,
          limit: 100,
        })
      ).rejects.toThrow('Unknown timeframe');
    });
  });

  describe('queryUserHistory', () => {
    it('should query user history without game type filter', async () => {
      const mockItems = [
        {
          gameType: { S: 'MEMORY_MATCH' },
          userId: { S: 'user-1' },
          score: { N: '1500' },
        },
        {
          gameType: { S: 'MATH_CHALLENGE' },
          userId: { S: 'user-1' },
          score: { N: '2000' },
        },
      ];

      mockSend.mockResolvedValue({ Items: mockItems });

      const result = await repository.queryUserHistory('user-1');

      expect(result).toHaveLength(2);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should query user history with game type filter', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await repository.queryUserHistory('user-1', GameType.MEMORY_MATCH, 25);

      expect(result).toHaveLength(0);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no items found', async () => {
      mockSend.mockResolvedValue({ Items: undefined });

      const result = await repository.queryUserHistory('user-1');

      expect(result).toHaveLength(0);
    });
  });
});
