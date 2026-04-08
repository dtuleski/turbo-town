import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { mockClient } from 'aws-sdk-client-mock';
import { EventPublisherService } from '../../../src/services/event-publisher.service';
import { GameCompletedEvent } from '../../../src/types';
import { logger } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const eventBridgeMock = mockClient(EventBridgeClient);

describe('EventPublisherService', () => {
  let service: EventPublisherService;

  beforeEach(() => {
    service = new EventPublisherService();
    eventBridgeMock.reset();
    jest.clearAllMocks();
    process.env.EVENT_BUS_NAME = 'test-event-bus';
  });

  afterEach(() => {
    delete process.env.EVENT_BUS_NAME;
  });

  describe('publishGameCompleted', () => {
    const mockEvent: GameCompletedEvent = {
      gameId: 'game-123',
      userId: 'user-456',
      userName: 'testuser',
      themeId: 'theme-789',
      difficulty: 3,
      score: 850,
      completionTime: 45,
      attempts: 12,
      completedAt: new Date('2024-03-01T12:00:00Z'),
    };

    it('should successfully publish GameCompleted event', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'event-123' }],
      });

      await service.publishGameCompleted(mockEvent);

      expect(eventBridgeMock.calls()).toHaveLength(1);
      const call = eventBridgeMock.call(0);
      expect(call.args[0].input).toEqual({
        Entries: [
          {
            Source: 'game-service',
            DetailType: 'GameCompleted',
            Detail: JSON.stringify(mockEvent),
            EventBusName: 'test-event-bus',
          },
        ],
      });

      expect(logger.info).toHaveBeenCalledWith('GameCompleted event published', {
        gameId: mockEvent.gameId,
        userId: mockEvent.userId,
        score: mockEvent.score,
      });
    });

    it('should use correct event bus name from environment', async () => {
      process.env.EVENT_BUS_NAME = 'custom-event-bus';
      const customService = new EventPublisherService();

      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'event-123' }],
      });

      await customService.publishGameCompleted(mockEvent);

      const call = eventBridgeMock.call(0);
      expect(call.args[0].input.Entries[0].EventBusName).toBe('custom-event-bus');
    });

    it('should include all event fields in Detail', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'event-123' }],
      });

      await service.publishGameCompleted(mockEvent);

      const call = eventBridgeMock.call(0);
      const detail = JSON.parse(call.args[0].input.Entries[0].Detail);

      expect(detail).toEqual({
        gameId: 'game-123',
        userId: 'user-456',
        userName: 'testuser',
        themeId: 'theme-789',
        difficulty: 3,
        score: 850,
        completionTime: 45,
        attempts: 12,
        completedAt: '2024-03-01T12:00:00.000Z',
      });
    });

    it('should log error but not throw when EventBridge fails', async () => {
      const error = new Error('EventBridge service unavailable');
      eventBridgeMock.on(PutEventsCommand).rejects(error);

      // Should not throw
      await expect(service.publishGameCompleted(mockEvent)).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to publish GameCompleted event',
        error,
        {
          gameId: mockEvent.gameId,
          userId: mockEvent.userId,
        }
      );
    });

    it('should handle network timeout gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      eventBridgeMock.on(PutEventsCommand).rejects(timeoutError);

      await expect(service.publishGameCompleted(mockEvent)).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to publish GameCompleted event',
        timeoutError,
        expect.any(Object)
      );
    });

    it('should handle throttling errors gracefully', async () => {
      const throttleError = new Error('Rate exceeded');
      throttleError.name = 'ThrottlingException';
      eventBridgeMock.on(PutEventsCommand).rejects(throttleError);

      await expect(service.publishGameCompleted(mockEvent)).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalled();
    });

    it('should serialize Date objects correctly', async () => {
      const eventWithDate: GameCompletedEvent = {
        ...mockEvent,
        completedAt: new Date('2024-03-15T10:30:00Z'),
      };

      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'event-123' }],
      });

      await service.publishGameCompleted(eventWithDate);

      const call = eventBridgeMock.call(0);
      const detail = JSON.parse(call.args[0].input.Entries[0].Detail);

      expect(detail.completedAt).toBe('2024-03-15T10:30:00.000Z');
    });

    it('should handle events with different difficulty levels', async () => {
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'event-123' }],
      });

      const difficulties = [1, 2, 3, 4, 5];

      for (const difficulty of difficulties) {
        const event = { ...mockEvent, difficulty };
        await service.publishGameCompleted(event);
      }

      expect(eventBridgeMock.calls()).toHaveLength(5);
    });

    it('should handle events with zero score', async () => {
      const zeroScoreEvent: GameCompletedEvent = {
        ...mockEvent,
        score: 0,
      };

      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'event-123' }],
      });

      await service.publishGameCompleted(zeroScoreEvent);

      const call = eventBridgeMock.call(0);
      const detail = JSON.parse(call.args[0].input.Entries[0].Detail);
      expect(detail.score).toBe(0);
    });

    it('should handle events with maximum values', async () => {
      const maxEvent: GameCompletedEvent = {
        ...mockEvent,
        score: 10000,
        completionTime: 3600,
        attempts: 100,
      };

      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'event-123' }],
      });

      await service.publishGameCompleted(maxEvent);

      const call = eventBridgeMock.call(0);
      const detail = JSON.parse(call.args[0].input.Entries[0].Detail);
      expect(detail.score).toBe(10000);
      expect(detail.completionTime).toBe(3600);
      expect(detail.attempts).toBe(100);
    });
  });
});
