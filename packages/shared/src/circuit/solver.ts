/**
 * Nodal solver (component A3).
 *
 * Modified Nodal Analysis, chosen over series/parallel reduction because reduction cannot
 * solve a bridge topology and free grid placement produces bridges. A voltage source becomes
 * an extra unknown carrying its branch current, which is what the "modified" refers to.
 *
 * One node is grounded per connected component rather than one for the whole circuit.
 * Grounding only the first component would leave every other component's voltages
 * undetermined and make an innocuous floating sub-circuit report as singular.
 *
 * Satisfies FR-CB-9 and FR-CB-13.
 */

import {
  CURRENT_EPSILON,
  ELEMENT_SPECS,
  ENERGIZE_THRESHOLD_RATIO,
  INTENSITY_GAMMA,
  INTERNAL_NODE_PREFIX,
  MAX_MATRIX_DIMENSION,
  MIN_VISIBLE_INTENSITY,
} from './constants';
import { Matrix, readVector, solveGaussian } from './matrix';
import { compareIds } from './netlist';
import { findConnectedComponents } from './topology';
import type {
  CircuitElement,
  ElectricalGraph,
  ElementId,
  ElementResult,
  ElementSpec,
  GraphEdge,
  LinearSystem,
  NodeId,
  SolutionVector,
  SolveOutcome,
} from './types';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 1);
}

function internalNodeId(elementId: ElementId): NodeId {
  return `${INTERNAL_NODE_PREFIX}${elementId}`;
}

/** Grounded node of each connected component: the smallest canonical id it contains. */
function selectReferenceNodes(graph: ElectricalGraph): NodeId[] {
  const references: NodeId[] = [];
  for (const component of findConnectedComponents(graph)) {
    const first = component[0];
    if (first !== undefined) {
      references.push(first);
    }
  }
  return references.sort(compareIds);
}

function stampConductance(
  matrix: Matrix,
  nodeIndex: ReadonlyMap<NodeId, number>,
  a: NodeId,
  b: NodeId,
  conductance: number
): void {
  const indexA = nodeIndex.get(a);
  const indexB = nodeIndex.get(b);
  if (indexA !== undefined) {
    matrix.add(indexA, indexA, conductance);
  }
  if (indexB !== undefined) {
    matrix.add(indexB, indexB, conductance);
  }
  if (indexA !== undefined && indexB !== undefined) {
    matrix.add(indexA, indexB, -conductance);
    matrix.add(indexB, indexA, -conductance);
  }
}

/**
 * Stamp a source as an ideal voltage source in series with its internal resistance.
 *
 * With a non-zero internal resistance the ideal branch runs from `terminals[0]` to a private
 * internal node and the resistance bridges that node to `terminals[1]`. With a zero internal
 * resistance the branch spans the terminals directly, which is the pure ideal source the
 * unbalanced-bridge case needs.
 */
function stampSource(
  matrix: Matrix,
  rhs: Float64Array,
  nodeIndex: ReadonlyMap<NodeId, number>,
  edge: GraphEdge,
  branchIndex: number,
  internalNode: NodeId | undefined
): void {
  const positive = edge.from;
  const negative = internalNode ?? edge.to;
  const indexPositive = nodeIndex.get(positive);
  const indexNegative = nodeIndex.get(negative);

  if (indexPositive !== undefined) {
    matrix.add(indexPositive, branchIndex, 1);
    matrix.add(branchIndex, indexPositive, 1);
  }
  if (indexNegative !== undefined) {
    matrix.add(indexNegative, branchIndex, -1);
    matrix.add(branchIndex, indexNegative, -1);
  }
  rhs[branchIndex] = edge.sourceVoltage;

  if (internalNode !== undefined) {
    stampConductance(matrix, nodeIndex, internalNode, edge.to, 1 / edge.resistance);
  }
}

/**
 * Build the Modified Nodal Analysis system for a resolved graph.
 *
 * Elements are stamped in sorted-element-id order, so the order floating point contributions
 * accumulate in depends on the circuit's contents and not on the order the input arrays
 * arrived in. That is what makes two equal circuits produce bitwise-identical results.
 */
/** Private internal node per source that has a non-zero internal resistance. */
function internalNodesOf(graph: ElectricalGraph): Map<ElementId, NodeId> {
  const internalNodeOf = new Map<ElementId, NodeId>();
  for (const source of graph.sources) {
    if (source.resistance > 0) {
      internalNodeOf.set(source.elementId, internalNodeId(source.elementId));
    }
  }
  return internalNodeOf;
}

