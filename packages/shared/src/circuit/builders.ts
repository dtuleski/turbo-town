/**
 * Layout construction helpers.
 *
 * A real part of the public surface: U3 builds `prePlaced` arrays with these and U4 authors
 * level data with them. They double as the engine's test fixtures, which is why they live
 * beside the engine rather than under `__tests__/`, where this package's jest `testMatch`
 * would try to run a helper file as a suite.
 *
 * Every id these produce is derived from its inputs, so a layout built twice from the same
 * arguments is identical. Nothing here consults a clock or a random source.
 */

import type {
  CircuitElement,
  CircuitLayout,
  Connection,
  ElementId,
  ElementKind,
  GridPosition,
  GridSize,
  NodeId,
  SwitchState,
  SwitchStates,
} from './types';

export interface CreateElementOptions {
  id: ElementId;
  /** Defaults to the grid origin, unrotated. Placement is presentation metadata only. */
  position?: GridPosition;
  params?: Readonly<Record<string, number>>;
  /** Defaults to `<id>:0` and `<id>:1`. */
  terminals?: readonly [NodeId, NodeId];
}

/** Build one element with deterministic terminal ids. */
export function createElement(kind: ElementKind, options: CreateElementOptions): CircuitElement {
  const { id, position, params, terminals } = options;
  const element: CircuitElement = {
    id,
    kind,
    terminals: terminals ?? [`${id}:0`, `${id}:1`],
    position: position ?? { col: 0, row: 0, rotation: 0 },
  };
  return params === undefined ? element : { ...element, params };
}

export function terminalOf(element: CircuitElement, index: 0 | 1): NodeId {
  return element.terminals[index];
}

/** Join two terminals. The default id is derived from the endpoints so it is reproducible. */
export function connectTerminals(from: NodeId, to: NodeId, id?: string): Connection {
  return { id: id ?? `${from}~${to}`, from, to };
}

export function createLayout(
  elements: readonly CircuitElement[],
  connections: readonly Connection[],
  gridSize: GridSize
): CircuitLayout {
  return { elements, connections, gridSize };
}

/**
 * Wire elements end to end: terminal 1 of each element joins terminal 0 of the next. The
 * free ends are `elements[0].terminals[0]` and the last element's `terminals[1]`.
 */
export function seriesChain(elements: readonly CircuitElement[]): Connection[] {
  const connections: Connection[] = [];
  for (let index = 0; index + 1 < elements.length; index += 1) {
    const current = elements[index];
    const next = elements[index + 1];
    if (current === undefined || next === undefined) {
      continue;
    }
    connections.push(connectTerminals(terminalOf(current, 1), terminalOf(next, 0)));
  }
  return connections;
}

/**
 * Wire each branch as its own series chain, then tie every chain's head to `positive` and
 * every chain's tail to `negative`. An empty branch is skipped rather than shorting the rails.
 */
export function parallelBranches(
  positive: NodeId,
  negative: NodeId,
  branches: readonly (readonly CircuitElement[])[]
): Connection[] {
  const connections: Connection[] = [];
  for (const branch of branches) {
    const head = branch[0];
    const tail = branch[branch.length - 1];
    if (head === undefined || tail === undefined) {
      continue;
    }
    connections.push(...seriesChain(branch));
    connections.push(connectTerminals(positive, terminalOf(head, 0)));
    connections.push(connectTerminals(terminalOf(tail, 1), negative));
  }
  return connections;
}

/** Every switch in the layout set to one state. Elements of other kinds are omitted. */
export function defaultSwitchStates(
  layout: CircuitLayout,
  state: SwitchState = 'closed'
): SwitchStates {
  const states: Record<string, SwitchState> = {};
  for (const element of layout.elements) {
    if (element.kind === 'switch') {
      states[element.id] = state;
    }
  }
  return states;
}
