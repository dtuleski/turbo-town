import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { Achievement, AchievementType } from '@memory-game/shared';
import { AchievementRepository as IAchievementRepository } from '../types';
import { mapDynamoDBError } from '../utils/error-mapper';

const dynamoDBClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const TABLE_NAME = process.env.ACHIEVEMENTS_TABLE_NAME!;

export class AchievementRepository implements IAchievementRepository {
  /**
   * Create achievement record
   */
  async create(achievement: Omit<Achievement, 'createdAt' | 'updatedAt'>): Promise<Achievement> {
    const now = new Date();
    const newAchievement: Achievement = {
      ...achievement,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: newAchievement,
        })
      );

      return newAchievement;
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Get all achievements for user
   */
  async getByUser(userId: string): Promise<Achievement[]> {
    try {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
        })
      );

      return (result.Items || []) as Achievement[];
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Get specific achievement for user
   */
  async getByUserAndType(userId: string, type: AchievementType): Promise<Achievement | null> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            userId,
            type,
          },
        })
      );

      return result.Item ? (result.Item as Achievement) : null;
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Update achievement progress
   */
  async update(
    userId: string,
    type: AchievementType,
    updates: Partial<Achievement>
  ): Promise<Achievement> {
    const now = new Date();
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      updateExpression.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    });

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            userId,
            type,
          },
          UpdateExpression: `SET ${updateExpression.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
      );

      return result.Attributes as Achievement;
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }

  /**
   * Mark achievement as unlocked
   */
  async unlock(userId: string, type: AchievementType): Promise<Achievement> {
    const now = new Date();

    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            userId,
            type,
          },
          UpdateExpression:
            'SET #unlocked = :unlocked, #completedAt = :completedAt, #updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#unlocked': 'unlocked',
            '#completedAt': 'completedAt',
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: {
            ':unlocked': true,
            ':completedAt': now,
            ':updatedAt': now,
          },
          ReturnValues: 'ALL_NEW',
        })
      );

      return result.Attributes as Achievement;
    } catch (error) {
      throw mapDynamoDBError(error as Error);
    }
  }
}
