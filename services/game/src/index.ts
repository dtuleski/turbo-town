import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { GameHandler } from './handlers/game.handler';
import { logger } from './utils/logger';
import { sanitizeError } from './utils/error-mapper';

// Initialize handler (singleton pattern for Lambda container reuse)
const gameHandler = new GameHandler();

/**
 * Lambda handler for Game Service GraphQL API
 * Handles game lifecycle, rate limiting, achievements, and statistics
 */
export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  // Set correlation ID for request tracing
  const correlationId = event.requestContext.requestId;
  logger.setContext({ correlationId, functionName: context.functionName });

  try {
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

    // Extract user ID from JWT token (set by API Gateway authorizer)
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      throw new Error('Unauthorized: Missing user ID');
    }

    // Route to appropriate resolver
    const result = await gameHandler.handleRequest({
      query,
      variables,
      operationName,
      userId,
    });

    logger.info('GraphQL request completed', {
      operationName,
      success: !result.errors,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
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
