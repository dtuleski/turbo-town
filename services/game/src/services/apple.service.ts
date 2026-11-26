import {
  Environment,
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
  ResponseBodyV2DecodedPayload,
  SignedDataVerifier,
  VerificationException,
  VerificationStatus,
} from '@apple/app-store-server-library';
import { AppError, SubscriptionTier } from '@memory-game/shared';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { logger } from '../utils/logger';
import { APPLE_ROOT_CA_G3_BASE64 } from './apple-root-ca';
import { PlanEvent, SourceStatus, otherPaidSource } from './entitlement';

/**
 * App Store subscriptions.
 *
 * Two inputs, both signed by Apple and verified here before anything is stored:
 * - verifyTransaction: the app sends the StoreKit transaction right after a
 *   purchase or restore, so access starts immediately.
 * - handleNotification: App Store Server Notifications V2 for renewals,
 *   cancellations, billing problems and refunds.
 *
 * A transaction belongs to the DashDen user whose Cognito id the app passed as
 * appAccountToken. Transactions without one are bound to the first user that
 * submits them, and can't be reused by another account.
 */

/** Errors the app can show. AppError passes through sanitizeError to the client. */
export class ApplePurchaseError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 400);
  }
}

export interface AppleConfig {
  bundleId: string;
  appAppleId: number;
  allowSandbox: boolean;
  productTiers: Record<string, SubscriptionTier>;
}

/** Default product ids. Create these in App Store Connect (one subscription group). */
export const DEFAULT_APPLE_PRODUCT_TIERS: Record<string, SubscriptionTier> = {
  'dashden.light.monthly': SubscriptionTier.Light,
  'dashden.standard.monthly': SubscriptionTier.Standard,
  'dashden.premium.monthly': SubscriptionTier.Premium,
};

export function appleConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AppleConfig {
  let productTiers = DEFAULT_APPLE_PRODUCT_TIERS;
  if (env.APPLE_PRODUCT_TIERS) {
    productTiers = JSON.parse(env.APPLE_PRODUCT_TIERS);
  }
  return {
    bundleId: env.APPLE_BUNDLE_ID || 'app.dashden.dashdenMobile',
    appAppleId: Number(env.APPLE_APP_APPLE_ID || 6838313448),
    // TestFlight and App Review purchases are Sandbox purchases, so the
    // production backend has to accept them. Only invited testers and Apple
    // reviewers can make them.
    allowSandbox: (env.APPLE_ALLOW_SANDBOX ?? 'true') !== 'false',
    productTiers,
  };
}

/** Verifies Apple-signed data. Wrapped so tests can substitute it. */
export interface AppleVerifier {
  transaction(signed: string): Promise<JWSTransactionDecodedPayload>;
  renewalInfo(signed: string): Promise<JWSRenewalInfoDecodedPayload>;
  notification(signed: string): Promise<ResponseBodyV2DecodedPayload>;
}

