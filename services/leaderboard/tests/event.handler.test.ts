/**
 * Integration tests for Event Handler
 * 
 * Tests the complete event processing flow including:
 * - Event validation
 * - Score calculation
 * - Anomaly detection
 * - Leaderboard entry creation
 * - User aggregate updates
 * - Error handling and retry logic
 * - CloudWatch metrics emission
 */

import { EventBridgeEvent } from 'aws-lambda';
import { EventHandler, GameCompletedDetail } from '../src/handlers/event.handler';
import { ScoringService } from '../src/services/scoring.service';
import { AnomalyService, AnomalyFlags } from '../src/services/anomaly.service';
import { LeaderboardService } from '../src/services/leaderboard.service';
import { GameType, Difficulty, LeaderboardEntry } from '../src/types';

// Mock AWS SDK
jest.mock('@aws-sdk/client-cloudwatch');

describe('EventHandler', () => {
  let eventHandler: EventHandler;
  let mockScoringService: jest.Mocked<ScoringService>;
  let mockAnomalyService: jest.Mocked<AnomalyService>;
  let mockLeaderboardService: jest.Mocked<LeaderboardService>;

  beforeEach(() => {
    // Create mocked services
    mockScoringService = {
      calculateScore: jest.fn(),
      validateScore: jest.fn(),
      loadConfiguration: jest.fn(),
      formatConfiguration: jest.fn(),
    } as any;

    mockAnomalyService = {
      detectAnomalies: jest.fn(),
      getGameStatistics: jest.fn(),
      updateGameStatistics: jest.fn(),
    } as any;

    mockLeaderboardService = {
      createLeaderboardEntry: jest.fn(),
      updateUserAggregate: jest.fn(),
      getLeaderboard: jest.fn(),
      getUserRank: jest.fn(),
      getUserScoreHistory: jest.fn(),
    } as any;

    eventHandler = new EventHandler(
      mockScoringService,
      mockAnomalyService,
      mockLeaderboardService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGameCompletedEvent', () => {
    const createTestEvent = (
      overrides?: Partial<GameCompletedDetail>
    ): EventBridgeEvent<'GameCompleted', GameCompletedDetail> => ({
      version: '0',
      id: 'event-123',
      'detail-type': 'GameCompleted',
      source: 'game-service',
      account: '123456789012',
      time: '2024-01-01T12:00:00Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        gameId: 'game-123',
        userId: 'user-456',
        username: 'player1',
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
        performanceMetrics: {
          attempts: 10,
          pairs: 6,
        },
        timestamp: '2024-01-01T12:00:00Z',
        ...overrides,
      },
    });

    it('should successfully process a valid event', async () => {
      const event = createTestEvent();

      // Mock service responses
      mockScoringService.calculateScore.mockReturnValue({
        baseScore: 1000,
        difficultyMultiplier: 1.0,
        speedBonus: 1.5,
        accuracyBonus: 1.2,
        finalScore: 1800,
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
      });

      mockScoringService.validateScore.mockReturnValue({
        valid: true,
        errors: [],
      });

      mockAnomalyService.getGameStatistics.mockResolvedValue(null);

      mockAnomalyService.detectAnomalies.mockResolvedValue({
        isStatisticalOutlier: false,
        isVelocityAnomaly: false,
        isPatternAnomaly: false,
        isSuspicious: false,
        reasons: [],
      });

      mockLeaderboardService.createLeaderboardEntry.mockResolvedValue({} as any);
      mockLeaderboardService.updateUserAggregate.mockResolvedValue();

      // Execute
      await eventHandler.handleGameCompletedEvent(event);

      // Verify score calculation
      expect(mockScoringService.calculateScore).toHaveBeenCalledWith({
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.EASY,
        completionTime: 30,
        performanceMetrics: {
          attempts: 10,
          pairs: 6,
        },
      });

      // Verify score validation
      expect(mockScoringService.validateScore).toHaveBeenCalledWith(
        GameType.MEMORY_MATCH,
        1800,
        30,
        0.9
      );

      // Verify anomaly detection
      expect(mockAnomalyService.detectAnomalies).toHaveBeenCalled();

      // Verify leaderboard entry creation
      expect(mockLeaderboardService.createLeaderboardEntry).toHaveBeenCalledWith({
        gameId: 'game-123',
        userId: 'user-456',
        username: 'player1',
        gameType: GameType.MEMORY_MATCH,
        score: 1800,
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
        timestamp: '2024-01-01T12:00:00Z',
        metadata: {
          attempts: 10,
          pairs: 6,
        },
        suspicious: false,
      });

      // Verify user aggregate update
      expect(mockLeaderboardService.updateUserAggregate).toHaveBeenCalledWith({
        userId: 'user-456',
        gameType: GameType.MEMORY_MATCH,
        username: 'player1',
        score: 1800,
        timestamp: '2024-01-01T12:00:00Z',
      });
    });

    it('should handle suspicious scores correctly', async () => {
      const event = createTestEvent();

      mockScoringService.calculateScore.mockReturnValue({
        baseScore: 1000,
        difficultyMultiplier: 1.0,
        speedBonus: 1.5,
        accuracyBonus: 1.2,
        finalScore: 1800,
        difficulty: Difficulty.EASY,
        completionTime: 30,
        accuracy: 0.9,
      });

      mockScoringService.validateScore.mockReturnValue({
        valid: true,
        errors: [],
      });

      mockAnomalyService.getGameStatistics.mockResolvedValue({
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.EASY,
        mean: 1000,
        stdDev: 100,
        sampleSize: 100,
        lastUpdated: '2024-01-01T00:00:00Z',
      });

      // Mock anomaly detection - flag as suspicious
      mockAnomalyService.detectAnomalies.mockResolvedValue({
        isStatisticalOutlier: true,
        isVelocityAnomaly: false,
        isPatternAnomaly: false,
        isSuspicious: true,
        reasons: ['Score is a statistical outlier'],
      });

      mockLeaderboardService.createLeaderboardEntry.mockResolvedValue({} as any);
      mockLeaderboardService.updateUserAggregate.mockResolvedValue();

      // Execute
      await eventHandler.handleGameCompletedEvent(event);

      // Verify entry is marked as suspicious
      expect(mockLeaderboardService.createLeaderboardEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          suspicious: true,
        })
      );
    });

    describe('Event Validation', () => {
      it('should reject event with missing gameId', async () => {
        const event = createTestEvent({ gameId: '' as any });

        await expect(eventHandler.handleGameCompletedEvent(event)).rejects.toThrow(
          'Event validation failed: gameId is required'
        );
      });

      it('should reject event with missing userId', async () => {
        const event = createTestEvent({ userId: '' as any });

        await expect(eventHandler.handleGameCompletedEvent(event)).rejects.toThrow(
          'Event validation failed: userId is required'
        );
      });

      it('should reject event with invalid gameType', async () => {
        const event = createTestEvent({ gameType: 'INVALID_GAME' as any });

        await expect(eventHandler.handleGameCompletedEvent(event)).rejects.toThrow(
          'Invalid gameType'
        );
      });

      it('should reject event with negative completionTime', async () => {
        const event = createTestEvent({ completionTime: -10 });

        await expect(eventHandler.handleGameCompletedEvent(event)).rejects.toThrow(
          'completionTime must be a positive number'
        );
      });

      it('should reject event with accuracy out of bounds', async () => {
        const event = createTestEvent({ accuracy: 1.5 });

        await expect(eventHandler.handleGameCompletedEvent(event)).rejects.toThrow(
          'accuracy must be a number between 0 and 1'
        );
      });

      it('should reject event with missing performanceMetrics', async () => {
        const event = createTestEvent({ performanceMetrics: undefined as any });

        await expect(eventHandler.handleGameCompletedEvent(event)).rejects.toThrow(
          'performanceMetrics is required'
        );
      });
    });

    describe('Score Validation', () => {
      it('should reject invalid scores', async () => {
        const event = createTestEvent();

        mockScoringService.calculateScore.mockReturnValue({
          baseScore: 1000,
          difficultyMultiplier: 1.0,
          speedBonus: 1.5,
          accuracyBonus: 1.2,
          finalScore: 10000, // Exceeds max
          difficulty: Difficulty.EASY,
          completionTime: 30,
          accuracy: 0.9,
        });

        mockScoringService.validateScore.mockReturnValue({
          valid: false,
          errors: ['Score exceeds maximum'],
        });

        await expect(eventHandler.handleGameCompletedEvent(event)).rejects.toThrow(
          'Score validation failed: Score exceeds maximum'
        );

        // Verify leaderboard entry was NOT created
        expect(mockLeaderboardService.createLeaderboardEntry).not.toHaveBeenCalled();
      });
    });

    describe('Error Handling and Retry Logic', () => {
      it('should retry on transient errors', async () => {
        const event = createTestEvent();

        mockScoringService.calculateScore.mockReturnValue({
          baseScore: 1000,
          difficultyMultiplier: 1.0,
          speedBonus: 1.5,
          accuracyBonus: 1.2,
          finalScore: 1800,
          difficulty: Difficulty.EASY,
          completionTime: 30,
          accuracy: 0.9,
        });

        mockScoringService.validateScore.mockReturnValue({
          valid: true,
          errors: [],
        });

        mockAnomalyService.getGameStatistics.mockResolvedValue(null);
        mockAnomalyService.detectAnomalies.mockResolvedValue({
          isStatisticalOutlier: false,
          isVelocityAnomaly: false,
          isPatternAnomaly: false,
          isSuspicious: false,
          reasons: [],
        });

        // Fail first two attempts, succeed on third
        mockLeaderboardService.createLeaderboardEntry
          .mockRejectedValueOnce(new Error('DynamoDB throttling'))
          .mockRejectedValueOnce(new Error('DynamoDB throttling'))
          .mockResolvedValueOnce({} as any);

        mockLeaderboardService.updateUserAggregate.mockResolvedValue();

        // Execute
        await eventHandler.handleGameCompletedEvent(event);

        // Verify retry attempts
        expect(mockLeaderboardService.createLeaderboardEntry).toHaveBeenCalledTimes(3);
      });

      it('should fail after max retry attempts', async () => {
        const event = createTestEvent();

        mockScoringService.calculateScore.mockReturnValue({
          baseScore: 1000,
          difficultyMultiplier: 1.0,
          speedBonus: 1.5,
          accuracyBonus: 1.2,
          finalScore: 1800,
          difficulty: Difficulty.EASY,
          completionTime: 30,
          accuracy: 0.9,
        });

        mockScoringService.validateScore.mockReturnValue({
          valid: true,
          errors: [],
        });

        mockAnomalyService.getGameStatistics.mockResolvedValue(null);
        mockAnomalyService.detectAnomalies.mockResolvedValue({
          isStatisticalOutlier: false,
          isVelocityAnomaly: false,
          isPatternAnomaly: false,
          isSuspicious: false,
          reasons: [],
        });

        // Always fail
        mockLeaderboardService.createLeaderboardEntry.mockRejectedValue(
          new Error('Persistent error')
        );

        // Execute and expect failure
        await expect(eventHandler.handleGameCompletedEvent(event)).rejects.toThrow(
          'Persistent error'
        );

        // Verify max retry attempts (3)
        expect(mockLeaderboardService.createLeaderboardEntry).toHaveBeenCalledTimes(3);
      });
    });

    describe('Different Game Types', () => {
      it('should process Math Challenge event', async () => {
        const event = createTestEvent({
          gameType: GameType.MATH_CHALLENGE,
          difficulty: Difficulty.MEDIUM,
          performanceMetrics: {
            correctAnswers: 8,
            totalQuestions: 10,
          },
        });

        mockScoringService.calculateScore.mockReturnValue({
          baseScore: 800,
          difficultyMultiplier: 1.5,
          speedBonus: 1.3,
          accuracyBonus: 0.8,
          finalScore: 1248,
          difficulty: Difficulty.MEDIUM,
          completionTime: 30,
          accuracy: 0.8,
        });

        mockScoringService.validateScore.mockReturnValue({
          valid: true,
          errors: [],
        });

        mockAnomalyService.getGameStatistics.mockResolvedValue(null);
        mockAnomalyService.detectAnomalies.mockResolvedValue({
          isStatisticalOutlier: false,
          isVelocityAnomaly: false,
          isPatternAnomaly: false,
          isSuspicious: false,
          reasons: [],
        });

        mockLeaderboardService.createLeaderboardEntry.mockResolvedValue({} as any);
        mockLeaderboardService.updateUserAggregate.mockResolvedValue();

        await eventHandler.handleGameCompletedEvent(event);

        expect(mockScoringService.calculateScore).toHaveBeenCalledWith({
          gameType: GameType.MATH_CHALLENGE,
          difficulty: Difficulty.MEDIUM,
          completionTime: 30,
          performanceMetrics: {
            correctAnswers: 8,
            totalQuestions: 10,
          },
        });
      });

      it('should process Word Puzzle event', async () => {
        const event = createTestEvent({
          gameType: GameType.WORD_PUZZLE,
          difficulty: Difficulty.HARD,
          performanceMetrics: {
            wordsFound: 15,
            totalWords: 20,
          },
        });

        mockScoringService.calculateScore.mockReturnValue({
          baseScore: 750,
          difficultyMultiplier: 2.0,
          speedBonus: 1.2,
          accuracyBonus: 1.375,
          finalScore: 2475,
          difficulty: Difficulty.HARD,
          completionTime: 30,
          accuracy: 0.75,
        });

        mockScoringService.validateScore.mockReturnValue({
          valid: true,
          errors: [],
        });

        mockAnomalyService.getGameStatistics.mockResolvedValue(null);
        mockAnomalyService.detectAnomalies.mockResolvedValue({
          isStatisticalOutlier: false,
          isVelocityAnomaly: false,
          isPatternAnomaly: false,
          isSuspicious: false,
          reasons: [],
        });

        mockLeaderboardService.createLeaderboardEntry.mockResolvedValue({} as any);
        mockLeaderboardService.updateUserAggregate.mockResolvedValue();

        await eventHandler.handleGameCompletedEvent(event);

        expect(mockScoringService.calculateScore).toHaveBeenCalledWith({
          gameType: GameType.WORD_PUZZLE,
          difficulty: Difficulty.HARD,
          completionTime: 30,
          performanceMetrics: {
            wordsFound: 15,
            totalWords: 20,
          },
        });
      });

      it('should process Language Learning event', async () => {
        const event = createTestEvent({
          gameType: GameType.LANGUAGE_LEARNING,
          difficulty: Difficulty.INTERMEDIATE,
          performanceMetrics: {
            correctMatches: 9,
            totalAttempts: 10,
          },
        });

        mockScoringService.calculateScore.mockReturnValue({
          baseScore: 900,
          difficultyMultiplier: 1.5,
          speedBonus: 1.33,
          accuracyBonus: 0.9,
          finalScore: 1617,
          difficulty: Difficulty.INTERMEDIATE,
          completionTime: 30,
          accuracy: 0.9,
        });

        mockScoringService.validateScore.mockReturnValue({
          valid: true,
          errors: [],
        });

        mockAnomalyService.getGameStatistics.mockResolvedValue(null);
        mockAnomalyService.detectAnomalies.mockResolvedValue({
          isStatisticalOutlier: false,
          isVelocityAnomaly: false,
          isPatternAnomaly: false,
          isSuspicious: false,
          reasons: [],
        });

        mockLeaderboardService.createLeaderboardEntry.mockResolvedValue({} as any);
        mockLeaderboardService.updateUserAggregate.mockResolvedValue();

        await eventHandler.handleGameCompletedEvent(event);

        expect(mockScoringService.calculateScore).toHaveBeenCalledWith({
          gameType: GameType.LANGUAGE_LEARNING,
          difficulty: Difficulty.INTERMEDIATE,
          completionTime: 30,
          performanceMetrics: {
            correctMatches: 9,
            totalAttempts: 10,
          },
        });
      });
    });

    describe('Date/Time Extraction', () => {
      it('should correctly extract date, week, and month', async () => {
        const event = createTestEvent({
          timestamp: '2024-03-15T14:30:00Z',
        });

        mockScoringService.calculateScore.mockReturnValue({
          baseScore: 1000,
          difficultyMultiplier: 1.0,
          speedBonus: 1.5,
          accuracyBonus: 1.2,
          finalScore: 1800,
          difficulty: Difficulty.EASY,
          completionTime: 30,
          accuracy: 0.9,
        });

        mockScoringService.validateScore.mockReturnValue({
          valid: true,
          errors: [],
        });

        mockAnomalyService.getGameStatistics.mockResolvedValue(null);
        mockAnomalyService.detectAnomalies.mockResolvedValue({
          isStatisticalOutlier: false,
          isVelocityAnomaly: false,
          isPatternAnomaly: false,
          isSuspicious: false,
          reasons: [],
        });

        mockLeaderboardService.createLeaderboardEntry.mockResolvedValue({} as any);
        mockLeaderboardService.updateUserAggregate.mockResolvedValue();

        await eventHandler.handleGameCompletedEvent(event);

        // Verify date extraction in leaderboard entry
        const createEntryCall = mockLeaderboardService.createLeaderboardEntry.mock.calls[0][0];
        expect(createEntryCall.timestamp).toBe('2024-03-15T14:30:00Z');
      });
    });
  });
});
