/**
 * Circuit Builder game type (U7a).
 *
 * Proves the Leaderboard accepts the exact gameType string the Game Service emits for Circuit
 * Builder, that real scores are accepted and out-of-range ones rejected, and that existing games
 * are unchanged. A rejected event silently produces no leaderboard entry, so drift here is costly.
 */
import * as fs from 'fs';
import * as path from 'path';
import { EventBridgeEvent } from 'aws-lambda';
import { EventHandler, GameCompletedDetail } from '../src/handlers/event.handler';
import { ScoringService } from '../src/services/scoring.service';
import { AnomalyService } from '../src/services/anomaly.service';
import { LeaderboardService } from '../src/services/leaderboard.service';
import { LeaderboardRepository } from '../src/repositories/leaderboard.repository';
import { AggregateRepository } from '../src/repositories/aggregate.repository';
import { GameType, Difficulty, Timeframe } from '../src/types';

jest.mock('@aws-sdk/client-cloudwatch');
jest.mock('../src/repositories/leaderboard.repository');
jest.mock('../src/repositories/aggregate.repository');

const GAME_SRC = path.resolve(__dirname, '../../game/src');
const DRIFT_MSG =
  'Game Service and Leaderboard game type drifted: update services/leaderboard/src/types/index.ts';

const themeConstantSource = fs.readFileSync(path.join(GAME_SRC, 'utils/circuit-builder.ts'), 'utf8');
const gameServiceSource = fs.readFileSync(path.join(GAME_SRC, 'services/game.service.ts'), 'utf8');
const emittedMatch = /CIRCUIT_BUILDER_THEME_ID\s*=\s*'([^']+)'/.exec(themeConstantSource);
// The string the Game Service publishes as event gameType (derived from its source, not hardcoded)
const EMITTED_GAME_TYPE = emittedMatch ? emittedMatch[1] : '';

