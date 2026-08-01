import { GameHandler } from './handlers/game.handler';
import { StripeService } from './services/stripe.service';
import { logger } from './utils/logger';
import { sanitizeError } from './utils/error-mapper';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// Allowed origins for CORS
const allowedOrigins = [
  'https://dashden.app',
  'https://www.dashden.app', 
  'https://dev.dashden.app',
  'https://turbo-town.com', // Keep for transition period
  'https://www.turbo-town.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];

// Helper function to get allowed origin
function getAllowedOrigin(origin?: string): string {
  if (!origin) return allowedOrigins[0];
  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
}

// Initialize handler (singleton pattern for Lambda container reuse)
const gameHandler = new GameHandler();

// DynamoDB client for unsubscribe endpoint
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
const EMAIL_PREFS_TABLE = process.env.EMAIL_PREFS_TABLE_NAME || 'memory-game-email-prefs-prod';

/**
 * Handle unsubscribe requests (public, no auth required).
 * GET /unsubscribe?userId=xxx&type=activation
 * Writes activationEmailOptOut: true to the email-prefs table and returns an HTML confirmation page.
 */
async function handleUnsubscribe(event: any): Promise<any> {
  const queryParams = event.queryStringParameters || {};
  const userId = queryParams.userId;
  const type = queryParams.type;

  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html' },
      body: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head><body style="font-family: sans-serif; text-align: center; padding: 60px 20px;"><h2>Missing userId</h2><p>The unsubscribe link appears to be invalid. Please try again from the email.</p></body></html>`,
    };
  }

  if (type === 'activation') {
    await ddbClient.send(new PutCommand({
      TableName: EMAIL_PREFS_TABLE,
      Item: {
        userId,
        activationEmailOptOut: true,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - DashDen</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 500px; margin: 80px auto; padding: 40px; background: white; border-radius: 16px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <h1 style="color: #6366f1; font-size: 24px; margin: 0 0 16px;">✅ Unsubscribed</h1>
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 8px;">
      You've been unsubscribed from DashDen activation emails.
    </p>
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      You can close this tab.
    </p>
  </div>
</body>
</html>`,
  };
}

async function handleStripeWebhook(event: any): Promise<any> {
  try {
    const signature = event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature'] || '';
    const body = event.body || '';
    const stripeEvent = await StripeService.verifyWebhookSignature(body, signature);
    const stripeService = new StripeService();
    await stripeService.handleWebhook(stripeEvent);
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    logger.error('Stripe webhook failed', error as Error);
    return { statusCode: 400, body: JSON.stringify({ error: 'Webhook failed' }) };
  }
}

/**
 * Lambda handler for Game Service GraphQL API
 * Handles game lifecycle, rate limiting, achievements, and statistics
 */
export async function handler(event: any, context: any): Promise<any> {
  // Set correlation ID for request tracing
  const correlationId = event.requestContext.requestId;
  logger.setContext({ correlationId, functionName: context.functionName });

  try {
    // Check if this is a Stripe webhook
    const path = event.rawPath || event.requestContext?.http?.path || '';
    if (path.endsWith('/webhook')) {
      return handleStripeWebhook(event);
    }

    // Check if this is an unsubscribe request (public, no auth)
    if (path.includes('/unsubscribe') || path.endsWith('/unsubscribe')) {
      return handleUnsubscribe(event);
    }

    // Validate environment variables
    validateEnvironment();

    // Parse GraphQL request
    const body = JSON.parse(event.body || '{}');
    const { query, variables, operationName } = body;

    logger.info('GraphQL request received', {
      operationName,
      hasQuery: !!query,
      hasVariables: !!variables,
    });

    // Check if this is a public route (no auth required)
    const isPublicRoute = path.endsWith('/public');
    
    // Extract user ID and username from JWT token (set by API Gateway authorizer)
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
    const claims = event.requestContext.authorizer?.jwt?.claims || {};
    const username = claims.preferred_username || 
                     claims.nickname ||
                     claims.name ||
                     claims.given_name ||
                     (claims.email ? claims.email.split('@')[0] : null) ||
                     claims['cognito:username'];
    const email = claims.email;
    
    // Allow unauthenticated access for checkUsernameAvailable (via public route or direct)
    const isCheckUsername = operationName === 'CheckUsernameAvailable' || 
                           operationName === 'checkUsernameAvailable' ||
                           (query && query.includes('checkUsernameAvailable'));
    
    if (!userId && !isCheckUsername && !isPublicRoute) {
      throw new Error('Unauthorized: Missing user ID');
    }
    
    // For public route, only allow checkUsernameAvailable
    if (isPublicRoute && !isCheckUsername) {
      throw new Error('Unauthorized: Only checkUsernameAvailable is allowed on public route');
    }

    // Route to appropriate resolver
    const result = await gameHandler.handleRequest({
      query,
      variables,
      operationName,
      userId,
      username,
      email,
    });

    logger.info('GraphQL request completed', {
      operationName,
      success: !result.errors,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': getAllowedOrigin(event.headers?.origin),
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    logger.error('GraphQL request failed', error as Error, {
      event: JSON.stringify(event),
    });

    const sanitized = sanitizeError(error as Error);

    return {
      statusCode: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': getAllowedOrigin(event.headers?.origin),
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      },
      body: JSON.stringify({
        errors: [
          {
            message: sanitized.message,
            extensions: {
              code: (sanitized as any).code || 'INTERNAL_ERROR',
            },
          },
        ],
      }),
    };
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  const required = [
    'GAMES_TABLE_NAME',
    'RATE_LIMITS_TABLE_NAME',
    'ACHIEVEMENTS_TABLE_NAME',
    'THEMES_TABLE_NAME',
    'SUBSCRIPTIONS_TABLE_NAME',
    'EVENT_BUS_NAME',
    'AWS_REGION',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
