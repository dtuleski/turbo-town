/**
 * Circuit Builder engine - type definitions.
 *
 * Unit U2, components A1 (netlist), A2 (topology), A3 (nodal solver), A4 (fault detector),
 * A5 (evaluation facade), B1 (level model), B2 (success predicates), B3 (target machines).
 *
 * Every type here is platform-neutral: no browser, Node, or React API is referenced anywhere
 * in this module, satisfying FR-CB-15 and FR-CB-16.
 */

import type { Matrix } from './matrix';

// ---------------------------------------------------------------------------
// Identity and geometry
// ---------------------------------------------------------------------------

export type ElementId = string;

/** Identifier of a single element terminal, and after merging, of an electrical node. */
export type NodeId = string;

export type ElementKind =
  | 'battery'
  | 'solar'
  | 'wire'
  | 'switch'
  | 'resistor'
  | 'led'
  | 'motor'
  | 'buzzer';

export type Rotation = 0 | 90 | 180 | 270;

/**
 * Placement metadata. The engine carries this through so the browser can render and the
 * server can ignore it. Connectivity is NEVER inferred from these coordinates (FR-CB-4).
 */
export interface GridPosition {
  col: number;
  row: number;
  rotation: Rotation;
}

export interface GridSize {
  cols: number;
  rows: number;
}

// ---------------------------------------------------------------------------
// Layout - the engine input
// ---------------------------------------------------------------------------

export interface CircuitElement {
  id: ElementId;
  kind: ElementKind;
  /** `[0]` is the positive / forward-current entry terminal. Terminal ids are globally unique. */
  terminals: readonly [NodeId, NodeId];
  /** Opaque presentation metadata - see {@link GridPosition}. */
  position: GridPosition;
  params?: Readonly<Record<string, number>>;
}

export interface Connection {
  id: string;
  from: NodeId;
  to: NodeId;
}

export interface CircuitLayout {
  elements: readonly CircuitElement[];
  connections: readonly Connection[];
  gridSize: GridSize;
}

export type SwitchState = 'open' | 'closed';

export interface SwitchStates {
  readonly [elementId: string]: SwitchState;
}

export interface Environment {
  /** Battery terminal voltage in volts, within [MIN_SOURCE_VOLTAGE, MAX_SOURCE_VOLTAGE]. */
  sourceVoltage: number;
  /** Normalised illumination driving the solar panel, within [MIN_LIGHT_LEVEL, MAX_LIGHT_LEVEL]. */
  lightLevel: number;
}

// ---------------------------------------------------------------------------
// Structural validation (A1) - SECURITY-05 bounded input validation
// ---------------------------------------------------------------------------

export type StructuralIssueCode =
  | 'MALFORMED_PAYLOAD'
  | 'DUPLICATE_ELEMENT_ID'
  | 'DUPLICATE_CONNECTION_ID'
  | 'UNKNOWN_ELEMENT_KIND'
  | 'UNRESOLVED_TERMINAL_REF'
  | 'SELF_CONNECTION'
  | 'POSITION_OUT_OF_BOUNDS'
  | 'GRID_SIZE_OUT_OF_BOUNDS'
  | 'INVALID_ROTATION'
  | 'ELEMENT_COUNT_EXCEEDED'
  | 'CONNECTION_COUNT_EXCEEDED'
  | 'ID_TOO_LONG'
  | 'NON_FINITE_PARAM'
  | 'PARAM_OUT_OF_RANGE'
  | 'DUPLICATE_TERMINAL'
  | 'INVALID_SWITCH_STATE'
  | 'UNKNOWN_SWITCH_ELEMENT'
  | 'VOLTAGE_OUT_OF_RANGE'
  | 'LIGHT_LEVEL_OUT_OF_RANGE';

export interface StructuralIssue {
  code: StructuralIssueCode;
  elementId?: ElementId;
  connectionId?: string;
  /** Developer-facing, non-sensitive. Never a stack trace or a caught exception message. */
  detail?: string;
}

export interface StructuralValidation {
  valid: boolean;
  issues: readonly StructuralIssue[];
}

// ---------------------------------------------------------------------------
// Netlist (A1)
// ---------------------------------------------------------------------------

export interface NetlistElement {
  readonly element: CircuitElement;
  /** Canonical electrical node for `element.terminals[0]`. */
  readonly nodeA: NodeId;
  /** Canonical electrical node for `element.terminals[1]`. */
  readonly nodeB: NodeId;
}

export interface Netlist {
  /** Sorted by `element.id` so downstream float accumulation order is input-order independent. */
  readonly elements: readonly NetlistElement[];
  readonly canonicalByTerminal: ReadonlyMap<NodeId, NodeId>;
  /** Lexicographically sorted by code unit - never `localeCompare`. */
  readonly canonicalNodes: readonly NodeId[];
  readonly layout: CircuitLayout;
}

