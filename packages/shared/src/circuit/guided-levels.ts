/**
 * Guided levels cb-02 to cb-08 (unit U4, FR-CB-27, FR-CB-28).
 *
 * Authored apart from `levels.ts` so the first guided level and the sandbox stay untouched.
 * Three rules shape every entry here:
 *
 * - Budget of at least 7 (sum of `availableComponents` plus `prePlaced`), so the protected
 *   solve out-scores an unprotected shortcut under the server's efficiency formula.
 * - At most one LED and one source per level, counting `prePlaced`, so a valid solve can leave
 *   at most one unresolved fault.
 * - A kind is never both pre-placed and in `availableComponents`, so the browser tray and the
 *   server budget agree on the allowance. Lesson-bearing parts are pre-placed and locked.
 *
 * Reference solutions and wrong answers are proven with the real engine in
 * `guided-levels.test.ts`.
 */
import { createElement } from './builders';
import type { CircuitElement, ElementKind, LevelDefinition } from './types';

function pre(kind: ElementKind, id: string, col: number, row: number): CircuitElement {
  const element = createElement(kind, { id, position: { col, row, rotation: 0 } });
  Object.freeze(element.terminals);
  Object.freeze(element.position);
  return Object.freeze(element);
}

interface GuidedSpec {
  id: string;
  difficulty: 1 | 2 | 3 | 4;
  numericDisclosure: LevelDefinition['numericDisclosure'];
  cols: number;
  rows: number;
  availableComponents: LevelDefinition['availableComponents'];
  prePlaced: readonly CircuitElement[];
  successConditionId: string;
  conceptTag: string;
}

function guided(spec: GuidedSpec): LevelDefinition {
  return Object.freeze({
    id: spec.id,
    difficulty: spec.difficulty,
    numericDisclosure: spec.numericDisclosure,
    gridSize: Object.freeze({ cols: spec.cols, rows: spec.rows }),
    availableComponents: Object.freeze({ ...spec.availableComponents }),
    prePlaced: Object.freeze([...spec.prePlaced]),
    lockedElementIds: Object.freeze(spec.prePlaced.map((element) => element.id)),
    targetMachineId: 'mars-rover',
    successConditionId: spec.successConditionId,
    conceptTag: spec.conceptTag,
  });
}

export const GUIDED_LEVELS: Readonly<Record<string, LevelDefinition>> = Object.freeze({
  'cb-02-switch-control': guided({
    id: 'cb-02-switch-control',
    difficulty: 1,
    numericDisclosure: 'none',
    cols: 8,
    rows: 6,
    availableComponents: { battery: 1, resistor: 1, led: 1, wire: 3 },
    prePlaced: [pre('switch', 'pre-switch', 3, 2)],
    successConditionId: 'rover-headlight-on',
    conceptTag: 'switch-control',
  }),
  'cb-03-series-loop': guided({
    id: 'cb-03-series-loop',
    difficulty: 2,
    numericDisclosure: 'qualitative',
    cols: 10,
    rows: 6,
    availableComponents: { battery: 1, resistor: 1, led: 1, buzzer: 1, wire: 3 },
    prePlaced: [pre('switch', 'pre-switch', 4, 2)],
    successConditionId: 'rover-headlight-on',
    conceptTag: 'series-circuit',
  }),
  'cb-04-parallel-branches': guided({
    id: 'cb-04-parallel-branches',
    difficulty: 2,
    numericDisclosure: 'qualitative',
    cols: 10,
    rows: 7,
    availableComponents: { battery: 1, resistor: 1, led: 1, buzzer: 1, wire: 2 },
    prePlaced: [pre('switch', 'pre-switch-led', 4, 1), pre('switch', 'pre-switch-buzzer', 4, 5)],
    successConditionId: 'rover-headlight-on',
    conceptTag: 'parallel-circuit',
  }),
  'cb-05-series-vs-parallel': guided({
    id: 'cb-05-series-vs-parallel',
    difficulty: 3,
    numericDisclosure: 'values',
    cols: 12,
    rows: 8,
    availableComponents: { battery: 1, motor: 2, led: 1, buzzer: 1, resistor: 1, wire: 3 },
    prePlaced: [],
    successConditionId: 'rover-fully-powered',
    conceptTag: 'series-vs-parallel',
  }),
  'cb-06-short-circuit-recovery': guided({
    id: 'cb-06-short-circuit-recovery',
    difficulty: 3,
    numericDisclosure: 'values',
    cols: 8,
    rows: 6,
    availableComponents: { battery: 1, resistor: 1, led: 1, wire: 4 },
    prePlaced: [],
    successConditionId: 'rover-headlight-on',
    conceptTag: 'short-circuit',
  }),
  'cb-07-resistance-limits-current': guided({
    id: 'cb-07-resistance-limits-current',
    difficulty: 4,
    numericDisclosure: 'full',
    cols: 10,
    rows: 6,
    availableComponents: { resistor: 2, wire: 3 },
    prePlaced: [pre('battery', 'pre-battery', 1, 3), pre('led', 'pre-led', 8, 3)],
    successConditionId: 'rover-headlight-on',
    conceptTag: 'resistance-limits-current',
  }),
  'cb-08-variable-voltage': guided({
    id: 'cb-08-variable-voltage',
    difficulty: 4,
    numericDisclosure: 'full',
    cols: 12,
    rows: 8,
    availableComponents: { battery: 1, motor: 1, led: 1, buzzer: 1, resistor: 1, wire: 3 },
    prePlaced: [
      pre('switch', 'pre-switch-master', 3, 4),
      pre('switch', 'pre-switch-headlight', 7, 2),
    ],
    successConditionId: 'rover-fully-powered',
    conceptTag: 'variable-voltage',
  }),
});
