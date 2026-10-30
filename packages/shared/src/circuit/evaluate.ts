/**
 * Evaluation facade (component A5).
 *
 * The only engine symbol other packages import. Keeping the surface narrow protects the
 * shared contract from drift as the internals change, and means `services/game` and
 * `apps/web` provably run the identical evaluator (FR-CB-16, FR-CB-21).
 *
 * Pure, deterministic, and stateless: no module-level mutable state, no clock, no random
 * source, no browser or Node API. Identical input always produces a deep-equal result
 * (FR-CB-15).
 *
 * The whole body is wrapped so an unexpected internal failure becomes a typed error outcome
 * rather than a thrown exception. Nothing from a caught value is copied into the result - no
 * message, no stack - so a malformed payload can never echo internal detail back to a player
 * (SECURITY-09, SECURITY-15).
 */

import { CURRENT_EPSILON, ELEMENT_SPECS } from './constants';
import { buildNetlist, compareIds, isNetlist } from './netlist';
import {
  buildConductanceMatrix,
  deriveElementResults,
  nodeVoltagesOf,
  solveLinearSystem,
  summarize,
} from './solver';
import { detectFaults } from './faults';
import { resolveTopology } from './topology';
import { validateStructure } from './validation';
import type {
  CircuitLayout,
  CircuitResult,
  ElectricalGraph,
  ElementResult,
  Environment,
  EvaluationError,
  EvaluationErrorCode,
  EvaluationOutcome,
  Fault,
  NodeId,
  StructuralIssue,
  SwitchStates,
} from './types';

const LIMIT_CODES = new Set(['ELEMENT_COUNT_EXCEEDED', 'CONNECTION_COUNT_EXCEEDED', 'ID_TOO_LONG']);

function classify(issues: readonly StructuralIssue[]): EvaluationErrorCode {
  if (issues.some((issue) => issue.code === 'MALFORMED_PAYLOAD')) {
    return 'MALFORMED_INPUT';
  }
  if (issues.some((issue) => LIMIT_CODES.has(issue.code))) {
    return 'LIMIT_EXCEEDED';
  }
  return 'STRUCTURAL_INVALID';
}

function failure(errorCode: EvaluationErrorCode, issues: readonly StructuralIssue[]): EvaluationError {
  return Object.freeze({ errorCode, issues: Object.freeze([...issues]) });
}

function freezeResult(result: CircuitResult): CircuitResult {
  result.elements.forEach((element) => Object.freeze(element));
  result.faults.forEach((fault) => {
    Object.freeze(fault.elementIds);
    Object.freeze(fault.atPosition);
    Object.freeze(fault);
  });
  Object.freeze(result.elements);
  Object.freeze(result.faults);
  Object.freeze(result.nodeVoltages);
  return Object.freeze(result);
}

function zeroedResults(graph: ElectricalGraph): ElementResult[] {
  return graph.netlist.elements
    .map((entry) => ({
      elementId: entry.element.id,
      kind: entry.element.kind,
      current: 0,
      voltageDrop: 0,
      energized: false,
      intensity: 0,
    }))
    .sort((left, right) => compareIds(left.elementId, right.elementId));
}

function zeroedVoltages(graph: ElectricalGraph): Record<NodeId, number> {
  const voltages: Record<NodeId, number> = {};
  for (const node of graph.nodes) {
    voltages[node] = 0;
  }
  return voltages;
}

/**
 * FR-CB-10: a closed conductive path from the positive to the negative terminal through at
 * least one valid load.
 *
 * Read off the solved currents rather than searched for in the graph, because carrying
 * current is the condition itself. A load on a dead-end branch, or a load starved by a
 * parallel short, is topologically on a path and electrically doing nothing; only the solve
 * can tell those apart.
 */
function closedPathThroughLoad(elements: readonly ElementResult[]): boolean {
  return elements.some(
    (entry) => ELEMENT_SPECS[entry.kind].isLoad && Math.abs(entry.current) > CURRENT_EPSILON
  );
}

function assemble(
  elements: readonly ElementResult[],
  nodeVoltages: Record<NodeId, number>,
  faults: readonly Fault[],
  totals: { totalResistance: number; totalCurrent: number }
): CircuitResult {
  return freezeResult({
    nodeVoltages,
    elements,
    faults,
    closedPathExists: closedPathThroughLoad(elements),
    totalResistance: totals.totalResistance,
    totalCurrent: totals.totalCurrent,
  });
}

/**
 * Evaluate a circuit.
 *
 * A singular system is not an error: the result carries zeroed element values and a
 * `SINGULAR_SYSTEM` fault, so the browser can still show the player what went wrong.
 *
 * The engine reports the fault and the true computed currents together; it never zeroes a
 * shorted circuit's numbers. Blowing the fuse and de-energizing the canvas (FR-CB-17) is C5's
 * reducer state, deliberately outside the pure engine so the server can re-evaluate the same
 * layout without inheriting a browser-side fuse flag.
 */
export function evaluate(
  layout: CircuitLayout,
  switches: SwitchStates,
  env: Environment
): EvaluationOutcome {
  try {
    const validation = validateStructure(layout, switches, env);
    if (!validation.valid) {
      return failure(classify(validation.issues), validation.issues);
    }

    const netlist = buildNetlist(layout);
    if (!isNetlist(netlist)) {
      return failure('STRUCTURAL_INVALID', netlist);
    }

    const graph = resolveTopology(netlist, switches, env);
    const system = buildConductanceMatrix(graph);
    const solution = solveLinearSystem(system);

    if (solution.singular) {
      const elements = zeroedResults(graph);
      return assemble(elements, zeroedVoltages(graph), detectFaults({ elements }, graph, true), {
        totalResistance: 0,
        totalCurrent: 0,
      });
    }

    const elements = deriveElementResults(system, solution, graph);
    return assemble(
      elements,
      nodeVoltagesOf(system, solution, graph),
      detectFaults({ elements }, graph, false),
      summarize(graph, elements)
    );
  } catch {
    return failure('INTERNAL_ERROR', []);
  }
}
