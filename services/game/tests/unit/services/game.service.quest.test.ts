/**
 * QM2 - GameService quest integration: start gate ordering (R-START-1/2/6), the paywall,
 * both completeGame exits (R-DONE-1/2) and unchanged behaviour without questContext (FR-QM-19).
 *
 * Collaborators are hand-rolled mocks; QuestService is the real one over an in-memory
 * repository (quest-fixtures), so validation and completion run production code.
 */
import {
  AuthorizationError,
  GameStatus,
  PAID_GAME_THEME_IDS,
  SubscriptionTier,
  ValidationError,
  getNode,
  getWorld,
  starsForScore,
} from '@memory-game/shared';
import type { Game } from '@memory-game/shared';
import { GameService } from '../../../src/services/game.service';
import { ScoreCalculatorService } from '../../../src/services/score-calculator.service';
import { QUEST_UNAVAILABLE_MESSAGE } from '../../../src/services/quest.service';
import type { QuestService } from '../../../src/services/quest.service';
import type { GameRepository } from '../../../src/repositories/game.repository';
import type { ThemeRepository } from '../../../src/repositories/theme.repository';
import type { SubscriptionRepository } from '../../../src/repositories/subscription.repository';
import type { RateLimiterService } from '../../../src/services/rate-limiter.service';
import type { AchievementTrackerService } from '../../../src/services/achievement-tracker.service';
import type { EventPublisherService } from '../../../src/services/event-publisher.service';
import { metricsPublisher } from '../../../src/utils/metrics';
import { submissionPayload } from '../circuit-fixtures';
import { USER_ID, clearedWorld, questGame, questRig } from '../quest-fixtures';

const GAME_ID = '6f1b9a4c-6d2e-4a7b-9c3d-0e8f1a2b3c4d';

