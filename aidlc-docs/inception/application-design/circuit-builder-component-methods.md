# Circuit Builder - Component Methods

**Created**: 2026-10-29
**Stage**: INCEPTION - Application Design, Phase 2
**Basis**: `circuit-builder-components.md`

> **Scope boundary**: This document defines method signatures, purposes, and input/output types only. **Detailed business rules are deliberately deferred to Functional Design** in the Construction phase. Where a method's rule is non-trivial — matrix construction, fault thresholds, scoring weights, brightness curves — this document names the method and its contract but does not specify the algorithm.

Signatures are illustrative TypeScript expressing intent, not final code.

---

## Shared Types

```ts
type ElementId = string;
type NodeId = string;
type ElementKind =
  | 'battery' | 'solar' | 'wire' | 'switch'
  | 'resistor' | 'led' | 'motor' | 'buzzer';

interface GridPosition { col: number; row: number; rotation: 0 | 90 | 180 | 270 }

interface CircuitElement {
  id: ElementId;
  kind: ElementKind;
  terminals: [NodeId, NodeId];
  position: GridPosition;          // metadata; engine never infers connectivity from it
  params?: Record<string, number>; // e.g. resistance, ratedVoltage
}

interface Connection { id: string; from: NodeId; to: NodeId }

interface CircuitLayout {
  elements: CircuitElement[];
  connections: Connection[];
  gridSize: { cols: number; rows: number };
}

interface SwitchStates { [elementId: string]: 'open' | 'closed' }
interface Environment { sourceVoltage: number; lightLevel: number }

interface ElementResult {
  elementId: ElementId;
  current: number;         // amperes
  voltageDrop: number;     // volts
  energized: boolean;
  intensity: number;       // 0..1, normalized for presentation
}

interface Fault {
  code: 'SHORT_CIRCUIT' | 'OVERCURRENT' | 'REVERSED_POLARITY' | 'SINGULAR_SYSTEM';
  elementIds: ElementId[];
  atPosition?: GridPosition;  // for spark placement
}

interface CircuitResult {
  nodeVoltages: Record<NodeId, number>;
  elements: ElementResult[];
  faults: Fault[];
  closedPathExists: boolean;
  totalResistance: number;
  totalCurrent: number;
}
```

---

# Group A — Circuit Engine

## A1 — Netlist Model

```ts
function buildNetlist(layout: CircuitLayout): Netlist | StructuralError
```
Construct the netlist from a layout. Returns a structural error for malformed input such as a connection referencing an unknown node. Does not assess electrical validity.

```ts
function resolveNodeIdentity(netlist: Netlist): Map<NodeId, NodeId>
```
Map each terminal node to its canonical electrical node after conductor merging. *Merge rules: Functional Design.*

```ts
function validateStructure(layout: CircuitLayout): StructuralValidation
```
Check well-formedness: terminal references resolve, no duplicate element ids, positions within grid bounds.

## A2 — Topology Resolver

```ts
function resolveTopology(netlist: Netlist, switches: SwitchStates): ElectricalGraph
```
Produce the electrical graph with conductors collapsed and open switches removed as edges.

```ts
function findConnectedComponents(graph: ElectricalGraph): NodeId[][]
```
Group nodes into electrically connected sets, so isolated sub-circuits are identified.

```ts
function hasClosedPath(graph: ElectricalGraph, source: ElementId): boolean
```
Determine whether a conductive path exists between a source's terminals. Supports `FR-CB-10`.

## A3 — Nodal Solver

```ts
function buildConductanceMatrix(graph: ElectricalGraph, env: Environment): LinearSystem
```
Construct the Modified Nodal Analysis conductance matrix and source vector. *Stamping rules for each element kind: Functional Design.*

```ts
function solveLinearSystem(system: LinearSystem): SolutionVector | SingularSystem
```
Solve by Gaussian elimination with partial pivoting. Returns a singular indication rather than throwing, since singularity is a meaningful circuit condition.

```ts
function deriveElementResults(
  solution: SolutionVector,
  graph: ElectricalGraph
): ElementResult[]
```
Compute per-element current, voltage drop, and normalized intensity from node voltages. *Intensity normalization curve: Functional Design — this is what makes `FR-CB-13` series dimming perceivable, so it is a presentation-sensitive rule, not a raw value.*

## A4 — Fault Detector

```ts
function detectFaults(
  result: Partial<CircuitResult>,
  graph: ElectricalGraph,
  netlist: Netlist
): Fault[]
```
Return all fault conditions, ordered by severity. *Thresholds and severity ordering: Functional Design.*

```ts
function isShortCircuitPath(graph: ElectricalGraph, source: ElementId): boolean
```
Detect a source-to-source path whose resistance falls below the short-circuit threshold. *Threshold value: Functional Design, with the numeric target set in NFR Requirements.*

```ts
function locateFaultPosition(fault: Fault, layout: CircuitLayout): GridPosition | undefined
```
Resolve a grid position for the fault so `C3` can place the spark effect.

