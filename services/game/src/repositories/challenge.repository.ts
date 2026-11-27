import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { AppError } from '@memory-game/shared';
import type { ChallengeContent, ChallengeDay, ChallengeSettings } from '@memory-game/shared';
import { mapDynamoDBError } from '../utils/error-mapper';
import { logger } from '../utils/logger';

/**
 * Daily Challenge repository (G1). Table DAILY_CHALLENGE_TABLE_NAME:
 *  - CHALLENGE { pk: day, sk: 'CHALLENGE', gameId, themeId, difficulty, settings, content, createdAt }
 *  - SCORE     { pk: day, sk: 'SCORE#<userId>', userId, username, bestScore, achievedAt, rankPk, rankKey }
 * GSIs: rank-index (rankPk, rankKey) and user-index (userId, pk), SCORE items only.
 * userId always comes from the verified JWT, never from input.
 */

export interface StoredChallenge {
  day: ChallengeDay;
  gameId: string;
  themeId: string;
  difficulty: number;
  settings: ChallengeSettings;
  content: ChallengeContent;
  createdAt: string;
}

export interface StoredScore {
  day: ChallengeDay;
  userId: string;
  username: string;
  bestScore: number;
  achievedAt: string;
  rankKey: string;
}

interface DocSender {
  send(command: unknown): Promise<any>;
}

const defaultClient = (): DocSender =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  }) as unknown as DocSender;

const CHALLENGE_SK = 'CHALLENGE';
const SCORE_PREFIX = 'SCORE#';
const RANK_INDEX = 'rank-index';
const MAX_SCORE = 999999999999;

