/**
 * Unit tests for AnomalyService
 */

import { AnomalyService, GameStatistics, AnomalyFlags } from '../src/services/anomaly.service';
import { GameType, Difficulty, LeaderboardEntry } from '../src/types';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('AnomalyService', () => {
  let service: AnomalyService;

  beforeEach(() => {
    ddbMock.reset();
    service = new AnomalyService('GameStatistics', 'LeaderboardEntries');
  });

  describe('Statistical Outlier Detection', () => {
    it('should detect statistical outliers with z-score > 3', async () => {
      const stats: GameStatistics = {
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.EASY,
        mean: 1000,
        stdDev: 200,
        sampleSize: 100,
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      const entry: LeaderboardEntry = {
        gameType: GameType.MEMORY_MATCH,
        scoreTimestamp: 'SCORE#2000#TIMESTAMP#2024-01-01T00:00:00Z',
        userId: 'user-1',
        username: 'testuser',
        score: 2000, // z-score = (2000 - 1000) / 200 = 5 > 3
        gameId: 'game-1',
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
        timestamp: '2024-01-01T00:00:00Z',
        date: '2024-01-01',
        week: '2024-W01',
        month: '2024-01',
      };

      // Mock velocity check
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const flags = await service.detectAnomalies(entry, stats);

      expect(flags.isStatisticalOutlier).toBe(true);
      expect(flags.isSuspicious).toBe(true);
      expect(flags.reasons.some(r => r.includes('statistical outlier'))).toBe(true);
    });

    it('should not flag scores within 3 standard deviations', async () => {
      const stats: GameStatistics = {
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.EASY,
        mean: 1000,
        stdDev: 200,
        sampleSize: 100,
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      const entry: LeaderboardEntry = {
        gameType: GameType.MEMORY_MATCH,
        scoreTimestamp: 'SCORE#1400#TIMESTAMP#2024-01-01T00:00:00Z',
        userId: 'user-1',
        username: 'testuser',
        score: 1400, // z-score = (1400 - 1000) / 200 = 2 < 3
        gameId: 'game-1',
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
        timestamp: '2024-01-01T00:00:00Z',
        date: '2024-01-01',
        week: '2024-W01',
        month: '2024-01',
      };

      // Mock velocity check
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const flags = await service.detectAnomalies(entry, stats);

      expect(flags.isStatisticalOutlier).toBe(false);
      expect(flags.isSuspicious).toBe(false);
    });

    it('should handle zero standard deviation gracefully', async () => {
      const stats: GameStatistics = {
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.EASY,
        mean: 1000,
        stdDev: 0, // All scores are identical
        sampleSize: 10,
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      const entry: LeaderboardEntry = {
        gameType: GameType.MEMORY_MATCH,
        scoreTimestamp: 'SCORE#2000#TIMESTAMP#2024-01-01T00:00:00Z',
        userId: 'user-1',
        username: 'testuser',
        score: 2000,
        gameId: 'game-1',
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
        timestamp: '2024-01-01T00:00:00Z',
        date: '2024-01-01',
        week: '2024-W01',
        month: '2024-01',
      };

      // Mock velocity check
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const flags = await service.detectAnomalies(entry, stats);

      expect(flags.isStatisticalOutlier).toBe(false);
    });
  });

  describe('Velocity Detection', () => {
    it('should detect excessive games per minute', async () => {
      const now = new Date('2024-01-01T12:00:00Z');
      const recentGames = Array.from({ length: 15 }, (_, i) => ({
        userId: 'user-1',
        timestamp: new Date(now.getTime() - i * 3000).toISOString(), // 15 games in 45 seconds
        score: 1000,
      }));

      const entry: LeaderboardEntry = {
        gameType: GameType.MEMORY_MATCH,
        scoreTimestamp: 'SCORE#1000#TIMESTAMP#2024-01-01T12:00:00Z',
        userId: 'user-1',
        username: 'testuser',
        score: 1000,
        gameId: 'game-1',
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
        timestamp: now.toISOString(),
        date: '2024-01-01',
        week: '2024-W01',
        month: '2024-01',
      };

      // Mock velocity check - return recent games
      ddbMock.on(QueryCommand).resolves({ Items: recentGames });

      const flags = await service.detectAnomalies(entry);

      expect(flags.isVelocityAnomaly).toBe(true);
      expect(flags.isSuspicious).toBe(true);
      expect(flags.reasons.some(r => r.includes('games in last minute'))).toBe(true);
    });

    it('should detect excessive games per day', async () => {
      const now = new Date('2024-01-01T12:00:00Z');
      const recentGames = Array.from({ length: 150 }, (_, i) => ({
        userId: 'user-1',
        timestamp: new Date(now.getTime() - i * 600000).toISOString(), // 150 games in last day
        score: 1000,
      }));

      const entry: LeaderboardEntry = {
        gameType: GameType.MEMORY_MATCH,
        scoreTimestamp: 'SCORE#1000#TIMESTAMP#2024-01-01T12:00:00Z',
        userId: 'user-1',
        username: 'testuser',
        score: 1000,
        gameId: 'game-1',
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
        timestamp: now.toISOString(),
        date: '2024-01-01',
        week: '2024-W01',
        month: '2024-01',
      };

      // Mock velocity check
      ddbMock.on(QueryCommand).resolves({ Items: recentGames });

      const flags = await service.detectAnomalies(entry);

      expect(flags.isVelocityAnomaly).toBe(true);
      expect(flags.isSuspicious).toBe(true);
      expect(flags.reasons.some(r => r.includes('games in last day'))).toBe(true);
    });

    it('should not flag normal game velocity', async () => {
      const now = new Date('2024-01-01T12:00:00Z');
      const recentGames = Array.from({ length: 5 }, (_, i) => ({
        userId: 'user-1',
        timestamp: new Date(now.getTime() - i * 3600000).toISOString(), // 5 games in 5 hours
        score: 1000,
      }));

      const entry: LeaderboardEntry = {
        gameType: GameType.MEMORY_MATCH,
        scoreTimestamp: 'SCORE#1000#TIMESTAMP#2024-01-01T12:00:00Z',
        userId: 'user-1',
        username: 'testuser',
        score: 1000,
        gameId: 'game-1',
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
        timestamp: now.toISOString(),
        date: '2024-01-01',
        week: '2024-W01',
        month: '2024-01',
      };

      // Mock velocity check
      ddbMock.on(QueryCommand).resolves({ Items: recentGames });

      const flags = await service.detectAnomalies(entry);

      expect(flags.isVelocityAnomaly).toBe(false);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect repeated identical scores', async () => {
      const entry: LeaderboardEntry = {
        gameType: GameType.MEMORY_MATCH,
        scoreTimestamp: 'SCORE#1500#TIMESTAMP#2024-01-01T12:00:00Z',
        userId: 'user-1',
        username: 'testuser',
        score: 1500,
        gameId: 'game-1',
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
        timestamp: '2024-01-01T12:00:00Z',
        date: '2024-01-01',
        week: '2024-W01',
        month: '2024-01',
      };

      // Mock recent games with identical scores
      const recentGames = Array.from({ length: 5 }, (_, i) => ({
        ...entry,
        gameId: `game-${i}`,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      }));

      ddbMock.on(QueryCommand).resolves({ Items: recentGames });

      const flags = await service.detectAnomalies(entry);

      expect(flags.isPatternAnomaly).toBe(true);
      expect(flags.isSuspicious).toBe(true);
      expect(flags.reasons.some(r => r.includes('Repeated identical score'))).toBe(true);
    });

    it('should detect suspiciously consistent completion times', async () => {
      const entry: LeaderboardEntry = {
        gameType: GameType.MEMORY_MATCH,
        scoreTimestamp: 'SCORE#1500#TIMESTAMP#2024-01-01T12:00:00Z',
        userId: 'user-1',
        username: 'testuser',
        score: 1500,
        gameId: 'game-1',
        difficulty: Difficulty.EASY,
        completionTime: 30.0,
        accuracy: 0.9,
        timestamp: '2024-01-01T12:00:00Z',
        date: '2024-01-01',
        week: '2024-W01',
        month: '2024-01',
      };

      // Mock recent games with very consistent times (30.0, 30.1, 30.0, 30.1)
      const recentGames = Array.from({ length: 5 }, (_, i) => ({
        ...entry,
        gameId: `game-${i}`,
        score: 1500 + i * 10,
        completionTime: 30.0 + (i % 2) * 0.1,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      }));

      ddbMock.on(QueryCommand).resolves({ Items: recentGames });

      const flags = await service.detectAnomalies(entry);

      expect(flags.isPatternAnomaly).toBe(true);
      expect(flags.isSuspicious).toBe(true);
      expect(flags.reasons.some(r => r.includes('consistent completion times'))).toBe(true);
    });

    it('should not flag normal variation in scores and times', async () => {
      const entry: LeaderboardEntry = {
        gameType: GameType.MEMORY_MATCH,
        scoreTimestamp: 'SCORE#1500#TIMESTAMP#2024-01-01T12:00:00Z',
        userId: 'user-1',
        username: 'testuser',
        score: 1500,
        gameId: 'game-1',
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
        timestamp: '2024-01-01T12:00:00Z',
        date: '2024-01-01',
        week: '2024-W01',
        month: '2024-01',
      };

      // Mock recent games with normal variation
      const recentGames = [
        { ...entry, gameId: 'game-1', score: 1200, completionTime: 45 },
        { ...entry, gameId: 'game-2', score: 1500, completionTime: 30 },
        { ...entry, gameId: 'game-3', score: 1800, completionTime: 25 },
        { ...entry, gameId: 'game-4', score: 1400, completionTime: 35 },
      ];

      ddbMock.on(QueryCommand).resolves({ Items: recentGames });

      const flags = await service.detectAnomalies(entry);

      expect(flags.isPatternAnomaly).toBe(false);
    });
  });

  describe('getGameStatistics', () => {
    it('should retrieve game statistics from DynamoDB', async () => {
      const expectedStats: GameStatistics = {
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.EASY,
        mean: 1000,
        stdDev: 200,
        sampleSize: 100,
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      ddbMock.on(GetCommand).resolves({ Item: expectedStats });

      const stats = await service.getGameStatistics(GameType.MEMORY_MATCH, Difficulty.EASY);

      expect(stats).toEqual(expectedStats);
    });

    it('should return null if statistics not found', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const stats = await service.getGameStatistics(GameType.MEMORY_MATCH, Difficulty.EASY);

      expect(stats).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));

      const stats = await service.getGameStatistics(GameType.MEMORY_MATCH, Difficulty.EASY);

      expect(stats).toBeNull();
    });
  });

  describe('updateGameStatistics', () => {
    it('should calculate and store statistics for all difficulties', async () => {
      const entries: LeaderboardEntry[] = [
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#1000#TIMESTAMP#2024-01-01T00:00:00Z',
          userId: 'user-1',
          username: 'user1',
          score: 1000,
          gameId: 'game-1',
          difficulty: Difficulty.EASY,
          completionTime: 30,
          accuracy: 0.9,
          timestamp: '2024-01-01T00:00:00Z',
          date: '2024-01-01',
          week: '2024-W01',
          month: '2024-01',
        },
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#1200#TIMESTAMP#2024-01-01T01:00:00Z',
          userId: 'user-2',
          username: 'user2',
          score: 1200,
          gameId: 'game-2',
          difficulty: Difficulty.EASY,
          completionTime: 25,
          accuracy: 0.95,
          timestamp: '2024-01-01T01:00:00Z',
          date: '2024-01-01',
          week: '2024-W01',
          month: '2024-01',
        },
        {
          gameType: GameType.MEMORY_MATCH,
          scoreTimestamp: 'SCORE#800#TIMESTAMP#2024-01-01T02:00:00Z',
          userId: 'user-3',
          username: 'user3',
          score: 800,
          gameId: 'game-3',
          difficulty: Difficulty.EASY,
          completionTime: 40,
          accuracy: 0.8,
          timestamp: '2024-01-01T02:00:00Z',
          date: '2024-01-01',
          week: '2024-W01',
          month: '2024-01',
        },
      ];

      ddbMock.on(QueryCommand).resolves({ Items: entries });
      ddbMock.on(PutCommand).resolves({});

      await service.updateGameStatistics(GameType.MEMORY_MATCH);

      // Verify PutCommand was called for each difficulty
      const putCalls = ddbMock.commandCalls(PutCommand);
      expect(putCalls.length).toBeGreaterThan(0);

      // Verify statistics calculation
      const firstCall = putCalls[0];
      const stats = firstCall.args[0].input.Item as GameStatistics;
      
      if (stats.difficulty === Difficulty.EASY) {
        expect(stats.mean).toBe(1000); // (1000 + 1200 + 800) / 3
        expect(stats.sampleSize).toBe(3);
        expect(stats.stdDev).toBeCloseTo(163.3, 1); // Standard deviation
      }
    });

    it('should handle empty results gracefully', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      await service.updateGameStatistics(GameType.MEMORY_MATCH);

      // Should not throw error
      const putCalls = ddbMock.commandCalls(PutCommand);
      expect(putCalls.length).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      ddbMock.on(QueryCommand).rejects(new Error('DynamoDB error'));

      await service.updateGameStatistics(GameType.MEMORY_MATCH);

      // Should not throw error
    });
  });

  describe('Combined Anomaly Detection', () => {
    it('should flag entry with multiple anomalies', async () => {
      const stats: GameStatistics = {
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.EASY,
        mean: 1000,
        stdDev: 200,
        sampleSize: 100,
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      const entry: LeaderboardEntry = {
        gameType: GameType.MEMORY_MATCH,
        scoreTimestamp: 'SCORE#2000#TIMESTAMP#2024-01-01T12:00:00Z',
        userId: 'user-1',
        username: 'testuser',
        score: 2000, // Statistical outlier
        gameId: 'game-1',
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
        timestamp: '2024-01-01T12:00:00Z',
        date: '2024-01-01',
        week: '2024-W01',
        month: '2024-01',
      };

      // Mock excessive velocity
      const recentGames = Array.from({ length: 15 }, (_, i) => ({
        userId: 'user-1',
        timestamp: new Date(Date.now() - i * 3000).toISOString(),
        score: 2000,
        completionTime: 30,
        gameType: GameType.MEMORY_MATCH,
      }));

      ddbMock.on(QueryCommand).resolves({ Items: recentGames });

      const flags = await service.detectAnomalies(entry, stats);

      expect(flags.isSuspicious).toBe(true);
      expect(flags.isStatisticalOutlier).toBe(true);
      expect(flags.isVelocityAnomaly).toBe(true);
      expect(flags.isPatternAnomaly).toBe(true);
      expect(flags.reasons.length).toBeGreaterThan(2);
    });

    it('should not flag legitimate high-performing player', async () => {
      const stats: GameStatistics = {
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.EASY,
        mean: 1000,
        stdDev: 200,
        sampleSize: 100,
        lastUpdated: '2024-01-01T00:00:00Z',
      };

      const entry: LeaderboardEntry = {
        gameType: GameType.MEMORY_MATCH,
        scoreTimestamp: 'SCORE#1400#TIMESTAMP#2024-01-01T12:00:00Z',
        userId: 'user-1',
        username: 'testuser',
        score: 1400, // Within 3 std dev
        gameId: 'game-1',
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
        timestamp: '2024-01-01T12:00:00Z',
        date: '2024-01-01',
        week: '2024-W01',
        month: '2024-01',
      };

      // Mock normal velocity with varied scores and times
      const recentGames = [
        { ...entry, gameId: 'game-1', score: 1200, completionTime: 35, timestamp: '2024-01-01T10:00:00Z' },
        { ...entry, gameId: 'game-2', score: 1500, completionTime: 28, timestamp: '2024-01-01T09:00:00Z' },
        { ...entry, gameId: 'game-3', score: 1300, completionTime: 32, timestamp: '2024-01-01T08:00:00Z' },
      ];

      ddbMock.on(QueryCommand).resolves({ Items: recentGames });

      const flags = await service.detectAnomalies(entry, stats);

      expect(flags.isSuspicious).toBe(false);
      expect(flags.isStatisticalOutlier).toBe(false);
      expect(flags.isVelocityAnomaly).toBe(false);
      expect(flags.isPatternAnomaly).toBe(false);
    });
  });
});
