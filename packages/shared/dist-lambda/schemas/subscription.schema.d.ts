/**
 * Zod validation schema for Subscription entity
 */
import { z } from 'zod';
import { SubscriptionTier, SubscriptionStatus, BillingPeriod } from '../types/enums';
export declare const subscriptionSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    userId: z.ZodString;
    tier: z.ZodNativeEnum<typeof SubscriptionTier>;
    status: z.ZodNativeEnum<typeof SubscriptionStatus>;
    billingPeriod: z.ZodNativeEnum<typeof BillingPeriod>;
    stripeCustomerId: z.ZodString;
    stripeSubscriptionId: z.ZodString;
    currentPeriodStart: z.ZodDate;
    currentPeriodEnd: z.ZodDate;
    cancelAt: z.ZodOptional<z.ZodDate>;
    cancelledAt: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    status: SubscriptionStatus;
    tier: SubscriptionTier;
    userId: string;
    billingPeriod: BillingPeriod;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    cancelAt?: Date | undefined;
    cancelledAt?: Date | undefined;
}, {
    status: SubscriptionStatus;
    tier: SubscriptionTier;
    userId: string;
    billingPeriod: BillingPeriod;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    cancelAt?: Date | undefined;
    cancelledAt?: Date | undefined;
}>;
export declare const subscriptionCreateSchema: z.ZodObject<{
    userId: z.ZodString;
    tier: z.ZodEffects<z.ZodNativeEnum<typeof SubscriptionTier>, SubscriptionTier.Light | SubscriptionTier.Standard | SubscriptionTier.Premium, SubscriptionTier>;
    billingPeriod: z.ZodNativeEnum<typeof BillingPeriod>;
}, "strip", z.ZodTypeAny, {
    tier: SubscriptionTier.Light | SubscriptionTier.Standard | SubscriptionTier.Premium;
    userId: string;
    billingPeriod: BillingPeriod;
}, {
    tier: SubscriptionTier;
    userId: string;
    billingPeriod: BillingPeriod;
}>;
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;
//# sourceMappingURL=subscription.schema.d.ts.map