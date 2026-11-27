import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DeleteCommand, DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type Stripe from 'stripe';
import { appleBindingKey } from '../repositories/subscription.repository';
import type { PlanRecord, SourceEntry } from './entitlement';
import { logger } from '../utils/logger';

/**
 * Self-service account deletion (App Store Review Guideline 5.1.1(v)).
 *
 * Order matters: billing is stopped first and the login is removed last, so a failure part way
 * leaves the user signed in and able to retry. Every step tolerates data that is already gone.
 *
 * Kept: Stripe's own customer, invoice and payment records (Stripe keeps them for tax and
 * accounting), and anonymous aggregate counts that hold no user id.
 * Not possible: cancelling an App Store subscription. Apple only lets the user do that in iPhone
 * Settings; the result says so, and the client tells the user.
 */

/** Tables holding user data. Values are env var names; the default is memory-game-<base>-<stage>. */
const PARTITION_TABLES: { env: string; base: string; sortKey: string }[] = [
  { env: 'GAMES_TABLE_NAME', base: 'games', sortKey: 'gameId' },
  { env: 'ACHIEVEMENTS_TABLE_NAME', base: 'achievements', sortKey: 'achievementType' },
  { env: 'LANGUAGE_PROGRESS_TABLE_NAME', base: 'language-progress', sortKey: 'languageCode' },
  { env: 'LANGUAGE_RESULTS_TABLE_NAME', base: 'language-results', sortKey: 'gameId' },
  { env: 'QUEST_PROGRESS_TABLE_NAME', base: 'quest-progress', sortKey: 'worldId' },
  { env: 'AGGREGATES_TABLE_NAME', base: 'user-aggregates', sortKey: 'gameType' },
];

const SINGLE_KEY_TABLES: { env: string; base: string }[] = [
  { env: 'EMAIL_PREFS_TABLE_NAME', base: 'email-prefs' },
  { env: 'RATE_LIMITS_TABLE_NAME', base: 'rate-limits' },
  { env: 'RATE_LIMIT_BUCKETS_TABLE_NAME', base: 'rate-limit-buckets' },
  { env: 'USER_SETTINGS_TABLE_NAME', base: 'user-settings' },
  { env: 'USERS_TABLE_NAME', base: 'users' },
];

/** Stripe statuses that can still charge the customer. */
const CHARGEABLE_STRIPE = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete']);

export interface AccountDeletionResult {
  deleted: boolean;
  /** An App Store subscription was still active: the user must cancel it in iPhone Settings. */
  appleSubscriptionActive: boolean;
  stripeSubscriptionsCancelled: number;
}

export interface AccountDeletionDeps {
  ddb: DynamoDBDocumentClient;
  cognito: CognitoIdentityProviderClient;
  stripe: () => Promise<Stripe>;
  userPoolId: string;
  env: Record<string, string | undefined>;
  now: () => Date;
}

export function stageOf(env: Record<string, string | undefined>): string {
  const known = env.SUBSCRIPTIONS_TABLE_NAME ?? env.GAMES_TABLE_NAME ?? '';
  const stage = known.split('-').pop();
  if (!stage) throw new Error('Cannot derive the stage: SUBSCRIPTIONS_TABLE_NAME is not set');
  return stage;
}

export function tableName(env: Record<string, string | undefined>, envVar: string, base: string): string {
  return env[envVar] ?? `memory-game-${base}-${stageOf(env)}`;
}

function sourceStillActive(s: SourceEntry | undefined, now: Date): boolean {
  if (!s) return false;
  if (s.status === 'EXPIRED' || s.status === 'REVOKED') return false;
  return !s.expiresAt || new Date(s.expiresAt).getTime() > now.getTime();
}

export class AccountDeletionService {
  constructor(private readonly deps: AccountDeletionDeps) {}

