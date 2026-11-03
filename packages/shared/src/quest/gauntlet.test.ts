import fc from 'fast-check';
import { QUEST_WORLDS, getNode } from './config';
import { applyNodeResult } from './evaluator';
import {
  GAUNTLET_TTL_MS,
  canStartLeg,
  combineLegScores,
  isGauntletExpired,
  recordLeg,
} from './gauntlet';
import type { EvalContext, GauntletAttempt, QuestNode, QuestWorld, WorldProgress } from './types';

const world1 = QUEST_WORLDS[0] as QuestWorld;
const world2 = QUEST_WORLDS[1] as QuestWorld;
const boss2 = getNode(world1, 'bp-boss') as QuestNode; // 2 legs
// The launch config has no 3-leg boss, so the 3-leg paths are tested on a copy with one extra leg.
const siBoss = getNode(world2, 'si-boss') as QuestNode;
const boss3: QuestNode = { ...siBoss, legs: [...siBoss.legs, siBoss.legs[0] as QuestNode['legs'][number]] }; // 3 legs
const plain = getNode(world1, 'bp-01-memory') as QuestNode;
const ctx: EvalContext = { unavailableNodeIds: new Set() };

const T0 = '2026-11-01T10:00:00.000Z';
const T0_MS = Date.parse(T0);
const iso = (ms: number) => new Date(ms).toISOString();

function attemptAt(legs: number, lastActivityAt = T0, nodeId = boss3.id): GauntletAttempt {
  return {
    nodeId,
    legs: Array.from({ length: legs }, (_, i) => ({ gameId: `g${i}`, score: 1000 })),
    startedAt: T0,
    lastActivityAt,
  };
}

describe('isGauntletExpired (R-GAUNT-2, R-GAUNT-3)', () => {
  it('TTL is 30 minutes', () => {
    expect(GAUNTLET_TTL_MS).toBe(1_800_000);
  });
  it('exactly 30:00 is expired, 29:59.999 is not', () => {
    expect(isGauntletExpired(attemptAt(1), T0_MS + GAUNTLET_TTL_MS)).toBe(true);
    expect(isGauntletExpired(attemptAt(1), T0_MS + GAUNTLET_TTL_MS - 1)).toBe(false);
  });
  it('is measured from lastActivityAt, never startedAt', () => {
    const a: GauntletAttempt = {
      ...attemptAt(2),
      startedAt: T0,
      lastActivityAt: iso(T0_MS + 25 * 60_000),
    };
    expect(isGauntletExpired(a, T0_MS + 40 * 60_000)).toBe(false); // 15 min since last leg
    expect(isGauntletExpired(a, T0_MS + 56 * 60_000)).toBe(true); // 31 min since last leg
  });
  it('a clock behind lastActivityAt is not expired', () => {
    expect(isGauntletExpired(attemptAt(1), T0_MS - 10 * 60_000)).toBe(false);
  });
  it('an empty or unparseable lastActivityAt is expired (fail closed)', () => {
    expect(isGauntletExpired(attemptAt(1, ''), T0_MS)).toBe(true);
    expect(isGauntletExpired(attemptAt(1, 'garbage'), T0_MS)).toBe(true);
  });
  it('a non-finite clock is expired (fail closed)', () => {
    expect(isGauntletExpired(attemptAt(1), Number.NaN)).toBe(true);
    expect(isGauntletExpired(attemptAt(1), -Infinity)).toBe(true);
  });
});

