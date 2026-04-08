/**
 * Leaderboard Service Lambda Handler
 *
 * This Lambda function handles:
 * - EventBridge GameCompleted events for score calculation
 * - GraphQL queries for leaderboard data (via API Gateway HTTP)
 */
import { Handler } from 'aws-lambda';
export * from './types';
export { ScoringService } from './services/scoring.service';
export { LeaderboardService } from './services/leaderboard.service';
export { LeaderboardRepository, AggregateRepository } from './repositories';
/**
 * Main Lambda handler
 * Routes events to appropriate handlers based on event source
 */
export declare const handler: Handler;
//# sourceMappingURL=index.d.ts.map