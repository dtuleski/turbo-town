# Circuit Builder - Application Design Plan

**Created**: 2026-10-29
**Stage**: INCEPTION - Application Design
**Basis**: `circuit-builder-requirements.md`, `circuit-builder-stories.md`, `circuit-builder-execution-plan.md`

**Note on file naming**: An `application-design-plan.md` already exists in this directory from the original Memory Game inception. This Circuit Builder file is kept separate so the earlier artifact is preserved.

**Answers pre-filled**: Following your established preference, all 8 questions are pre-filled with rationale. Change any `[Answer]:` you disagree with, or approve as-is.

**Scope note**: These questions cover only what is genuinely ambiguous for component and interface design. Categories that the requirements already settled, such as entitlement, localization, and delivery sequencing, are deliberately not re-asked. Detailed business rules are out of scope here and belong to Functional Design.

---

## Section A: Design Questions

## Question 1
How should a circuit be represented internally?

A) Component-centric adjacency — each component holds references to its connected neighbors
B) Netlist model — components are elements with terminals, and connections define electrical nodes that terminals share
C) Grid-cell model — the canvas grid itself is the data structure, with adjacency inferred from cell occupancy
X) Other (please describe after [Answer]: tag below)

[Answer]: B

*Rationale:* A netlist is how real circuit analysis works, and it is the only one of the three that cleanly separates physical placement from electrical topology. That separation matters here for two concrete reasons. First, server-side re-evaluation (FR-CB-21) should validate electrical correctness without caring where components sit on screen, and a netlist submits compactly as elements plus nodes. Second, a grid-cell model (option C) would conflate "next to" with "connected to," which breaks as soon as two wires cross without joining. Option A makes finding electrical nodes an awkward graph traversal every evaluation, whereas a netlist gives them directly.

## Question 2
Which solver algorithm should the engine use?

A) Series/parallel reduction — repeatedly collapse series and parallel groups until one equivalent resistance remains
B) Modified Nodal Analysis (MNA) — build a conductance matrix and solve the linear system with Gaussian elimination
C) Reduction first, with a fallback to nodal analysis for topologies reduction cannot handle
X) Other (please describe after [Answer]: tag below)

[Answer]: B

*Rationale:* This is the most consequential design decision in the feature, and option A has a failure mode that will absolutely be hit. Series/parallel reduction cannot solve bridge topologies such as a Wheatstone arrangement, and on a free-placement grid where children experiment deliberately, those shapes will appear within minutes. An engine that silently gives wrong currents for them would actively teach falsehoods, which defeats the product's purpose. Nodal analysis is roughly 150 to 250 lines for DC resistive circuits, handles any topology uniformly, and gives per-node voltages directly, which is exactly what FR-CB-9 requires for voltage drop display. Option C sounds pragmatic but means building and maintaining two solvers plus the detection logic to choose between them, which is more total work than just building the general one. Worth noting that the matrix solve also needs a singularity check, which is a natural place to detect the zero-resistance short circuit in FR-CB-14.

## Question 3
What API shape should the engine expose?

A) Single stateless function: `evaluate(circuit) => result`
B) Stateful instance that holds the circuit and supports incremental edits
C) Stateless core function plus a thin memoizing wrapper for the browser's live-update path
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* A stateless core is required rather than merely preferred, because FR-CB-15 demands determinism and FR-CB-16 requires the same code to run inside a Lambda where no stateful instance should persist between invocations. The Lambda calls the pure function and nothing else. But the browser re-evaluates on every edit and continuously during switch toggling, so recomputing from scratch is wasteful once a circuit reaches the component ceiling. The memoizing wrapper lives in the browser layer and keys on a circuit hash, leaving the shared core pure. Option B would put mutable state in `packages/shared`, which is the one thing the shared module must not have.

## Question 4
How should levels and the target machine be defined?

