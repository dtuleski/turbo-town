/**
 * A load with a floating terminal carries no current, so it must never count as energised.
 *
 * Regression for the owner-reported bypassed-LED layout on cb-01: the LED's right terminal
 * connects to nothing, the battery's right terminal lands on the LED's LEFT terminal, and the
 * resistor closes the loop on its own.
 */
import fc from 'fast-check';
import { connectTerminals, createElement, createLayout } from './builders';
import { evaluate } from './evaluate';
import { getLevel } from './levels';
import { evaluateSuccess } from './success';
import { isEvaluationError } from './types';
import type { CircuitLayout, CircuitResult, ElementKind } from './types';

fc.configureGlobal({ numRuns: 100, seed: 42 });

const ENV = { sourceVoltage: 9, lightLevel: 1 } as const;

function solve(layout: CircuitLayout): CircuitResult {
  const outcome = evaluate(layout, {}, ENV);
  if (isEvaluationError(outcome)) {
    throw new Error(outcome.errorCode);
  }
  return outcome;
}

function bypassedLedLayout(): CircuitLayout {
  const level = getLevel('cb-01-closed-circuit');
  if (level === undefined) {
    throw new Error('missing cb-01');
  }
  return createLayout(
    [
      createElement('battery', { id: 'e1', position: { col: 1, row: 1, rotation: 0 } }),
      createElement('resistor', { id: 'e2', position: { col: 3, row: 1, rotation: 0 } }),
      createElement('led', { id: 'e3', position: { col: 5, row: 1, rotation: 0 } }),
    ],
    [
      connectTerminals('e1:0', 'e2:0'),
      connectTerminals('e2:1', 'e3:0'),
      connectTerminals('e1:1', 'e3:0'),
    ],
    level.gridSize
  );
}

describe('bypassed LED on cb-01 (owner layout)', () => {
  it('gives the LED no current and no glow', () => {
    const result = solve(bypassedLedLayout());
    const led = result.elements.find((entry) => entry.elementId === 'e3');
    expect(led?.current).toBeCloseTo(0, 9);
    expect(led?.energized).toBe(false);
    expect(led?.intensity).toBe(0);
  });

  it('does not satisfy rover-headlight-on', () => {
    const level = getLevel('cb-01-closed-circuit');
    if (level === undefined) {
      throw new Error('missing cb-01');
    }
    const outcome = evaluateSuccess(level, solve(bypassedLedLayout()));
    expect(outcome.satisfied).toBe(false);
    expect(outcome.unmetClauses).toContain('headlightOn');
  });
});

describe('floating terminal property', () => {
  const POLARIZED_OR_LOAD: readonly ElementKind[] = ['led', 'buzzer', 'motor', 'resistor'];

  it('a load with an unconnected terminal never carries current or glows', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...POLARIZED_OR_LOAD),
        fc.constantFrom(0, 1),
        fc.constantFrom('e2:0', 'e2:1', 'e1:0', 'e1:1'),
        fc.boolean(),
        (kind, floatingIndex, hookup, withResistor) => {
          const connectedIndex = floatingIndex === 0 ? 1 : 0;
          const elements = [
            createElement('battery', { id: 'e1' }),
            createElement('resistor', { id: 'e2' }),
            createElement(kind, { id: 'e3' }),
          ];
          const connections = [
            connectTerminals('e1:0', 'e2:0'),
            connectTerminals('e1:1', 'e2:1'),
            connectTerminals(hookup, `e3:${String(connectedIndex)}`),
          ];
          if (withResistor && hookup !== 'e2:1') {
            connections.push(connectTerminals('e2:1', `e3:${String(connectedIndex)}`));
          }
          const result = solve(createLayout(elements, connections, { cols: 8, rows: 6 }));
          const load = result.elements.find((entry) => entry.elementId === 'e3');
          expect(Math.abs(load?.current ?? 1)).toBeLessThan(1e-9);
          expect(load?.energized).toBe(false);
        }
      )
    );
  });
});
