/**
 * Guided levels (unit U4): registry shape, reference solutions, rejected wrong answers, concept
 * proofs, and the two authoring constraints that protect the scoring contract.
 *
 * Constraint B: budget of at least 7, at most one LED and one source per level, and the
 * protected reference out-scores every fault-carrying shortcut under the server's formula.
 * Constraint C: every difficulty tier has a completable guided level, proven with the real
 * engine rather than asserted.
 *
 * Fixtures are inline on purpose. A helper file under `src/circuit` would ship in `dist`.
 */
import { connectTerminals, createElement, createLayout } from './builders';
import {
  ELEMENT_SPECS,
  MAX_ELEMENT_COUNT,
  MAX_GRID_COLS,
  MAX_GRID_ROWS,
  MAX_SOURCE_VOLTAGE,
  MIN_SOURCE_VOLTAGE,
  SOURCE_VOLTAGE_STEP,
} from './constants';
import { evaluate } from './evaluate';
import { GUIDED_LEVELS } from './guided-levels';
import { getLevel, listLevels } from './levels';
import { evaluateSuccess } from './success';
import { isEvaluationError } from './types';
import type {
  CircuitLayout,
  CircuitResult,
  ElementKind,
  FaultCode,
  LevelDefinition,
  SwitchStates,
} from './types';
import { validateStructure } from './validation';

// ---------------------------------------------------------------------------
// Inline fixtures
// ---------------------------------------------------------------------------

interface Recipe {
  /** Player-placed elements, in order: [id, kind]. Pre-placed ones come from the level. */
  placed: ReadonlyArray<readonly [string, ElementKind]>;
  conns: ReadonlyArray<readonly [string, string]>;
  switches: SwitchStates;
}

const GUIDED_IDS = [
  'cb-02-switch-control',
  'cb-03-series-loop',
  'cb-04-parallel-branches',
  'cb-05-series-vs-parallel',
  'cb-06-short-circuit-recovery',
  'cb-07-resistance-limits-current',
  'cb-08-variable-voltage',
];

const REFERENCE: Readonly<Record<string, Recipe>> = {
  'cb-01-closed-circuit': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'resistor'],
      ['e3', 'led'],
    ],
    conns: [
      ['e1:0', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e1:1'],
    ],
    switches: {},
  },
  'cb-02-switch-control': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'resistor'],
      ['e3', 'led'],
    ],
    conns: [
      ['e1:0', 'pre-switch:0'],
      ['pre-switch:1', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e1:1'],
    ],
    switches: { 'pre-switch': 'closed' },
  },
  'cb-03-series-loop': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'resistor'],
      ['e3', 'led'],
      ['e4', 'buzzer'],
    ],
    conns: [
      ['e1:0', 'pre-switch:0'],
      ['pre-switch:1', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e4:0'],
      ['e4:1', 'e1:1'],
    ],
    switches: { 'pre-switch': 'closed' },
  },
  'cb-04-parallel-branches': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'resistor'],
      ['e3', 'led'],
      ['e4', 'buzzer'],
    ],
    conns: [
      ['e1:0', 'pre-switch-led:0'],
      ['pre-switch-led:1', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e1:1'],
      ['e1:0', 'pre-switch-buzzer:0'],
      ['pre-switch-buzzer:1', 'e4:0'],
      ['e4:1', 'e1:1'],
    ],
    switches: { 'pre-switch-led': 'closed', 'pre-switch-buzzer': 'closed' },
  },
  'cb-05-series-vs-parallel': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'motor'],
      ['e3', 'motor'],
      ['e4', 'resistor'],
      ['e5', 'led'],
      ['e6', 'buzzer'],
    ],
    conns: [
      ['e1:0', 'e2:0'],
      ['e1:0', 'e3:0'],
      ['e1:0', 'e4:0'],
      ['e1:0', 'e6:0'],
      ['e4:1', 'e5:0'],
      ['e2:1', 'e1:1'],
      ['e3:1', 'e1:1'],
      ['e5:1', 'e1:1'],
      ['e6:1', 'e1:1'],
    ],
    switches: {},
  },
  'cb-06-short-circuit-recovery': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'resistor'],
      ['e3', 'led'],
      ['e4', 'wire'],
    ],
    conns: [
      ['e1:0', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e4:0'],
      ['e4:1', 'e1:1'],
    ],
    switches: {},
  },
  'cb-07-resistance-limits-current': {
    placed: [['e1', 'resistor']],
    conns: [
      ['pre-battery:0', 'e1:0'],
      ['e1:1', 'pre-led:0'],
      ['pre-led:1', 'pre-battery:1'],
    ],
    switches: {},
  },
  'cb-08-variable-voltage': {
    placed: [
      ['e1', 'battery'],
      ['e2', 'motor'],
      ['e3', 'buzzer'],
      ['e4', 'resistor'],
      ['e5', 'led'],
    ],
    conns: [
      ['e1:0', 'pre-switch-master:0'],
      ['pre-switch-master:1', 'e2:0'],
      ['pre-switch-master:1', 'e3:0'],
      ['pre-switch-master:1', 'pre-switch-headlight:0'],
      ['pre-switch-headlight:1', 'e4:0'],
      ['e4:1', 'e5:0'],
      ['e2:1', 'e1:1'],
      ['e3:1', 'e1:1'],
      ['e5:1', 'e1:1'],
    ],
    switches: { 'pre-switch-master': 'closed', 'pre-switch-headlight': 'closed' },
  },
};

