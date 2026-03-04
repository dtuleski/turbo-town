import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UserSettings, UITheme } from '@memory-game/shared';
import { IUserSettingsRepository } from '../types';
import { mapDynamoDBError } from '../utils/error-mapper';
import { logger } from '../utils/logger';
import { metrics, MetricName } from '../utils/metrics';

export class UserSettingsRepository implements IUserSettingsRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.DYNAMODB_USER_SETTINGS_TABLE || '';

    if (!this.tableName) {
      throw new Error('DYNAMODB_USER_SETTINGS_TABLE must be set');
    }
  }

  async create(userId: string): Promise<UserSettings> {
    try {
      logger.debug('Creating user settings', { userId });

      const now = new Date();
      const settings: UserSettings = {
        userId,
        soundEffectsEnabled: true,
        musicEnabled: true,
        soundVolume: 0.7,
        musicVolume: 0.5,
        notificationsEnabled: true,
        language: 'en',
        theme: UITheme.Light,
        autoProgressDifficulty: false,
        createdAt: now,
        updatedAt: now,
      };

      await metrics.measureTime(
        async () => {
          const command = new PutCommand({
            TableName: this.tableName,
            Item: {
              ...settings,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
            },
            ConditionExpression: 'attribute_not_exists(userId)',
          });
          return await this.docClient.send(command);
        },
        MetricName.DYNAMODB_OPERATION_TIME,
        { operation: 'create', table: 'UserSettings' },
      );

      logger.info('User settings created successfully', { userId });

      return settings;
    } catch (error) {
      logger.error('Failed to create user settings', error as Error, { userId });
      throw mapDynamoDBError(error as Error);
    }
  }

  async getByUserId(userId: string): Promise<UserSettings | null> {
    try {
      logger.debug('Getting user settings', { userId });

      const result = await metrics.measureTime(
        async () => {
          const command = new GetCommand({
            TableName: this.tableName,
            Key: { userId },
          });
          return await this.docClient.send(command);
        },
        MetricName.DYNAMODB_OPERATION_TIME,
        { operation: 'getByUserId', table: 'UserSettings' },
      );

      if (!result.Item) {
        logger.debug('User settings not found', { userId });
        return null;
      }

      return this.mapToUserSettings(result.Item);
    } catch (error) {
      logger.error('Failed to get user settings', error as Error, { userId });
      throw mapDynamoDBError(error as Error);
    }
  }

  async update(userId: string, updates: Partial<UserSettings>): Promise<UserSettings> {
    try {
      logger.debug('Updating user settings', { userId, updates });

      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, unknown> = {};

      // Build update expression dynamically
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'userId' && key !== 'createdAt' && value !== undefined) {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value instanceof Date ? value.toISOString() : value;
        }
      });

      // Always update updatedAt
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const result = await metrics.measureTime(
        async () => {
          const command = new UpdateCommand({
            TableName: this.tableName,
            Key: { userId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
          });
          return await this.docClient.send(command);
        },
        MetricName.DYNAMODB_OPERATION_TIME,
        { operation: 'update', table: 'UserSettings' },
      );

      if (!result.Attributes) {
        throw new Error('User settings not found');
      }

      logger.info('User settings updated successfully', { userId });

      return this.mapToUserSettings(result.Attributes);
    } catch (error) {
      logger.error('Failed to update user settings', error as Error, { userId });
      throw mapDynamoDBError(error as Error);
    }
  }

  private mapToUserSettings(item: Record<string, unknown>): UserSettings {
    return {
      userId: item.userId as string,
      soundEffectsEnabled: item.soundEffectsEnabled as boolean,
      musicEnabled: item.musicEnabled as boolean,
      soundVolume: item.soundVolume as number,
      musicVolume: item.musicVolume as number,
      notificationsEnabled: item.notificationsEnabled as boolean,
      language: item.language as string,
      theme: item.theme as UITheme,
      autoProgressDifficulty: item.autoProgressDifficulty as boolean,
      createdAt: new Date(item.createdAt as string),
      updatedAt: new Date(item.updatedAt as string),
    };
  }
}
