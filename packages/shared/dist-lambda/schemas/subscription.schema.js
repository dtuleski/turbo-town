"use strict";
/**
 * Zod validation schema for Subscription entity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionCreateSchema = exports.subscriptionSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../types/enums");
exports.subscriptionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    userId: zod_1.z.string().uuid(),
    tier: zod_1.z.nativeEnum(enums_1.SubscriptionTier),
    status: zod_1.z.nativeEnum(enums_1.SubscriptionStatus),
    billingPeriod: zod_1.z.nativeEnum(enums_1.BillingPeriod),
    stripeCustomerId: zod_1.z.string().min(1),
    stripeSubscriptionId: zod_1.z.string().min(1),
    currentPeriodStart: zod_1.z.date(),
    currentPeriodEnd: zod_1.z.date(),
    cancelAt: zod_1.z.date().optional(),
    cancelledAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.subscriptionCreateSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    tier: zod_1.z.nativeEnum(enums_1.SubscriptionTier).refine((tier) => tier !== enums_1.SubscriptionTier.Free, {
        message: 'Cannot create subscription for Free tier',
    }),
    billingPeriod: zod_1.z.nativeEnum(enums_1.BillingPeriod),
});
//# sourceMappingURL=subscription.schema.js.map