function level(id: string): LevelDefinition {
  const found = getLevel(id);
  if (found === undefined) {
    throw new Error(`missing level ${id}`);
  }
  return found;
}

function layoutOf(lvl: LevelDefinition, recipe: Recipe): CircuitLayout {
  const placed = recipe.placed.map(([id, kind], index) =>
    createElement(kind, {
      id,
      position: { col: index % lvl.gridSize.cols, row: 0, rotation: 0 },
    })
  );
  return createLayout(
    [...lvl.prePlaced, ...placed],
    recipe.conns.map(([from, to]) => connectTerminals(from, to)),
    lvl.gridSize
  );
}

function solve(
  lvl: LevelDefinition,
  recipe: Recipe,
  options: { switches?: SwitchStates; voltage?: number } = {}
): CircuitResult {
  const outcome = evaluate(layoutOf(lvl, recipe), options.switches ?? recipe.switches, {
    sourceVoltage: options.voltage ?? 9,
    lightLevel: 1,
  });
  if (isEvaluationError(outcome)) {
    throw new Error(`${lvl.id}: ${outcome.errorCode} ${JSON.stringify(outcome.issues)}`);
  }
  return outcome;
}

function judge(
  lvl: LevelDefinition,
  recipe: Recipe,
  options: { switches?: SwitchStates; voltage?: number } = {}
): { satisfied: boolean; unmet: string[]; faults: FaultCode[]; result: CircuitResult } {
  const result = solve(lvl, recipe, options);
  const outcome = evaluateSuccess(lvl, result);
  return {
    satisfied: outcome.satisfied,
    unmet: [...outcome.unmetClauses],
    faults: result.faults.map((fault) => fault.code),
    result,
  };
}

function energized(result: CircuitResult, elementId: string): boolean {
  return result.elements.find((entry) => entry.elementId === elementId)?.energized === true;
}

function intensityOf(result: CircuitResult, elementId: string): number {
  return result.elements.find((entry) => entry.elementId === elementId)?.intensity ?? Number.NaN;
}

function budgetOf(lvl: LevelDefinition): number {
  return (
    Object.values(lvl.availableComponents).reduce((sum, count) => sum + (count ?? 0), 0) +
    lvl.prePlaced.length
  );
}

function countKind(lvl: LevelDefinition, kind: ElementKind): number {
  return (lvl.availableComponents[kind] ?? 0) + lvl.prePlaced.filter((e) => e.kind === kind).length;
}