describe('Circuit Builder game type', () => {
  describe('drift guard against the Game Service', () => {
    it('reads CIRCUIT_BUILDER_THEME_ID from the Game Service source', () => {
      expect(emittedMatch).not.toBeNull();
    });

    it('GameType.CIRCUIT_BUILDER equals the Game Service theme id', () => {
      expect({ msg: DRIFT_MSG, value: GameType.CIRCUIT_BUILDER }).toEqual({
        msg: DRIFT_MSG,
        value: EMITTED_GAME_TYPE,
      });
      expect(GameType.CIRCUIT_BUILDER).toBe('CIRCUIT_BUILDER');
    });

    it('completeCircuitBuilderGame publishes gameType: CIRCUIT_BUILDER_THEME_ID', () => {
      const fn = gameServiceSource.indexOf('completeCircuitBuilderGame');
      expect(fn).toBeGreaterThanOrEqual(0);
      const publishBlock = /publishGameCompleted\(\{[\s\S]*?gameType:\s*CIRCUIT_BUILDER_THEME_ID/.exec(
        gameServiceSource.slice(fn)
      );
      expect({ msg: DRIFT_MSG, found: publishBlock !== null }).toEqual({ msg: DRIFT_MSG, found: true });
    });
  });

  describe('EventHandler acceptance', () => {
    const makeEvent = (
      difficulty: Difficulty,
      overrides?: Partial<GameCompletedDetail>
    ): EventBridgeEvent<'GameCompleted', GameCompletedDetail> => ({
      version: '0',
      id: 'event-cb',
      'detail-type': 'GameCompleted',
      source: 'game-service',
      account: '123456789012',
      time: '2026-01-01T12:00:00Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        gameId: 'game-cb',
        userId: 'user-cb',
        username: 'player1',
        gameType: EMITTED_GAME_TYPE as GameType,
        difficulty,
        score: 2210,
        completionTime: 90,
        accuracy: 0.8,
        // Exact shape published by completeCircuitBuilderGame
        // (cast: the Leaderboard PerformanceMetrics type does not declare hintsUsed/pauseCount)
        performanceMetrics: { attempts: 1, hintsUsed: 0, pauseCount: 0, averageResponseTime: 90 } as any,
        timestamp: '2026-01-01T12:00:00Z',
        ...overrides,
      },
    });

    let handler: EventHandler;
    let mockLeaderboardService: jest.Mocked<LeaderboardService>;

    beforeEach(() => {
      const mockAnomaly = {
        getGameStatistics: jest.fn().mockResolvedValue(null),
        detectAnomalies: jest.fn().mockResolvedValue({ isSuspicious: false, reasons: [] }),
        updateGameStatistics: jest.fn(),
      } as unknown as AnomalyService;
      mockLeaderboardService = {
        createLeaderboardEntry: jest.fn().mockResolvedValue(undefined),
        updateUserAggregate: jest.fn().mockResolvedValue(undefined),
      } as unknown as jest.Mocked<LeaderboardService>;
      // Real ScoringService so validateScore is exercised for real
      handler = new EventHandler(new ScoringService(), mockAnomaly, mockLeaderboardService);
    });

    // HARD also stands for Super Hard (U6 difficulty 4): game.service maps difficulty > 2 to 'HARD'
    it.each([Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD])(
      'accepts a legitimate %s Circuit Builder event and writes the entry',
      async (difficulty) => {
        await expect(handler.handleGameCompletedEvent(makeEvent(difficulty))).resolves.not.toThrow();
        expect(mockLeaderboardService.createLeaderboardEntry).toHaveBeenCalledWith(
          expect.objectContaining({ gameType: 'CIRCUIT_BUILDER', score: 2210, difficulty })
        );
        expect(mockLeaderboardService.updateUserAggregate).toHaveBeenCalledWith(
          expect.objectContaining({ gameType: 'CIRCUIT_BUILDER', score: 2210 })
        );
      }
    );

    it('accepts a game longer than 10 minutes (would fail under the mathChallenge window)', async () => {
      await expect(
        handler.handleGameCompletedEvent(makeEvent(Difficulty.HARD, { completionTime: 1500, score: 2040 }))
      ).resolves.not.toThrow();
      expect(mockLeaderboardService.createLeaderboardEntry).toHaveBeenCalled();
    });

    it('rejects an out-of-range Circuit Builder score', async () => {
      await expect(
        handler.handleGameCompletedEvent(makeEvent(Difficulty.EASY, { score: 8001 }))
      ).rejects.toThrow(/Score validation failed/);
      expect(mockLeaderboardService.createLeaderboardEntry).not.toHaveBeenCalled();
    });
  });

  describe('ScoringService.validateScore', () => {
    const scoring = new ScoringService();

    it.each([2210, 2040, 7331, 8000, 0])('accepts real-range score %d at all realistic times', (score) => {
      // 601 guards against reusing the mathChallenge 10..600 s window
      for (const t of [1, 90, 600, 601, 3600]) {
        const r = scoring.validateScore(GameType.CIRCUIT_BUILDER, score, t, 0.8);
        expect({ score, t, errors: r.errors }).toEqual({ score, t, errors: [] });
        expect(r.valid).toBe(true);
      }
    });

    it('rejects out-of-range values', () => {
      expect(scoring.validateScore(GameType.CIRCUIT_BUILDER, 8001, 90, 0.8).valid).toBe(false);
      expect(scoring.validateScore(GameType.CIRCUIT_BUILDER, -1, 90, 0.8).valid).toBe(false);
      expect(scoring.validateScore(GameType.CIRCUIT_BUILDER, 2210, 0, 0.8).valid).toBe(false);
      expect(scoring.validateScore(GameType.CIRCUIT_BUILDER, 2210, 3601, 0.8).valid).toBe(false);
      expect(scoring.validateScore(GameType.CIRCUIT_BUILDER, 2210, 90, 1.1).valid).toBe(false);
    });
  });

  describe('existing games unchanged (pins)', () => {
    const scoring = new ScoringService();

    it('MEMORY_MATCH keeps max score 10000', () => {
      expect(scoring.validateScore(GameType.MEMORY_MATCH, 10001, 30, 0.9).valid).toBe(false);
      expect(scoring.validateScore(GameType.MEMORY_MATCH, 10000, 30, 0.9).valid).toBe(true);
    });

    it('MINI_GOLF keeps the mathChallenge 10..600 s window', () => {
      expect(scoring.validateScore(GameType.MINI_GOLF, 5000, 601, 0.9).valid).toBe(false);
      expect(scoring.validateScore(GameType.MINI_GOLF, 5000, 120, 0.9).valid).toBe(true);
    });

    it('GameType keeps existing members and adds CIRCUIT_BUILDER exactly once', () => {
      const values = Object.values(GameType) as string[];
      expect(values.filter((v) => v === 'CIRCUIT_BUILDER')).toHaveLength(1);
      expect(values).toEqual(expect.arrayContaining(['MEMORY_MATCH', 'MINI_GOLF', 'OVERALL']));
    });
  });

  describe('overall leaderboard fan-out', () => {
    it('queries CIRCUIT_BUILDER when building the time-based OVERALL board', async () => {
      const leaderboardRepo = new LeaderboardRepository() as jest.Mocked<LeaderboardRepository>;
      const aggregateRepo = new AggregateRepository() as jest.Mocked<AggregateRepository>;
      leaderboardRepo.queryByGameTypeAndTimeframe.mockResolvedValue([]);
      const service = new LeaderboardService(leaderboardRepo, aggregateRepo);

      await service.getLeaderboard(GameType.OVERALL, Timeframe.DAILY, undefined, 10);

      const queried = leaderboardRepo.queryByGameTypeAndTimeframe.mock.calls.map((c) => c[0].gameType);
      expect(queried).toContain(GameType.CIRCUIT_BUILDER);
      expect(queried).toContain(GameType.MINI_GOLF);
    });
  });

  describe('AnomalyService.getDifficultiesForGameType (latent, no caller)', () => {
    const service = new AnomalyService('GameStatistics', 'LeaderboardEntries');
    const get = (g: GameType) => (service as any).getDifficultiesForGameType(g);

    it('returns EASY/MEDIUM/HARD for CIRCUIT_BUILDER', () => {
      expect(get(GameType.CIRCUIT_BUILDER)).toEqual([Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD]);
    });

    it('leaves other games unchanged', () => {
      expect(get(GameType.MEMORY_MATCH)).toEqual([Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD]);
      expect(get(GameType.MINI_GOLF)).toEqual([]);
    });
  });
});
