import Stripe from 'stripe';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';
import { SubscriptionTier } from '@memory-game/shared';
import { SubscriptionRepository } from '../repositories/subscription.repository';

const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const RATE_LIMITS_TABLE = process.env.RATE_LIMITS_TABLE_NAME!;

// Cache for secrets (Lambda container reuse)
let cachedStripeKey: string | null = null;
let cachedWebhookSecret: string | null = null;
let stripeInstance: Stripe | null = null;

async function getSecret(secretArn: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretArn });
  const response = await secretsManager.send(command);
  return response.SecretString || '';
}

async function getStripeClient(): Promise<Stripe> {
  if (stripeInstance) return stripeInstance;

  const secretArn = process.env.STRIPE_SECRET_KEY_ARN;
  if (secretArn) {
    // Production: fetch from Secrets Manager
    cachedStripeKey = await getSecret(secretArn);
    logger.info('Stripe key loaded from Secrets Manager');
  } else {
    // Dev fallback: use env var directly
    cachedStripeKey = process.env.STRIPE_SECRET_KEY || '';
  }

  stripeInstance = new Stripe(cachedStripeKey, { apiVersion: '2022-11-15' });
  return stripeInstance;
}

async function getWebhookSecret(): Promise<string> {
  if (cachedWebhookSecret) return cachedWebhookSecret;

  const secretArn = process.env.STRIPE_WEBHOOK_SECRET_ARN;
  if (secretArn) {
    cachedWebhookSecret = await getSecret(secretArn);
  } else {
    cachedWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }
  return cachedWebhookSecret;
}

export interface CreateCheckoutSessionInput {
  userId: string;
  email: string;
  priceId: string;
  tier: 'LIGHT' | 'STANDARD' | 'PREMIUM';
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
   * Get the Stripe client instance (for session retrieval etc.)
   */
  async getStripeClientPublic(): Promise<Stripe> {
    return getStripeClient();
  }

  /**
   * Sync tier to rate-limits table (keeps both tables consistent)
   */
  private async syncRateLimitTier(userId: string, tier: string): Promise<void> {
    try {
      await dynamoClient.send(new UpdateCommand({
        TableName: RATE_LIMITS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET tier = :t',
        ExpressionAttributeValues: { ':t': tier },
      }));
      logger.info('Rate limit tier synced', { userId, tier });
    } catch (error) {
      // Non-fatal: log but don't fail the webhook
      logger.error('Failed to sync rate limit tier', error as Error, { userId, tier });
    }
  }