/** Unknown index per ungrounded node, assigned in sorted node order. */
function assignNodeIndices(
  graph: ElectricalGraph,
  internalNodeOf: ReadonlyMap<ElementId, NodeId>,
  grounded: ReadonlySet<NodeId>
): Map<NodeId, number> {
  const solverNodes = [...graph.nodes, ...internalNodeOf.values()].sort(compareIds);
  const nodeIndex = new Map<NodeId, number>();
  for (const node of solverNodes) {
    if (!grounded.has(node)) {
      nodeIndex.set(node, nodeIndex.size);
    }
  }
  return nodeIndex;
}

export function buildConductanceMatrix(graph: ElectricalGraph): LinearSystem {
  const referenceNodes = selectReferenceNodes(graph);
  const internalNodeOf = internalNodesOf(graph);
  const nodeIndex = assignNodeIndices(graph, internalNodeOf, new Set(referenceNodes));

  const sortedSources = [...graph.sources].sort((a, b) => compareIds(a.elementId, b.elementId));
  const sourceBranchIndex = new Map<ElementId, number>();
  for (const source of sortedSources) {
    sourceBranchIndex.set(source.elementId, nodeIndex.size + sourceBranchIndex.size);
  }

  const dimension = nodeIndex.size + sourceBranchIndex.size;
  if (dimension > MAX_MATRIX_DIMENSION) {
    throw new RangeError('circuit exceeds the maximum supported matrix dimension');
  }

  const matrix = new Matrix(dimension);
  const rhs = new Float64Array(dimension);

  for (const edge of graph.edges) {
    if (!ELEMENT_SPECS[edge.kind].isSource && edge.resistance > 0) {
      stampConductance(matrix, nodeIndex, edge.from, edge.to, 1 / edge.resistance);
    }
  }
  for (const source of sortedSources) {
    const branchIndex = sourceBranchIndex.get(source.elementId);
    if (branchIndex !== undefined) {
      stampSource(
        matrix,
        rhs,
        nodeIndex,
        source,
        branchIndex,
        internalNodeOf.get(source.elementId)
      );
    }
  }

  return { dimension, matrix, rhs, nodeIndex, referenceNodes, sourceBranchIndex, internalNodeOf };
}

export function solveLinearSystem(system: LinearSystem): SolveOutcome {
  return solveGaussian(system.matrix, system.rhs);
}

function voltageAt(system: LinearSystem, solution: SolutionVector, node: NodeId): number {
  const index = system.nodeIndex.get(node);
  return index === undefined ? 0 : readVector(solution.values, index);
}

/** Canonical node voltages. Internal source nodes are an implementation detail and omitted. */
export function nodeVoltagesOf(
  system: LinearSystem,
  solution: SolutionVector,
  graph: ElectricalGraph
): Record<NodeId, number> {
  const voltages: Record<NodeId, number> = {};
  for (const node of graph.nodes) {
    voltages[node] = voltageAt(system, solution, node);
  }
  return voltages;
}

/**
 * Energization and brightness for a load, from its current relative to its rating.
 *
 * The curve is `MIN_VISIBLE_INTENSITY + (1 - MIN_VISIBLE_INTENSITY) * ratio ** (1 / gamma)`.
 * A linear mapping would make two identical bulbs in series look nearly as bright as the same
 * two in parallel once the source's internal resistance is accounted for; the gamma curve
 * widens that gap into something a player can actually see, which is what FR-CB-13 asks for.
 */
export function presentationOf(
  spec: ElementSpec,
  current: number
): { energized: boolean; intensity: number } {
  const rated = spec.ratedCurrent;
  if (rated === undefined || rated <= 0) {
    return { energized: Math.abs(current) > CURRENT_EPSILON, intensity: 0 };
  }
  if (spec.polarized && current < -CURRENT_EPSILON) {
    return { energized: false, intensity: 0 };
  }
  const ratio = Math.abs(current) / rated;
  if (ratio < ENERGIZE_THRESHOLD_RATIO) {
    return { energized: false, intensity: 0 };
  }
  const curved = MIN_VISIBLE_INTENSITY + (1 - MIN_VISIBLE_INTENSITY) * ratio ** (1 / INTENSITY_GAMMA);
  return { energized: true, intensity: clamp01(curved) };
}

function sourceCurrents(
  system: LinearSystem,
  solution: SolutionVector,
  graph: ElectricalGraph
): Map<ElementId, number> {
  const currents = new Map<ElementId, number>();
  for (const source of graph.sources) {
    const branchIndex = system.sourceBranchIndex.get(source.elementId);
    currents.set(
      source.elementId,
      branchIndex === undefined ? 0 : readVector(solution.values, branchIndex)
    );
  }
  return currents;
}

