/**
 * Quest Map - launch configuration (FR-QM-1).
 *
 * Adding a node is a config entry plus locale keys only. Display names are not stored here:
 * locale keys derive from ids (`quest.worlds.<worldId>.name`, `quest.nodes.<nodeId>.name`).
 *
 * Thresholds were calibrated against real production percentiles (PL3, see the QM1 functional design,
 * thresholds.md section 8). Because almost every (game, difficulty) has fewer than 20 completions, data may only make a star easier\n * (tier = min(seed, real)); tiers are then spaced at least 15% / 8% apart. Circuit Builder keeps the seed values.
 * Level ids and difficulties for Circuit Builder come from `../circuit/guided-levels`; the
 * config test checks they agree.
 */
import type { QuestLeg, QuestNode, QuestNodeKind, QuestWorld } from './types';

type Thresholds = readonly [number, number, number];

function leg(
  themeId: string,
  catalogGameId: string,
  difficulty: QuestLeg['difficulty'],
  params?: QuestLeg['params']
): QuestLeg {
  return params
    ? Object.freeze({ themeId, catalogGameId, difficulty, params: Object.freeze({ ...params }) })
    : Object.freeze({ themeId, catalogGameId, difficulty });
}

function node(
  id: string,
  kind: QuestNodeKind,
  legs: readonly QuestLeg[],
  thresholds: Thresholds,
  x: number,
  y: number
): QuestNode {
  return Object.freeze({
    id,
    kind,
    legs: Object.freeze([...legs]),
    thresholds: Object.freeze([...thresholds]) as Thresholds,
    map: Object.freeze({ x, y }),
  });
}

const BRAIN_PEAKS: QuestWorld = Object.freeze({
  id: 'brain-peaks',
  order: 1,
  accessTier: 'FREE',
  nodes: Object.freeze([
    node('bp-01-memory', 'GAME', [leg('ANIMALS', 'memory-match', 1)], [1450, 2750, 3000], 20, 92),
    node(
      'bp-02-math',
      'GAME',
      [leg('MATH_CHALLENGE', 'math-challenge', 1)],
      [1800, 2350, 2650],
      60,
      84
    ),
    node('bp-03-words', 'GAME', [leg('WORD_PUZZLE', 'word-puzzle', 1)], [1600, 2200, 2600], 80, 70),
    node(
      'bp-04-sequence',
      'GAME',
      [leg('SEQUENCE_MEMORY', 'sequence-memory', 2)],
      [2100, 2450, 2800],
      45,
      62
    ),
    node(
      'bp-05-geo',
      'GAME',
      [leg('GEO_QUIZ', 'geo-quiz', 2)],
      [2700, 3500, 3950],
      18,
      50
    ),
    node('bp-06-maze', 'GAME', [leg('MATH_MAZE', 'math-maze', 2)], [2500, 2950, 3900], 42, 38),
    node(
      'bp-07-memory-space',
      'GAME',
      [leg('SPACE', 'memory-match', 3)],
      [2500, 4000, 5100],
      72,
      28
    ),
    node(
      'bp-boss',
      'BOSS',
      [leg('MATH_CHALLENGE', 'math-challenge', 2), leg('BUBBLE_POP', 'bubble-pop', 2)],
      [5550, 7000, 7600],
      50,
      10
    ),
  ]),
  bonus: node(
    'bp-bonus-sequence',
    'BONUS',
    [leg('SEQUENCE_MEMORY', 'sequence-memory', 3)],
    [3000, 3450, 4350],
    84,
    10
  ),
  bonusStarThreshold: 14,
});

const SCIENCE_ISLAND: QuestWorld = Object.freeze({
  id: 'science-island',
  order: 2,
  accessTier: 'PAID',
  nodes: Object.freeze([
    node(
      'si-01-bond-burn',
      'GAME',
      [leg('BOND_AND_BURN', 'bond-and-burn', 1)],
      [1550, 2750, 3300],
      80,
      92
    ),
    node(
      'si-02-space-entry',
      'GAME',
      [leg('SPACE_ENTRY', 'space-entry', 1)],
      [2550, 2950, 3200],
      40,
      84
    ),
    node(
      'si-03-circuit-series',
      'GAME',
      [leg('CIRCUIT_BUILDER', 'circuit-builder', 2, { levelId: 'cb-03-series-loop' })],
      [2200, 2950, 3900],
      20,
      70
    ),
    node(
      'si-05-scratch',
      'GAME',
      [leg('SCRATCH_CODING', 'scratch-coding', 1)],
      [250, 1500, 3150],
      55,
      62
    ),
    node(
      'si-04-circuit-branches',
      'GAME',
      [leg('CIRCUIT_BUILDER', 'circuit-builder', 2, { levelId: 'cb-04-parallel-branches' })],
      [2200, 2950, 3900],
      82,
      50
    ),
    node('si-06-mini-golf', 'GAME', [leg('MINI_GOLF', 'mini-golf', 2)], [250, 1850, 4150], 58, 38),
    node(
      'si-07-circuit-parallel',
      'GAME',
      [leg('CIRCUIT_BUILDER', 'circuit-builder', 3, { levelId: 'cb-05-series-vs-parallel' })],
      [2900, 3900, 5200],
      28,
      28
    ),
    node(
      'si-boss',
      'BOSS',
      [
        leg('BOND_AND_BURN', 'bond-and-burn', 3),
        leg('SPACE_ENTRY', 'space-entry', 2),
      ],
      [5950, 8000, 10500],
      50,
      10
    ),
  ]),
  bonus: node(
    'si-bonus',
    'BONUS',
    [leg('CIRCUIT_BUILDER', 'circuit-builder', 4, { levelId: 'cb-07-resistance-limits-current' })],
    [3650, 4900, 6500],
    16,
    10
  ),
  bonusStarThreshold: 16,
});

export const QUEST_WORLDS: readonly QuestWorld[] = Object.freeze([BRAIN_PEAKS, SCIENCE_ISLAND]);

export function listWorlds(): readonly QuestWorld[] {
  return QUEST_WORLDS;
}

export function getWorld(worldId: string): QuestWorld | undefined {
  return QUEST_WORLDS.find((w) => w.id === worldId);
}

/** Path nodes and the bonus node. */
export function getNode(world: QuestWorld, nodeId: string): QuestNode | undefined {
  if (world.bonus.id === nodeId) return world.bonus;
  return world.nodes.find((n) => n.id === nodeId);
}
