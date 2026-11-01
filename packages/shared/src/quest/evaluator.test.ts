import { QUEST_WORLDS } from './config';
import {
  applyNodeResult,
  computeBadges,
  computeNodeStatuses,
  emptyWorldProgress,
  isNodeStartable,
  maxStars,
  starsForScore,
  totalStars,
} from './evaluator';
import type { EvalContext, NodeProgress, QuestWorld, Stars, WorldProgress } from './types';

const w1 = QUEST_WORLDS[0] as QuestWorld; // brain-peaks
const w2 = QUEST_WORLDS[1] as QuestWorld; // science-island
const NOW = '2026-11-01T10:00:00.000Z';
const LATER = '2026-11-01T11:00:00.000Z';
const none: EvalContext = { unavailableNodeIds: new Set() };
const without = (...ids: string[]): EvalContext => ({ unavailableNodeIds: new Set(ids) });

const PATH = w1.nodes.map((n) => n.id);
// bp-01-memory, bp-02-math, bp-03-words, bp-04-sequence, bp-05-geo, bp-06-maze, bp-07-memory-space, bp-boss

function np(stars: number, bestScore = stars * 1000): NodeProgress {
  return {
    stars: stars as Stars,
    bestScore,
    firstClearedAt: stars > 0 ? NOW : '',
    lastPlayedAt: NOW,
  };
}

function prog(
  stars: Record<string, number>,
  extra: Partial<WorldProgress> = {},
  worldId = w1.id
): WorldProgress {
  const nodes: Record<string, NodeProgress> = {};
  for (const [id, s] of Object.entries(stars)) nodes[id] = np(s);
  return { worldId, nodes, totalStars: 0, badges: [], version: 3, updatedAt: NOW, ...extra };
}

/** Stars on the first n path nodes. */
function firstN(n: number, stars = 1): Record<string, number> {
  return Object.fromEntries(PATH.slice(0, n).map((id) => [id, stars]));
}

describe('starsForScore (R-STAR-1, R-STAR-2)', () => {
  const t = [1450, 2300, 2650] as const;
  it.each([
    [0, 0],
    [1449, 0],
    [1450, 1],
    [1451, 1],
    [2299, 1],
    [2300, 2],
    [2649, 2],
    [2650, 3],
    [99999, 3],
    [-5, 0],
  ])('score %p gives %p stars (inclusive lower bounds)', (score, stars) => {
    expect(starsForScore(t, score)).toBe(stars);
  });
  it('non-finite scores give 0 stars', () => {
    expect(starsForScore(t, Number.NaN)).toBe(0);
    expect(starsForScore(t, Infinity)).toBe(0);
    expect(starsForScore(t, -Infinity)).toBe(0);
    expect(starsForScore(t, '9999' as unknown as number)).toBe(0);
  });
});