/** Ascending order = higher score first, then the earlier time (FR-DC-17, FR-DC-18). */
export function rankKeyFor(bestScore: number, achievedAt: string): string {
  return `${String(MAX_SCORE - bestScore).padStart(12, '0')}#${achievedAt}`;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Shape checks: a corrupt item fails closed rather than being half-trusted. */
function toChallenge(item: Record<string, any>): StoredChallenge {
  if (
    typeof item.pk !== 'string' ||
    typeof item.gameId !== 'string' ||
    typeof item.themeId !== 'string' ||
    typeof item.difficulty !== 'number' ||
    !isObject(item.settings) ||
    !isObject(item.content) ||
    typeof item.content.kind !== 'string'
  ) {
    throw new AppError('INTERNAL_ERROR', 'Challenge item is invalid', 500);
  }
  return {
    day: item.pk,
    gameId: item.gameId,
    themeId: item.themeId,
    difficulty: item.difficulty,
    settings: item.settings as ChallengeSettings,
    content: item.content as unknown as ChallengeContent,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
  };
}

function toScore(item: Record<string, any>): StoredScore {
  if (
    typeof item.pk !== 'string' ||
    typeof item.userId !== 'string' ||
    typeof item.bestScore !== 'number' ||
    typeof item.achievedAt !== 'string' ||
    typeof item.rankKey !== 'string'
  ) {
    throw new AppError('INTERNAL_ERROR', 'Challenge score item is invalid', 500);
  }
  return {
    day: item.pk,
    userId: item.userId,
    username: typeof item.username === 'string' ? item.username : '',
    bestScore: item.bestScore,
    achievedAt: item.achievedAt,
    rankKey: item.rankKey,
  };
}

const isConditionFailure = (error: unknown) => (error as Error)?.name === 'ConditionalCheckFailedException';

export class ChallengeRepository {
  private readonly client: DocSender;

  constructor(client?: DocSender, private readonly tableNameOverride?: string) {
    this.client = client ?? defaultClient();
  }

  private tableName(): string {
    const name = this.tableNameOverride ?? process.env.DAILY_CHALLENGE_TABLE_NAME;
    if (!name) throw new AppError('INTERNAL_ERROR', 'Daily challenge is not configured', 500);
    return name;
  }

  async getChallenge(day: ChallengeDay): Promise<StoredChallenge | null> {
    const table = this.tableName();
    try {
      const result = await this.client.send(new GetCommand({ TableName: table, Key: { pk: day, sk: CHALLENGE_SK } }));
      return result.Item ? toChallenge(result.Item) : null;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /** Written once per day; a lost race returns 'exists' and the caller re-reads. */
  async createChallenge(item: StoredChallenge): Promise<'created' | 'exists'> {
    const table = this.tableName();
    try {
      await this.client.send(
        new PutCommand({
          TableName: table,
          Item: {
            pk: item.day,
            sk: CHALLENGE_SK,
            gameId: item.gameId,
            themeId: item.themeId,
            difficulty: item.difficulty,
            settings: item.settings,
            content: item.content,
            createdAt: item.createdAt,
          },
          ConditionExpression: 'attribute_not_exists(pk)',
        })
      );
      return 'created';
    } catch (error) {
      if (isConditionFailure(error)) return 'exists';
      throw this.mapError(error);
    }
  }

  async getScore(day: ChallengeDay, userId: string): Promise<StoredScore | null> {
    const table = this.tableName();
    try {
      const result = await this.client.send(
        new GetCommand({ TableName: table, Key: { pk: day, sk: `${SCORE_PREFIX}${userId}` } })
      );
      return result.Item ? toScore(result.Item) : null;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Replaces the user's best only with a strictly higher score, so an equal score keeps the earlier
   * time. A failed condition means "kept": the stored best is re-read and returned.
   */
  async putBestScore(
    day: ChallengeDay,
    userId: string,
    username: string,
    score: number,
    at: string
  ): Promise<{ updated: boolean; best: StoredScore }> {
    const table = this.tableName();
    const rankKey = rankKeyFor(score, at);
    try {
      await this.client.send(
        new PutCommand({
          TableName: table,
          Item: {
            pk: day,
            sk: `${SCORE_PREFIX}${userId}`,
            userId,
            username,
            bestScore: score,
            achievedAt: at,
            rankPk: day,
            rankKey,
          },
          ConditionExpression: 'attribute_not_exists(bestScore) OR bestScore < :s',
          ExpressionAttributeValues: { ':s': score },
        })
      );
      return { updated: true, best: { day, userId, username, bestScore: score, achievedAt: at, rankKey } };
    } catch (error) {
      if (!isConditionFailure(error)) throw this.mapError(error);
    }
    const best = await this.getScore(day, userId);
    if (!best) throw new AppError('INTERNAL_ERROR', 'Challenge score disappeared', 500);
    return { updated: false, best };
  }

  /** Best scores of the day in rank order. */
  async topScores(day: ChallengeDay, limit: number): Promise<StoredScore[]> {
    const table = this.tableName();
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: table,
          IndexName: RANK_INDEX,
          KeyConditionExpression: 'rankPk = :d',
          ExpressionAttributeValues: { ':d': day },
          ScanIndexForward: true,
          Limit: limit,
        })
      );
      return ((result.Items ?? []) as Record<string, any>[]).map(toScore);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /** Number of scores of the day that rank ahead of `rankKey`. */
  async countAhead(day: ChallengeDay, rankKey: string): Promise<number> {
    const table = this.tableName();
    let count = 0;
    let start: Record<string, unknown> | undefined;
    try {
      do {
        const page = await this.client.send(
          new QueryCommand({
            TableName: table,
            IndexName: RANK_INDEX,
            KeyConditionExpression: 'rankPk = :d AND rankKey < :k',
            ExpressionAttributeValues: { ':d': day, ':k': rankKey },
            Select: 'COUNT',
            ExclusiveStartKey: start,
          })
        );
        count += typeof page.Count === 'number' ? page.Count : 0;
        start = page.LastEvaluatedKey;
      } while (start);
    } catch (error) {
      throw this.mapError(error);
    }
    return count;
  }

  private mapError(error: unknown): Error {
    if (error instanceof AppError) return error;
    if ((error as Error)?.name === 'AppError') return error as Error;
    logger.error('Challenge repository error', error as Error);
    return mapDynamoDBError(error as Error);
  }
}
