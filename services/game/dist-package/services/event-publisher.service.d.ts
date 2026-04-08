import { GameCompletedEvent } from '../types';
/**
 * Event Publisher Service
 * Publishes events to EventBridge for async processing
 */
export declare class EventPublisherService {
    /**
     * Publish GameCompleted event
     * Fire-and-forget - doesn't block response
     */
    publishGameCompleted(event: GameCompletedEvent): Promise<void>;
}
//# sourceMappingURL=event-publisher.service.d.ts.map