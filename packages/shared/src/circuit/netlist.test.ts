import { connectTerminals, createElement, createLayout, seriesChain, terminalOf } from './builders';
import {
  buildNetlist,
  canonicalNodesOf,
  compareIds,
  isNetlist,
  resolveNodeIdentity,
} from './netlist';
import type { CircuitLayout, GridSize } from './types';

const GRID: GridSize = { cols: 8, rows: 6 };

/** Battery, three wires in a chain, and an LED closing the loop. */
function wireChainLayout(): CircuitLayout {
  const battery = createElement('battery', { id: 'bat' });
  const wires = ['w1', 'w2', 'w3'].map((id) => createElement('wire', { id }));
  const led = createElement('led', { id: 'led' });
  const chain = seriesChain(wires);
  const [first, , last] = wires;
  if (first === undefined || last === undefined) {
    throw new Error('fixture requires three wires');
  }
  return createLayout(
    [battery, ...wires, led],
    [
      ...chain,
      connectTerminals(terminalOf(battery, 0), terminalOf(first, 0)),
      connectTerminals(terminalOf(last, 1), terminalOf(led, 0)),
      connectTerminals(terminalOf(led, 1), terminalOf(battery, 1)),
    ],
    GRID
  );
}

describe('compareIds', () => {
  it('orders by code unit and is total', () => {
    expect(compareIds('a', 'b')).toBe(-1);
    expect(compareIds('b', 'a')).toBe(1);
    expect(compareIds('a', 'a')).toBe(0);
    expect(compareIds('Z', 'a')).toBe(-1);
  });
});

describe('resolveNodeIdentity', () => {
  it('collapses a chain of wires into a single electrical node', () => {
    const layout = wireChainLayout();
    const canonical = resolveNodeIdentity(layout);

    expect(canonical.get('bat:0')).toBe(canonical.get('w3:1'));
    expect(canonical.get('bat:0')).toBe(canonical.get('led:0'));
    expect(canonical.get('bat:1')).toBe(canonical.get('led:1'));
    expect(canonical.get('bat:0')).not.toBe(canonical.get('bat:1'));
  });

  it('picks the lexicographically smallest member as the canonical node', () => {
    const left = createElement('wire', { id: 'zz', terminals: ['zz:0', 'zz:1'] });
    const right = createElement('wire', { id: 'aa', terminals: ['aa:0', 'aa:1'] });
    const layout = createLayout(
      [left, right],
      [connectTerminals('zz:0', 'aa:0')],
      GRID
    );
    const canonical = resolveNodeIdentity(layout);

    expect(canonical.get('zz:0')).toBe('aa:0');
  });

  it('keeps an open switch as two nodes and merges a closed one', () => {
    const toggle = createElement('switch', { id: 'sw' });
    const layout = createLayout([toggle], [], GRID);

    const open = resolveNodeIdentity(layout, () => false);
    expect(open.get('sw:0')).not.toBe(open.get('sw:1'));

    const closed = resolveNodeIdentity(layout, (element) => element.kind === 'switch');
    expect(closed.get('sw:0')).toBe(closed.get('sw:1'));
  });

  it('produces identical canonical ids after the input arrays are reversed', () => {
    const layout = wireChainLayout();
    const reversed = createLayout(
      [...layout.elements].reverse(),
      [...layout.connections].reverse(),
      GRID
    );

    const forward = resolveNodeIdentity(layout);
    const backward = resolveNodeIdentity(reversed);
    for (const terminal of forward.keys()) {
      expect(backward.get(terminal)).toBe(forward.get(terminal));
    }
  });

  it('ignores a connection whose endpoints are not declared terminals', () => {
    const wire = createElement('wire', { id: 'w' });
    const layout = createLayout([wire], [connectTerminals('w:0', 'ghost')], GRID);
    expect(resolveNodeIdentity(layout).has('ghost')).toBe(false);
  });
});

describe('canonicalNodesOf', () => {
  it('returns each distinct node once, sorted', () => {
    const canonical = new Map([
      ['b', 'a'],
      ['a', 'a'],
      ['z', 'z'],
    ]);
    expect(canonicalNodesOf(canonical)).toEqual(['a', 'z']);
  });
});

describe('buildNetlist', () => {
  it('sorts elements by id and resolves both terminal nodes', () => {
    const netlist = buildNetlist(wireChainLayout());
    expect(isNetlist(netlist)).toBe(true);
    if (!isNetlist(netlist)) {
      return;
    }

    expect(netlist.elements.map((entry) => entry.element.id)).toEqual([
      'bat',
      'led',
      'w1',
      'w2',
      'w3',
    ]);
    expect(netlist.canonicalNodes).toHaveLength(2);
    const battery = netlist.elements.find((entry) => entry.element.id === 'bat');
    expect(battery?.nodeA).not.toBe(battery?.nodeB);
  });

  it('reports an unresolved terminal reference instead of a netlist', () => {
    const wire = createElement('wire', { id: 'w' });
    const outcome = buildNetlist(createLayout([wire], [connectTerminals('w:0', 'ghost')], GRID));

    expect(isNetlist(outcome)).toBe(false);
    if (isNetlist(outcome)) {
      return;
    }
    expect(outcome.map((issue) => issue.code)).toEqual(['UNRESOLVED_TERMINAL_REF']);
  });
});
