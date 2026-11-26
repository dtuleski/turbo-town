import { SubscriptionTier } from '@memory-game/shared';

/**
 * Stripe price ids per tier. Same values the web subscription page uses
 * (apps/web/src/pages/subscription/RateLimitPage.tsx). Env vars override.
 */
export function stripePriceMap(): Record<'LIGHT' | 'STANDARD' | 'PREMIUM', string> {
  return {
    LIGHT: process.env.STRIPE_PRICE_LIGHT || 'price_1Tla6fD1JApM7NxilsPnWDmq',
    STANDARD: process.env.STRIPE_PRICE_STANDARD || 'price_1Tla6gD1JApM7NxiAv5siMlb',
    PREMIUM: process.env.STRIPE_PRICE_PREMIUM || 'price_1Tla6fD1JApM7NxiNhbaOCG8',
  };
}

/** Tier for a Stripe price id, or null for an unknown price. */
export function tierForStripePrice(priceId: string | undefined | null): SubscriptionTier | null {
  if (!priceId) return null;
  const map = stripePriceMap();
  if (priceId === map.LIGHT) return SubscriptionTier.Light;
  if (priceId === map.STANDARD) return SubscriptionTier.Standard;
  if (priceId === map.PREMIUM) return SubscriptionTier.Premium;
  return null;
}
