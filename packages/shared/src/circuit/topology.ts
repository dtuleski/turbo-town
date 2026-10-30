/**
 * Topology resolver (component A2).
 *
 * Derives the electrical graph from the netlist: ideal conductors collapse into a single
 * node, a closed switch is a conductor, an open switch is an absent edge.
 *
 * Two views come out of this stage, deliberately:
 *
 *   - the merged canonical-node graph the solver stamps, where ideal conductors no longer
 *     exist as elements
 *   - the conduction graph over raw terminal ids, where they still do, so A4 can name the
 *     wire that shorted the circuit and C3 can put a spark on it
 *
 * `Environment` is consumed here rather than in the solver so the graph is a complete
 * electrical description with one source of truth for each element's resistance and voltage.
 *
 * Satisfies FR-CB-8, FR-CB-10, FR-CB-11, FR-CB-12.
 */

import {
  DEFAULT_RESISTOR_RESISTANCE,
  ELEMENT_SPECS,
  MAX_LIGHT_LEVEL,
  MAX_RESISTANCE,
  MAX_SOURCE_VOLTAGE,
  MIN_LIGHT_LEVEL,
  MIN_RESISTANCE,
  MIN_SOURCE_VOLTAGE,
  SOLAR_MAX_VOLTAGE,
} from './constants';
import { canonicalNodesOf, compareIds, resolveNodeIdentity } from './netlist';
import type {
  CircuitElement,
  ConductionEdge,
  ConductionGraph,
  ElectricalGraph,
  ElementId,
  Environment,
  GraphEdge,
  Netlist,
  NodeId,
  ResistancePath,
  SwitchState,
  SwitchStates,
} from './types';

function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) {
    return low;
  }
  return Math.min(Math.max(value, low), high);
}

/**
 * State of one switch. A switch with no entry reads as open, so an incomplete switch map
 * de-energizes rather than energizes (SECURITY-15 fail closed).
 */
export function switchStateOf(switches: SwitchStates, elementId: ElementId): SwitchState {
  const raw = switches as unknown;
  if (typeof raw !== 'object' || raw === null) {
    return 'open';
  }
  if (!Object.prototype.hasOwnProperty.call(raw, elementId)) {
    return 'open';
  }
  return (raw as Record<string, unknown>)[elementId] === 'closed' ? 'closed' : 'open';
}

/** Resistance of a non-source element in ohms. */
export function resistanceOf(element: CircuitElement): number {
  const spec = ELEMENT_SPECS[element.kind];
  if (spec.resistance !== undefined) {
    return spec.resistance;
  }
  const declared = element.params?.resistance;
  if (declared === undefined) {
    return DEFAULT_RESISTOR_RESISTANCE;
  }
  return clamp(declared, MIN_RESISTANCE, MAX_RESISTANCE);
}

/**
 * Internal resistance of a source in ohms.
 *
 * `params.internalResistance` overrides the kind's default, which lets content model a fresh
 * cell against a worn one. Zero is legal and makes the source ideal; an ideal source across a
 * zero-ohm path then has no solution, which the solver reports as singular rather than
 * inventing a number.
 */
export function internalResistanceOf(element: CircuitElement): number {
  const declared = element.params?.internalResistance;
  if (declared !== undefined) {
    return clamp(declared, 0, MAX_RESISTANCE);
  }
  return ELEMENT_SPECS[element.kind].internalResistance ?? 0;
}

/** Open-circuit voltage of a source in volts, positive at `terminals[0]`. */
export function sourceVoltageOf(element: CircuitElement, env: Environment): number {
  if (element.kind === 'battery') {
    return clamp(env.sourceVoltage, MIN_SOURCE_VOLTAGE, MAX_SOURCE_VOLTAGE);
  }
  if (element.kind === 'solar') {
    return SOLAR_MAX_VOLTAGE * clamp(env.lightLevel, MIN_LIGHT_LEVEL, MAX_LIGHT_LEVEL);
  }
  return 0;
}

function conductionEdgeFor(
  element: CircuitElement,
  switches: SwitchStates
): ConductionEdge | undefined {
  const spec = ELEMENT_SPECS[element.kind];
  if (element.kind === 'switch' && switchStateOf(switches, element.id) === 'open') {
    return undefined;
  }
  const resistance = spec.isSource
    ? internalResistanceOf(element)
    : spec.isConductor
      ? 0
      : resistanceOf(element);
  return {
    elementId: element.id,
    kind: element.kind,
    from: element.terminals[0],
    to: element.terminals[1],
    resistance,
  };
}