function harness(tier: SubscriptionTier, opts: { withQuest?: boolean; game?: Game } = {}) {
  const rig = questRig();
  const stored: { game: Game } = {
    game:
      opts.game ??
      ({
        id: GAME_ID,
        userId: USER_ID,
        themeId: 'MATH_CHALLENGE',
        difficulty: 1,
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
    incrementUsage: jest.fn(async () => ({ count: 1, resetAt: new Date('2026-01-16T00:00:00.000Z') })),
    getTierLimit: jest.fn(() => 100),
    getUsage: rig.rateLimiter.getUsage,
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
    opts.withQuest === false ? undefined : (rig.service as QuestService)
  );
  return { service, rig, gameRepository, themeRepository, rateLimiter, eventPublisher, stored };
}

let questMetric: jest.SpyInstance;

beforeEach(() => {
  jest.spyOn(metricsPublisher, 'publishGameStarted').mockResolvedValue(undefined);
  jest.spyOn(metricsPublisher, 'publishGameCompleted').mockResolvedValue(undefined);
  questMetric = jest.spyOn(metricsPublisher, 'publishQuestMetric').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const bp01 = { worldId: 'brain-peaks', nodeId: 'bp-01-memory', legIndex: 0 };

function expectNoAllowanceConsumed(h: ReturnType<typeof harness>): void {
  expect(h.rateLimiter.checkLimit).not.toHaveBeenCalled();
  expect(h.rateLimiter.incrementUsage).not.toHaveBeenCalled();
  expect(h.themeRepository.validateTheme).not.toHaveBeenCalled();
  expect(h.gameRepository.create).not.toHaveBeenCalled();
}

describe('startGame with questContext', () => {
  it('validates BEFORE the rate limit, persists the stripped context and counts the start', async () => {
    const h = harness(SubscriptionTier.Free);
    const result = await h.service.startGame(USER_ID, {
      themeId: 'ANIMALS',
      difficulty: 1,
      questContext: { ...bp01, injected: 'x' },
    });

    expect(h.gameRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ themeId: 'ANIMALS', difficulty: 1, questContext: bp01 })
    );
    expect(result.game.questContext).toEqual(bp01);
    expect(h.rig.catalog.listAvailableGames.mock.invocationCallOrder[0]).toBeLessThan(
      h.rateLimiter.checkLimit.mock.invocationCallOrder[0]
    );
    expect(questMetric).toHaveBeenCalledWith('QuestNodeStarted', 'brain-peaks');
    expect(h.rateLimiter.incrementUsage).toHaveBeenCalledTimes(1);
  });

  const failures: [string, SubscriptionTier, string, number, unknown][] = [
    ['garbage context', SubscriptionTier.Premium, 'ANIMALS', 1, 'not-an-object'],
    ['unknown world', SubscriptionTier.Premium, 'ANIMALS', 1, { ...bp01, worldId: 'nope' }],
    ['unknown node', SubscriptionTier.Premium, 'ANIMALS', 1, { ...bp01, nodeId: 'nope' }],
    ['locked node', SubscriptionTier.Premium, 'MATH_CHALLENGE', 1, { ...bp01, nodeId: 'bp-02-math' }],
    ['theme mismatch', SubscriptionTier.Premium, 'FRUITS', 1, bp01],
    ['difficulty mismatch', SubscriptionTier.Premium, 'ANIMALS', 2, bp01],
    [
      'World 2 for a FREE user',
      SubscriptionTier.Free,
      'BOND_AND_BURN',
      1,
      { worldId: 'science-island', nodeId: 'si-01-bond-burn', legIndex: 0 },
    ],
  ];

  it.each(failures)('%s -> generic error and no allowance consumed', async (_n, tier, themeId, difficulty, ctx) => {
    const h = harness(tier);
    await expect(
      h.service.startGame(USER_ID, { themeId, difficulty, questContext: ctx })
    ).rejects.toMatchObject({ message: QUEST_UNAVAILABLE_MESSAGE });
    await expect(
      h.service.startGame(USER_ID, { themeId, difficulty, questContext: ctx })
    ).rejects.toBeInstanceOf(ValidationError);
    expectNoAllowanceConsumed(h);
    expect(questMetric).not.toHaveBeenCalled();
  });

  it('World 2 starts for a paid tier when the node is unlocked', async () => {
    const h = harness(SubscriptionTier.Light);
    h.rig.repo.seed({
      ...clearedWorld('science-island', 1, []),
      nodes: { 'si-01-bond-burn': clearedWorld('science-island', 1).nodes['si-01-bond-burn'] },
    });
    const result = await h.service.startGame(USER_ID, {
      themeId: 'SPACE_ENTRY',
      difficulty: 1,
      questContext: { worldId: 'science-island', nodeId: 'si-02-space-entry', legIndex: 0 },
    });
    expect(result.game.themeId).toBe('SPACE_ENTRY');
    expect(h.rateLimiter.incrementUsage).toHaveBeenCalledTimes(1);
  });

  it('cannot bypass the paywall: a FREE user keeps hitting the paid-game gate', async () => {
    const plain = harness(SubscriptionTier.Free);
    await expect(
      plain.service.startGame(USER_ID, { themeId: 'SPACE_ENTRY', difficulty: 1 })
    ).rejects.toBeInstanceOf(AuthorizationError);

    // The same paid game behind a quest context is still refused (generic, nothing consumed).
    const quest = harness(SubscriptionTier.Free);
    const attempt = quest.service.startGame(USER_ID, {
      themeId: 'SPACE_ENTRY',
      difficulty: 1,
      questContext: { worldId: 'science-island', nodeId: 'si-02-space-entry', legIndex: 0 },
    });
    await expect(attempt).rejects.toMatchObject({ message: QUEST_UNAVAILABLE_MESSAGE });
    expectNoAllowanceConsumed(quest);

    // A World 1 context cannot smuggle a paid game either (leg mismatch).
    const smuggle = harness(SubscriptionTier.Free);
    await expect(
      smuggle.service.startGame(USER_ID, { themeId: 'MINI_GOLF', difficulty: 1, questContext: bp01 })
    ).rejects.toMatchObject({ message: QUEST_UNAVAILABLE_MESSAGE });
    expectNoAllowanceConsumed(smuggle);
  });

  it('quest context without QuestService fails closed (R-START-6)', async () => {
    const h = harness(SubscriptionTier.Premium, { withQuest: false });
    await expect(
      h.service.startGame(USER_ID, { themeId: 'ANIMALS', difficulty: 1, questContext: bp01 })
    ).rejects.toMatchObject({ message: QUEST_UNAVAILABLE_MESSAGE });
    expectNoAllowanceConsumed(h);
  });
});

describe('startGame without questContext is unchanged (FR-QM-19)', () => {
  it('creates exactly the same record as before and publishes no quest metric', async () => {
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
    expect(Object.keys(h.gameRepository.create.mock.calls[0][0])).not.toContain('questContext');
    expect(h.rig.catalog.listAvailableGames).not.toHaveBeenCalled();
    expect(questMetric).not.toHaveBeenCalled();
  });

  it('treats a null questContext as absent', async () => {
    const h = harness(SubscriptionTier.Premium, { withQuest: false });
    await expect(
      h.service.startGame(USER_ID, { themeId: 'ANIMALS', difficulty: 1, questContext: null })
    ).resolves.toBeDefined();
  });

  it('still enforces the paid-game and super-hard gates for FREE users', async () => {
    const h = harness(SubscriptionTier.Free);
    await expect(
      h.service.startGame(USER_ID, { themeId: 'CIRCUIT_BUILDER', difficulty: 1 })
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      h.service.startGame(USER_ID, { themeId: 'ANIMALS', difficulty: 4 })
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('PAID_GAME_THEME_IDS holds exactly the ids of the former local constant', () => {
    expect([...PAID_GAME_THEME_IDS].sort()).toEqual(
      [
        'SPACE_ENTRY',
        'SCRATCH_CODING',
        'BOND_AND_BURN',
        'TRAFFIC_LAB',
        'MINI_GOLF',
        'LANGUAGE_PRONUNCIATION',
        'CIRCUIT_BUILDER',
      ].sort()
    );
  });
});

describe('completeGame hook - generic exit', () => {
  const MATH = {
    gameId: GAME_ID,
    completionTime: 60,
    attempts: 10,
    correctAnswers: 9,
    totalQuestions: 10,
  };
  const questMath = () =>
    questGame(GAME_ID, { worldId: 'brain-peaks', nodeId: 'bp-02-math', legIndex: 0 }, 'MATH_CHALLENGE', 1);

  it('returns quest with stars computed from the SERVER score', async () => {
    const h = harness(SubscriptionTier.Premium, { game: questMath() });
    const response = await h.service.completeGame(USER_ID, MATH, 'player');

    const thresholds = getNode(getWorld('brain-peaks')!, 'bp-02-math')!.thresholds;
    const serverScore = response.game.score as number;
    expect(response.quest).toBeDefined();
    expect(response.quest).toMatchObject({
      worldId: 'brain-peaks',
      nodeId: 'bp-02-math',
      score: serverScore,
      stars: starsForScore(thresholds, serverScore),
      bestStars: starsForScore(thresholds, serverScore),
    });
    expect(h.rig.repo.stored('brain-peaks')!.nodes['bp-02-math'].bestScore).toBe(serverScore);
  });

  it('is fail-soft: a progress write failure still completes the game without quest', async () => {
    const h = harness(SubscriptionTier.Premium, { game: questMath() });
    h.rig.repo.failWith = new Error('dynamo down');
    const response = await h.service.completeGame(USER_ID, MATH, 'player');
    expect(response.quest).toBeUndefined();
    expect(response.game.status).toBe(GameStatus.Completed);
    expect(h.eventPublisher.publishGameCompleted).toHaveBeenCalledTimes(1);
    expect(questMetric).toHaveBeenCalledWith('QuestProgressWriteFailed', 'brain-peaks');
  });

  it('is fail-soft even if the quest service itself throws', async () => {
    const h = harness(SubscriptionTier.Premium, { game: questMath() });
    jest.spyOn(h.rig.service, 'applyCompletion').mockRejectedValue(new Error('unexpected'));
    const response = await h.service.completeGame(USER_ID, MATH, 'player');
    expect(response.quest).toBeUndefined();
    expect(response.game.status).toBe(GameStatus.Completed);
  });

  it('non-quest games take no quest I/O and carry no quest field', async () => {
    const h = harness(SubscriptionTier.Premium);
    const apply = jest.spyOn(h.rig.service, 'applyCompletion');
    const response = await h.service.completeGame(USER_ID, MATH, 'player');
    expect(response).not.toHaveProperty('quest');
    expect(apply).not.toHaveBeenCalled();
    expect(h.rig.repo.getCalls).toBe(0);
    expect(h.rig.catalog.listAvailableGames).not.toHaveBeenCalled();
  });

  it('a quest game completes normally when no QuestService is injected', async () => {
    const h = harness(SubscriptionTier.Premium, { game: questMath(), withQuest: false });
    const response = await h.service.completeGame(USER_ID, MATH, 'player');
    expect(response).not.toHaveProperty('quest');
    expect(response.game.status).toBe(GameStatus.Completed);
  });
});

describe('completeGame hook - Circuit Builder exit', () => {
  const circuitGame = () =>
    questGame(
      GAME_ID,
      { worldId: 'science-island', nodeId: 'si-03-circuit-series', legIndex: 0 },
      'CIRCUIT_BUILDER',
      1
    );
  const input = () => ({
    gameId: GAME_ID,
    completionTime: 60,
    attempts: 1,
    circuitSubmission: submissionPayload(),
  });

  it('calls the hook with the verified server score and level, and returns quest', async () => {
    const h = harness(SubscriptionTier.Premium, { game: circuitGame() });
    const payload = {
      worldId: 'science-island',
      nodeId: 'si-03-circuit-series',
      kind: 'GAME',
      score: 1,
      thresholds: [1, 2, 3],
      stars: 1,
      bestStars: 1,
      newlyUnlocked: [],
      worldCleared: false,
      badgesAwarded: [],
    } as any;
    const apply = jest.spyOn(h.rig.service, 'applyCompletion').mockResolvedValue(payload);

    const response = await h.service.completeGame(USER_ID, input(), 'player');

    expect(response.quest).toBe(payload);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ id: GAME_ID, themeId: 'CIRCUIT_BUILDER' }),
      response.game.score,
      { levelId: 'cb-01-closed-circuit' }
    );
  });

  it('omits quest (no write) when the verified level is not the leg level', async () => {
    const h = harness(SubscriptionTier.Premium, { game: circuitGame() });
    const response = await h.service.completeGame(USER_ID, input(), 'player');
    expect(response.game.status).toBe(GameStatus.Completed);
    expect(response.quest).toBeUndefined();
    expect(h.rig.repo.saveCalls).toHaveLength(0);
  });

  it('is fail-soft when the progress write fails', async () => {
    const h = harness(SubscriptionTier.Premium, { game: circuitGame() });
    jest.spyOn(h.rig.service, 'applyCompletion').mockRejectedValue(new Error('unexpected'));
    const response = await h.service.completeGame(USER_ID, input(), 'player');
    expect(response.quest).toBeUndefined();
    expect(h.eventPublisher.publishGameCompleted).toHaveBeenCalledTimes(1);
  });
});
