import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { resolvers } from './handlers/auth.handler';
import { logger } from './utils/logger';

// GraphQL operation types
interface GraphQLRequest {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

// Parse GraphQL query to extract operation
function parseOperation(query: string): { type: 'query' | 'mutation'; name: string } {
  const queryMatch = query.match(/query\s+(\w+)/);
  const mutationMatch = query.match(/mutation\s+(\w+)/);

  if (queryMatch) {
    return { type: 'query', name: queryMatch[1] || 'unknown' };
  }

  if (mutationMatch) {
    return { type: 'mutation', name: mutationMatch[1] || 'unknown' };
  }

  // Try to extract operation name from the query itself
  const operationMatch = query.match(/{\s*(\w+)/);
  if (operationMatch) {
    return { type: 'query', name: operationMatch[1] || 'unknown' };
  }

  return { type: 'query', name: 'unknown' };
}

// Execute GraphQL operation
async function executeGraphQL(
  request: GraphQLRequest,
  context: { headers?: Record<string, string | undefined> },
): Promise<unknown> {
  const operation = parseOperation(request.query);
  const resolverType = operation.type === 'query' ? resolvers.Query : resolvers.Mutation;
  const resolver = resolverType[operation.name as keyof typeof resolverType] as any;

  if (!resolver) {
    throw new Error(`Unknown operation: ${operation.name}`);
  }

  // Execute resolver
  return await resolver({}, request.variables || {}, context);
}

// Lambda handler
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  // Set correlation ID
  logger.setContext({
    correlationId: event.requestContext.requestId,
  });

  logger.info('Received request', {
    path: event.path,
    method: event.httpMethod,
    requestId: event.requestContext.requestId,
  });

  try {
    // Validate environment variables
    if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) {
      throw new Error('Missing required environment variables');
    }

    if (!process.env.DYNAMODB_USERS_TABLE || !process.env.DYNAMODB_USER_SETTINGS_TABLE) {
      throw new Error('Missing required DynamoDB table names');
    }

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          errors: [{ message: 'Request body is required' }],
        }),
      };
    }

    const request: GraphQLRequest = JSON.parse(event.body);

    // Execute GraphQL operation
    const result = await executeGraphQL(request, {
      headers: event.headers,
    });

    logger.info('Request completed successfully');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        data: result,
      }),
    };
  } catch (error) {
    logger.error('Request failed', error as Error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return {
      statusCode: 200, // GraphQL returns 200 even for errors
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        errors: [{ message: errorMessage }],
      }),
    };
  } finally {
    logger.clearContext();
  }
};
