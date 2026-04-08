import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.EMAIL_PREFS_TABLE_NAME || 'memory-game-email-prefs-dev';

export interface EmailPrefs {
  userId: string;
  email: string;
  username: string;
  dailyDigest: boolean;
  updatedAt: string;
}

export class EmailPrefsService {
  async getPrefs(userId: string): Promise<EmailPrefs | null> {
    const result = await client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId },
    }));
    return (result.Item as EmailPrefs) || null;
  }

  async setPrefs(userId: string, email: string, username: string, dailyDigest: boolean): Promise<EmailPrefs> {
    const prefs: EmailPrefs = {
      userId,
      email,
      username,
      dailyDigest,
      updatedAt: new Date().toISOString(),
    };
    await client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: prefs,
    }));
    logger.info('Email prefs updated', { userId, dailyDigest });
    return prefs;
  }

  async getOptedInUsers(): Promise<EmailPrefs[]> {
    const result = await client.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'dailyDigest = :yes',
      ExpressionAttributeValues: { ':yes': true },
    }));
    return (result.Items as EmailPrefs[]) || [];
  }
}