describe('computeNodeStatuses / unlock chain (R-UNLOCK-*)', () => {
  it('new player: node 1 available, nodes 2-8 locked, bonus locked', () => {
    const s = computeNodeStatuses(w1, undefined, none);
    expect(s['bp-01-memory']).toBe('AVAILABLE');
    for (const id of PATH.slice(1)) expect(s[id]).toBe('LOCKED');
    expect(s['bp-bonus-sequence']).toBe('LOCKED');
  });

  it('1 star on node n unlocks n+1; 0 stars does not (AC5)', () => {
    const one = computeNodeStatuses(w1, prog({ 'bp-01-memory': 1 }), none);
    expect(one['bp-02-math']).toBe('AVAILABLE');
    expect(one['bp-03-words']).toBe('LOCKED');
    const zero = computeNodeStatuses(w1, prog({ 'bp-01-memory': 0 }), none);
    expect(zero['bp-02-math']).toBe('LOCKED');
  });

  it('a starred node stays available whatever its predecessors hold (replay, R-UNLOCK-3)', () => {
    const s = computeNodeStatuses(w1, prog({ 'bp-04-sequence': 2 }), none);
    expect(s['bp-04-sequence']).toBe('AVAILABLE');
    expect(s['bp-05-geo']).toBe('AVAILABLE');
    expect(s['bp-02-math']).toBe('LOCKED');
  });

  it('the whole path opens once every node has a star', () => {
    const s = computeNodeStatuses(w1, prog(firstN(8)), none);
    for (const id of PATH) expect(s[id]).toBe('AVAILABLE');
  });

  it('a removed game is UNAVAILABLE and is passed once its predecessor is passed (R-UNLOCK-4)', () => {
    const s = computeNodeStatuses(w1, prog(firstN(3)), without('bp-04-sequence'));
    expect(s['bp-04-sequence']).toBe('UNAVAILABLE');
    expect(s['bp-05-geo']).toBe('AVAILABLE');
    expect(s['bp-06-maze']).toBe('LOCKED');
  });

  it('a removed game does not open the path past nodes the player never reached', () => {
    const s = computeNodeStatuses(w1, prog(firstN(2)), without('bp-05-geo'));
    expect(s['bp-03-words']).toBe('AVAILABLE');
    expect(s['bp-04-sequence']).toBe('LOCKED');
    expect(s['bp-05-geo']).toBe('UNAVAILABLE');
    expect(s['bp-06-maze']).toBe('LOCKED');
  });

  it('consecutive removed nodes are passed through', () => {
    const s = computeNodeStatuses(w1, prog(firstN(3)), without('bp-04-sequence', 'bp-05-geo'));
    expect(s['bp-06-maze']).toBe('AVAILABLE');
  });

  it('removed first node: node 2 is available (AC18)', () => {
    const s = computeNodeStatuses(w1, undefined, without('bp-01-memory'));
    expect(s['bp-01-memory']).toBe('UNAVAILABLE');
    expect(s['bp-02-math']).toBe('AVAILABLE');
  });

  it('a removed node is UNAVAILABLE even if it holds stars, and stored stars are not lost', () => {
    const p = prog({ ...firstN(4, 2) });
    const s = computeNodeStatuses(w1, p, without('bp-02-math'));
    expect(s['bp-02-math']).toBe('UNAVAILABLE');
    expect(p.nodes['bp-02-math']?.stars).toBe(2);
  });

  it('the player can still reach the boss with a deactivated game (AC18)', () => {
    const s = computeNodeStatuses(w1, prog(firstN(6)), without('bp-07-memory-space'));
    expect(s['bp-boss']).toBe('AVAILABLE');
  });

  it('works on the PAID world and ignores the stored totalStars', () => {
    const p = prog({ 'si-01-bond-burn': 3 }, { totalStars: 24 }, w2.id);
    const s = computeNodeStatuses(w2, p, none);
    expect(s['si-02-space-entry']).toBe('AVAILABLE');
    expect(s['si-bonus']).toBe('LOCKED');
  });

  it('does not treat prototype keys in stored progress as nodes', () => {
    const p = prog({});
    expect(computeNodeStatuses(w1, p, none)['bp-02-math']).toBe('LOCKED');
    expect(totalStars(w1, p, none)).toBe(0);
  });
});

describe('isNodeStartable (R-UNLOCK-6)', () => {
  it('is true exactly for AVAILABLE; unknown and prototype ids are false', () => {
    expect(isNodeStartable(w1, 'bp-01-memory', undefined, none)).toBe(true);
    expect(isNodeStartable(w1, 'bp-02-math', undefined, none)).toBe(false);
    expect(isNodeStartable(w1, 'nope', undefined, none)).toBe(false);
    expect(isNodeStartable(w1, 'constructor', undefined, none)).toBe(false);
    expect(isNodeStartable(w1, 'toString', prog({}), none)).toBe(false);
  });
  it('a hand-crafted locked node is not startable; an unavailable node is not startable', () => {
    expect(isNodeStartable(w1, 'bp-boss', prog({ 'bp-01-memory': 1 }), none)).toBe(false);
    expect(isNodeStartable(w1, 'bp-02-math', undefined, without('bp-02-math'))).toBe(false);
  });
  it('replaying a starred node is allowed', () => {
    expect(isNodeStartable(w1, 'bp-01-memory', prog({ 'bp-01-memory': 3 }), none)).toBe(true);
  });
});

