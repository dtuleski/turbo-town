/**
 * Shared Circuit Builder test fixtures.
 *
 * Not a suite: jest's `testMatch` is `**\/*.test.ts`, so this file is imported, never run.
 *
 * Layouts are built with the engine's own builders - the same helpers U3 and U4 use - so a
 * fixture cannot drift from the shape the engine actually accepts. Payloads are then passed
 * through JSON so a test sees the plain, mutable data a browser would really post rather than
 * the engine's frozen readonly structures.
 */

import {
  connectTerminals,
  createElement,
  createLayout,
  seriesChain,
  terminalOf,
} from '@memory-game/shared';
import type { CircuitLayout, GridSize } from '@memory-game/shared';

export const CB_GRID: GridSize = { cols: 8, rows: 6 };
export const CB_ENV = { sourceVoltage: 9, lightLevel: 1 };
export const CB_LEVEL_ID = 'cb-01-closed-circuit';
export const SANDBOX_LEVEL_ID = 'sandbox';

/** Battery, protective resistor, and the rover headlight in one closed loop. */
export function headlightLayout(): CircuitLayout {
  const battery = createElement('battery', {
    id: 'bat',
    position: { col: 0, row: 0, rotation: 0 },
  });
  const resistor = createElement('resistor', {
    id: 'r',
    position: { col: 1, row: 0, rotation: 0 },
    params: { resistance: 470 },
  });
  const led = createElement('led', { id: 'led', position: { col: 2, row: 0, rotation: 0 } });
  return createLayout(
    [battery, resistor, led],
    [
      ...seriesChain([resistor, led]),
      connectTerminals(terminalOf(battery, 0), terminalOf(resistor, 0)),
      connectTerminals(terminalOf(led, 1), terminalOf(battery, 1)),
    ],
    CB_GRID
  );
}

/**
 * The battery wired straight to the headlight LED, with no current-limiting resistor.
 *
 * Two elements instead of three, and the LED is left overdrawn: 9 V across 30 ohm draws about
 * 0.295 A against a 0.02 A rating, so the engine raises `OVERCURRENT`. That fault does not
 * block success (CB-3.8), which is exactly why the SCORE has to be what discourages it
 * (FR-CB-2, CB-3.6). The LED is wired in the same direction as in `headlightLayout`, so it is
 * forward-biased and genuinely lit.
 */
export function unprotectedHeadlightLayout(): CircuitLayout {
  const battery = createElement('battery', {
    id: 'bat',
    position: { col: 0, row: 0, rotation: 0 },
  });
  const led = createElement('led', { id: 'led', position: { col: 2, row: 0, rotation: 0 } });
  return createLayout(
    [battery, led],
    [
      connectTerminals(terminalOf(battery, 0), terminalOf(led, 0)),
      connectTerminals(terminalOf(led, 1), terminalOf(battery, 1)),
    ],
    CB_GRID
  );
}

/**
 * The headlight circuit plus a second battery. Within every engine bound, but
 * `cb-01-closed-circuit` grants only one battery.
 */
export function overBudgetLayout(): CircuitLayout {
  const base = headlightLayout();
  const spare = createElement('battery', {
    id: 'bat2',
    position: { col: 4, row: 2, rotation: 0 },
  });
  return createLayout([...base.elements, spare], base.connections, CB_GRID);
}

/**
 * The headlight circuit plus a motor, a kind `cb-01-closed-circuit` does not offer at all.
 */
export function ungrantedKindLayout(): CircuitLayout {
  const base = headlightLayout();
  const motor = createElement('motor', {
    id: 'mot',
    position: { col: 5, row: 3, rotation: 0 },
  });
  return createLayout([...base.elements, motor], base.connections, CB_GRID);
}

/**
 * The headlight circuit on a full-size canvas, with the LED parked at column 10.
 *
 * Legal to E1, which bounds coordinates against the SUBMITTED grid and has no view of the
 * level, and outside `cb-01-closed-circuit`'s 8 x 6 canvas.
 */
export function outsideLevelGridLayout(): CircuitLayout {
  const base = headlightLayout();
  const elements = base.elements.map((element) =>
    element.id === 'led'
      ? { ...element, position: { ...element.position, col: 10, row: 10 } }
      : element
  );
  return createLayout(elements, base.connections, { cols: 24, rows: 16 });
}

/** The headlight circuit with a bare wire added straight across the battery. */
export function shortedHeadlightLayout(): CircuitLayout {
  const base = headlightLayout();
  const wire = createElement('wire', { id: 'w', position: { col: 3, row: 1, rotation: 0 } });
  return createLayout(
    [...base.elements, wire],
    [
      ...base.connections,
      connectTerminals('bat:0', terminalOf(wire, 0)),
      connectTerminals(terminalOf(wire, 1), 'bat:1'),
    ],
    CB_GRID
  );
}

/** A battery and an LED that are never wired together: well formed, but an open circuit. */
export function openCircuitLayout(): CircuitLayout {
  const battery = createElement('battery', {
    id: 'bat',
    position: { col: 0, row: 0, rotation: 0 },
  });
  const led = createElement('led', { id: 'led', position: { col: 2, row: 0, rotation: 0 } });
  return createLayout([battery, led], [], CB_GRID);
}

/** Deep-copy through JSON, producing the plain mutable data a client would post. */
export function asWirePayload<T>(value: T): any {
  return JSON.parse(JSON.stringify(value));
}

/** A valid submission payload, with any field replaceable for a negative test. */
export function submissionPayload(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    levelId: CB_LEVEL_ID,
    layout: asWirePayload(headlightLayout()),
    switches: {},
    environment: { ...CB_ENV },
    faultCount: 0,
    ...overrides,
  };
}
