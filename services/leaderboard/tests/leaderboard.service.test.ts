/**
 * Unit tests for LeaderboardService
 */

import { LeaderboardService } from '../src/services/leaderboard.service';
import { LeaderboardRepository } from '../src/repositories/leaderboard.repository';
import { AggregateRepository } from '../src/repositories/aggregate.repository';
import { GameType, Difficulty, Timeframe, LeaderboardEntry } from '../src/types';

// Mock repositories
jest.mock('../src/repositories/leaderboard.repository');
jest.mock('../src/repositories/aggregate.repository');

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let mockLeaderboardRepo: jest.Mocked<LeaderboardRepository>;
  let mockAggregateRepo: jest.Mocked<AggregateRepository>;

  beforeEach(() => {
    mockLeaderboardRepo = new LeaderboardRepository() as jest.Mocked<LeaderboardRepository>;
    mockAggregateRepo = new AggregateRepository() as jest.Mocked<AggregateRepository>;
    service = new LeaderboardService(mockLeaderboardRepo, mockAggregateRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard with calculated ranks', async () => {
      const mockEntries: LeaderboardEntry[] = [
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#0000002000#TIMESTAMP#2026-03-11T10:00:00.000Z',
          userId: 'user-1',
          username: 'user1',
          score: 2000,
          gameId: 'game-1',
          difficulty: Difficulty.HARD,
          completionTime: 30,
          accuracy: 0.95,
          timestamp: '2026-03-11T10:00:00.000Z',
          date: '2026-03-11',
          week: '2026-W11',
          month: '2026-03',
        },
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#0000001500#TIMESTAMP#2026-03-11T10:30:00.000Z',
          userId: 'user-2',
          username: 'user2',
          score: 1500,
          gameId: 'game-2',
          difficulty: Difficulty.MEDIUM,
          completionTime: 45,
          accuracy: 0.85,
          timestamp: '2026-03-11T10:30:00.000Z',
          date: '2026-03-11',
          week: '2026-W11',
          month: '2026-03',
        },
      ];

      mockLeaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue(mockEntries);

      const result = await service.getLeaderboard(
        GameType.MEMORY_MATCH,
        Timeframe.DAILY,
        'user-2',
        100
      );

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[0].userId).toBe('user-1');
      expect(result.entries[0].isCurrentUser).toBe(false);
      expect(result.entries[1].rank).toBe(2);
      expect(result.entries[1].userId).toBe('user-2');
      expect(result.entries[1].isCurrentUser).toBe(true);
      expect(result.currentUserEntry?.userId).toBe('user-2');
      expect(result.totalEntries).toBe(2);
      expect(result.timeframe).toBe(Timeframe.DAILY);
    });

    it('should handle tied scores with same rank', async () => {
      const mockEntries: LeaderboardEntry[] = [
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#0000001500#TIMESTAMP#2026-03-11T10:00:00.000Z',
          userId: 'user-1',
          username: 'user1',
          score: 1500,
          gameId: 'game-1',
          difficulty: Difficulty.MEDIUM,
          completionTime: 45,
          accuracy: 0.85,
          timestamp: '2026-03-11T10:00:00.000Z',
          date: '2026-03-11',
          week: '2026-W11',
          month: '2026-03',
        },
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#0000001500#TIMESTAMP#2026-03-11T10:30:00.000Z',
          userId: 'user-2',
          username: 'user2',
          score: 1500,
          gameId: 'game-2',
          difficulty: Difficulty.MEDIUM,
          completionTime: 50,
          accuracy: 0.80,
          timestamp: '2026-03-11T10:30:00.000Z',
          date: '2026-03-11',
          week: '2026-W11',
          month: '2026-03',
        },
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#0000001000#TIMESTAMP#2026-03-11T11:00:00.000Z',
          userId: 'user-3',
          username: 'user3',
          score: 1000,
          gameId: 'game-3',
          difficulty: Difficulty.EASY,
          completionTime: 60,
          accuracy: 0.75,
          timestamp: '2026-03-11T11:00:00.000Z',
          date: '2026-03-11',
          week: '2026-W11',
          month: '2026-03',
        },
      ];

      mockLeaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue(mockEntries);

      const result = await service.getLeaderboard(
        GameType.MEMORY_MATCH,
        Timeframe.DAILY,
        undefined,
        100
      );

      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[1].rank).toBe(1); // Same rank for tied score
      expect(result.entries[2].rank).toBe(3); // Next rank after tie
    });

    it('should return empty leaderboard when no entries', async () => {
      mockLeaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue([]);

      const result = await service.getLeaderboard(
        GameType.MEMORY_MATCH,
        Timeframe.DAILY,
        'user-1',
        100
      );

      expect(result.entries).toHaveLength(0);
      expect(result.currentUserEntry).toBeUndefined();
      expect(result.totalEntries).toBe(0);
    });
  });

  describe('getUserRank', () => {
    it('should calculate user rank and percentile correctly', async () => {
      const mockEntries: LeaderboardEntry[] = [
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#0000002000#TIMESTAMP#2026-03-11T10:00:00.000Z',
          userId: 'user-1',
          username: 'user1',
          score: 2000,
          gameId: 'game-1',
          difficulty: Difficulty.HARD,
          completionTime: 30,
          accuracy: 0.95,
          timestamp: '2026-03-11T10:00:00.000Z',
          date: '2026-03-11',
          week: '2026-W11',
          month: '2026-03',
        },
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#0000001500#TIMESTAMP#2026-03-11T10:30:00.000Z',
          userId: 'user-2',
          username: 'user2',
          score: 1500,
          gameId: 'game-2',
          difficulty: Difficulty.MEDIUM,
          completionTime: 45,
          accuracy: 0.85,
          timestamp: '2026-03-11T10:30:00.000Z',
          date: '2026-03-11',
          week: '2026-W11',
          month: '2026-03',
        },
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#0000001000#TIMESTAMP#2026-03-11T11:00:00.000Z',
          userId: 'user-3',
          username: 'user3',
          score: 1000,
          gameId: 'game-3',
          difficulty: Difficulty.EASY,
          completionTime: 60,
          accuracy: 0.75,
          timestamp: '2026-03-11T11:00:00.000Z',
          date: '2026-03-11',
          week: '2026-W11',
          month: '2026-03',
        },
      ];

      mockLeaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue(mockEntries);

      const result = await service.getUserRank(
        'user-2',
        GameType.MEMORY_MATCH,
        Timeframe.DAILY
      );

      expect(result).not.toBeNull();
      expect(result?.rank).toBe(2);
      expect(result?.score).toBe(1500);
      expect(result?.totalPlayers).toBe(3);
      expect(result?.percentile).toBeCloseTo(33.33, 1);
    });

    it('should return null when user has no scores', async () => {
      const mockEntries: LeaderboardEntry[] = [
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#0000002000#TIMESTAMP#2026-03-11T10:00:00.000Z',
          userId: 'user-1',
          username: 'user1',
          score: 2000,
          gameId: 'game-1',
          difficulty: Difficulty.HARD,
          completionTime: 30,
          accuracy: 0.95,
          timestamp: '2026-03-11T10:00:00.000Z',
          date: '2026-03-11',
          week: '2026-W11',
          month: '2026-03',
        },
      ];

      mockLeaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue(mockEntries);

      const result = await service.getUserRank(
        'user-999',
        GameType.MEMORY_MATCH,
        Timeframe.DAILY
      );

      expect(result).toBeNull();
    });

    it('should return null when no entries exist', async () => {
      mockLeaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue([]);

      const result = await service.getUserRank(
        'user-1',
        GameType.MEMORY_MATCH,
        Timeframe.DAILY
      );

      expect(result).toBeNull();
    });

    it('should use best score when user has multiple entries', async () => {
      const mockEntries: LeaderboardEntry[] = [
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#0000002000#TIMESTAMP#2026-03-11T10:00:00.000Z',
          userId: 'user-1',
          username: 'user1',
          score: 2000,
          gameId: 'game-1',
          difficulty: Difficulty.HARD,
          completionTime: 30,
          accuracy: 0.95,
          timestamp: '2026-03-11T10:00:00.000Z',
          date: '2026-03-11',
          week: '2026-W11',
          month: '2026-03',
        },
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#0000001500#TIMESTAMP#2026-03-11T10:30:00.000Z',
          userId: 'user-1',
          username: 'user1',
          score: 1500,
          gameId: 'game-2',
          difficulty: Difficulty.MEDIUM,
          completionTime: 45,
          accuracy: 0.85,
          timestamp: '2026-03-11T10:30:00.000Z',
          date: '2026-03-11',
          week: '2026-W11',
          month: '2026-03',
        },
      ];

      mockLeaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue(mockEntries);

      const result = await service.getUserRank(
        'user-1',
        GameType.MEMORY_MATCH,
        Timeframe.DAILY
      );

      expect(result?.rank).toBe(1);
      expect(result?.score).toBe(2000); // Best score
    });
  });

  describe('getUserScoreHistory', () => {
    it('should return user score history', async () => {
      const mockEntries: LeaderboardEntry[] = [
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#0000001500#TIMESTAMP#2026-03-11T10:30:00.000Z',
          userId: 'user-1',
          username: 'user1',
          score: 1500,
          gameId: 'game-1',
          difficulty: Difficulty.MEDIUM,
          completionTime: 45,
          accuracy: 0.85,
          timestamp: '2026-03-11T10:30:00.000Z',
          date: '2026-03-11',
          week: '2026-W11',
          month: '2026-03',
        },
      ];

      mockLeaderboardRepo.queryUserHistory.mockResolvedValue(mockEntries);

      const result = await service.getUserScoreHistory('user-1', GameType.MEMORY_MATCH, 50);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
      expect(mockLeaderboardRepo.queryUserHistory).toHaveBeenCalledWith(
        'user-1',
        GameType.MEMORY_MATCH,
        50
      );
    });
  });

  describe('createLeaderboardEntry', () => {
    it('should create leaderboard entry', async () => {
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

      const mockEntry: LeaderboardEntry = {
        ...input,
        scoreTimestamp: 'SCORE#0000001500#TIMESTAMP#2026-03-11T10:30:00.000Z',
        date: '2026-03-11',
        week: '2026-W11',
        month: '2026-03',
      };

      mockLeaderboardRepo.createEntry.mockResolvedValue(mockEntry);

      const result = await service.createLeaderboardEntry(input);

      expect(result).toEqual(mockEntry);
      expect(mockLeaderboardRepo.createEntry).toHaveBeenCalledWith(input);
    });
  });

  describe('updateUserAggregate', () => {
    it('should update user aggregate', async () => {
      const input = {
        userId: 'user-1',
        gameType: GameType.MEMORY_MATCH,
        username: 'testuser',
        score: 1500,
        timestamp: '2026-03-11T10:30:00.000Z',
      };

      mockAggregateRepo.updateAggregate.mockResolvedValue({
        userId: 'user-1',
        gameType: GameType.MEMORY_MATCH,
        username: 'testuser',
        totalScore: 1500,
        gamesPlayed: 1,
        averageScore: 1500,
        bestScore: 1500,
        lastPlayed: '2026-03-11T10:30:00.000Z',
        dailyScore: 1500,
        weeklyScore: 1500,
        monthlyScore: 1500,
        dailyGames: 1,
        weeklyGames: 1,
        monthlyGames: 1,
      });

      await service.updateUserAggregate(input);

      expect(mockAggregateRepo.updateAggregate).toHaveBeenCalledWith(input);
    });
  });
});
