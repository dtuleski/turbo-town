/**
 * DC2 - GameService challenge integration: start gate ordering (fail closed before the rate limit),
 * the paid-game gate skip for a validated challenge start, the fail-soft completion hook, and
 * unchanged behaviour without challengeContext (NFR-DC-7).
 *
 * Collaborators are hand-rolled mocks; ChallengeService is the real one over an in-memory table
 * (challenge-fixtures), so validation and completion run production code.
 */
jest.unmock('@aws-sdk/lib-dynamodb');
jest.unmock('@aws-sdk/client-dynamodb');
// These fixtures play Code-a-Bot, so the draw is pinned to it. The real first-batch rotation (six
// games) runs in challenge.service.rotation.test.ts.
jest.mock('@memory-game/shared', () => {
  const actual = jest.requireActual('@memory-game/shared');
  return {
    ...actual,
    eligibleRotation: () => actual.CHALLENGE_ROTATION.filter((e: { gameId: string }) => e.gameId === 'code-a-bot'),
  };
});

import { AuthorizationError, GameStatus, PAID_GAME_THEME_IDS, SubscriptionTier, ValidationError } from '@memory-game/shared';
import type { Game } from '@memory-game/shared';
import { GameService } from '../../../src/services/game.service';
import { ScoreCalculatorService } from '../../../src/services/score-calculator.service';
import { CHALLENGE_UNAVAILABLE_MESSAGE } from '../../../src/services/challenge.service';
import type { GameRepository } from '../../../src/repositories/game.repository';
import type { ThemeRepository } from '../../../src/repositories/theme.repository';
import type { SubscriptionRepository } from '../../../src/repositories/subscription.repository';
import type { RateLimiterService } from '../../../src/services/rate-limiter.service';
import type { AchievementTrackerService } from '../../../src/services/achievement-tracker.service';
import type { EventPublisherService } from '../../../src/services/event-publisher.service';
import { metricsPublisher } from '../../../src/utils/metrics';
import { challengeRig } from '../challenge-fixtures';

const USER_ID = 'user-1';
const GAME_ID = '6f1b9a4c-6d2e-4a7b-9c3d-0e8f1a2b3c4d';
const DAY = '2026-11-26'; // rig clock 17:00Z = 12:00 EST

function harness(tier: SubscriptionTier, opts: { withChallenge?: boolean; game?: Game } = {}) {
  const rig = challengeRig();
  const stored: { game: Game } = {
    game:
      opts.game ??
      ({
        id: GAME_ID,
        userId: USER_ID,
        themeId: 'CODE_A_BOT',
        difficulty: 2,
        status: GameStatus.InProgress,
        startedAt: new Date(),
        attempts: 0,
        score: 0,
      } as Game),
  };
  const gameRepository = {
    create: jest.fn(async (game: any) => ({ ...game, id: GAME_ID })),
    getById: jest.fn(async () => stored.game),
    update: jest.fn(async (gameId: string, updates: any) => ({ ...stored.game, ...updates, id: gameId })),
  };
  const themeRepository = { validateTheme: jest.fn(async () => true) };
  const subscriptionRepository = { getTier: jest.fn(async () => tier) };
  const rateLimiter = {
    checkLimit: jest.fn(async () => undefined),
    incrementUsage: jest.fn(async () => ({ count: 1, resetAt: new Date('2026-11-27T00:00:00.000Z') })),
    getTierLimit: jest.fn(() => 3),
  };
  const achievementTracker = { trackCompletion: jest.fn(async () => []) };
  const eventPublisher = { publishGameCompleted: jest.fn(async () => undefined) };
  const service = new GameService(
    gameRepository as unknown as GameRepository,
    themeRepository as unknown as ThemeRepository,
    subscriptionRepository as unknown as SubscriptionRepository,
    new ScoreCalculatorService(),
    rateLimiter as unknown as RateLimiterService,
    achievementTracker as unknown as AchievementTrackerService,
    eventPublisher as unknown as EventPublisherService,
    undefined,
    opts.withChallenge === false ? undefined : rig.service
  );
  return { service, rig, gameRepository, themeRepository, rateLimiter, eventPublisher, stored };
}

