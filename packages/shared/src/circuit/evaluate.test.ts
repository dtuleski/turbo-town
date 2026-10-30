import {
  connectTerminals,
  createElement,
  createLayout,
  parallelBranches,
  seriesChain,
  terminalOf,
} from './builders';
import { MAX_ELEMENT_COUNT } from './constants';
import { evaluate } from './evaluate';
import type {
  CircuitElement,
  CircuitLayout,
  CircuitResult,
  ElementResult,
  Environment,
  GridSize,
  SwitchStates,
} from './types';
import { isCircuitResult, isEvaluationError } from './types';

const GRID: GridSize = { cols: 24, rows: 16 };
const ENV: Environment = { sourceVoltage: 9, lightLevel: 1 };

function resultOf(layout: CircuitLayout, switches: SwitchStates = {}, env = ENV): CircuitResult {
  const outcome = evaluate(layout, switches, env);
  if (!isCircuitResult(outcome)) {
    throw new Error(`expected a result, got ${outcome.errorCode}`);
  }
  return outcome;
}

function element(result: CircuitResult, elementId: string): ElementResult {
  const found = result.elements.find((entry) => entry.elementId === elementId);
  if (found === undefined) {
    throw new Error(`no result for ${elementId}`);
  }
  return found;
}

/** The same layout with one element, and every connection touching it, taken out. */
function without(layout: CircuitLayout, elementId: string): CircuitLayout {
  const removed = layout.elements.find((entry) => entry.id === elementId);
  const terminals = new Set<string>(removed?.terminals ?? []);
  return createLayout(
    layout.elements.filter((entry) => entry.id !== elementId),
    layout.connections.filter(
      (connection) => !terminals.has(connection.from) && !terminals.has(connection.to)
    ),
    layout.gridSize
  );
}

function at(index: number): CircuitElement['position'] {
  return { col: index % GRID.cols, row: Math.floor(index / GRID.cols), rotation: 0 };
}

function seriesLoads(kind: 'motor' | 'led', ids: readonly string[]): CircuitLayout {
  const battery = createElement('battery', { id: 'bat', position: at(0) });
  const loads = ids.map((id, index) => createElement(kind, { id, position: at(index + 1) }));
  const head = loads[0];
  const tail = loads[loads.length - 1];
  if (head === undefined || tail === undefined) {
    throw new Error('at least one load is required');
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

function parallelLoads(ids: readonly string[]): CircuitLayout {
  const battery = createElement('battery', { id: 'bat', position: at(0) });
  const loads = ids.map((id, index) => createElement('motor', { id, position: at(index + 1) }));
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

describe('evaluate - closed path detection', () => {
  it('finds a closed path through a load', () => {
    const result = resultOf(seriesLoads('motor', ['mot']));
    expect(result.closedPathExists).toBe(true);
    expect(element(result, 'mot').energized).toBe(true);
  });

  it('finds no closed path when a load-free wire is the only route', () => {
    const battery = createElement('battery', { id: 'bat', position: at(0) });
    const wire = createElement('wire', { id: 'w', position: at(1) });
    const layout = createLayout(
      [battery, wire],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(wire, 0)),
        connectTerminals(terminalOf(wire, 1), terminalOf(battery, 1)),
      ],
      GRID
    );

    expect(resultOf(layout).closedPathExists).toBe(false);
  });

  it('finds no closed path with nothing wired up', () => {
    const battery = createElement('battery', { id: 'bat', position: at(0) });
    const result = resultOf(createLayout([battery], [], GRID));

    expect(result.closedPathExists).toBe(false);
    expect(result.totalCurrent).toBe(0);
    expect(result.totalResistance).toBe(0);
  });

  it('does not count a load hanging off a dead-end branch', () => {
    const battery = createElement('battery', { id: 'bat', position: at(0) });
    const wire = createElement('wire', { id: 'w', position: at(1) });
    const deadEnd = createElement('led', { id: 'dead', position: at(2) });
    const layout = createLayout(
      [battery, wire, deadEnd],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(wire, 0)),
        connectTerminals(terminalOf(wire, 1), terminalOf(battery, 1)),
        connectTerminals(terminalOf(wire, 1), terminalOf(deadEnd, 0)),
      ],
      GRID
    );

    const result = resultOf(layout);
    expect(element(result, 'dead').current).toBe(0);
    expect(result.closedPathExists).toBe(false);
  });

  it('does not count a load starved by a parallel short', () => {
    const battery = createElement('battery', { id: 'bat', position: at(0) });
    const wire = createElement('wire', { id: 'w', position: at(1) });
    const motor = createElement('motor', { id: 'mot', position: at(2) });
    const layout = createLayout(
      [battery, wire, motor],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(wire, 0)),
        connectTerminals(terminalOf(wire, 1), terminalOf(battery, 1)),
        connectTerminals(terminalOf(battery, 0), terminalOf(motor, 0)),
        connectTerminals(terminalOf(motor, 1), terminalOf(battery, 1)),
      ],
      GRID
    );

    const result = resultOf(layout);
    expect(element(result, 'mot').current).toBeCloseTo(0, 12);
    expect(result.closedPathExists).toBe(false);
    expect(result.faults.map((fault) => fault.code)).toContain('SHORT_CIRCUIT');
  });
});

