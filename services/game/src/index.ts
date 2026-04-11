import { GameHandler } from './handlers/game.handler';
import { StripeService } from './services/stripe.service';
import { logger } from './utils/logger';
import { sanitizeError } from './utils/error-mapper';

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
    
    if (!userId) {
      throw new Error('Unauthorized: Missing user ID');
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
