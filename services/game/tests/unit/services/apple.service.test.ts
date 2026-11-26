import { createHash } from 'crypto';
import { SubscriptionTier } from '@memory-game/shared';
import {
  AppleService,
  AppleVerifier,
  appleConfigFromEnv,
  appleStatus,
} from '../../../src/services/apple.service';
import { APPLE_ROOT_CA_G3_BASE64 } from '../../../src/services/apple-root-ca';
import { PlanEvent, PlanRecord, applyPlanEvent } from '../../../src/services/entitlement';

const NOW = new Date('2026-11-23T12:00:00Z');
const DAY = 86400000;
const USER = '74f804f8-1061-70e6-2280-d7860eda9dfc';
const OTHER = '11111111-2222-3333-4444-555555555555';

/** In-memory stand-in for SubscriptionRepository. */
class FakeRepo {
  records = new Map<string, PlanRecord>();
  bindings = new Map<string, string>();
  async getRecord(userId: string) {
    return this.records.get(userId) ?? null;
  }
  async applyEvent(event: PlanEvent) {
    const r = applyPlanEvent(this.records.get(event.userId) ?? null, event, NOW);
    if (r.changed) this.records.set(event.userId, r.record);
    return r;
  }
  async getAppleBinding(id: string) {
    return this.bindings.get(id) ?? null;
  }
  async bindAppleTransaction(id: string, userId: string) {
    const owner = this.bindings.get(id);
    if (owner && owner !== userId) {
      const e: any = new Error('other');
      e.code = 'APPLE_PURCHASE_OTHER_ACCOUNT';
      throw e;
    }
    this.bindings.set(id, userId);
  }
}

/** The verifier "decodes" JSON strings; real signature checks are Apple's library. */
const jsonVerifier: AppleVerifier = {
  transaction: async (s) => {
    if (s === 'forged') throw new Error('bad signature');
    return JSON.parse(s);
  },
  renewalInfo: async (s) => JSON.parse(s),
  notification: async (s) => JSON.parse(s),
};

function tx(over: Record<string, unknown> = {}) {
  return {
    originalTransactionId: 'otx_1',
    transactionId: 't1',
    bundleId: 'app.dashden.dashdenMobile',
    productId: 'dashden.standard.monthly',
    expiresDate: NOW.getTime() + 30 * DAY,
    appAccountToken: USER,
    signedDate: NOW.getTime(),
    environment: 'Sandbox',
    ...over,
  };
}

function notification(type: string, txOver: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    notificationType: type,
    notificationUUID: `n-${type}-${Math.random()}`,
    signedDate: NOW.getTime() + 1000,
    data: { signedTransactionInfo: JSON.stringify(tx(txOver)), ...extra },
  });
}

function service(repo = new FakeRepo()) {
  return { repo, apple: new AppleService(repo as any, appleConfigFromEnv({}), jsonVerifier) };
}

describe('Apple Root CA', () => {
  it('is the real Apple Root CA - G3', () => {
    const fp = createHash('sha256').update(Buffer.from(APPLE_ROOT_CA_G3_BASE64, 'base64')).digest('hex');
    expect(fp).toBe('63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179');
  });
});

describe('AppleService.verifyTransaction (app reports a purchase)', () => {
  it('stores the plan for the owner', async () => {
    const { repo, apple } = service();
    await apple.verifyTransaction(USER, JSON.stringify(tx()), NOW);
    const r = repo.records.get(USER)!;
    expect(r.sources!.apple).toMatchObject({ tier: SubscriptionTier.Standard, status: 'ACTIVE', externalId: 'otx_1', environment: 'Sandbox' });
    expect(r.tier).toBe(SubscriptionTier.Standard);
  });

  it('rejects a forged transaction', async () => {
    const { apple } = service();
    await expect(apple.verifyTransaction(USER, 'forged', NOW)).rejects.toMatchObject({ code: 'APPLE_INVALID_TRANSACTION' });
  });

  it('rejects a purchase made for another DashDen account', async () => {
    const { repo, apple } = service();
    await expect(apple.verifyTransaction(OTHER, JSON.stringify(tx()), NOW)).rejects.toMatchObject({ code: 'APPLE_PURCHASE_OTHER_ACCOUNT' });
    expect(repo.records.size).toBe(0);
  });

  it('without appAccountToken: first user owns it, a second user is rejected', async () => {
    const { repo, apple } = service();
    const noToken = JSON.stringify(tx({ appAccountToken: undefined }));
    await apple.verifyTransaction(USER, noToken, NOW);
    await expect(apple.verifyTransaction(OTHER, noToken, NOW)).rejects.toMatchObject({ code: 'APPLE_PURCHASE_OTHER_ACCOUNT' });
    expect(repo.records.has(OTHER)).toBe(false);
  });

  it('rejects unknown products and other apps', async () => {
    const { apple } = service();
    await expect(apple.verifyTransaction(USER, JSON.stringify(tx({ productId: 'x' })), NOW)).rejects.toMatchObject({ code: 'APPLE_UNKNOWN_PRODUCT' });
    await expect(apple.verifyTransaction(USER, JSON.stringify(tx({ bundleId: 'com.other' })), NOW)).rejects.toMatchObject({ code: 'APPLE_INVALID_TRANSACTION' });
  });

  it('an expired transaction gives no access', async () => {
    const { repo, apple } = service();
    await apple.verifyTransaction(USER, JSON.stringify(tx({ expiresDate: NOW.getTime() - 5 * DAY })), NOW);
    expect(repo.records.get(USER)!.tier).toBe(SubscriptionTier.Free);
  });
});

