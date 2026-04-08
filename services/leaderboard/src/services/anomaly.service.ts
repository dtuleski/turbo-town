/**
 * Anomaly Detection Service
 * 
 * Detects suspicious scoring patterns to prevent cheating:
 * - Statistical outlier detection (z-score > 3)
 * - Velocity detection (too many games too quickly)
 * - Pattern detection (repeated identical scores)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { GameType, Difficulty, LeaderboardEntry } from '../types';

export interface AnomalyFlags {
  isStatisticalOutlier: boolean;
  isVelocityAnomaly: boolean;
  isPatternAnomaly: boolean;
  isSuspicious: boolean;
  reasons: string[];
}

export interface GameStatistics {
  gameType: GameType;
  difficulty: Difficulty;
  mean: number;
  stdDev: number;
  sampleSize: number;
  lastUpdated: string;
}

export interface VelocityCheck {
  gamesInLastMinute: number;
  gamesInLastDay: number;
  isExcessive: boolean;
}

export class AnomalyService {
  private docClient: DynamoDBDocumentClient;
  private statisticsTableName: string;
  private leaderboardTableName: string;

  // Velocity thresholds
  private readonly MAX_GAMES_PER_MINUTE = 10;
  private readonly MAX_GAMES_PER_DAY = 100;

  // Statistical outlier threshold (z-score)
  private readonly Z_SCORE_THRESHOLD = 3;

  // Pattern detection thresholds
  private readonly IDENTICAL_SCORE_THRESHOLD = 3; // Flag if same score appears 3+ times
  private readonly TIME_CONSISTENCY_THRESHOLD = 0.05; // Flag if completion times vary by less than 5%

  constructor(
    statisticsTableName: string = process.env.GAME_STATISTICS_TABLE_NAME || 'GameStatistics',
    leaderboardTableName: string = process.env.LEADERBOARD_TABLE_NAME || 'LeaderboardEntries'
  ) {
    const client = new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(client);
    this.statisticsTableName = statisticsTableName;
    this.leaderboardTableName = leaderboardTableName;
  }

  /**
   * Detect anomalies in a leaderboard entry
   */
  async detectAnomalies(
    entry: LeaderboardEntry,
    gameStats?: GameStatistics
  ): Promise<AnomalyFlags> {
    const flags: AnomalyFlags = {
      isStatisticalOutlier: false,
      isVelocityAnomaly: false,
      isPatternAnomaly: false,
      isSuspicious: false,
      reasons: [],
    };

    // Check statistical outlier
    if (gameStats) {
      const isOutlier = this.isStatisticalOutlier(entry.score, gameStats);
      if (isOutlier) {
        flags.isStatisticalOutlier = true;
        flags.reasons.push(
          `Score ${entry.score} is a statistical outlier (>3 std dev from mean ${gameStats.mean.toFixed(2)})`
        );
      }
    }

    // Check velocity
    const velocityCheck = await this.checkVelocity(entry.userId, entry.timestamp);
    if (velocityCheck.isExcessive) {
      flags.isVelocityAnomaly = true;
      if (velocityCheck.gamesInLastMinute > this.MAX_GAMES_PER_MINUTE) {
        flags.reasons.push(
          `Excessive game velocity: ${velocityCheck.gamesInLastMinute} games in last minute`
        );
      }
      if (velocityCheck.gamesInLastDay > this.MAX_GAMES_PER_DAY) {
        flags.reasons.push(
          `Excessive game velocity: ${velocityCheck.gamesInLastDay} games in last day`
        );
      }
    }

    // Check patterns
    const patternCheck = await this.checkPatterns(entry);
    if (patternCheck.isSuspicious) {
      flags.isPatternAnomaly = true;
      flags.reasons.push(...patternCheck.reasons);
    }

    // Set overall suspicious flag
    flags.isSuspicious =
      flags.isStatisticalOutlier || flags.isVelocityAnomaly || flags.isPatternAnomaly;

    return flags;
  }

  /**
   * Check if score is a statistical outlier using z-score
   */
  private isStatisticalOutlier(score: number, stats: GameStatistics): boolean {
    if (stats.stdDev === 0) {
      return false; // Can't determine outlier with zero standard deviation
    }

    const zScore = Math.abs((score - stats.mean) / stats.stdDev);
    return zScore > this.Z_SCORE_THRESHOLD;
  }

  /**
   * Check velocity: detect users completing games too quickly
   */
  private async checkVelocity(userId: string, currentTimestamp: string): Promise<VelocityCheck> {
    const now = new Date(currentTimestamp);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Query user's recent games
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.leaderboardTableName,
          IndexName: 'UserScoreHistoryIndex',
          KeyConditionExpression: 'userId = :userId AND #ts >= :oneDayAgo',
          ExpressionAttributeNames: {
            '#ts': 'timestamp',
          },
          ExpressionAttributeValues: {
            ':userId': userId,
            ':oneDayAgo': oneDayAgo.toISOString(),
          },
        })
      );

      const recentGames = result.Items || [];

      // Count games in last minute
      const gamesInLastMinute = recentGames.filter(
        (game: any) => new Date(game.timestamp) >= oneMinuteAgo
      ).length;

      // Count games in last day
      const gamesInLastDay = recentGames.length;

      return {
        gamesInLastMinute,
        gamesInLastDay,
        isExcessive:
          gamesInLastMinute > this.MAX_GAMES_PER_MINUTE ||
          gamesInLastDay > this.MAX_GAMES_PER_DAY,
      };
    } catch (error) {
      console.error('Error checking velocity:', error);
      // Return safe default on error
      return {
        gamesInLastMinute: 0,
        gamesInLastDay: 0,
        isExcessive: false,
      };
    }
  }

  /**
   * Check for suspicious patterns: repeated identical scores or consistent times
   */
  private async checkPatterns(
    entry: LeaderboardEntry
  ): Promise<{ isSuspicious: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    try {
      // Query user's recent games for the same game type
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.leaderboardTableName,
          IndexName: 'UserScoreHistoryIndex',
          KeyConditionExpression: 'userId = :userId',
          FilterExpression: 'gameType = :gameType',
          ExpressionAttributeValues: {
            ':userId': entry.userId,
            ':gameType': entry.gameType,
          },
          Limit: 20, // Check last 20 games
        })
      );

      const recentGames = (result.Items || []) as LeaderboardEntry[];

      if (recentGames.length >= 3) {
        // Check for identical scores
        const identicalScores = recentGames.filter((game) => game.score === entry.score);
        if (identicalScores.length >= this.IDENTICAL_SCORE_THRESHOLD) {
          reasons.push(
            `Repeated identical score ${entry.score} appears ${identicalScores.length} times`
          );
        }

        // Check for suspiciously consistent completion times
        const completionTimes = recentGames.map((game) => game.completionTime);
        if (completionTimes.length >= 3) {
          const mean =
            completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
          const variance =
            completionTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) /
            completionTimes.length;
          const coefficientOfVariation = Math.sqrt(variance) / mean;

          if (coefficientOfVariation < this.TIME_CONSISTENCY_THRESHOLD) {
            reasons.push(
              `Suspiciously consistent completion times (CV: ${(coefficientOfVariation * 100).toFixed(2)}%)`
            );
          }
        }
      }
    } catch (error) {
      console.error('Error checking patterns:', error);
      // Don't flag as suspicious on error
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Get game statistics for outlier detection
   */
  async getGameStatistics(gameType: GameType, difficulty: Difficulty): Promise<GameStatistics | null> {
    try {
      const result = await this.docClient.send(
        new GetCommand({
          TableName: this.statisticsTableName,
          Key: {
            gameType,
            difficulty,
          },
        })
      );

      if (!result.Item) {
        return null;
      }

      return result.Item as GameStatistics;
    } catch (error) {
      console.error('Error getting game statistics:', error);
      return null;
    }
  }

  /**
   * Update game statistics (batch job)
   * Calculates mean and standard deviation for each game type and difficulty
   */
  async updateGameStatistics(gameType: GameType): Promise<void> {
    const difficulties = this.getDifficultiesForGameType(gameType);

    for (const difficulty of difficulties) {
      try {
        // Query all scores for this game type and difficulty
        const result = await this.docClient.send(
          new QueryCommand({
            TableName: this.leaderboardTableName,
            KeyConditionExpression: 'gameType = :gameType',
            FilterExpression: 'difficulty = :difficulty',
            ExpressionAttributeValues: {
              ':gameType': gameType,
              ':difficulty': difficulty,
            },
          })
        );

        const entries = (result.Items || []) as LeaderboardEntry[];

        if (entries.length === 0) {
          console.log(`No entries found for ${gameType} ${difficulty}`);
          continue;
        }

        // Calculate mean
        const scores = entries.map((entry) => entry.score);
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;

        // Calculate standard deviation
        const variance =
          scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        // Store statistics
        const statistics: GameStatistics = {
          gameType,
          difficulty,
          mean,
          stdDev,
          sampleSize: scores.length,
          lastUpdated: new Date().toISOString(),
        };

        await this.docClient.send(
          new PutCommand({
            TableName: this.statisticsTableName,
            Item: statistics,
          })
        );

        console.log(
          `Updated statistics for ${gameType} ${difficulty}: mean=${mean.toFixed(2)}, stdDev=${stdDev.toFixed(2)}, n=${scores.length}`
        );
      } catch (error) {
        console.error(`Error updating statistics for ${gameType} ${difficulty}:`, error);
      }
    }
  }

  /**
   * Get valid difficulties for a game type
   */
  private getDifficultiesForGameType(gameType: GameType): Difficulty[] {
    switch (gameType) {
      case GameType.MEMORY_MATCH:
      case GameType.MATH_CHALLENGE:
      case GameType.WORD_PUZZLE:
        return [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];
      case GameType.LANGUAGE_LEARNING:
        return [Difficulty.BEGINNER, Difficulty.INTERMEDIATE, Difficulty.ADVANCED];
      default:
        return [];
    }
  }
}
