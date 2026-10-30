/**
 * S3 / S4 - Circuit Builder entitlement gate and completion orchestration.
 *
 * The two properties this suite exists to prove:
 *
 *   1. Free tier cannot start the game, even by calling the route directly.
 *   2. Every rejection fails CLOSED - no score persisted, no leaderboard event, no metric -
 *      and every rejection carries the identical message, so there is no disclosure oracle.
 *
 * Dependencies are hand-rolled jest mocks. The real ScoreCalculatorService is used, so the
 * scoring path under test is the production one.
 */

import {
  AuthorizationError,
  GameStatus,
  SubscriptionTier,
  ValidationError,
} from '@memory-game/shared';
import type { Game } from '@memory-game/shared';
import { GameService } from '../../../src/services/game.service';
import { ScoreCalculatorService } from '../../../src/services/score-calculator.service';
import type { GameRepository } from '../../../src/repositories/game.repository';
import type { ThemeRepository } from '../../../src/repositories/theme.repository';
import type { SubscriptionRepository } from '../../../src/repositories/subscription.repository';
import type { RateLimiterService } from '../../../src/services/rate-limiter.service';
import type { AchievementTrackerService } from '../../../src/services/achievement-tracker.service';
import type { EventPublisherService } from '../../../src/services/event-publisher.service';
import {
  CIRCUIT_BUILDER_THEME_ID,
  CIRCUIT_SUBMISSION_REJECTED_MESSAGE,
} from '../../../src/utils/circuit-builder';
import { metricsPublisher } from '../../../src/utils/metrics';
import {
  SANDBOX_LEVEL_ID,
  asWirePayload,
  openCircuitLayout,
  outsideLevelGridLayout,
  overBudgetLayout,
  shortedHeadlightLayout,
  submissionPayload,
  ungrantedKindLayout,
} from '../circuit-fixtures';

const USER_ID = 'user-1';
const GAME_ID = '6f1b9a4c-6d2e-4a7b-9c3d-0e8f1a2b3c4d';
const USERNAME = 'player';
const VALID_TIME = 60;

interface Harness {
  service: GameService;
  gameRepository: {
    create: jest.Mock;
    getById: jest.Mock;
    update: jest.Mock;
    queryByUser: jest.Mock;
  };
  themeRepository: { validateTheme: jest.Mock };
  subscriptionRepository: { getTier: jest.Mock };
  rateLimiter: { checkLimit: jest.Mock; incrementUsage: jest.Mock; getTierLimit: jest.Mock };
  achievementTracker: { trackCompletion: jest.Mock };
  eventPublisher: { publishGameCompleted: jest.Mock };
  publishGameCompletedMetric: jest.SpyInstance;
  publishGameStartedMetric: jest.SpyInstance;
}

function inProgressGame(overrides: Partial<Game> = {}): Game {
  return {
    id: GAME_ID,
    userId: USER_ID,
    themeId: CIRCUIT_BUILDER_THEME_ID,
    difficulty: 1,
    status: GameStatus.InProgress,
    startedAt: new Date('2024-01-01T00:00:00.000Z'),
    attempts: 0,
    score: 0,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  } as Game;
}

