import { StripeService } from './services/stripe.service';
import { logger } from './utils/logger';

/**
 * Lambda handler for Stripe webhooks
 * Processes subscription lifecycle events
 */
export async function handler(event: any): Promise<any> {
  try {
    logger.info('Stripe webhook received', {
      headers: event.headers,
    });

    // Get Stripe signature from headers
    const signature = event.headers['Stripe-Signature'] || event.headers['stripe-signature'];

    if (!signature) {
      logger.error('Missing Stripe signature', new Error('Missing Stripe signature'));
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing Stripe signature' }),
      };
    }

    // Verify webhook signature and construct event
    const stripeEvent = await StripeService.verifyWebhookSignature(event.body || '', signature);

    logger.info('Webhook signature verified', { type: stripeEvent.type, eventId: stripeEvent.id });

    // Process webhook event
    const stripeService = new StripeService();
    await stripeService.handleWebhook(stripeEvent);

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    logger.error('Webhook processing failed', error as Error);

    return {
      statusCode: 400,
      body: JSON.stringify({ error: (error as Error).message }),
    };
  }
}
