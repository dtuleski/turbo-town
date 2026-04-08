"use strict";
/**
 * Leaderboard Service Lambda Handler
 *
 * This Lambda function handles:
 * - EventBridge GameCompleted events for score calculation
 * - GraphQL queries for leaderboard data (via API Gateway HTTP)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.AggregateRepository = exports.LeaderboardRepository = exports.LeaderboardService = exports.ScoringService = void 0;
const event_handler_1 = require("./handlers/event.handler");
const graphql_handler_1 = require("./handlers/graphql.handler");
// Export all types
__exportStar(require("./types"), exports);
// Export all services
var scoring_service_1 = require("./services/scoring.service");
Object.defineProperty(exports, "ScoringService", { enumerable: true, get: function () { return scoring_service_1.ScoringService; } });
var leaderboard_service_1 = require("./services/leaderboard.service");
Object.defineProperty(exports, "LeaderboardService", { enumerable: true, get: function () { return leaderboard_service_1.LeaderboardService; } });
// Export all repositories
var repositories_1 = require("./repositories");
Object.defineProperty(exports, "LeaderboardRepository", { enumerable: true, get: function () { return repositories_1.LeaderboardRepository; } });
Object.defineProperty(exports, "AggregateRepository", { enumerable: true, get: function () { return repositories_1.AggregateRepository; } });
/**
 * Main Lambda handler
 * Routes events to appropriate handlers based on event source
 */
const handler = async (event, context) => {
    console.log('Leaderboard Service invoked', {
        eventSource: event.source || event.requestContext?.http?.method || 'unknown',
        requestId: context.awsRequestId,
        event: JSON.stringify(event),
    });
    try {
        // EventBridge event (GameCompleted)
        if (event.source === 'game-service' && event['detail-type'] === 'GameCompleted') {
            return await (0, event_handler_1.handler)(event);
        }
        // API Gateway HTTP event (GraphQL from frontend)
        if (event.requestContext && event.requestContext.http) {
            return await handleHttpGraphQLRequest(event);
        }
        // AppSync event (direct GraphQL)
        if (event.info && event.info.fieldName) {
            return await (0, graphql_handler_1.handler)(event);
        }
        // Unknown event type
        console.warn('Unknown event type', { event });
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Unknown event type' }),
        };
    }
    catch (error) {
        console.error('Error processing event', { error, event });
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error instanceof Error ? error.message : 'Internal server error'
            }),
        };
    }
};
exports.handler = handler;
/**
 * Handle HTTP GraphQL requests from API Gateway
 */
async function handleHttpGraphQLRequest(event) {
    try {
        // Parse GraphQL request body
        const body = JSON.parse(event.body || '{}');
        const { query, variables } = body;
        console.log('Processing HTTP GraphQL request', {
            query: query?.substring(0, 200),
            variables
        });
        // Extract query name from GraphQL query string
        // Matches: query GetLeaderboard(...) or query { getLeaderboard
        const queryMatch = query?.match(/query\s+(\w+)|query\s*{\s*(\w+)/);
        const fieldName = queryMatch ? (queryMatch[1] || queryMatch[2]) : null;
        if (!fieldName) {
            console.error('Failed to extract field name from query:', query);
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    errors: [{ message: 'Invalid GraphQL query - could not extract field name' }]
                }),
            };
        }
        // Convert field name to camelCase (GetLeaderboard -> getLeaderboard)
        const resolverName = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
        console.log('Extracted resolver name:', resolverName);
        // Convert HTTP event to AppSync-like event
        const appSyncEvent = {
            info: {
                fieldName: resolverName,
                parentTypeName: 'Query',
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
        const result = await (0, graphql_handler_1.handler)(appSyncEvent);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { [resolverName]: result } }),
        };
    }
    catch (error) {
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
//# sourceMappingURL=index.js.map