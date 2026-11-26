import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from './utils/logger';

/**
 * Cognito Post Confirmation trigger: new accounts get the daily digest ON by default.
 *
 * Fires once per account, when an email sign-up is confirmed and on the first sign-in with Google
 * or Apple (trigger source PostConfirmation_ConfirmSignUp). Password resets
 * (PostConfirmation_ConfirmForgotPassword) are ignored.
 *
 * Never overwrites an existing choice, and never fails the sign-up: any error is logged and the
 * event is returned unchanged, because Cognito reports a trigger error to the user even though
 * the account is already confirmed.
 */

export interface PostConfirmationEvent {
  triggerSource: string;
  userName: string;
  request: { userAttributes: Record<string, string | undefined> };
  [key: string]: unknown;
}

type Send = (command: PutCommand) => Promise<unknown>;

let defaultSend: Send | null = null;
function send(): Send {
  if (!defaultSend) {
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    defaultSend = (c) => client.send(c);
  }
  return defaultSend;
}

export function isPostConfirmationEvent(event: unknown): event is PostConfirmationEvent {
  const e = event as { triggerSource?: unknown } | null;
  return typeof e?.triggerSource === 'string' && e.triggerSource.startsWith('PostConfirmation_');
}

/** Name shown in the digest greeting; the same order the API uses for the signed-in user. */
export function displayName(a: Record<string, string | undefined>, userName: string): string {
  return a.preferred_username || a.nickname || a.name || a.given_name || (a.email ? a.email.split('@')[0] : '') || userName;
}

export async function handlePostConfirmation(
  event: PostConfirmationEvent,
  deps: { send?: Send; tableName?: string; now?: () => Date } = {}
): Promise<PostConfirmationEvent> {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') return event;
  const a = event.request?.userAttributes ?? {};
  const userId = a.sub;
  if (!userId) {
    logger.warn('Post confirmation without sub; digest default skipped', { userName: event.userName });
    return event;
  }
  const tableName = deps.tableName ?? process.env.EMAIL_PREFS_TABLE_NAME ?? 'memory-game-email-prefs-dev';
  try {
    await (deps.send ?? send())(
      new PutCommand({
        TableName: tableName,
        Item: {
          userId,
          email: a.email ?? '',
          username: displayName(a, event.userName),
          dailyDigest: true,
          updatedAt: (deps.now ?? (() => new Date()))().toISOString(),
        },
        // A choice the user already made (for example the web sign-up checkbox) wins.
        ConditionExpression: 'attribute_not_exists(userId)',
      })
    );
    logger.info('Daily digest on by default for new account', { userId });
  } catch (error) {
    if ((error as Error).name !== 'ConditionalCheckFailedException') {
      logger.error('Could not set the digest default; sign-up continues', error as Error, { userId });
    }
  }
  return event;
}
