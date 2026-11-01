import fc from 'fast-check';
import { QUEST_WORLDS } from './config';
import { applyNodeResult, computeNodeStatuses, starsForScore, totalStars } from './evaluator';
import type { EvalContext, NodeStatus, QuestNode, QuestWorld, WorldProgress } from './types';

const NOW = '2026-11-01T10:00:00.000Z';
const none: EvalContext = { unavailableNodeIds: new Set() };

const worldArb = fc.constantFrom(...(QUEST_WORLDS as QuestWorld[]));
const scoreArb = fc.oneof(
  fc.double({ min: -100, max: 20000, noNaN: true }),
  fc.constantFrom(Number.NaN, Infinity, -Infinity, 0)
);

const nodeIdsOf = (w: QuestWorld) => [...w.nodes, w.bonus].map((n) => n.id);

/** A sequence of results for random nodes of one world. */
const runArb = worldArb.chain((world) =>
  fc.record({
    world: fc.constant(world),
    steps: fc.array(
      fc.record({
        nodeId: fc.constantFrom(...nodeIdsOf(world)),
        score: scoreArb,
      }),
      { maxLength: 25 }
    ),
    unavailable: fc.subarray(
      world.nodes.map((n) => n.id),
      { maxLength: 3 }
    ),
  })
);

function play(world: QuestWorld, steps: { nodeId: string; score: number }[], ctx: EvalContext) {
  let progress: WorldProgress | undefined;
  const history: WorldProgress[] = [];
  steps.forEach((s, i) => {
    const out = applyNodeResult(
      world,
      progress,
      { ...s, nowIso: `2026-11-01T10:${String(i % 60).padStart(2, '0')}:00.000Z`, gameId: `g${i}` },
      ctx
    );
    progress = out.progress;
    history.push(out.progress);
  });
  return { progress, history };
}

describe('starsForScore properties', () => {
  const thresholdsArb = fc
    .tuple(
      fc.integer({ min: 1, max: 5000 }),
      fc.integer({ min: 1, max: 5000 }),
      fc.integer({ min: 1, max: 5000 })
    )
    .map(([a, b, c]) => {
      const t = [a, a + b, a + b + c] as const;
      return t as QuestNode['thresholds'];
    });

  it('is monotonic: a higher score never earns fewer stars', () => {
    fc.assert(
      fc.property(
        thresholdsArb,
        fc.double({ min: 0, max: 20000, noNaN: true }),
        fc.double({ min: 0, max: 20000, noNaN: true }),
        (t, x, y) => {
          const [lo, hi] = x <= y ? [x, y] : [y, x];
          expect(starsForScore(t, lo)).toBeLessThanOrEqual(starsForScore(t, hi));
        }
      )
    );
  });

  it('matches the inclusive threshold definition', () => {
    fc.assert(
      fc.property(thresholdsArb, fc.integer({ min: -10, max: 20000 }), (t, s) => {
        const expected = s >= t[2] ? 3 : s >= t[1] ? 2 : s >= t[0] ? 1 : 0;
        expect(starsForScore(t, s)).toBe(expected);
      })
    );
  });

  it('is always 0..3 for any number, including non-finite', () => {
    fc.assert(
      fc.property(thresholdsArb, fc.double(), (t, s) => {
        expect([0, 1, 2, 3]).toContain(starsForScore(t, s));
      })
    );
  });
});

