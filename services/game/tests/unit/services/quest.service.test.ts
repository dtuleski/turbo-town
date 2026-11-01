/**
 * QM2 - QuestService: start validation (R-START-*), completion (R-DONE-*), read model (R-VIEW-*).
 *
 * The pure rules are tested in packages/shared. Here the service is exercised against an
 * in-memory repository that enforces the same optimistic lock as the real one.
 */
import { SubscriptionTier, ValidationError } from '@memory-game/shared';
import type { QuestContext } from '@memory-game/shared';
import { QUEST_UNAVAILABLE_MESSAGE } from '../../../src/services/quest.service';
import { QuestVersionConflictError } from '../../../src/repositories/quest-progress.repository';
import { metricsPublisher } from '../../../src/utils/metrics';
import {
  MIN,
  T0,
  USER_ID,
  clearedWorld,
  nodeProgress,
  questGame,
  questRig,
} from '../quest-fixtures';

const BP = 'brain-peaks';
const SI = 'science-island';
const ctx = (worldId: string, nodeId: string, legIndex = 0): QuestContext => ({
  worldId,
  nodeId,
  legIndex,
});

let metric: jest.SpyInstance;

beforeEach(() => {
  metric = jest.spyOn(metricsPublisher, 'publishQuestMetric').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('validateStart - rejection matrix (R-START-1, R-START-4, FR-QM-8)', () => {
  const premium = SubscriptionTier.Premium;

  const cases: [string, SubscriptionTier, unknown, string, number][] = [
    ['not an object', premium, 'brain-peaks', 'ANIMALS', 1],
    ['null', premium, null, 'ANIMALS', 1],
    ['missing field', premium, { worldId: BP, nodeId: 'bp-01-memory' }, 'ANIMALS', 1],
    ['id fails the regex', premium, { worldId: BP, nodeId: 'BP-01_MEMORY', legIndex: 0 }, 'ANIMALS', 1],
    ['legIndex is a string', premium, { worldId: BP, nodeId: 'bp-01-memory', legIndex: '0' }, 'ANIMALS', 1],
    ['legIndex above 2', premium, { worldId: BP, nodeId: 'bp-01-memory', legIndex: 3 }, 'ANIMALS', 1],
    ['unknown world', premium, ctx('nope', 'bp-01-memory'), 'ANIMALS', 1],
    ['unknown node', premium, ctx(BP, 'nope'), 'ANIMALS', 1],
    ['node from another world', premium, ctx(BP, 'si-01-bond-burn'), 'BOND_AND_BURN', 1],
    ['legIndex beyond the node legs', premium, ctx(BP, 'bp-01-memory', 1), 'ANIMALS', 1],
    ['World 2 for FREE', SubscriptionTier.Free, ctx(SI, 'si-01-bond-burn'), 'BOND_AND_BURN', 1],
    ['theme mismatch', premium, ctx(BP, 'bp-01-memory'), 'FRUITS', 1],
    ['difficulty mismatch', premium, ctx(BP, 'bp-01-memory'), 'ANIMALS', 2],
    ['locked node', premium, ctx(BP, 'bp-02-math'), 'MATH_CHALLENGE', 1],
    ['boss leg 1 without an attempt', premium, ctx(BP, 'bp-boss', 1), 'BUBBLE_POP', 2],
  ];

  it.each(cases)('%s -> the one generic error, no write', async (_name, tier, raw, themeId, difficulty) => {
    const rig = questRig();
    rig.repo.seed(clearedWorld(BP, 1, ['bp-boss', 'bp-02-math', 'bp-01-memory']));
    // bp-01 has no stars here, so it is AVAILABLE; bp-02 is LOCKED.
    await expect(
      rig.service.validateStart(USER_ID, tier, raw, themeId, difficulty)
    ).rejects.toMatchObject({ message: QUEST_UNAVAILABLE_MESSAGE });
    await expect(
      rig.service.validateStart(USER_ID, tier, raw, themeId, difficulty)
    ).rejects.toBeInstanceOf(ValidationError);
    expect(rig.repo.saveCalls).toHaveLength(0);
    expect(metric).not.toHaveBeenCalled();
  });

  it('refuses a node whose game left the catalog', async () => {
    const rig = questRig(['memory-match']);
    await expect(
      rig.service.validateStart(USER_ID, SubscriptionTier.Premium, ctx(BP, 'bp-01-memory'), 'ANIMALS', 1)
    ).rejects.toMatchObject({ message: QUEST_UNAVAILABLE_MESSAGE });
  });

  it('accepts the first node, stripping unknown keys', async () => {
    const rig = questRig();
    const result = await rig.service.validateStart(
      USER_ID,
      SubscriptionTier.Free,
      { ...ctx(BP, 'bp-01-memory'), stars: 3, extra: 'x' },
      'ANIMALS',
      1
    );
    expect(result).toEqual({
      worldId: BP,
      nodeId: 'bp-01-memory',
      legIndex: 0,
      context: ctx(BP, 'bp-01-memory'),
    });
    expect(result.context).not.toHaveProperty('stars');
  });

  it('World 2 opens for a paid tier once the first node is reachable', async () => {
    const rig = questRig();
    await expect(
      rig.service.validateStart(USER_ID, SubscriptionTier.Light, ctx(SI, 'si-01-bond-burn'), 'BOND_AND_BURN', 1)
    ).resolves.toMatchObject({ worldId: SI });
  });

  it('a starred node can be replayed even when its predecessor has no stars', async () => {
    const rig = questRig();
    rig.repo.seed(clearedWorld(BP, 1, ['bp-boss', 'bp-02-math']));
    await expect(
      rig.service.validateStart(USER_ID, SubscriptionTier.Free, ctx(BP, 'bp-03-words'), 'WORD_PUZZLE', 1)
    ).resolves.toBeDefined();
  });

  it('fails the request (not the generic message) when the progress read fails', async () => {
    const rig = questRig();
    rig.repo.failWith = new Error('boom');
    await expect(
      rig.service.validateStart(USER_ID, SubscriptionTier.Free, ctx(BP, 'bp-01-memory'), 'ANIMALS', 1)
    ).rejects.toThrow('boom');
  });
});

describe('validateStart - boss gauntlet order and expiry (R-START-5)', () => {
  const bossReady = () => {
    const rig = questRig();
    const progress = clearedWorld(BP, 1, ['bp-boss']);
    progress.activeGauntlet = {
      nodeId: 'bp-boss',
      legs: [{ gameId: 'g0', score: 3000 }],
      startedAt: new Date(T0).toISOString(),
      lastActivityAt: new Date(T0).toISOString(),
    };
    rig.repo.seed(progress);
    return rig;
  };

  it('allows leg 1 after leg 0 inside the window (minute 29)', async () => {
    const rig = bossReady();
    rig.clock.now = T0 + 29 * MIN;
    await expect(
      rig.service.validateStart(USER_ID, SubscriptionTier.Free, ctx(BP, 'bp-boss', 1), 'BUBBLE_POP', 2)
    ).resolves.toMatchObject({ legIndex: 1 });
  });

  it('rejects leg 1 after 30 minutes idle (minute 31)', async () => {
    const rig = bossReady();
    rig.clock.now = T0 + 31 * MIN;
    await expect(
      rig.service.validateStart(USER_ID, SubscriptionTier.Free, ctx(BP, 'bp-boss', 1), 'BUBBLE_POP', 2)
    ).rejects.toMatchObject({ message: QUEST_UNAVAILABLE_MESSAGE });
  });

  it('rejects skipping a leg on the three-leg boss', async () => {
    const rig = questRig();
    const progress = clearedWorld(SI, 1, ['si-boss']);
    progress.activeGauntlet = {
      nodeId: 'si-boss',
      legs: [{ gameId: 'g0', score: 1 }],
      startedAt: new Date(T0).toISOString(),
      lastActivityAt: new Date(T0).toISOString(),
    };
    rig.repo.seed(progress);
    await expect(
      rig.service.validateStart(USER_ID, SubscriptionTier.Premium, ctx(SI, 'si-boss', 2), 'TRAFFIC_LAB', 2)
    ).rejects.toMatchObject({ message: QUEST_UNAVAILABLE_MESSAGE });
  });

  it('does not write the attempt at start (R-START-8)', async () => {
    const rig = questRig();
    rig.repo.seed(clearedWorld(BP, 1, ['bp-boss']));
    await rig.service.validateStart(USER_ID, SubscriptionTier.Free, ctx(BP, 'bp-boss', 0), 'MATH_CHALLENGE', 2);
    expect(rig.repo.saveCalls).toHaveLength(0);
  });
});

describe('applyCompletion - plain nodes (R-DONE-3, R-DONE-4)', () => {
  const game = (id: string) => questGame(id, ctx(BP, 'bp-02-math'), 'MATH_CHALLENGE', 1);

  it('computes stars from the given server score and saves version 1', async () => {
    const rig = questRig();
    rig.repo.seed(clearedWorld(BP, 1, ['bp-02-math', 'bp-03-words', 'bp-boss', 'bp-04-sequence', 'bp-05-geo', 'bp-06-maze', 'bp-07-memory-hard']));
    const result = await rig.service.applyCompletion(USER_ID, game('a'), 2400);
    expect(result).toMatchObject({
      worldId: BP,
      nodeId: 'bp-02-math',
      kind: 'GAME',
      score: 2400,
      stars: 2,
      bestStars: 2,
      thresholds: [1800, 2350, 2650],
      newlyUnlocked: ['bp-03-words'],
      worldCleared: false,
    });
    expect(rig.repo.stored(BP)!.nodes['bp-02-math']).toMatchObject({ stars: 2, bestScore: 2400, lastGameId: 'a' });
    expect(metric).toHaveBeenCalledWith('QuestNodeCleared', BP);
  });

  it('keeps the best result under a lower replay (monotonic)', async () => {
    const rig = questRig();
    await rig.service.applyCompletion(USER_ID, game('a'), 2700); // 3 stars
    const replay = await rig.service.applyCompletion(USER_ID, game('b'), 1900); // 1 star
    expect(replay).toMatchObject({ stars: 1, bestStars: 3, newlyUnlocked: [] });
    const saved = rig.repo.stored(BP)!.nodes['bp-02-math'];
    expect(saved).toMatchObject({ stars: 3, bestScore: 2700, lastGameId: 'b' });
    metric.mockClear();
    await rig.service.applyCompletion(USER_ID, game('c'), 2800);
    expect(metric).not.toHaveBeenCalledWith('QuestNodeCleared', BP); // already cleared before
  });

  it('survives a simulated version conflict without lowering the best (one retry)', async () => {
    const rig = questRig();
    rig.repo.concurrentWriter = (repo) => {
      const other = clearedWorld(BP, 1, []);
      other.nodes = { 'bp-02-math': nodeProgress(3, 2700, { lastGameId: 'other' }) };
      repo.seed({ ...other, version: 1 });
    };
    const result = await rig.service.applyCompletion(USER_ID, game('a'), 1900);
    expect(result).toMatchObject({ stars: 1, bestStars: 3 });
    expect(rig.repo.saveCalls.map((c) => c.expected)).toEqual([0, 1]);
    expect(rig.repo.stored(BP)).toMatchObject({ version: 2 });
    expect(rig.repo.stored(BP)!.nodes['bp-02-math']).toMatchObject({ stars: 3, bestScore: 2700 });
  });

  it('is fail-soft after a second conflict: no quest result, logged metric', async () => {
    const rig = questRig();
    const save = jest.spyOn(rig.repo, 'saveWorld').mockRejectedValue(new QuestVersionConflictError());
    await expect(rig.service.applyCompletion(USER_ID, game('a'), 2400)).resolves.toBeUndefined();
    expect(save).toHaveBeenCalledTimes(2);
    expect(metric).toHaveBeenCalledWith('QuestProgressWriteFailed', BP);
  });

  it('is fail-soft on a repository error (never throws)', async () => {
    const rig = questRig();
    rig.repo.failWith = new Error('dynamo down');
    await expect(rig.service.applyCompletion(USER_ID, game('a'), 2400)).resolves.toBeUndefined();
    expect(metric).toHaveBeenCalledWith('QuestProgressWriteFailed', BP);
  });

  it('is fail-soft when the catalog read fails', async () => {
    const rig = questRig();
    rig.catalog.listAvailableGames.mockRejectedValueOnce(new Error('catalog down'));
    await expect(rig.service.applyCompletion(USER_ID, game('a'), 2400)).resolves.toBeUndefined();
  });

  it('a duplicate completion of the same gameId changes nothing', async () => {
    const rig = questRig();
    await rig.service.applyCompletion(USER_ID, game('a'), 2400);
    const again = await rig.service.applyCompletion(USER_ID, game('a'), 2400);
    expect(rig.repo.saveCalls).toHaveLength(1);
    expect(again).toMatchObject({ stars: 2, bestStars: 2, newlyUnlocked: [], badgesAwarded: [] });
  });

  it('returns undefined with no I/O when the game has no questContext', async () => {
    const rig = questRig();
    const plain = questGame('a', ctx(BP, 'bp-02-math'), 'MATH_CHALLENGE', 1, { questContext: undefined });
    await expect(rig.service.applyCompletion(USER_ID, plain, 2400)).resolves.toBeUndefined();
    expect(rig.repo.getCalls).toBe(0);
    expect(rig.catalog.listAvailableGames).not.toHaveBeenCalled();
  });

  it('skips a game whose theme or difficulty drifted from the config (LEG_DRIFT)', async () => {
    const rig = questRig();
    const drifted = questGame('a', ctx(BP, 'bp-02-math'), 'MATH_CHALLENGE', 2);
    await expect(rig.service.applyCompletion(USER_ID, drifted, 2400)).resolves.toBeUndefined();
    expect(rig.repo.saveCalls).toHaveLength(0);
    expect(metric).not.toHaveBeenCalledWith('QuestProgressWriteFailed', expect.anything());
  });

  it('skips a Circuit Builder game whose level no longer matches the leg', async () => {
    const rig = questRig();
    const cb = questGame('a', ctx(SI, 'si-03-circuit-series'), 'CIRCUIT_BUILDER', 2);
    await expect(
      rig.service.applyCompletion(USER_ID, cb, 3000, { levelId: 'cb-01-closed-circuit' })
    ).resolves.toBeUndefined();
    await expect(
      rig.service.applyCompletion(USER_ID, cb, 4000, { levelId: 'cb-03-series-loop' })
    ).resolves.toMatchObject({ nodeId: 'si-03-circuit-series', stars: 3 });
  });

  it('awards the world badge and reports worldCleared once', async () => {
    const rig = questRig();
    rig.repo.seed(clearedWorld(BP, 1, ['bp-boss']));
    const boss = (id: string, leg: number, theme: string) =>
      questGame(id, ctx(BP, 'bp-boss', leg), theme, 2);
    await rig.service.applyCompletion(USER_ID, boss('g0', 0, 'MATH_CHALLENGE'), 3000);
    rig.clock.now += 5 * MIN;
    const done = await rig.service.applyCompletion(USER_ID, boss('g1', 1, 'BUBBLE_POP'), 3000);
    expect(done).toMatchObject({ worldCleared: true, badgesAwarded: ['WORLD_CLEARED'] });
    expect(metric).toHaveBeenCalledWith('QuestWorldCleared', BP);
    expect(rig.repo.stored(BP)!.badges).toContain('WORLD_CLEARED');
  });
});

describe('applyCompletion - boss gauntlet (R-DONE-6, R-DONE-7)', () => {
  const leg = (id: string, index: number) =>
    questGame(id, ctx(BP, 'bp-boss', index), index === 0 ? 'MATH_CHALLENGE' : 'BUBBLE_POP', 2);
  const rigWithBossOpen = () => {
    const rig = questRig();
    rig.repo.seed(clearedWorld(BP, 1, ['bp-boss']));
    return rig;
  };

  it('leg 0 stores the attempt and reports IN_PROGRESS with the next leg and 0 stars', async () => {
    const rig = rigWithBossOpen();
    const result = await rig.service.applyCompletion(USER_ID, leg('g0', 0), 3000);
    expect(result).toMatchObject({
      kind: 'BOSS',
      stars: 0,
      gauntlet: {
        legIndex: 0,
        legsTotal: 2,
        status: 'IN_PROGRESS',
        nextLeg: { themeId: 'BUBBLE_POP', difficulty: 2 },
      },
    });
    expect(rig.repo.stored(BP)!.activeGauntlet).toMatchObject({
      nodeId: 'bp-boss',
      legs: [{ gameId: 'g0', score: 3000 }],
    });
    expect(rig.repo.stored(BP)!.nodes['bp-boss']).toBeUndefined();
  });

  it('the last leg scores the COMBINED score and clears the attempt', async () => {
    const rig = rigWithBossOpen();
    await rig.service.applyCompletion(USER_ID, leg('g0', 0), 3500);
    rig.clock.now += 5 * MIN;
    const done = await rig.service.applyCompletion(USER_ID, leg('g1', 1), 3600); // 7100 -> 2 stars
    expect(done).toMatchObject({
      score: 7100,
      stars: 2,
      bestStars: 2,
      gauntlet: { status: 'COMPLETE', legIndex: 1, legsTotal: 2 },
    });
    const saved = rig.repo.stored(BP)!;
    expect(saved.activeGauntlet).toBeUndefined();
    expect(saved.nodes['bp-boss']).toMatchObject({ stars: 2, bestScore: 7100, lastGameId: 'g1' });
  });

  it('duplicate non-final leg completion keeps the attempt and writes nothing', async () => {
    const rig = rigWithBossOpen();
    await rig.service.applyCompletion(USER_ID, leg('g0', 0), 3000);
    const before = rig.repo.saveCalls.length;
    const dup = await rig.service.applyCompletion(USER_ID, leg('g0', 0), 3000);
    expect(rig.repo.saveCalls).toHaveLength(before);
    expect(dup).toMatchObject({ stars: 0, gauntlet: { status: 'IN_PROGRESS', nextLeg: { themeId: 'BUBBLE_POP' } } });
    expect(rig.repo.stored(BP)!.activeGauntlet!.legs).toHaveLength(1);
  });

  it('duplicate final leg completion changes nothing and reports COMPLETE', async () => {
    const rig = rigWithBossOpen();
    await rig.service.applyCompletion(USER_ID, leg('g0', 0), 3500);
    await rig.service.applyCompletion(USER_ID, leg('g1', 1), 3600);
    const before = rig.repo.saveCalls.length;
    const dup = await rig.service.applyCompletion(USER_ID, leg('g1', 1), 3600);
    expect(rig.repo.saveCalls).toHaveLength(before);
    expect(dup).toMatchObject({ stars: 2, bestStars: 2, gauntlet: { status: 'COMPLETE' } });
  });

  it('duplicate of a lower-scoring final leg changes nothing and reports COMPLETE', async () => {
    const rig = questRig();
    const progress = clearedWorld(BP, 1, ['bp-boss']);
    progress.nodes['bp-boss'] = nodeProgress(3, 7500, { lastGameId: 'gX' });
    rig.repo.seed(progress);
    const dup = await rig.service.applyCompletion(USER_ID, leg('gX', 1), 100);
    expect(rig.repo.saveCalls).toHaveLength(0);
    expect(dup).toMatchObject({ bestStars: 3, gauntlet: { status: 'COMPLETE' } });
  });

  it('a leg started at minute 29 and finished at minute 33 still counts', async () => {
    const rig = rigWithBossOpen();
    await rig.service.applyCompletion(USER_ID, leg('g0', 0), 3500);
    rig.clock.now = T0 + 29 * MIN;
    await expect(
      rig.service.validateStart(USER_ID, SubscriptionTier.Free, ctx(BP, 'bp-boss', 1), 'BUBBLE_POP', 2)
    ).resolves.toBeDefined();
    rig.clock.now = T0 + 33 * MIN;
    const done = await rig.service.applyCompletion(USER_ID, leg('g1', 1), 3600);
    expect(done).toMatchObject({ stars: 2, gauntlet: { status: 'COMPLETE' } });
  });

  it('an out-of-order leg clears the attempt and reports EXPIRED with 0 stars', async () => {
    const rig = questRig();
    const progress = clearedWorld(SI, 1, ['si-boss']);
    progress.activeGauntlet = {
      nodeId: 'si-boss',
      legs: [{ gameId: 'g0', score: 1000 }],
      startedAt: new Date(T0).toISOString(),
      lastActivityAt: new Date(T0).toISOString(),
    };
    rig.repo.seed(progress);
    const skipped = questGame('g2', ctx(SI, 'si-boss', 2), 'TRAFFIC_LAB', 2);
    const result = await rig.service.applyCompletion(USER_ID, skipped, 5000);
    expect(result).toMatchObject({ stars: 0, gauntlet: { status: 'EXPIRED' } });
    expect(rig.repo.stored(SI)!.activeGauntlet).toBeUndefined();
  });

  it('a stale leg with no attempt reports EXPIRED without writing', async () => {
    const rig = rigWithBossOpen();
    const result = await rig.service.applyCompletion(USER_ID, leg('g1', 1), 3000);
    expect(result).toMatchObject({ stars: 0, gauntlet: { status: 'EXPIRED' } });
    expect(rig.repo.saveCalls).toHaveLength(0);
  });
});

describe('getProgressView (R-VIEW-*)', () => {
  it('returns remaining plays from getUsage, not from canStartGame (FR-QM-17)', async () => {
    const rig = questRig();
    const view = await rig.service.getProgressView(USER_ID, SubscriptionTier.Light);
    expect(rig.rateLimiter.getUsage).toHaveBeenCalledWith(USER_ID, SubscriptionTier.Light);
    expect(view.tier).toBe(SubscriptionTier.Light);
    expect(view.rateLimit).toEqual({
      limit: 20,
      used: 7,
      remaining: 13,
      resetAt: '2026-01-16T00:00:00.000Z',
    });
  });

  it('lists both worlds with the bonus node last and never exposes catalog ids', async () => {
    const rig = questRig();
    const view = await rig.service.getProgressView(USER_ID, SubscriptionTier.Premium);
    expect(view.worlds.map((w) => w.id)).toEqual([BP, SI]);
    const nodes = view.worlds[0].nodes;
    expect(nodes[nodes.length - 1].id).toBe('bp-bonus-sequence');
    expect(nodes[0]).toMatchObject({ id: 'bp-01-memory', status: 'AVAILABLE', stars: 0 });
    expect(nodes[1].status).toBe('LOCKED');
    const json = JSON.stringify(view);
    expect(json).not.toContain('catalogGameId');
    expect(json).not.toContain('memory-match');
  });

  it('shows World 2 locked for FREE with stored stars still visible', async () => {
    const rig = questRig();
    const stored = clearedWorld(SI, 1, []);
    stored.nodes['si-01-bond-burn'] = nodeProgress(2, 3000);
    rig.repo.seed({ ...stored, nodes: { 'si-01-bond-burn': stored.nodes['si-01-bond-burn'] } });
    const view = await rig.service.getProgressView(USER_ID, SubscriptionTier.Free);
    const world2 = view.worlds.find((w) => w.id === SI)!;
    expect(world2.accessible).toBe(false);
    expect(world2.nodes.every((n) => n.status === 'LOCKED')).toBe(true);
    expect(world2.nodes[0]).toMatchObject({ stars: 2, bestScore: 3000 });
  });

  it('recomputes totalStars and ignores the stored value', async () => {
    const rig = questRig();
    rig.repo.seed({ ...clearedWorld(BP, 1, []), nodes: { 'bp-01-memory': nodeProgress(2, 2300) }, totalStars: 999 });
    const view = await rig.service.getProgressView(USER_ID, SubscriptionTier.Free);
    expect(view.worlds[0].totalStars).toBe(2);
    expect(view.worlds[0].maxStars).toBe(24);
  });

  it('marks nodes UNAVAILABLE when their game left the catalog', async () => {
    const rig = questRig(['memory-match']);
    const view = await rig.service.getProgressView(USER_ID, SubscriptionTier.Premium);
    const byId = Object.fromEntries(view.worlds[0].nodes.map((n) => [n.id, n.status]));
    expect(byId['bp-01-memory']).toBe('UNAVAILABLE');
    expect(byId['bp-07-memory-hard']).toBe('UNAVAILABLE');
  });

  it('includes an active gauntlet until it expires', async () => {
    const rig = questRig();
    const progress = clearedWorld(BP, 1, ['bp-boss']);
    progress.activeGauntlet = {
      nodeId: 'bp-boss',
      legs: [{ gameId: 'g0', score: 1 }],
      startedAt: new Date(T0).toISOString(),
      lastActivityAt: new Date(T0).toISOString(),
    };
    rig.repo.seed(progress);
    rig.clock.now = T0 + 10 * MIN;
    let view = await rig.service.getProgressView(USER_ID, SubscriptionTier.Premium);
    expect(view.worlds[0].activeGauntlet).toEqual({
      nodeId: 'bp-boss',
      legsDone: 1,
      legsTotal: 2,
      expiresAt: new Date(T0 + 30 * MIN).toISOString(),
    });
    rig.clock.now = T0 + 31 * MIN;
    view = await rig.service.getProgressView(USER_ID, SubscriptionTier.Premium);
    expect(view.worlds[0].activeGauntlet).toBeUndefined();
  });

  it('publishes the paywall impression only for FREE users who cleared World 1', async () => {
    const rig = questRig();
    rig.repo.seed({ ...clearedWorld(BP, 1, []), badges: ['WORLD_CLEARED'] });
    await rig.service.getProgressView(USER_ID, SubscriptionTier.Free);
    expect(metric).toHaveBeenCalledWith('QuestPaywallHit', BP);
    metric.mockClear();
    await rig.service.getProgressView(USER_ID, SubscriptionTier.Premium);
    expect(metric).not.toHaveBeenCalled();
  });

  it('fails the request when a read fails (R-VIEW-5)', async () => {
    const rig = questRig();
    rig.repo.failWith = new Error('boom');
    await expect(rig.service.getProgressView(USER_ID, SubscriptionTier.Free)).rejects.toThrow('boom');
  });
});
