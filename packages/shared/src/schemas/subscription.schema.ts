/**
 * Zod validation schema for Subscription entity
 */

import { z } from 'zod';
import { SubscriptionTier, SubscriptionStatus, BillingPeriod } from '../types/enums';

export const subscriptionSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  tier: z.nativeEnum(SubscriptionTier),
  status: z.nativeEnum(SubscriptionStatus),
  billingPeriod: z.nativeEnum(BillingPeriod),
  stripeCustomerId: z.string().min(1),
  stripeSubscriptionId: z.string().min(1),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAt: z.date().optional(),
  cancelledAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const subscriptionCreateSchema = z.object({
  userId: z.string().uuid(),
  tier: z.nativeEnum(SubscriptionTier).refine((tier) => tier !== SubscriptionTier.Free, {
    message: 'Cannot create subscription for Free tier',
  }),
  billingPeriod: z.nativeEnum(BillingPeriod),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;
