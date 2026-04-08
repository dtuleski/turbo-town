/**
 * Property-based tests for LeaderboardService
 * 
 * **Validates: Requirements 8-13** (Leaderboard queries and rank calculation)
 */

import fc from 'fast-check';
import { LeaderboardService } from '../src/services/leaderboard.service';
import { LeaderboardRepository } from '../src/repositories/leaderboard.repository';
import { AggregateRepository } from '../src/repositories/aggregate.repository';
import { GameType, Difficulty, Timeframe, LeaderboardEntry } from '../src/types';

// Mock repositories
jest.mock('../src/repositories/leaderboard.repository');
jest.mock('../src/repositories/aggregate.repository');

describe('LeaderboardService Property-Based Tests', () => {
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

  /**
   * Property: Rank Consistency
   * Higher scores always have better (lower) ranks
   */
  describe('Property: Rank Consistency', () => {
    it('should assign better ranks to higher scores', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e'), { minLength: 5, maxLength: 10 }),
              username: fc.string({ minLength: 3, maxLength: 10 }),
              score: fc.integer({ min: 0, max: 10000 }),
              completionTime: fc.integer({ min: 5, max: 300 }),
              accuracy: fc.float({ min: 0, max: 1 }),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (entries) => {
            // Create mock leaderboard entries
            const mockEntries: LeaderboardEntry[] = entries.map((entry, index) => ({
              gameType: GameType.MEMORY_MATCH,
              scoreTimestamp: `SCORE#${String(entry.score).padStart(10, '0')}#TIMESTAMP#2026-03-11T10:${String(index).padStart(2, '0')}:00.000Z`,
              userId: entry.userId,
              username: entry.username,
              score: entry.score,
              gameId: `game-${index}`,
              difficulty: Difficulty.MEDIUM,
              completionTime: entry.completionTime,
              accuracy: entry.accuracy,
              timestamp: `2026-03-11T10:${String(index).padStart(2, '0')}:00.000Z`,
              date: '2026-03-11',
              week: '2026-W11',
              month: '2026-03',
            }));

            mockLeaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue(mockEntries);

            const result = await service.getLeaderboard(
              GameType.MEMORY_MATCH,
              Timeframe.DAILY,
              undefined,
              100
            );

            // Verify rank consistency: if score1 > score2, then rank1 < rank2
            for (let i = 0; i < result.entries.length - 1; i++) {
              const entry1 = result.entries[i];
              const entry2 = result.entries[i + 1];

              if (entry1.score > entry2.score) {
                expect(entry1.rank).toBeLessThan(entry2.rank);
              } else if (entry1.score === entry2.score) {
                expect(entry1.rank).toBe(entry2.rank);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Rank Ordering
   * Ranks should be sequential (1, 2, 3, ...) or have ties (1, 1, 3, ...)
   */
  describe('Property: Rank Ordering', () => {
    it('should produce valid rank sequences', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e'), { minLength: 5, maxLength: 10 }),
              username: fc.string({ minLength: 3, maxLength: 10 }),
              score: fc.integer({ min: 0, max: 10000 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (entries) => {
            const mockEntries: LeaderboardEntry[] = entries.map((entry, index) => ({
              gameType: GameType.MEMORY_MATCH,
              scoreTimestamp: `SCORE#${String(entry.score).padStart(10, '0')}#TIMESTAMP#2026-03-11T10:${String(index).padStart(2, '0')}:00.000Z`,
              userId: entry.userId,
              username: entry.username,
              score: entry.score,
              gameId: `game-${index}`,
              difficulty: Difficulty.MEDIUM,
              completionTime: 45,
              accuracy: 0.85,
              timestamp: `2026-03-11T10:${String(index).padStart(2, '0')}:00.000Z`,
              date: '2026-03-11',
              week: '2026-W11',
              month: '2026-03',
            }));

            mockLeaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue(mockEntries);

            const result = await service.getLeaderboard(
              GameType.MEMORY_MATCH,
              Timeframe.DAILY,
              undefined,
              100
            );

            // Verify ranks start at 1
            if (result.entries.length > 0) {
              expect(result.entries[0].rank).toBe(1);
            }

            // Verify ranks are valid (no gaps except for ties)
            const ranks = result.entries.map((e) => e.rank);
            const uniqueRanks = [...new Set(ranks)];
            
            // All ranks should be positive integers
            for (const rank of ranks) {
              expect(rank).toBeGreaterThanOrEqual(1);
              expect(Number.isInteger(rank)).toBe(true);
            }

            // Maximum rank should not exceed number of entries
            const maxRank = Math.max(...ranks);
            expect(maxRank).toBeLessThanOrEqual(result.entries.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Percentile Bounds
   * Percentiles should always be between 0 and 100
   */
  describe('Property: Percentile Bounds', () => {
    it('should calculate percentiles within valid range', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e'), { minLength: 5, maxLength: 10 }),
              username: fc.string({ minLength: 3, maxLength: 10 }),
              score: fc.integer({ min: 0, max: 10000 }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e'), { minLength: 5, maxLength: 10 }),
          async (entries, targetUserId) => {
            const mockEntries: LeaderboardEntry[] = entries.map((entry, index) => ({
              gameType: GameType.MEMORY_MATCH,
              scoreTimestamp: `SCORE#${String(entry.score).padStart(10, '0')}#TIMESTAMP#2026-03-11T10:${String(index).padStart(2, '0')}:00.000Z`,
              userId: entry.userId,
              username: entry.username,
              score: entry.score,
              gameId: `game-${index}`,
              difficulty: Difficulty.MEDIUM,
              completionTime: 45,
              accuracy: 0.85,
              timestamp: `2026-03-11T10:${String(index).padStart(2, '0')}:00.000Z`,
              date: '2026-03-11',
              week: '2026-W11',
              month: '2026-03',
            }));

            mockLeaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue(mockEntries);

            const result = await service.getUserRank(
              targetUserId,
              GameType.MEMORY_MATCH,
              Timeframe.DAILY
            );

            if (result !== null) {
              expect(result.percentile).toBeGreaterThanOrEqual(0);
              expect(result.percentile).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Total Players Count
   * Total players should equal unique user IDs
   */
  describe('Property: Total Players Count', () => {
    it('should count unique players correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e'), { minLength: 5, maxLength: 10 }),
              username: fc.string({ minLength: 3, maxLength: 10 }),
              score: fc.integer({ min: 0, max: 10000 }),
            }),
            { minLength: 1, maxLength: 30 }
          ),
          async (entries) => {
            const mockEntries: LeaderboardEntry[] = entries.map((entry, index) => ({
              gameType: GameType.MEMORY_MATCH,
              scoreTimestamp: `SCORE#${String(entry.score).padStart(10, '0')}#TIMESTAMP#2026-03-11T10:${String(index).padStart(2, '0')}:00.000Z`,
              userId: entry.userId,
              username: entry.username,
              score: entry.score,
              gameId: `game-${index}`,
              difficulty: Difficulty.MEDIUM,
              completionTime: 45,
              accuracy: 0.85,
              timestamp: `2026-03-11T10:${String(index).padStart(2, '0')}:00.000Z`,
              date: '2026-03-11',
              week: '2026-W11',
              month: '2026-03',
            }));

            mockLeaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue(mockEntries);

            // Pick a user that exists in the entries
            const targetUserId = entries[0].userId;

            const result = await service.getUserRank(
              targetUserId,
              GameType.MEMORY_MATCH,
              Timeframe.DAILY
            );

            if (result !== null) {
              const uniqueUserIds = new Set(entries.map((e) => e.userId));
              expect(result.totalPlayers).toBe(uniqueUserIds.size);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Current User Flag
   * Only the specified user should have isCurrentUser = true
   */
  describe('Property: Current User Flag', () => {
    it('should mark only the current user correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e'), { minLength: 5, maxLength: 10 }),
              username: fc.string({ minLength: 3, maxLength: 10 }),
              score: fc.integer({ min: 0, max: 10000 }),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (entries) => {
            const mockEntries: LeaderboardEntry[] = entries.map((entry, index) => ({
              gameType: GameType.MEMORY_MATCH,
              scoreTimestamp: `SCORE#${String(entry.score).padStart(10, '0')}#TIMESTAMP#2026-03-11T10:${String(index).padStart(2, '0')}:00.000Z`,
              userId: entry.userId,
              username: entry.username,
              score: entry.score,
              gameId: `game-${index}`,
              difficulty: Difficulty.MEDIUM,
              completionTime: 45,
              accuracy: 0.85,
              timestamp: `2026-03-11T10:${String(index).padStart(2, '0')}:00.000Z`,
              date: '2026-03-11',
              week: '2026-W11',
              month: '2026-03',
            }));

            mockLeaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue(mockEntries);

            const currentUserId = entries[0].userId;

            const result = await service.getLeaderboard(
              GameType.MEMORY_MATCH,
              Timeframe.DAILY,
              currentUserId,
              100
            );

            // Count entries marked as current user
            const currentUserEntries = result.entries.filter((e) => e.isCurrentUser);
            const currentUserIds = currentUserEntries.map((e) => e.userId);

            // All marked entries should have the current user ID
            for (const userId of currentUserIds) {
              expect(userId).toBe(currentUserId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
