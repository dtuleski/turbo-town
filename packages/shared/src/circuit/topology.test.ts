import { connectTerminals, createElement, createLayout, terminalOf } from './builders';
import { SOLAR_MAX_VOLTAGE } from './constants';
import { buildNetlist, isNetlist } from './netlist';
import {
  findConnectedComponents,
  hasClosedPath,
  minimumResistancePath,
  resistanceOf,
  resolveTopology,
  sourceVoltageOf,
  switchStateOf,
} from './topology';
import type {
  CircuitLayout,
  ElectricalGraph,
  Environment,
  GridSize,
  SwitchStates,
} from './types';

const GRID: GridSize = { cols: 8, rows: 6 };
const ENV: Environment = { sourceVoltage: 9, lightLevel: 1 };

function graphOf(layout: CircuitLayout, switches: SwitchStates = {}, env = ENV): ElectricalGraph {
  const netlist = buildNetlist(layout);
  if (!isNetlist(netlist)) {
    throw new Error('fixture layout must produce a netlist');
  }
  return resolveTopology(netlist, switches, env);
}

/** Battery and one load in a single loop. */
function loopLayout(loadKind: 'led' | 'motor' = 'motor'): CircuitLayout {
  const battery = createElement('battery', { id: 'bat' });
  const load = createElement(loadKind, { id: 'load' });
  return createLayout(
    [battery, load],
    [
      connectTerminals(terminalOf(battery, 0), terminalOf(load, 0)),
      connectTerminals(terminalOf(load, 1), terminalOf(battery, 1)),
    ],
    GRID
  );
}

/** Battery shorted by a bare wire: a closed path with no load on it. */
function shortedLayout(): CircuitLayout {
  const battery = createElement('battery', { id: 'bat' });
  const wire = createElement('wire', { id: 'w', position: { col: 4, row: 3, rotation: 0 } });
  return createLayout(
    [battery, wire],
    [
      connectTerminals(terminalOf(battery, 0), terminalOf(wire, 0)),
      connectTerminals(terminalOf(wire, 1), terminalOf(battery, 1)),
    ],
    GRID
  );
}

/** Battery, switch, and motor in one loop. */
function switchedLayout(): CircuitLayout {
  const battery = createElement('battery', { id: 'bat' });
  const toggle = createElement('switch', { id: 'sw' });
  const motor = createElement('motor', { id: 'mot' });
  return createLayout(
    [battery, toggle, motor],
    [
      connectTerminals(terminalOf(battery, 0), terminalOf(toggle, 0)),
      connectTerminals(terminalOf(toggle, 1), terminalOf(motor, 0)),
      connectTerminals(terminalOf(motor, 1), terminalOf(battery, 1)),
    ],
    GRID
  );
}

describe('switchStateOf', () => {
  it('treats a switch with no entry as open, so an incomplete map de-energizes', () => {
    expect(switchStateOf({}, 'sw')).toBe('open');
    expect(switchStateOf({ sw: 'closed' }, 'sw')).toBe('closed');
    expect(switchStateOf({ sw: 'open' }, 'sw')).toBe('open');
    expect(switchStateOf(null as unknown as SwitchStates, 'sw')).toBe('open');
  });

  it('does not read an inherited property as a switch state', () => {
    expect(switchStateOf({} as SwitchStates, 'toString')).toBe('open');
  });
});

describe('resistanceOf and sourceVoltageOf', () => {
  it('uses the fixed spec resistance for a fixed load', () => {
    expect(resistanceOf(createElement('led', { id: 'l' }))).toBe(30);
    expect(resistanceOf(createElement('motor', { id: 'm' }))).toBe(60);
  });

  it('uses a resistor param, clamped to the legal range, and a default when absent', () => {
    expect(resistanceOf(createElement('resistor', { id: 'r', params: { resistance: 220 } }))).toBe(
      220
    );
    expect(resistanceOf(createElement('resistor', { id: 'r' }))).toBe(470);
    expect(resistanceOf(createElement('resistor', { id: 'r', params: { resistance: 1e9 } }))).toBe(
      10000
    );
  });

  it('clamps the battery voltage and scales the solar panel by light level', () => {
    const battery = createElement('battery', { id: 'b' });
    expect(sourceVoltageOf(battery, { sourceVoltage: 9, lightLevel: 1 })).toBe(9);
    expect(sourceVoltageOf(battery, { sourceVoltage: 999, lightLevel: 1 })).toBe(12);

    const solar = createElement('solar', { id: 's' });
    expect(sourceVoltageOf(solar, { sourceVoltage: 9, lightLevel: 1 })).toBe(SOLAR_MAX_VOLTAGE);
    expect(sourceVoltageOf(solar, { sourceVoltage: 9, lightLevel: 0.5 })).toBe(
      SOLAR_MAX_VOLTAGE / 2
    );
    expect(sourceVoltageOf(solar, { sourceVoltage: 9, lightLevel: 0 })).toBe(0);
  });
});

