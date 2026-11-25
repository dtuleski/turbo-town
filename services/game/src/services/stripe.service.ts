import Stripe from 'stripe';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { PlanEvent, stripeStatus, toTier } from './entitlement';
import { tierForStripePrice } from './stripe-prices';

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
  private async syncRateLimitTier(userId: string, record: { tier?: unknown }): Promise<void> {
    await this.syncRateLimitTierRaw(userId, String(record.tier ?? 'FREE'));
  }

  private async syncRateLimitTierRaw(userId: string, tier: string): Promise<void> {
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
        // Copied onto the subscription, so later subscription events carry the user.
        subscription_data: {
          metadata: {
            userId: input.userId,
            tier: input.tier,
          },
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

      if (!existing?.stripeSubscriptionId) {
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

      // Record the change now; the matching webhook event is then a duplicate.
      const record = await this.applyStripeSubscription(updated, {
        eventAt: new Date(),
        eventId: `changePlan:${updated.id}:${Date.now()}`,
        userIdHint: userId,
      });
      if (record) await this.syncRateLimitTier(userId, record);

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
   * Handle a Stripe event (webhook today; EventBridge later uses the same entry).
   * Subscription events carry the full subscription, so they are the source of
   * truth. Invoice events are logged only: Stripe follows each one with a
   * customer.subscription.updated event that carries the new state.
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    logger.info('Processing Stripe event', { type: event.type, eventId: event.id });
    const eventAt = new Date(event.created * 1000);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, eventAt, event.id);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const record = await this.applyStripeSubscription(subscription, {
            eventAt,
            eventId: event.id,
            ended: event.type === 'customer.subscription.deleted',
          });
          if (record) await this.syncRateLimitTier(record.userId, record);
          break;
        }

        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          logger.info('Stripe invoice event', {
            type: event.type,
            customerId: invoice.customer,
            subscriptionId: (invoice as any).subscription,
            amount: event.type === 'invoice.payment_failed' ? invoice.amount_due : invoice.amount_paid,
          });
          break;
        }

        default:
          logger.info('Unhandled Stripe event type', { type: event.type });
      }

      logger.info('Stripe event processed', { type: event.type, eventId: event.id });
    } catch (error) {
      logger.error('Failed to process Stripe event', error as Error, { type: event.type, eventId: event.id });
      throw error;
    }
  }

  /**
   * Checkout finished: record the new subscription from Stripe's own data,
   * then cancel any older subscription (upgrade through Checkout).
   */
  async handleCheckoutCompleted(session: Stripe.Checkout.Session, eventAt: Date, eventId: string): Promise<{ userId: string; tier: string } | null> {
    const userId = session.metadata?.userId || session.client_reference_id;
    if (!userId) {
      logger.error('Missing userId in checkout session', new Error('Missing userId'), { sessionId: session.id });
      return null;
    }
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    if (!subscriptionId) {
      logger.error('Checkout session has no subscription', new Error('No subscription'), { sessionId: session.id });
      return null;
    }

    const stripe = await getStripeClient();
    const previous = await this.subscriptionRepo.getRecord(userId);
    const previousSubscriptionId = previous?.sources?.stripe?.externalId ?? previous?.stripeSubscriptionId;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const record = await this.applyStripeSubscription(subscription, { eventAt, eventId, userIdHint: userId });
    if (record) await this.syncRateLimitTier(userId, record);

    if (previousSubscriptionId && previousSubscriptionId !== subscriptionId) {
      try {
        await stripe.subscriptions.cancel(previousSubscriptionId, { prorate: false });
        logger.info('Cancelled old subscription after checkout', {
          userId,
          oldSubscriptionId: previousSubscriptionId,
          newSubscriptionId: subscriptionId,
        });
      } catch (cancelErr) {
        // Old subscription may already be cancelled.
        logger.error('Failed to cancel old subscription', cancelErr as Error, {
          userId,
          oldSubscriptionId: previousSubscriptionId,
        });
      }
    }

    return record ? { userId, tier: String(record.tier) } : null;
  }

  /**
   * Turn a Stripe subscription into a plan event and apply it.
   * Returns the stored record, or null if the user is unknown or the event was ignored.
   */
  async applyStripeSubscription(
    subscription: Stripe.Subscription,
    opts: { eventAt: Date; eventId: string; userIdHint?: string; ended?: boolean }
  ) {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    let userId: string | undefined = opts.userIdHint || subscription.metadata?.userId;
    if (!userId && customerId) {
      userId = (await this.subscriptionRepo.getByStripeCustomerId(customerId))?.userId;
    }
    if (!userId) {
      logger.error('Cannot find user for Stripe subscription', new Error('Unknown user'), {
        subscriptionId: subscription.id,
        customerId,
      });
      return null;
    }

    const event: PlanEvent = stripeSubscriptionToPlanEvent(subscription, { ...opts, userId, customerId });
    const result = await this.subscriptionRepo.applyEvent(event);
    return result.changed ? result.record : null;
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

/**
 * Pure mapping from a Stripe subscription to a plan event (exported for tests).
 */
export function stripeSubscriptionToPlanEvent(
  subscription: Stripe.Subscription,
  opts: { userId: string; customerId?: string; eventAt: Date; eventId: string; ended?: boolean }
): PlanEvent {
  const item = subscription.items?.data?.[0] as any;
  const priceId: string | undefined = item?.price?.id;
  const tier = tierForStripePrice(priceId) ?? toTier(subscription.metadata?.tier);
  if (!tierForStripePrice(priceId)) {
    logger.warn('Unknown Stripe price, using metadata tier', { subscriptionId: subscription.id, priceId, tier });
  }
  // Older API versions put the period on the subscription, newer ones on the item.
  const periodEnd: number | undefined = (subscription as any).current_period_end ?? item?.current_period_end;
  return {
    userId: opts.userId,
    source: 'stripe',
    tier,
    status: opts.ended ? 'EXPIRED' : stripeStatus(subscription.status, Boolean(subscription.cancel_at_period_end)),
    expiresAt: periodEnd ? new Date(periodEnd * 1000) : undefined,
    externalId: subscription.id,
    customerId: opts.customerId,
    willRenew: !opts.ended && !subscription.cancel_at_period_end && subscription.status !== 'canceled',
    eventAt: opts.eventAt,
    eventId: opts.eventId,
  };
}
