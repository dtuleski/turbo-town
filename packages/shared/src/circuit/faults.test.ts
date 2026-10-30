import { connectTerminals, createElement, createLayout, seriesChain, terminalOf } from './builders';
import { detectFaults, isShortCircuitPath, locateFaultPosition } from './faults';
import { buildNetlist, isNetlist } from './netlist';
import { buildConductanceMatrix, deriveElementResults, solveLinearSystem } from './solver';
import { resolveTopology } from './topology';
import type {
  CircuitLayout,
  ElectricalGraph,
  ElementResult,
  Environment,
  Fault,
  GridSize,
  SwitchStates,
} from './types';

const GRID: GridSize = { cols: 24, rows: 16 };
const ENV: Environment = { sourceVoltage: 9, lightLevel: 1 };

interface Analysed {
  graph: ElectricalGraph;
  elements: ElementResult[];
  faults: Fault[];
}

function analyse(layout: CircuitLayout, switches: SwitchStates = {}): Analysed {
  const netlist = buildNetlist(layout);
  if (!isNetlist(netlist)) {
    throw new Error('fixture layout must produce a netlist');
  }
  const graph = resolveTopology(netlist, switches, ENV);
  const system = buildConductanceMatrix(graph);
  const solution = solveLinearSystem(system);
  const elements = solution.singular ? [] : deriveElementResults(system, solution, graph);
  return { graph, elements, faults: detectFaults({ elements }, graph, solution.singular) };
}

function codesOf(analysed: Analysed): string[] {
  return analysed.faults.map((fault) => fault.code);
}

function shortedByWire(): CircuitLayout {
  const battery = createElement('battery', { id: 'bat' });
  const wire = createElement('wire', { id: 'w', position: { col: 4, row: 3, rotation: 90 } });
  return createLayout(
    [battery, wire],
    [
      connectTerminals(terminalOf(battery, 0), terminalOf(wire, 0)),
      connectTerminals(terminalOf(wire, 1), terminalOf(battery, 1)),
    ],
    GRID
  );
}

function loopWith(resistance: number): CircuitLayout {
  const battery = createElement('battery', { id: 'bat' });
  const resistor = createElement('resistor', { id: 'r', params: { resistance } });
  return createLayout(
    [battery, resistor],
    [
      connectTerminals(terminalOf(battery, 0), terminalOf(resistor, 0)),
      connectTerminals(terminalOf(resistor, 1), terminalOf(battery, 1)),
    ],
    GRID
  );
}

/** Two batteries on common rails, both feeding one motor. A healthy circuit. */
function parallelSourcesFeedingMotor(): CircuitLayout {
  const bat1 = createElement('battery', { id: 'bat1' });
  const bat2 = createElement('battery', { id: 'bat2' });
  const motor = createElement('motor', { id: 'mot' });
  return createLayout(
    [bat1, bat2, motor],
    [
      connectTerminals(terminalOf(bat1, 0), terminalOf(bat2, 0)),
      connectTerminals(terminalOf(bat1, 0), terminalOf(motor, 0)),
      connectTerminals(terminalOf(bat1, 1), terminalOf(bat2, 1)),
      connectTerminals(terminalOf(motor, 1), terminalOf(bat1, 1)),
    ],
    GRID
  );
}

/** Two batteries in series with no load at all, the loop closed by one wire. */
function seriesSourcesShortedByWire(): CircuitLayout {
  const bat1 = createElement('battery', { id: 'bat1' });
  const bat2 = createElement('battery', { id: 'bat2' });
  const wire = createElement('wire', { id: 'w' });
  return createLayout(
    [bat1, bat2, wire],
    [
      connectTerminals(terminalOf(bat1, 0), terminalOf(bat2, 1)),
      connectTerminals(terminalOf(bat2, 0), terminalOf(wire, 0)),
      connectTerminals(terminalOf(wire, 1), terminalOf(bat1, 1)),
    ],
    GRID
  );
}

