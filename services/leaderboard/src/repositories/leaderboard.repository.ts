/**
 * Leaderboard Repository
 * 
 * Handles DynamoDB operations for the LeaderboardEntries table.
 */

import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  QueryCommandInput,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  LeaderboardEntry,
  CreateLeaderboardEntryInput,
  QueryLeaderboardInput,
  Timeframe,
  GameType,
} from '../types';

export class LeaderboardRepository {
  private client: DynamoDBClient;
  private tableName: string;

  constructor(tableName?: string) {
    this.client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.tableName = tableName || process.env.LEADERBOARD_TABLE_NAME || 'LeaderboardEntries';
  }

  /**
   * Create a new leaderboard entry
   */
  async createEntry(input: CreateLeaderboardEntryInput): Promise<LeaderboardEntry> {
    const timestamp = input.timestamp || new Date().toISOString();
    const date = new Date(timestamp);

    // Generate composite sort key: SCORE#{score}#TIMESTAMP#{timestamp}
    const scoreTimestamp = `SCORE#${input.score.toString().padStart(10, '0')}#TIMESTAMP#${timestamp}`;

    // Calculate timeframe values
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const weekStr = this.getISOWeek(date); // YYYY-Www
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM

    const entry: LeaderboardEntry = {
      gameType: input.gameType,
      scoreTimestamp,
      userId: input.userId,
      username: input.username,
      score: input.score,
      gameId: input.gameId,
      difficulty: input.difficulty,
      completionTime: input.completionTime,
      accuracy: input.accuracy,
      timestamp,
      date: dateStr,
      week: weekStr,
      month: monthStr,
      // Composite keys for GSI queries
      gameTypeDate: `${input.gameType}#${dateStr}`,
      gameTypeWeek: `${input.gameType}#${weekStr}`,
      gameTypeMonth: `${input.gameType}#${monthStr}`,
      metadata: input.metadata,
      suspicious: input.suspicious || false,
    };

    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(entry, { removeUndefinedValues: true }),
    });

    await this.client.send(command);
    return entry;
  }

  /**
   * Query leaderboard entries by game type and timeframe
   */
  async queryByGameTypeAndTimeframe(
    input: QueryLeaderboardInput
  ): Promise<LeaderboardEntry[]> {
    const { gameType, timeframe, limit = 100 } = input;

    let queryInput: QueryCommandInput;

    switch (timeframe) {
      case Timeframe.DAILY: {
        const today = new Date().toISOString().split('T')[0];
        queryInput = {
          TableName: this.tableName,
          IndexName: 'DailyLeaderboardIndex',
          KeyConditionExpression: '#gameTypeDate = :gameTypeDate',
          ExpressionAttributeNames: {
            '#gameTypeDate': 'gameTypeDate',
          },
          ExpressionAttributeValues: marshall({
            ':gameTypeDate': `${gameType}#${today}`,
          }),
          ScanIndexForward: false, // Descending order (highest scores first)
          Limit: limit,
        };
        break;
      }

      case Timeframe.WEEKLY: {
        const thisWeek = this.getISOWeek(new Date());
        queryInput = {
          TableName: this.tableName,
          IndexName: 'WeeklyLeaderboardIndex',
          KeyConditionExpression: '#gameTypeWeek = :gameTypeWeek',
          ExpressionAttributeNames: {
            '#gameTypeWeek': 'gameTypeWeek',
          },
          ExpressionAttributeValues: marshall({
            ':gameTypeWeek': `${gameType}#${thisWeek}`,
          }),
          ScanIndexForward: false,
          Limit: limit,
        };
        break;
      }

      case Timeframe.MONTHLY: {
        const date = new Date();
        const thisMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        queryInput = {
          TableName: this.tableName,
          IndexName: 'MonthlyLeaderboardIndex',
          KeyConditionExpression: '#gameTypeMonth = :gameTypeMonth',
          ExpressionAttributeNames: {
            '#gameTypeMonth': 'gameTypeMonth',
          },
          ExpressionAttributeValues: marshall({
            ':gameTypeMonth': `${gameType}#${thisMonth}`,
          }),
          ScanIndexForward: false,
          Limit: limit,
        };
        break;
      }

      case Timeframe.ALL_TIME: {
        queryInput = {
          TableName: this.tableName,
          KeyConditionExpression: '#gameType = :gameType',
          ExpressionAttributeNames: {
            '#gameType': 'gameType',
          },
          ExpressionAttributeValues: marshall({
            ':gameType': gameType,
          }),
          ScanIndexForward: false,
          Limit: limit,
        };
        break;
      }

      default:
        throw new Error(`Unknown timeframe: ${timeframe}`);
    }

    const command = new QueryCommand(queryInput);
    const result = await this.client.send(command);

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map((item) => unmarshall(item) as LeaderboardEntry);
  }

  /**
   * Query user's score history
   */
  async queryUserHistory(
    userId: string,
    gameType?: GameType,
    limit: number = 50
  ): Promise<LeaderboardEntry[]> {
    const queryInput: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'UserScoreHistoryIndex',
      KeyConditionExpression: '#userId = :userId',
      ExpressionAttributeNames: {
        '#userId': 'userId',
      },
      ExpressionAttributeValues: marshall({
        ':userId': userId,
      }),
      ScanIndexForward: false, // Descending order (most recent first)
      Limit: limit,
    };

    // Add game type filter if provided
    if (gameType) {
      queryInput.FilterExpression = '#gameType = :gameType';
      queryInput.ExpressionAttributeNames!['#gameType'] = 'gameType';
      queryInput.ExpressionAttributeValues = marshall({
        ':userId': userId,
        ':gameType': gameType,
      });
    }

    const command = new QueryCommand(queryInput);
    const result = await this.client.send(command);

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map((item) => unmarshall(item) as LeaderboardEntry);
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
   * Clear all leaderboard entries (admin only)
   */
  async clearAllEntries(): Promise<void> {
    const { ScanCommand, DeleteItemCommand } = await import('@aws-sdk/client-dynamodb');
    
    // Scan all items
    const scanCommand = new ScanCommand({
      TableName: this.tableName,
      ProjectionExpression: 'gameType, scoreTimestamp',
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
          gameType: item.gameType,
          scoreTimestamp: item.scoreTimestamp,
        },
      });
      
      await this.client.send(deleteCommand);
    }
  }
}
