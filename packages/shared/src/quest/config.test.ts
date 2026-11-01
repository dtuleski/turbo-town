import { PAID_GAME_THEME_IDS } from '../constants/paid-games';
import { GUIDED_LEVELS } from '../circuit/guided-levels';
import { QUEST_WORLDS, getNode, getWorld, listWorlds } from './config';
import { QUEST_CARD_THEME_IDS, QUEST_GAME_THEME_IDS, QUEST_KNOWN_THEME_IDS } from './themes';
import { validateQuestConfig } from './validate';
import { questContextSchema } from './schema';
import type { QuestWorld, ValidatorDeps } from './types';

const deps: ValidatorDeps = {
  knownThemeIds: new Set(QUEST_KNOWN_THEME_IDS),
  paidThemeIds: new Set(PAID_GAME_THEME_IDS),
  levelDifficulty: (id) => GUIDED_LEVELS[id]?.difficulty,
  pageThemeRequired: new Set(['PATTERN_RECALL']),
};

/** Mutable deep copy of the real config. */
function cloneWorlds(): QuestWorld[] {
  return JSON.parse(JSON.stringify(QUEST_WORLDS)) as QuestWorld[];
}

/** Applies one defect to a copy of the real config and returns the validator output. */
function validateWith(mutate: (worlds: any[]) => void): string[] {
  const worlds = cloneWorlds();
  mutate(worlds);
  return validateQuestConfig(worlds, deps);
}

function expectError(errors: string[], fragment: string): void {
  expect(errors.some((e) => e.includes(fragment))).toBe(true);
}

