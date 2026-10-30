import {
  connectTerminals,
  createElement,
  createLayout,
  parallelBranches,
  seriesChain,
  terminalOf,
} from './builders';
import { ELEMENT_SPECS, INTERNAL_NODE_PREFIX } from './constants';
import { buildNetlist, isNetlist } from './netlist';
import {
  buildConductanceMatrix,
  deriveElementResults,
  nodeVoltagesOf,
  presentationOf,
  solveLinearSystem,
  summarize,
} from './solver';
import { resolveTopology } from './topology';
import type {
  CircuitElement,
  CircuitLayout,
  ElectricalGraph,
  ElementResult,
  Environment,
  GridSize,
  SwitchStates,
} from './types';

const GRID: GridSize = { cols: 24, rows: 16 };
const ENV: Environment = { sourceVoltage: 9, lightLevel: 1 };

interface Solved {
  graph: ElectricalGraph;
  results: ElementResult[];
  nodeVoltages: Record<string, number>;
  singular: boolean;
}

function solve(layout: CircuitLayout, switches: SwitchStates = {}, env = ENV): Solved {
  const netlist = buildNetlist(layout);
  if (!isNetlist(netlist)) {
    throw new Error('fixture layout must produce a netlist');
  }
  const graph = resolveTopology(netlist, switches, env);
  const system = buildConductanceMatrix(graph);
  const solution = solveLinearSystem(system);
  if (solution.singular) {
    return { graph, results: [], nodeVoltages: {}, singular: true };
  }
  return {
    graph,
    results: deriveElementResults(system, solution, graph),
    nodeVoltages: nodeVoltagesOf(system, solution, graph),
    singular: false,
  };
}

function currentOf(solved: Solved, elementId: string): number {
  const result = solved.results.find((entry) => entry.elementId === elementId);
  if (result === undefined) {
    throw new Error(`no result for ${elementId}`);
  }
  return result.current;
}

function intensityOf(solved: Solved, elementId: string): number {
  const result = solved.results.find((entry) => entry.elementId === elementId);
  if (result === undefined) {
    throw new Error(`no result for ${elementId}`);
  }
  return result.intensity;
}

/** Largest absolute net current leaving any non-reference node. Should be zero. */
function worstKirchhoffResidual(solved: Solved): number {
  const residual = new Map<string, number>();
  for (const edge of solved.graph.edges) {
    const current = currentOf(solved, edge.elementId);
    residual.set(edge.from, (residual.get(edge.from) ?? 0) + current);
    residual.set(edge.to, (residual.get(edge.to) ?? 0) - current);
  }
  // The grounded node of each component absorbs the net, so it is excluded.
  const grounded = new Set(
    solved.graph.nodes.length > 0 ? [solved.graph.nodes[0] ?? ''] : []
  );
  let worst = 0;
  for (const [node, sum] of residual) {
    if (grounded.has(node)) {
      continue;
    }
    worst = Math.max(worst, Math.abs(sum));
  }
  return worst;
}

function singleLoad(kind: 'motor' | 'led', loadId: string): CircuitLayout {
  const battery = createElement('battery', { id: 'bat' });
  const load = createElement(kind, { id: loadId });
  return createLayout(
    [battery, load],
    [
      connectTerminals(terminalOf(battery, 0), terminalOf(load, 0)),
      connectTerminals(terminalOf(load, 1), terminalOf(battery, 1)),
    ],
    GRID
  );
}

function seriesMotors(): CircuitLayout {
  const battery = createElement('battery', { id: 'bat' });
  const first = createElement('motor', { id: 'm1' });
  const second = createElement('motor', { id: 'm2' });
  return createLayout(
    [battery, first, second],
    [
      ...seriesChain([first, second]),
      connectTerminals(terminalOf(battery, 0), terminalOf(first, 0)),
      connectTerminals(terminalOf(second, 1), terminalOf(battery, 1)),
    ],
    GRID
  );
}

function parallelMotors(): CircuitLayout {
  const battery = createElement('battery', { id: 'bat' });
  const first = createElement('motor', { id: 'm1' });
  const second = createElement('motor', { id: 'm2' });
  return createLayout(
    [battery, first, second],
    parallelBranches(terminalOf(battery, 0), terminalOf(battery, 1), [[first], [second]]),
    GRID
  );
}

