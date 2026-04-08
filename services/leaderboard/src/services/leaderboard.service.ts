/**
 * Leaderboard Service
 * 
 * Business logic for leaderboard management, including:
 * - Retrieving leaderboard rankings
 * - Calculating user ranks and percentiles
 * - Managing leaderboard entries and user aggregates
 */

import { LeaderboardRepository } from '../repositories/leaderboard.repository';
import { AggregateRepository } from '../repositories/aggregate.repository';
import {
  GameType,
  Timeframe,
  LeaderboardResponse,
  LeaderboardEntryWithRank,
  UserRankResponse,
  LeaderboardEntry,
  CreateLeaderboardEntryInput,
  UpdateAggregateInput,
  QueryLeaderboardInput,
} from '../types';

export class LeaderboardService {
  private leaderboardRepo: LeaderboardRepository;
  private aggregateRepo: AggregateRepository;

  constructor(
    leaderboardRepo?: LeaderboardRepository,
    aggregateRepo?: AggregateRepository
  ) {
    this.leaderboardRepo = leaderboardRepo || new LeaderboardRepository();
    this.aggregateRepo = aggregateRepo || new AggregateRepository();
  }

  /**
   * Get leaderboard with rankings for a specific game type and timeframe
   */
  async getLeaderboard(
    gameType: GameType,
    timeframe: Timeframe,
    userId?: string,
    limit: number = 100
  ): Promise<LeaderboardResponse> {
    let entries: LeaderboardEntry[];

    // For OVERALL game type with time-based queries, aggregate across all game types
    if (gameType === 'OVERALL' && timeframe !== 'ALL_TIME') {
      entries = await this.getOverallTimeBasedLeaderboard(timeframe, limit);
    }
    // For ALL_TIME, use aggregates to show only best score per user
    else if (timeframe === 'ALL_TIME') {
      const aggregates = await this.aggregateRepo.getTopAggregates(gameType, limit);
      
      // For each aggregate, fetch the actual game entry with that best score
      // to get accurate time and accuracy data
      const entriesPromises = aggregates.map(async (agg) => {
        // Query for the specific game that achieved the best score
        const bestGameEntries = await this.leaderboardRepo.queryUserHistory(agg.userId, agg.gameType === 'OVERALL' ? undefined : agg.gameType, 100);
        
        // Find the entry with the best score - sort by score descending and take first
        const sortedEntries = bestGameEntries.sort((a, b) => b.score - a.score);
        const bestGame = sortedEntries[0];
        
        // If no game found, create a minimal entry (shouldn't happen but defensive)
        if (!bestGame) {
          return {
            gameId: '',
            userId: agg.userId,
            username: agg.username,
            gameType: agg.gameType,
            score: agg.bestScore,
            scoreTimestamp: `SCORE#${String(agg.bestScore).padStart(10, '0')}#TIMESTAMP#${agg.lastPlayed}`,
            difficulty: 'MEDIUM' as any,
            completionTime: 0,
            accuracy: 0,
            timestamp: agg.lastPlayed,
            date: agg.lastPlayed.split('T')[0],
            week: '',
            month: agg.lastPlayed.substring(0, 7),
            metadata: {},
            suspicious: false,
          };
        }
        
        return {
          gameId: bestGame.gameId,
          userId: agg.userId,
          username: agg.username,
          gameType: bestGame.gameType, // Use actual game type from entry
          score: bestGame.score,
          scoreTimestamp: `SCORE#${String(bestGame.score).padStart(10, '0')}#TIMESTAMP#${bestGame.timestamp}`,
          difficulty: bestGame.difficulty,
          completionTime: bestGame.completionTime,
          accuracy: bestGame.accuracy,
          timestamp: bestGame.timestamp,
          date: bestGame.date,
          week: bestGame.week,
          month: bestGame.month,
          metadata: bestGame.metadata || {},
          suspicious: bestGame.suspicious || false,
        };
      });
      
      entries = await Promise.all(entriesPromises);
    } else {
      // For time-based queries with specific game type, get entries and deduplicate by user
      const allEntries = await this.leaderboardRepo.queryByGameTypeAndTimeframe({
        gameType,
        timeframe,
        limit: 1000, // Get more entries to ensure we capture all users
      });
      
      // Group by user and keep only the best score for each user
      const userBestScores = new Map<string, LeaderboardEntry>();
      for (const entry of allEntries) {
        const existing = userBestScores.get(entry.userId);
        if (!existing || entry.score > existing.score) {
          userBestScores.set(entry.userId, entry);
        }
      }
      
      // Convert back to array, sort by score, and limit
      entries = Array.from(userBestScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }

    // Calculate ranks
    const entriesWithRank = this.calculateRanks(entries, userId);

    // Find current user's entry
    const currentUserEntry = entriesWithRank.find((entry) => entry.isCurrentUser);

    return {
      entries: entriesWithRank,
      currentUserEntry: currentUserEntry || undefined,
      totalEntries: entriesWithRank.length,
      timeframe,
    };
  }

  /**
   * Get OVERALL leaderboard for time-based queries (DAILY, WEEKLY, MONTHLY)
   * Aggregates best scores across all game types for each user in the time period
   */
  private async getOverallTimeBasedLeaderboard(
    timeframe: Timeframe,
    limit: number
  ): Promise<LeaderboardEntry[]> {
    // Get all game types (excluding OVERALL itself)
    const gameTypes: GameType[] = [
      GameType.MEMORY_MATCH,
      GameType.MATH_CHALLENGE,
      GameType.WORD_PUZZLE,
      GameType.LANGUAGE_LEARNING,
      GameType.SUDOKU,
      GameType.JIGSAW_PUZZLE,
      GameType.BUBBLE_POP,
      GameType.SEQUENCE_MEMORY,
      GameType.CODE_A_BOT,
      GameType.GEO_QUIZ,
      GameType.HISTORY_QUIZ,
      GameType.CIVICS_QUIZ,
      GameType.COLOR_BY_NUMBER,
      GameType.HANGMAN,
      GameType.TIC_TAC_TOE,
    ];
    
    // Fetch entries for all game types in parallel
    const allEntriesPromises = gameTypes.map(gt =>
      this.leaderboardRepo.queryByGameTypeAndTimeframe({
        gameType: gt,
        timeframe,
        limit: 1000, // Get more entries to ensure we capture all users
      })
    );
    
    const allEntriesArrays = await Promise.all(allEntriesPromises);
    const allEntries = allEntriesArrays.flat();
    
    // Group by user and find best score (not sum)
    const userScores = new Map<string, {
      username: string;
      bestScore: number;
      bestEntry: LeaderboardEntry;
    }>();
    
    for (const entry of allEntries) {
      const existing = userScores.get(entry.userId);
      if (!existing) {
        userScores.set(entry.userId, {
          username: entry.username,
          bestScore: entry.score,
          bestEntry: entry,
        });
      } else {
        // Keep the best score, not sum
        if (entry.score > existing.bestScore) {
          existing.bestScore = entry.score;
          existing.bestEntry = entry;
        }
      }
    }
    
    // Convert to leaderboard entries
    const entries: LeaderboardEntry[] = Array.from(userScores.entries()).map(([userId, data]) => ({
      gameId: data.bestEntry.gameId,
      userId,
      username: data.username,
      gameType: GameType.OVERALL,
      score: data.bestScore,
      scoreTimestamp: `SCORE#${String(data.bestScore).padStart(10, '0')}#TIMESTAMP#${data.bestEntry.timestamp}`,
      difficulty: data.bestEntry.difficulty,
      completionTime: data.bestEntry.completionTime,
      accuracy: data.bestEntry.accuracy,
      timestamp: data.bestEntry.timestamp,
      date: data.bestEntry.date,
      week: data.bestEntry.week,
      month: data.bestEntry.month,
      metadata: data.bestEntry.metadata || {},
      suspicious: data.bestEntry.suspicious || false,
    }));
    
    // Sort by total score descending and limit
    return entries.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get user's rank for a specific game type and timeframe
   */
  async getUserRank(
    userId: string,
    gameType: GameType,
    timeframe: Timeframe
  ): Promise<UserRankResponse | null> {
    // Get all entries for the timeframe
    const entries = await this.leaderboardRepo.queryByGameTypeAndTimeframe({
      gameType,
      timeframe,
      limit: 10000, // Get all entries to calculate accurate rank
    });

    if (entries.length === 0) {
      return null;
    }

    // Find user's best score
    const userEntries = entries.filter((entry) => entry.userId === userId);
    if (userEntries.length === 0) {
      return null;
    }

    const bestUserScore = Math.max(...userEntries.map((entry) => entry.score));

    // Count entries with higher scores
    const higherScores = entries.filter((entry) => entry.score > bestUserScore);
    const rank = higherScores.length + 1;

    // Calculate percentile
    const totalPlayers = new Set(entries.map((entry) => entry.userId)).size;
    const percentile = ((totalPlayers - rank) / totalPlayers) * 100;

    return {
      rank,
      score: bestUserScore,
      gameType,
      timeframe,
      totalPlayers,
      percentile: Math.round(percentile * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Get user's score history
   */
  async getUserScoreHistory(
    userId: string,
    gameType?: GameType,
    limit: number = 50
  ): Promise<LeaderboardEntry[]> {
    return await this.leaderboardRepo.queryUserHistory(userId, gameType, limit);
  }

  /**
   * Create a new leaderboard entry
   */
  async createLeaderboardEntry(
    input: CreateLeaderboardEntryInput
  ): Promise<LeaderboardEntry> {
    return await this.leaderboardRepo.createEntry(input);
  }

  /**
   * Update user aggregate with new score
   */
  async updateUserAggregate(input: UpdateAggregateInput): Promise<void> {
    await this.aggregateRepo.updateAggregate(input);
  }

  /**
   * Clear all leaderboard records (admin only)
   */
  async clearAllRecords(): Promise<{ success: boolean; message: string }> {
    try {
      // Clear leaderboard entries
      await this.leaderboardRepo.clearAllEntries();
      
      // Clear user aggregates
      await this.aggregateRepo.clearAllAggregates();
      
      return {
        success: true,
        message: 'All leaderboard records cleared successfully'
      };
    } catch (error) {
      console.error('Failed to clear records:', error);
      throw new Error('Failed to clear leaderboard records');
    }
  }

  /**
   * Calculate ranks for leaderboard entries
   * Entries with the same score get the same rank
   */
  private calculateRanks(
    entries: LeaderboardEntry[],
    currentUserId?: string
  ): LeaderboardEntryWithRank[] {
    // Sort by score descending (highest first)
    const sorted = [...entries].sort((a, b) => b.score - a.score);

    let currentRank = 1;
    let previousScore: number | null = null;

    return sorted.map((entry, index) => {
      // If score is different from previous, update rank
      if (previousScore !== null && entry.score < previousScore) {
        currentRank = index + 1;
      }
      previousScore = entry.score;

      return {
        ...entry,
        rank: currentRank,
        isCurrentUser: currentUserId ? entry.userId === currentUserId : false,
      };
    });
  }
}