A) TypeScript modules in `apps/web`, following the `miniGolfData.ts` precedent
B) JSON data files in `apps/web`
C) TypeScript modules in `packages/shared`, so success conditions are available to both browser and server
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* Option A matches the closest existing precedent but breaks server-side re-evaluation. FR-CB-22 requires the Game Service to reject a layout that does not satisfy the level's success condition, which means the server must know what that condition is. If level definitions live only in `apps/web`, the server cannot evaluate them, and duplicating the definitions is exactly the drift problem this architecture is trying to avoid. TypeScript rather than JSON (option B) keeps the success conditions type-checked and lets them be expressed as predicates against the engine result rather than as a stringly-typed schema the server must interpret. Presentation-only content such as sprites and copy can stay in `apps/web`.

## Question 5
How should the canvas surface be decomposed?

A) One canvas component owning all rendering and interaction
B) Layered: a presentation canvas renderer, a separate interaction and hit-test layer, and a tray component, coordinated by the page
C) Multiple stacked canvases, for example a static grid layer, a circuit layer, and an effects layer
X) Other (please describe after [Answer]: tag below)

[Answer]: B, with the effects layer from option C

*Rationale:* Option A becomes the kind of thousand-line component the reverse engineering already flagged as a pattern in this codebase, where each game page owns timers, animation state, API lifecycle, and completion wiring with no separation. Separating hit-testing from rendering matters specifically because NFR-CB-5 requires a keyboard interaction model, and keyboard selection needs to drive the same selection state that pointer hit-testing produces. If they are entangled, keyboard support becomes a parallel implementation. I am also taking the separate effects layer from option C, because particle sparks animate at a different rate than the circuit itself and compositing them separately avoids redrawing the whole circuit per particle frame. Full multi-canvas stacking for the static grid is not worth it, since the grid is cheap to draw.

## Question 6
How should the game's interaction state be managed?

A) Local `useState` hooks in the game page
B) A `useReducer` with explicit actions such as place, connect, remove, toggle
C) A context provider shared across tray, canvas, and HUD
D) TanStack Query, which has a provider configured in the app
X) Other (please describe after [Answer]: tag below)

[Answer]: B

*Rationale:* Circuit editing is a set of discrete, well-named transitions, which is precisely what a reducer models well, and it makes the state transitions directly unit-testable without rendering, complementing the pure engine. Option A would scatter related state across many hooks and make the place-then-connect sequence hard to reason about. Option C adds indirection for a single screen whose component tree is shallow. Option D is wrong by category: TanStack Query is a server-state cache, and the circuit is local ephemeral state, plus reverse engineering found its provider exists with no hooks actually using it, so it is not an established pattern here.

## Question 7
Where should the audio service live and what shape should it take?

A) A React hook in `apps/web/src/hooks/`
B) A plain module in `apps/web/src/services/` with a thin hook wrapper for component use
C) In `packages/shared` so the future Flutter port can mirror the interface
X) Other (please describe after [Answer]: tag below)

[Answer]: B

*Rationale:* The service needs to own a lifecycle that outlives any single component render, specifically the Web Audio context, the gesture-unlock state, and loaded buffers, so a plain module is the right home with a hook providing ergonomic access and unmount cleanup. A hook alone (option A) tends to re-create or leak the audio context across mounts, which is the exact failure NFR-CB-15 guards against. Option C is wrong because Web Audio is browser-specific and has no meaning inside a Lambda or in Dart; `packages/shared` must stay platform-neutral, and NFR-CB-28 only promises a documented port, not shared audio code.

## Question 8
How should the solar panel be modelled?

A) Identical to a battery, as a fixed voltage source with a different sprite
B) A voltage source with a light-level input, so output varies with an adjustable light condition
C) A voltage source with lower current capacity than the battery, teaching supply limits
X) Other (please describe after [Answer]: tag below)

[Answer]: B