/**
 * Canonical nodes that sit in a component where some source is actually delivering current.
 *
 * An ideal conductor has no individually determined current - two parallel wires split it
 * arbitrarily - so a wire reports zero current and zero voltage drop, both of which are true
 * under the model. Its `energized` flag comes from this set instead, which is what C1 needs
 * to draw a glowing trace along a live path (FR-CB-20, NFR-CB-9).
 */
function energizedNodes(
  graph: ElectricalGraph,
  currents: ReadonlyMap<ElementId, number>
): Set<NodeId> {
  const live = new Set<NodeId>();
  for (const component of findConnectedComponents(graph)) {
    const members = new Set(component);
    const delivering = graph.sources.some(
      (source) =>
        members.has(source.from) && Math.abs(currents.get(source.elementId) ?? 0) > CURRENT_EPSILON
    );
    if (delivering) {
      for (const node of component) {
        live.add(node);
      }
    }
  }
  return live;
}

/**
 * Per-element current, voltage drop, energization, and brightness, sorted by element id.
 *
 * Current is signed: positive means it enters `terminals[0]` and leaves `terminals[1]`. A
 * battery that is delivering power therefore reports a negative current, because conventional
 * current leaves its positive terminal into the circuit.
 */
function inertResult(element: CircuitElement, energized: boolean): ElementResult {
  return {
    elementId: element.id,
    kind: element.kind,
    current: 0,
    voltageDrop: 0,
    energized,
    intensity: 0,
  };
}

function edgeResult(
  element: CircuitElement,
  edge: GraphEdge,
  system: LinearSystem,
  solution: SolutionVector,
  sourceCurrent: number | undefined
): ElementResult {
  const spec = ELEMENT_SPECS[element.kind];
  const voltageDrop =
    voltageAt(system, solution, edge.from) - voltageAt(system, solution, edge.to);
  const current = spec.isSource
    ? (sourceCurrent ?? 0)
    : edge.resistance > 0
      ? voltageDrop / edge.resistance
      : 0;
  const presentation = presentationOf(spec, current);
  return {
    elementId: element.id,
    kind: element.kind,
    current,
    voltageDrop,
    energized: presentation.energized,
    intensity: presentation.intensity,
  };
}

export function deriveElementResults(
  system: LinearSystem,
  solution: SolutionVector,
  graph: ElectricalGraph
): ElementResult[] {
  const currents = sourceCurrents(system, solution, graph);
  const live = energizedNodes(graph, currents);
  const edgeByElement = new Map<ElementId, GraphEdge>();
  for (const edge of graph.edges) {
    edgeByElement.set(edge.elementId, edge);
  }
  const openSwitches = new Set(graph.openSwitchIds);

  const results = graph.netlist.elements.map((entry) => {
    const element = entry.element;
    const edge = edgeByElement.get(element.id);
    if (edge === undefined) {
      const canonical =
        graph.canonicalByTerminal.get(element.terminals[0]) ?? element.terminals[0];
      const conducting = ELEMENT_SPECS[element.kind].isConductor && !openSwitches.has(element.id);
      return inertResult(element, conducting && live.has(canonical));
    }
    return edgeResult(element, edge, system, solution, currents.get(element.id));
  });

  return results.sort((left, right) => compareIds(left.elementId, right.elementId));
}

export interface CircuitSummary {
  totalResistance: number;
  totalCurrent: number;
}

/**
 * Totals seen by the dominant source - the one carrying the largest current, ties broken by
 * the smallest element id.
 *
 * `totalResistance` is the equivalent external resistance, `|terminal voltage| / |current|`,
 * and is `0` rather than `Infinity` or `NaN` when no current flows, so the result stays
 * JSON-safe for the server round trip.
 */
export function summarize(
  graph: ElectricalGraph,
  results: readonly ElementResult[]
): CircuitSummary {
  const sourceIds = new Set(graph.sources.map((source) => source.elementId));
  let dominant: ElementResult | undefined;
  for (const result of results) {
    if (!sourceIds.has(result.elementId)) {
      continue;
    }
    if (dominant === undefined || Math.abs(result.current) > Math.abs(dominant.current)) {
      dominant = result;
    }
  }
  if (dominant === undefined) {
    return { totalResistance: 0, totalCurrent: 0 };
  }
  const magnitude = Math.abs(dominant.current);
  return {
    totalResistance: magnitude > CURRENT_EPSILON ? Math.abs(dominant.voltageDrop) / magnitude : 0,
    totalCurrent: magnitude,
  };
}