describe('canStartLeg (R-GAUNT-1, R-GAUNT-4)', () => {
  it('leg 0 is always allowed, with or without an attempt, even an expired or foreign one', () => {
    expect(canStartLeg(undefined, boss3, 0, T0_MS)).toBe(true);
    expect(canStartLeg(attemptAt(2, T0, 'other'), boss3, 0, T0_MS + 99 * GAUNTLET_TTL_MS)).toBe(
      true
    );
  });
  it('leg k>0 needs an attempt for the same node with exactly k completed legs', () => {
    expect(canStartLeg(undefined, boss3, 1, T0_MS)).toBe(false);
    expect(canStartLeg(attemptAt(1), boss3, 1, T0_MS + 1000)).toBe(true);
    expect(canStartLeg(attemptAt(1), boss3, 2, T0_MS + 1000)).toBe(false); // skipping
    expect(canStartLeg(attemptAt(2), boss3, 1, T0_MS + 1000)).toBe(false); // going back
    expect(canStartLeg(attemptAt(2), boss3, 2, T0_MS + 1000)).toBe(true);
    expect(canStartLeg(attemptAt(1, T0, 'other-node'), boss3, 1, T0_MS + 1000)).toBe(false);
  });
  it('legs must be played in order 0, 1, 2 (gauntlet order)', () => {
    let attempt: GauntletAttempt | undefined;
    let now = T0_MS;
    for (let k = 0; k < boss3.legs.length; k++) {
      expect(canStartLeg(attempt, boss3, k, now)).toBe(true);
      for (let other = 1; other < boss3.legs.length; other++) {
        if (other !== k) expect(canStartLeg(attempt, boss3, other, now)).toBe(false);
      }
      const out = recordLeg(attempt, boss3, {
        legIndex: k,
        gameId: `g${k}`,
        score: 100,
        nowIso: iso(now),
      });
      attempt = out.attempt;
      now += 60_000;
    }
    expect(attempt).toBeUndefined();
  });
  it('expiry blocks the next leg after 30 minutes idle but not before', () => {
    expect(canStartLeg(attemptAt(1), boss3, 1, T0_MS + GAUNTLET_TTL_MS - 1)).toBe(true);
    expect(canStartLeg(attemptAt(1), boss3, 1, T0_MS + GAUNTLET_TTL_MS)).toBe(false);
  });
  it('the 30 minute window restarts with each completed leg', () => {
    const second = recordLeg(attemptAt(1), boss3, {
      legIndex: 1,
      gameId: 'g1',
      score: 5,
      nowIso: iso(T0_MS + 20 * 60_000),
    });
    expect(canStartLeg(second.attempt, boss3, 2, T0_MS + 45 * 60_000)).toBe(true); // 25 min after leg 1
    expect(canStartLeg(second.attempt, boss3, 2, T0_MS + 50 * 60_000)).toBe(false); // 30 min after leg 1
  });
  it('an expired attempt with an unparseable timestamp blocks leg k>0', () => {
    expect(canStartLeg(attemptAt(1, ''), boss3, 1, T0_MS)).toBe(false);
  });
  it('rejects invalid leg indexes on a boss', () => {
    for (const idx of [-1, 3, 1.5, Number.NaN, Infinity]) {
      expect(canStartLeg(attemptAt(1), boss3, idx, T0_MS)).toBe(false);
    }
    expect(canStartLeg(attemptAt(1), boss2, 2, T0_MS)).toBe(false); // boss2 has 2 legs
  });
  it('a non-boss node allows only leg 0', () => {
    expect(canStartLeg(undefined, plain, 0, T0_MS)).toBe(true);
    expect(canStartLeg(undefined, plain, 1, T0_MS)).toBe(false);
  });
});