*Rationale:* Option A makes the solar panel decorative, which wastes the one component in your list that can teach where electricity comes from, and children will notice it behaves identically to the battery. A light-level input is a small addition to the engine, since the panel remains a voltage source whose value is a function of light, and it creates a genuinely good Mars Rover scenario where the rover must charge in sunlight and conserve in shadow. Option C is also pedagogically sound and could be combined later, but current-limit teaching overlaps with what the resistor already covers in FR-CB-2, whereas light dependence teaches something no other component does.

---

## Section B: Application Design Execution Checklist

### Phase 1: Component Identification
- [x] 1.1 Identify engine components: netlist model, topology resolver, nodal solver, fault detector, result model
- [x] 1.2 Identify game surface components: canvas renderer, interaction/hit-test layer, effects layer, component tray, HUD
- [x] 1.3 Identify level components: level definition model, success-condition predicates, target machine model
- [x] 1.4 Identify platform components: audio service, reduced-motion adapter, keyboard interaction controller
- [x] 1.5 Identify backend components: layout validator, re-evaluation orchestrator, score calculator extension
- [x] 1.6 Define responsibilities and interfaces for each
- [x] 1.7 Write `aidlc-docs/inception/application-design/circuit-builder-components.md`

### Phase 2: Component Methods
- [x] 2.1 Define the engine public API surface and its input/output types
- [x] 2.2 Define netlist construction and mutation signatures
- [x] 2.3 Define solver entry points and the result shape, including per-node voltage and per-element current
- [x] 2.4 Define fault-detection signatures, including the singularity and zero-resistance paths
- [x] 2.5 Define the reducer action set for interaction state
- [x] 2.6 Define renderer and hit-test method signatures
- [x] 2.7 Define audio service method signatures
- [x] 2.8 Define success-condition predicate signatures shared by browser and server
- [x] 2.9 Note explicitly that detailed business rules are deferred to Functional Design
- [x] 2.10 Write `aidlc-docs/inception/application-design/circuit-builder-component-methods.md`

### Phase 3: Service Layer
- [x] 3.1 Define the browser-side game session service orchestrating start, play, and complete
- [x] 3.2 Define the sandbox path that bypasses backend session calls entirely
- [x] 3.3 Define the Game Service re-evaluation orchestration
- [x] 3.4 Define the scoring service extension for the three-factor model
- [x] 3.5 Define the audio service orchestration and gesture-unlock flow
- [x] 3.6 Write `aidlc-docs/inception/application-design/circuit-builder-services.md`

### Phase 4: Dependencies and Communication
- [x] 4.1 Build the component dependency matrix
- [x] 4.2 Document the `packages/shared` to `apps/web` and `packages/shared` to `services/game` dependency contract
- [x] 4.3 Document communication patterns: reducer dispatch, engine invocation, render pipeline, API calls
- [x] 4.4 Create the data flow diagram with a text alternative
- [x] 4.5 Confirm no circular dependency is introduced
- [x] 4.6 Confirm the shared module remains platform-neutral with no browser or Node-only API
- [x] 4.7 Write `aidlc-docs/inception/application-design/circuit-builder-component-dependency.md`

### Phase 5: Validation
- [x] 5.1 Verify every component traces to at least one requirement
- [x] 5.2 Verify the design satisfies FR-CB-15 purity and FR-CB-16 shared placement
- [x] 5.3 Verify the design supports the keyboard model required by NFR-CB-5
- [x] 5.4 Verify the design supports server-side re-evaluation per FR-CB-21 and FR-CB-22
- [x] 5.5 Validate all content per `common/content-validation.md` before writing files
- [x] 5.6 Update `aidlc-docs/aidlc-state.md` and log in `aidlc-docs/audit.md`

---

## Mandatory Artifacts

- [x] `circuit-builder-components.md` with component definitions, responsibilities, and interfaces
- [x] `circuit-builder-component-methods.md` with method signatures and input/output types
- [x] `circuit-builder-services.md` with service definitions and orchestration patterns
- [x] `circuit-builder-component-dependency.md` with the dependency matrix, communication patterns, and data flow
- [x] Design completeness and consistency validated