// ---------------------------------------------------------------------------
// Electrical graph (A2)
// ---------------------------------------------------------------------------

export interface GraphEdge {
  readonly elementId: ElementId;
  readonly kind: ElementKind;
  readonly from: NodeId;
  readonly to: NodeId;
  /** Ohms. For a source this is its internal resistance. */
  readonly resistance: number;
  /** Volts, positive at `from`. Zero for every non-source edge. */
  readonly sourceVoltage: number;
}

/**
 * One traversable step over raw, unmerged terminal ids. The conduction graph exists because
 * the solver's merged view deliberately erases ideal conductors, yet fault reporting has to
 * name the wire the player actually placed in order to put a spark on it.
 */
export interface ConductionEdge {
  /** Absent for a {@link Connection}, which carries no element. */
  readonly elementId?: ElementId;
  readonly kind?: ElementKind;
  readonly from: NodeId;
  readonly to: NodeId;
  readonly resistance: number;
}

export interface ConductionGraph {
  /** Sorted raw terminal ids. */
  readonly nodes: readonly NodeId[];
  readonly adjacency: ReadonlyMap<NodeId, readonly ConductionEdge[]>;
}

export interface ElectricalGraph {
  /** Sorted canonical node ids. */
  readonly nodes: readonly NodeId[];
  readonly indexOf: ReadonlyMap<NodeId, number>;
  /** Sorted by `elementId`. Merged conductors and open switches emit no edge. */
  readonly edges: readonly GraphEdge[];
  /** Subset of `edges` whose kind is a source. */
  readonly sources: readonly GraphEdge[];
  readonly openSwitchIds: readonly ElementId[];
  /** Element ids merged into a single node: wires and closed switches. */
  readonly mergedConductorIds: readonly ElementId[];
  /** Switch-aware terminal to canonical node mapping used by the solver. */
  readonly canonicalByTerminal: ReadonlyMap<NodeId, NodeId>;
  readonly conduction: ConductionGraph;
  readonly netlist: Netlist;
}

export interface ResistancePath {
  readonly resistance: number;
  /** Element ids traversed, sorted. Connections contribute none. */
  readonly elementIds: readonly ElementId[];
}

// ---------------------------------------------------------------------------
// Solver (A3)
// ---------------------------------------------------------------------------

export interface LinearSystem {
  readonly dimension: number;
  readonly matrix: Matrix;
  readonly rhs: Float64Array;
  /** Unknown index per non-reference node. Reference nodes are absent and held at 0 V. */
  readonly nodeIndex: ReadonlyMap<NodeId, number>;
  /** One grounded node per connected component, each the smallest canonical id in it. */
  readonly referenceNodes: readonly NodeId[];
  /** Extra Modified Nodal Analysis unknown carrying each source's branch current. */
  readonly sourceBranchIndex: ReadonlyMap<ElementId, number>;
  /** Internal node introduced for a source with non-zero internal resistance. */
  readonly internalNodeOf: ReadonlyMap<ElementId, NodeId>;
}

export interface SingularSystem {
  singular: true;
  /** Column at which no usable pivot remained. Diagnostic only. */
  pivotRow: number;
}

export interface SolutionVector {
  singular: false;
  values: Float64Array;
}

export type SolveOutcome = SolutionVector | SingularSystem;

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface ElementResult {
  elementId: ElementId;
  /**
   * Kind of the element this result describes. Present so B3 role binding can resolve a role
   * to its element from the result alone, which `evaluateRoleActivation(machine, result)`
   * requires because it receives no layout.
   */
  kind: ElementKind;
  /** Amperes, signed: positive means current enters `terminals[0]` and leaves `terminals[1]`. */
  current: number;
  /** Volts: `V(terminals[0]) - V(terminals[1])`. */
  voltageDrop: number;
  energized: boolean;
  /** Presentation value in `[0, 1]`. Drives FR-CB-13 proportional brightness. */
  intensity: number;
}

export type FaultCode = 'SHORT_CIRCUIT' | 'OVERCURRENT' | 'REVERSED_POLARITY' | 'SINGULAR_SYSTEM';

export interface Fault {
  /** Stable identifier for tooltip selection and localization - never a message (NFR-CB-17). */
  code: FaultCode;
  elementIds: readonly ElementId[];
  /** Grid position for spark placement by C3 (FR-CB-17). */
  atPosition?: GridPosition;
}

