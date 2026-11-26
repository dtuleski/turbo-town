import { SubscriptionTier } from '@memory-game/shared';
import {
  PlanEvent,
  PlanRecord,
  applyPlanEvent,
  effectivePlan,
  entryGrantsAccess,
  otherPaidSource,
  sourcesOf,
  stripeStatus,
} from '../../../src/services/entitlement';

const NOW = new Date('2026-11-23T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);

function event(over: Partial<PlanEvent> = {}): PlanEvent {
  return {
    userId: 'u1',
    source: 'stripe',
    tier: SubscriptionTier.Standard,
    status: 'ACTIVE',
    expiresAt: at(30 * DAY),
    externalId: 'sub_1',
    eventAt: at(0),
    eventId: 'evt_1',
    ...over,
  };
}

function applyAll(events: PlanEvent[], start: PlanRecord | null = null): PlanRecord | null {
  let record = start;
  for (const e of events) {
    const r = applyPlanEvent(record, e, NOW);
    if (r.changed) record = r.record;
  }
  return record;
}

describe('entitlement rules', () => {
  describe('expiry and grace', () => {
    it('grants until expiry plus one day, then stops', () => {
      const entry = { tier: SubscriptionTier.Light, status: 'ACTIVE' as const, expiresAt: NOW.toISOString(), lastEventAt: '', lastEventId: '' };
      expect(entryGrantsAccess(entry, at(DAY - 1))).toBe(true);
      expect(entryGrantsAccess(entry, at(DAY))).toBe(false);
    });

    it('a cancelled plan keeps access until the paid period ends', () => {
      const r = applyAll([event({ status: 'CANCELLED', expiresAt: at(5 * DAY) })]);
      expect(effectivePlan(r, NOW).tier).toBe(SubscriptionTier.Standard);
      expect(effectivePlan(r, at(7 * DAY)).tier).toBe(SubscriptionTier.Free);
    });

    it('a refund ends access immediately even before expiry', () => {
      const r = applyAll([event(), event({ status: 'REVOKED', eventId: 'evt_2', eventAt: at(1000) })]);
      expect(effectivePlan(r, NOW).tier).toBe(SubscriptionTier.Free);
    });

    it('GRACE (payment retrying) keeps access', () => {
      const r = applyAll([event({ status: 'GRACE', expiresAt: at(3 * DAY) })]);
      expect(effectivePlan(r, NOW).tier).toBe(SubscriptionTier.Standard);
    });
  });

  describe('duplicates and order', () => {
    it('ignores the same event twice', () => {
      const first = applyPlanEvent(null, event(), NOW);
      expect(first.changed).toBe(true);
      const second = applyPlanEvent((first as any).record, event(), NOW);
      expect(second).toEqual({ changed: false, reason: 'duplicate' });
    });

    it('ignores an older event that arrives late', () => {
      const r = applyAll([event({ eventAt: at(1000), eventId: 'evt_new' })]);
      const late = applyPlanEvent(r, event({ status: 'EXPIRED', eventAt: at(0), eventId: 'evt_old' }), NOW);
      expect(late).toEqual({ changed: false, reason: 'stale' });
    });

    it('a deleted event for a replaced subscription does not end the new one', () => {
      const r = applyAll([
        event({ externalId: 'sub_old', eventId: 'e1', tier: SubscriptionTier.Light }),
        event({ externalId: 'sub_new', eventId: 'e2', eventAt: at(1000), tier: SubscriptionTier.Premium }),
      ]);
      const oldEnded = applyPlanEvent(r, event({ externalId: 'sub_old', status: 'EXPIRED', eventId: 'e3', eventAt: at(2000) }), NOW);
      expect(oldEnded).toEqual({ changed: false, reason: 'old-subscription' });
      expect(effectivePlan(r, NOW).tier).toBe(SubscriptionTier.Premium);
    });

    it('a new subscription after an expired one is accepted', () => {
      const r = applyAll([
        event({ externalId: 'sub_old', status: 'EXPIRED', eventId: 'e1' }),
        event({ externalId: 'sub_new', eventId: 'e2', eventAt: at(1000) }),
      ]);
      expect(effectivePlan(r, NOW).tier).toBe(SubscriptionTier.Standard);
      expect(r!.stripeSubscriptionId).toBe('sub_new');
    });
  });

  describe('several sources', () => {
    it('Stripe ending does not remove an Apple plan', () => {
      const r = applyAll([
        event({ source: 'apple', externalId: 'otx_1', eventId: 'a1', tier: SubscriptionTier.Light }),
        event({ eventId: 's1' }),
        event({ eventId: 's2', status: 'EXPIRED', eventAt: at(1000) }),
      ]);
      const plan = effectivePlan(r, NOW);
      expect(plan.tier).toBe(SubscriptionTier.Light);
      expect(plan.source).toBe('apple');
    });

    it('the highest active tier wins', () => {
      const r = applyAll([
        event({ source: 'apple', externalId: 'otx_1', eventId: 'a1', tier: SubscriptionTier.Premium }),
        event({ eventId: 's1', tier: SubscriptionTier.Light }),
      ]);
      expect(effectivePlan(r, NOW)).toMatchObject({ tier: SubscriptionTier.Premium, source: 'apple' });
    });

    it('otherPaidSource finds a store plan and ignores admin grants', () => {
      const apple = applyAll([event({ source: 'apple', externalId: 'otx_1', eventId: 'a1' })]);
      expect(otherPaidSource(apple, 'stripe', NOW)).toBe('apple');
      expect(otherPaidSource(apple, 'apple', NOW)).toBeNull();
      const manual = applyAll([event({ source: 'manual', expiresAt: undefined, externalId: undefined, eventId: 'm1' })]);
      expect(otherPaidSource(manual, 'stripe', NOW)).toBeNull();
    });

    it('an expired store plan does not block', () => {
      const r = applyAll([event({ source: 'apple', externalId: 'otx_1', eventId: 'a1', expiresAt: at(-3 * DAY) })]);
      expect(otherPaidSource(r, 'stripe', NOW)).toBeNull();
    });
  });

  describe('legacy records (before the sources map)', () => {
    const legacyStripe: PlanRecord = {
      userId: 'u1',
      tier: 'LIGHT',
      status: 'ACTIVE',
      stripeSubscriptionId: 'sub_1',
      stripeCustomerId: 'cus_1',
      currentPeriodEnd: '2026-08-06T15:34:55.691Z',
      updatedAt: '2026-07-07T15:34:55.691Z',
    };

    it('read as a Stripe entry without expiry, as they behaved before', () => {
      expect(sourcesOf(legacyStripe).stripe).toMatchObject({ tier: SubscriptionTier.Light, externalId: 'sub_1', customerId: 'cus_1' });
      expect(effectivePlan(legacyStripe, NOW).tier).toBe(SubscriptionTier.Light);
    });

    it('a record without Stripe ids is an admin grant', () => {
      const grant: PlanRecord = { userId: 'u2', tier: 'PREMIUM', status: 'ACTIVE', updatedAt: '2026-07-01T00:00:00Z' };
      expect(Object.keys(sourcesOf(grant))).toEqual(['manual']);
      expect(effectivePlan(grant, NOW).tier).toBe(SubscriptionTier.Premium);
    });

    it('a first new event keeps legacy fields the web still reads', () => {
      const r = applyAll([event({ externalId: 'sub_1', customerId: undefined, eventId: 'e1' })], legacyStripe);
      expect(r!.stripeCustomerId).toBe('cus_1');
      expect(r!.sources!.stripe!.customerId).toBe('cus_1');
      expect(r!.version).toBe(1);
      expect(r!.tier).toBe(SubscriptionTier.Standard);
      expect(r!.status).toBe('ACTIVE');
    });
  });

  describe('derived fields', () => {
    it('FREE tier writes INACTIVE status', () => {
      const r = applyAll([event({ status: 'EXPIRED' })]);
      expect(r!.tier).toBe(SubscriptionTier.Free);
      expect(r!.status).toBe('INACTIVE');
    });
  });

  describe('stripeStatus', () => {
    it.each([
      ['active', false, 'ACTIVE'],
      ['active', true, 'CANCELLED'],
      ['trialing', false, 'ACTIVE'],
      ['past_due', false, 'GRACE'],
      ['canceled', false, 'EXPIRED'],
      ['unpaid', false, 'EXPIRED'],
      ['incomplete_expired', false, 'EXPIRED'],
    ])('%s (cancel at period end %s) -> %s', (status, cancelAtEnd, expected) => {
      expect(stripeStatus(status, cancelAtEnd)).toBe(expected);
    });
  });
});
