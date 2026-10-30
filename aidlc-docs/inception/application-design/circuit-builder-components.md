# Circuit Builder - Components

**Created**: 2026-10-29
**Stage**: INCEPTION - Application Design, Phase 1
**Design decisions**: `circuit-builder-application-design-plan.md` (8 questions, approved)

**Scope note**: This document identifies components, responsibilities, and interfaces. Detailed business rules are deferred to Functional Design in the Construction phase.

---

## Component Groups

| Group | Package | Count |
|---|---|---|
| A. Circuit Engine | `packages/shared` | 5 |
| B. Level Model | `packages/shared` | 3 |
| C. Game Surface | `apps/web` | 5 |
| D. Platform Services | `apps/web` | 3 |
| E. Backend Integration | `services/game` | 3 |
| **Total** | | **19** |

---

# Group A — Circuit Engine (`packages/shared`)

Platform-neutral, pure, deterministic. No browser, Node, or React API. Consumed by both `apps/web` and `services/game`.

## A1 — Netlist Model

**Purpose**: Represent a circuit as electrical elements and the nodes their terminals share, independent of visual placement (Q1=B).

**Responsibilities**
- Define element types: voltage source, resistive load, conductor, switch, resistor
- Define terminals and their node membership
- Provide node identity resolution, so terminals joined by a conductor resolve to one electrical node
- Validate structural well-formedness, distinct from electrical validity

**Interface**: construction from a submitted layout, node resolution queries, structural validation result.

**Design note**: Physical grid coordinates are carried as opaque metadata so the browser can render and the server can ignore them. The engine never reads coordinates to infer connectivity.

*Requirements: FR-CB-4, FR-CB-15, FR-CB-16*

## A2 — Topology Resolver

**Purpose**: Derive the electrical graph from the netlist, collapsing conductors and applying switch states.

**Responsibilities**
- Merge nodes joined by zero-resistance conductors
- Treat an open switch as an absent edge, and a closed switch as a conductor
- Identify connected components, so isolated sub-circuits are recognized
- Determine whether a conductive path exists between source terminals

**Interface**: netlist plus switch states in, resolved electrical graph out.

*Requirements: FR-CB-8, FR-CB-10, FR-CB-11, FR-CB-12*

## A3 — Nodal Solver

**Purpose**: Compute node voltages and element currents using Modified Nodal Analysis (Q2=B).

**Responsibilities**
- Build the conductance matrix and source vector from the resolved graph
- Solve the linear system by Gaussian elimination with partial pivoting
- Derive per-element current and voltage drop from the node voltage solution
- Report singular or ill-conditioned systems rather than returning silent nonsense

**Interface**: resolved graph in, node voltages and per-element current/voltage out, or a solver failure indication.

**Design note**: Chosen over series/parallel reduction because reduction cannot solve bridge topologies, which free grid placement will produce. The singularity signal is also the primary short-circuit detector, so faults emerge from the mathematics rather than from separate path-scanning.

*Requirements: FR-CB-9, FR-CB-13*

## A4 — Fault Detector

**Purpose**: Identify fault conditions and classify them for feedback.

**Responsibilities**
- Detect a source-to-source path whose total resistance is below the configured threshold
- Interpret solver singularity as a fault rather than an error
- Detect current through an element exceeding its rated limit, such as an unprotected LED
- Detect reversed polarity on polarity-sensitive elements
- Classify each fault with a stable code for tooltip selection and localization

**Interface**: solver result plus netlist in, ordered fault list out.

**Design note**: Fault codes are stable identifiers, not messages. Copy lives in locale files so NFR-CB-17 translation applies.

*Requirements: FR-CB-14, FR-CB-17, FR-CB-18*

## A5 — Evaluation Facade

**Purpose**: Single public entry point to the engine (Q3=C, stateless core).

**Responsibilities**
- Orchestrate A1 through A4 in order
- Return one immutable result containing energization state, numeric values, and faults
- Guarantee determinism for identical input
- Hold no state between calls

**Interface**: `evaluate(layout, switchStates, environment) => CircuitResult`

**Design note**: This is the only symbol `services/game` imports from the engine. Keeping the surface narrow protects the shared contract from drift as internals change.

*Requirements: FR-CB-15, FR-CB-16, FR-CB-21*

---

# Group B — Level Model (`packages/shared`)

In the shared package because the server must evaluate success conditions (Q4=C).

## B1 — Level Definition Model

**Purpose**: Describe a level's starting state, available components, and objective.

**Responsibilities**
- Define the component budget and which tray components are available
- Define pre-placed or locked components
- Define the grid dimensions
- Declare the difficulty tier and the numeric disclosure level
- Reference the target machine and the success condition

**Interface**: typed level definitions addressable by level identifier.

*Requirements: FR-CB-27, FR-CB-28, FR-CB-33, FR-CB-34*

## B2 — Success Condition Predicates

**Purpose**: Determine whether a circuit result satisfies a level's objective, identically in browser and server.