describe('evaluate - switch control', () => {
  it('de-energizes with the switch open and energizes once it closes', () => {
    const battery = createElement('battery', { id: 'bat', position: at(0) });
    const toggle = createElement('switch', { id: 'sw', position: at(1) });
    const motor = createElement('motor', { id: 'mot', position: at(2) });
    const layout = createLayout(
      [battery, toggle, motor],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(toggle, 0)),
        connectTerminals(terminalOf(toggle, 1), terminalOf(motor, 0)),
        connectTerminals(terminalOf(motor, 1), terminalOf(battery, 1)),
      ],
      GRID
    );

    const open = resultOf(layout, { sw: 'open' });
    expect(open.closedPathExists).toBe(false);
    expect(element(open, 'mot').energized).toBe(false);

    const closed = resultOf(layout, { sw: 'closed' });
    expect(closed.closedPathExists).toBe(true);
    expect(element(closed, 'mot').energized).toBe(true);
  });
});

describe('evaluate - series behaviour', () => {
  it('removing one of two series loads cuts power to the whole chain', () => {
    const chain = seriesLoads('motor', ['m1', 'm2']);
    expect(element(resultOf(chain), 'm1').energized).toBe(true);

    const broken = resultOf(without(chain, 'm2'));
    expect(broken.closedPathExists).toBe(false);
    expect(element(broken, 'm1').energized).toBe(false);
    expect(element(broken, 'm1').current).toBe(0);
  });
});

describe('evaluate - parallel behaviour', () => {
  it('removing one branch leaves the other powered', () => {
    const branches = parallelLoads(['m1', 'm2']);
    expect(element(resultOf(branches), 'm2').energized).toBe(true);

    const broken = resultOf(without(branches, 'm2'));
    expect(broken.closedPathExists).toBe(true);
    expect(element(broken, 'm1').energized).toBe(true);
  });
});

describe('evaluate - series versus parallel', () => {
  it('gives series loads less current and visibly less brightness than parallel ones', () => {
    const series = resultOf(seriesLoads('motor', ['m1', 'm2']));
    const parallel = resultOf(parallelLoads(['m1', 'm2']));

    const seriesCurrent = element(series, 'm1').current;
    const parallelCurrent = element(parallel, 'm1').current;

    expect(seriesCurrent).toBeCloseTo(9 / 120.5, 12);
    expect(parallelCurrent).toBeCloseTo(9 / 61, 12);
    expect(seriesCurrent).toBeLessThan(parallelCurrent * 0.6);
    expect(element(parallel, 'm1').intensity - element(series, 'm1').intensity).toBeGreaterThan(
      0.15
    );
  });
});