beforeEach(() => {
  jest.spyOn(metricsPublisher, 'publishGameStarted').mockResolvedValue(undefined);
  jest.spyOn(metricsPublisher, 'publishGameCompleted').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function expectNoPlayUsed(h: ReturnType<typeof harness>): void {
  expect(h.rateLimiter.checkLimit).not.toHaveBeenCalled();
  expect(h.rateLimiter.incrementUsage).not.toHaveBeenCalled();
  expect(h.themeRepository.validateTheme).not.toHaveBeenCalled();
  expect(h.gameRepository.create).not.toHaveBeenCalled();
}

/** Stores today's challenge as a given game (the stored item is the truth, BR-D4). */
function seedChallenge(h: ReturnType<typeof harness>, themeId: string, gameId: string): void {
  h.rig.table.items.set(`${DAY}|CHALLENGE`, {
    pk: DAY,
    sk: 'CHALLENGE',
    gameId,
    themeId,
    difficulty: 2,
    settings: { levels: 5 },
    content: { kind: 'code-a-bot', difficulty: 'medium', levelNumbers: [1, 2, 3, 4, 5] },
    createdAt: '2026-11-26T05:00:00.000Z',
  });
}

describe('startGame with challengeContext', () => {
  it('validates before the rate limit, stores challengeDay and counts a normal play', async () => {
    const h = harness(SubscriptionTier.Free);
    const result = await h.service.startGame(USER_ID, { themeId: 'CODE_A_BOT', difficulty: 2, challengeContext: { day: DAY } });
    expect(h.gameRepository.create).toHaveBeenCalledWith(expect.objectContaining({ themeId: 'CODE_A_BOT', challengeDay: DAY }));
    expect(result.game.challengeDay).toBe(DAY);
    expect(h.rig.table.send.mock.invocationCallOrder[0]).toBeLessThan(h.rateLimiter.checkLimit.mock.invocationCallOrder[0]!);
    expect(h.rateLimiter.checkLimit).toHaveBeenCalledWith(USER_ID, SubscriptionTier.Free);
    expect(h.rateLimiter.incrementUsage).toHaveBeenCalledTimes(1);
  });

  const failures: [string, string, number, unknown][] = [
    ['wrong day', 'CODE_A_BOT', 2, { day: '2026-11-25' }],
    ['future day', 'CODE_A_BOT', 2, { day: '2026-11-27' }],
    ['malformed day', 'CODE_A_BOT', 2, { day: 'today' }],
    ['garbage context', 'CODE_A_BOT', 2, 'x'],
    ['wrong theme', 'SUDOKU', 2, { day: DAY }],
    ['wrong difficulty', 'CODE_A_BOT', 1, { day: DAY }],
  ];
  it.each(failures)('%s -> generic error and no play used', async (_n, themeId, difficulty, ctx) => {
    const h = harness(SubscriptionTier.Free);
    const attempt = h.service.startGame(USER_ID, { themeId, difficulty, challengeContext: ctx });
    await expect(attempt).rejects.toBeInstanceOf(ValidationError);
    await expect(h.service.startGame(USER_ID, { themeId, difficulty, challengeContext: ctx })).rejects.toMatchObject({
      message: CHALLENGE_UNAVAILABLE_MESSAGE,
    });
    expectNoPlayUsed(h);
  });

  it('fails closed when the service is not configured', async () => {
    const h = harness(SubscriptionTier.Premium, { withChallenge: false });
    await expect(
      h.service.startGame(USER_ID, { themeId: 'CODE_A_BOT', difficulty: 2, challengeContext: { day: DAY } })
    ).rejects.toMatchObject({ message: CHALLENGE_UNAVAILABLE_MESSAGE });
    expectNoPlayUsed(h);
  });

  it('lets a FREE user start a paid game that is today\'s challenge (FR-DC-16)', async () => {
    const paid = 'SPACE_ENTRY';
    expect(PAID_GAME_THEME_IDS).toContain(paid);
    const h = harness(SubscriptionTier.Free);
    seedChallenge(h, paid, 'space-entry');
    const result = await h.service.startGame(USER_ID, { themeId: paid, difficulty: 2, challengeContext: { day: DAY } });
    expect(result.game).toMatchObject({ themeId: paid, challengeDay: DAY });
    expect(h.rateLimiter.incrementUsage).toHaveBeenCalledTimes(1);
  });

  it('keeps the paid-game gate for the same game without a challenge, or for another paid game', async () => {
    const h = harness(SubscriptionTier.Free);
    seedChallenge(h, 'SPACE_ENTRY', 'space-entry');
    await expect(h.service.startGame(USER_ID, { themeId: 'SPACE_ENTRY', difficulty: 2 })).rejects.toBeInstanceOf(
      AuthorizationError
    );
    await expect(
      h.service.startGame(USER_ID, { themeId: 'MINI_GOLF', difficulty: 2, challengeContext: { day: DAY } })
    ).rejects.toMatchObject({ message: CHALLENGE_UNAVAILABLE_MESSAGE });
    expectNoPlayUsed(h);
  });
});

describe('startGame without challengeContext is unchanged (NFR-DC-7)', () => {
  it('creates exactly the same record as before and touches no challenge data', async () => {
    const h = harness(SubscriptionTier.Premium);
    await h.service.startGame(USER_ID, { themeId: 'ANIMALS', difficulty: 1 });
    expect(h.gameRepository.create).toHaveBeenCalledWith({
      userId: USER_ID,
      themeId: 'ANIMALS',
      difficulty: 1,
      status: GameStatus.InProgress,
      startedAt: expect.any(Date),
      attempts: 0,
      score: 0,
    });
    expect(h.rig.table.send).not.toHaveBeenCalled();
  });

  it('treats a null challengeContext as absent, also without the service', async () => {
    const h = harness(SubscriptionTier.Premium, { withChallenge: false });
    await expect(h.service.startGame(USER_ID, { themeId: 'ANIMALS', difficulty: 1, challengeContext: null })).resolves.toBeDefined();
  });

  it('still refuses paid games for FREE users', async () => {
    const h = harness(SubscriptionTier.Free);
    await expect(h.service.startGame(USER_ID, { themeId: 'SPACE_ENTRY', difficulty: 2 })).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe('completeGame challenge hook', () => {
  const CODE = { gameId: GAME_ID, completionTime: 120, attempts: 5, correctAnswers: 5, totalQuestions: 5 };
  const challengeGame = (): Game =>
    ({
      id: GAME_ID,
      userId: USER_ID,
      themeId: 'CODE_A_BOT',
      difficulty: 2,
      status: GameStatus.InProgress,
      startedAt: new Date(),
      attempts: 0,
      score: 0,
      challengeDay: DAY,
    }) as Game;

  it('records the server score as the best for the day', async () => {
    const h = harness(SubscriptionTier.Free, { game: challengeGame() });
    await h.rig.service.ensureChallenge(DAY);
    const response = await h.service.completeGame(USER_ID, CODE, 'ana');
    const score = response.game.score as number;
    expect(score).toBeGreaterThan(0);
    expect(response.challenge).toEqual({ day: DAY, recorded: true, bestScore: score, rank: 1, isNewBest: true });
    expect(h.rig.table.get(DAY, `SCORE#${USER_ID}`)).toMatchObject({ username: 'ana', bestScore: score });
    expect(h.eventPublisher.publishGameCompleted).toHaveBeenCalledTimes(1);

    // The same score again does not replace the stored best.
    const again = await h.service.completeGame(USER_ID, CODE, 'ana');
    expect(again.challenge).toMatchObject({ recorded: true, bestScore: score, isNewBest: false });
  });

  it('does not record after Eastern midnight, and the normal completion still returns the score', async () => {
    const h = harness(SubscriptionTier.Free, { game: challengeGame() });
    await h.rig.service.ensureChallenge(DAY);
    h.rig.clock.now = new Date('2026-11-27T05:00:00.000Z');
    const response = await h.service.completeGame(USER_ID, CODE, 'ana');
    expect(response.game.status).toBe(GameStatus.Completed);
    expect(response.game.score).toBeGreaterThan(0);
    expect(response.challenge).toEqual({ day: DAY, recorded: false, bestScore: null, rank: null, isNewBest: false });
    expect(h.rig.table.get(DAY, `SCORE#${USER_ID}`)).toBeUndefined();
  });

  it('does not record totals that differ from expectedTotals, and still completes', async () => {
    const h = harness(SubscriptionTier.Free, { game: challengeGame() });
    await h.rig.service.ensureChallenge(DAY);
    const response = await h.service.completeGame(USER_ID, { ...CODE, correctAnswers: 3, totalQuestions: 3 }, 'ana');
    expect(response.game.score).toBeGreaterThan(0);
    expect(response.challenge?.recorded).toBe(false);
    expect(h.rig.table.get(DAY, `SCORE#${USER_ID}`)).toBeUndefined();
  });

  it('is fail-soft: a table failure still completes the game without challenge', async () => {
    const h = harness(SubscriptionTier.Free, { game: challengeGame() });
    await h.rig.service.ensureChallenge(DAY);
    h.rig.table.failNext.error = new Error('dynamo down');
    const response = await h.service.completeGame(USER_ID, CODE, 'ana');
    expect(response.challenge).toBeUndefined();
    expect(response.game.status).toBe(GameStatus.Completed);
    expect(h.eventPublisher.publishGameCompleted).toHaveBeenCalledTimes(1);
  });

  it('adds nothing and reads nothing for a game without challengeDay', async () => {
    const h = harness(SubscriptionTier.Free);
    const response = await h.service.completeGame(USER_ID, CODE, 'ana');
    expect(response).not.toHaveProperty('challenge');
    expect(h.rig.table.send).not.toHaveBeenCalled();
  });
});
