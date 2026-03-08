import Stripe from 'stripe';
import { logger } from '../utils/logger';
import { SubscriptionRepository } from '../repositories/subscription.repository';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export interface CreateCheckoutSessionInput {
  userId: string;
  email: string;
  priceId: string;
  tier: 'BASIC' | 'STANDARD';
}

export interface CreatePortalSessionInput {
  customerId: string;
}

export class StripeService {
  private subscriptionRepo: SubscriptionRepository;

  constructor() {
    this.subscriptionRepo = new SubscriptionRepository();
  }

  /**
   * Create Stripe Checkout session for subscription purchase
   */
  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ sessionId: string; url: string }> {
    try {
      logger.info('Creating Stripe Checkout session', { userId: input.userId, tier: input.tier });

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

      logger.info('Checkout session created', { sessionId: session.id, userId: input.userId });

      return {
        sessionId: session.id,
        url: session.url!,
      };
    } catch (error) {
      logger.error('Failed to create checkout session', error as Error, { userId: input.userId });
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Create Stripe Customer Portal session for subscription management
   */
  async createPortalSession(input: CreatePortalSessionInput): Promise<{ url: string }> {
    try {
      logger.info('Creating Stripe Customer Portal session', { customerId: input.customerId });

      const session = await stripe.billingPortal.sessions.create({
        customer: input.customerId,
        return_url: `${process.env.FRONTEND_URL}/subscription`,
      });

      logger.info('Portal session created', { sessionId: session.id, customerId: input.customerId });

      return {
        url: session.url,
      };
    } catch (error) {
      logger.error('Failed to create portal session', error as Error, { customerId: input.customerId });
      throw new Error('Failed to create portal session');
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    logger.info('Processing Stripe webhook', { type: event.type, eventId: event.id });

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          logger.info('Unhandled webhook event type', { type: event.type });
      }

      logger.info('Webhook processed successfully', { type: event.type, eventId: event.id });
    } catch (error) {
      logger.error('Failed to process webhook', error as Error, { type: event.type, eventId: event.id });
      throw error;
    }
  }

  /**
   * Handle checkout.session.completed event
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId || session.client_reference_id;
    const tier = session.metadata?.tier as 'BASIC' | 'STANDARD';

    if (!userId || !tier) {
      logger.error('Missing userId or tier in checkout session', { sessionId: session.id });
      return;
    }

    logger.info('Checkout completed', { userId, tier, customerId: session.customer });

    // Update subscription in DynamoDB
    await this.subscriptionRepo.updateSubscription({
      userId,
      tier,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
  }

  /**
   * Handle customer.subscription.created event
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      logger.error('Missing userId in subscription metadata', { subscriptionId: subscription.id });
      return;
    }

    logger.info('Subscription created', { userId, subscriptionId: subscription.id });
  }

  /**
   * Handle customer.subscription.updated event
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      logger.error('Missing userId in subscription metadata', { subscriptionId: subscription.id });
      return;
    }

    const status = subscription.status === 'active' ? 'ACTIVE' : 'INACTIVE';

    logger.info('Subscription updated', { userId, subscriptionId: subscription.id, status });

    await this.subscriptionRepo.updateSubscription({
      userId,
      stripeSubscriptionId: subscription.id,
      status,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    });
  }

  /**
   * Handle customer.subscription.deleted event
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      logger.error('Missing userId in subscription metadata', { subscriptionId: subscription.id });
      return;
    }

    logger.info('Subscription deleted', { userId, subscriptionId: subscription.id });

    // Downgrade to FREE tier
    await this.subscriptionRepo.updateSubscription({
      userId,
      tier: 'FREE',
      status: 'INACTIVE',
      stripeSubscriptionId: subscription.id,
    });
  }

  /**
   * Handle invoice.payment_succeeded event
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Payment succeeded', { 
      customerId: invoice.customer,
      subscriptionId: (invoice as any).subscription,
      amount: invoice.amount_paid,
    });
  }

  /**
   * Handle invoice.payment_failed event
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.error('Payment failed', new Error('Payment failed'), {
      customerId: invoice.customer,
      subscriptionId: (invoice as any).subscription,
      amount: invoice.amount_due,
    });

    // TODO: Send notification to user about payment failure
  }

  /**
   * Verify Stripe webhook signature
   */
  static verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    
    try {
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      logger.error('Webhook signature verification failed', error as Error);
      throw new Error('Invalid webhook signature');
    }
  }
}