describe('recordLeg', () => {
  it('leg 0 starts an attempt with startedAt = lastActivityAt = nowIso', () => {
    const out = recordLeg(undefined, boss3, { legIndex: 0, gameId: 'a', score: 3000, nowIso: T0 });
    expect(out.status).toBe('IN_PROGRESS');
    expect(out.attempt).toEqual({
      nodeId: boss3.id,
      legs: [{ gameId: 'a', score: 3000 }],
      startedAt: T0,
      lastActivityAt: T0,
    });
  });
  it('a later leg moves only lastActivityAt', () => {
    const later = iso(T0_MS + 60_000);
    const first = recordLeg(undefined, boss3, { legIndex: 0, gameId: 'a', score: 1, nowIso: T0 });
    const second = recordLeg(first.attempt, boss3, {
      legIndex: 1,
      gameId: 'b',
      score: 2,
      nowIso: later,
    });
    expect(second.attempt?.startedAt).toBe(T0);
    expect(second.attempt?.lastActivityAt).toBe(later);
    expect(second.attempt?.legs).toEqual([
      { gameId: 'a', score: 1 },
      { gameId: 'b', score: 2 },
    ]);
  });
  it('the final leg completes with the summed score and clears the attempt', () => {
    const out = recordLeg(attemptAt(2), boss3, {
      legIndex: 2,
      gameId: 'z',
      score: 500,
      nowIso: T0,
    });
    expect(out).toEqual({ attempt: undefined, status: 'COMPLETE', combinedScore: 2500 });
  });
  it('a two-leg boss completes on leg 1', () => {
    const a = recordLeg(undefined, boss2, { legIndex: 0, gameId: 'a', score: 3200, nowIso: T0 });
    const b = recordLeg(a.attempt, boss2, { legIndex: 1, gameId: 'b', score: 3300, nowIso: T0 });
    expect(b).toEqual({ attempt: undefined, status: 'COMPLETE', combinedScore: 6500 });
  });
  it('a single-leg node completes immediately', () => {
    const out = recordLeg(undefined, plain, { legIndex: 0, gameId: 'a', score: 700, nowIso: T0 });
    expect(out).toEqual({ attempt: undefined, status: 'COMPLETE', combinedScore: 700 });
  });
  it('recording leg 0 again restarts the attempt, also for another node (R-GAUNT-8)', () => {
    const out = recordLeg(attemptAt(2, T0, 'si-boss'), boss2, {
      legIndex: 0,
      gameId: 'n',
      score: 1,
      nowIso: T0,
    });
    expect(out.attempt?.nodeId).toBe(boss2.id);
    expect(out.attempt?.legs).toHaveLength(1);
  });
  it('out-of-order, missing-attempt and foreign-attempt legs are EXPIRED without throwing (R-GAUNT-7)', () => {
    const skip = recordLeg(attemptAt(1), boss3, { legIndex: 2, gameId: 'x', score: 1, nowIso: T0 });
    const none = recordLeg(undefined, boss3, { legIndex: 1, gameId: 'x', score: 1, nowIso: T0 });
    const foreign = recordLeg(attemptAt(1, T0, 'other'), boss3, {
      legIndex: 1,
      gameId: 'x',
      score: 1,
      nowIso: T0,
    });
    const back = recordLeg(attemptAt(2), boss3, {
      legIndex: 1,
      gameId: 'new',
      score: 1,
      nowIso: T0,
    });
    for (const out of [skip, none, foreign, back]) {
      expect(out).toEqual({ attempt: undefined, status: 'EXPIRED' });
    }
  });
  it('invalid leg indexes are EXPIRED without throwing', () => {
    for (const legIndex of [-1, 3, 1.5, Number.NaN]) {
      expect(
        recordLeg(attemptAt(1), boss3, { legIndex, gameId: 'x', score: 1, nowIso: T0 })
      ).toEqual({
        attempt: undefined,
        status: 'EXPIRED',
      });
    }
  });
  it('has no clock check: a slow leg that passed canStartLeg still records', () => {
    const out = recordLeg(attemptAt(1), boss3, {
      legIndex: 1,
      gameId: 'late',
      score: 9,
      nowIso: iso(T0_MS + 10 * GAUNTLET_TTL_MS),
    });
    expect(out.status).toBe('IN_PROGRESS');
    expect(out.attempt?.legs).toHaveLength(2);
  });
  it('sanitizes non-finite and negative leg scores to 0 (SECURITY-15)', () => {
    const a = recordLeg(undefined, boss2, {
      legIndex: 0,
      gameId: 'a',
      score: Number.NaN,
      nowIso: T0,
    });
    expect(a.attempt?.legs[0]?.score).toBe(0);
    const b = recordLeg(a.attempt, boss2, { legIndex: 1, gameId: 'b', score: -50, nowIso: T0 });
    expect(b.combinedScore).toBe(0);
  });
  it('does not mutate the attempt it receives', () => {
    const a = attemptAt(1);
    const frozen = JSON.stringify(a);
    Object.freeze(a);
    Object.freeze(a.legs);
    recordLeg(a, boss3, { legIndex: 1, gameId: 'b', score: 5, nowIso: T0 });
    expect(JSON.stringify(a)).toBe(frozen);
  });
});

