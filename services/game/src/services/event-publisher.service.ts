import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { GameCompletedEvent } from '../types';
import { logger } from '../utils/logger';
import { mapEventBridgeError } from '../utils/error-mapper';

const eventBridge = new EventBridgeClient({});
const lambdaClient = new LambdaClient({});
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;
const LEADERBOARD_FUNCTION_NAME = process.env.LEADERBOARD_FUNCTION_NAME || 'MemoryGame-LeaderboardService-prod';

/**
 * Event Publisher Service
 * Publishes events to EventBridge for async processing
 * Also directly invokes the leaderboard Lambda as a reliable delivery mechanism
 */

export class EventPublisherService {
  /**
   * Publish GameCompleted event
   * Publishes to EventBridge AND directly invokes leaderboard Lambda
   */
  async publishGameCompleted(event: GameCompletedEvent): Promise<void> {
    // Publish to EventBridge (for logging/archival)
    try {
      await eventBridge.send(
        new PutEventsCommand({
          Entries: [
            {
              Source: 'game-service',
              DetailType: 'GameCompleted',
              Detail: JSON.stringify(event),
              EventBusName: EVENT_BUS_NAME,
            },
          ],
        })
      );

      logger.info('GameCompleted event published', {
        gameId: event.gameId,
        userId: event.userId,
        gameType: event.gameType,
      });
    } catch (error) {
      logger.error('Failed to publish GameCompleted event to EventBridge', error as Error, {
        gameId: event.gameId,
        userId: event.userId,
      });
    }

    // Directly invoke leaderboard Lambda (reliable delivery)
    try {
      const payload = {
        source: 'game-service',
        'detail-type': 'GameCompleted',
        detail: event,
      };

      await lambdaClient.send(new InvokeCommand({
        FunctionName: LEADERBOARD_FUNCTION_NAME,
        InvocationType: 'Event', // Async invocation
        Payload: Buffer.from(JSON.stringify(payload)),
      }));

      logger.info('Leaderboard Lambda invoked directly', {
        gameId: event.gameId,
        userId: event.userId,
      });
    } catch (error) {
      logger.error('Failed to invoke leaderboard Lambda directly', error as Error, {
        gameId: event.gameId,
        userId: event.userId,
      });
    }
  }
}