  /**
   * Create Stripe Checkout session for NEW subscription (user has no active subscription)
   */
  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ sessionId: string; url: string }> {
    try {
      logger.info('Creating Stripe Checkout session', { userId: input.userId, tier: input.tier });

      const stripe = await getStripeClient();

      // Check if user already has a Stripe customer ID (avoid duplicate customers)
      const existing = await this.subscriptionRepo.getByUserId(input.userId);
      const existingCustomerId = existing?.stripeCustomerId;

      // Build checkout session params
      const sessionParams: any = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: input.priceId,
            quantity: 1,
          },
        ],
        client_reference_id: input.userId,
        metadata: {
          userId: input.userId,
          tier: input.tier,
        },
        success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/subscription`,
      };

      // Reuse existing Stripe customer if available, otherwise use email
      if (existingCustomerId) {
        sessionParams.customer = existingCustomerId;
      } else {
        sessionParams.customer_email = input.email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

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
   * Change subscription plan with proration (upgrade or downgrade)
   * Uses Stripe subscription.update() — no new checkout needed
   */
  async changePlan(userId: string, newTier: string, newPriceId: string): Promise<{ success: boolean; tier: string }> {
    try {
      logger.info('Changing subscription plan', { userId, newTier });

      const stripe = await getStripeClient();
      const existing = await this.subscriptionRepo.getByUserId(userId);

      if (!existing?.stripeSubscriptionId || existing?.status !== 'ACTIVE') {
        throw new Error('No active subscription found. Please subscribe first.');
      }

      // Verify the subscription is actually active in Stripe (not just in our DB)
      let subscription: any;
      try {
        subscription = await stripe.subscriptions.retrieve(existing.stripeSubscriptionId);
      } catch (retrieveErr) {
        throw new Error('Subscription not found in Stripe. Please subscribe again.');
      }

      if (subscription.status !== 'active') {
        // Subscription is cancelled/expired in Stripe — need to resubscribe via checkout
        throw new Error('SUBSCRIPTION_NOT_ACTIVE');
      }

      const currentItem = subscription.items.data[0];

      if (!currentItem) {
        throw new Error('No subscription item found');
      }

      // Update the subscription with the new price
      // Upgrades: charge prorated difference immediately (prevents gaming the system)
      // Downgrades: no proration — just apply the lower price at next renewal
      const tierRank: Record<string, number> = { LIGHT: 1, STANDARD: 2, PREMIUM: 3 };
      const currentTierName = existing.tier?.toUpperCase() || 'LIGHT';
      const isUpgrade = (tierRank[newTier] || 0) > (tierRank[currentTierName] || 0);

      const updated = await stripe.subscriptions.update(existing.stripeSubscriptionId, {
        items: [{
          id: currentItem.id,
          price: newPriceId,
        }],
        proration_behavior: isUpgrade ? 'always_invoice' : 'none',
        payment_behavior: 'error_if_incomplete',
        metadata: {
          userId,
          tier: newTier,
        },
      });

      logger.info('Subscription plan changed', {
        userId,
        newTier,
        subscriptionId: updated.id,
        status: updated.status,
      });

      // Map tier to enum
      const tierMap: Record<string, SubscriptionTier> = {
        LIGHT: SubscriptionTier.Light,
        STANDARD: SubscriptionTier.Standard,
        PREMIUM: SubscriptionTier.Premium,
      };
      const subscriptionTier = tierMap[newTier] || SubscriptionTier.Free;

      // Update DynamoDB immediately
      await this.subscriptionRepo.updateSubscription({
        userId,
        tier: subscriptionTier,
        status: 'ACTIVE',
        stripeSubscriptionId: updated.id,
      });

      // Sync rate limits
      await this.syncRateLimitTier(userId, newTier);

      return { success: true, tier: newTier };
    } catch (error) {
      logger.error('Failed to change plan', error as Error, { userId, newTier });
      throw error;
    }
  }

  /**
   * Create Stripe Customer Portal session for subscription management
   */
  async createPortalSession(input: CreatePortalSessionInput): Promise<{ url: string }> {
    try {
      logger.info('Creating Stripe Customer Portal session', { customerId: input.customerId });

      const stripe = await getStripeClient();
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
    const tier = session.metadata?.tier as 'LIGHT' | 'STANDARD' | 'PREMIUM';

    if (!userId || !tier) {
      logger.error('Missing userId or tier in checkout session', new Error('Missing userId or tier'), { sessionId: session.id });
      return;
    }

    logger.info('Checkout completed', { userId, tier, customerId: session.customer });

    // Cancel old subscription if exists (handles upgrade via checkout)
    const existing = await this.subscriptionRepo.getByUserId(userId);
    if (existing?.stripeSubscriptionId && existing.stripeSubscriptionId !== session.subscription) {
      try {
        const stripe = await getStripeClient();
        await stripe.subscriptions.cancel(existing.stripeSubscriptionId, {
          prorate: false, // Don't prorate — Stripe Checkout already handled pricing
        });
        logger.info('Cancelled old subscription on upgrade', {
          userId,
          oldSubscriptionId: existing.stripeSubscriptionId,
          newSubscriptionId: session.subscription,
        });
      } catch (cancelErr) {
        // Log but don't fail — old sub may already be cancelled
        logger.error('Failed to cancel old subscription', cancelErr as Error, {
          userId,
          oldSubscriptionId: existing.stripeSubscriptionId,
        });
      }
    }

    // Map tier to SubscriptionTier enum
    const tierMap: Record<string, SubscriptionTier> = {
      LIGHT: SubscriptionTier.Light,
      STANDARD: SubscriptionTier.Standard,
      PREMIUM: SubscriptionTier.Premium,
    };
    const subscriptionTier = tierMap[tier] || SubscriptionTier.Free;

    // Update subscription in DynamoDB
    await this.subscriptionRepo.updateSubscription({
      userId,
      tier: subscriptionTier,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      effectiveDate: new Date(),
    });

    // Sync tier to rate-limits table
    await this.syncRateLimitTier(userId, tier);
  }

  /**
   * Handle customer.subscription.created event
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      logger.error('Missing userId in subscription metadata', new Error('Missing userId'), { subscriptionId: subscription.id });
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
      logger.error('Missing userId in subscription metadata', new Error('Missing userId'), { subscriptionId: subscription.id });
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
      logger.error('Missing userId in subscription metadata', new Error('Missing userId'), { subscriptionId: subscription.id });
      return;
    }

    logger.info('Subscription deleted', { userId, subscriptionId: subscription.id });

    // Downgrade to FREE tier
    await this.subscriptionRepo.updateSubscription({
      userId,
      tier: SubscriptionTier.Free,
      status: 'INACTIVE',
      stripeSubscriptionId: subscription.id,
    });

    // Sync tier to rate-limits table
    await this.syncRateLimitTier(userId, 'FREE');
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
  static async verifyWebhookSignature(payload: string, signature: string): Promise<Stripe.Event> {
    const stripe = await getStripeClient();
    const webhookSecret = await getWebhookSecret();
    
    try {
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      logger.error('Webhook signature verification failed', error as Error);
      throw new Error('Invalid webhook signature');
    }
  }
}
