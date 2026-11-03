/**
 * Boss gauntlet end to end on the server (FR-QM-10): GameService + the REAL GameRepository over an
 * in-memory table + the real QuestService. The table stores the game under `gameId` (as DynamoDB
 * does), so these tests catch code that reads a `game.id` the stored item does not have.
 *
 * Regression: for the reporting player, leg 0 of the World 1 boss was never recorded, so "Next leg"
 * was rejected (ATTEMPT_EXPIRED) and Play restarted leg 0.
 */
jest.mock('@aws-sdk/lib-dynamodb', () => {
  const command = (name: string) => ({ [name]: class { constructor(public input: any) {} } })[name];
  const send = jest.fn();
  return {
    __send: send,
    DynamoDBDocumentClient: { from: () => ({ send }) },
    PutCommand: command('PutCommand'),
    GetCommand: command('GetCommand'),
    UpdateCommand: command('UpdateCommand'),
    QueryCommand: command('QueryCommand'),
    DeleteCommand: command('DeleteCommand'),
  };
});

import { SubscriptionTier } from '@memory-game/shared';
import type { WorldProgress } from '@memory-game/shared';
import { GameRepository } from '../../../src/repositories/game.repository';
import { GameService } from '../../../src/services/game.service';
import { ScoreCalculatorService } from '../../../src/services/score-calculator.service';
import { QUEST_UNAVAILABLE_MESSAGE } from '../../../src/services/quest.service';
import type { QuestService } from '../../../src/services/quest.service';
import type { ThemeRepository } from '../../../src/repositories/theme.repository';
import type { SubscriptionRepository } from '../../../src/repositories/subscription.repository';
import type { RateLimiterService } from '../../../src/services/rate-limiter.service';
import type { AchievementTrackerService } from '../../../src/services/achievement-tracker.service';
import type { EventPublisherService } from '../../../src/services/event-publisher.service';
import { metricsPublisher } from '../../../src/utils/metrics';
import { MIN, USER_ID, clearedWorld, questRig } from '../quest-fixtures';

const send = (jest.requireMock('@aws-sdk/lib-dynamodb') as { __send: jest.Mock }).__send;
const BP = 'brain-peaks';
const leg = (legIndex: number) => ({ worldId: BP, nodeId: 'bp-boss', legIndex });
const MATH = { completionTime: 60, attempts: 10, correctAnswers: 9, totalQuestions: 10 };
const BUBBLE = { completionTime: 60, attempts: 10, correctAnswers: 9, totalQuestions: 10 };

function harness() {
  const table = new Map<string, any>();
  send.mockReset();
  send.mockImplementation(async (cmd: any) => {
    const { input } = cmd;
    switch (cmd.constructor.name) {
      case 'PutCommand':
        table.set(input.Item.gameId, { ...input.Item });
        return {};
      case 'GetCommand':
        return { Item: table.has(input.Key.gameId) ? { ...table.get(input.Key.gameId) } : undefined };
      case 'UpdateCommand': {
        const item = table.get(input.Key.gameId);
        for (const [name, key] of Object.entries<string>(input.ExpressionAttributeNames)) {
          item[key] = input.ExpressionAttributeValues[name.replace('#', ':')];
        }
        return { Attributes: { ...item } };
      }
      default:
        throw new Error(`unexpected ${cmd.constructor.name}`);
    }
  });

  const rig = questRig();
  const world: WorldProgress = clearedWorld(BP, 1, ['bp-boss']);
  rig.repo.seed(world);
  const service = new GameService(
    new GameRepository(),
    { validateTheme: jest.fn(async () => true) } as unknown as ThemeRepository,
    { getTier: jest.fn(async () => SubscriptionTier.Premium) } as unknown as SubscriptionRepository,
    new ScoreCalculatorService(),
    {
      checkLimit: jest.fn(async () => undefined),
      incrementUsage: jest.fn(async () => ({ count: 1, resetAt: new Date('2026-01-16T00:00:00.000Z') })),
      getTierLimit: jest.fn(() => 100),
      getUsage: rig.rateLimiter.getUsage,
    } as unknown as RateLimiterService,
    { trackCompletion: jest.fn(async () => []) } as unknown as AchievementTrackerService,
    { publishGameCompleted: jest.fn(async () => undefined) } as unknown as EventPublisherService,
    rig.service as QuestService
  );
  const start = (themeId: string, legIndex: number) =>
    service.startGame(USER_ID, { themeId, difficulty: 2, questContext: leg(legIndex) } as any);
  const complete = (gameId: string, extra: typeof MATH) =>
    service.completeGame(USER_ID, { gameId, ...extra } as any, 'player');
  return { rig, start, complete, table };
}

