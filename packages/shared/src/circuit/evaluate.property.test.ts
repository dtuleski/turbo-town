import fc from 'fast-check';

import {
  connectTerminals,
  createElement,
  createLayout,
  parallelBranches,
  seriesChain,
  terminalOf,
} from './builders';
import {
  MAX_LIGHT_LEVEL,
  MAX_SOURCE_VOLTAGE,
  MIN_LIGHT_LEVEL,
  MIN_SOURCE_VOLTAGE,
} from './constants';
import { evaluate } from './evaluate';
import type {
  CircuitElement,
  CircuitLayout,
  Environment,
  ElementKind,
  GridPosition,
  GridSize,
  SwitchStates,
} from './types';
import { isCircuitResult } from './types';

// A fixed seed keeps a failure reproducible: the same counterexample appears on every run.
fc.configureGlobal({ numRuns: 100, seed: 42 });

const GRID: GridSize = { cols: 24, rows: 16 };
const ENV: Environment = { sourceVoltage: 9, lightLevel: 1 };

const LOAD_KINDS: readonly ElementKind[] = ['motor', 'led', 'buzzer', 'resistor'];

function at(index: number): GridPosition {
  return { col: index % GRID.cols, row: Math.floor(index / GRID.cols) % GRID.rows, rotation: 0 };
}

function loadsOf(kinds: readonly ElementKind[]): CircuitElement[] {
  return kinds.map((kind, index) => createElement(kind, { id: `e${String(index)}`, position: at(index + 1) }));
}

function seriesLayout(kinds: readonly ElementKind[]): CircuitLayout {
  const battery = createElement('battery', { id: 'bat', position: at(0) });
  const loads = loadsOf(kinds);
  const head = loads[0];
  const tail = loads[loads.length - 1];
  if (head === undefined || tail === undefined) {
    return createLayout([battery], [], GRID);
  }
  return createLayout(
    [battery, ...loads],
    [
      ...seriesChain(loads),
      connectTerminals(terminalOf(battery, 0), terminalOf(head, 0)),
      connectTerminals(terminalOf(tail, 1), terminalOf(battery, 1)),
    ],
    GRID
  );
}

function parallelLayout(kinds: readonly ElementKind[]): CircuitLayout {
  const battery = createElement('battery', { id: 'bat', position: at(0) });
  const loads = loadsOf(kinds);
  return createLayout(
    [battery, ...loads],
    parallelBranches(
      terminalOf(battery, 0),
      terminalOf(battery, 1),
      loads.map((load) => [load])
    ),
    GRID
  );
}

const kindsArb = fc.array(fc.constantFrom(...LOAD_KINDS), { minLength: 1, maxLength: 6 });

const layoutArb = fc.oneof(kindsArb.map(seriesLayout), kindsArb.map(parallelLayout));

const envArb: fc.Arbitrary<Environment> = fc.record({
  sourceVoltage: fc.double({
    min: MIN_SOURCE_VOLTAGE,
    max: MAX_SOURCE_VOLTAGE,
    noNaN: true,
    noDefaultInfinity: true,
  }),
  lightLevel: fc.double({
    min: MIN_LIGHT_LEVEL,
    max: MAX_LIGHT_LEVEL,
    noNaN: true,
    noDefaultInfinity: true,
  }),
});

function currentsOf(layout: CircuitLayout, env: Environment = ENV): Map<string, number> {
  const outcome = evaluate(layout, {}, env);
  if (!isCircuitResult(outcome)) {
    throw new Error(`expected a result, got ${outcome.errorCode}`);
  }
  return new Map(outcome.elements.map((entry) => [entry.elementId, entry.current]));
}

describe('evaluate - total function', () => {
  it('returns a typed outcome and never throws, whatever it is handed', () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), fc.anything(), (layout, switches, env) => {
        const outcome = evaluate(
          layout as CircuitLayout,
          switches as SwitchStates,
          env as Environment
        );
        expect(outcome).not.toBeNull();
        expect(typeof outcome).toBe('object');
        expect(isCircuitResult(outcome) || typeof outcome.errorCode === 'string').toBe(true);
      })
    );
  });

  it('never throws for a well-formed layout handed arbitrary switches and environment', () => {
    fc.assert(
      fc.property(layoutArb, fc.anything(), fc.anything(), (layout, switches, env) => {
        const outcome = evaluate(layout, switches as SwitchStates, env as Environment);
        expect(typeof outcome).toBe('object');
      })
    );
  });
});

