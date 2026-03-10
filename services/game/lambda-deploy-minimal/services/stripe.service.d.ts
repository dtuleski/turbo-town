import Stripe from 'stripe';
export interface CreateCheckoutSessionInput {
    userId: string;
    email: string;
    priceId: string;
    tier: 'LIGHT' | 'PREMIUM';
}
export interface CreatePortalSessionInput {
    customerId: string;
}
export declare class StripeService {
    private subscriptionRepo;
    constructor();
    /**
     * Create Stripe Checkout session for subscription purchase
     */
    createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{
        sessionId: string;
        url: string;
    }>;
    /**
     * Create Stripe Customer Portal session for subscription management
     */
    createPortalSession(input: CreatePortalSessionInput): Promise<{
        url: string;
    }>;
    /**
     * Handle Stripe webhook events
     */
    handleWebhook(event: Stripe.Event): Promise<void>;
    /**
     * Handle checkout.session.completed event
     */
    private handleCheckoutCompleted;
    /**
     * Handle customer.subscription.created event
     */
    private handleSubscriptionCreated;
    /**
     * Handle customer.subscription.updated event
     */
    private handleSubscriptionUpdated;
    /**
     * Handle customer.subscription.deleted event
     */
    private handleSubscriptionDeleted;
    /**
     * Handle invoice.payment_succeeded event
     */
    private handlePaymentSucceeded;
    /**
     * Handle invoice.payment_failed event
     */
    private handlePaymentFailed;
    /**
     * Verify Stripe webhook signature
     */
    static verifyWebhookSignature(payload: string, signature: string): Stripe.Event;
}
//# sourceMappingURL=stripe.service.d.ts.map