import { createLayout } from './builders';
import { MAX_ELEMENT_COUNT, MAX_FAULT_COUNT_PER_LEVEL } from './constants';
import { LEVELS, clampFaultCount, getLevel, listLevels } from './levels';
import { getMachine } from './machines';
import { SUCCESS_CONDITIONS } from './success';
import type { Environment, LevelDefinition } from './types';
import { validateStructure } from './validation';

const ENV: Environment = { sourceVoltage: 9, lightLevel: 1 };

describe('LEVELS', () => {
  it('ships the eight guided levels and the sandbox', () => {
    expect(listLevels().map((level) => level.id)).toEqual([
      'cb-01-closed-circuit',
      'cb-02-switch-control',
      'cb-03-series-loop',
      'cb-04-parallel-branches',
      'cb-05-series-vs-parallel',
      'cb-06-short-circuit-recovery',
      'cb-07-resistance-limits-current',
      'cb-08-variable-voltage',
      'sandbox',
    ]);
  });

  it('gives every level a pre-placed set that validates against its own grid', () => {
    for (const level of listLevels()) {
      const layout = createLayout(level.prePlaced, [], level.gridSize);
      expect(validateStructure(layout, {}, ENV).issues).toEqual([]);
    }
  });

  it('keeps every component budget within the element ceiling', () => {
    for (const level of listLevels()) {
      const total = Object.values(level.availableComponents).reduce(
        (sum, budget) => sum + (budget ?? 0),
        0
      );
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(MAX_ELEMENT_COUNT);
    }
  });

  it('points every level at a machine and a success condition that exist', () => {
    for (const level of listLevels()) {
      expect(getMachine(level.targetMachineId)).toBeDefined();
      expect(Object.keys(SUCCESS_CONDITIONS)).toContain(level.successConditionId);
    }
  });

  it('locks nothing that is not pre-placed', () => {
    for (const level of listLevels()) {
      const placed = new Set(level.prePlaced.map((element) => element.id));
      for (const locked of level.lockedElementIds) {
        expect(placed.has(locked)).toBe(true);
      }
    }
  });

  it('discloses no numbers on the easiest level and everything in the sandbox', () => {
    expect(getLevel('cb-01-closed-circuit')?.numericDisclosure).toBe('none');
    expect(getLevel('sandbox')?.numericDisclosure).toBe('full');
  });
});

describe('getLevel', () => {
  it('returns undefined for an unknown id and for an inherited property name', () => {
    expect(getLevel('nope')).toBeUndefined();
    expect(getLevel('toString')).toBeUndefined();
  });

  it('returns the level for a known id', () => {
    expect(getLevel('sandbox')?.id).toBe('sandbox');
  });
});

describe('listLevels', () => {
  it('returns a fresh array a caller cannot use to mutate the registry', () => {
    const first = listLevels();
    first.length = 0;
    expect(listLevels()).toHaveLength(Object.keys(LEVELS).length);
  });
});

describe('clampFaultCount', () => {
  const level = getLevel('cb-01-closed-circuit') as LevelDefinition;

  it('passes an in-range count through untouched', () => {
    expect(clampFaultCount(0, level)).toEqual({ value: 0, wasClamped: false, wasMalformed: false });
    expect(clampFaultCount(7, level)).toEqual({ value: 7, wasClamped: false, wasMalformed: false });
    expect(clampFaultCount(MAX_FAULT_COUNT_PER_LEVEL, level)).toEqual({
      value: MAX_FAULT_COUNT_PER_LEVEL,
      wasClamped: false,
      wasMalformed: false,
    });
  });

  it('clamps a count above the ceiling', () => {
    expect(clampFaultCount(MAX_FAULT_COUNT_PER_LEVEL + 1, level)).toEqual({
      value: MAX_FAULT_COUNT_PER_LEVEL,
      wasClamped: true,
      wasMalformed: false,
    });
    expect(clampFaultCount(1e9, level)).toEqual({
      value: MAX_FAULT_COUNT_PER_LEVEL,
      wasClamped: true,
      wasMalformed: false,
    });
  });

  it('honours a per-level ceiling when the level sets one', () => {
    const strict: LevelDefinition = { ...level, maxFaultCount: 3 };
    expect(clampFaultCount(10, strict)).toEqual({
      value: 3,
      wasClamped: true,
      wasMalformed: false,
    });
  });

  it('marks anything that is not a non-negative integer as malformed', () => {
    const malformed: unknown[] = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -1,
      1.5,
      '3',
      null,
      undefined,
      {},
      [],
      true,
    ];
    for (const candidate of malformed) {
      expect(clampFaultCount(candidate, level)).toEqual({
        value: 0,
        wasClamped: true,
        wasMalformed: true,
      });
    }
  });
});
