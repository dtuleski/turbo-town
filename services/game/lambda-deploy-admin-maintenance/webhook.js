"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const stripe_service_1 = require("./services/stripe.service");
const logger_1 = require("./utils/logger");
/**
 * Lambda handler for Stripe webhooks
 * Processes subscription lifecycle events
 */
async function handler(event) {
    try {
        logger_1.logger.info('Stripe webhook received', {
            headers: event.headers,
        });
        // Get Stripe signature from headers
        const signature = event.headers['Stripe-Signature'] || event.headers['stripe-signature'];
        if (!signature) {
            logger_1.logger.error('Missing Stripe signature', new Error('Missing Stripe signature'));
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing Stripe signature' }),
            };
        }
        // Verify webhook signature and construct event
        const stripeEvent = stripe_service_1.StripeService.verifyWebhookSignature(event.body || '', signature);
        logger_1.logger.info('Webhook signature verified', { type: stripeEvent.type, eventId: stripeEvent.id });
        // Process webhook event
        const stripeService = new stripe_service_1.StripeService();
        await stripeService.handleWebhook(stripeEvent);
        return {
            statusCode: 200,
            body: JSON.stringify({ received: true }),
        };
    }
    catch (error) {
        logger_1.logger.error('Webhook processing failed', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: error.message }),
        };
    }
}
//# sourceMappingURL=webhook.js.map