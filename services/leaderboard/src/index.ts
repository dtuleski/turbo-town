/**
 * Leaderboard Service Lambda Handler
 * 
 * This Lambda function handles:
 * - EventBridge GameCompleted events for score calculation
 * - GraphQL queries for leaderboard data (via API Gateway HTTP)
 */

import { Handler } from 'aws-lambda';
import { handler as eventHandler } from './handlers/event.handler';
import { handler as graphqlHandler } from './handlers/graphql.handler';

// Export all types
export * from './types';

// Export all services
export { ScoringService } from './services/scoring.service';
export { LeaderboardService } from './services/leaderboard.service';

// Export all repositories
export { LeaderboardRepository, AggregateRepository } from './repositories';

/**
 * Main Lambda handler
 * Routes events to appropriate handlers based on event source
 */
export const handler: Handler = async (event, context) => {
  console.log('Leaderboard Service invoked', {
    eventSource: event.source || event.requestContext?.http?.method || 'unknown',
    requestId: context.awsRequestId,
    event: JSON.stringify(event),
  });

  try {
    // EventBridge event (GameCompleted)
    if (event.source === 'game-service' && event['detail-type'] === 'GameCompleted') {
      return await eventHandler(event);
    }

    // API Gateway HTTP event (GraphQL from frontend)
    if (event.requestContext && event.requestContext.http) {
      return await handleHttpGraphQLRequest(event);
    }

    // AppSync event (direct GraphQL)
    if (event.info && event.info.fieldName) {
      return await graphqlHandler(event);
    }

    // Unknown event type
    console.warn('Unknown event type', { event });
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Unknown event type' }),
    };
  } catch (error) {
    console.error('Error processing event', { error, event });
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
    };
  }
};

/**
 * Handle HTTP GraphQL requests from API Gateway
 */
async function handleHttpGraphQLRequest(event: any) {
  try {
    // Parse GraphQL request body
    const body = JSON.parse(event.body || '{}');
    const { query, variables } = body;

    console.log('Processing HTTP GraphQL request', { 
      query: query?.substring(0, 200), 
      variables 
    });

    // Extract query/mutation name from GraphQL query string
    // Matches: query GetLeaderboard(...) or query { getLeaderboard or mutation ClearAllRecords
    const operationMatch = query?.match(/(query|mutation)\s+(\w+)|(query|mutation)\s*{\s*(\w+)/);
    const operationType = operationMatch ? (operationMatch[1] || operationMatch[3]) : null;
    const fieldName = operationMatch ? (operationMatch[2] || operationMatch[4]) : null;

    if (!fieldName || !operationType) {
      console.error('Failed to extract field name from query:', query);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          errors: [{ message: 'Invalid GraphQL query - could not extract field name' }] 
        }),
      };
    }

    // Convert field name to camelCase (GetLeaderboard -> getLeaderboard, ClearAllRecords -> clearAllRecords)
    const resolverName = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);

    console.log('Extracted resolver name:', resolverName, 'operation type:', operationType);

    // Convert HTTP event to AppSync-like event
    const appSyncEvent = {
      info: {
        fieldName: resolverName,
        parentTypeName: operationType === 'mutation' ? 'Mutation' : 'Query',
      },
      arguments: variables || {},
      request: {
        headers: event.headers || {},
      },
      identity: event.requestContext?.authorizer?.jwt?.claims ? {
        sub: event.requestContext.authorizer.jwt.claims.sub,
        username: event.requestContext.authorizer.jwt.claims['cognito:username'],
      } : undefined,
    };

    console.log('Calling GraphQL handler with:', {
      fieldName: resolverName,
      arguments: variables,
    });

    // Call GraphQL handler
    const result = await graphqlHandler(appSyncEvent);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { [resolverName]: result } }),
    };
  } catch (error) {
    console.error('Error handling HTTP GraphQL request', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        errors: [{ 
          message: error instanceof Error ? error.message : 'Internal server error' 
        }] 
      }),
    };
  }
}
