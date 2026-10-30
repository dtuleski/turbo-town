/**
 * Fault detector (component A4).
 *
 * Fault codes are stable identifiers, never messages: copy lives in locale files so
 * NFR-CB-17 translation applies to the educational tooltips.
 *
 * Satisfies FR-CB-14, FR-CB-17, FR-CB-18.
 */

import { CURRENT_EPSILON, ELEMENT_SPECS, SHORT_CIRCUIT_RESISTANCE_THRESHOLD } from './constants';
import { compareIds } from './netlist';
import { minimumResistancePath } from './topology';
import type {
  CircuitLayout,
  CircuitResult,
  ElectricalGraph,
  ElementId,
  ElementResult,
  Fault,
  FaultCode,
  GridPosition,
} from './types';

/** Lower is more severe. Determines the order faults are reported in. */
const SEVERITY: Readonly<Record<FaultCode, number>> = Object.freeze({
  SHORT_CIRCUIT: 0,
  SINGULAR_SYSTEM: 1,
  OVERCURRENT: 2,
  REVERSED_POLARITY: 3,
});

/**
 * Every source in the layout.
 *
 * All of them are excluded from the short-circuit path search, not just the source under
 * test. A source edge carries its internal resistance, so a route through a second battery
 * would otherwise cost 0.5 ohm and read as a short on two batteries wired to common rails -
 * a layout the solver simultaneously shows delivering normal load current. Another source is
 * not a conductor the player placed, so it is not part of what the threshold judges.
 */
function sourceElementIds(graph: ElectricalGraph): ReadonlySet<ElementId> {
  const ids = new Set<ElementId>();
  for (const entry of graph.netlist.elements) {
    if (ELEMENT_SPECS[entry.element.kind].isSource) {
      ids.add(entry.element.id);
    }
  }
  return ids;
}

/**
 * Whether a source's terminals are joined by a passive path whose resistance falls below the
 * short-circuit threshold.
 *
 * Source edges are excluded from the search, so the threshold judges what the player built
 * rather than the model's internal resistance.
 */
export function isShortCircuitPath(graph: ElectricalGraph, sourceElementId: ElementId): boolean {
  return shortCircuitPathElements(graph, sourceElementId, sourceElementIds(graph)) !== undefined;
}

function shortCircuitPathElements(
  graph: ElectricalGraph,
  sourceElementId: ElementId,
  excludedElementIds: ReadonlySet<ElementId>
): readonly ElementId[] | undefined {
  const source = graph.netlist.elements.find((entry) => entry.element.id === sourceElementId);
  if (source === undefined) {
    return undefined;
  }
  const path = minimumResistancePath(
    graph.conduction,
    source.element.terminals[0],
    source.element.terminals[1],
    excludedElementIds
  );
  if (path === undefined || path.resistance >= SHORT_CIRCUIT_RESISTANCE_THRESHOLD) {
    return undefined;
  }
  return path.elementIds;
}

/**
 * Whether a solved source is driving an external resistance below the short-circuit
 * threshold, measured as `|terminal voltage| / |current|`.
 *
 * This is the same threshold applied to the solved circuit rather than to a passive path,
 * and it is what still catches a genuine short whose only route runs through another source -
 * two batteries in series closed by nothing but wire, which the path search can no longer
 * see. The two rules disagree in exactly one direction: opposing sources on common rails
 * share a topological route but drive no current through it, so this test clears them.
 *
 * A source carrying no current is an open circuit, not a short, and avoiding the division is
 * also what keeps an `Infinity` out of the comparison.
 */
function isOverdrawn(result: ElementResult): boolean {
  const magnitude = Math.abs(result.current);
  if (magnitude <= CURRENT_EPSILON) {
    return false;
  }
  return Math.abs(result.voltageDrop) / magnitude < SHORT_CIRCUIT_RESISTANCE_THRESHOLD;
}