export function createAppleVerifier(config: AppleConfig): AppleVerifier {
  const roots = [Buffer.from(APPLE_ROOT_CA_G3_BASE64, 'base64')];
  const production = new SignedDataVerifier(roots, true, Environment.PRODUCTION, config.bundleId, config.appAppleId);
  const sandbox = config.allowSandbox
    ? new SignedDataVerifier(roots, true, Environment.SANDBOX, config.bundleId)
    : null;

  // Try Production first; fall back to Sandbox only for an environment mismatch.
  async function both<T>(fn: (v: SignedDataVerifier) => Promise<T>): Promise<T> {
    try {
      return await fn(production);
    } catch (e) {
      if (sandbox && e instanceof VerificationException && e.status === VerificationStatus.INVALID_ENVIRONMENT) {
        return fn(sandbox);
      }
      throw e;
    }
  }

  return {
    transaction: (s) => both((v) => v.verifyAndDecodeTransaction(s)),
    renewalInfo: (s) => both((v) => v.verifyAndDecodeRenewalInfo(s)),
    notification: (s) => both((v) => v.verifyAndDecodeNotification(s)),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Status of one subscription from a transaction (and renewal info, if known). */
export function appleStatus(
  tx: JWSTransactionDecodedPayload,
  opts: { now: Date; renewal?: JWSRenewalInfoDecodedPayload; subscriptionStatus?: number }
): { status: SourceStatus; expiresAt?: Date; willRenew?: boolean } {
  const expiresAt = tx.expiresDate ? new Date(tx.expiresDate) : undefined;
  const willRenew = opts.renewal?.autoRenewStatus === undefined ? undefined : opts.renewal.autoRenewStatus === 1;

  if (tx.revocationDate) return { status: 'REVOKED', expiresAt, willRenew: false };

  switch (opts.subscriptionStatus) {
    case 2: // EXPIRED
      return { status: 'EXPIRED', expiresAt, willRenew: false };
    case 3: // BILLING_RETRY without a grace period: Apple says no access
      return { status: 'EXPIRED', expiresAt, willRenew };
    case 4: {
      // BILLING_GRACE_PERIOD: access until the grace period ends
      const graceEnd = opts.renewal?.gracePeriodExpiresDate;
      return { status: 'GRACE', expiresAt: graceEnd ? new Date(graceEnd) : expiresAt, willRenew };
    }
    case 5: // REVOKED
      return { status: 'REVOKED', expiresAt, willRenew: false };
    default:
      break;
  }

  if (expiresAt && expiresAt.getTime() <= opts.now.getTime()) {
    return { status: 'EXPIRED', expiresAt, willRenew };
  }
  return { status: willRenew === false ? 'CANCELLED' : 'ACTIVE', expiresAt, willRenew };
}

export class AppleService {
  constructor(
    private readonly repo: SubscriptionRepository = new SubscriptionRepository(),
    private readonly config: AppleConfig = appleConfigFromEnv(),
    private readonly verifier: AppleVerifier = createAppleVerifier(config)
  ) {}

  /**
   * The app reports a purchase or a restore. Verify, check ownership, store.
   */
  async verifyTransaction(callerUserId: string, signedTransaction: string, now: Date = new Date()) {
    if (!signedTransaction || typeof signedTransaction !== 'string') {
      throw new ApplePurchaseError('APPLE_INVALID_TRANSACTION', 'signedTransaction is required');
    }
    let tx: JWSTransactionDecodedPayload;
    try {
      tx = await this.verifier.transaction(signedTransaction);
    } catch (e) {
      logger.warn('Apple transaction failed verification', { userId: callerUserId, error: (e as Error).message });
      throw new ApplePurchaseError('APPLE_INVALID_TRANSACTION', 'The App Store transaction could not be verified');
    }

    const tier = this.tierFor(tx);
    const owner = await this.ownerOf(tx);
    if (owner && owner !== callerUserId.toLowerCase()) {
      logger.warn('Apple transaction belongs to another user', {
        userId: callerUserId,
        originalTransactionId: tx.originalTransactionId,
      });
      throw new ApplePurchaseError(
        'APPLE_PURCHASE_OTHER_ACCOUNT',
        'This App Store subscription is linked to a different DashDen account'
      );
    }
    try {
      await this.repo.bindAppleTransaction(tx.originalTransactionId!, callerUserId);
    } catch (e) {
      if ((e as any).code === 'APPLE_PURCHASE_OTHER_ACCOUNT') {
        throw new ApplePurchaseError('APPLE_PURCHASE_OTHER_ACCOUNT', (e as Error).message);
      }
      throw e;
    }

    const existing = await this.repo.getRecord(callerUserId);
    const other = otherPaidSource(existing, 'apple', now);
    if (other) {
      // The store already charged the user, so record it; the app should
      // have prevented this by checking getSubscription first.
      logger.warn('Apple purchase while another paid plan is active', { userId: callerUserId, other });
    }

    const { status, expiresAt, willRenew } = appleStatus(tx, { now });
    const result = await this.repo.applyEvent(
      this.planEvent(callerUserId, tx, tier, status, expiresAt, willRenew, {
        eventAt: new Date(tx.signedDate ?? now.getTime()),
        eventId: `tx:${tx.transactionId}:${tx.signedDate ?? ''}`,
      })
    );
    return result;
  }

  /**
   * App Store Server Notification V2. Returns normally when the notification
   * was handled or deliberately ignored; throws only when Apple should retry.
   */
  async handleNotification(signedPayload: string, now: Date = new Date()): Promise<string> {
    const n = await this.verifier.notification(signedPayload);
    const type = String(n.notificationType ?? '');
    if (type === 'TEST') {
      logger.info('Apple test notification received', { notificationUUID: n.notificationUUID });
      return 'test';
    }
    if (!n.data?.signedTransactionInfo) {
      logger.info('Apple notification without a transaction, ignored', { type, subtype: n.subtype });
      return 'ignored';
    }

    const tx = await this.verifier.transaction(n.data.signedTransactionInfo);
    const renewal = n.data.signedRenewalInfo ? await this.verifier.renewalInfo(n.data.signedRenewalInfo) : undefined;
    const userId = await this.ownerOf(tx);
    if (!userId) {
      // Apple retries for a while, which covers the app's verify call racing
      // the first notification.
      logger.error('Apple notification for an unknown user', new Error('Unknown Apple user'), {
        type,
        originalTransactionId: tx.originalTransactionId,
      });
      throw new Error('Unknown Apple transaction owner');
    }

    let tier: SubscriptionTier;
    try {
      tier = this.tierFor(tx);
    } catch (e) {
      logger.error('Apple notification for an unknown product', e as Error, { productId: tx.productId });
      return 'ignored';
    }

    const subscriptionStatus = typeof n.data.status === 'number' ? n.data.status : undefined;
    let { status, expiresAt, willRenew } = appleStatus(tx, { now, renewal, subscriptionStatus });
    if (type === 'REFUND' || type === 'REVOKE') status = 'REVOKED';

    await this.repo.applyEvent(
      this.planEvent(userId, tx, tier, status, expiresAt, willRenew, {
        eventAt: new Date(n.signedDate ?? now.getTime()),
        eventId: n.notificationUUID ?? `${type}:${tx.transactionId}`,
      })
    );
    return 'applied';
  }

  private tierFor(tx: JWSTransactionDecodedPayload): SubscriptionTier {
    const tier = tx.productId ? this.config.productTiers[tx.productId] : undefined;
    if (!tier) {
      throw new ApplePurchaseError('APPLE_UNKNOWN_PRODUCT', `Unknown App Store product: ${tx.productId}`);
    }
    if (tx.bundleId && tx.bundleId !== this.config.bundleId) {
      throw new ApplePurchaseError('APPLE_INVALID_TRANSACTION', 'Transaction is for another app');
    }
    if (!tx.originalTransactionId) {
      throw new ApplePurchaseError('APPLE_INVALID_TRANSACTION', 'Transaction has no original transaction id');
    }
    return tier;
  }

  /** The user a transaction belongs to: its appAccountToken, else the stored binding. */
  private async ownerOf(tx: JWSTransactionDecodedPayload): Promise<string | null> {
    if (tx.appAccountToken && UUID.test(tx.appAccountToken)) {
      return tx.appAccountToken.toLowerCase();
    }
    if (!tx.originalTransactionId) return null;
    return this.repo.getAppleBinding(tx.originalTransactionId);
  }

  private planEvent(
    userId: string,
    tx: JWSTransactionDecodedPayload,
    tier: SubscriptionTier,
    status: SourceStatus,
    expiresAt: Date | undefined,
    willRenew: boolean | undefined,
    ids: { eventAt: Date; eventId: string }
  ): PlanEvent {
    return {
      userId,
      source: 'apple',
      tier,
      status,
      expiresAt,
      externalId: tx.originalTransactionId,
      productId: tx.productId,
      environment: tx.environment ? String(tx.environment) : undefined,
      willRenew,
      eventAt: ids.eventAt,
      eventId: ids.eventId,
    };
  }
}
