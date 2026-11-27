import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { logger } from '../utils/logger';
/**
 * APNs configuration (N5). The Secrets Manager secret APNS_SECRET_ID (prod `dashden/apns/prod`)
 * holds the APNs key fields the owner used to create the SNS platform application, plus its ARN
 * (`platformApplicationArn`, and optionally `platformApplicationArnSandbox`). Only the ARNs are
 * read here; the key never leaves the secret. Any problem means "push is off": null, never a throw.
 */
export interface ApnsConfig {
  platformApplicationArn: string;
  platformApplicationArnSandbox?: string;
}
export interface SecretsSender {
  send(command: unknown): Promise<{ SecretString?: string }>;
}
export const APNS_CACHE_MS = 10 * 60 * 1000;
const SNS_APP_ARN = /^arn:aws:sns:[a-z0-9-]+:\d{12}:app\/APNS(_SANDBOX)?\/[A-Za-z0-9_.-]+$/;
export function parseApnsSecret(secret: string | undefined): ApnsConfig | null {
  if (!secret) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(secret);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const s = parsed as Record<string, unknown>;
  if (typeof s.platformApplicationArn !== 'string' || !SNS_APP_ARN.test(s.platformApplicationArn)) return null;
  const sandbox =
    typeof s.platformApplicationArnSandbox === 'string' && SNS_APP_ARN.test(s.platformApplicationArnSandbox)
      ? s.platformApplicationArnSandbox
      : undefined;
  return { platformApplicationArn: s.platformApplicationArn, ...(sandbox ? { platformApplicationArnSandbox: sandbox } : {}) };
}
/** A loader that caches its answer (also "off") for `ttlMs`. */
export function createApnsConfigLoader(deps: {
  secretId: string | undefined;
  client?: SecretsSender;
  now?: () => number;
  ttlMs?: number;
}): () => Promise<ApnsConfig | null> {
  const now = deps.now ?? Date.now;
  const ttl = deps.ttlMs ?? APNS_CACHE_MS;
  let cached: { value: ApnsConfig | null; at: number } | undefined;
  let client = deps.client;
  return async () => {
    if (!deps.secretId) return null;
    if (cached && now() - cached.at < ttl) return cached.value;
    let value: ApnsConfig | null = null;
    try {
      client ??= new SecretsManagerClient({}) as unknown as SecretsSender;
      const res = await client.send(new GetSecretValueCommand({ SecretId: deps.secretId }));
      value = parseApnsSecret(res?.SecretString);
      if (!value) logger.warn('APNs secret has no usable platformApplicationArn; push is off');
    } catch (error) {
      logger.warn('APNs secret not readable; push is off', { error: (error as Error)?.name });
    }
    cached = { value, at: now() };
    return value;
  };
}
/** Default loader for the Lambda: APNS_SECRET_ID, cached 10 minutes. */
export const loadApnsConfig = createApnsConfigLoader({ secretId: process.env.APNS_SECRET_ID });
