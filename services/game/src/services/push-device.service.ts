import { createHash } from 'crypto';
import { DeleteEndpointCommand, SNSClient } from '@aws-sdk/client-sns';
import { ValidationError, isValidTimeZone } from '@memory-game/shared';
import { PushDeviceRepository } from '../repositories/push-device.repository';
import type { ApnsEnvironment, PushDevice, PushPlatform } from '../repositories/push-device.repository';
import { isChallengeLanguage } from './email-prefs.service';
import { logger } from '../utils/logger';
export interface SnsSender {
  send(command: unknown): Promise<any>;
}
export const INVALID_PUSH_DEVICE_MESSAGE = 'Invalid push device';
/** Devices kept per user; registering one more evicts the least recently updated. */
export const MAX_DEVICES_PER_USER = 5;
/** APNs device token as hex (32 bytes today; Apple allows longer). */
const IOS_TOKEN = /^[0-9a-f]{64,200}$/i;
const ENVIRONMENTS: readonly ApnsEnvironment[] = ['production', 'sandbox'];
/** Same id for the same device token, whatever its case. */
export function deviceIdFor(platform: PushPlatform, token: string): string {
  return createHash('sha256').update(`${platform}:${token.toLowerCase()}`).digest('hex');
}
export function isIosToken(value: unknown): value is string {
  return typeof value === 'string' && IOS_TOKEN.test(value);
}
/** Deletes an SNS endpoint; failures are logged by name only (no ARN) and ignored. */
export async function deleteEndpointQuietly(sns: SnsSender, endpointArn: string | undefined, userId: string): Promise<void> {
  if (!endpointArn) return;
  try {
    await sns.send(new DeleteEndpointCommand({ EndpointArn: endpointArn }));
  } catch (error) {
    logger.warn('Push endpoint delete failed', { userId, error: (error as Error)?.name });
  }
}
/**
 * Device registration (G6, S4). The user id always comes from the verified JWT. Only iOS is
 * accepted as input today; the data model also allows ANDROID.
 */
export class PushDeviceService {
  constructor(
    private readonly repo: PushDeviceRepository,
    private readonly sns: SnsSender,
    private readonly now: () => Date = () => new Date()
  ) {}
  async register(userId: string, input: unknown): Promise<{ ok: true }> {
    const i = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
    const zoneGiven = i.timeZone !== undefined && i.timeZone !== null;
    const languageGiven = i.language !== undefined && i.language !== null;
    if (
      i.platform !== 'IOS' ||
      !isIosToken(i.token) ||
      !ENVIRONMENTS.includes(i.environment as ApnsEnvironment) ||
      (zoneGiven && !isValidTimeZone(i.timeZone)) ||
      (languageGiven && !isChallengeLanguage(i.language))
    ) {
      throw new ValidationError(INVALID_PUSH_DEVICE_MESSAGE);
    }
    const platform: PushPlatform = 'IOS';
    const token = i.token.toLowerCase();
    const environment = i.environment as ApnsEnvironment;
    const deviceId = deviceIdFor(platform, token);
    const at = this.now().toISOString();
    const existing = await this.repo.get(deviceId);
    // Same id means the same token. The endpoint is kept unless the APNs environment changed (an
    // endpoint belongs to one platform application).
    const keepEndpoint = existing?.endpointArn && existing.environment === environment ? existing.endpointArn : undefined;
    if (existing?.endpointArn && !keepEndpoint) {
      await deleteEndpointQuietly(this.sns, existing.endpointArn, userId);
    }
    await this.evictOldest(userId, deviceId);
    const device: PushDevice = {
      deviceId,
      userId,
      platform,
      token,
      environment,
      endpointArn: keepEndpoint,
      timeZone: zoneGiven ? (i.timeZone as string) : undefined,
      language: languageGiven ? (i.language as string) : undefined,
      createdAt: existing?.createdAt || at,
      updatedAt: at,
    };
    await this.repo.upsert(device);
    logger.info('Push device registered', { userId, platform, environment, moved: !!existing && existing.userId !== userId });
    return { ok: true };
  }
  /**
   * Keeps room for one more device: while the user has MAX_DEVICES_PER_USER or more other devices,
   * deletes the one with the oldest `updatedAt` and its SNS endpoint.
   */
  private async evictOldest(userId: string, keepDeviceId: string): Promise<void> {
    const others = (await this.repo.listForUser(userId))
      .filter((d) => d.deviceId !== keepDeviceId)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    const excess = others.length - (MAX_DEVICES_PER_USER - 1);
    for (const device of others.slice(0, Math.max(0, excess))) {
      const removed = await this.repo.deleteOwned(device.deviceId, userId);
      if (removed) await deleteEndpointQuietly(this.sns, removed.endpointArn, userId);
    }
    if (excess > 0) logger.info('Push devices evicted', { userId, evicted: excess });
  }
  /** Removes the caller's own device and its SNS endpoint; another user's device is never touched. */
  async unregister(userId: string, token: unknown): Promise<{ ok: boolean }> {
    if (!isIosToken(token)) return { ok: false };
    const removed = await this.repo.deleteOwned(deviceIdFor('IOS', token), userId);
    if (!removed) return { ok: false };
    await deleteEndpointQuietly(this.sns, removed.endpointArn, userId);
    logger.info('Push device unregistered', { userId });
    return { ok: true };
  }
}
/** Off (undefined) unless PUSH_DEVICES_TABLE_NAME is set (NFR-DC-7). */
export function createPushDeviceService(env: Record<string, string | undefined>): PushDeviceService | undefined {
  const table = env.PUSH_DEVICES_TABLE_NAME;
  if (!table) return undefined;
  return new PushDeviceService(new PushDeviceRepository(undefined, table), new SNSClient({}));
}
