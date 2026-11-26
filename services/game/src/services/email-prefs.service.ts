import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { CHALLENGE_LANGUAGES, ValidationError, isValidTimeZone } from '@memory-game/shared';
import type { ChallengeLanguage } from '@memory-game/shared';
import { logger } from '../utils/logger';
interface DocSender {
  send(command: unknown): Promise<any>;
}
const defaultClient = (): DocSender =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  }) as unknown as DocSender;
const TABLE_NAME = process.env.EMAIL_PREFS_TABLE_NAME || 'memory-game-email-prefs-dev';
export interface EmailPrefs {
  userId: string;
  email: string;
  username: string;
  dailyDigest: boolean;
  updatedAt: string;
}
export interface NotificationSettings {
  timeZone: string | null;
  language: ChallengeLanguage | null;
}
/** One send per user per local date and kind (FR-DC-10). */
export type SendKind = 'DigestEmail' | 'DigestPush' | 'ChallengePush';
/** Claim attributes on the email-prefs item, holding the local date of the last send. */
export const CLAIM_ATTRIBUTES: Readonly<Record<SendKind, string>> = Object.freeze({
  DigestEmail: 'lastDigestEmailOn',
  DigestPush: 'lastDigestPushOn',
  ChallengePush: 'lastChallengePushOn',
});
export const INVALID_NOTIFICATION_SETTINGS_MESSAGE = 'Invalid notification settings';
const isConditionFailure = (error: unknown) => (error as Error)?.name === 'ConditionalCheckFailedException';
export function isChallengeLanguage(value: unknown): value is ChallengeLanguage {
  return typeof value === 'string' && (CHALLENGE_LANGUAGES as readonly string[]).includes(value);
}
/**
 * Email preferences, the notification settings store (G7). One item per user in
 * EMAIL_PREFS_TABLE_NAME: the toggle (`dailyDigest`), the time zone and language used for local-time
 * sends, and the send claims. Every write is an UpdateItem so a write never removes the others.
 */
export class EmailPrefsService {
  private readonly client: DocSender;
  private readonly tableName: string;
  constructor(client?: DocSender, tableName?: string) {
    this.client = client ?? defaultClient();
    this.tableName = tableName ?? TABLE_NAME;
  }
  async getPrefs(userId: string): Promise<EmailPrefs | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { userId },
    }));
    return (result.Item as EmailPrefs) || null;
  }
  /** Sets the toggle and contact fields; time zone, language and claims are kept. */
  async setPrefs(userId: string, email: string, username: string, dailyDigest: boolean): Promise<EmailPrefs> {
    const prefs: EmailPrefs = {
      userId,
      email,
      username,
      dailyDigest,
      updatedAt: new Date().toISOString(),
    };
    await this.client.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { userId },
      UpdateExpression: 'SET #e = :e, #n = :n, #d = :d, #t = :t',
      ExpressionAttributeNames: { '#e': 'email', '#n': 'username', '#d': 'dailyDigest', '#t': 'updatedAt' },
      ExpressionAttributeValues: { ':e': email, ':n': username, ':d': dailyDigest, ':t': prefs.updatedAt },
    }));
    logger.info('Email prefs updated', { userId, dailyDigest });
    return prefs;
  }
  /**
   * Saves the time zone and language (S6). Only the given fields are written; an account with no
   * item gets one without `dailyDigest`, so it stays off. `updatedAt` is not touched: the digest
   * uses it to pick one record per email address.
   */
  async setLocale(userId: string, timeZone?: unknown, language?: unknown): Promise<NotificationSettings> {
    const given = (v: unknown) => v !== undefined && v !== null;
    if ((given(timeZone) && !isValidTimeZone(timeZone)) || (given(language) && !isChallengeLanguage(language))) {
      throw new ValidationError(INVALID_NOTIFICATION_SETTINGS_MESSAGE);
    }
    const sets: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    if (given(timeZone)) {
      sets.push('#z = :z');
      names['#z'] = 'timeZone';
      values[':z'] = timeZone;
    }
    if (given(language)) {
      sets.push('#l = :l');
      names['#l'] = 'language';
      values[':l'] = language;
    }
    if (sets.length === 0) {
      const current = (await this.getPrefs(userId)) as Record<string, unknown> | null;
      return settingsOf(current);
    }
    const result = await this.client.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { userId },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    logger.info('Notification settings updated', { userId, timeZone: given(timeZone), language: given(language) });
    return settingsOf(result?.Attributes ?? null);
  }
  /**
   * Takes the send for `localDate` (FR-DC-10). False when this kind was already sent that day or
   * the user's item is gone. Two overlapping runs cannot both win.
   */
  async claimSend(userId: string, kind: SendKind, localDate: string): Promise<boolean> {
    try {
      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: 'SET #a = :d',
        ConditionExpression: 'attribute_exists(userId) AND (attribute_not_exists(#a) OR #a <> :d)',
        ExpressionAttributeNames: { '#a': CLAIM_ATTRIBUTES[kind] },
        ExpressionAttributeValues: { ':d': localDate },
      }));
      return true;
    } catch (error) {
      if (isConditionFailure(error)) return false;
      throw error;
    }
  }
  /** Gives the claim back after a failed send, so a later run in the window retries. */
  async releaseSend(userId: string, kind: SendKind, localDate: string): Promise<void> {
    try {
      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: 'REMOVE #a',
        ConditionExpression: '#a = :d',
        ExpressionAttributeNames: { '#a': CLAIM_ATTRIBUTES[kind] },
        ExpressionAttributeValues: { ':d': localDate },
      }));
    } catch (error) {
      if (!isConditionFailure(error)) throw error;
    }
  }
  async getOptedInUsers(): Promise<EmailPrefs[]> {
    const result = await this.client.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'dailyDigest = :yes',
      ExpressionAttributeValues: { ':yes': true },
    }));
    return (result.Items as EmailPrefs[]) || [];
  }
}
function settingsOf(item: Record<string, unknown> | null): NotificationSettings {
  return {
    timeZone: typeof item?.timeZone === 'string' ? item.timeZone : null,
    language: isChallengeLanguage(item?.language) ? item.language : null,
  };
}
