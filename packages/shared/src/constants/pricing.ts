/**
 * Subscription pricing configurations (amounts in cents)
 */

import { SubscriptionTier } from '../types/enums';

export const SUBSCRIPTION_PRICING = {
  [SubscriptionTier.Light]: {
    monthly: 199, // $1.99
    annual: 1990, // $19.90 (17% discount)
  },
  [SubscriptionTier.Standard]: {
    monthly: 599, // $5.99
    annual: 5990, // $59.90 (17% discount)
  },
  [SubscriptionTier.Premium]: {
    monthly: 999, // $9.99
    annual: 9990, // $99.90 (17% discount)
  },
} as const;