function harness(tier: SubscriptionTier = SubscriptionTier.Premium): Harness {
  const gameRepository = {
    create: jest.fn(async (game: any) => ({ ...inProgressGame(), ...game })),
    getById: jest.fn(async () => inProgressGame()),
    update: jest.fn(async (gameId: string, updates: any) => ({
      ...inProgressGame(),
      ...updates,
      id: gameId,
    })),
    queryByUser: jest.fn(async () => []),
  };
  const themeRepository = { validateTheme: jest.fn(async () => true) };
  const subscriptionRepository = { getTier: jest.fn(async () => tier) };
  const rateLimiter = {
    checkLimit: jest.fn(async () => undefined),
    incrementUsage: jest.fn(async () => ({
      count: 1,
      resetAt: new Date('2024-01-02T00:00:00.000Z'),
    })),
    getTierLimit: jest.fn(() => 100),
  };
  const achievementTracker = { trackCompletion: jest.fn(async () => []) };
  const eventPublisher = { publishGameCompleted: jest.fn(async () => undefined) };

  const publishGameCompletedMetric = jest
    .spyOn(metricsPublisher, 'publishGameCompleted')
    .mockResolvedValue(undefined);
  const publishGameStartedMetric = jest
    .spyOn(metricsPublisher, 'publishGameStarted')
    .mockResolvedValue(undefined);

  const service = new GameService(
    gameRepository as unknown as GameRepository,
    themeRepository as unknown as ThemeRepository,
    subscriptionRepository as unknown as SubscriptionRepository,
    new ScoreCalculatorService(),
    rateLimiter as unknown as RateLimiterService,
    achievementTracker as unknown as AchievementTrackerService,
    eventPublisher as unknown as EventPublisherService
  );

  return {
    service,
    gameRepository,
    themeRepository,
    subscriptionRepository,
    rateLimiter,
    achievementTracker,
    eventPublisher,
    publishGameCompletedMetric,
    publishGameStartedMetric,
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

/** Assert the fail-closed contract: nothing persisted, nothing published, nothing measured. */
function expectFailedClosed(h: Harness): void {
  expect(h.gameRepository.update).not.toHaveBeenCalled();
  expect(h.eventPublisher.publishGameCompleted).not.toHaveBeenCalled();
  expect(h.publishGameCompletedMetric).not.toHaveBeenCalled();
  expect(h.achievementTracker.trackCompletion).not.toHaveBeenCalled();
}

describe('startGame - Circuit Builder entitlement (CB-1.2, CB-1.3, FR-CB-35, FR-CB-36)', () => {
  it('rejects a Free-tier start before the theme is ever looked up', async () => {
    const h = harness(SubscriptionTier.Free);

    await expect(
      h.service.startGame(USER_ID, { themeId: CIRCUIT_BUILDER_THEME_ID, difficulty: 1 })
    ).rejects.toThrow(AuthorizationError);

    // The paywall holds even before the theme row exists: the gate runs first.
    expect(h.themeRepository.validateTheme).not.toHaveBeenCalled();
    expect(h.rateLimiter.checkLimit).not.toHaveBeenCalled();
    expect(h.gameRepository.create).not.toHaveBeenCalled();
  });

  it.each([SubscriptionTier.Light, SubscriptionTier.Standard, SubscriptionTier.Premium])(
    'lets a %s subscriber past the gate',
    async (tier) => {
      const h = harness(tier);

      await h.service.startGame(USER_ID, { themeId: CIRCUIT_BUILDER_THEME_ID, difficulty: 1 });

      expect(h.themeRepository.validateTheme).toHaveBeenCalledWith(CIRCUIT_BUILDER_THEME_ID);
      expect(h.gameRepository.create).toHaveBeenCalled();
    }
  );

  it('leaves the Free-tier entitlement of a free game unchanged', async () => {
    const h = harness(SubscriptionTier.Free);

    await h.service.startGame(USER_ID, { themeId: 'MEMORY_MATCH', difficulty: 1 });

    expect(h.gameRepository.create).toHaveBeenCalled();
  });
});

describe('completeGame - Circuit Builder success (CB-4.2, CB-4.4)', () => {
  it('persists the server-computed score and publishes one leaderboard event', async () => {
    const h = harness();

    const response = await h.service.completeGame(
      USER_ID,
      {
        gameId: GAME_ID,
        completionTime: VALID_TIME,
        attempts: 1,
        circuitSubmission: submissionPayload(),
      },
      USERNAME
    );

    expect(h.gameRepository.update).toHaveBeenCalledTimes(1);
    const [, updates] = h.gameRepository.update.mock.calls[0];
    expect(updates.status).toBe(GameStatus.Completed);
    expect(updates.attempts).toBe(1);
    expect(updates.completionTime).toBe(VALID_TIME);
    expect(updates.score).toBeGreaterThan(0);

    expect(response.scoreBreakdown).toBeDefined();
    expect(response.scoreBreakdown!.finalScore).toBe(updates.score);

    expect(h.eventPublisher.publishGameCompleted).toHaveBeenCalledTimes(1);
    const event = h.eventPublisher.publishGameCompleted.mock.calls[0][0];
    expect(event.gameType).toBe(CIRCUIT_BUILDER_THEME_ID);
    expect(event.score).toBe(updates.score);
    expect(event.difficulty).toBe('EASY');
    expect(event.performanceMetrics.attempts).toBe(1);
    expect(event.accuracy).toBeGreaterThanOrEqual(0);
    expect(event.accuracy).toBeLessThanOrEqual(1);
  });

  it('scores from the verified layout, not from a client-claimed score', async () => {
    const h = harness();

    // An extra `score` key is refused outright by the strict schema, so a spoofed score
    // cannot be honoured and cannot even reach the scorer.
    await expect(
      h.service.completeGame(
        USER_ID,
        {
          gameId: GAME_ID,
          completionTime: VALID_TIME,
          attempts: 1,
          circuitSubmission: submissionPayload({ score: 8000 }),
        },
        USERNAME
      )
    ).rejects.toThrow(ValidationError);

    expectFailedClosed(h);
  });
});

describe('completeGame - Circuit Builder rejection fails closed (CB-4.5, FR-CB-22, FR-CB-26, SECURITY-11)', () => {
  const cases: Array<[string, unknown, number]> = [
    ['a missing submission', undefined, VALID_TIME],
    ['a null submission', null, VALID_TIME],
    [
      'an unknown element kind',
      (() => {
        const layout = asWirePayload(openCircuitLayout());
        layout.elements[0].kind = 'plasma';
        return submissionPayload({ layout });
      })(),
      VALID_TIME,
    ],
    [
      'a coordinate outside the grid',
      (() => {
        const layout = asWirePayload(openCircuitLayout());
        layout.elements[0].position.col = 99;
        return submissionPayload({ layout });
      })(),
      VALID_TIME,
    ],
    [
      'a source voltage out of range',
      submissionPayload({ environment: { sourceVoltage: 48, lightLevel: 1 } }),
      VALID_TIME,
    ],
    ['an unknown level id', submissionPayload({ levelId: 'cb-99' }), VALID_TIME],
    [
      'the sandbox, which has no objective',
      submissionPayload({ levelId: SANDBOX_LEVEL_ID }),
      VALID_TIME,
    ],
    [
      'a layout that does not satisfy the objective',
      submissionPayload({ layout: asWirePayload(openCircuitLayout()) }),
      VALID_TIME,
    ],
    [
      'a shorted layout',
      submissionPayload({ layout: asWirePayload(shortedHeadlightLayout()) }),
      VALID_TIME,
    ],
    [
      'more of a kind than the level grants',
      submissionPayload({ layout: asWirePayload(overBudgetLayout()) }),
      VALID_TIME,
    ],
    [
      'a kind the level does not grant',
      submissionPayload({ layout: asWirePayload(ungrantedKindLayout()) }),
      VALID_TIME,
    ],
    [
      'a coordinate outside the level grid',
      submissionPayload({ layout: asWirePayload(outsideLevelGridLayout()) }),
      VALID_TIME,
    ],
    ['a negative completion time', submissionPayload(), -5],
    ['a completion time below the per-difficulty floor', submissionPayload(), 1],
  ];

  it.each(cases)(
    'rejects %s with no score and no event',
    async (_label, circuitSubmission, completionTime) => {
      const h = harness();

      await expect(
        h.service.completeGame(
          USER_ID,
          { gameId: GAME_ID, completionTime, attempts: 1, circuitSubmission },
          USERNAME
        )
      ).rejects.toThrow(CIRCUIT_SUBMISSION_REJECTED_MESSAGE);

      expectFailedClosed(h);
    }
  );

  it('gives every cause the identical message, so there is no disclosure oracle', async () => {
    const messages = new Set<string>();

    for (const [, circuitSubmission, completionTime] of cases) {
      const h = harness();
      try {
        await h.service.completeGame(
          USER_ID,
          { gameId: GAME_ID, completionTime, attempts: 1, circuitSubmission },
          USERNAME
        );
        throw new Error('expected a rejection');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        messages.add((error as Error).message);
      }
      jest.restoreAllMocks();
    }

    expect(messages.size).toBe(1);
    expect([...messages][0]).toBe(CIRCUIT_SUBMISSION_REJECTED_MESSAGE);
  });

  it('rejects a difficulty that does not match the submitted level', async () => {
    const h = harness();
    h.gameRepository.getById.mockResolvedValue(inProgressGame({ difficulty: 3 }));

    await expect(
      h.service.completeGame(
        USER_ID,
        {
          gameId: GAME_ID,
          completionTime: VALID_TIME,
          attempts: 1,
          circuitSubmission: submissionPayload(),
        },
        USERNAME
      )
    ).rejects.toThrow(CIRCUIT_SUBMISSION_REJECTED_MESSAGE);

    expectFailedClosed(h);
  });

  it('still refuses an already-completed game before reaching the submission path', async () => {
    const h = harness();
    h.gameRepository.getById.mockResolvedValue(inProgressGame({ status: GameStatus.Completed }));

    await expect(
      h.service.completeGame(
        USER_ID,
        {
          gameId: GAME_ID,
          completionTime: VALID_TIME,
          attempts: 1,
          circuitSubmission: submissionPayload(),
        },
        USERNAME
      )
    ).rejects.toThrow(AuthorizationError);

    expectFailedClosed(h);
  });
});

describe('completeGame - existing games are unaffected', () => {
  it('still scores MEMORY_MATCH through the generic path', async () => {
    const h = harness();
    h.gameRepository.getById.mockResolvedValue(
      inProgressGame({ themeId: 'MEMORY_MATCH', difficulty: 1 })
    );

    const response = await h.service.completeGame(
      USER_ID,
      { gameId: GAME_ID, completionTime: 60, attempts: 12 },
      USERNAME
    );

    expect(h.gameRepository.update).toHaveBeenCalledTimes(1);
    const [, updates] = h.gameRepository.update.mock.calls[0];
    // The generic path stores the client-reported attempts; the Circuit Builder path stores 1.
    expect(updates.attempts).toBe(12);
    expect(response.scoreBreakdown!.baseScore).toBe(1000);
    // Exact integer, so a change to the shared ScoreCalculatorService cannot silently move
    // an existing game's score. 1000 x 1.0 x 1.9 x 1.1666... = 2217.
    expect(response.scoreBreakdown!.finalScore).toBe(2217);
    expect(updates.score).toBe(2217);
    expect(h.eventPublisher.publishGameCompleted.mock.calls[0][0].gameType).toBe('MEMORY_MATCH');
  });

  it('still scores MINI_GOLF through the generic path', async () => {
    const h = harness();
    h.gameRepository.getById.mockResolvedValue(
      inProgressGame({ themeId: 'MINI_GOLF', difficulty: 2 })
    );

    const response = await h.service.completeGame(
      USER_ID,
      {
        gameId: GAME_ID,
        completionTime: 60,
        attempts: 8,
        correctAnswers: 4,
        totalQuestions: 4,
      },
      USERNAME
    );

    expect(response.scoreBreakdown!.baseScore).toBe(1800);
    // Exact integer, same reason: 1800 x 1.5 x 0.8 x 1.5 = 3240.
    expect(response.scoreBreakdown!.finalScore).toBe(3240);
    expect(h.eventPublisher.publishGameCompleted.mock.calls[0][0].gameType).toBe('MINI_GOLF');
  });

  it('ignores a circuitSubmission sent against a non-Circuit-Builder game', async () => {
    const h = harness();
    h.gameRepository.getById.mockResolvedValue(
      inProgressGame({ themeId: 'MEMORY_MATCH', difficulty: 1 })
    );

    await h.service.completeGame(
      USER_ID,
      {
        gameId: GAME_ID,
        completionTime: 60,
        attempts: 12,
        circuitSubmission: submissionPayload(),
      },
      USERNAME
    );

    expect(h.eventPublisher.publishGameCompleted.mock.calls[0][0].gameType).toBe('MEMORY_MATCH');
  });
});