/**
 * Wheatstone bridge fed by an ideal source. `r5` bridges the two dividers, which is exactly
 * the topology series/parallel reduction cannot collapse.
 */
function bridge(resistances: readonly [number, number, number, number, number]): CircuitLayout {
  const [one, two, three, four, five] = resistances;
  const battery = createElement('battery', { id: 'bat', params: { internalResistance: 0 } });
  const arms: CircuitElement[] = [
    createElement('resistor', { id: 'r1', params: { resistance: one } }),
    createElement('resistor', { id: 'r2', params: { resistance: two } }),
    createElement('resistor', { id: 'r3', params: { resistance: three } }),
    createElement('resistor', { id: 'r4', params: { resistance: four } }),
    createElement('resistor', { id: 'r5', params: { resistance: five } }),
  ];
  return createLayout(
    [battery, ...arms],
    [
      connectTerminals(terminalOf(battery, 0), 'r1:0'),
      connectTerminals(terminalOf(battery, 0), 'r3:0'),
      connectTerminals('r1:1', 'r2:0'),
      connectTerminals('r1:1', 'r5:0'),
      connectTerminals('r3:1', 'r4:0'),
      connectTerminals('r3:1', 'r5:1'),
      connectTerminals('r2:1', terminalOf(battery, 1)),
      connectTerminals('r4:1', terminalOf(battery, 1)),
    ],
    GRID
  );
}

describe('buildConductanceMatrix', () => {
  it('adds one unknown per source branch and grounds one node per component', () => {
    const netlist = buildNetlist(singleLoad('motor', 'mot'));
    if (!isNetlist(netlist)) {
      throw new Error('fixture');
    }
    const graph = resolveTopology(netlist, {}, ENV);
    const system = buildConductanceMatrix(graph);

    expect(system.referenceNodes).toEqual(['bat:0']);
    expect(system.sourceBranchIndex.get('bat')).toBe(system.nodeIndex.size);
    expect(system.internalNodeOf.get('bat')).toBe(`${INTERNAL_NODE_PREFIX}bat`);
    expect(system.dimension).toBe(system.nodeIndex.size + 1);
  });

  it('grounds every component, so a floating sub-circuit stays solvable', () => {
    const layout = singleLoad('motor', 'mot');
    const stray = createElement('buzzer', { id: 'stray' });
    const withStray = createLayout([...layout.elements, stray], layout.connections, GRID);

    const solved = solve(withStray);
    expect(solved.singular).toBe(false);
    expect(currentOf(solved, 'stray')).toBe(0);
  });
});

describe('nodeVoltagesOf', () => {
  it('reports canonical nodes only, omitting internal source nodes', () => {
    const solved = solve(singleLoad('motor', 'mot'));
    expect(Object.keys(solved.nodeVoltages).sort()).toEqual(['bat:0', 'bat:1']);
    expect(solved.nodeVoltages['bat:0']).toBe(0);
  });
});