describe('resolveTopology', () => {
  it('emits an edge per non-conductor and merges wires away', () => {
    const graph = graphOf(shortedLayout());

    expect(graph.edges.map((edge) => edge.elementId)).toEqual(['bat']);
    expect(graph.mergedConductorIds).toEqual(['w']);
    expect(graph.nodes).toHaveLength(1);
  });

  it('merges a closed switch and drops an open one', () => {
    const closed = graphOf(switchedLayout(), { sw: 'closed' });
    expect(closed.mergedConductorIds).toEqual(['sw']);
    expect(closed.openSwitchIds).toEqual([]);
    expect(closed.nodes).toHaveLength(2);

    const open = graphOf(switchedLayout(), { sw: 'open' });
    expect(open.openSwitchIds).toEqual(['sw']);
    expect(open.mergedConductorIds).toEqual([]);
    expect(open.nodes).toHaveLength(3);
  });

  it('records the source voltage and internal resistance on the source edge', () => {
    const graph = graphOf(loopLayout());
    const source = graph.sources[0];

    expect(graph.sources).toHaveLength(1);
    expect(source?.sourceVoltage).toBe(9);
    expect(source?.resistance).toBe(0.5);
  });
});

describe('findConnectedComponents', () => {
  it('separates an isolated sub-circuit from the powered one', () => {
    const layout = loopLayout();
    const stray = createElement('led', { id: 'stray' });
    const withStray = createLayout([...layout.elements, stray], layout.connections, GRID);

    const components = findConnectedComponents(graphOf(withStray));
    expect(components).toHaveLength(2);
    expect(components.map((component) => component.length).sort()).toEqual([2, 2]);
  });

  it('returns one component for a single loop', () => {
    expect(findConnectedComponents(graphOf(loopLayout()))).toHaveLength(1);
  });
});

describe('hasClosedPath', () => {
  it('is true when a load joins the source terminals', () => {
    expect(hasClosedPath(graphOf(loopLayout()), 'bat')).toBe(true);
  });

  it('is true for a bare wire too, since this predicate is purely topological', () => {
    // Whether that path carries a load is FR-CB-10's question, answered by A5 from the
    // solved currents. See the closedPathExists cases in evaluate.test.ts.
    expect(hasClosedPath(graphOf(shortedLayout()), 'bat')).toBe(true);
  });

  it('is false with the switch open and true once it closes', () => {
    expect(hasClosedPath(graphOf(switchedLayout(), { sw: 'open' }), 'bat')).toBe(false);
    expect(hasClosedPath(graphOf(switchedLayout(), { sw: 'closed' }), 'bat')).toBe(true);
  });

  it('is false when nothing is wired to the source at all', () => {
    const battery = createElement('battery', { id: 'bat' });
    expect(hasClosedPath(graphOf(createLayout([battery], [], GRID)), 'bat')).toBe(false);
  });

  it('is false for an element that is not in the layout', () => {
    expect(hasClosedPath(graphOf(loopLayout()), 'nope')).toBe(false);
  });
});

describe('minimumResistancePath', () => {
  it('finds the zero-resistance wire route that shorts a battery', () => {
    const graph = graphOf(shortedLayout());
    const path = minimumResistancePath(
      graph.conduction,
      'bat:0',
      'bat:1',
      new Set(['bat'])
    );

    expect(path?.resistance).toBe(0);
    expect(path?.elementIds).toEqual(['w']);
  });

  it('prefers the lower-resistance of two parallel routes', () => {
    const battery = createElement('battery', { id: 'bat' });
    const small = createElement('resistor', { id: 'r-small', params: { resistance: 100 } });
    const large = createElement('resistor', { id: 'r-large', params: { resistance: 900 } });
    const layout = createLayout(
      [battery, small, large],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(small, 0)),
        connectTerminals(terminalOf(small, 1), terminalOf(battery, 1)),
        connectTerminals(terminalOf(battery, 0), terminalOf(large, 0)),
        connectTerminals(terminalOf(large, 1), terminalOf(battery, 1)),
      ],
      GRID
    );

    const path = minimumResistancePath(
      graphOf(layout).conduction,
      'bat:0',
      'bat:1',
      new Set(['bat'])
    );
    expect(path?.resistance).toBe(100);
    expect(path?.elementIds).toEqual(['r-small']);
  });

  it('returns undefined when no route exists or a node is unknown', () => {
    const graph = graphOf(switchedLayout(), { sw: 'open' });
    expect(
      minimumResistancePath(graph.conduction, 'bat:0', 'bat:1', new Set(['bat']))
    ).toBeUndefined();
    expect(minimumResistancePath(graph.conduction, 'bat:0', 'ghost')).toBeUndefined();
  });
});
