import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { GameCompletedEvent } from '../types';
import { logger } from '../utils/logger';
import { mapEventBridgeError } from '../utils/error-mapper';

const eventBridge = new EventBridgeClient({});
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME!;

/**
 * Event Publisher Service
 * Publishes events to EventBridge for async processing
 */

export class EventPublisherService {
  /**
   * Publish GameCompleted event
   * Fire-and-forget - doesn't block response
   */
  async publishGameCompleted(event: GameCompletedEvent): Promise<void> {
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
        score: event.score,
      });
    } catch (error) {
      // Log error but don't throw - event publishing is non-critical
      logger.error('Failed to publish GameCompleted event', error as Error, {
        gameId: event.gameId,
        userId: event.userId,
      });
    }
  }
}
