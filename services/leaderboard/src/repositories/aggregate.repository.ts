/**
 * Aggregate Repository
 * 
 * Handles DynamoDB operations for the UserAggregates table.
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { UserAggregate, UpdateAggregateInput, GameType } from '../types';

export class AggregateRepository {
  private client: DynamoDBClient;
  private tableName: string;

  constructor(tableName?: string) {
    this.client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.tableName = tableName || process.env.USER_AGGREGATES_TABLE_NAME || 'UserAggregates';
  }

  /**
   * Get user aggregate for a specific game type
   */
  async getAggregate(userId: string, gameType: GameType): Promise<UserAggregate | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({
        userId,
        gameType,
      }),
    });

    const result = await this.client.send(command);

    if (!result.Item) {
      return null;
    }

    return unmarshall(result.Item) as UserAggregate;
  }

  /**
   * Get top aggregates for leaderboard (sorted by best score)
   */
  async getTopAggregates(gameType: GameType, limit: number = 100): Promise<UserAggregate[]> {
    let filterExpression: string;
    let expressionAttributeValues: any;

    if (gameType === 'OVERALL') {
      // For OVERALL, get all game types
      const command = new ScanCommand({
        TableName: this.tableName,
        Limit: 1000,
      });

      const result = await this.client.send(command);

      if (!result.Items || result.Items.length === 0) {
        return [];
      }

      const aggregates = result.Items.map(item => unmarshall(item) as UserAggregate);

      // Group by userId and sum scores across all game types
      const userScores = new Map<string, { username: string; totalScore: number; lastPlayed: string }>();
      
      for (const agg of aggregates) {
        const existing = userScores.get(agg.userId);
        if (!existing || agg.bestScore > existing.totalScore) {
          userScores.set(agg.userId, {
            username: agg.username,
            totalScore: agg.bestScore, // Use best score across all games
            lastPlayed: agg.lastPlayed,
          });
        }
      }

      // Convert to UserAggregate format
      const overallAggregates: UserAggregate[] = Array.from(userScores.entries()).map(([userId, data]) => ({
        userId,
        gameType: 'OVERALL' as GameType,
        username: data.username,
        totalScore: data.totalScore,
        gamesPlayed: 0,
        averageScore: 0,
        bestScore: data.totalScore,
        lastPlayed: data.lastPlayed,
        dailyScore: 0,
        weeklyScore: 0,
        monthlyScore: 0,
        dailyGames: 0,
        weeklyGames: 0,
        monthlyGames: 0,
      }));

      return overallAggregates
        .sort((a, b) => b.bestScore - a.bestScore)
        .slice(0, limit);
    } else {
      // For specific game type
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'gameType = :gameType',
        ExpressionAttributeValues: marshall({
          ':gameType': gameType,
        }),
        Limit: 1000,
      });

      const result = await this.client.send(command);

      if (!result.Items || result.Items.length === 0) {
        return [];
      }

      const aggregates = result.Items.map(item => unmarshall(item) as UserAggregate);

      return aggregates
        .sort((a, b) => b.bestScore - a.bestScore)
        .slice(0, limit);
    }
  }

  /**
   * Update user aggregate with new score
   */
  async updateAggregate(input: UpdateAggregateInput): Promise<UserAggregate> {
    const { userId, gameType, username, score, timestamp } = input;

    // Get existing aggregate or create new one
    const existing = await this.getAggregate(userId, gameType);

    const date = new Date(timestamp);
    const currentDate = date.toISOString().split('T')[0];
    const currentWeek = this.getISOWeek(date);
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (existing) {
      // Update existing aggregate
      const newTotalScore = existing.totalScore + score;
      const newGamesPlayed = existing.gamesPlayed + 1;
      const newAverageScore = newTotalScore / newGamesPlayed;
      const newBestScore = Math.max(existing.bestScore, score);

      // Check if we need to reset timeframe scores
      const existingDate = existing.lastPlayed.split('T')[0];
      const existingWeek = this.getISOWeek(new Date(existing.lastPlayed));
      const existingMonth = existing.lastPlayed.substring(0, 7);

      const dailyScore = existingDate === currentDate ? existing.dailyScore + score : score;
      const dailyGames = existingDate === currentDate ? existing.dailyGames + 1 : 1;

      const weeklyScore = existingWeek === currentWeek ? existing.weeklyScore + score : score;
      const weeklyGames = existingWeek === currentWeek ? existing.weeklyGames + 1 : 1;

      const monthlyScore = existingMonth === currentMonth ? existing.monthlyScore + score : score;
      const monthlyGames = existingMonth === currentMonth ? existing.monthlyGames + 1 : 1;

      const updated: UserAggregate = {
        userId,
        gameType,
        username,
        totalScore: newTotalScore,
        gamesPlayed: newGamesPlayed,
        averageScore: newAverageScore,
        bestScore: newBestScore,
        lastPlayed: timestamp,
        dailyScore,
        weeklyScore,
        monthlyScore,
        dailyGames,
        weeklyGames,
        monthlyGames,
      };

      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(updated),
      });

      await this.client.send(command);
      return updated;
    } else {
      // Create new aggregate
      const newAggregate: UserAggregate = {
        userId,
        gameType,
        username,
        totalScore: score,
        gamesPlayed: 1,
        averageScore: score,
        bestScore: score,
        lastPlayed: timestamp,
        dailyScore: score,
        weeklyScore: score,
        monthlyScore: score,
        dailyGames: 1,
        weeklyGames: 1,
        monthlyGames: 1,
      };

      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(newAggregate),
      });

      await this.client.send(command);
      return newAggregate;
    }
  }

  /**
   * Get ISO week string (YYYY-Www format)
   */
  private getISOWeek(date: Date): string {
    const target = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    return `${target.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  }

  /**
   * Clear all user aggregates (admin only)
   */
  async clearAllAggregates(): Promise<void> {
    const { DeleteItemCommand } = await import('@aws-sdk/client-dynamodb');
    
    // Scan all items
    const scanCommand = new ScanCommand({
      TableName: this.tableName,
      ProjectionExpression: 'userId, gameType',
    });
    
    const result = await this.client.send(scanCommand);
    
    if (!result.Items || result.Items.length === 0) {
      return;
    }
    
    // Delete each item
    for (const item of result.Items) {
      const deleteCommand = new DeleteItemCommand({
        TableName: this.tableName,
        Key: {
          userId: item.userId,
          gameType: item.gameType,
        },
      });
      
      await this.client.send(deleteCommand);
    }
  }
}
