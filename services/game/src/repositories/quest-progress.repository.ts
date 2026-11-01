import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { AppError } from '@memory-game/shared';
import type { WorldProgress } from '@memory-game/shared';
import { mapDynamoDBError } from '../utils/error-mapper';
import { logger } from '../utils/logger';

/**
 * Quest progress repository (B1). One item per user per world.
 * Key: userId (always from the verified JWT, never from input) + worldId.
 *
 * Saves are versioned: PutItem with a condition on the version that was read. A lost
 * race surfaces as QuestVersionConflictError, translated here so it never reaches
 * mapDynamoDBError (which would show clients a 409).
 */

export class QuestVersionConflictError extends Error {
  constructor() {
    super('Quest progress version conflict');
    this.name = 'QuestVersionConflictError';
  }
}

interface DocSender {
  send(command: unknown): Promise<any>;
}

const defaultClient = (): DocSender =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  }) as unknown as DocSender;

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

/** Shape check; a corrupt item fails closed (throws) rather than being half-trusted. */
function toWorldProgress(item: Record<string, any>): WorldProgress {
  if (
    typeof item.worldId !== 'string' ||
    typeof item.version !== 'number' ||
    typeof item.nodes !== 'object' ||
    item.nodes === null ||
    Array.isArray(item.nodes) ||
    !isStringArray(item.badges)
  ) {
    throw new AppError('INTERNAL_ERROR', 'Quest progress item is invalid', 500);
  }
  const progress: WorldProgress = {
    worldId: item.worldId,
    nodes: item.nodes,
    totalStars: typeof item.totalStars === 'number' ? item.totalStars : 0,
    badges: item.badges as WorldProgress['badges'],
    version: item.version,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
  };
  if (item.activeGauntlet && typeof item.activeGauntlet === 'object') {
    progress.activeGauntlet = item.activeGauntlet;
  }
  return progress;
}

export class QuestProgressRepository {
  private readonly client: DocSender;

  constructor(client?: DocSender, private readonly tableNameOverride?: string) {
    this.client = client ?? defaultClient();
  }

  /** Read at call time so the code can ship before the table exists (NFR-QM-14). */
  private tableName(): string {
    const name = this.tableNameOverride ?? process.env.QUEST_PROGRESS_TABLE_NAME;
    if (!name) {
      throw new AppError('INTERNAL_ERROR', 'Quest progress is not configured', 500);
    }
    return name;
  }

  async getWorld(userId: string, worldId: string): Promise<WorldProgress | undefined> {
    const table = this.tableName();
    try {
      const result = await this.client.send(
        new GetCommand({ TableName: table, Key: { userId, worldId } })
      );
      return result.Item ? toWorldProgress(result.Item) : undefined;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async listWorlds(userId: string): Promise<WorldProgress[]> {
    const table = this.tableName();
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: table,
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId },
        })
      );
      return ((result.Items ?? []) as Record<string, any>[]).map(toWorldProgress);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * New item: expectedVersion 0, stored version 1. A first save against an item that
   * appeared meanwhile conflicts correctly (stored version >= 1 never equals 0).
   */
  async saveWorld(userId: string, progress: WorldProgress, expectedVersion: number): Promise<void> {
    const table = this.tableName();
    const item: Record<string, unknown> = {
      userId,
      worldId: progress.worldId,
      nodes: progress.nodes,
      totalStars: progress.totalStars,
      badges: progress.badges,
      version: expectedVersion + 1,
      updatedAt: progress.updatedAt,
    };
    if (progress.activeGauntlet) item.activeGauntlet = progress.activeGauntlet;

    try {
      await this.client.send(
        new PutCommand({
          TableName: table,
          Item: item,
          ConditionExpression: 'attribute_not_exists(userId) OR #version = :expected',
          ExpressionAttributeNames: { '#version': 'version' },
          ExpressionAttributeValues: { ':expected': expectedVersion },
        })
      );
    } catch (error) {
      if ((error as Error)?.name === 'ConditionalCheckFailedException') {
        throw new QuestVersionConflictError();
      }
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    if (error instanceof AppError || error instanceof QuestVersionConflictError) return error;
    if ((error as Error)?.name === 'AppError') return error as Error;
    logger.error('Quest progress repository error', error as Error);
    return mapDynamoDBError(error as Error);
  }
}
