/**
 * Level definition model (component B1), plus the fault-count clamp this unit owns.
 *
 * Levels live in `packages/shared` because the server must resolve the same level data the
 * browser played, in order to re-evaluate the submitted layout against the right objective.
 *
 * Only the first guided level and the sandbox are authored here, enough to exercise the
 * engine, the success predicates, and the Mars Rover. The remaining guided levels of
 * FR-CB-27 and FR-CB-28 are unit U4's content scope.
 *
 * Satisfies FR-CB-27, FR-CB-28, FR-CB-33, FR-CB-34.
 */

import { MAX_FAULT_COUNT_PER_LEVEL } from './constants';
import { GUIDED_LEVELS } from './guided-levels';
import { compareIds } from './netlist';
import type { FaultCountClamp, LevelDefinition } from './types';

export const LEVELS: Readonly<Record<string, LevelDefinition>> = Object.freeze({
  ...GUIDED_LEVELS,
  'cb-01-closed-circuit': Object.freeze({
    id: 'cb-01-closed-circuit',
    difficulty: 1 as const,
    numericDisclosure: 'none' as const,
    gridSize: Object.freeze({ cols: 8, rows: 6 }),
    availableComponents: Object.freeze({ battery: 1, wire: 4, led: 1, resistor: 1 }),
    prePlaced: Object.freeze([]),
    lockedElementIds: Object.freeze([]),
    targetMachineId: 'mars-rover',
    successConditionId: 'rover-headlight-on',
    conceptTag: 'closed-circuit',
  }),
  sandbox: Object.freeze({
    id: 'sandbox',
    difficulty: 4 as const,
    numericDisclosure: 'full' as const,
    gridSize: Object.freeze({ cols: 24, rows: 16 }),
    availableComponents: Object.freeze({
      battery: 8,
      solar: 8,
      wire: 8,
      switch: 8,
      resistor: 8,
      led: 8,
      motor: 8,
      buzzer: 8,
    }),
    prePlaced: Object.freeze([]),
    lockedElementIds: Object.freeze([]),
    targetMachineId: 'mars-rover',
    successConditionId: 'none',
    conceptTag: 'free-play',
  }),
});

export function getLevel(id: string): LevelDefinition | undefined {
  return Object.prototype.hasOwnProperty.call(LEVELS, id) ? LEVELS[id] : undefined;
}

/** Every level, sorted by id. A fresh array, so a caller cannot mutate the registry. */
export function listLevels(): LevelDefinition[] {
  return Object.keys(LEVELS)
    .sort(compareIds)
    .flatMap((id) => {
      const level = LEVELS[id];
      return level === undefined ? [] : [level];
    });
}

/**
 * Constrain a client-reported historical fault count (decision c).
 *
 * Faults are events over time, so a final layout cannot prove how many occurred. This clamp
 * bounds over-reporting, which is the direction that could distort a score; under-reporting
 * stays unprovable in either direction, and no clamp changes that.
 *
 * Recommended use by U6: reject the submission outright when `wasMalformed` is true rather
 * than silently coercing it (SECURITY-05), accept the clamped value when only `wasClamped` is
 * true, and floor the total fault penalty in E3 so a score can never go negative.
 */
export function clampFaultCount(reported: unknown, level: LevelDefinition): FaultCountClamp {
  if (typeof reported !== 'number' || !Number.isInteger(reported) || reported < 0) {
    return { value: 0, wasClamped: true, wasMalformed: true };
  }
  const ceiling = level.maxFaultCount ?? MAX_FAULT_COUNT_PER_LEVEL;
  if (reported > ceiling) {
    return { value: ceiling, wasClamped: true, wasMalformed: false };
  }
  return { value: reported, wasClamped: false, wasMalformed: false };
}