**Responsibilities**
- Express objectives as predicates over a `CircuitResult`, for example "all rover loads energized" or "motor energized while buzzer is not"
- Compose predicates for multi-part objectives
- Return a structured pass or fail with the unmet clause identified

**Interface**: `evaluateSuccess(level, circuitResult) => SuccessOutcome`

**Design note**: Predicates over the engine result rather than a serialized rule schema, so success logic is type-checked and the server runs the identical function rather than interpreting data.

*Requirements: FR-CB-22, FR-CB-30*

## B3 — Target Machine Model

**Purpose**: Bind circuit elements to in-world roles on the target machine.

**Responsibilities**
- Map an element role, such as drive motor or headlight, to the element it requires
- Declare per-role activation conditions
- Carry presentation keys for sprite and copy lookup, without owning assets

**Interface**: typed machine definitions, with the Mars Rover as the MVP instance.

**Design note**: Data-driven so additional machines are content, not code, per FR-CB-29.

*Requirements: FR-CB-29, FR-CB-30*

---

# Group C — Game Surface (`apps/web`)

Layered decomposition with a separate effects layer (Q5=B plus C).

## C1 — Grid Canvas Renderer

**Purpose**: Draw the grid, placed components, connections, and energization state.

**Responsibilities**
- Render the static grid and placed components at logical coordinates
- Render connections, with energized paths as high-contrast glowing traces
- Render load state derived from computed current, including proportional bulb brightness
- Convert between viewport and logical coordinates

**Interface**: accepts circuit state plus the latest `CircuitResult`; exposes coordinate conversion.

**Design note**: Follows the `MiniGolfGamePage` and `miniGolfPhysics.ts` precedent for logical coordinates and animation-frame cleanup. Rendering only; it owns no interaction.

*Requirements: FR-CB-1, FR-CB-13, FR-CB-20 · NFR-CB-1, NFR-CB-3, NFR-CB-9*

## C2 — Interaction Controller

**Purpose**: Translate pointer, touch, and keyboard input into interaction intents.

**Responsibilities**
- Hit-test logical coordinates to identify the component, terminal, or cell under a point
- Manage drag, drop, and snap-to-cell for pointer and touch
- Provide a tap-then-tap placement fallback
- Provide the keyboard interaction model: move a cursor across cells, select, place, connect terminals, toggle a switch
- Maintain a single selection state shared by pointer and keyboard paths

**Interface**: emits interaction intents consumed by the state reducer.

**Design note**: Deliberately separated from C1 because the keyboard model in NFR-CB-5 must drive the same selection state as pointer hit-testing. If these were merged, keyboard support would become a parallel implementation.

*Requirements: FR-CB-3, FR-CB-4, FR-CB-5, FR-CB-6 · NFR-CB-1, NFR-CB-2, NFR-CB-5*

## C3 — Effects Layer

**Purpose**: Render transient visual effects independently of the circuit.

**Responsibilities**
- Emit and animate spark particles at a fault coordinate
- Render the fuse-pop and celebration effects
- Suppress or substitute static alternatives when reduced motion is active
- Composite above the circuit layer without triggering a full circuit redraw

**Interface**: accepts effect triggers with coordinates; owns its own animation loop.

**Design note**: Separate compositing because particles animate at a different cadence than the circuit. Redrawing the whole circuit per particle frame would waste the frame budget.

*Requirements: FR-CB-17, FR-CB-20 · NFR-CB-4, NFR-CB-7*

## C4 — Component Tray

**Purpose**: Present available components and initiate placement.

**Responsibilities**
- Render available components for the current level, honoring the level's budget
- Show remaining budget per component
- Initiate drag for pointer and touch, and selection for keyboard and tap paths
- Display translated component names

**Interface**: emits a component-selected intent.

*Requirements: FR-CB-2 · NFR-CB-10, NFR-CB-17*

## C5 — Circuit State Reducer

**Purpose**: Own the authoritative browser-side circuit state through explicit transitions (Q6=B).

**Responsibilities**
- Apply discrete actions: place, move, remove, connect, disconnect, toggle switch, set voltage, set light level, reset fuse
- Maintain the circuit layout, switch states, and environment
- Track attempt metrics: elapsed time, component count, fault count
- Trigger re-evaluation through the memoizing engine wrapper after each transition

**Interface**: `(state, action) => state`, plus derived selectors.

**Design note**: A reducer makes every transition unit-testable without rendering, which complements the pure engine. It also keeps the place-then-connect sequence explicit rather than spread across independent hooks.

*Requirements: FR-CB-3 to FR-CB-8, FR-CB-19, FR-CB-23*

---

# Group D — Platform Services (`apps/web`)

## D1 — Audio Service

**Purpose**: Own audio playback lifecycle (Q7=B).

**Responsibilities**
- Own the audio context and defer initialization until a user gesture
- Load and cache sound buffers
- Honor the stored sound preference and a mute control
- Release resources on teardown so audio never outlives the game
- Degrade silently when audio is unsupported or a buffer fails to load

