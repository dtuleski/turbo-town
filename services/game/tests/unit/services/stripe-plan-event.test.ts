import { SubscriptionTier } from '@memory-game/shared';
import { stripeSubscriptionToPlanEvent } from '../../../src/services/stripe.service';

const eventAt = new Date('2026-11-23T12:00:00Z');

function sub(over: Record<string, unknown> = {}, item: Record<string, unknown> = {}): any {
  return {
    id: 'sub_1',
    status: 'active',
    cancel_at_period_end: false,
    customer: 'cus_1',
    metadata: {},
    current_period_end: 1796000000,
    items: { data: [{ price: { id: 'price_1Tla6gD1JApM7NxiAv5siMlb' }, ...item }] },
    ...over,
  };
}

describe('stripeSubscriptionToPlanEvent', () => {
  it('uses the price id for the tier and the real period end for expiry', () => {
    const e = stripeSubscriptionToPlanEvent(sub(), { userId: 'u1', eventAt, eventId: 'evt_1' });
    expect(e).toMatchObject({
      source: 'stripe',
      tier: SubscriptionTier.Standard,
      status: 'ACTIVE',
      externalId: 'sub_1',
      willRenew: true,
    });
    expect(e.expiresAt!.getTime()).toBe(1796000000 * 1000);
  });

  it('reads the period end from the item on newer API versions', () => {
    const e = stripeSubscriptionToPlanEvent(
      sub({ current_period_end: undefined }, { current_period_end: 1797000000 }),
      { userId: 'u1', eventAt, eventId: 'evt_1' }
    );
    expect(e.expiresAt!.getTime()).toBe(1797000000 * 1000);
  });

  it('falls back to metadata tier for an unknown price', () => {
    const e = stripeSubscriptionToPlanEvent(
      sub({ metadata: { tier: 'PREMIUM' } }, { price: { id: 'price_unknown' } }),
      { userId: 'u1', eventAt, eventId: 'evt_1' }
    );
    expect(e.tier).toBe(SubscriptionTier.Premium);
  });

  it('a deleted subscription ends now', () => {
    const e = stripeSubscriptionToPlanEvent(sub({ status: 'canceled' }), { userId: 'u1', eventAt, eventId: 'evt_2', ended: true });
    expect(e.status).toBe('EXPIRED');
    expect(e.willRenew).toBe(false);
  });

  it('cancel at period end keeps access but will not renew', () => {
    const e = stripeSubscriptionToPlanEvent(sub({ cancel_at_period_end: true }), { userId: 'u1', eventAt, eventId: 'evt_3' });
    expect(e.status).toBe('CANCELLED');
    expect(e.willRenew).toBe(false);
  });
});
