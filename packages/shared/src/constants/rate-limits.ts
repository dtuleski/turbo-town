/**
 * Rate limit configurations by subscription tier
 */

import { SubscriptionTier } from '../types/enums';

export const RATE_LIMITS = {
  [SubscriptionTier.Free]: {
    gamesPerPeriod: 3,
    periodHours: 24,
    maxPairs: 12,
  },
  [SubscriptionTier.Light]: {
    gamesPerPeriod: 10,
    periodHours: 24,
    maxPairs: 24,
  },
  [SubscriptionTier.Standard]: {
    gamesPerPeriod: 30,
    periodHours: 24,
    maxPairs: 36,
  },
  [SubscriptionTier.Premium]: {
    gamesPerPeriod: 100,
    periodHours: 24,
    maxPairs: 48,
  },
} as const;