beforeEach(() => {
  jest.spyOn(metricsPublisher, 'publishGameStarted').mockResolvedValue(undefined);
  jest.spyOn(metricsPublisher, 'publishGameCompleted').mockResolvedValue(undefined);
  jest.spyOn(metricsPublisher, 'publishQuestMetric').mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('boss gauntlet through the real game repository (FR-QM-10)', () => {
  it('leg 0 is recorded with its game id and leg 1 can then start for the same attempt', async () => {
    const h = harness();
    const first = await h.start('MATH_CHALLENGE', 0);
    const done = await h.complete(first.game.id, MATH);

    expect(done.quest?.gauntlet).toMatchObject({ status: 'IN_PROGRESS', legIndex: 0, nextLeg: { themeId: 'BUBBLE_POP' } });
    const attempt = h.rig.repo.stored(BP)!.activeGauntlet!;
    expect(attempt.legs).toHaveLength(1);
    expect(attempt.legs[0].gameId).toBe(first.game.id);
    expect(attempt.legs[0].gameId).toEqual(expect.any(String));

    h.rig.clock.now += 20 * MIN;
    await expect(h.start('BUBBLE_POP', 1)).resolves.toMatchObject({ game: { questContext: leg(1) } });
  });

  it('finishing leg 1 completes the gauntlet with the combined score', async () => {
    const h = harness();
    const first = await h.start('MATH_CHALLENGE', 0);
    const one = await h.complete(first.game.id, MATH);
    h.rig.clock.now += 5 * MIN;
    const second = await h.start('BUBBLE_POP', 1);
    const two = await h.complete(second.game.id, BUBBLE);

    expect(two.quest?.gauntlet).toMatchObject({ status: 'COMPLETE', legIndex: 1, legsTotal: 2 });
    expect(two.quest!.score).toBe((one.quest!.score as number) + (two.game.score as number));
    expect(h.rig.repo.stored(BP)!.activeGauntlet).toBeUndefined();
    expect(h.rig.repo.stored(BP)!.nodes['bp-boss'].lastGameId).toBe(second.game.id);
  });

  it('a second leg 0 game replaces a stale, expired attempt (nothing is treated as a duplicate)', async () => {
    const h = harness();
    const old = h.rig.repo.stored(BP)!;
    old.activeGauntlet = {
      nodeId: 'bp-boss',
      legs: [{ score: 1315 }] as any, // as stored in prod: no gameId
      startedAt: new Date(h.rig.clock.now - 24 * 60 * MIN).toISOString(),
      lastActivityAt: new Date(h.rig.clock.now - 24 * 60 * MIN).toISOString(),
    };
    const game = await h.start('MATH_CHALLENGE', 0);
    const done = await h.complete(game.game.id, MATH);

    expect(done.quest?.gauntlet?.status).toBe('IN_PROGRESS');
    const attempt = h.rig.repo.stored(BP)!.activeGauntlet!;
    expect(attempt.legs[0]).toMatchObject({ gameId: game.game.id, score: done.game.score });
    expect(attempt.lastActivityAt).toBe(new Date(h.rig.clock.now).toISOString());
  });

  it('rejects leg 1 without a completed leg 0 of the same attempt', async () => {
    const h = harness();
    await expect(h.start('BUBBLE_POP', 1)).rejects.toMatchObject({ message: QUEST_UNAVAILABLE_MESSAGE });
    // leg 0 started but not completed is still not an attempt
    await h.start('MATH_CHALLENGE', 0);
    await expect(h.start('BUBBLE_POP', 1)).rejects.toMatchObject({ message: QUEST_UNAVAILABLE_MESSAGE });
  });

  it('rejects leg 1 once the attempt is 30 minutes old, and leg 0 is accepted again', async () => {
    const h = harness();
    const first = await h.start('MATH_CHALLENGE', 0);
    await h.complete(first.game.id, MATH);
    h.rig.clock.now += 30 * MIN;
    await expect(h.start('BUBBLE_POP', 1)).rejects.toMatchObject({ message: QUEST_UNAVAILABLE_MESSAGE });
    await expect(h.start('MATH_CHALLENGE', 0)).resolves.toBeDefined();
  });

  it('expiry is checked at leg start only: a started leg 1 finished late still completes', async () => {
    const h = harness();
    const first = await h.start('MATH_CHALLENGE', 0);
    await h.complete(first.game.id, MATH);
    h.rig.clock.now += 5 * MIN;
    const second = await h.start('BUBBLE_POP', 1);
    // the attempt expires while leg 1 is being played
    h.rig.clock.now += 40 * MIN;
    const late = await h.complete(second.game.id, BUBBLE);
    expect(late.quest?.gauntlet).toMatchObject({ status: 'COMPLETE' });
  });
});
