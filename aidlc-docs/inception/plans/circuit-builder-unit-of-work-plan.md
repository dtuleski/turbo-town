# Circuit Builder - Unit of Work Plan

**Created**: 2026-10-29
**Stage**: INCEPTION - Units Generation
**Standing approval**: The user granted session-wide auto-approval on 2026-10-29. Answers below are pre-filled and generation proceeds without an individual gate.

**Note on file naming**: `unit-of-work.md`, `unit-of-work-dependency.md`, and `unit-of-work-story-map.md` already exist from the original Memory Game inception. Circuit Builder artifacts use a `circuit-builder-` prefix so the earlier set is preserved.

---

## Section A: Decomposition Questions

Only three questions are genuinely open. Unit boundaries, sequencing, and story grouping were already determined by the approved execution plan (seven units, three delivery stages) and the approved dependency matrix. Those are not re-asked.

## Question 1
Should the seven preliminary units from the execution plan be used as-is, or reorganized?

A) Use the seven units as-is
B) Merge U3 Game Surface and U4 Levels into one unit, since both are `apps/web` game code
C) Split U2 Circuit Engine into separate solver and model units, given it is the largest unit
X) Other (please describe after [Answer]: tag below)

[Answer]: A

*Rationale:* The seven units already follow the natural seams: package boundaries, the three delivery stages, and the dependency matrix. Option B would merge a unit that is pure interaction mechanics with one that is content and pedagogy, producing a single oversized `apps/web` unit and losing the clean checkpoint between "the canvas works" and "the levels teach." Option C is tempting since U2 is large, but the netlist model and the solver are tightly coupled through the electrical graph, and splitting them would create a unit that cannot be independently verified because neither half produces a usable result alone.

## Question 2
What constitutes "done" for a unit, given units are not independently deployable here?

A) Code written and type-checks pass
B) Code written, type-checks pass, and the unit's own tests pass
C) The above plus the unit's stories are demonstrably satisfied, with manual criteria recorded where no automation exists
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* Option A is too weak for a feature whose correctness lives in physics that compiles perfectly while being wrong. Option B is nearly sufficient but omits the one thing the approved stories deliberately added: 17 manual verification criteria covering drag, keyboard, reduced motion, mobile, and audio, which exist precisely because no automation covers them. If unit completion ignores those, `NFR-CB-26` becomes a stated gap with no mechanism behind it.

## Question 3
How should the deferred Functional Design decisions be distributed across units?

A) Resolve all 12 deferred decisions up front in one Functional Design pass before any coding
B) Resolve each deferred decision within the unit that owns it, during that unit's Functional Design stage
C) Resolve the cross-cutting ones up front and the rest per unit
X) Other (please describe after [Answer]: tag below)

[Answer]: C

*Rationale:* Most deferred decisions are unit-local and should be made with that unit's code in view, which argues against option A. But three are genuinely cross-cutting and would cause rework if decided late: the numeric bounds that both `E1` validation and `D2` memoization depend on, the short-circuit resistance threshold that the engine and the fault UI share, and how `faultCount` is constrained given it cannot be server-reconstructed. Those three belong to U2's Functional Design and NFR Requirements, since U2 is on the critical path and every later unit consumes its output.

---

## Section B: Execution Checklist

- [x] 1.1 Define the seven units with scope, responsibilities, and package ownership
- [x] 1.2 Assign each unit a delivery stage and relative size
- [x] 1.3 Define per-unit completion criteria per Question 2
- [x] 1.4 Assign the three cross-cutting deferred decisions to U2
- [x] 1.5 Write `circuit-builder-unit-of-work.md`
- [x] 2.1 Build the unit dependency matrix
- [x] 2.2 Identify the critical path and parallelization opportunities
- [x] 2.3 Document coordination points and the rollback posture per unit
- [x] 2.4 Write `circuit-builder-unit-of-work-dependency.md`
- [x] 3.1 Map all 39 stories to units
- [x] 3.2 Verify every story is assigned to exactly one unit
- [x] 3.3 Map requirements coverage per unit
- [x] 3.4 Write `circuit-builder-unit-of-work-story-map.md`
- [x] 4.1 Validate unit boundaries against the component groups from Application Design
- [x] 4.2 Confirm no story is orphaned and no unit is empty
- [x] 4.3 Update `aidlc-docs/aidlc-state.md` and log in `aidlc-docs/audit.md`

## Mandatory Artifacts

- [x] `circuit-builder-unit-of-work.md` with unit definitions and responsibilities
- [x] `circuit-builder-unit-of-work-dependency.md` with dependency matrix
- [x] `circuit-builder-unit-of-work-story-map.md` mapping stories to units
- [x] Unit boundaries and dependencies validated
- [x] All stories assigned to units

**Note**: Code organization strategy is not documented here because this is a brownfield project. Units map onto existing package structure rather than defining a new layout.