const NON_SANDBOX = (): LevelDefinition[] => listLevels().filter((entry) => entry.id !== 'sandbox');

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe('guided level registry', () => {
  const DISCLOSURE = ['none', 'qualitative', 'values', 'full'] as const;

  it('defines exactly cb-02 to cb-08 and registers them with the first level and the sandbox', () => {
    expect(Object.keys(GUIDED_LEVELS).sort()).toEqual([...GUIDED_IDS].sort());
    expect(listLevels().map((entry) => entry.id)).toEqual([
      'cb-01-closed-circuit',
      ...GUIDED_IDS,
      'sandbox',
    ]);
  });

  it('keeps two guided levels per difficulty tier across cb-01 to cb-08', () => {
    const tiers = NON_SANDBOX().map((entry) => entry.difficulty);
    expect(tiers).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  describe.each(GUIDED_IDS)('%s', (id) => {
    const lvl = GUIDED_LEVELS[id] as LevelDefinition;

    it('is reachable through getLevel and carries its own id', () => {
      expect(getLevel(id)).toBe(lvl);
      expect(lvl.id).toBe(id);
    });

    it('maps difficulty to numeric disclosure', () => {
      expect(lvl.numericDisclosure).toBe(DISCLOSURE[lvl.difficulty - 1]);
    });

    it('targets the Mars Rover with a real success condition', () => {
      expect(lvl.targetMachineId).toBe('mars-rover');
      expect(['rover-headlight-on', 'rover-fully-powered']).toContain(lvl.successConditionId);
      expect(lvl.conceptTag.length).toBeGreaterThan(0);
    });

    it('fits inside the grid and element ceilings', () => {
      expect(lvl.gridSize.cols).toBeLessThanOrEqual(MAX_GRID_COLS);
      expect(lvl.gridSize.rows).toBeLessThanOrEqual(MAX_GRID_ROWS);
      expect(budgetOf(lvl)).toBeLessThanOrEqual(MAX_ELEMENT_COUNT);
    });

    it('pre-places valid, pre-* elements and locks exactly those', () => {
      const issues = validateStructure(
        createLayout(lvl.prePlaced, [], lvl.gridSize),
        {},
        {
          sourceVoltage: 9,
          lightLevel: 1,
        }
      ).issues;
      expect(issues).toEqual([]);
      for (const element of lvl.prePlaced) {
        expect(element.id.startsWith('pre-')).toBe(true);
      }
      expect([...lvl.lockedElementIds].sort()).toEqual(lvl.prePlaced.map((e) => e.id).sort());
    });

    it('is deeply frozen', () => {
      expect(Object.isFrozen(lvl)).toBe(true);
      expect(Object.isFrozen(lvl.gridSize)).toBe(true);
      expect(Object.isFrozen(lvl.availableComponents)).toBe(true);
      expect(Object.isFrozen(lvl.prePlaced)).toBe(true);
      expect(Object.isFrozen(lvl.lockedElementIds)).toBe(true);
      for (const element of lvl.prePlaced) {
        expect(Object.isFrozen(element)).toBe(true);
        expect(Object.isFrozen(element.position)).toBe(true);
        expect(Object.isFrozen(element.terminals)).toBe(true);
      }
    });
  });

  it('freezes the registry itself', () => {
    expect(Object.isFrozen(GUIDED_LEVELS)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Reference solutions
// ---------------------------------------------------------------------------

describe('reference solutions (real engine, 9 V, light 1)', () => {
  describe.each(['cb-01-closed-circuit', ...GUIDED_IDS])('%s', (id) => {
    const lvl = level(id);
    const recipe = REFERENCE[id] as Recipe;

    it('satisfies the success condition with no fault', () => {
      const verdict = judge(lvl, recipe);
      expect(verdict.unmet).toEqual([]);
      expect(verdict.satisfied).toBe(true);
      expect(verdict.faults).toEqual([]);
    });

    it('stays inside the level allowance and the grid', () => {
      const layout = layoutOf(lvl, recipe);
      for (const kind of new Set(layout.elements.map((e) => e.kind))) {
        const used = layout.elements.filter((e) => e.kind === kind).length;
        expect(used).toBeLessThanOrEqual(countKind(lvl, kind));
      }
      expect(layout.elements.length).toBeLessThanOrEqual(budgetOf(lvl));
      for (const element of layout.elements) {
        expect(element.position.col).toBeLessThan(lvl.gridSize.cols);
        expect(element.position.row).toBeLessThan(lvl.gridSize.rows);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Wrong answers and accepted-but-penalised layouts
// ---------------------------------------------------------------------------

interface WrongCase {
  name: string;
  levelId: string;
  recipe: Recipe;
  unmet: string[];
  voltage?: number;
  fault?: FaultCode;
}

function withConns(id: string, conns: Recipe['conns'], placed?: Recipe['placed']): Recipe {
  const base = REFERENCE[id] as Recipe;
  return { placed: placed ?? base.placed, conns, switches: base.switches };
}

function withSwitch(id: string, switchId: string, state: 'open' | 'closed'): Recipe {
  const base = REFERENCE[id] as Recipe;
  return { ...base, switches: { ...base.switches, [switchId]: state } };
}

function without(id: string, dropped: string): Recipe['conns'] {
  const base = REFERENCE[id] as Recipe;
  return base.conns.filter(([from, to]) => `${from}~${to}` !== dropped);
}

const WRONG: WrongCase[] = [
  {
    name: 'LED reversed',
    levelId: 'cb-01-closed-circuit',
    recipe: withConns('cb-01-closed-circuit', [
      ['e1:0', 'e2:0'],
      ['e2:1', 'e3:1'],
      ['e3:0', 'e1:1'],
    ]),
    unmet: ['headlightOn'],
    fault: 'REVERSED_POLARITY',
  },
  {
    name: 'no return connection',
    levelId: 'cb-01-closed-circuit',
    recipe: withConns('cb-01-closed-circuit', without('cb-01-closed-circuit', 'e3:1~e1:1')),
    unmet: ['headlightOn'],
  },
  {
    name: 'wire across the battery',
    levelId: 'cb-01-closed-circuit',
    recipe: withConns(
      'cb-01-closed-circuit',
      [...(REFERENCE['cb-01-closed-circuit'] as Recipe).conns, ['e4:0', 'e1:0'], ['e4:1', 'e1:1']],
      [...(REFERENCE['cb-01-closed-circuit'] as Recipe).placed, ['e4', 'wire']]
    ),
    unmet: ['noBlockingFault', 'headlightOn'],
    fault: 'SHORT_CIRCUIT',
  },
  {
    name: 'switch left open',
    levelId: 'cb-02-switch-control',
    recipe: withSwitch('cb-02-switch-control', 'pre-switch', 'open'),
    unmet: ['headlightOn'],
  },
  {
    name: 'LED reversed',
    levelId: 'cb-02-switch-control',
    recipe: withConns('cb-02-switch-control', [
      ['e1:0', 'pre-switch:0'],
      ['pre-switch:1', 'e2:0'],
      ['e2:1', 'e3:1'],
      ['e3:0', 'e1:1'],
    ]),
    unmet: ['headlightOn'],
    fault: 'REVERSED_POLARITY',
  },
  {
    name: 'switch open (series: everything stops)',
    levelId: 'cb-03-series-loop',
    recipe: withSwitch('cb-03-series-loop', 'pre-switch', 'open'),
    unmet: ['headlightOn'],
  },
  {
    name: 'buzzer not returned to the battery',
    levelId: 'cb-03-series-loop',
    recipe: withConns('cb-03-series-loop', without('cb-03-series-loop', 'e4:1~e1:1')),
    unmet: ['headlightOn'],
  },
  {
    name: 'LED branch switch open',
    levelId: 'cb-04-parallel-branches',
    recipe: withSwitch('cb-04-parallel-branches', 'pre-switch-led', 'open'),
    unmet: ['headlightOn'],
  },
  {
    name: 'everything in one series loop at 9 V',
    levelId: 'cb-05-series-vs-parallel',
    recipe: withConns('cb-05-series-vs-parallel', [
      ['e1:0', 'e4:0'],
      ['e4:1', 'e5:0'],
      ['e5:1', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e6:0'],
      ['e6:1', 'e1:1'],
    ]),
    unmet: ['driveMotorTurning'],
  },
  {
    name: 'everything in one series loop at 12 V',
    levelId: 'cb-05-series-vs-parallel',
    voltage: 12,
    recipe: withConns('cb-05-series-vs-parallel', [
      ['e1:0', 'e4:0'],
      ['e4:1', 'e5:0'],
      ['e5:1', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e6:0'],
      ['e6:1', 'e1:1'],
    ]),
    unmet: ['driveMotorTurning'],
  },
  {
    name: 'wire across the battery',
    levelId: 'cb-06-short-circuit-recovery',
    recipe: withConns('cb-06-short-circuit-recovery', [
      ['e1:0', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e1:1'],
      ['e4:0', 'e1:0'],
      ['e4:1', 'e1:1'],
    ]),
    unmet: ['noBlockingFault', 'headlightOn'],
    fault: 'SHORT_CIRCUIT',
  },
  {
    name: 'wire across the LED',
    levelId: 'cb-06-short-circuit-recovery',
    recipe: withConns('cb-06-short-circuit-recovery', [
      ['e1:0', 'e2:0'],
      ['e2:1', 'e3:0'],
      ['e3:1', 'e1:1'],
      ['e4:0', 'e3:0'],
      ['e4:1', 'e3:1'],
    ]),
    unmet: ['headlightOn'],
  },
  {
    name: 'LED reversed',
    levelId: 'cb-07-resistance-limits-current',
    recipe: withConns('cb-07-resistance-limits-current', [
      ['pre-battery:0', 'e1:0'],
      ['e1:1', 'pre-led:1'],
      ['pre-led:0', 'pre-battery:1'],
    ]),
    unmet: ['headlightOn'],
    fault: 'REVERSED_POLARITY',
  },
  {
    name: 'resistor-only loop with the LED left out',
    levelId: 'cb-07-resistance-limits-current',
    recipe: withConns('cb-07-resistance-limits-current', [
      ['pre-battery:0', 'e1:0'],
      ['e1:1', 'pre-battery:1'],
    ]),
    unmet: ['headlightOn'],
  },
  {
    name: 'master switch open',
    levelId: 'cb-08-variable-voltage',
    recipe: withSwitch('cb-08-variable-voltage', 'pre-switch-master', 'open'),
    unmet: ['driveMotorTurning', 'headlightOn', 'buzzerSounding'],
  },
  {
    name: 'headlight switch open',
    levelId: 'cb-08-variable-voltage',
    recipe: withSwitch('cb-08-variable-voltage', 'pre-switch-headlight', 'open'),
    unmet: ['headlightOn'],
  },
  {
    name: 'supply at 1.5 V',
    levelId: 'cb-08-variable-voltage',
    voltage: 1.5,
    recipe: REFERENCE['cb-08-variable-voltage'] as Recipe,
    unmet: ['driveMotorTurning'],
  },
];

describe('rejected wrong answers', () => {
  it.each(WRONG.map((entry) => [entry.levelId, entry.name, entry] as const))(
    '%s rejects: %s',
    (_levelId, _name, entry) => {
      const lvl = level(entry.levelId);
      const verdict = judge(lvl, entry.recipe, { voltage: entry.voltage });
      expect(verdict.satisfied).toBe(false);
      expect(verdict.unmet).toEqual(entry.unmet);
      if (entry.fault !== undefined) {
        expect(verdict.faults).toContain(entry.fault);
      }
    }
  );
});

describe('accepted but penalised layouts', () => {
  const ACCEPTED: Array<{
    name: string;
    levelId: string;
    recipe: Recipe;
    faults: FaultCode[];
  }> = [
    {
      name: 'LED with no resistor',
      levelId: 'cb-01-closed-circuit',
      recipe: {
        placed: [
          ['e1', 'battery'],
          ['e3', 'led'],
        ],
        conns: [
          ['e1:0', 'e3:0'],
          ['e3:1', 'e1:1'],
        ],
        switches: {},
      },
      faults: ['OVERCURRENT'],
    },
    {
      name: 'two resistors in parallel',
      levelId: 'cb-07-resistance-limits-current',
      recipe: {
        placed: [
          ['e1', 'resistor'],
          ['e2', 'resistor'],
        ],
        conns: [
          ['pre-battery:0', 'e1:0'],
          ['pre-battery:0', 'e2:0'],
          ['e1:1', 'pre-led:0'],
          ['e2:1', 'pre-led:0'],
          ['pre-led:1', 'pre-battery:1'],
        ],
        switches: {},
      },
      faults: ['OVERCURRENT'],
    },
    {
      name: 'no resistor',
      levelId: 'cb-07-resistance-limits-current',
      recipe: {
        placed: [],
        conns: [
          ['pre-battery:0', 'pre-led:0'],
          ['pre-led:1', 'pre-battery:1'],
        ],
        switches: {},
      },
      faults: ['OVERCURRENT'],
    },
    {
      name: 'two resistors in series (still protected)',
      levelId: 'cb-07-resistance-limits-current',
      recipe: {
        placed: [
          ['e1', 'resistor'],
          ['e2', 'resistor'],
        ],
        conns: [
          ['pre-battery:0', 'e1:0'],
          ['e1:1', 'e2:0'],
          ['e2:1', 'pre-led:0'],
          ['pre-led:1', 'pre-battery:1'],
        ],
        switches: {},
      },
      faults: [],
    },
  ];

  it.each(ACCEPTED.map((entry) => [entry.levelId, entry.name, entry] as const))(
    '%s accepts: %s',
    (_levelId, _name, entry) => {
      const verdict = judge(level(entry.levelId), entry.recipe);
      expect(verdict.unmet).toEqual([]);
      expect(verdict.satisfied).toBe(true);
      expect(verdict.faults).toEqual(entry.faults);
    }
  );
});

// ---------------------------------------------------------------------------
// Concept proofs
// ---------------------------------------------------------------------------

describe('concept proofs', () => {
  it('cb-02: the switch gates the light', () => {
    const lvl = level('cb-02-switch-control');
    const closed = judge(lvl, withSwitch('cb-02-switch-control', 'pre-switch', 'closed'));
    const open = judge(lvl, withSwitch('cb-02-switch-control', 'pre-switch', 'open'));
    expect(closed.satisfied).toBe(true);
    expect(energized(closed.result, 'e3')).toBe(true);
    expect(open.satisfied).toBe(false);
    expect(energized(open.result, 'e3')).toBe(false);
  });

  it('cb-03: one open switch darkens both the LED and the buzzer', () => {
    const lvl = level('cb-03-series-loop');
    const closed = solve(lvl, withSwitch('cb-03-series-loop', 'pre-switch', 'closed'));
    const open = solve(lvl, withSwitch('cb-03-series-loop', 'pre-switch', 'open'));
    expect(energized(closed, 'e3')).toBe(true);
    expect(energized(closed, 'e4')).toBe(true);
    expect(energized(open, 'e3')).toBe(false);
    expect(energized(open, 'e4')).toBe(false);
  });

  it('cb-04: with the buzzer branch open the LED stays lit and the level still passes', () => {
    const lvl = level('cb-04-parallel-branches');
    const verdict = judge(lvl, withSwitch('cb-04-parallel-branches', 'pre-switch-buzzer', 'open'));
    expect(verdict.satisfied).toBe(true);
    expect(energized(verdict.result, 'e3')).toBe(true);
    expect(energized(verdict.result, 'e4')).toBe(false);
  });

  it('cb-05: motors in a series pair turn less brightly than motors in parallel', () => {
    const lvl = level('cb-05-series-vs-parallel');
    const parallel = solve(lvl, REFERENCE['cb-05-series-vs-parallel'] as Recipe);
    const seriesPair = solve(
      lvl,
      withConns('cb-05-series-vs-parallel', [
        ['e1:0', 'e2:0'],
        ['e2:1', 'e3:0'],
        ['e3:1', 'e1:1'],
        ['e1:0', 'e4:0'],
        ['e1:0', 'e6:0'],
        ['e4:1', 'e5:0'],
        ['e5:1', 'e1:1'],
        ['e6:1', 'e1:1'],
      ])
    );
    for (const motorId of ['e2', 'e3']) {
      expect(intensityOf(seriesPair, motorId)).toBeGreaterThan(0);
      expect(intensityOf(seriesPair, motorId)).toBeLessThan(intensityOf(parallel, motorId));
    }
  });

  it('cb-06: the short-circuit mistake is a blocking fault and the fix clears it', () => {
    const lvl = level('cb-06-short-circuit-recovery');
    const shorted = judge(
      lvl,
      withConns('cb-06-short-circuit-recovery', [
        ['e1:0', 'e2:0'],
        ['e2:1', 'e3:0'],
        ['e3:1', 'e1:1'],
        ['e4:0', 'e1:0'],
        ['e4:1', 'e1:1'],
      ])
    );
    expect(shorted.faults).toContain('SHORT_CIRCUIT');
    expect(shorted.satisfied).toBe(false);
    const fixed = judge(lvl, REFERENCE['cb-06-short-circuit-recovery'] as Recipe);
    expect(fixed.satisfied).toBe(true);
  });

  it('cb-08: the voltage sweep never stacks faults and fails only when starved', () => {
    const lvl = level('cb-08-variable-voltage');
    const recipe = REFERENCE['cb-08-variable-voltage'] as Recipe;
    const passes: Record<string, boolean> = {};
    for (
      let volts = MIN_SOURCE_VOLTAGE;
      volts <= MAX_SOURCE_VOLTAGE + 1e-9;
      volts += SOURCE_VOLTAGE_STEP
    ) {
      const verdict = judge(lvl, recipe, { voltage: volts });
      expect(verdict.faults.length).toBeLessThanOrEqual(1);
      passes[String(volts)] = verdict.satisfied;
      if (!verdict.satisfied) {
        expect(verdict.unmet).toEqual(['driveMotorTurning']);
      }
    }
    expect(passes['1.5']).toBe(false);
    expect(passes['9']).toBe(true);
    expect(passes['12']).toBe(true);
    // Pinned from the engine: once the motor turns it keeps turning at every higher voltage.
    const ordered = Object.keys(passes)
      .map(Number)
      .sort((a, b) => a - b)
      .map((volts) => passes[String(volts)]);
    const firstPass = ordered.indexOf(true);
    expect(firstPass).toBeGreaterThan(0);
    expect(ordered.slice(firstPass).every(Boolean)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Constraint C
// ---------------------------------------------------------------------------

describe('Constraint C: every difficulty tier is completable', () => {
  it.each([1, 2, 3, 4] as const)(
    'difficulty %i has at least two completable guided levels',
    (tier) => {
      const completable = NON_SANDBOX().filter((lvl) => {
        if (lvl.difficulty !== tier || lvl.successConditionId === 'none') {
          return false;
        }
        const recipe = REFERENCE[lvl.id];
        return recipe !== undefined && judge(lvl, recipe).satisfied;
      });
      expect(completable.length).toBeGreaterThanOrEqual(2);
    }
  );
});

// ---------------------------------------------------------------------------
// Constraint B
// ---------------------------------------------------------------------------

describe('Constraint B: authoring limits', () => {
  /** U6 contract: functional-design.md section 4, "a guided level must grant a budget of 7". */
  const GUIDED_MIN_BUDGET = 7;

  it.each(NON_SANDBOX().map((lvl) => [lvl.id, lvl] as const))(
    '%s grants a budget of at least 7',
    (_id, lvl) => {
      expect(budgetOf(lvl)).toBeGreaterThanOrEqual(GUIDED_MIN_BUDGET);
    }
  );

  it.each(NON_SANDBOX().map((lvl) => [lvl.id, lvl] as const))(
    '%s has at most one LED and one source, counting pre-placed parts',
    (_id, lvl) => {
      expect(countKind(lvl, 'led')).toBeLessThanOrEqual(1);
      expect(countKind(lvl, 'battery') + countKind(lvl, 'solar')).toBeLessThanOrEqual(1);
    }
  );

  it.each(NON_SANDBOX().map((lvl) => [lvl.id, lvl] as const))(
    '%s never lists a kind both pre-placed and in the tray',
    (_id, lvl) => {
      for (const element of lvl.prePlaced) {
        expect(lvl.availableComponents[element.kind] ?? 0).toBe(0);
      }
    }
  );

  it('motor and buzzer cannot overload with one source at the highest legal voltage', () => {
    const sourceResistance = ELEMENT_SPECS.battery.internalResistance as number;
    for (const kind of ['motor', 'buzzer'] as const) {
      const spec = ELEMENT_SPECS[kind];
      const worstCurrent = MAX_SOURCE_VOLTAGE / ((spec.resistance as number) + sourceResistance);
      expect(worstCurrent).toBeLessThan(spec.ratedCurrent as number);
    }
  });

  it.each(NON_SANDBOX().map((lvl) => [lvl.id, lvl] as const))(
    '%s: every load straight across the source at 12 V leaves at most one LED fault',
    (_id, lvl) => {
      const loadKinds: ElementKind[] = ['led', 'motor', 'buzzer'];
      const sourceKind: ElementKind = countKind(lvl, 'battery') > 0 ? 'battery' : 'solar';
      const placed: Array<readonly [string, ElementKind]> = [['src', sourceKind]];
      const conns: Array<readonly [string, string]> = [];
      for (const kind of loadKinds) {
        for (let index = 0; index < countKind(lvl, kind); index += 1) {
          const id = `${kind}${index}`;
          placed.push([id, kind]);
          conns.push(['src:0', `${id}:0`], [`${id}:1`, 'src:1']);
        }
      }
      // Pre-placed ids are not used here: this builds the worst case from kinds alone.
      const bare: LevelDefinition = { ...lvl, prePlaced: [] };
      const result = solve(bare, { placed, conns, switches: {} }, { voltage: 12 });
      const codes = result.faults.map((fault) => fault.code);
      expect(codes.every((code) => code === 'OVERCURRENT' || code === 'REVERSED_POLARITY')).toBe(
        true
      );
      expect(codes.length).toBeLessThanOrEqual(1);
    }
  );
});

// ---------------------------------------------------------------------------
// Constraint B: scoring rank
// ---------------------------------------------------------------------------

/**
 * Test-local mirror of the server score (U6). Constants are duplicated on purpose from
 * services/game/src/utils/circuit-builder.ts and calculateCircuitBuilderBreakdown in
 * services/game/src/services/score-calculator.service.ts. The goldens below are asserted by
 * U6's own tests (services/game/tests/unit/services/circuit-score.test.ts), so if the server
 * formula changes, the goldens stop matching and this suite says so.
 */
function mirrorScore(
  lvl: LevelDefinition,
  componentCount: number,
  unresolved: number,
  faultCount: number,
  seconds: number,
  difficulty: number
): number {
  const targetTime =
    ({ 1: 90, 2: 120, 3: 150, 4: 180 } as Record<number, number>)[difficulty] ?? 120;
  const speedBonus = Math.min(
    1.15,
    Math.max(0.9, 1 + (0.15 * (targetTime - seconds)) / targetTime)
  );
  const budget = budgetOf(lvl);
  const efficiency = Math.min(1, Math.max(0, (budget - componentCount) / Math.max(1, budget - 2)));
  const cleared = Math.max(0, faultCount - unresolved);
  const penalty = Math.min(0.6, Math.min(0.3, cleared * 0.05) + unresolved * 0.3);
  const quality = Math.min(1, Math.max(0, efficiency - penalty));
  const multiplier = ({ 1: 1, 2: 1.5, 3: 2, 4: 2.5 } as Record<number, number>)[difficulty] ?? 1;
  return Math.min(8000, Math.max(0, Math.round(1700 * multiplier * speedBonus * (0.5 + quality))));
}

/** Remove one element and join its two nets, modelling "drop a part" and "skip the resistor". */
function bypass(layout: CircuitLayout, removeId: string): CircuitLayout | null {
  const target = layout.elements.find((element) => element.id === removeId);
  if (target === undefined) {
    return null;
  }
  const [t0, t1] = target.terminals;
  const neighbour = layout.connections
    .filter((c) => [c.from, c.to].some((end) => end === t0 || end === t1))
    .flatMap((c) => [c.from, c.to])
    .find((end) => end !== t0 && end !== t1);
  if (neighbour === undefined) {
    return null;
  }
  const remap = (end: string): string => (end === t0 || end === t1 ? neighbour : end);
  const connections = layout.connections
    .map((c) => ({ from: remap(c.from), to: remap(c.to) }))
    .filter((c) => c.from !== c.to)
    .map((c, index) => connectTerminals(c.from, c.to, `v${index}`));
  return createLayout(
    layout.elements.filter((element) => element.id !== removeId),
    connections,
    layout.gridSize
  );
}

describe('Constraint B: protected reference out-scores fault-carrying shortcuts', () => {
  const cb01 = level('cb-01-closed-circuit');
  const printed: string[] = [];

  afterAll(() => {
    // Informational: bypass variants that stay valid. Non-fault shortcuts may out-score the
    // reference, which is why the lesson-bearing parts are locked pre-placed elements.
    // eslint-disable-next-line no-console
    console.log(
      ['level | removed | satisfied | faults | parts | score@0 | ref@0 | note', ...printed].join(
        '\n'
      )
    );
  });

  it('mirrors the U6 goldens for cb-01 at difficulty 1', () => {
    expect(mirrorScore(cb01, 3, 0, 0, 90, 1)).toBe(2210);
    expect(mirrorScore(cb01, 2, 1, 0, 90, 1)).toBe(2040);
    expect(mirrorScore(cb01, 3, 0, 0, 120, 1)).toBe(2100);
    expect(mirrorScore(cb01, 6, 0, 3, 45, 1)).toBe(1005);
    expect(mirrorScore(cb01, 5, 0, 1, 30, 1)).toBe(1590);
    const history: ReadonlyArray<readonly [number, number, number]> = [
      [0, 2210, 2040],
      [1, 2125, 2040],
      [2, 2040, 1955],
      [3, 1955, 1870],
      [6, 1700, 1615],
      [7, 1700, 1530],
      [12, 1700, 1530],
      [20, 1700, 1530],
    ];
    for (const [faultCount, protectedScore, unprotectedScore] of history) {
      expect(mirrorScore(cb01, 3, 0, faultCount, 90, 1)).toBe(protectedScore);
      expect(mirrorScore(cb01, 2, 1, faultCount, 90, 1)).toBe(unprotectedScore);
    }
  });

  describe.each(NON_SANDBOX().map((lvl) => [lvl.id, lvl] as const))('%s', (id, lvl) => {
    const recipe = REFERENCE[id] as Recipe;
    const layout = layoutOf(lvl, recipe);
    const reference = solve(lvl, recipe);

    it('scores every still-valid variant with more faults strictly lower', () => {
      let checked = 0;
      for (const element of layout.elements) {
        const variant = bypass(layout, element.id);
        if (variant === null) {
          continue;
        }
        const outcome = evaluate(variant, recipe.switches, { sourceVoltage: 9, lightLevel: 1 });
        if (isEvaluationError(outcome)) {
          printed.push(`${id} | ${element.id} | invalid | - | - | - | - | rejected by engine`);
          continue;
        }
        const verdict = evaluateSuccess(lvl, outcome);
        const faults = outcome.faults.length;
        const parts = variant.elements.length;
        const score = mirrorScore(lvl, parts, faults, 0, 90, lvl.difficulty);
        const refScore = mirrorScore(
          lvl,
          layout.elements.length,
          reference.faults.length,
          0,
          90,
          lvl.difficulty
        );
        const note = !verdict.satisfied
          ? 'fails objective'
          : faults > reference.faults.length
            ? 'fault variant (asserted lower)'
            : score >= refScore
              ? 'NON-FAULT SHORTCUT out-scores or ties reference (informational)'
              : 'lower';
        printed.push(
          `${id} | ${element.id} | ${verdict.satisfied} | ${faults} | ${parts} | ${score} | ${refScore} | ${note}`
        );
        if (!verdict.satisfied || faults <= reference.faults.length) {
          continue;
        }
        checked += 1;
        for (let faultCount = 0; faultCount <= 6; faultCount += 1) {
          const variantScore = mirrorScore(lvl, parts, faults, faultCount, 90, lvl.difficulty);
          const referenceScore = mirrorScore(
            lvl,
            layout.elements.length,
            reference.faults.length,
            faultCount,
            90,
            lvl.difficulty
          );
          expect(variantScore).toBeLessThan(referenceScore);
        }
      }
      expect(checked).toBeGreaterThanOrEqual(0);
    });
  });
});