**Interface**: plain module with play, mute, and dispose operations, plus a hook wrapper providing component-scoped cleanup.

**Design note**: A plain module rather than a hook alone, because the audio context must outlive individual renders. Not placed in `packages/shared`, because Web Audio has no meaning in a Lambda and the shared module must stay platform-neutral.

*Requirements: NFR-CB-12 to NFR-CB-16*

## D2 — Engine Wrapper

**Purpose**: Provide memoized engine evaluation for the browser's live-edit path (Q3=C).

**Responsibilities**
- Call the shared `evaluate` facade
- Memoize on a circuit state hash to avoid recomputation on unrelated re-renders
- Bound memo size so long sessions do not grow without limit

**Interface**: same signature as A5, with caching.

**Design note**: Caching lives here, never in `packages/shared`, preserving engine purity for Lambda reuse.

*Requirements: FR-CB-15 · NFR-CB-4*

## D3 — Presentation Preferences Adapter

**Purpose**: Expose user presentation preferences to the game.

**Responsibilities**
- Detect `prefers-reduced-motion` and expose it reactively
- Expose the stored sound preference
- Expose the numeric disclosure level derived from the level's difficulty

**Interface**: read-only preference accessors.

*Requirements: FR-CB-34 · NFR-CB-7, NFR-CB-14*

---

# Group E — Backend Integration (`services/game`)

## E1 — Layout Validator

**Purpose**: Reject malformed or abusive submissions before any processing (SECURITY-05).

**Responsibilities**
- Validate the submitted layout against a bounded schema: element count, connection count, grid coordinate ranges, voltage range, light level range, elapsed time, and fault count
- Reject unknown element and connection types
- Enforce a maximum payload size
- Return a generic rejection without internal detail

**Interface**: `validate(payload) => ValidatedLayout | Rejection`

*Requirements: FR-CB-26 · NFR-CB-19, NFR-CB-22*

## E2 — Re-evaluation Orchestrator

**Purpose**: Recompute the authoritative outcome server-side (FR-CB-21).

**Responsibilities**
- Invoke the shared engine facade on the validated layout
- Invoke the shared success predicate for the claimed level
- Reject submissions whose circuit does not satisfy the success condition
- Produce the verified metrics that scoring consumes

**Interface**: `reevaluate(validatedLayout, levelId) => VerifiedOutcome | Rejection`

**Design note**: Uses the identical shared functions as the browser, so there is no second implementation that could diverge.

*Requirements: FR-CB-21, FR-CB-22 · NFR-CB-23*

## E3 — Score Calculator Extension

**Purpose**: Compute the three-factor Circuit Builder score from verified metrics.

**Responsibilities**
- Compute the score from completion time, component efficiency, and fault penalties
- Weight time modestly relative to efficiency and fault avoidance
- Use only server-verified metrics, never client-reported values
- Produce the score breakdown the existing completion UI already consumes

**Interface**: `calculate(verifiedOutcome, level, difficulty) => ScoreBreakdown`

**Design note**: Extends the existing score-calculator rather than introducing a parallel path, so the existing `ScoreBreakdownModal` works without change.

*Requirements: FR-CB-23, FR-CB-24, FR-CB-25*

---

## Requirement Coverage

| Component | Primary requirements |
|---|---|
| A1 Netlist Model | FR-CB-4, FR-CB-15, FR-CB-16 |
| A2 Topology Resolver | FR-CB-8, FR-CB-10 to FR-CB-12 |
| A3 Nodal Solver | FR-CB-9, FR-CB-13 |
| A4 Fault Detector | FR-CB-14, FR-CB-17, FR-CB-18 |
| A5 Evaluation Facade | FR-CB-15, FR-CB-16, FR-CB-21 |
| B1 Level Definition | FR-CB-27, FR-CB-28, FR-CB-33, FR-CB-34 |
| B2 Success Predicates | FR-CB-22, FR-CB-30 |
| B3 Target Machine | FR-CB-29, FR-CB-30 |
| C1 Canvas Renderer | FR-CB-1, FR-CB-13, FR-CB-20, NFR-CB-1, NFR-CB-9 |
| C2 Interaction Controller | FR-CB-3 to FR-CB-6, NFR-CB-2, NFR-CB-5 |
| C3 Effects Layer | FR-CB-17, FR-CB-20, NFR-CB-7 |
| C4 Component Tray | FR-CB-2, NFR-CB-17 |
| C5 State Reducer | FR-CB-3 to FR-CB-8, FR-CB-19 |
| D1 Audio Service | NFR-CB-12 to NFR-CB-16 |
| D2 Engine Wrapper | FR-CB-15, NFR-CB-4 |
| D3 Preferences Adapter | FR-CB-34, NFR-CB-7, NFR-CB-14 |
| E1 Layout Validator | FR-CB-26, NFR-CB-19 |
| E2 Re-evaluation | FR-CB-21, FR-CB-22 |
| E3 Score Calculator | FR-CB-23 to FR-CB-25 |

Every component traces to at least one requirement, satisfying Phase 5.1.