describe('evaluate - resistance', () => {
  it('limits the current through an LED when a resistor is added in series', () => {
    const bare = resultOf(seriesLoads('led', ['led']));

    const battery = createElement('battery', { id: 'bat', position: at(0) });
    const resistor = createElement('resistor', {
      id: 'r',
      position: at(1),
      params: { resistance: 470 },
    });
    const led = createElement('led', { id: 'led', position: at(2) });
    const guarded = resultOf(
      createLayout(
        [battery, resistor, led],
        [
          ...seriesChain([resistor, led]),
          connectTerminals(terminalOf(battery, 0), terminalOf(resistor, 0)),
          connectTerminals(terminalOf(led, 1), terminalOf(battery, 1)),
        ],
        GRID
      )
    );

    expect(element(bare, 'led').current).toBeCloseTo(9 / 30.5, 12);
    expect(element(guarded, 'led').current).toBeCloseTo(9 / 500.5, 12);
    expect(element(bare, 'led').current / element(guarded, 'led').current).toBeGreaterThan(10);
    expect(bare.faults.map((fault) => fault.code)).toEqual(['OVERCURRENT']);
    expect(guarded.faults).toEqual([]);
  });

  it('raises the current when the battery voltage is raised', () => {
    const layout = seriesLoads('motor', ['mot']);
    const low = resultOf(layout, {}, { sourceVoltage: 3, lightLevel: 1 });
    const high = resultOf(layout, {}, { sourceVoltage: 12, lightLevel: 1 });

    expect(element(high, 'mot').current).toBeGreaterThan(element(low, 'mot').current);
  });
});

describe('evaluate - faults', () => {
  it('reports a short circuit for a direct wire between the terminals', () => {
    const battery = createElement('battery', { id: 'bat', position: at(0) });
    const wire = createElement('wire', { id: 'w', position: at(1) });
    const result = resultOf(
      createLayout(
        [battery, wire],
        [
          connectTerminals(terminalOf(battery, 0), terminalOf(wire, 0)),
          connectTerminals(terminalOf(wire, 1), terminalOf(battery, 1)),
        ],
        GRID
      )
    );

    expect(result.faults.map((fault) => fault.code)).toEqual(['SHORT_CIRCUIT']);
    expect(result.faults[0]?.atPosition).toEqual(at(1));
    expect(Math.abs(element(result, 'bat').current)).toBeCloseTo(18, 9);
  });

  it('reports reversed polarity and leaves the LED dark', () => {
    const battery = createElement('battery', { id: 'bat', position: at(0) });
    const led = createElement('led', { id: 'led', position: at(1) });
    const result = resultOf(
      createLayout(
        [battery, led],
        [
          connectTerminals(terminalOf(battery, 0), terminalOf(led, 1)),
          connectTerminals(terminalOf(led, 0), terminalOf(battery, 1)),
        ],
        GRID
      )
    );

    expect(result.faults.map((fault) => fault.code)).toEqual(['REVERSED_POLARITY']);
    expect(element(result, 'led').energized).toBe(false);
    expect(element(result, 'led').intensity).toBe(0);
  });

  it('returns a result with a singular fault rather than an error', () => {
    const battery = createElement('battery', {
      id: 'bat',
      position: at(0),
      params: { internalResistance: 0 },
    });
    const wire = createElement('wire', { id: 'w', position: at(1) });
    const result = resultOf(
      createLayout(
        [battery, wire],
        [
          connectTerminals(terminalOf(battery, 0), terminalOf(wire, 0)),
          connectTerminals(terminalOf(wire, 1), terminalOf(battery, 1)),
        ],
        GRID
      )
    );

    expect(result.faults.map((fault) => fault.code)).toContain('SINGULAR_SYSTEM');
    expect(result.elements.every((entry) => entry.current === 0)).toBe(true);
  });
});

