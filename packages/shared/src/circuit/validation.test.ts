import { connectTerminals, createElement, createLayout, terminalOf } from './builders';
import { MAX_CONNECTION_COUNT, MAX_ELEMENT_COUNT, MAX_ID_LENGTH } from './constants';
import type {
  CircuitElement,
  CircuitLayout,
  Connection,
  Environment,
  GridSize,
  StructuralIssueCode,
  SwitchStates,
} from './types';
import { validateStructure } from './validation';

const GRID: GridSize = { cols: 8, rows: 6 };
const ENV: Environment = { sourceVoltage: 9, lightLevel: 1 };

function codesFor(
  layout: unknown,
  switches: SwitchStates = {},
  env: Environment = ENV
): StructuralIssueCode[] {
  return validateStructure(layout as CircuitLayout, switches, env).issues.map(
    (issue) => issue.code
  );
}

function validLayout(): CircuitLayout {
  const battery = createElement('battery', { id: 'bat', position: { col: 0, row: 0, rotation: 0 } });
  const led = createElement('led', { id: 'led', position: { col: 2, row: 0, rotation: 90 } });
  return createLayout(
    [battery, led],
    [
      connectTerminals(terminalOf(battery, 0), terminalOf(led, 0)),
      connectTerminals(terminalOf(led, 1), terminalOf(battery, 1)),
    ],
    GRID
  );
}

