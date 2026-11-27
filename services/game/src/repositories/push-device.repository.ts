import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { AppError } from '@memory-game/shared';
import { mapDynamoDBError } from '../utils/error-mapper';
/**
 * Push device registry (G5). Table PUSH_DEVICES_TABLE_NAME, one item per device:
 *   { deviceId, userId, platform, token, environment, endpointArn?, timeZone?, language?, createdAt, updatedAt }
 * `deviceId` is sha256 of platform and token, so a device has one owner and raw tokens stay out of
 * keys and logs. GSI user-index (userId) lists a user's devices.
 */
export type PushPlatform = 'IOS' | 'ANDROID';
export type ApnsEnvironment = 'production' | 'sandbox';
export interface PushDevice {
  deviceId: string;
  userId: string;
  platform: PushPlatform;
  token: string;
  environment: ApnsEnvironment;
  endpointArn?: string;
  timeZone?: string;
  language?: string;
  createdAt: string;
  updatedAt: string;
}
interface DocSender {
  send(command: unknown): Promise<any>;
}
const defaultClient = (): DocSender =>
  DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  }) as unknown as DocSender;
const USER_INDEX = 'user-index';
const isConditionFailure = (error: unknown) => (error as Error)?.name === 'ConditionalCheckFailedException';
/** Items that do not look like a device are skipped by readers, never half-trusted. */
function toDevice(item: Record<string, any> | undefined): PushDevice | null {
  if (
    !item ||
    typeof item.deviceId !== 'string' ||
    typeof item.userId !== 'string' ||
    (item.platform !== 'IOS' && item.platform !== 'ANDROID') ||
    typeof item.token !== 'string' ||
    (item.environment !== 'production' && item.environment !== 'sandbox')
  ) {
    return null;
  }
  return {
    deviceId: item.deviceId,
    userId: item.userId,
    platform: item.platform,
    token: item.token,
    environment: item.environment,
    endpointArn: typeof item.endpointArn === 'string' ? item.endpointArn : undefined,
    timeZone: typeof item.timeZone === 'string' ? item.timeZone : undefined,
    language: typeof item.language === 'string' ? item.language : undefined,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
  };
}
export class PushDeviceRepository {
  private readonly client: DocSender;
  constructor(client?: DocSender, private readonly tableNameOverride?: string) {
    this.client = client ?? defaultClient();
  }
  private tableName(): string {
    const name = this.tableNameOverride ?? process.env.PUSH_DEVICES_TABLE_NAME;
    if (!name) throw new AppError('INTERNAL_ERROR', 'Push devices are not configured', 500);
    return name;
  }
  private mapError(error: unknown): Error {
    return error instanceof AppError ? error : mapDynamoDBError(error as Error);
  }
  async get(deviceId: string): Promise<PushDevice | null> {
    const table = this.tableName();
    try {
      const result = await this.client.send(new GetCommand({ TableName: table, Key: { deviceId } }));
      return toDevice(result.Item);
    } catch (error) {
      throw this.mapError(error);
    }
  }
  /** Writes the whole device item (the service decides what is kept from an earlier item). */
  async upsert(device: PushDevice): Promise<void> {
    const table = this.tableName();
    try {
      await this.client.send(new PutCommand({ TableName: table, Item: { ...device } }));
    } catch (error) {
      throw this.mapError(error);
    }
  }
  /** Deletes the device only when `userId` owns it; returns the deleted item, or null. */
  async deleteOwned(deviceId: string, userId: string): Promise<PushDevice | null> {
    const table = this.tableName();
    try {
      const result = await this.client.send(
        new DeleteCommand({
          TableName: table,
          Key: { deviceId },
          ConditionExpression: 'userId = :u',
          ExpressionAttributeValues: { ':u': userId },
          ReturnValues: 'ALL_OLD',
        })
      );
      return toDevice(result?.Attributes);
    } catch (error) {
      if (isConditionFailure(error)) return null;
      throw this.mapError(error);
    }
  }
  async listForUser(userId: string): Promise<PushDevice[]> {
    const table = this.tableName();
    const devices: PushDevice[] = [];
    let start: Record<string, unknown> | undefined;
    try {
      do {
        const page = await this.client.send(
          new QueryCommand({
            TableName: table,
            IndexName: USER_INDEX,
            KeyConditionExpression: 'userId = :u',
            ExpressionAttributeValues: { ':u': userId },
            ExclusiveStartKey: start,
          })
        );
        for (const item of page.Items ?? []) {
          const d = toDevice(item);
          if (d) devices.push(d);
        }
        start = page.LastEvaluatedKey;
      } while (start);
    } catch (error) {
      throw this.mapError(error);
    }
    return devices;
  }
  /** Every device, paginated; the digest tick reads it once per run. */
  async scanAll(): Promise<PushDevice[]> {
    const table = this.tableName();
    const devices: PushDevice[] = [];
    let start: Record<string, unknown> | undefined;
    try {
      do {
        const page = await this.client.send(new ScanCommand({ TableName: table, ExclusiveStartKey: start }));
        for (const item of page.Items ?? []) {
          const d = toDevice(item);
          if (d) devices.push(d);
        }
        start = page.LastEvaluatedKey;
      } while (start);
    } catch (error) {
      throw this.mapError(error);
    }
    return devices;
  }
  async delete(deviceId: string): Promise<void> {
    const table = this.tableName();
    try {
      await this.client.send(new DeleteCommand({ TableName: table, Key: { deviceId } }));
    } catch (error) {
      throw this.mapError(error);
    }
  }
  /** Deletes up to any number of devices by id, 25 per batch, retrying unprocessed items. */
  async deleteMany(deviceIds: string[]): Promise<void> {
    const table = this.tableName();
    for (let i = 0; i < deviceIds.length; i += 25) {
      let pending = deviceIds.slice(i, i + 25).map((deviceId) => ({ DeleteRequest: { Key: { deviceId } } }));
      for (let attempt = 0; pending.length > 0; attempt++) {
        if (attempt >= 5) throw new AppError('INTERNAL_ERROR', 'Could not delete push devices', 500);
        let res: any;
        try {
          res = await this.client.send(new BatchWriteCommand({ RequestItems: { [table]: pending } }));
        } catch (error) {
          throw this.mapError(error);
        }
        pending = (res?.UnprocessedItems?.[table] ?? []) as typeof pending;
        if (pending.length > 0) await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
      }
    }
  }
  /**
   * Stores (or clears, with null) the SNS endpoint of an existing device. A device deleted in the
   * meantime is not re-created.
   */
  async setEndpoint(deviceId: string, endpointArn: string | null): Promise<void> {
    const table = this.tableName();
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: table,
          Key: { deviceId },
          UpdateExpression: endpointArn ? 'SET endpointArn = :a' : 'REMOVE endpointArn',
          ConditionExpression: 'attribute_exists(deviceId)',
          ...(endpointArn ? { ExpressionAttributeValues: { ':a': endpointArn } } : {}),
        })
      );
    } catch (error) {
      if (isConditionFailure(error)) return;
      throw this.mapError(error);
    }
  }
}