describe('applyNodeResult properties (R-MONO-1..3)', () => {
  it('a lower or equal score never lowers stars or bestScore', () => {
    fc.assert(
      fc.property(
        worldArb,
        fc.double({ min: 0, max: 15000, noNaN: true }),
        fc.double({ min: 0, max: 15000, noNaN: true }),
        (world, a, b) => {
          const nodeId = (world.nodes[0] as QuestNode).id;
          const [hi, lo] = a >= b ? [a, b] : [b, a];
          const first = applyNodeResult(world, undefined, { nodeId, score: hi, nowIso: NOW }, none);
          const second = applyNodeResult(
            world,
            first.progress,
            { nodeId, score: lo, nowIso: NOW },
            none
          );
          expect(second.progress.nodes[nodeId]?.stars).toBe(first.progress.nodes[nodeId]?.stars);
          expect(second.progress.nodes[nodeId]?.bestScore).toBe(
            first.progress.nodes[nodeId]?.bestScore
          );
          expect(second.bestStars).toBe(first.bestStars);
        }
      )
    );
  });

  it('stars and bestScore never decrease across any sequence of results', () => {
    fc.assert(
      fc.property(runArb, ({ world, steps, unavailable }) => {
        const ctx: EvalContext = { unavailableNodeIds: new Set(unavailable) };
        const { history } = play(world, steps, ctx);
        for (let i = 1; i < history.length; i++) {
          const prev = history[i - 1] as WorldProgress;
          const cur = history[i] as WorldProgress;
          for (const [id, before] of Object.entries(prev.nodes)) {
            expect(cur.nodes[id]?.stars ?? -1).toBeGreaterThanOrEqual(before.stars);
            expect(cur.nodes[id]?.bestScore ?? -1).toBeGreaterThanOrEqual(before.bestScore);
          }
          for (const badge of prev.badges) expect(cur.badges).toContain(badge);
        }
      })
    );
  });

  it('applying the same result twice equals once', () => {
    fc.assert(
      fc.property(
        runArb,
        fc.constantFrom(...QUEST_WORLDS.flatMap(nodeIdsOf)),
        scoreArb,
        ({ world, steps, unavailable }, anyId, score) => {
          const ctx: EvalContext = { unavailableNodeIds: new Set(unavailable) };
          const { progress } = play(world, steps, ctx);
          const nodeId = nodeIdsOf(world).includes(anyId)
            ? anyId
            : (world.nodes[0] as QuestNode).id;
          const input = { nodeId, score, nowIso: NOW, gameId: 'same' };
          const once = applyNodeResult(world, progress, input, ctx);
          const twice = applyNodeResult(world, once.progress, input, ctx);
          expect(twice.progress).toEqual(once.progress);
          expect(twice.newlyUnlocked).toEqual([]);
          expect(twice.badgesAwarded).toEqual([]);
          expect(twice.worldCleared).toBe(false);
        }
      )
    );
  });

  it('the unlock chain is monotonic: AVAILABLE nodes never disappear as results are applied', () => {
    fc.assert(
      fc.property(runArb, ({ world, steps, unavailable }) => {
        const ctx: EvalContext = { unavailableNodeIds: new Set(unavailable) };
        let progress: WorldProgress | undefined;
        let prevStatuses: Record<string, NodeStatus> = computeNodeStatuses(world, progress, ctx);
        steps.forEach((s, i) => {
          const out = applyNodeResult(world, progress, { ...s, nowIso: NOW, gameId: `g${i}` }, ctx);
          progress = out.progress;
          const statuses = computeNodeStatuses(world, progress, ctx);
          for (const [id, status] of Object.entries(prevStatuses)) {
            if (status === 'AVAILABLE') expect(statuses[id]).toBe('AVAILABLE');
          }
          // newlyUnlocked lists exactly the LOCKED -> AVAILABLE transitions (minus the played node)
          for (const id of out.newlyUnlocked) {
            expect(prevStatuses[id]).toBe('LOCKED');
            expect(statuses[id]).toBe('AVAILABLE');
            expect(id).not.toBe(s.nodeId);
          }
          prevStatuses = statuses;
        });
      })
    );
  });

  it('a node is startable only after its predecessor holds a star (hand-crafted order cannot skip)', () => {
    fc.assert(
      fc.property(runArb, ({ world, steps }) => {
        const { progress } = play(world, steps, none);
        const statuses = computeNodeStatuses(world, progress, none);
        world.nodes.forEach((n, i) => {
          if (i === 0) return;
          const prev = world.nodes[i - 1] as QuestNode;
          const ownStars = progress?.nodes[n.id]?.stars ?? 0;
          if (statuses[n.id] === 'AVAILABLE' && ownStars === 0) {
            expect(progress?.nodes[prev.id]?.stars ?? 0).toBeGreaterThan(0);
          }
        });
      })
    );
  });

  it('totalStars is the sum over available path nodes and is bounded by 3 x path length', () => {
    fc.assert(
      fc.property(runArb, ({ world, steps, unavailable }) => {
        const ctx: EvalContext = { unavailableNodeIds: new Set(unavailable) };
        const { progress } = play(world, steps, ctx);
        const total = totalStars(world, progress, ctx);
        const expected = world.nodes
          .filter((n) => !unavailable.includes(n.id))
          .reduce((sum, n) => sum + (progress?.nodes[n.id]?.stars ?? 0), 0);
        expect(total).toBe(expected);
        expect(total).toBeLessThanOrEqual(3 * (world.nodes.length - unavailable.length));
        expect(progress?.totalStars ?? 0).toBe(total);
      })
    );
  });

  it('stars equal the thresholds applied to the sanitized score', () => {
    fc.assert(
      fc.property(worldArb, fc.nat(8), scoreArb, (world, idx, score) => {
        const node = ([...world.nodes, world.bonus][idx] ?? world.bonus) as QuestNode;
        const out = applyNodeResult(
          world,
          undefined,
          { nodeId: node.id, score, nowIso: NOW },
          none
        );
        const clean = Number.isFinite(score) && score >= 0 ? score : 0;
        expect(out.stars).toBe(starsForScore(node.thresholds, clean));
        expect(out.score).toBe(clean);
      })
    );
  });

  it('never throws for valid node ids and any score', () => {
    fc.assert(
      fc.property(runArb, ({ world, steps }) => {
        expect(() => play(world, steps, none)).not.toThrow();
      })
    );
  });
});