describe('deriveElementResults', () => {
  it('matches Ohm law for a single motor on a 9 volt battery', () => {
    const solved = solve(singleLoad('motor', 'mot'));

    expect(currentOf(solved, 'mot')).toBeCloseTo(9 / 60.5, 12);
    expect(currentOf(solved, 'bat')).toBeCloseTo(-9 / 60.5, 12);
    expect(worstKirchhoffResidual(solved)).toBeLessThan(1e-12);
  });

  it('reports a delivering battery as negative current, since current leaves its positive terminal', () => {
    const solved = solve(singleLoad('motor', 'mot'));
    expect(currentOf(solved, 'bat')).toBeLessThan(0);
    expect(summarize(solved.graph, solved.results).totalCurrent).toBeCloseTo(9 / 60.5, 12);
  });

  it('reports the equivalent external resistance as the total', () => {
    const solved = solve(singleLoad('motor', 'mot'));
    expect(summarize(solved.graph, solved.results).totalResistance).toBeCloseTo(60, 9);
  });

  it('gives each of two series motors measurably less current than in parallel', () => {
    const series = solve(seriesMotors());
    const parallel = solve(parallelMotors());

    // Series: one loop of 0.5 + 60 + 60 ohms. Parallel: 9 / 30.5 amperes total, split evenly
    // across two 60 ohm branches, so 9 / 61 each.
    expect(currentOf(series, 'm1')).toBeCloseTo(9 / 120.5, 12);
    expect(currentOf(series, 'm2')).toBeCloseTo(9 / 120.5, 12);
    expect(currentOf(parallel, 'm1')).toBeCloseTo(9 / 61, 12);
    expect(currentOf(parallel, 'm2')).toBeCloseTo(9 / 61, 12);
    expect(Math.abs(currentOf(parallel, 'bat'))).toBeCloseTo(9 / 30.5, 12);

    expect(currentOf(series, 'm1')).toBeLessThan(currentOf(parallel, 'm1') * 0.6);
    expect(worstKirchhoffResidual(series)).toBeLessThan(1e-12);
    expect(worstKirchhoffResidual(parallel)).toBeLessThan(1e-12);
  });

  it('makes the series dimming perceivable, not merely measurable', () => {
    const series = solve(seriesMotors());
    const parallel = solve(parallelMotors());

    expect(intensityOf(parallel, 'm1') - intensityOf(series, 'm1')).toBeGreaterThan(0.15);
    expect(intensityOf(series, 'm1')).toBeGreaterThan(0);
    expect(intensityOf(parallel, 'm1')).toBeLessThanOrEqual(1);
  });

  it('shows a series resistor limiting the current through an LED', () => {
    const bare = solve(singleLoad('led', 'led'));
    expect(currentOf(bare, 'led')).toBeCloseTo(9 / 30.5, 12);

    const battery = createElement('battery', { id: 'bat' });
    const resistor = createElement('resistor', { id: 'r', params: { resistance: 470 } });
    const led = createElement('led', { id: 'led' });
    const protectedLayout = createLayout(
      [battery, resistor, led],
      [
        ...seriesChain([resistor, led]),
        connectTerminals(terminalOf(battery, 0), terminalOf(resistor, 0)),
        connectTerminals(terminalOf(led, 1), terminalOf(battery, 1)),
      ],
      GRID
    );
    const limited = solve(protectedLayout);

    expect(currentOf(limited, 'led')).toBeCloseTo(9 / 500.5, 12);
    expect(currentOf(bare, 'led') / currentOf(limited, 'led')).toBeGreaterThan(10);
  });

  it('reports zero current and zero drop for a merged conductor, but marks it live', () => {
    const battery = createElement('battery', { id: 'bat' });
    const wire = createElement('wire', { id: 'w' });
    const motor = createElement('motor', { id: 'mot' });
    const layout = createLayout(
      [battery, wire, motor],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(wire, 0)),
        connectTerminals(terminalOf(wire, 1), terminalOf(motor, 0)),
        connectTerminals(terminalOf(motor, 1), terminalOf(battery, 1)),
      ],
      GRID
    );
    const solved = solve(layout);
    const conductor = solved.results.find((entry) => entry.elementId === 'w');

    expect(conductor).toMatchObject({ current: 0, voltageDrop: 0, intensity: 0, energized: true });
  });

  it('leaves an open switch and its chain dark', () => {
    const battery = createElement('battery', { id: 'bat' });
    const toggle = createElement('switch', { id: 'sw' });
    const motor = createElement('motor', { id: 'mot' });
    const layout = createLayout(
      [battery, toggle, motor],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(toggle, 0)),
        connectTerminals(terminalOf(toggle, 1), terminalOf(motor, 0)),
        connectTerminals(terminalOf(motor, 1), terminalOf(battery, 1)),
      ],
      GRID
    );

    const open = solve(layout, { sw: 'open' });
    expect(currentOf(open, 'mot')).toBe(0);
    expect(open.results.find((entry) => entry.elementId === 'sw')?.energized).toBe(false);

    const closed = solve(layout, { sw: 'closed' });
    expect(currentOf(closed, 'mot')).toBeCloseTo(9 / 60.5, 12);
    expect(closed.results.find((entry) => entry.elementId === 'sw')?.energized).toBe(true);
  });

  it('sorts results by element id', () => {
    const solved = solve(parallelMotors());
    expect(solved.results.map((entry) => entry.elementId)).toEqual(['bat', 'm1', 'm2']);
  });

  it('scales the solar panel output with the light level', () => {
    const solar = createElement('solar', { id: 'sun' });
    const motor = createElement('motor', { id: 'mot' });
    const layout = createLayout(
      [solar, motor],
      [
        connectTerminals(terminalOf(solar, 0), terminalOf(motor, 0)),
        connectTerminals(terminalOf(motor, 1), terminalOf(solar, 1)),
      ],
      GRID
    );

    const bright = solve(layout, {}, { sourceVoltage: 9, lightLevel: 1 });
    const dim = solve(layout, {}, { sourceVoltage: 9, lightLevel: 0.25 });
    const dark = solve(layout, {}, { sourceVoltage: 9, lightLevel: 0 });

    expect(currentOf(bright, 'mot')).toBeCloseTo(6 / 62, 12);
    expect(currentOf(dim, 'mot')).toBeCloseTo(1.5 / 62, 12);
    expect(currentOf(dark, 'mot')).toBe(0);
  });
});

