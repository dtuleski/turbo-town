import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { GameService } from '../../src/services/game.service';
import { GameRepository } from '../../src/repositories/game.repository';
import { ThemeRepository } from '../../src/repositories/theme.repository';
import { SubscriptionRepository } from '../../src/repositories/subscription.repository';
import { ScoreCalculatorService } from '../../src/services/score-calculator.service';
import { RateLimiterService } from '../../src/services/rate-limiter.service';
import { AchievementTrackerService } from '../../src/services/achievement-tracker.service';
import { EventPublisherService } from '../../src/services/event-publisher.service';
import { GameStatus, SubscriptionTier } from '@memory-game/shared';

const eventBridgeMock = mockClient(EventBridgeClient);
const dynamoMock = mockClient(DynamoDBDocumentClient);

describe('Event Flow Integration Tests', () => {
  let gameService: GameService;
  let gameRepository: GameRepository;
  let themeRepository: ThemeRepository;
  let subscriptionRepository: SubscriptionRepository;
  let scoreCalculator: ScoreCalculatorService;
  let rateLimiter: RateLimiterService;
  let achievementTracker: AchievementTrackerService;
  let eventPublisher: EventPublisherService;

  beforeEach(() => {
    eventBridgeMock.reset();
    dynamoMock.reset();
    jest.clearAllMocks();

    process.env.EVENT_BUS_NAME = 'test-event-bus';
    process.env.GAMES_TABLE_NAME = 'Games-test';
    process.env.THEMES_TABLE_NAME = 'Themes-test';
    process.env.SUBSCRIPTIONS_TABLE_NAME = 'Subscriptions-test';
    process.env.ACHIEVEMENTS_TABLE_NAME = 'Achievements-test';
    process.env.RATE_LIMITS_TABLE_NAME = 'RateLimits-test';

    // Initialize services
    gameRepository = new GameRepository();
    themeRepository = new ThemeRepository();
    subscriptionRepository = new SubscriptionRepository();
    scoreCalculator = new ScoreCalculatorService();
    rateLimiter = new RateLimiterService();
    achievementTracker = new AchievementTrackerService();
    eventPublisher = new EventPublisherService();

    gameService = new GameService(
      gameRepository,
      themeRepository,
      subscriptionRepository,
      scoreCalculator,
      rateLimiter,
      achievementTracker,
      eventPublisher
    );
  });

  afterEach(() => {
    delete process.env.EVENT_BUS_NAME;
    delete process.env.GAMES_TABLE_NAME;
    delete process.env.THEMES_TABLE_NAME;
    delete process.env.SUBSCRIPTIONS_TABLE_NAME;
    delete process.env.ACHIEVEMENTS_TABLE_NAME;
    delete process.env.RATE_LIMITS_TABLE_NAME;
  });

  describe('End-to-End Game Completion with Event Publishing', () => {
    it('should complete game and publish event successfully', async () => {
      const userId = 'user-123';
      const gameId = 'game-456';
      const themeId = 'theme-789';

      // Mock game retrieval
      dynamoMock.on(GetCommand).resolves({
        Item: {
          id: gameId,
          userId,
          themeId,
          difficulty: 3,
          status: GameStatus.InProgress,
          startedAt: new Date('2024-03-01T12:00:00Z').toISOString(),
          attempts: 0,
          score: 0,
        },
      });

      // Mock game update
      dynamoMock.on(UpdateCommand).resolves({
        Attributes: {
          id: gameId,
          userId,
          themeId,
          difficulty: 3,
          status: GameStatus.Completed,
          startedAt: new Date('2024-03-01T12:00:00Z').toISOString(),
          completedAt: new Date('2024-03-01T12:01:00Z').toISOString(),
          completionTime: 60,
          attempts: 15,
          score: 750,
        },
      });

      // Mock subscription tier
      dynamoMock.on(GetCommand, {
        TableName: 'Subscriptions-test',
      }).resolves({
        Item: {
          userId,
          tier: SubscriptionTier.Standard,
          status: 'ACTIVE',
        },
      });

      // Mock achievements query
      dynamoMock.on(GetCommand, {
        TableName: 'Achievements-test',
      }).resolves({
        Item: null,
      });

      // Mock EventBridge
      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'event-123' }],
      });

      // Complete game
      const result = await gameService.completeGame(userId, {
        gameId,
        completionTime: 60,
        attempts: 15,
      });

      // Verify game completion
      expect(result.game.status).toBe(GameStatus.Completed);
      expect(result.game.score).toBeGreaterThan(0);

      // Verify event was published
      expect(eventBridgeMock.calls()).toHaveLength(1);
      const eventCall = eventBridgeMock.call(0);
      const eventDetail = JSON.parse(eventCall.args[0].input.Entries[0].Detail);

      expect(eventDetail).toMatchObject({
        gameId,
        userId,
        themeId,
        difficulty: 3,
        completionTime: 60,
        attempts: 15,
      });
      expect(eventDetail.score).toBeGreaterThan(0);
      expect(eventDetail.completedAt).toBeDefined();
    });

    it('should complete game even if event publishing fails', async () => {
      const userId = 'user-123';
      const gameId = 'game-456';

      // Mock game retrieval
      dynamoMock.on(GetCommand).resolves({
        Item: {
          id: gameId,
          userId,
          themeId: 'theme-789',
          difficulty: 2,
          status: GameStatus.InProgress,
          startedAt: new Date('2024-03-01T12:00:00Z').toISOString(),
        },
      });

      // Mock game update
      dynamoMock.on(UpdateCommand).resolves({
        Attributes: {
          id: gameId,
          userId,
          themeId: 'theme-789',
          difficulty: 2,
          status: GameStatus.Completed,
          completionTime: 45,
          attempts: 10,
          score: 800,
        },
      });

      // Mock subscription
      dynamoMock.on(GetCommand, {
        TableName: 'Subscriptions-test',
      }).resolves({
        Item: {
          userId,
          tier: SubscriptionTier.Free,
          status: 'ACTIVE',
        },
      });

      // Mock achievements
      dynamoMock.on(GetCommand, {
        TableName: 'Achievements-test',
      }).resolves({
        Item: null,
      });

      // Mock EventBridge failure
      eventBridgeMock.on(PutEventsCommand).rejects(new Error('EventBridge unavailable'));

      // Complete game - should succeed despite event failure
      const result = await gameService.completeGame(userId, {
        gameId,
        completionTime: 45,
        attempts: 10,
      });

      expect(result.game.status).toBe(GameStatus.Completed);
      expect(result.game.score).toBeGreaterThan(0);
    });

    it('should publish events for different game types', async () => {
      const userId = 'user-123';
      const gameTypes = [
        { themeId: 'memory-match-1', difficulty: 1 },
        { themeId: 'math-challenge-1', difficulty: 3 },
        { themeId: 'word-puzzle-1', difficulty: 5 },
        { themeId: 'language-learning-1', difficulty: 2 },
      ];

      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'event-123' }],
      });

      for (const gameType of gameTypes) {
        const gameId = `game-${gameType.themeId}`;

        // Mock game retrieval
        dynamoMock.on(GetCommand).resolves({
          Item: {
            id: gameId,
            userId,
            themeId: gameType.themeId,
            difficulty: gameType.difficulty,
            status: GameStatus.InProgress,
            startedAt: new Date().toISOString(),
          },
        });

        // Mock game update
        dynamoMock.on(UpdateCommand).resolves({
          Attributes: {
            id: gameId,
            userId,
            themeId: gameType.themeId,
            difficulty: gameType.difficulty,
            status: GameStatus.Completed,
            completionTime: 60,
            attempts: 12,
            score: 700,
          },
        });

        // Mock subscription
        dynamoMock.on(GetCommand, {
          TableName: 'Subscriptions-test',
        }).resolves({
          Item: {
            userId,
            tier: SubscriptionTier.Premium,
            status: 'ACTIVE',
          },
        });

        // Mock achievements
        dynamoMock.on(GetCommand, {
          TableName: 'Achievements-test',
        }).resolves({
          Item: null,
        });

        await gameService.completeGame(userId, {
          gameId,
          completionTime: 60,
          attempts: 12,
        });
      }

      // Verify events were published for all game types
      expect(eventBridgeMock.calls().length).toBeGreaterThanOrEqual(gameTypes.length);
    });

    it('should include correct event metadata', async () => {
      const userId = 'user-123';
      const gameId = 'game-456';

      dynamoMock.on(GetCommand).resolves({
        Item: {
          id: gameId,
          userId,
          themeId: 'theme-789',
          difficulty: 4,
          status: GameStatus.InProgress,
          startedAt: new Date('2024-03-01T12:00:00Z').toISOString(),
        },
      });

      dynamoMock.on(UpdateCommand).resolves({
        Attributes: {
          id: gameId,
          userId,
          themeId: 'theme-789',
          difficulty: 4,
          status: GameStatus.Completed,
          completionTime: 90,
          attempts: 20,
          score: 650,
        },
      });

      dynamoMock.on(GetCommand, {
        TableName: 'Subscriptions-test',
      }).resolves({
        Item: {
          userId,
          tier: SubscriptionTier.Light,
          status: 'ACTIVE',
        },
      });

      dynamoMock.on(GetCommand, {
        TableName: 'Achievements-test',
      }).resolves({
        Item: null,
      });

      eventBridgeMock.on(PutEventsCommand).resolves({
        FailedEntryCount: 0,
        Entries: [{ EventId: 'event-123' }],
      });

      await gameService.completeGame(userId, {
        gameId,
        completionTime: 90,
        attempts: 20,
      });

      const eventCall = eventBridgeMock.call(0);
      const entry = eventCall.args[0].input.Entries[0];

      expect(entry.Source).toBe('game-service');
      expect(entry.DetailType).toBe('GameCompleted');
      expect(entry.EventBusName).toBe('test-event-bus');
      expect(entry.Detail).toBeDefined();
    });
  });

  describe('Event Publishing Error Scenarios', () => {
    it('should handle EventBridge throttling', async () => {
      const userId = 'user-123';
      const gameId = 'game-456';

      dynamoMock.on(GetCommand).resolves({
        Item: {
          id: gameId,
          userId,
          themeId: 'theme-789',
          difficulty: 3,
          status: GameStatus.InProgress,
          startedAt: new Date().toISOString(),
        },
      });

      dynamoMock.on(UpdateCommand).resolves({
        Attributes: {
          id: gameId,
          userId,
          status: GameStatus.Completed,
          score: 750,
        },
      });

      dynamoMock.on(GetCommand, {
        TableName: 'Subscriptions-test',
      }).resolves({
        Item: { userId, tier: SubscriptionTier.Free, status: 'ACTIVE' },
      });

      dynamoMock.on(GetCommand, {
        TableName: 'Achievements-test',
      }).resolves({ Item: null });

      const throttleError = new Error('Rate exceeded');
      throttleError.name = 'ThrottlingException';
      eventBridgeMock.on(PutEventsCommand).rejects(throttleError);

      // Should not throw
      await expect(
        gameService.completeGame(userId, {
          gameId,
          completionTime: 60,
          attempts: 15,
        })
      ).resolves.toBeDefined();
    });

    it('should handle network timeouts', async () => {
      const userId = 'user-123';
      const gameId = 'game-456';

      dynamoMock.on(GetCommand).resolves({
        Item: {
          id: gameId,
          userId,
          themeId: 'theme-789',
          difficulty: 3,
          status: GameStatus.InProgress,
          startedAt: new Date().toISOString(),
        },
      });

      dynamoMock.on(UpdateCommand).resolves({
        Attributes: {
          id: gameId,
          userId,
          status: GameStatus.Completed,
          score: 750,
        },
      });

      dynamoMock.on(GetCommand, {
        TableName: 'Subscriptions-test',
      }).resolves({
        Item: { userId, tier: SubscriptionTier.Free, status: 'ACTIVE' },
      });

      dynamoMock.on(GetCommand, {
        TableName: 'Achievements-test',
      }).resolves({ Item: null });

      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      eventBridgeMock.on(PutEventsCommand).rejects(timeoutError);

      await expect(
        gameService.completeGame(userId, {
          gameId,
          completionTime: 60,
          attempts: 15,
        })
      ).resolves.toBeDefined();
    });
  });
});