describe('validateStructure', () => {
  it('accepts a well-formed layout', () => {
    const validation = validateStructure(validLayout(), {}, ENV);
    expect(validation.valid).toBe(true);
    expect(validation.issues).toEqual([]);
  });

  it('never throws on a malformed payload', () => {
    expect(codesFor(null)).toContain('MALFORMED_PAYLOAD');
    expect(codesFor(undefined)).toContain('MALFORMED_PAYLOAD');
    expect(codesFor('not a layout')).toContain('MALFORMED_PAYLOAD');
    expect(codesFor({ elements: 'nope', connections: [], gridSize: GRID })).toContain(
      'MALFORMED_PAYLOAD'
    );
    expect(codesFor({ elements: [], connections: 'nope', gridSize: GRID })).toContain(
      'MALFORMED_PAYLOAD'
    );
    expect(codesFor({ elements: [null], connections: [], gridSize: GRID })).toContain(
      'MALFORMED_PAYLOAD'
    );
  });

  it('reports a duplicate element id', () => {
    const first = createElement('wire', { id: 'dup' });
    const second = createElement('wire', { id: 'dup', terminals: ['x0', 'x1'] });
    expect(codesFor(createLayout([first, second], [], GRID))).toContain('DUPLICATE_ELEMENT_ID');
  });

  it('reports a duplicate connection id', () => {
    const layout = validLayout();
    const first = layout.connections[0] as Connection;
    const clash: Connection = { ...first, id: first.id };
    expect(codesFor(createLayout(layout.elements, [first, clash], GRID))).toContain(
      'DUPLICATE_CONNECTION_ID'
    );
  });

  it('reports an unknown element kind', () => {
    const rogue = { ...createElement('wire', { id: 'w' }), kind: 'capacitor' };
    expect(codesFor({ elements: [rogue], connections: [], gridSize: GRID })).toContain(
      'UNKNOWN_ELEMENT_KIND'
    );
  });

  it('reports a connection naming a terminal no element declares', () => {
    const wire = createElement('wire', { id: 'w' });
    const dangling = connectTerminals(terminalOf(wire, 0), 'ghost:0');
    expect(codesFor(createLayout([wire], [dangling], GRID))).toContain('UNRESOLVED_TERMINAL_REF');
  });

  it('reports a connection joining a terminal to itself', () => {
    const wire = createElement('wire', { id: 'w' });
    const loop: Connection = { id: 'c', from: terminalOf(wire, 0), to: terminalOf(wire, 0) };
    expect(codesFor(createLayout([wire], [loop], GRID))).toContain('SELF_CONNECTION');
  });

  it('reports a position outside the grid', () => {
    const wire = createElement('wire', { id: 'w', position: { col: 99, row: 0, rotation: 0 } });
    expect(codesFor(createLayout([wire], [], GRID))).toContain('POSITION_OUT_OF_BOUNDS');
  });

  it('reports a grid size outside the supported range', () => {
    expect(codesFor({ elements: [], connections: [], gridSize: { cols: 1, rows: 1 } })).toContain(
      'GRID_SIZE_OUT_OF_BOUNDS'
    );
    expect(
      codesFor({ elements: [], connections: [], gridSize: { cols: 1000, rows: 1000 } })
    ).toContain('GRID_SIZE_OUT_OF_BOUNDS');
  });

  it('reports an invalid rotation', () => {
    const wire = {
      ...createElement('wire', { id: 'w' }),
      position: { col: 0, row: 0, rotation: 45 },
    };
    expect(codesFor({ elements: [wire], connections: [], gridSize: GRID })).toContain(
      'INVALID_ROTATION'
    );
  });

  it('reports an element count above the ceiling', () => {
    const elements: CircuitElement[] = [];
    for (let index = 0; index <= MAX_ELEMENT_COUNT; index += 1) {
      elements.push(createElement('wire', { id: `w${String(index)}` }));
    }
    expect(elements).toHaveLength(MAX_ELEMENT_COUNT + 1);
    expect(codesFor(createLayout(elements, [], GRID))).toContain('ELEMENT_COUNT_EXCEEDED');
  });

  it('reports a connection count above the ceiling', () => {
    const connections: Connection[] = [];
    for (let index = 0; index <= MAX_CONNECTION_COUNT; index += 1) {
      connections.push({ id: `c${String(index)}`, from: 'a', to: 'b' });
    }
    expect(codesFor(createLayout([], connections, GRID))).toContain('CONNECTION_COUNT_EXCEEDED');
  });

  it('reports an over-long id', () => {
    const longId = 'w'.repeat(MAX_ID_LENGTH + 1);
    expect(codesFor(createLayout([createElement('wire', { id: longId })], [], GRID))).toContain(
      'ID_TOO_LONG'
    );
  });

  it('reports a non-finite param', () => {
    const bad = createElement('resistor', { id: 'r', params: { resistance: Number.NaN } });
    expect(codesFor(createLayout([bad], [], GRID))).toContain('NON_FINITE_PARAM');
  });

  it('reports a resistance outside the legal range', () => {
    const tooSmall = createElement('resistor', { id: 'r', params: { resistance: 0 } });
    expect(codesFor(createLayout([tooSmall], [], GRID))).toContain('PARAM_OUT_OF_RANGE');
    const tooLarge = createElement('resistor', { id: 'r', params: { resistance: 1e9 } });
    expect(codesFor(createLayout([tooLarge], [], GRID))).toContain('PARAM_OUT_OF_RANGE');
  });

  it('reports a terminal id used twice', () => {
    const shared = createElement('wire', { id: 'w1', terminals: ['t0', 't1'] });
    const clashing = createElement('wire', { id: 'w2', terminals: ['t1', 't2'] });
    expect(codesFor(createLayout([shared, clashing], [], GRID))).toContain('DUPLICATE_TERMINAL');

    const selfShorted = createElement('wire', { id: 'w3', terminals: ['s0', 's0'] });
    expect(codesFor(createLayout([selfShorted], [], GRID))).toContain('DUPLICATE_TERMINAL');
  });

  it('reports an invalid switch state and an unknown switch element', () => {
    const toggle = createElement('switch', { id: 'sw' });
    const layout = createLayout([toggle], [], GRID);
    expect(codesFor(layout, { sw: 'half-open' } as unknown as SwitchStates)).toContain(
      'INVALID_SWITCH_STATE'
    );
    expect(codesFor(layout, { ghost: 'open' })).toContain('UNKNOWN_SWITCH_ELEMENT');
    expect(codesFor(layout, null as unknown as SwitchStates)).toContain('MALFORMED_PAYLOAD');
  });

  it('reports an environment outside the safe range', () => {
    const layout = validLayout();
    expect(codesFor(layout, {}, { sourceVoltage: 240, lightLevel: 1 })).toContain(
      'VOLTAGE_OUT_OF_RANGE'
    );
    expect(codesFor(layout, {}, { sourceVoltage: 0, lightLevel: 1 })).toContain(
      'VOLTAGE_OUT_OF_RANGE'
    );
    expect(codesFor(layout, {}, { sourceVoltage: 9, lightLevel: 4 })).toContain(
      'LIGHT_LEVEL_OUT_OF_RANGE'
    );
    expect(
      codesFor(layout, {}, { sourceVoltage: Number.NaN, lightLevel: Number.NaN })
    ).toEqual(expect.arrayContaining(['LIGHT_LEVEL_OUT_OF_RANGE', 'VOLTAGE_OUT_OF_RANGE']));
    expect(codesFor(layout, {}, null as unknown as Environment)).toContain('MALFORMED_PAYLOAD');
  });

  it('returns issues in an order that does not depend on input order', () => {
    const layout = validLayout();
    const reversed = createLayout(
      [...layout.elements].reverse(),
      [...layout.connections].reverse(),
      GRID
    );
    const first = validateStructure(layout, {}, { sourceVoltage: 240, lightLevel: 9 });
    const second = validateStructure(reversed, {}, { sourceVoltage: 240, lightLevel: 9 });
    expect(second.issues).toEqual(first.issues);
  });
});