describe('duplicate completions (R-GAUNT-5, R-GAUNT-6)', () => {
  it('a leg stored without a gameId is never matched by a missing gameId', () => {
    const stale = { ...attemptAt(1), legs: [{ score: 1315 }] } as unknown as GauntletAttempt;
    const out = recordLeg(stale, boss3, {
      legIndex: 0,
      gameId: undefined as unknown as string,
      score: 4000,
      nowIso: iso(T0_MS + 1000),
    });
    expect(out.attempt).not.toBe(stale); // recorded, not treated as a duplicate
    expect(out.attempt?.legs).toHaveLength(1);
    expect(out.attempt?.legs[0]?.score).toBe(4000);
  });

  it('a missing gameId on the next leg is not a duplicate of an absent leg', () => {
    const out = recordLeg(attemptAt(1, T0, boss2.id), boss2, {
      legIndex: 1,
      gameId: undefined as unknown as string,
      score: 3000,
      nowIso: iso(T0_MS + 1000),
    });
    expect(out.status).toBe('COMPLETE');
    expect(out.combinedScore).toBe(4000);
  });

  it('duplicate non-final leg completion keeps the attempt', () => {
    const first = recordLeg(undefined, boss3, {
      legIndex: 0,
      gameId: 'a',
      score: 1000,
      nowIso: T0,
    });
    const dup = recordLeg(first.attempt, boss3, {
      legIndex: 0,
      gameId: 'a',
      score: 9999,
      nowIso: iso(T0_MS + 5000),
    });
    expect(dup.status).toBe('IN_PROGRESS');
    expect(dup.attempt).toBe(first.attempt); // unchanged, same reference
    expect(dup.attempt?.legs).toEqual([{ gameId: 'a', score: 1000 }]);
    expect(dup.attempt?.lastActivityAt).toBe(T0);

    const second = recordLeg(first.attempt, boss3, {
      legIndex: 1,
      gameId: 'b',
      score: 2000,
      nowIso: T0,
    });
    const dupSecond = recordLeg(second.attempt, boss3, {
      legIndex: 1,
      gameId: 'b',
      score: 1,
      nowIso: T0,
    });
    expect(dupSecond.attempt).toEqual(second.attempt);
    expect(dupSecond.status).toBe('IN_PROGRESS');
  });

  /**
   * The QuestService rule from the design, as a small pure helper: a game id equal to the node's
   * `lastGameId` is a duplicate of the final leg and is answered without calling recordLeg.
   */
  function completeBossLeg(
    progress: WorldProgress | undefined,
    attempt: GauntletAttempt | undefined,
    node: QuestNode,
    legIndex: number,
    gameId: string,
    score: number,
    nowIso: string
  ) {
    if (progress?.nodes[node.id]?.lastGameId === gameId) {
      return { progress, attempt, status: 'COMPLETE' as const, duplicate: true };
    }
    const rec = recordLeg(attempt, node, { legIndex, gameId, score, nowIso });
    if (rec.status !== 'COMPLETE')
      return { progress, attempt: rec.attempt, status: rec.status, duplicate: false };
    const outcome = applyNodeResult(
      world1,
      progress,
      { nodeId: node.id, score: rec.combinedScore ?? 0, nowIso, gameId },
      ctx
    );
    return {
      progress: outcome.progress,
      attempt: undefined,
      status: 'COMPLETE' as const,
      duplicate: false,
      outcome,
    };
  }

  it('duplicate final leg completion changes nothing', () => {
    const l0 = recordLeg(undefined, boss2, { legIndex: 0, gameId: 'a', score: 3200, nowIso: T0 });
    const done = completeBossLeg(undefined, l0.attempt, boss2, 1, 'b', 3300, T0);
    expect(done.status).toBe('COMPLETE');
    const again = completeBossLeg(
      done.progress,
      done.attempt,
      boss2,
      1,
      'b',
      3300,
      iso(T0_MS + 1000)
    );
    expect(again.duplicate).toBe(true);
    expect(again.progress).toBe(done.progress);
    expect(again.progress?.nodes[boss2.id]?.lastPlayedAt).toBe(T0);
    expect(again.attempt).toBeUndefined();
  });

  it('duplicate of a lower-scoring final leg changes nothing and reports COMPLETE', () => {
    const firstRun = completeBossLeg(
      undefined,
      recordLeg(undefined, boss2, { legIndex: 0, gameId: 'a1', score: 3300, nowIso: T0 }).attempt,
      boss2,
      1,
      'b1',
      3300,
      T0
    );
    expect(firstRun.progress?.nodes[boss2.id]?.stars).toBe(1); // 6600 vs 5550/7000
    // A lower-scoring replay: does not improve, but lastGameId is still set.
    const replay0 = recordLeg(undefined, boss2, {
      legIndex: 0,
      gameId: 'a2',
      score: 100,
      nowIso: iso(T0_MS + 1000),
    });
    const replay = completeBossLeg(
      firstRun.progress,
      replay0.attempt,
      boss2,
      1,
      'b2',
      100,
      iso(T0_MS + 2000)
    );
    expect(replay.progress?.nodes[boss2.id]).toMatchObject({
      stars: 1,
      bestScore: 6600,
      lastGameId: 'b2',
    });
    const dup = completeBossLeg(
      replay.progress,
      replay.attempt,
      boss2,
      1,
      'b2',
      100,
      iso(T0_MS + 3000)
    );
    expect(dup.duplicate).toBe(true);
    expect(dup.status).toBe('COMPLETE');
    expect(dup.progress).toBe(replay.progress);
  });

  it('without the lastGameId rule a duplicate final leg would be EXPIRED (why the rule exists)', () => {
    const out = recordLeg(undefined, boss2, { legIndex: 1, gameId: 'b', score: 1, nowIso: T0 });
    expect(out.status).toBe('EXPIRED');
  });
});