describe('totals and bonus (R-BONUS-*)', () => {
  it('totalStars counts path nodes including the boss and excludes the bonus', () => {
    const p = prog({ ...firstN(8, 3), 'bp-bonus-sequence': 3 });
    expect(totalStars(w1, p, none)).toBe(24);
  });

  it('unavailable nodes add nothing even with stars', () => {
    expect(totalStars(w1, prog(firstN(3, 3)), without('bp-02-math'))).toBe(6);
  });

  it('bonus unlocks at the threshold (14) and not at 13', () => {
    const at13 = prog({ ...firstN(4, 3), 'bp-05-geo': 1 }); // 12 + 1
    const at14 = prog({ ...firstN(4, 3), 'bp-05-geo': 2 });
    expect(totalStars(w1, at13, none)).toBe(13);
    expect(computeNodeStatuses(w1, at13, none)['bp-bonus-sequence']).toBe('LOCKED');
    expect(computeNodeStatuses(w1, at14, none)['bp-bonus-sequence']).toBe('AVAILABLE');
  });

  it('the bonus node cannot unlock itself (its stars do not count)', () => {
    expect(computeNodeStatuses(w1, prog({ 'bp-bonus-sequence': 0 }), none)['bp-bonus-sequence']).toBe('LOCKED');
  });

  it('removed games cannot make the bonus unreachable (min with 3 x available path)', () => {
    // 5 path nodes removed -> 3 available, max 9 < 14, effective threshold 9.
    const ctx = without(
      'bp-01-memory',
      'bp-02-math',
      'bp-03-words',
      'bp-04-sequence',
      'bp-05-geo'
    );
    const p = prog({ 'bp-06-maze': 3, 'bp-07-memory-space': 3, 'bp-boss': 3 });
    expect(totalStars(w1, p, ctx)).toBe(9);
    expect(computeNodeStatuses(w1, p, ctx)['bp-bonus-sequence']).toBe('AVAILABLE');
  });

  it('a bonus with stars stays available even if the total falls (R-BONUS-4)', () => {
    expect(computeNodeStatuses(w1, prog({ 'bp-bonus-sequence': 1 }), none)['bp-bonus-sequence']).toBe('AVAILABLE');
  });

  it('an unavailable bonus is UNAVAILABLE', () => {
    expect(computeNodeStatuses(w1, prog(firstN(8, 3)), without('bp-bonus-sequence'))['bp-bonus-sequence']).toBe(
      'UNAVAILABLE'
    );
  });

  it('world 2 bonus threshold is 16', () => {
    const ids = w2.nodes.map((n) => n.id);
    const at15 = prog({ ...Object.fromEntries(ids.slice(0, 5).map((id) => [id, 3])) }, {}, w2.id); // 15
    const at16 = prog(
      { ...Object.fromEntries(ids.slice(0, 5).map((id) => [id, 3])), [ids[5] as string]: 1 },
      {},
      w2.id
    );
    expect(computeNodeStatuses(w2, at15, none)['si-bonus']).toBe('LOCKED');
    expect(computeNodeStatuses(w2, at16, none)['si-bonus']).toBe('AVAILABLE');
  });
});

