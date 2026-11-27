import {
  CreatePlatformEndpointCommand,
  GetEndpointAttributesCommand,
  PublishCommand,
  SetEndpointAttributesCommand,
} from '@aws-sdk/client-sns';
import type { PushDevice } from '../repositories/push-device.repository';
import { deleteEndpointQuietly } from '../services/push-device.service';
import type { SnsSender } from '../services/push-device.service';
import type { ApnsConfig } from './apns-config';
import { logger } from '../utils/logger';
/**
 * Push sender (N6): APNs through Amazon SNS mobile push. Endpoints are created lazily, the first
 * time a device is sent to, so registration works before the APNs key exists. A disabled endpoint
 * or an invalid token removes the device and its endpoint (FR-DC-5). Logs carry the user id and the
 * error name only: never tokens or endpoint ARNs (SECURITY-03).
 */
export interface PushMessage {
  title: string;
  body: string;
  /** App route opened on tap (S7). */
  route: string;
}
export type PushResult = 'sent' | 'removed' | 'skipped' | 'failed';
export interface DeviceStore {
  setEndpoint(deviceId: string, endpointArn: string | null): Promise<void>;
  delete(deviceId: string): Promise<void>;
}
const errorName = (error: unknown): string => String((error as Error)?.name ?? '');
const isError = (error: unknown, code: string) => {
  const n = errorName(error);
  return n === code || n === `${code}Exception`;
};
const EXISTING_ENDPOINT = /Endpoint (arn:aws:sns:\S+?) already exists/;
/** The JSON message for MessageStructure 'json'. */
export function apnsMessage(message: PushMessage, environment: PushDevice['environment']): string {
  const payload = JSON.stringify({
    aps: { alert: { title: message.title, body: message.body }, sound: 'default' },
    route: message.route,
  });
  return JSON.stringify({ [environment === 'sandbox' ? 'APNS_SANDBOX' : 'APNS']: payload });
}
export class PushSender {
  constructor(
    private readonly sns: SnsSender,
    private readonly config: ApnsConfig,
    private readonly devices: DeviceStore
  ) {}
  async send(device: PushDevice, message: PushMessage): Promise<PushResult> {
    const appArn =
      device.environment === 'sandbox' ? this.config.platformApplicationArnSandbox : this.config.platformApplicationArn;
    if (device.platform !== 'IOS' || !appArn) return 'skipped';
    let endpointArn = device.endpointArn;
    try {
      if (!endpointArn) {
        endpointArn = await this.createEndpoint(device, appArn);
        if (!endpointArn) return this.remove(device, undefined, 'InvalidToken');
        await this.devices.setEndpoint(device.deviceId, endpointArn);
      }
      await this.sns.send(
        new PublishCommand({
          TargetArn: endpointArn,
          MessageStructure: 'json',
          Message: apnsMessage(message, device.environment),
        })
      );
      return 'sent';
    } catch (error) {
      if (isError(error, 'EndpointDisabled')) return this.remove(device, endpointArn, 'EndpointDisabled');
      if (isError(error, 'NotFound') && device.endpointArn) {
        // The endpoint is gone; the next run creates a new one.
        await this.devices.setEndpoint(device.deviceId, null).catch(() => undefined);
      }
      logger.warn('Push send failed', { userId: device.userId, error: errorName(error) });
      return 'failed';
    }
  }
  /**
   * CreatePlatformEndpoint is idempotent for the same token and attributes; with different
   * attributes SNS names the existing endpoint in the error, which is then re-enabled. Returns
   * undefined when SNS rejects the token itself.
   */
  private async createEndpoint(device: PushDevice, appArn: string): Promise<string | undefined> {
    let arn: string;
    try {
      const res = await this.sns.send(
        new CreatePlatformEndpointCommand({ PlatformApplicationArn: appArn, Token: device.token })
      );
      arn = res.EndpointArn;
    } catch (error) {
      const existing = isError(error, 'InvalidParameter') ? EXISTING_ENDPOINT.exec(String((error as Error).message)) : null;
      if (existing) {
        arn = existing[1];
      } else if (isError(error, 'InvalidParameter')) {
        return undefined;
      } else {
        throw error;
      }
    }
    const attrs = await this.sns.send(new GetEndpointAttributesCommand({ EndpointArn: arn }));
    if (attrs?.Attributes?.Enabled !== 'true' || attrs?.Attributes?.Token !== device.token) {
      await this.sns.send(
        new SetEndpointAttributesCommand({ EndpointArn: arn, Attributes: { Enabled: 'true', Token: device.token } })
      );
    }
    return arn;
  }
  private async remove(device: PushDevice, endpointArn: string | undefined, reason: string): Promise<PushResult> {
    try {
      await this.devices.delete(device.deviceId);
    } catch (error) {
      logger.warn('Push device removal failed', { userId: device.userId, error: errorName(error) });
      return 'failed';
    }
    await deleteEndpointQuietly(this.sns, endpointArn, device.userId);
    logger.info('Push device removed', { userId: device.userId, reason });
    return 'removed';
  }
}
/** Runs `fn` over `items` with at most `limit` in flight; one rejection never stops the others. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}