describe('AppleService.handleNotification (Apple tells us about changes)', () => {
  it('renewal extends the expiry', async () => {
    const { repo, apple } = service();
    await apple.verifyTransaction(USER, JSON.stringify(tx()), NOW);
    const later = NOW.getTime() + 60 * DAY;
    await apple.handleNotification(notification('DID_RENEW', { transactionId: 't2', expiresDate: later }, { status: 1 }), NOW);
    expect(repo.records.get(USER)!.sources!.apple!.expiresAt).toBe(new Date(later).toISOString());
  });

  it('auto-renew turned off keeps access until expiry', async () => {
    const { repo, apple } = service();
    await apple.handleNotification(
      notification('DID_CHANGE_RENEWAL_STATUS', {}, { status: 1, signedRenewalInfo: JSON.stringify({ autoRenewStatus: 0 }) }),
      NOW
    );
    expect(repo.records.get(USER)!.sources!.apple).toMatchObject({ status: 'CANCELLED', willRenew: false });
    expect(repo.records.get(USER)!.tier).toBe(SubscriptionTier.Standard);
  });

  it('refund ends access now', async () => {
    const { repo, apple } = service();
    await apple.verifyTransaction(USER, JSON.stringify(tx()), NOW);
    await apple.handleNotification(notification('REFUND', { revocationDate: NOW.getTime() }, { status: 5 }), NOW);
    expect(repo.records.get(USER)!.tier).toBe(SubscriptionTier.Free);
  });

  it('billing grace period keeps access until the grace end', async () => {
    const { repo, apple } = service();
    const graceEnd = NOW.getTime() + 6 * DAY;
    await apple.handleNotification(
      notification('DID_FAIL_TO_RENEW', { expiresDate: NOW.getTime() - DAY }, {
        status: 4,
        signedRenewalInfo: JSON.stringify({ autoRenewStatus: 1, gracePeriodExpiresDate: graceEnd }),
      }),
      NOW
    );
    expect(repo.records.get(USER)!.sources!.apple).toMatchObject({ status: 'GRACE', expiresAt: new Date(graceEnd).toISOString() });
    expect(repo.records.get(USER)!.tier).toBe(SubscriptionTier.Standard);
  });

  it('an Apple event never touches the Stripe entry', async () => {
    const repo = new FakeRepo();
    await repo.applyEvent({
      userId: USER, source: 'stripe', tier: SubscriptionTier.Light, status: 'ACTIVE',
      expiresAt: new Date(NOW.getTime() + 10 * DAY), externalId: 'sub_1', eventAt: NOW, eventId: 's1',
    });
    const { apple } = service(repo);
    await apple.handleNotification(notification('EXPIRED', {}, { status: 2 }), NOW);
    expect(repo.records.get(USER)!.sources!.stripe!.status).toBe('ACTIVE');
    expect(repo.records.get(USER)!.tier).toBe(SubscriptionTier.Light);
  });

  it('unknown owner throws so Apple retries', async () => {
    const { apple } = service();
    await expect(apple.handleNotification(notification('DID_RENEW', { appAccountToken: undefined }), NOW)).rejects.toThrow();
  });

  it('TEST notifications are acknowledged', async () => {
    const { apple } = service();
    await expect(apple.handleNotification(JSON.stringify({ notificationType: 'TEST' }), NOW)).resolves.toBe('test');
  });
});

describe('appleStatus', () => {
  it('billing retry without grace means no access', () => {
    expect(appleStatus(tx() as any, { now: NOW, subscriptionStatus: 3 }).status).toBe('EXPIRED');
  });
});

describe('real Apple verifier', () => {
  it('rejects data not signed by Apple', async () => {
    const { createAppleVerifier } = require('../../../src/services/apple.service');
    const v = createAppleVerifier(appleConfigFromEnv({}));
    const fake = [
      Buffer.from(JSON.stringify({ alg: 'ES256', x5c: ['AAAA', 'BBBB', 'CCCC'] })).toString('base64url'),
      Buffer.from(JSON.stringify({ productId: 'dashden.premium.monthly' })).toString('base64url'),
      'sig',
    ].join('.');
    await expect(v.transaction(fake)).rejects.toBeTruthy();
    await expect(v.notification('not-a-jws')).rejects.toBeTruthy();
  });
});