  async deleteAccount(userId: string): Promise<AccountDeletionResult> {
    if (!userId) throw new Error('userId is required');
    const { env } = this.deps;
    const subscriptionsTable = tableName(env, 'SUBSCRIPTIONS_TABLE_NAME', 'subscriptions');

    const record = (
      await this.deps.ddb.send(new GetCommand({ TableName: subscriptionsTable, Key: { userId } }))
    ).Item as PlanRecord | undefined;

    // 1. Stop billing.
    const stripeSubscriptionsCancelled = await this.cancelStripe(record);
    const apple = record?.sources?.apple;
    const appleSubscriptionActive = sourceStillActive(apple, this.deps.now());

    // 2. Delete user data.
    for (const t of PARTITION_TABLES) {
      await this.deletePartition(tableName(env, t.env, t.base), userId, t.sortKey);
    }
    for (const t of SINGLE_KEY_TABLES) {
      await this.deps.ddb.send(new DeleteCommand({ TableName: tableName(env, t.env, t.base), Key: { userId } }));
    }
    await this.deleteByQuery(tableName(env, 'REVIEWS_TABLE_NAME', 'reviews'), {
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}` },
    }, ['PK', 'SK']);
    await this.deleteByQuery(tableName(env, 'LEADERBOARD_TABLE_NAME', 'leaderboard-entries'), {
      IndexName: 'UserScoreHistoryIndex',
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
    }, ['gameType', 'scoreTimestamp']);
    await this.deleteByQuery(tableName(env, 'THEME_LEADERBOARDS_TABLE_NAME', 'leaderboards'), {
      IndexName: 'UserIndex',
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
    }, ['themeIdDifficultyPeriod', 'scoreUserId']);
    // Daily Challenge scores. Only when configured: there is no default name, because a table that
    // does not exist yet would make every deletion fail.
    if (env.DAILY_CHALLENGE_TABLE_NAME) {
      await this.deleteByQuery(env.DAILY_CHALLENGE_TABLE_NAME, {
        IndexName: 'user-index',
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
      }, ['pk', 'sk']);
    }
    // The App Store binding goes too, so a later account can restore the same purchase.
    if (apple?.externalId) {
      await this.deps.ddb.send(
        new DeleteCommand({ TableName: subscriptionsTable, Key: { userId: appleBindingKey(apple.externalId) } })
      );
    }
    await this.deps.ddb.send(new DeleteCommand({ TableName: subscriptionsTable, Key: { userId } }));

    // 3. Remove the login last.
    await this.deleteCognitoUser(userId);

    logger.info('Account deleted', { userId, stripeSubscriptionsCancelled, appleSubscriptionActive });
    return { deleted: true, appleSubscriptionActive, stripeSubscriptionsCancelled };
  }

  /** Cancels, at once, every Stripe subscription of the user's customer that can still charge. */
  private async cancelStripe(record: PlanRecord | undefined): Promise<number> {
    const customerId = record?.sources?.stripe?.customerId ?? record?.stripeCustomerId;
    const knownSub = record?.sources?.stripe?.externalId ?? record?.stripeSubscriptionId;
    if (!customerId && !knownSub) return 0;
    const stripe = await this.deps.stripe();
    const ids = new Set<string>();
    if (customerId) {
      const list = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
      for (const s of list.data) if (CHARGEABLE_STRIPE.has(s.status)) ids.add(s.id);
    } else if (knownSub) {
      ids.add(knownSub);
    }
    let cancelled = 0;
    for (const id of ids) {
      try {
        await stripe.subscriptions.cancel(id);
        cancelled++;
      } catch (error) {
        // Already cancelled or gone: nothing left to stop.
        if ((error as { code?: string }).code !== 'resource_missing') throw error;
      }
    }
    return cancelled;
  }

  private async deletePartition(table: string, userId: string, sortKey: string): Promise<void> {
    await this.deleteByQuery(table, {
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
    }, ['userId', sortKey]);
  }

  private async deleteByQuery(
    table: string,
    query: { IndexName?: string; KeyConditionExpression: string; ExpressionAttributeValues: Record<string, unknown> },
    keyAttrs: string[]
  ): Promise<void> {
    let start: Record<string, unknown> | undefined;
    do {
      const page = await this.deps.ddb.send(
        new QueryCommand({ TableName: table, ...query, ExclusiveStartKey: start })
      );
      const keys = (page.Items ?? []).map((item) => Object.fromEntries(keyAttrs.map((k) => [k, item[k]])));
      for (let i = 0; i < keys.length; i += 25) {
        await this.batchDelete(table, keys.slice(i, i + 25));
      }
      start = page.LastEvaluatedKey;
    } while (start);
  }

  /** BatchWrite with retries for unprocessed items (throttling). */
  private async batchDelete(table: string, keys: Record<string, unknown>[]): Promise<void> {
    let pending = keys.map((Key) => ({ DeleteRequest: { Key } }));
    for (let attempt = 0; pending.length > 0; attempt++) {
      if (attempt >= 5) throw new Error(`Could not delete ${pending.length} items from ${table}`);
      const res = await this.deps.ddb.send(new BatchWriteCommand({ RequestItems: { [table]: pending } }));
      pending = (res.UnprocessedItems?.[table] ?? []) as typeof pending;
      if (pending.length > 0) await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
    }
  }

  private async deleteCognitoUser(userId: string): Promise<void> {
    const found = await this.deps.cognito.send(
      new ListUsersCommand({ UserPoolId: this.deps.userPoolId, Filter: `sub = "${userId.replace(/"/g, '')}"`, Limit: 1 })
    );
    const username = found.Users?.[0]?.Username;
    if (!username) {
      logger.warn('Cognito user already gone during account deletion', { userId });
      return;
    }
    await this.deps.cognito.send(new AdminDeleteUserCommand({ UserPoolId: this.deps.userPoolId, Username: username }));
  }
}

export function createAccountDeletionService(stripe: () => Promise<Stripe>): AccountDeletionService {
  return new AccountDeletionService({
    ddb: DynamoDBDocumentClient.from(new DynamoDBClient({})),
    cognito: new CognitoIdentityProviderClient({}),
    stripe,
    userPoolId: process.env.COGNITO_USER_POOL_ID ?? '',
    env: process.env,
    now: () => new Date(),
  });
}