function buildConductionGraph(netlist: Netlist, switches: SwitchStates): ConductionGraph {
  const nodes = new Set<NodeId>();
  for (const entry of netlist.elements) {
    nodes.add(entry.element.terminals[0]);
    nodes.add(entry.element.terminals[1]);
  }

  const edges: ConductionEdge[] = [];
  for (const connection of [...netlist.layout.connections].sort((a, b) => compareIds(a.id, b.id))) {
    edges.push({ from: connection.from, to: connection.to, resistance: 0 });
  }
  for (const entry of netlist.elements) {
    const edge = conductionEdgeFor(entry.element, switches);
    if (edge !== undefined) {
      edges.push(edge);
    }
  }

  const adjacency = new Map<NodeId, ConductionEdge[]>();
  const sortedNodes = Array.from(nodes).sort(compareIds);
  for (const node of sortedNodes) {
    adjacency.set(node, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.from)?.push(edge);
    adjacency.get(edge.to)?.push(edge);
  }

  return { nodes: sortedNodes, adjacency };
}

/**
 * How an element participates in the merged graph: collapsed into one node, absent entirely,
 * or carried as its own edge.
 */
function conductorRoleOf(
  element: CircuitElement,
  switches: SwitchStates
): 'merged' | 'open' | 'edge' {
  if (element.kind === 'switch') {
    return switchStateOf(switches, element.id) === 'closed' ? 'merged' : 'open';
  }
  return ELEMENT_SPECS[element.kind].isConductor ? 'merged' : 'edge';
}

function graphEdgeFor(
  element: CircuitElement,
  canonical: ReadonlyMap<NodeId, NodeId>,
  env: Environment
): GraphEdge {
  const spec = ELEMENT_SPECS[element.kind];
  return {
    elementId: element.id,
    kind: element.kind,
    from: canonical.get(element.terminals[0]) ?? element.terminals[0],
    to: canonical.get(element.terminals[1]) ?? element.terminals[1],
    resistance: spec.isSource ? internalResistanceOf(element) : resistanceOf(element),
    sourceVoltage: spec.isSource ? sourceVoltageOf(element, env) : 0,
  };
}

/**
 * Resolve the electrical graph for a netlist under the given switch states and environment.
 */
export function resolveTopology(
  netlist: Netlist,
  switches: SwitchStates,
  env: Environment
): ElectricalGraph {
  const canonical = resolveNodeIdentity(
    netlist.layout,
    (element) =>
      element.kind === 'wire' ||
      (element.kind === 'switch' && switchStateOf(switches, element.id) === 'closed')
  );
  const nodes = canonicalNodesOf(canonical);
  const indexOf = new Map<NodeId, number>();
  nodes.forEach((node, index) => indexOf.set(node, index));

  const edges: GraphEdge[] = [];
  const openSwitchIds: ElementId[] = [];
  const mergedConductorIds: ElementId[] = [];

  for (const entry of netlist.elements) {
    const element = entry.element;
    const role = conductorRoleOf(element, switches);
    if (role === 'merged') {
      mergedConductorIds.push(element.id);
    } else if (role === 'open') {
      openSwitchIds.push(element.id);
    } else {
      edges.push(graphEdgeFor(element, canonical, env));
    }
  }

  return {
    nodes,
    indexOf,
    edges,
    sources: edges.filter((edge) => ELEMENT_SPECS[edge.kind].isSource),
    openSwitchIds,
    mergedConductorIds,
    canonicalByTerminal: canonical,
    conduction: buildConductionGraph(netlist, switches),
    netlist,
  };
}

/**
 * Group canonical nodes into electrically connected sets, so isolated sub-circuits are
 * identified. Each set is sorted, and the sets are ordered by their first member.
 */
export function findConnectedComponents(graph: ElectricalGraph): NodeId[][] {
  const adjacency = new Map<NodeId, NodeId[]>();
  for (const node of graph.nodes) {
    adjacency.set(node, []);
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }

  const seen = new Set<NodeId>();
  const components: NodeId[][] = [];
  for (const start of graph.nodes) {
    if (seen.has(start)) {
      continue;
    }
    const component: NodeId[] = [];
    const queue: NodeId[] = [start];
    seen.add(start);
    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined) {
        break;
      }
      component.push(node);
      for (const neighbour of adjacency.get(node) ?? []) {
        if (!seen.has(neighbour)) {
          seen.add(neighbour);
          queue.push(neighbour);
        }
      }
    }
    components.push(component.sort(compareIds));
  }
  return components;
}

function elementById(netlist: Netlist, elementId: ElementId): CircuitElement | undefined {
  for (const entry of netlist.elements) {
    if (entry.element.id === elementId) {
      return entry.element;
    }
  }
  return undefined;
}