export interface CircuitResult {
  nodeVoltages: Readonly<Record<NodeId, number>>;
  /** Sorted by `elementId`. */
  elements: readonly ElementResult[];
  /** Sorted by severity, then by first `elementId`. */
  faults: readonly Fault[];
  closedPathExists: boolean;
  /**
   * Equivalent external resistance in ohms seen by the dominant source, computed as
   * `|V(terminals[0]) - V(terminals[1])| / |I|` and only when `|I| > CURRENT_EPSILON`.
   * When no source current flows it is `0` - never `Infinity` and never `NaN`, so the value
   * stays JSON-safe. Check {@link CircuitResult.closedPathExists} before reading it.
   */
  totalResistance: number;
  /** Magnitude in amperes of the dominant source's current. */
  totalCurrent: number;
}

// ---------------------------------------------------------------------------
// Facade (A5)
// ---------------------------------------------------------------------------

export type EvaluationErrorCode =
  | 'MALFORMED_INPUT'
  | 'STRUCTURAL_INVALID'
  | 'LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';

export interface EvaluationError {
  /** Discriminator against {@link CircuitResult}. */
  errorCode: EvaluationErrorCode;
  issues: readonly StructuralIssue[];
}

export type EvaluationOutcome = CircuitResult | EvaluationError;

export function isEvaluationError(outcome: EvaluationOutcome): outcome is EvaluationError {
  return typeof (outcome as EvaluationError).errorCode === 'string';
}

export function isCircuitResult(outcome: EvaluationOutcome): outcome is CircuitResult {
  return !isEvaluationError(outcome);
}

// ---------------------------------------------------------------------------
// Level model (B1)
// ---------------------------------------------------------------------------

/** Mechanism implementing FR-CB-34 progressive numeric disclosure. */
export type NumericDisclosure = 'none' | 'qualitative' | 'values' | 'full';

export type DifficultyTier = 1 | 2 | 3 | 4;

export interface LevelDefinition {
  id: string;
  difficulty: DifficultyTier;
  numericDisclosure: NumericDisclosure;
  gridSize: GridSize;
  availableComponents: Partial<Record<ElementKind, number>>;
  prePlaced: readonly CircuitElement[];
  lockedElementIds: readonly ElementId[];
  targetMachineId: string;
  successConditionId: string;
  /** Concept this level teaches, sequencing the curriculum per FR-CB-28. */
  conceptTag: string;
  /** Per-level ceiling for the client-reported historical fault count (decision c). */
  maxFaultCount?: number;
}

// ---------------------------------------------------------------------------
// Success conditions (B2)
// ---------------------------------------------------------------------------

export type SuccessPredicate = (result: CircuitResult, machine: TargetMachine) => boolean;

export interface SuccessClause {
  clauseId: string;
  predicate: SuccessPredicate;
}

export interface SuccessOutcome {
  satisfied: boolean;
  unmetClauses: readonly string[];
}

// ---------------------------------------------------------------------------
// Target machines (B3)
// ---------------------------------------------------------------------------

export interface MachineRole {
  roleId: string;
  requiredKind: ElementKind;
  /** Key into the frozen activation rule registry. An unknown key resolves to `false`. */
  activationRule: string;
  /** Sprite and copy lookup key. Never an asset (FR-CB-29). */
  presentationKey: string;
}

export interface TargetMachine {
  id: string;
  roles: readonly MachineRole[];
}

/** Context handed to an activation rule: the results of every element of the role's kind. */
export interface RoleActivationContext {
  readonly matching: readonly ElementResult[];
}

export type RoleActivationRule = (context: RoleActivationContext) => boolean;

// ---------------------------------------------------------------------------
// Fault count clamping (decision c)
// ---------------------------------------------------------------------------

export interface FaultCountClamp {
  value: number;
  wasClamped: boolean;
  /** `true` when the reported value was not a non-negative integer. U6 rejects on this. */
  wasMalformed: boolean;
}

// ---------------------------------------------------------------------------
// Element electrical specification
// ---------------------------------------------------------------------------

export interface ElementSpec {
  /** Fixed resistance in ohms, or `undefined` when the element takes it from `params`. */
  readonly resistance?: number;
  /** Internal resistance in ohms for source kinds. */
  readonly internalResistance?: number;
  /** Current in amperes above which the element is overloaded, when it declares a limit. */
  readonly ratedCurrent?: number;
  /** `true` when reverse current through the element is a fault. Applies to loads only. */
  readonly polarized: boolean;
  readonly isSource: boolean;
  /** `true` for kinds that count as a valid load for FR-CB-10 closed-path detection. */
  readonly isLoad: boolean;
  /** `true` for ideal conductors whose terminals merge into one electrical node. */
  readonly isConductor: boolean;
}
