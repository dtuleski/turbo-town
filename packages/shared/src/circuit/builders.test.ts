import {
  connectTerminals,
  createElement,
  createLayout,
  defaultSwitchStates,
  parallelBranches,
  seriesChain,
  terminalOf,
} from './builders';
import type { Environment, GridSize } from './types';
import { validateStructure } from './validation';

const GRID: GridSize = { cols: 8, rows: 6 };
const ENV: Environment = { sourceVoltage: 9, lightLevel: 1 };

describe('createElement', () => {
  it('derives terminal ids from the element id', () => {
    const led = createElement('led', { id: 'led1' });
    expect(led.terminals).toEqual(['led1:0', 'led1:1']);
    expect(led.position).toEqual({ col: 0, row: 0, rotation: 0 });
    expect(led.params).toBeUndefined();
  });

  it('keeps explicit terminals, position, and params', () => {
    const resistor = createElement('resistor', {
      id: 'r1',
      position: { col: 3, row: 2, rotation: 180 },
      params: { resistance: 220 },
      terminals: ['a', 'b'],
    });
    expect(resistor.terminals).toEqual(['a', 'b']);
    expect(resistor.position).toEqual({ col: 3, row: 2, rotation: 180 });
    expect(resistor.params).toEqual({ resistance: 220 });
  });

  it('produces the same element twice for the same arguments', () => {
    expect(createElement('motor', { id: 'm' })).toEqual(createElement('motor', { id: 'm' }));
  });
});

describe('connectTerminals', () => {
  it('derives a reproducible id from the endpoints', () => {
    expect(connectTerminals('a', 'b')).toEqual({ id: 'a~b', from: 'a', to: 'b' });
    expect(connectTerminals('a', 'b', 'custom').id).toBe('custom');
  });
});

describe('seriesChain', () => {
  it('joins each element tail to the next head and leaves the ends free', () => {
    const first = createElement('led', { id: 'l1' });
    const second = createElement('led', { id: 'l2' });
    const third = createElement('led', { id: 'l3' });
    const connections = seriesChain([first, second, third]);

    expect(connections).toHaveLength(2);
    expect(connections[0]).toMatchObject({ from: 'l1:1', to: 'l2:0' });
    expect(connections[1]).toMatchObject({ from: 'l2:1', to: 'l3:0' });
  });

  it('returns nothing for zero or one element', () => {
    expect(seriesChain([])).toEqual([]);
    expect(seriesChain([createElement('led', { id: 'only' })])).toEqual([]);
  });
});

describe('parallelBranches', () => {
  it('ties every branch across the same two rails', () => {
    const left = createElement('motor', { id: 'm1' });
    const right = createElement('motor', { id: 'm2' });
    const connections = parallelBranches('rail+', 'rail-', [[left], [right]]);

    expect(connections).toHaveLength(4);
    expect(connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'rail+', to: 'm1:0' }),
        expect.objectContaining({ from: 'm1:1', to: 'rail-' }),
        expect.objectContaining({ from: 'rail+', to: 'm2:0' }),
        expect.objectContaining({ from: 'm2:1', to: 'rail-' }),
      ])
    );
  });

  it('skips an empty branch rather than shorting the rails', () => {
    expect(parallelBranches('p', 'n', [[]])).toEqual([]);
  });
});

describe('defaultSwitchStates', () => {
  it('covers every switch and nothing else', () => {
    const toggle = createElement('switch', { id: 'sw1' });
    const other = createElement('switch', { id: 'sw2' });
    const led = createElement('led', { id: 'led' });
    const layout = createLayout([toggle, other, led], [], GRID);

    expect(defaultSwitchStates(layout)).toEqual({ sw1: 'closed', sw2: 'closed' });
    expect(defaultSwitchStates(layout, 'open')).toEqual({ sw1: 'open', sw2: 'open' });
  });
});

describe('createLayout', () => {
  it('builds a layout that passes structural validation', () => {
    const battery = createElement('battery', { id: 'bat', position: { col: 0, row: 0, rotation: 0 } });
    const motor = createElement('motor', { id: 'mot', position: { col: 2, row: 0, rotation: 0 } });
    const layout = createLayout(
      [battery, motor],
      [
        connectTerminals(terminalOf(battery, 0), terminalOf(motor, 0)),
        connectTerminals(terminalOf(motor, 1), terminalOf(battery, 1)),
      ],
      GRID
    );

    expect(validateStructure(layout, {}, ENV)).toEqual({ valid: true, issues: [] });
  });
});