describe('Wheatstone bridge', () => {
  it('finds no current through the bridge arm when the bridge is balanced', () => {
    const solved = solve(bridge([100, 100, 100, 100, 50]));

    expect(Math.abs(currentOf(solved, 'r5'))).toBeLessThan(1e-9);
    expect(solved.nodeVoltages['r1:1']).toBeCloseTo(solved.nodeVoltages['r3:1'] ?? 0, 9);
  });

  it('matches an independent Thevenin calculation when the bridge is unbalanced', () => {
    const [r1, r2, r3, r4, r5] = [100, 200, 300, 400, 500] as const;
    const supply = 9;

    // Thevenin equivalent seen by r5, computed here from scratch rather than reused from the
    // engine, so the two derivations are genuinely independent.
    const thevenin = supply * (r2 / (r1 + r2) - r4 / (r3 + r4));
    const resistance = (r1 * r2) / (r1 + r2) + (r3 * r4) / (r3 + r4);
    const expected = thevenin / (resistance + r5);

    const solved = solve(bridge([r1, r2, r3, r4, r5]));

    expect(expected).toBeCloseTo(1.161290322580645e-3, 15);
    expect(currentOf(solved, 'r5')).toBeCloseTo(expected, 12);
    expect(worstKirchhoffResidual(solved)).toBeLessThan(1e-12);
  });
});

describe('singular systems', () => {
  it('reports a singular system for an ideal source across a dead short', () => {
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

    expect(solve(layout).singular).toBe(true);
  });

  it('solves a real battery across a dead short, limited by its internal resistance', () => {
    const battery = createElement('battery', { id: 'bat' });
    const wire = createElement('wire', { id: 'w' });
    const layout = createLayout(
      [battery, wire],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(wire, 0)),
        connectTerminals(terminalOf(wire, 1), terminalOf(battery, 1)),
      ],
      GRID
    );

    const solved = solve(layout);
    expect(solved.singular).toBe(false);
    expect(Math.abs(currentOf(solved, 'bat'))).toBeCloseTo(9 / 0.5, 9);
  });
});

describe('presentationOf', () => {
  it('rises monotonically with current and stays inside zero to one', () => {
    const motor = ELEMENT_SPECS.motor;
    const low = presentationOf(motor, 0.05);
    const high = presentationOf(motor, 0.2);

    expect(low.intensity).toBeLessThan(high.intensity);
    expect(low.intensity).toBeGreaterThan(0);
    expect(high.intensity).toBeLessThanOrEqual(1);
  });

  it('clamps to one when a load is driven past its rating', () => {
    expect(presentationOf(ELEMENT_SPECS.led, 5).intensity).toBe(1);
  });

  it('reads as unpowered below the energize threshold', () => {
    expect(presentationOf(ELEMENT_SPECS.motor, 1e-6)).toEqual({ energized: false, intensity: 0 });
  });

  it('leaves a reverse-biased polarized load dark', () => {
    expect(presentationOf(ELEMENT_SPECS.led, -0.01)).toEqual({ energized: false, intensity: 0 });
    expect(presentationOf(ELEMENT_SPECS.motor, -0.1).energized).toBe(true);
  });

  it('energizes a load with no rating but gives it no brightness', () => {
    expect(presentationOf(ELEMENT_SPECS.resistor, 0.01)).toEqual({
      energized: true,
      intensity: 0,
    });
  });
});