/**
 * Whether a conductive path exists between a source's terminals, excluding the source itself.
 * This is A2's topological question and nothing more.
 *
 * The stronger FR-CB-10 condition - a closed path *through at least one valid load* - is not
 * answerable by graph reachability. A walk may enter a dead-end load and reverse back out,
 * which traverses a load edge but carries no current, so any "has a load been seen" search
 * over-reports. A5 therefore derives `closedPathExists` from the solved element currents,
 * where a load that carries current is the exact condition rather than an approximation of it.
 */
export function hasClosedPath(graph: ElectricalGraph, sourceElementId: ElementId): boolean {
  const source = elementById(graph.netlist, sourceElementId);
  if (source === undefined) {
    return false;
  }
  const [start, goal] = source.terminals;

  const visited = new Set<NodeId>([start]);
  const queue: NodeId[] = [start];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) {
      break;
    }
    if (node === goal) {
      return true;
    }
    for (const edge of graph.conduction.adjacency.get(node) ?? []) {
      if (edge.elementId === sourceElementId) {
        continue;
      }
      const next = edge.from === node ? edge.to : edge.from;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

/**
 * Lowest total resistance route between two raw terminals, by Dijkstra over the conduction
 * graph. Returns `undefined` when no route exists.
 *
 * The unsettled node with the lowest distance is chosen by scanning `nodes`, which is sorted,
 * and comparing strictly, so ties resolve to the smallest node id and the chosen route never
 * depends on input ordering.
 */
interface PathStep {
  readonly node: NodeId;
  readonly elementId?: ElementId;
}

/** Unsettled node with the lowest known distance, ties resolved to the smallest node id. */
function selectNearest(
  graph: ConductionGraph,
  distance: ReadonlyMap<NodeId, number>,
  settled: ReadonlySet<NodeId>
): NodeId | undefined {
  let nearest: NodeId | undefined;
  let best = Number.POSITIVE_INFINITY;
  for (const node of graph.nodes) {
    const known = settled.has(node) ? undefined : distance.get(node);
    if (known !== undefined && known < best) {
      best = known;
      nearest = node;
    }
  }
  return nearest;
}

function relaxFrom(
  graph: ConductionGraph,
  current: NodeId,
  currentDistance: number,
  distance: Map<NodeId, number>,
  previous: Map<NodeId, PathStep>,
  settled: ReadonlySet<NodeId>,
  excludedElementIds?: ReadonlySet<ElementId>
): void {
  for (const edge of graph.adjacency.get(current) ?? []) {
    const excluded =
      edge.elementId !== undefined && excludedElementIds?.has(edge.elementId) === true;
    const neighbour = edge.from === current ? edge.to : edge.from;
    if (excluded || settled.has(neighbour)) {
      continue;
    }
    const candidate = currentDistance + edge.resistance;
    const known = distance.get(neighbour);
    if (known === undefined || candidate < known) {
      distance.set(neighbour, candidate);
      previous.set(neighbour, { node: current, elementId: edge.elementId });
    }
  }
}

/** Element ids on the route, walked back from `to`. Connections contribute none. */
function reconstructPath(
  previous: ReadonlyMap<NodeId, PathStep>,
  from: NodeId,
  to: NodeId
): ElementId[] {
  const traversed: ElementId[] = [];
  let cursor = to;
  while (cursor !== from) {
    const step = previous.get(cursor);
    if (step === undefined) {
      break;
    }
    if (step.elementId !== undefined) {
      traversed.push(step.elementId);
    }
    cursor = step.node;
  }
  return traversed.sort(compareIds);
}

export function minimumResistancePath(
  graph: ConductionGraph,
  from: NodeId,
  to: NodeId,
  excludedElementIds?: ReadonlySet<ElementId>
): ResistancePath | undefined {
  if (!graph.adjacency.has(from) || !graph.adjacency.has(to)) {
    return undefined;
  }
  const distance = new Map<NodeId, number>([[from, 0]]);
  const previous = new Map<NodeId, PathStep>();
  const settled = new Set<NodeId>();

  for (;;) {
    const current = selectNearest(graph, distance, settled);
    if (current === undefined || current === to) {
      break;
    }
    settled.add(current);
    relaxFrom(
      graph,
      current,
      distance.get(current) ?? 0,
      distance,
      previous,
      settled,
      excludedElementIds
    );
  }

  const total = distance.get(to);
  if (total === undefined) {
    return undefined;
  }
  return { resistance: total, elementIds: reconstructPath(previous, from, to) };
}
