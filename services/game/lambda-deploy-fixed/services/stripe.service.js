"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const logger_1 = require("../utils/logger");
const shared_1 = require("@memory-game/shared");
const subscription_repository_1 = require("../repositories/subscription.repository");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2022-11-15',
});
class StripeService {
    constructor() {
        this.subscriptionRepo = new subscription_repository_1.SubscriptionRepository();
    }
    /**
     * Create Stripe Checkout session for subscription purchase
     */
    async createCheckoutSession(input) {
        try {
            logger_1.logger.info('Creating Stripe Checkout session', { userId: input.userId, tier: input.tier });
            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: input.priceId,
                        quantity: 1,
                    },
                ],
                customer_email: input.email,
                client_reference_id: input.userId,
                metadata: {
                    userId: input.userId,
                    tier: input.tier,
                },
                success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/subscription`,
            });
            logger_1.logger.info('Checkout session created', { sessionId: session.id, userId: input.userId });
            return {
                sessionId: session.id,
                url: session.url,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to create checkout session', error, { userId: input.userId });
            throw new Error('Failed to create checkout session');
        }
    }
    /**
     * Create Stripe Customer Portal session for subscription management
     */
    async createPortalSession(input) {
        try {
            logger_1.logger.info('Creating Stripe Customer Portal session', { customerId: input.customerId });
            const session = await stripe.billingPortal.sessions.create({
                customer: input.customerId,
                return_url: `${process.env.FRONTEND_URL}/subscription`,
            });
            logger_1.logger.info('Portal session created', { sessionId: session.id, customerId: input.customerId });
            return {
                url: session.url,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to create portal session', error, { customerId: input.customerId });
            throw new Error('Failed to create portal session');
        }
    }
    /**
     * Handle Stripe webhook events
     */
    async handleWebhook(event) {
        logger_1.logger.info('Processing Stripe webhook', { type: event.type, eventId: event.id });
        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object);
                    break;
                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(event.data.object);
                    break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;
                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;
                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                default:
                    logger_1.logger.info('Unhandled webhook event type', { type: event.type });
            }
            logger_1.logger.info('Webhook processed successfully', { type: event.type, eventId: event.id });
        }
        catch (error) {
            logger_1.logger.error('Failed to process webhook', error, { type: event.type, eventId: event.id });
            throw error;
        }
    }
    /**
     * Handle checkout.session.completed event
     */
    async handleCheckoutCompleted(session) {
        const userId = session.metadata?.userId || session.client_reference_id;
        const tier = session.metadata?.tier;
        if (!userId || !tier) {
            logger_1.logger.error('Missing userId or tier in checkout session', new Error('Missing userId or tier'), { sessionId: session.id });
            return;
        }
        logger_1.logger.info('Checkout completed', { userId, tier, customerId: session.customer });
        // Map tier to SubscriptionTier enum
        const subscriptionTier = tier === 'LIGHT' ? shared_1.SubscriptionTier.Light : shared_1.SubscriptionTier.Premium;
        // Update subscription in DynamoDB
        await this.subscriptionRepo.updateSubscription({
            userId,
            tier: subscriptionTier,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
    }
    /**
     * Handle customer.subscription.created event
     */
    async handleSubscriptionCreated(subscription) {
        const userId = subscription.metadata?.userId;
        if (!userId) {
            logger_1.logger.error('Missing userId in subscription metadata', new Error('Missing userId'), { subscriptionId: subscription.id });
            return;
        }
        logger_1.logger.info('Subscription created', { userId, subscriptionId: subscription.id });
    }
    /**
     * Handle customer.subscription.updated event
     */
    async handleSubscriptionUpdated(subscription) {
        const userId = subscription.metadata?.userId;
        if (!userId) {
            logger_1.logger.error('Missing userId in subscription metadata', new Error('Missing userId'), { subscriptionId: subscription.id });
            return;
        }
        const status = subscription.status === 'active' ? 'ACTIVE' : 'INACTIVE';
        logger_1.logger.info('Subscription updated', { userId, subscriptionId: subscription.id, status });
        await this.subscriptionRepo.updateSubscription({
            userId,
            stripeSubscriptionId: subscription.id,
            status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        });
    }
    /**
     * Handle customer.subscription.deleted event
     */
    async handleSubscriptionDeleted(subscription) {
        const userId = subscription.metadata?.userId;
        if (!userId) {
            logger_1.logger.error('Missing userId in subscription metadata', new Error('Missing userId'), { subscriptionId: subscription.id });
            return;
        }
        logger_1.logger.info('Subscription deleted', { userId, subscriptionId: subscription.id });
        // Downgrade to FREE tier
        await this.subscriptionRepo.updateSubscription({
            userId,
            tier: shared_1.SubscriptionTier.Free,
            status: 'INACTIVE',
            stripeSubscriptionId: subscription.id,
        });
    }
    /**
     * Handle invoice.payment_succeeded event
     */
    async handlePaymentSucceeded(invoice) {
        logger_1.logger.info('Payment succeeded', {
            customerId: invoice.customer,
            subscriptionId: invoice.subscription,
            amount: invoice.amount_paid,
        });
    }
    /**
     * Handle invoice.payment_failed event
     */
    async handlePaymentFailed(invoice) {
        logger_1.logger.error('Payment failed', new Error('Payment failed'), {
            customerId: invoice.customer,
            subscriptionId: invoice.subscription,
            amount: invoice.amount_due,
        });
        // TODO: Send notification to user about payment failure
    }
    /**
     * Verify Stripe webhook signature
     */
    static verifyWebhookSignature(payload, signature) {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        try {
            return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        }
        catch (error) {
            logger_1.logger.error('Webhook signature verification failed', error);
            throw new Error('Invalid webhook signature');
        }
    }
}
exports.StripeService = StripeService;
//# sourceMappingURL=stripe.service.js.map