describe('QUEST_WORLDS (real config)', () => {
  it('passes the validator with the real constants and Circuit Builder levels', () => {
    expect(validateQuestConfig(QUEST_WORLDS, deps)).toEqual([]);
  });

  it('has two worlds with 7 regular nodes, a boss and a bonus each (requirements section 2)', () => {
    expect(listWorlds().map((w) => w.id)).toEqual(['brain-peaks', 'science-island']);
    for (const world of QUEST_WORLDS) {
      expect(world.nodes).toHaveLength(8);
      expect(world.nodes.filter((n) => n.kind === 'GAME')).toHaveLength(7);
      expect(world.nodes[7]?.kind).toBe('BOSS');
      expect(world.bonus.kind).toBe('BONUS');
    }
  });

  it('World 1 is FREE with free games at difficulty 3 or lower, World 2 is PAID', () => {
    const w1 = getWorld('brain-peaks');
    expect(w1?.accessTier).toBe('FREE');
    expect(getWorld('science-island')?.accessTier).toBe('PAID');
    for (const n of [...(w1?.nodes ?? []), ...(w1 ? [w1.bonus] : [])]) {
      for (const l of n.legs) {
        expect(PAID_GAME_THEME_IDS).not.toContain(l.themeId);
        expect(l.difficulty).toBeLessThanOrEqual(3);
      }
    }
  });

  it('boss legs follow the approved launch content', () => {
    expect(getWorld('brain-peaks')?.nodes[7]?.legs.map((l) => l.themeId)).toEqual([
      'MATH_CHALLENGE',
      'BUBBLE_POP',
    ]);
    expect(getWorld('science-island')?.nodes[7]?.legs.map((l) => l.themeId)).toEqual([
      'BOND_AND_BURN',
      'SPACE_ENTRY',
      'TRAFFIC_LAB',
    ]);
  });

  it('every id passes questContextSchema so any node can travel in a questContext', () => {
    for (const world of QUEST_WORLDS) {
      for (const n of [...world.nodes, world.bonus]) {
        expect(
          questContextSchema.safeParse({ worldId: world.id, nodeId: n.id, legIndex: 0 }).success
        ).toBe(true);
      }
    }
  });

  it('getNode finds path nodes and the bonus; getWorld returns undefined for unknown ids', () => {
    const w = QUEST_WORLDS[0] as QuestWorld;
    expect(getNode(w, 'bp-boss')?.kind).toBe('BOSS');
    expect(getNode(w, 'bp-bonus')?.kind).toBe('BONUS');
    expect(getNode(w, 'nope')).toBeUndefined();
    expect(getWorld('nope')).toBeUndefined();
  });

  it('theme allowlist is the union of the card and game ids (18)', () => {
    expect(QUEST_CARD_THEME_IDS).toHaveLength(6);
    expect(QUEST_GAME_THEME_IDS).toHaveLength(12);
    expect(QUEST_KNOWN_THEME_IDS).toHaveLength(18);
    expect(new Set(QUEST_KNOWN_THEME_IDS).size).toBe(18);
  });

  it('PAID_GAME_THEME_IDS matches the server list', () => {
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

  it('thresholds are strictly ascending for every node', () => {
    for (const world of QUEST_WORLDS) {
      for (const n of [...world.nodes, world.bonus]) {
        const [a, b, c] = n.thresholds;
        expect(a).toBeLessThan(b);
        expect(b).toBeLessThan(c);
      }
    }
  });

  it('bonus thresholds are 14 and 16 of a maximum 24 path stars', () => {
    expect(getWorld('brain-peaks')?.bonusStarThreshold).toBe(14);
    expect(getWorld('science-island')?.bonusStarThreshold).toBe(16);
  });
});

describe('validateQuestConfig negative cases (FR-QM-2 AC2 and V1 to V17)', () => {
  it('V1 duplicate world id', () => {
    expectError(
      validateWith((w) => (w[1].id = w[0].id)),
      'duplicate world id'
    );
  });
  it('V1 duplicate world order', () => {
    expectError(
      validateWith((w) => (w[1].order = w[0].order)),
      'duplicate world order'
    );
  });
  it('V1 invalid access tier', () => {
    expectError(
      validateWith((w) => (w[0].accessTier = 'GOLD')),
      'accessTier must be FREE or PAID'
    );
  });
  it('V2 duplicate node id within a world', () => {
    expectError(
      validateWith((w) => (w[0].nodes[1].id = w[0].nodes[0].id)),
      'duplicate node id'
    );
  });
  it('V2 duplicate node id across worlds', () => {
    expectError(
      validateWith((w) => (w[1].nodes[0].id = w[0].nodes[0].id)),
      'duplicate node id'
    );
  });
  it('V2 bonus id colliding with a path node', () => {
    expectError(
      validateWith((w) => (w[0].bonus.id = w[0].nodes[0].id)),
      'duplicate node id'
    );
  });
  it('V3 invalid node id characters', () => {
    expectError(
      validateWith((w) => (w[0].nodes[0].id = 'Bad_Id')),
      'node id must match'
    );
  });
  it('V3 node id longer than 40 characters', () => {
    expectError(
      validateWith((w) => (w[0].nodes[0].id = 'a'.repeat(41))),
      'node id must match'
    );
  });
  it('V3 invalid world id', () => {
    expectError(
      validateWith((w) => (w[0].id = 'Brain Peaks')),
      'world id must match'
    );
  });
  it('V4 last node is not a BOSS', () => {
    expectError(
      validateWith((w) => (w[0].nodes[7].kind = 'GAME')),
      'kind must be BOSS'
    );
  });
  it('V4 a non-last path node is a BOSS', () => {
    expectError(
      validateWith((w) => (w[0].nodes[2].kind = 'BOSS')),
      'kind must be GAME'
    );
  });
  it('V4 bonus node is not BONUS', () => {
    expectError(
      validateWith((w) => (w[0].bonus.kind = 'GAME')),
      'kind must be BONUS'
    );
  });
  it('V4 world without nodes', () => {
    expectError(
      validateWith((w) => (w[0].nodes = [])),
      'world has no nodes'
    );
  });
  it('V5 boss with one leg', () => {
    expectError(
      validateWith((w) => w[0].nodes[7].legs.pop()),
      'BOSS node has 1 legs'
    );
  });
  it('V5 boss with four legs', () => {
    expectError(
      validateWith((w) => {
        const legs = w[1].nodes[7].legs;
        legs.push({ themeId: 'MINI_GOLF', catalogGameId: 'mini-golf', difficulty: 1 });
      }),
      'BOSS node has 4 legs'
    );
  });
  it('V5 regular node with two legs', () => {
    expectError(
      validateWith((w) =>
        w[0].nodes[0].legs.push({
          themeId: 'ANIMALS',
          catalogGameId: 'memory-match',
          difficulty: 2,
        })
      ),
      'GAME node has 2 legs'
    );
  });
  it('V6 unknown themeId', () => {
    expectError(
      validateWith((w) => (w[0].nodes[0].legs[0].themeId = 'NOT_A_GAME')),
      'unknown themeId NOT_A_GAME'
    );
  });
  it('V6 unknown themeId in the bonus node', () => {
    expectError(
      validateWith((w) => (w[1].bonus.legs[0].themeId = 'NOPE')),
      'unknown themeId NOPE'
    );
  });
  it('V7 equal thresholds', () => {
    expectError(
      validateWith((w) => (w[0].nodes[0].thresholds = [1450, 1450, 2650])),
      'strictly ascending'
    );
  });
  it('V7 descending thresholds', () => {
    expectError(
      validateWith((w) => (w[0].nodes[0].thresholds = [2650, 2300, 1450])),
      'strictly ascending'
    );
  });
  it('V7 second and third thresholds equal', () => {
    expectError(
      validateWith((w) => (w[0].nodes[1].thresholds = [1800, 2350, 2350])),
      'strictly ascending'
    );
  });
  it('V7 non-positive threshold', () => {
    expectError(
      validateWith((w) => (w[0].nodes[0].thresholds = [0, 2300, 2650])),
      'finite positive'
    );
  });
  it('V7 non-finite threshold', () => {
    expectError(
      validateWith((w) => (w[0].nodes[0].thresholds = [1450, 2300, Number.NaN])),
      'finite positive'
    );
  });
  it('V8 World 1 leg uses a paid game', () => {
    expectError(
      validateWith((w) => {
        w[0].nodes[0].legs[0].themeId = 'MINI_GOLF';
        w[0].nodes[0].legs[0].difficulty = 1;
      }),
      'paid game MINI_GOLF in a FREE world'
    );
  });
  it('V8 World 1 leg difficulty above 3', () => {
    expectError(
      validateWith((w) => (w[0].nodes[0].legs[0].difficulty = 4)),
      'above 3 in a FREE world'
    );
  });
  it('V8 applies to the World 1 bonus and boss legs', () => {
    expectError(
      validateWith((w) => (w[0].bonus.legs[0].difficulty = 4)),
      'bp-bonus: difficulty 4 above 3 in a FREE world'
    );
    expectError(
      validateWith((w) => (w[0].nodes[7].legs[1].themeId = 'SPACE_ENTRY')),
      'bp-boss: paid game SPACE_ENTRY'
    );
  });
  it('V8 does not apply to a PAID world (paid game and d4 are legal there)', () => {
    expect(validateWith(() => undefined)).toEqual([]);
  });
  it('V9 Circuit Builder level difficulty mismatch', () => {
    expectError(
      validateWith((w) => (w[1].nodes[2].legs[0].difficulty = 3)),
      'does not match level cb-03-series-loop difficulty 2'
    );
  });
  it('V9 Circuit Builder bonus level difficulty mismatch', () => {
    expectError(
      validateWith((w) => (w[1].bonus.legs[0].difficulty = 3)),
      'does not match level cb-07'
    );
  });
  it('V9 Circuit Builder leg without a level', () => {
    expectError(
      validateWith((w) => delete w[1].nodes[2].legs[0].params),
      'needs params.levelId'
    );
  });
  it('V9 unknown Circuit Builder level', () => {
    expectError(
      validateWith((w) => (w[1].nodes[2].legs[0].params.levelId = 'cb-99')),
      'unknown Circuit Builder level'
    );
  });
  it('V9 levelId on another game', () => {
    expectError(
      validateWith((w) => (w[1].nodes[0].legs[0].params = { levelId: 'cb-03-series-loop' })),
      'params.levelId is only valid for CIRCUIT_BUILDER'
    );
  });
  it('V10 difficulty out of range', () => {
    expectError(
      validateWith((w) => (w[1].nodes[0].legs[0].difficulty = 5)),
      'integer from 1 to 4'
    );
    expectError(
      validateWith((w) => (w[1].nodes[0].legs[0].difficulty = 0)),
      'integer from 1 to 4'
    );
    expectError(
      validateWith((w) => (w[1].nodes[0].legs[0].difficulty = 1.5)),
      'integer from 1 to 4'
    );
  });
  it('V10 non-Circuit-Builder leg at difficulty 4 in a PAID world', () => {
    expectError(
      validateWith((w) => (w[1].nodes[0].legs[0].difficulty = 4)),
      'only allowed for CIRCUIT_BUILDER'
    );
  });
  it('V11 Pattern Recall without pageTheme', () => {
    expectError(
      validateWith((w) => delete w[0].nodes[4].legs[0].params),
      'needs params.pageTheme'
    );
    expectError(
      validateWith((w) => (w[0].bonus.legs[0].params.pageTheme = '')),
      'needs params.pageTheme'
    );
  });
  it('V12 bonus threshold zero, too high or fractional', () => {
    expectError(
      validateWith((w) => (w[0].bonusStarThreshold = 0)),
      'bonusStarThreshold must be'
    );
    expectError(
      validateWith((w) => (w[0].bonusStarThreshold = 25)),
      'bonusStarThreshold must be'
    );
    expectError(
      validateWith((w) => (w[0].bonusStarThreshold = 13.5)),
      'bonusStarThreshold must be'
    );
  });
  it('V13 map coordinates out of range', () => {
    expectError(
      validateWith((w) => (w[0].nodes[0].map.x = 2)),
      'map coordinates'
    );
    expectError(
      validateWith((w) => (w[0].nodes[0].map.y = 98)),
      'map coordinates'
    );
    expectError(
      validateWith((w) => (w[0].bonus.map.x = Number.NaN)),
      'map coordinates'
    );
  });
  it('V14 two nodes closer than 10 units (bonus included)', () => {
    expectError(
      validateWith(
        (w) => (w[0].nodes[1].map = { ...w[0].nodes[0].map, y: w[0].nodes[0].map.y - 5 })
      ),
      'closer than 10'
    );
    expectError(
      validateWith((w) => (w[0].bonus.map = { ...w[0].nodes[7].map, x: w[0].nodes[7].map.x + 3 })),
      'closer than 10'
    );
  });
  it('V15 empty or malformed catalogGameId', () => {
    expectError(
      validateWith((w) => (w[0].nodes[0].legs[0].catalogGameId = '')),
      'catalogGameId must match'
    );
    expectError(
      validateWith((w) => (w[0].nodes[0].legs[0].catalogGameId = 'Memory Match')),
      'catalogGameId must match'
    );
  });
  it('V16 duplicate boss legs', () => {
    expectError(
      validateWith((w) => (w[0].nodes[7].legs[1] = { ...w[0].nodes[7].legs[0] })),
      'duplicate boss leg'
    );
  });
  it('V17 3-star threshold above 8000 per leg', () => {
    expectError(
      validateWith((w) => (w[0].nodes[0].thresholds = [1450, 2300, 8001])),
      'exceeds 8000 per leg'
    );
    expectError(
      validateWith((w) => (w[1].nodes[7].thresholds = [8750, 13150, 24001])),
      'exceeds 8000 per leg'
    );
  });
  it('V17 boundary: exactly 8000 per leg is accepted', () => {
    expect(validateWith((w) => (w[0].nodes[0].thresholds = [1450, 2300, 8000]))).toEqual([]);
  });

  it('messages are prefixed with world/node so a failure names the node', () => {
    const errors = validateWith((w) => (w[0].nodes[3].legs[0].themeId = 'NOPE'));
    expect(errors).toEqual(['brain-peaks/bp-04-sequence: unknown themeId NOPE']);
  });

  it('a single defect yields only that defect (no collateral errors)', () => {
    expect(validateWith((w) => (w[0].nodes[0].thresholds = [2650, 2300, 1450]))).toHaveLength(1);
  });

  it('does not mutate the config it validates', () => {
    const before = JSON.stringify(QUEST_WORLDS);
    validateQuestConfig(QUEST_WORLDS, deps);
    expect(JSON.stringify(QUEST_WORLDS)).toBe(before);
  });
});
