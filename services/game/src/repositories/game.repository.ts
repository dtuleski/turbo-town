import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { Game, GameStatus } from '@memory-game/shared';
import { GameRepository as IGameRepository, QueryOptions } from '../types';
import { mapDynamoDBError } from '../utils/error-mapper';
import { v4 as uuidv4 } from 'uuid';

// Initialize DynamoDB client (singleton for Lambda container reuse)
const dynamoDBClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.GAMES_TABLE_NAME!;

export class GameRepository implements IGameRepository {
  /**
   * Create a new game
   */
  async create(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game> {
    const now = new Date();
    const nowISO = now.toISOString();
    const gameId = uuidv4();
    
    // Store as ISO strings in DynamoDB
    const dbItem = {
      userId: game.userId,
      gameId: gameId,
      themeId: game.themeId,
      difficulty: game.difficulty,
      status: game.status,
      startedAt: game.startedAt instanceof Date ? game.startedAt.toISOString() : game.startedAt,
      completedAt: game.completedAt instanceof Date ? game.completedAt.toISOString() : game.completedAt,
      completionTime: game.completionTime,
      attempts: game.attempts,
      score: game.score,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: dbItem,
        })
      );

      // Return as Game with Date objects
      return {
        id: gameId,
        userId: game.userId,
        themeId: game.themeId,
        difficulty: game.difficulty,
        status: game.status,
        startedAt: game.startedAt instanceof Date ? game.startedAt : new Date(game.startedAt),
        completedAt: game.completedAt ? (game.completedAt instanceof Date ? game.completedAt : new Date(game.completedAt)) : undefined,
        completionTime: game.completionTime,
        attempts: game.attempts,
        score: game.score,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Get game by ID
   */
  async getById(gameId: string, userId?: string): Promise<Game | null> {
    // If userId not provided, we need to query by gameId using GSI
    // For now, require userId for direct get
    if (!userId) {
      throw new Error('userId required for getById');
    }

    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { userId: userId, gameId: gameId },
        })
      );

      return result.Item ? (result.Item as Game) : null;
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Update game
   */
  async update(gameId: string, updates: Partial<Game>, userId?: string): Promise<Game> {
    if (!userId && updates.userId) {
      userId = updates.userId;
    }
    if (!userId) {
      throw new Error('userId required for update');
    }

    const now = new Date().toISOString();
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build update expression - convert Date objects to ISO strings
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'userId' && key !== 'gameId' && key !== 'id') { // Skip key attributes
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value instanceof Date ? value.toISOString() : value;
      }
    });

    // Always update updatedAt
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { userId: userId, gameId: gameId },
          UpdateExpression: `SET ${updateExpression.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
      );

      return result.Attributes as Game;
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Query games by user ID
   */
  async queryByUser(userId: string, options: QueryOptions = {}): Promise<Game[]> {
    const { limit = 20, lastEvaluatedKey, sortOrder = 'desc', filters = {} } = options;

    try {
      let filterExpression: string | undefined;
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = { ':userId': userId };

      // Build filter expression
      const filterConditions: string[] = [];
      if (filters.themeId) {
        filterConditions.push('#themeId = :themeId');
        expressionAttributeNames['#themeId'] = 'themeId';
        expressionAttributeValues[':themeId'] = filters.themeId;
      }
      if (filters.difficulty) {
        filterConditions.push('#difficulty = :difficulty');
        expressionAttributeNames['#difficulty'] = 'difficulty';
        expressionAttributeValues[':difficulty'] = filters.difficulty;
      }
      if (filters.status) {
        filterConditions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = filters.status;
      }

      if (filterConditions.length > 0) {
        filterExpression = filterConditions.join(' AND ');
      }

      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          // No IndexName needed - userId is the partition key
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: expressionAttributeValues,
          ExpressionAttributeNames:
            Object.keys(expressionAttributeNames).length > 0
              ? expressionAttributeNames
              : undefined,
          FilterExpression: filterExpression,
          Limit: limit,
          ExclusiveStartKey: lastEvaluatedKey,
          ScanIndexForward: sortOrder === 'asc',
        })
      );

      return (result.Items || []) as Game[];
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Query games by status
   */
  async queryByStatus(status: GameStatus, options: QueryOptions = {}): Promise<Game[]> {
    const { limit = 100, lastEvaluatedKey } = options;

    try {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'StatusIndex',
          KeyConditionExpression: '#status = :status',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':status': status },
          Limit: limit,
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      return (result.Items || []) as Game[];
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Delete game (admin only)
   */
  async delete(gameId: string, userId: string): Promise<void> {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { userId: userId, gameId: gameId },
        })
      );
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }
}