## A5 — Evaluation Facade

```ts
function evaluate(
  layout: CircuitLayout,
  switches: SwitchStates,
  env: Environment
): CircuitResult | EvaluationError
```
**The only symbol imported by `services/game`.** Orchestrates A1 through A4 and returns one immutable result. Pure and deterministic; holds no state between calls. Satisfies `FR-CB-15`, `FR-CB-16`.

---

# Group B — Level Model

## B1 — Level Definition Model

```ts
interface LevelDefinition {
  id: string;
  difficulty: 1 | 2 | 3 | 4;
  numericDisclosure: 'none' | 'qualitative' | 'values' | 'full';
  gridSize: { cols: number; rows: number };
  availableComponents: Partial<Record<ElementKind, number>>; // kind -> budget
  prePlaced: CircuitElement[];
  lockedElementIds: ElementId[];
  targetMachineId: string;
  successConditionId: string;
  conceptTag: string;  // e.g. 'series', 'parallel' — sequences teaching per FR-CB-28
}

function getLevel(id: string): LevelDefinition | undefined
function listLevels(): LevelDefinition[]
```
`numericDisclosure` is the mechanism implementing `FR-CB-34` and the persona tension table. Note it is stored per level rather than derived from difficulty at render time, so a level can deviate deliberately.

## B2 — Success Condition Predicates

```ts
type SuccessPredicate = (result: CircuitResult, machine: TargetMachine) => boolean;

interface SuccessOutcome {
  satisfied: boolean;
  unmetClauses: string[];   // identifies which clause failed
}

function evaluateSuccess(
  level: LevelDefinition,
  result: CircuitResult
): SuccessOutcome
```
**Called identically by browser and server.** The server path in `E2` uses this exact function, which is why `B2` lives in `packages/shared`. *Individual predicate logic per level: Functional Design.*

```ts
function composePredicates(predicates: SuccessPredicate[]): SuccessPredicate
```
Combine clauses for multi-part objectives.

## B3 — Target Machine Model

```ts
interface MachineRole {
  roleId: string;              // e.g. 'driveMotor', 'headlight'
  requiredKind: ElementKind;
  activationRule: string;      // rule identifier; logic in Functional Design
  presentationKey: string;     // sprite/copy lookup key, not an asset
}

interface TargetMachine { id: string; roles: MachineRole[] }

function getMachine(id: string): TargetMachine | undefined
function evaluateRoleActivation(machine: TargetMachine, result: CircuitResult): Record<string, boolean>
```

---

# Group C — Game Surface

## C1 — Grid Canvas Renderer

```ts
function render(ctx: CanvasRenderingContext2D, state: CircuitState, result: CircuitResult): void
function toLogical(viewportPoint: Point, viewport: Viewport): GridPosition
function toViewport(position: GridPosition, viewport: Viewport): Point
function computeViewport(canvasSize: Size, gridSize: GridSize): Viewport
```
Rendering and coordinate conversion only; owns no interaction state. Coordinate approach follows the `miniGolfPhysics.ts` precedent. *Visual treatment of energized traces and brightness mapping: Functional Design.*

## C2 — Interaction Controller

```ts
type InteractionIntent =
  | { type: 'selectTrayComponent'; kind: ElementKind }
  | { type: 'placeAt'; position: GridPosition }
  | { type: 'beginConnection'; elementId: ElementId; terminalIndex: 0 | 1 }
  | { type: 'completeConnection'; elementId: ElementId; terminalIndex: 0 | 1 }
  | { type: 'removeElement'; elementId: ElementId }
  | { type: 'removeConnection'; connectionId: string }
  | { type: 'toggleSwitch'; elementId: ElementId }
  | { type: 'moveCursor'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'cancel' };

function hitTest(point: Point, state: CircuitState, viewport: Viewport): HitTarget | null
function handlePointerEvent(event: PointerEvent): InteractionIntent | null
function handleKeyboardEvent(event: KeyboardEvent): InteractionIntent | null
function getSelection(): SelectionState
```
**Both pointer and keyboard handlers emit the same intent type and share one `SelectionState`.** This is the structural reason `NFR-CB-5` keyboard support does not become a parallel implementation.

## C3 — Effects Layer

```ts
function emitSparks(at: GridPosition, intensity: number): void
function playFusePop(at: GridPosition): void
function playCelebration(): void
function setReducedMotion(enabled: boolean): void
function clear(): void
```
When reduced motion is enabled, each effect substitutes a static indication rather than no-op, preserving the information the animation conveyed per `NFR-CB-7`.

## C4 — Component Tray

```ts
function getAvailableComponents(level: LevelDefinition, state: CircuitState): TrayItem[]
function getRemainingBudget(kind: ElementKind, level: LevelDefinition, state: CircuitState): number
```
`TrayItem` carries a translation key rather than a literal label, supporting `NFR-CB-17`.

## C5 — Circuit State Reducer

