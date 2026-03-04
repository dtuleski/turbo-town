import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { User, SubscriptionTier } from '@memory-game/shared';
import { IUserRepository } from '../types';
import { mapDynamoDBError } from '../utils/error-mapper';
import { logger } from '../utils/logger';
import { metrics, MetricName } from '../utils/metrics';

export class UserRepository implements IUserRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.DYNAMODB_USERS_TABLE || '';

    if (!this.tableName) {
      throw new Error('DYNAMODB_USERS_TABLE must be set');
    }
  }

  async create(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      logger.debug('Creating user', { userId: user.id, email: user.email });

      const now = new Date();
      const newUser: User = {
        ...user,
        createdAt: now,
        updatedAt: now,
      };

      await metrics.measureTime(
        async () => {
          const command = new PutCommand({
            TableName: this.tableName,
            Item: {
              ...newUser,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              lastLoginAt: newUser.lastLoginAt?.toISOString(),
            },
            ConditionExpression: 'attribute_not_exists(id)',
          });
          return await this.docClient.send(command);
        },
        MetricName.DYNAMODB_OPERATION_TIME,
        { operation: 'create', table: 'Users' },
      );

      logger.info('User created successfully', { userId: user.id, email: user.email });

      return newUser;
    } catch (error) {
      logger.error('Failed to create user', error as Error, { userId: user.id, email: user.email });
      throw mapDynamoDBError(error as Error);
    }
  }

  async getById(userId: string): Promise<User | null> {
    try {
      logger.debug('Getting user by ID', { userId });

      const result = await metrics.measureTime(
        async () => {
          const command = new GetCommand({
            TableName: this.tableName,
            Key: { id: userId },
          });
          return await this.docClient.send(command);
        },
        MetricName.DYNAMODB_OPERATION_TIME,
        { operation: 'getById', table: 'Users' },
      );

      if (!result.Item) {
        logger.debug('User not found', { userId });
        return null;
      }

      return this.mapToUser(result.Item);
    } catch (error) {
      logger.error('Failed to get user by ID', error as Error, { userId });
      throw mapDynamoDBError(error as Error);
    }
  }

  async getByEmail(email: string): Promise<User | null> {
    try {
      logger.debug('Getting user by email', { email });

      const result = await metrics.measureTime(
        async () => {
          const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'EmailIndex',
            KeyConditionExpression: 'email = :email',
            ExpressionAttributeValues: {
              ':email': email.toLowerCase(),
            },
            Limit: 1,
          });
          return await this.docClient.send(command);
        },
        MetricName.DYNAMODB_OPERATION_TIME,
        { operation: 'getByEmail', table: 'Users' },
      );

      if (!result.Items || result.Items.length === 0) {
        logger.debug('User not found by email', { email });
        return null;
      }

      return this.mapToUser(result.Items[0]);
    } catch (error) {
      logger.error('Failed to get user by email', error as Error, { email });
      throw mapDynamoDBError(error as Error);
    }
  }

  async getByCognitoId(cognitoId: string): Promise<User | null> {
    try {
      logger.debug('Getting user by Cognito ID', { cognitoId });

      const result = await metrics.measureTime(
        async () => {
          const command = new QueryCommand({
            TableName: this.tableName,
            IndexName: 'CognitoIdIndex',
            KeyConditionExpression: 'cognitoId = :cognitoId',
            ExpressionAttributeValues: {
              ':cognitoId': cognitoId,
            },
            Limit: 1,
          });
          return await this.docClient.send(command);
        },
        MetricName.DYNAMODB_OPERATION_TIME,
        { operation: 'getByCognitoId', table: 'Users' },
      );

      if (!result.Items || result.Items.length === 0) {
        logger.debug('User not found by Cognito ID', { cognitoId });
        return null;
      }

      return this.mapToUser(result.Items[0]);
    } catch (error) {
      logger.error('Failed to get user by Cognito ID', error as Error, { cognitoId });
      throw mapDynamoDBError(error as Error);
    }
  }

  async update(userId: string, updates: Partial<User>): Promise<User> {
    try {
      logger.debug('Updating user', { userId, updates });

      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, unknown> = {};

      // Build update expression dynamically
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'createdAt' && value !== undefined) {
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
            Key: { id: userId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
          });
          return await this.docClient.send(command);
        },
        MetricName.DYNAMODB_OPERATION_TIME,
        { operation: 'update', table: 'Users' },
      );

      if (!result.Attributes) {
        throw new Error('User not found');
      }

      logger.info('User updated successfully', { userId });

      return this.mapToUser(result.Attributes);
    } catch (error) {
      logger.error('Failed to update user', error as Error, { userId });
      throw mapDynamoDBError(error as Error);
    }
  }

  async updateTier(userId: string, tier: SubscriptionTier): Promise<User> {
    return this.update(userId, { tier });
  }

  async delete(userId: string): Promise<void> {
    try {
      logger.debug('Deleting user', { userId });

      await metrics.measureTime(
        async () => {
          const command = new DeleteCommand({
            TableName: this.tableName,
            Key: { id: userId },
          });
          return await this.docClient.send(command);
        },
        MetricName.DYNAMODB_OPERATION_TIME,
        { operation: 'delete', table: 'Users' },
      );

      logger.info('User deleted successfully', { userId });
    } catch (error) {
      logger.error('Failed to delete user', error as Error, { userId });
      throw mapDynamoDBError(error as Error);
    }
  }

  private mapToUser(item: Record<string, unknown>): User {
    return {
      id: item.id as string,
      email: item.email as string,
      name: item.name as string,
      profilePictureUrl: item.profilePictureUrl as string | undefined,
      role: item.role as User['role'],
      tier: item.tier as User['tier'],
      cognitoId: item.cognitoId as string,
      createdAt: new Date(item.createdAt as string),
      updatedAt: new Date(item.updatedAt as string),
      emailVerified: item.emailVerified as boolean,
      lastLoginAt: item.lastLoginAt ? new Date(item.lastLoginAt as string) : undefined,
    };
  }
}