function currentOf(analysed: Analysed, elementId: string): number {
  const found = analysed.elements.find((entry) => entry.elementId === elementId);
  if (found === undefined) {
    throw new Error(`no result for ${elementId}`);
  }
  return found.current;
}

describe('isShortCircuitPath', () => {
  it('flags a bare wire from positive to negative', () => {
    expect(isShortCircuitPath(analyse(shortedByWire()).graph, 'bat')).toBe(true);
  });

  it('flags a closed switch used as the only path', () => {
    const battery = createElement('battery', { id: 'bat' });
    const toggle = createElement('switch', { id: 'sw' });
    const layout = createLayout(
      [battery, toggle],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(toggle, 0)),
        connectTerminals(terminalOf(toggle, 1), terminalOf(battery, 1)),
      ],
      GRID
    );

    expect(isShortCircuitPath(analyse(layout, { sw: 'closed' }).graph, 'bat')).toBe(true);
    expect(isShortCircuitPath(analyse(layout, { sw: 'open' }).graph, 'bat')).toBe(false);
  });

  it('does not flag the smallest legal resistor, because the comparison is strict', () => {
    expect(isShortCircuitPath(analyse(loopWith(1)).graph, 'bat')).toBe(false);
    expect(isShortCircuitPath(analyse(loopWith(470)).graph, 'bat')).toBe(false);
  });

  it('is false for an element that is not a source in the layout', () => {
    expect(isShortCircuitPath(analyse(loopWith(470)).graph, 'nope')).toBe(false);
  });

  it('does not treat a route through a second source as a path the player built', () => {
    const analysed = analyse(parallelSourcesFeedingMotor());

    expect(isShortCircuitPath(analysed.graph, 'bat1')).toBe(false);
    expect(isShortCircuitPath(analysed.graph, 'bat2')).toBe(false);
  });
});