describe('combineLegScores (R-STAR-3, R-GAUNT-9)', () => {
  it('sums scores and treats non-finite or negative entries as 0', () => {
    expect(combineLegScores([])).toBe(0);
    expect(combineLegScores([1000, 2500])).toBe(3500);
    expect(combineLegScores([1000, Number.NaN, -5, Infinity, 20])).toBe(1020);
  });
});

describe('gauntlet properties', () => {
  const scoreArb = fc.double({ min: 0, max: 8000, noNaN: true });

  it('playing all legs in order always completes with the sum of the scores', () => {
    fc.assert(
      fc.property(fc.array(scoreArb, { minLength: 3, maxLength: 3 }), (scores) => {
        let attempt: GauntletAttempt | undefined;
        let last: ReturnType<typeof recordLeg> | undefined;
        scores.forEach((score, k) => {
          expect(canStartLeg(attempt, boss3, k, T0_MS + k * 1000)).toBe(true);
          last = recordLeg(attempt, boss3, {
            legIndex: k,
            gameId: `g${k}`,
            score,
            nowIso: iso(T0_MS + k * 1000),
          });
          attempt = last.attempt;
        });
        expect(last?.status).toBe('COMPLETE');
        expect(last?.combinedScore).toBeCloseTo(
          scores.reduce((a, b) => a + b, 0),
          6
        );
        expect(attempt).toBeUndefined();
      })
    );
  });

  it('canStartLeg for k>0 is false whenever idle time >= TTL, true below it', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3 * GAUNTLET_TTL_MS }), (idle) => {
        expect(canStartLeg(attemptAt(1), boss3, 1, T0_MS + idle)).toBe(idle < GAUNTLET_TTL_MS);
      })
    );
  });

  it('recordLeg never throws and never returns an attempt with the wrong leg count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -3, max: 6 }),
        fc.integer({ min: 0, max: 3 }),
        fc.double({ noNaN: false }),
        (legIndex, existing, score) => {
          const out = recordLeg(existing === 0 ? undefined : attemptAt(existing), boss3, {
            legIndex,
            gameId: 'new',
            score,
            nowIso: T0,
          });
          if (out.attempt) {
            expect(out.attempt.legs.length).toBeGreaterThanOrEqual(1);
            expect(out.attempt.legs.length).toBeLessThan(boss3.legs.length);
          }
          expect(['IN_PROGRESS', 'COMPLETE', 'EXPIRED']).toContain(out.status);
        }
      )
    );
  });
});
