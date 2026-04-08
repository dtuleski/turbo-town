import { SubscriptionTier } from '@memory-game/shared';
import { Subscription, SubscriptionRepository as ISubscriptionRepository } from '../types';
/**
 * Subscription Repository (Read-Only)
 * Subscriptions are owned by Payment Service
 */
export declare class SubscriptionRepository implements ISubscriptionRepository {
    /**
     * Get subscription by user ID
     * No caching - need real-time tier validation
     */
    getByUserId(userId: string): Promise<Subscription | null>;
    /**
     * Get subscription tier for user
     * Returns FREE if no subscription found
     */
    getTier(userId: string): Promise<SubscriptionTier>;
    /**
     * Update subscription (for Stripe integration)
     */
    updateSubscription(data: {
        userId: string;
        tier?: SubscriptionTier;
        status?: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED';
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
        currentPeriodStart?: Date;
        currentPeriodEnd?: Date;
    }): Promise<void>;
}
//# sourceMappingURL=subscription.repository.d.ts.map