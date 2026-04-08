"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPublisherService = void 0;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
const logger_1 = require("../utils/logger");
const eventBridge = new client_eventbridge_1.EventBridgeClient({});
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME;
/**
 * Event Publisher Service
 * Publishes events to EventBridge for async processing
 */
class EventPublisherService {
    /**
     * Publish GameCompleted event
     * Fire-and-forget - doesn't block response
     */
    async publishGameCompleted(event) {
        try {
            await eventBridge.send(new client_eventbridge_1.PutEventsCommand({
                Entries: [
                    {
                        Source: 'game-service',
                        DetailType: 'GameCompleted',
                        Detail: JSON.stringify(event),
                        EventBusName: EVENT_BUS_NAME,
                    },
                ],
            }));
            logger_1.logger.info('GameCompleted event published', {
                gameId: event.gameId,
                userId: event.userId,
                gameType: event.gameType,
            });
        }
        catch (error) {
            // Log error but don't throw - event publishing is non-critical
            logger_1.logger.error('Failed to publish GameCompleted event', error, {
                gameId: event.gameId,
                userId: event.userId,
            });
        }
    }
}
exports.EventPublisherService = EventPublisherService;
//# sourceMappingURL=event-publisher.service.js.map