```ts
type CircuitAction =
  | { type: 'place'; kind: ElementKind; position: GridPosition }
  | { type: 'move'; elementId: ElementId; to: GridPosition }
  | { type: 'remove'; elementId: ElementId }
  | { type: 'connect'; from: TerminalRef; to: TerminalRef }
  | { type: 'disconnect'; connectionId: string }
  | { type: 'toggleSwitch'; elementId: ElementId }
  | { type: 'setVoltage'; volts: number }
  | { type: 'setLightLevel'; level: number }
  | { type: 'resetFuse' }
  | { type: 'tick'; elapsedSeconds: number }
  | { type: 'reset' };

interface CircuitState {
  layout: CircuitLayout;
  switches: SwitchStates;
  environment: Environment;
  fuseBlown: boolean;
  metrics: { elapsedSeconds: number; componentCount: number; faultCount: number };
}

function circuitReducer(state: CircuitState, action: CircuitAction): CircuitState
function selectSubmissionPayload(state: CircuitState): CircuitLayout  // what goes to the server
```
`selectSubmissionPayload` is the boundary between local state and what `completeGame` receives, keeping the submitted shape explicit and auditable. *Validation rules per action, such as rejecting an overlapping placement or an over-budget component: Functional Design.*

---

# Group D — Platform Services

## D1 — Audio Service

```ts
function initializeOnGesture(): Promise<void>   // deferred until a user gesture
function preload(soundIds: string[]): Promise<void>
function play(soundId: string): void            // no-op when muted or unsupported
function setMuted(muted: boolean): void
function isAvailable(): boolean
function dispose(): void                        // releases context and buffers

function useAudio(): AudioHandle                // hook wrapper; calls dispose on unmount
```
`play` never throws. Failure to load or an unsupported environment degrades silently per `NFR-CB-16`.

## D2 — Engine Wrapper

```ts
function evaluateMemoized(
  layout: CircuitLayout,
  switches: SwitchStates,
  env: Environment
): CircuitResult | EvaluationError

function hashCircuitState(layout: CircuitLayout, switches: SwitchStates, env: Environment): string
function clearMemo(): void
```
Same signature as `A5` with caching added. Memo is size-bounded. *Cache size and eviction: NFR Design.*

## D3 — Presentation Preferences Adapter

```ts
function usePrefersReducedMotion(): boolean
function useSoundPreference(): boolean
function getNumericDisclosure(level: LevelDefinition): LevelDefinition['numericDisclosure']
```

---

# Group E — Backend Integration

## E1 — Layout Validator

```ts
interface SubmissionPayload {
  gameId: string;
  levelId: string;
  layout: CircuitLayout;
  switches: SwitchStates;
  environment: Environment;
  completionTime: number;
  faultCount: number;
}

function validateSubmission(raw: unknown): ValidatedSubmission | Rejection
function assertPayloadSize(raw: unknown): boolean
```
Bounded schema validation per `FR-CB-26`. Rejections return a generic message with no internal detail, per `NFR-CB-22`. *Specific bounds: quantified in NFR Requirements, enforced per Functional Design.*

## E2 — Re-evaluation Orchestrator

```ts
interface VerifiedOutcome {
  satisfied: boolean;
  verifiedMetrics: {
    componentCount: number;
    completionTime: number;
    faultCount: number;
  };
  result: CircuitResult;
}

function reevaluate(submission: ValidatedSubmission): VerifiedOutcome | Rejection
```
Calls the shared `evaluate` facade and the shared `evaluateSuccess` predicate. Rejects when the circuit does not satisfy the level objective, per `FR-CB-22`.

**Note on `faultCount`**: the client reports it, but it cannot be independently reconstructed from a final layout, since faults are historical events. This is a deliberate, bounded residual trust noted here so Functional Design must decide how to constrain it — most plausibly by clamping to a per-level maximum rather than trusting the value outright.

## E3 — Score Calculator Extension

```ts
function calculateCircuitBuilderScore(
  outcome: VerifiedOutcome,
  level: LevelDefinition,
  difficulty: 1 | 2 | 3 | 4
): ScoreBreakdown
```
Returns the existing `ScoreBreakdown` shape so `ScoreBreakdownModal` requires no change. Consumes only `verifiedMetrics`, never client-reported values except the bounded `faultCount` noted above. *Weighting of time, efficiency, and fault penalty: Functional Design.*

---

## Deferred to Functional Design

Named explicitly so nothing is silently skipped:

| Area | Deferred decision |
|---|---|
| A1 | Conductor merge rules |
| A3 | Per-element matrix stamping; intensity normalization curve |
| A4 | Short-circuit resistance threshold; overcurrent limits; severity ordering |
| B1 | The six to eight level definitions and concept sequencing |
| B2 | Per-level success predicate logic |
| B3 | Role activation rules |
| C1 | Energized-trace visual treatment; brightness mapping |
| C5 | Per-action validation rules |
| D2 | Memo size and eviction policy |
| E1 | Specific numeric bounds, quantified in NFR Requirements |
| E2 | How `faultCount` is constrained given it cannot be reconstructed |
| E3 | Scoring weights |