describe('evaluate - error handling', () => {
  it('returns a typed error and never throws for malformed input', () => {
    const cases: unknown[] = [
      null,
      undefined,
      0,
      'layout',
      [],
      {},
      { elements: [], connections: [], gridSize: null },
      { elements: {}, connections: [], gridSize: GRID },
    ];

    for (const candidate of cases) {
      const outcome = evaluate(candidate as CircuitLayout, {}, ENV);
      expect(isEvaluationError(outcome)).toBe(true);
      if (isEvaluationError(outcome)) {
        expect(outcome.errorCode).toBe('MALFORMED_INPUT');
        expect(outcome.issues.length).toBeGreaterThan(0);
      }
    }
  });

  it('rejects an unknown element kind as structurally invalid', () => {
    const rogue = { ...createElement('wire', { id: 'w', position: at(0) }), kind: 'capacitor' };
    const outcome = evaluate(
      { elements: [rogue], connections: [], gridSize: GRID } as unknown as CircuitLayout,
      {},
      ENV
    );

    expect(isEvaluationError(outcome)).toBe(true);
    if (isEvaluationError(outcome)) {
      expect(outcome.errorCode).toBe('STRUCTURAL_INVALID');
    }
  });

  it('rejects a layout above the element ceiling as a limit breach', () => {
    const elements: CircuitElement[] = [];
    for (let index = 0; index <= MAX_ELEMENT_COUNT; index += 1) {
      elements.push(createElement('wire', { id: `w${String(index)}`, position: at(index) }));
    }
    const outcome = evaluate(createLayout(elements, [], GRID), {}, ENV);

    expect(isEvaluationError(outcome)).toBe(true);
    if (isEvaluationError(outcome)) {
      expect(outcome.errorCode).toBe('LIMIT_EXCEEDED');
    }
  });

  it('rejects malformed switch states and an out-of-range environment', () => {
    const layout = seriesLoads('motor', ['mot']);
    expect(isEvaluationError(evaluate(layout, null as unknown as SwitchStates, ENV))).toBe(true);
    expect(
      isEvaluationError(evaluate(layout, {}, { sourceVoltage: 1e6, lightLevel: 1 }))
    ).toBe(true);
    expect(isEvaluationError(evaluate(layout, {}, null as unknown as Environment))).toBe(true);
  });

  it('carries no exception detail in an error outcome', () => {
    const outcome = evaluate(null as unknown as CircuitLayout, {}, ENV);
    const serialized = JSON.stringify(outcome);

    expect(serialized).not.toContain('stack');
    expect(serialized).not.toContain('TypeError');
  });
});

describe('evaluate - determinism and immutability', () => {
  it('returns deep-equal results for two identical calls', () => {
    const layout = parallelLoads(['m1', 'm2']);
    expect(resultOf(layout)).toEqual(resultOf(layout));
  });

  it('is unaffected by the order of the elements and connections', () => {
    const layout = seriesLoads('motor', ['m1', 'm2']);
    const reversed = createLayout(
      [...layout.elements].reverse(),
      [...layout.connections].reverse(),
      GRID
    );

    expect(resultOf(reversed)).toEqual(resultOf(layout));
  });

  it('freezes the result it returns', () => {
    const result = resultOf(seriesLoads('motor', ['mot']));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.elements)).toBe(true);
    expect(Object.isFrozen(result.nodeVoltages)).toBe(true);
  });

  it('freezes nothing the caller owns, including a position a fault points at', () => {
    const battery = createElement('battery', { id: 'bat', position: at(0) });
    const wire = createElement('wire', { id: 'w', position: at(1) });
    const layout = createLayout(
      [battery, wire],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(wire, 0)),
        connectTerminals(terminalOf(wire, 1), terminalOf(battery, 1)),
      ],
      GRID
    );

    const result = resultOf(layout);

    expect(result.faults[0]?.atPosition).toEqual(at(1));
    expect(result.faults[0]?.atPosition).not.toBe(wire.position);
    expect(Object.isFrozen(wire.position)).toBe(false);

    wire.position.col = 7;
    expect(result.faults[0]?.atPosition).toEqual(at(1));
  });

  it('produces a JSON-safe result with every numeric field finite', () => {
    const result = resultOf(parallelLoads(['m1', 'm2']));
    expect(Number.isFinite(result.totalCurrent)).toBe(true);
    expect(Number.isFinite(result.totalResistance)).toBe(true);
    for (const entry of result.elements) {
      expect(Number.isFinite(entry.current)).toBe(true);
      expect(Number.isFinite(entry.voltageDrop)).toBe(true);
      expect(Number.isFinite(entry.intensity)).toBe(true);
    }
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