/**
 * Grid position for a fault, so C3 can place its spark effect (FR-CB-17).
 *
 * Resolves the first element id in the fault that exists in the layout. Fault element lists
 * are ordered so the offending element comes before the source it affects, which puts the
 * spark on the wire the player placed rather than on the battery.
 *
 * Returns a **copy** of the element's position. Handing back the layout's own object would
 * put a caller-owned value inside the result, which the facade then freezes - so evaluating
 * a circuit would silently freeze the layout it was given and break the next in-place drag
 * update.
 */
export function locateFaultPosition(fault: Fault, layout: CircuitLayout): GridPosition | undefined {
  for (const elementId of fault.elementIds) {
    const element = layout.elements.find((candidate) => candidate.id === elementId);
    if (element !== undefined) {
      return { ...element.position };
    }
  }
  return undefined;
}

function detectShortCircuits(graph: ElectricalGraph, results: readonly ElementResult[]): Fault[] {
  const excluded = sourceElementIds(graph);
  const resultsById = new Map(results.map((result) => [result.elementId, result]));
  const faults: Fault[] = [];
  for (const source of graph.sources) {
    const offending = shortCircuitPathElements(graph, source.elementId, excluded);
    if (offending !== undefined) {
      faults.push({ code: 'SHORT_CIRCUIT', elementIds: [...offending, source.elementId] });
      continue;
    }
    const solved = resultsById.get(source.elementId);
    if (solved !== undefined && isOverdrawn(solved)) {
      faults.push({ code: 'SHORT_CIRCUIT', elementIds: [source.elementId] });
    }
  }
  return faults;
}

function detectLoadFaults(results: readonly ElementResult[]): Fault[] {
  const faults: Fault[] = [];
  for (const result of results) {
    const spec = ELEMENT_SPECS[result.kind];
    const reversed = spec.polarized && result.current < -CURRENT_EPSILON;
    if (reversed) {
      faults.push({ code: 'REVERSED_POLARITY', elementIds: [result.elementId] });
      continue;
    }
    const rated = spec.ratedCurrent;
    if (rated !== undefined && Math.abs(result.current) > rated) {
      faults.push({ code: 'OVERCURRENT', elementIds: [result.elementId] });
    }
  }
  return faults;
}

function compareFaults(left: Fault, right: Fault): number {
  const bySeverity = SEVERITY[left.code] - SEVERITY[right.code];
  if (bySeverity !== 0) {
    return bySeverity;
  }
  return compareIds(left.elementIds[0] ?? '', right.elementIds[0] ?? '');
}

/**
 * Every fault condition present, ordered by severity and then by element id.
 *
 * A singular system is a fault rather than an error: an ideal source across a zero-ohm path
 * has no solution, and telling the player their circuit is impossible is more useful than
 * telling them the solver failed.
 *
 * The netlist that the approved signature lists as a third parameter is reachable through
 * `graph.netlist`, so it is not repeated here.
 *
 * A reverse-biased polarized load reports `REVERSED_POLARITY` only. Its overcurrent would be
 * an artifact of modelling the LED as a plain resistor, which a real diode would block, so
 * reporting both would put a misleading second tooltip on screen.
 */
export function detectFaults(
  partial: Partial<CircuitResult>,
  graph: ElectricalGraph,
  singular: boolean
): Fault[] {
  const solvedElements = singular ? [] : partial.elements ?? [];
  const faults: Fault[] = [...detectShortCircuits(graph, solvedElements)];

  if (singular) {
    faults.push({
      code: 'SINGULAR_SYSTEM',
      elementIds: graph.sources.map((source) => source.elementId).sort(compareIds),
    });
  } else {
    faults.push(...detectLoadFaults(solvedElements));
  }

  return faults.sort(compareFaults).map((fault) => {
    const position = locateFaultPosition(fault, graph.netlist.layout);
    return position === undefined ? fault : { ...fault, atPosition: position };
  });
}
