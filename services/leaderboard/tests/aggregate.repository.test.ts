/**
 * Unit tests for AggregateRepository
 */

import { AggregateRepository } from '../src/repositories/aggregate.repository';
import { GameType } from '../src/types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Mock DynamoDB client
jest.mock('@aws-sdk/client-dynamodb');

describe('AggregateRepository', () => {
  let repository: AggregateRepository;
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockSend = jest.fn();
    (DynamoDBClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
    repository = new AggregateRepository('TestAggregatesTable');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAggregate', () => {
    it('should return aggregate when it exists', async () => {
      const mockItem = {
        userId: { S: 'user-1' },
        gameType: { S: 'MEMORY_MATCH' },
        username: { S: 'testuser' },
        totalScore: { N: '5000' },
        gamesPlayed: { N: '10' },
        averageScore: { N: '500' },
        bestScore: { N: '1500' },
        lastPlayed: { S: '2026-03-11T10:30:00.000Z' },
        dailyScore: { N: '1000' },
        weeklyScore: { N: '2000' },
        monthlyScore: { N: '3000' },
        dailyGames: { N: '2' },
        weeklyGames: { N: '4' },
        monthlyGames: { N: '6' },
      };

      mockSend.mockResolvedValue({ Item: mockItem });

      const result = await repository.getAggregate('user-1', GameType.MEMORY_MATCH);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-1');
      expect(result?.gameType).toBe('MEMORY_MATCH');
      expect(result?.totalScore).toBe(5000);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return null when aggregate does not exist', async () => {
      mockSend.mockResolvedValue({ Item: undefined });

      const result = await repository.getAggregate('user-1', GameType.MEMORY_MATCH);

      expect(result).toBeNull();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateAggregate', () => {
    it('should create new aggregate when none exists', async () => {
      // First call returns null (no existing aggregate)
      mockSend.mockResolvedValueOnce({ Item: undefined });
      // Second call creates the aggregate
      mockSend.mockResolvedValueOnce({});

      const input = {
        userId: 'user-1',
        gameType: GameType.MEMORY_MATCH,
        username: 'testuser',
        score: 1500,
        timestamp: '2026-03-11T10:30:00.000Z',
      };

      const result = await repository.updateAggregate(input);

      expect(result.userId).toBe('user-1');
      expect(result.gameType).toBe(GameType.MEMORY_MATCH);
      expect(result.totalScore).toBe(1500);
      expect(result.gamesPlayed).toBe(1);
      expect(result.averageScore).toBe(1500);
      expect(result.bestScore).toBe(1500);
      expect(result.dailyScore).toBe(1500);
      expect(result.weeklyScore).toBe(1500);
      expect(result.monthlyScore).toBe(1500);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should update existing aggregate with same day', async () => {
      const existingAggregate = {
        userId: { S: 'user-1' },
        gameType: { S: 'MEMORY_MATCH' },
        username: { S: 'testuser' },
        totalScore: { N: '3000' },
        gamesPlayed: { N: '2' },
        averageScore: { N: '1500' },
        bestScore: { N: '1600' },
        lastPlayed: { S: '2026-03-11T09:00:00.000Z' },
        dailyScore: { N: '1600' },
        weeklyScore: { N: '3000' },
        monthlyScore: { N: '3000' },
        dailyGames: { N: '1' },
        weeklyGames: { N: '2' },
        monthlyGames: { N: '2' },
      };

      mockSend.mockResolvedValueOnce({ Item: existingAggregate });
      mockSend.mockResolvedValueOnce({});

      const input = {
        userId: 'user-1',
        gameType: GameType.MEMORY_MATCH,
        username: 'testuser',
        score: 1400,
        timestamp: '2026-03-11T10:30:00.000Z',
      };

      const result = await repository.updateAggregate(input);

      expect(result.totalScore).toBe(4400); // 3000 + 1400
      expect(result.gamesPlayed).toBe(3); // 2 + 1
      expect(result.averageScore).toBeCloseTo(1466.67, 1);
      expect(result.bestScore).toBe(1600); // Max of 1600 and 1400
      expect(result.dailyScore).toBe(3000); // 1600 + 1400 (same day)
      expect(result.dailyGames).toBe(2); // 1 + 1
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should reset daily score for new day', async () => {
      const existingAggregate = {
        userId: { S: 'user-1' },
        gameType: { S: 'MEMORY_MATCH' },
        username: { S: 'testuser' },
        totalScore: { N: '3000' },
        gamesPlayed: { N: '2' },
        averageScore: { N: '1500' },
        bestScore: { N: '1600' },
        lastPlayed: { S: '2026-03-10T10:00:00.000Z' }, // Previous day
        dailyScore: { N: '1600' },
        weeklyScore: { N: '3000' },
        monthlyScore: { N: '3000' },
        dailyGames: { N: '1' },
        weeklyGames: { N: '2' },
        monthlyGames: { N: '2' },
      };

      mockSend.mockResolvedValueOnce({ Item: existingAggregate });
      mockSend.mockResolvedValueOnce({});

      const input = {
        userId: 'user-1',
        gameType: GameType.MEMORY_MATCH,
        username: 'testuser',
        score: 1400,
        timestamp: '2026-03-11T10:30:00.000Z', // New day
      };

      const result = await repository.updateAggregate(input);

      expect(result.dailyScore).toBe(1400); // Reset to new score
      expect(result.dailyGames).toBe(1); // Reset to 1
      expect(result.weeklyScore).toBe(4400); // Still same week
      expect(result.monthlyScore).toBe(4400); // Still same month
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should update best score when new score is higher', async () => {
      const existingAggregate = {
        userId: { S: 'user-1' },
        gameType: { S: 'MEMORY_MATCH' },
        username: { S: 'testuser' },
        totalScore: { N: '3000' },
        gamesPlayed: { N: '2' },
        averageScore: { N: '1500' },
        bestScore: { N: '1600' },
        lastPlayed: { S: '2026-03-11T09:00:00.000Z' },
        dailyScore: { N: '1600' },
        weeklyScore: { N: '3000' },
        monthlyScore: { N: '3000' },
        dailyGames: { N: '1' },
        weeklyGames: { N: '2' },
        monthlyGames: { N: '2' },
      };

      mockSend.mockResolvedValueOnce({ Item: existingAggregate });
      mockSend.mockResolvedValueOnce({});

      const input = {
        userId: 'user-1',
        gameType: GameType.MEMORY_MATCH,
        username: 'testuser',
        score: 1800, // Higher than current best
        timestamp: '2026-03-11T10:30:00.000Z',
      };

      const result = await repository.updateAggregate(input);

      expect(result.bestScore).toBe(1800);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });
});