describe('evaluate - determinism', () => {
  it('returns a deep-equal result for identical input', () => {
    fc.assert(
      fc.property(layoutArb, envArb, (layout, env) => {
        expect(evaluate(layout, {}, env)).toEqual(evaluate(layout, {}, env));
      })
    );
  });

  it('is bitwise unaffected by the order of the elements and connections', () => {
    const shuffledArb = layoutArb.chain((layout) =>
      fc.tuple(
        fc.constant(layout),
        fc.shuffledSubarray([...layout.elements], {
          minLength: layout.elements.length,
          maxLength: layout.elements.length,
        }),
        fc.shuffledSubarray([...layout.connections], {
          minLength: layout.connections.length,
          maxLength: layout.connections.length,
        })
      )
    );

    fc.assert(
      fc.property(shuffledArb, envArb, ([layout, elements, connections], env) => {
        const original = currentsOf(layout, env);
        const shuffled = currentsOf(createLayout(elements, connections, layout.gridSize), env);

        expect(shuffled.size).toBe(original.size);
        for (const [elementId, current] of original) {
          expect(Object.is(shuffled.get(elementId), current)).toBe(true);
        }
      })
    );
  });
});

describe('evaluate - result invariants', () => {
  it('keeps every intensity inside zero to one and every number finite', () => {
    fc.assert(
      fc.property(layoutArb, envArb, (layout, env) => {
        const outcome = evaluate(layout, {}, env);
        expect(isCircuitResult(outcome)).toBe(true);
        if (!isCircuitResult(outcome)) {
          return;
        }

        expect(Number.isFinite(outcome.totalCurrent)).toBe(true);
        expect(Number.isFinite(outcome.totalResistance)).toBe(true);
        for (const entry of outcome.elements) {
          expect(entry.intensity).toBeGreaterThanOrEqual(0);
          expect(entry.intensity).toBeLessThanOrEqual(1);
          expect(Number.isFinite(entry.current)).toBe(true);
          expect(Number.isFinite(entry.voltageDrop)).toBe(true);
        }
        for (const voltage of Object.values(outcome.nodeVoltages)) {
          expect(Number.isFinite(voltage)).toBe(true);
        }
      })
    );
  });
});

describe('evaluate - monotonicity', () => {
  it('never lowers any element current when the source voltage is raised', () => {
    fc.assert(
      fc.property(
        layoutArb,
        fc.double({ min: MIN_SOURCE_VOLTAGE, max: MAX_SOURCE_VOLTAGE, noNaN: true }),
        fc.double({ min: MIN_SOURCE_VOLTAGE, max: MAX_SOURCE_VOLTAGE, noNaN: true }),
        (layout, first, second) => {
          const low = Math.min(first, second);
          const high = Math.max(first, second);
          const lower = currentsOf(layout, { sourceVoltage: low, lightLevel: 1 });
          const higher = currentsOf(layout, { sourceVoltage: high, lightLevel: 1 });

          for (const [elementId, current] of lower) {
            const raised = higher.get(elementId) ?? 0;
            expect(Math.abs(raised)).toBeGreaterThanOrEqual(Math.abs(current) - 1e-12);
          }
        }
      )
    );
  });

  it('never raises the chain current when series resistance is added', () => {
    fc.assert(
      fc.property(kindsArb, envArb, (kinds, env) => {
        const before = currentsOf(seriesLayout(kinds), env);
        const after = currentsOf(seriesLayout([...kinds, 'resistor']), env);

        const original = before.get('e0') ?? 0;
        const extended = after.get('e0') ?? 0;
        expect(Math.abs(extended)).toBeLessThanOrEqual(Math.abs(original) + 1e-12);
      })
    );
  });
});