describe('applyNodeResult (section 5 and worked examples)', () => {
  it('first play: 1 star unlocks the next node', () => {
    const out = applyNodeResult(
      w1,
      undefined,
      { nodeId: 'bp-01-memory', score: 2100, nowIso: NOW, gameId: 'g1' },
      none
    );
    expect(out.stars).toBe(1);
    expect(out.bestStars).toBe(1);
    expect(out.score).toBe(2100);
    expect(out.newlyUnlocked).toEqual(['bp-02-math']);
    expect(out.progress.nodes['bp-01-memory']).toEqual({
      stars: 1,
      bestScore: 2100,
      firstClearedAt: NOW,
      lastPlayedAt: NOW,
      lastGameId: 'g1',
    });
    expect(out.progress.totalStars).toBe(1);
    expect(out.progress.worldId).toBe('brain-peaks');
    expect(out.worldCleared).toBe(false);
    expect(out.badgesAwarded).toEqual([]);
  });

  it('0 stars is recorded but unlocks nothing and firstClearedAt stays empty (R-MONO-6)', () => {
    const out = applyNodeResult(
      w1,
      undefined,
      { nodeId: 'bp-01-memory', score: 1000, nowIso: NOW },
      none
    );
    expect(out.stars).toBe(0);
    expect(out.newlyUnlocked).toEqual([]);
    expect(out.progress.nodes['bp-01-memory']).toEqual({
      stars: 0,
      bestScore: 1000,
      firstClearedAt: '',
      lastPlayedAt: NOW,
    });
  });

  it('a lower-scoring replay keeps best score and stars, but reports this play and sets lastGameId (R-MONO-4)', () => {
    const first = applyNodeResult(
      w1,
      undefined,
      { nodeId: 'bp-01-memory', score: 2100, nowIso: NOW, gameId: 'g1' },
      none
    );
    const replay = applyNodeResult(
      w1,
      first.progress,
      { nodeId: 'bp-01-memory', score: 1000, nowIso: LATER, gameId: 'g2' },
      none
    );
    expect(replay.stars).toBe(0);
    expect(replay.bestStars).toBe(1);
    expect(replay.progress.nodes['bp-01-memory']).toEqual({
      stars: 1,
      bestScore: 2100,
      firstClearedAt: NOW,
      lastPlayedAt: LATER,
      lastGameId: 'g2',
    });
    expect(replay.newlyUnlocked).toEqual([]);
  });

  it('a better replay raises stars and keeps firstClearedAt', () => {
    const first = applyNodeResult(
      w1,
      undefined,
      { nodeId: 'bp-01-memory', score: 2100, nowIso: NOW },
      none
    );
    const better = applyNodeResult(
      w1,
      first.progress,
      { nodeId: 'bp-01-memory', score: 2700, nowIso: LATER },
      none
    );
    expect(better.stars).toBe(3);
    expect(better.progress.nodes['bp-01-memory']).toMatchObject({
      stars: 3,
      bestScore: 2700,
      firstClearedAt: NOW,
    });
    expect(better.progress.totalStars).toBe(3);
  });

  it('firstClearedAt is set by the first 1-star result after a 0-star play', () => {
    const zero = applyNodeResult(
      w1,
      undefined,
      { nodeId: 'bp-01-memory', score: 10, nowIso: NOW },
      none
    );
    const one = applyNodeResult(
      w1,
      zero.progress,
      { nodeId: 'bp-01-memory', score: 1500, nowIso: LATER },
      none
    );
    expect(one.progress.nodes['bp-01-memory']?.firstClearedAt).toBe(LATER);
  });

  it('non-finite and negative scores are stored as 0', () => {
    for (const bad of [Number.NaN, Infinity, -Infinity, -10]) {
      const out = applyNodeResult(
        w1,
        undefined,
        { nodeId: 'bp-01-memory', score: bad, nowIso: NOW },
        none
      );
      expect(out.score).toBe(0);
      expect(out.stars).toBe(0);
      expect(out.progress.nodes['bp-01-memory']?.bestScore).toBe(0);
    }
  });

  it('the 14th path star makes the bonus newlyUnlocked', () => {
    const p = prog({ ...firstN(4, 3), 'bp-05-geo': 1 }); // 13 stars
    const out = applyNodeResult(w1, p, { nodeId: 'bp-05-geo', score: 3500, nowIso: NOW }, none); // -> 2 stars = 14
    expect(out.progress.totalStars).toBe(14);
    expect(out.newlyUnlocked).toContain('bp-bonus-sequence');
  });

  it('playing the bonus changes no path total (R-BONUS-1)', () => {
    const p = prog(firstN(8, 3));
    const out = applyNodeResult(w1, p, { nodeId: 'bp-bonus-sequence', score: 5300, nowIso: NOW }, none);
    expect(out.stars).toBe(3);
    expect(out.progress.totalStars).toBe(24);
  });

  it('boss result with the combined score: 1 star awards WORLD_CLEARED once (R-BADGE-1, 5, 6)', () => {
    const p = prog(firstN(7));
    const out = applyNodeResult(w1, p, { nodeId: 'bp-boss', score: 6500, nowIso: NOW }, none);
    expect(out.stars).toBe(1);
    expect(out.worldCleared).toBe(true);
    expect(out.badgesAwarded).toEqual(['WORLD_CLEARED']);
    expect(out.progress.badges).toEqual(['WORLD_CLEARED']);
    const again = applyNodeResult(
      w1,
      out.progress,
      { nodeId: 'bp-boss', score: 7500, nowIso: LATER },
      none
    );
    expect(again.stars).toBe(3);
    expect(again.worldCleared).toBe(false);
    expect(again.badgesAwarded).toEqual([]);
  });

  it('boss 0 stars awards no badge', () => {
    const out = applyNodeResult(
      w1,
      prog(firstN(7)),
      { nodeId: 'bp-boss', score: 5000, nowIso: NOW },
      none
    );
    expect(out.stars).toBe(0);
    expect(out.progress.badges).toEqual([]);
  });

  it('all 8 path nodes at 3 stars awards both badges, ignoring the bonus (R-BADGE-2)', () => {
    const p = prog({ ...firstN(7, 3), 'bp-boss': 1 }, { badges: ['WORLD_CLEARED'] });
    const out = applyNodeResult(w1, p, { nodeId: 'bp-boss', score: 7400, nowIso: NOW }, none);
    expect(out.progress.badges).toEqual(['WORLD_CLEARED', 'WORLD_MASTERED']);
    expect(out.badgesAwarded).toEqual(['WORLD_MASTERED']);
    expect(out.worldCleared).toBe(false);
  });

  it('unknown node ids throw', () => {
    expect(() =>
      applyNodeResult(w1, undefined, { nodeId: 'nope', score: 1, nowIso: NOW }, none)
    ).toThrow('Unknown quest node');
    expect(() =>
      applyNodeResult(w1, undefined, { nodeId: 'constructor', score: 1, nowIso: NOW }, none)
    ).toThrow('Unknown quest node');
  });

  it('copies version, worldId and activeGauntlet through unchanged', () => {
    const attempt = {
      nodeId: 'bp-boss',
      legs: [{ gameId: 'x', score: 1 }],
      startedAt: NOW,
      lastActivityAt: NOW,
    };
    const p = prog(firstN(2), { activeGauntlet: attempt, version: 7 });
    const out = applyNodeResult(w1, p, { nodeId: 'bp-03-words', score: 2000, nowIso: LATER }, none);
    expect(out.progress.version).toBe(7);
    expect(out.progress.activeGauntlet).toEqual(attempt);
    expect(out.progress.updatedAt).toBe(LATER);
  });

  it('recomputes totalStars instead of trusting the stored value', () => {
    const p = prog({ 'bp-01-memory': 1 }, { totalStars: 99 });
    const out = applyNodeResult(w1, p, { nodeId: 'bp-02-math', score: 2000, nowIso: NOW }, none);
    expect(out.progress.totalStars).toBe(2);
  });

  it('newlyUnlocked never contains the node played, unavailable nodes or already-available nodes', () => {
    const p = prog({ 'bp-01-memory': 1 });
    const out = applyNodeResult(
      w1,
      p,
      { nodeId: 'bp-01-memory', score: 2700, nowIso: NOW },
      without('bp-03-words')
    );
    expect(out.newlyUnlocked).toEqual([]);
    const out2 = applyNodeResult(
      w1,
      p,
      { nodeId: 'bp-02-math', score: 2000, nowIso: NOW },
      without('bp-03-words')
    );
    expect(out2.newlyUnlocked).toEqual(['bp-04-sequence']); // 03 unavailable is passed through
  });

  it('never mutates its inputs and never reads a clock (R-MONO-5)', () => {
    const p = prog(firstN(3));
    const deepFreeze = <T>(o: T): T => {
      Object.values(o as object).forEach(
        (v) => typeof v === 'object' && v !== null && deepFreeze(v)
      );
      return Object.freeze(o);
    };
    deepFreeze(p);
    const snapshot = JSON.stringify(p);
    const spy = jest.spyOn(Date, 'now');
    const out = applyNodeResult(
      w1,
      p,
      { nodeId: 'bp-04-sequence', score: 3000, nowIso: NOW, gameId: 'g' },
      none
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(JSON.stringify(p)).toBe(snapshot);
    expect(out.progress).not.toBe(p);
    expect(out.progress.nodes).not.toBe(p.nodes);
  });

  it('applying the same result twice equals once; the second outcome reports nothing new (R-MONO-2)', () => {
    const input = { nodeId: 'bp-01-memory', score: 2100, nowIso: NOW, gameId: 'g1' };
    const once = applyNodeResult(w1, undefined, input, none);
    const twice = applyNodeResult(w1, once.progress, input, none);
    expect(twice.progress).toEqual(once.progress);
    expect(twice.newlyUnlocked).toEqual([]);
    expect(twice.badgesAwarded).toEqual([]);
    expect(twice.worldCleared).toBe(false);
  });
});

describe('computeBadges (R-BADGE-*)', () => {
  it('returns existing badges untouched and in fixed order', () => {
    expect(
      computeBadges(w1, prog({}, { badges: ['WORLD_MASTERED', 'WORLD_CLEARED'] }), none)
    ).toEqual(['WORLD_CLEARED', 'WORLD_MASTERED']);
  });

  it('never removes a badge when config or progress change (R-BADGE-4)', () => {
    const p = prog({ 'bp-boss': 0 }, { badges: ['WORLD_CLEARED'] });
    expect(computeBadges(w1, p, none)).toEqual(['WORLD_CLEARED']);
  });

  it('WORLD_MASTERED needs every available path node at 3 stars and at least one node', () => {
    expect(computeBadges(w1, prog(firstN(7, 3)), none)).toEqual([]);
    expect(computeBadges(w1, prog(firstN(8, 3)), none)).toEqual([
      'WORLD_CLEARED',
      'WORLD_MASTERED',
    ]);
    // unavailable nodes are excluded from the requirement
    expect(computeBadges(w1, prog({ ...firstN(7, 3) }), without('bp-boss'))).toContain(
      'WORLD_MASTERED'
    );
    expect(computeBadges(w1, prog({ ...firstN(8, 2) }), none)).toEqual(['WORLD_CLEARED']);
  });

  it('the bonus never counts toward either badge', () => {
    expect(computeBadges(w1, prog({ 'bp-bonus-sequence': 3 }), none)).toEqual([]);
  });

  it('boss unavailable: WORLD_CLEARED once every earlier node is passed (R-BADGE-3)', () => {
    expect(computeBadges(w1, prog(firstN(7)), without('bp-boss'))).toEqual(['WORLD_CLEARED']);
  });

  it('boss unavailable: not awarded while an earlier node is still unplayed', () => {
    expect(computeBadges(w1, prog(firstN(6)), without('bp-boss'))).toEqual([]);
    expect(computeBadges(w1, prog(firstN(3)), without('bp-boss', 'bp-07-memory-space'))).toEqual([]);
  });

  it('boss unavailable with earlier nodes also unavailable and reached', () => {
    expect(
      computeBadges(w1, prog(firstN(5)), without('bp-06-maze', 'bp-07-memory-space', 'bp-boss'))
    ).toEqual(['WORLD_CLEARED']);
  });

  it('applyNodeResult awards WORLD_CLEARED on the last earlier node when the boss is unavailable', () => {
    const out = applyNodeResult(
      w1,
      prog(firstN(6)),
      { nodeId: 'bp-07-memory-space', score: 2600, nowIso: NOW },
      without('bp-boss')
    );
    expect(out.worldCleared).toBe(true);
    expect(out.badgesAwarded).toEqual(['WORLD_CLEARED']);
  });

  it('edge R-BADGE-8: every path node unavailable counts as reached', () => {
    expect(computeBadges(w1, prog({}), without(...PATH))).toEqual(['WORLD_CLEARED']);
  });

  it('a boss with stars awards WORLD_CLEARED even if earlier nodes are unplayed (replay of stored stars)', () => {
    expect(computeBadges(w1, prog({ 'bp-boss': 1 }), none)).toEqual(['WORLD_CLEARED']);
  });
});

describe('emptyWorldProgress', () => {
  it('has the documented empty shape', () => {
    expect(emptyWorldProgress('brain-peaks', NOW)).toEqual({
      worldId: 'brain-peaks',
      nodes: {},
      totalStars: 0,
      badges: [],
      version: 0,
      updatedAt: NOW,
    });
  });
});

describe('real thresholds produce the documented stars (thresholds.md)', () => {
  it('every node: each threshold earns exactly its star and one below earns the previous', () => {
    for (const world of QUEST_WORLDS) {
      for (const n of [...world.nodes, world.bonus]) {
        const [a, b, c] = n.thresholds;
        expect([a - 1, a, b - 1, b, c - 1, c].map((s) => starsForScore(n.thresholds, s))).toEqual([
          0, 1, 1, 2, 2, 3,
        ]);
      }
    }
  });
});

describe('maxStars', () => {
  it('is 3 per path node including the boss and excluding the bonus (24 per world)', () => {
    expect(maxStars(w1, none)).toBe(24);
    expect(maxStars(w2, none)).toBe(24);
  });
  it('excludes unavailable nodes', () => {
    expect(maxStars(w1, without('bp-02-math'))).toBe(21);
    expect(maxStars(w1, without('bp-bonus-sequence'))).toBe(24);
  });
});