describe('detectFaults', () => {
  it('reports a short circuit naming both the offending wire and the source', () => {
    const analysed = analyse(shortedByWire());
    const fault = analysed.faults[0];

    expect(codesOf(analysed)).toEqual(['SHORT_CIRCUIT']);
    expect(fault?.elementIds).toEqual(['w', 'bat']);
  });

  it('places the fault on the wire the player built, not on the battery', () => {
    const fault = analyse(shortedByWire()).faults[0];
    expect(fault?.atPosition).toEqual({ col: 4, row: 3, rotation: 90 });
  });

  it('reports overcurrent for an unprotected LED and nothing once a resistor protects it', () => {
    const battery = createElement('battery', { id: 'bat' });
    const led = createElement('led', { id: 'led' });
    const bare = createLayout(
      [battery, led],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(led, 0)),
        connectTerminals(terminalOf(led, 1), terminalOf(battery, 1)),
      ],
      GRID
    );
    expect(codesOf(analyse(bare))).toEqual(['OVERCURRENT']);

    const resistor = createElement('resistor', { id: 'r', params: { resistance: 470 } });
    const guarded = createLayout(
      [battery, resistor, led],
      [
        ...seriesChain([resistor, led]),
        connectTerminals(terminalOf(battery, 0), terminalOf(resistor, 0)),
        connectTerminals(terminalOf(led, 1), terminalOf(battery, 1)),
      ],
      GRID
    );
    expect(codesOf(analyse(guarded))).toEqual([]);
  });

  it('reports reversed polarity for a backwards LED, and not its model-artifact overcurrent', () => {
    const battery = createElement('battery', { id: 'bat' });
    const led = createElement('led', { id: 'led' });
    const backwards = createLayout(
      [battery, led],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(led, 1)),
        connectTerminals(terminalOf(led, 0), terminalOf(battery, 1)),
      ],
      GRID
    );

    expect(codesOf(analyse(backwards))).toEqual(['REVERSED_POLARITY']);
  });

  it('reports a singular system as a fault rather than a solver error', () => {
    const battery = createElement('battery', { id: 'bat', params: { internalResistance: 0 } });
    const wire = createElement('wire', { id: 'w' });
    const layout = createLayout(
      [battery, wire],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(wire, 0)),
        connectTerminals(terminalOf(wire, 1), terminalOf(battery, 1)),
      ],
      GRID
    );

    const analysed = analyse(layout);
    expect(codesOf(analysed)).toEqual(['SHORT_CIRCUIT', 'SINGULAR_SYSTEM']);
    expect(analysed.faults[1]?.elementIds).toEqual(['bat']);
  });

  it('orders three simultaneous fault kinds by severity', () => {
    const shortedBattery = createElement('battery', { id: 'bat1' });
    const wire = createElement('wire', { id: 'w' });
    const loadedBattery = createElement('battery', { id: 'bat2' });
    const forward = createElement('led', { id: 'led-fwd' });
    const backwards = createElement('led', { id: 'led-rev' });

    const layout = createLayout(
      [shortedBattery, wire, loadedBattery, forward, backwards],
      [
        connectTerminals(terminalOf(shortedBattery, 0), terminalOf(wire, 0)),
        connectTerminals(terminalOf(wire, 1), terminalOf(shortedBattery, 1)),
        connectTerminals(terminalOf(loadedBattery, 0), terminalOf(forward, 0)),
        connectTerminals(terminalOf(forward, 1), terminalOf(loadedBattery, 1)),
        connectTerminals(terminalOf(loadedBattery, 0), terminalOf(backwards, 1)),
        connectTerminals(terminalOf(backwards, 0), terminalOf(loadedBattery, 1)),
      ],
      GRID
    );

    expect(codesOf(analyse(layout))).toEqual([
      'SHORT_CIRCUIT',
      'OVERCURRENT',
      'REVERSED_POLARITY',
    ]);
  });

  it('reports no fault for a healthy circuit', () => {
    expect(codesOf(analyse(loopWith(470)))).toEqual([]);
  });

  it('reports no fault for two sources on common rails feeding one load', () => {
    const analysed = analyse(parallelSourcesFeedingMotor());

    expect(codesOf(analysed)).toEqual([]);
    expect(currentOf(analysed, 'mot')).toBeCloseTo(9 / 60.25, 12);
    expect(Math.abs(currentOf(analysed, 'bat1'))).toBeCloseTo(9 / 120.5, 12);
  });

  it('still reports a short for two sources in series with no load', () => {
    const analysed = analyse(seriesSourcesShortedByWire());

    expect(codesOf(analysed)).toEqual(['SHORT_CIRCUIT', 'SHORT_CIRCUIT']);
    expect(Math.abs(currentOf(analysed, 'bat1'))).toBeCloseTo(18, 9);
  });

  it('does not report a short for the smallest legal resistance a player can wire', () => {
    expect(codesOf(analyse(loopWith(1)))).toEqual([]);
  });
});

describe('locateFaultPosition', () => {
  it('returns undefined when no element in the fault exists in the layout', () => {
    const layout = loopWith(470);
    const fault: Fault = { code: 'OVERCURRENT', elementIds: ['ghost'] };
    expect(locateFaultPosition(fault, layout)).toBeUndefined();
  });

  it('resolves the first element in the fault that the layout contains', () => {
    const layout = shortedByWire();
    const fault: Fault = { code: 'SHORT_CIRCUIT', elementIds: ['ghost', 'w'] };
    expect(locateFaultPosition(fault, layout)).toEqual({ col: 4, row: 3, rotation: 90 });
  });

  it('returns a copy, so a frozen fault never freezes the caller layout', () => {
    const layout = shortedByWire();
    const wire = layout.elements.find((candidate) => candidate.id === 'w');
    const fault: Fault = { code: 'SHORT_CIRCUIT', elementIds: ['w'] };

    const position = locateFaultPosition(fault, layout);
    Object.freeze(position);

    expect(position).not.toBe(wire?.position);
    expect(Object.isFrozen(wire?.position)).toBe(false);
  });
});
