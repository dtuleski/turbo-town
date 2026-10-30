# Circuit Builder - Units of Work

**Created**: 2026-10-29
**Stage**: INCEPTION - Units Generation
**Project type**: Brownfield. Units map onto existing packages; no new code layout is introduced.

**Terminology**: These units are logical groupings of stories for development. They are **not** independently deployable services. The deployable artifacts remain the existing Vercel frontend and the existing Lambdas.

---

## U1 — Prerequisite Enablement

- **Package(s)**: `services/leaderboard`, `apps/web`
- **Stage**: S1 · **Size**: Small · **Blocks**: U7
- **Components**: none new

**Scope**
- Repair the `Difficulty` type mismatch between `services/leaderboard/src/types/index.ts` and `scoring.service.ts`, restoring type-check and tests
- Add required HTTP security headers to the web app
- Remove `error.message` and `error.stack` rendering from the `ErrorBoundary` in `apps/web/src/main.tsx` and ensure error paths fail closed

**Why first**: A game type cannot safely be added to a service that does not compile, and the security fixes are independent of all feature work so they carry no feature risk.

**Completion criteria**
- `services/leaderboard` type-check and tests pass
- All five required headers present
- No stack trace reachable in the user interface
- CSP verified not to break existing pages, including external font loading

**Caution**: CSP has an app-wide blast radius. A policy strict enough to satisfy the baseline can break existing functionality, so verification must cover pages unrelated to Circuit Builder.

*Stories: CB-5.1, CB-5.2, CB-5.3 · Requirements: PRE-1, PRE-2*

---

## U2 — Circuit Engine

- **Package(s)**: `packages/shared`
- **Stage**: S2 · **Size**: Large · **Blocks**: U3, U4, U6
- **Components**: A1 Netlist, A2 Topology, A3 Nodal Solver, A4 Fault Detector, A5 Facade, plus B1-B3 Level Model

**Scope**
- Netlist model with node identity resolution
- Topology resolver collapsing conductors and applying switch state
- Modified Nodal Analysis solver with Gaussian elimination and partial pivoting
- Fault detector covering short circuit, overcurrent, reversed polarity, and singular systems
- Evaluation facade as the single public entry point
- Level definition model, success condition predicates, and target machine model
- Unit and property tests

**Why on the critical path**: Both the browser and the Game Service depend on this. Nothing downstream can be verified until it is correct.

**Cross-cutting decisions owned by this unit** (per plan Question 3)
1. Numeric bounds, including the component and connection ceiling that `NFR-CB-4` implies but never states. Consumed later by `E1` validation and `D2` memo sizing.
2. The short-circuit resistance threshold, shared by the engine and the fault UI.
3. How `faultCount` is constrained, given faults are historical events that a final layout cannot prove.

**Completion criteria**
- Engine is pure with no browser or Node API reference
- Deterministic for identical input
- Property tests pass for connectivity, series versus parallel, and short detection
- Correctly solves a bridge topology, which is the specific case series/parallel reduction cannot handle
- No existing `packages/shared` export is altered

**Caution**: `packages/shared` is a trigger path in `deploy-lambdas.yml`. Merging this unit deploys the Game, Leaderboard, and Email Sender Lambdas even though no backend behavior changes, which is why the additive-only constraint is a completion criterion rather than a guideline.

*Stories: CB-4.3, CB-2.7 · Requirements: FR-CB-9 to FR-CB-16, FR-CB-22, FR-CB-29, FR-CB-30*

---

## U3 — Game Surface

- **Package(s)**: `apps/web`
- **Stage**: S2 · **Size**: Large · **Depends on**: U2 · **Parallel with**: U5
- **Components**: C1 Renderer, C2 Interaction, C3 Effects, C4 Tray, C5 Reducer, D2 Engine Wrapper

**Scope**
- Canvas renderer with logical coordinates, following the `miniGolfPhysics.ts` precedent
- Interaction controller with pointer, touch, tap-fallback, and keyboard paths emitting shared intents
- Effects layer with canvas particles, composited separately
- Component tray with per-level budgets
- Circuit state reducer with discrete actions
- Memoizing engine wrapper

**Completion criteria**
- All eight component types placeable and connectable
- Series and parallel behavior visibly correct on screen
- Pointer and keyboard both drive the same selection state
- Animation frames and listeners cleaned up on unmount
- Manual criteria from CB-2.1, CB-2.2, and CB-2.6 recorded as executed

*Stories: CB-2.1 to CB-2.6 · Requirements: FR-CB-1 to FR-CB-8, FR-CB-13, FR-CB-20, NFR-CB-1 to NFR-CB-4, NFR-CB-9*

---

## U4 — Levels and Learning

- **Package(s)**: `apps/web`, with level data in `packages/shared`
- **Stage**: S2 · **Size**: Medium · **Depends on**: U2, U3
- **Components**: consumes B1-B3; adds D3 Preferences Adapter

**Scope**
- Six to eight guided levels sequencing closed circuit, switch, series, parallel, short-circuit fault, resistance, and variable voltage
- Sandbox mode as a separate session path
- Mars Rover target machine with roles bound to components
- Educational tooltips keyed by stable fault codes
- Progressive numeric disclosure across the four difficulty tiers
- Setup page and game page wiring

**Completion criteria**
- Each concept story demonstrably satisfied, meaning the concept is perceivable, not merely computed
- Series bulbs visibly dimmer than parallel, derived from computed current rather than hard-coded
- Sandbox creates no backend session and consumes no allowance
- Numeric disclosure matches the persona table exactly

*Stories: CB-1.4, CB-1.5, CB-3.1 to CB-3.9, CB-4.1 · Requirements: FR-CB-27 to FR-CB-34, FR-CB-17 to FR-CB-19*

---

## U5 — Platform Quality

- **Package(s)**: `apps/web`
- **Stage**: S2 · **Size**: Medium · **Depends on**: U3 (loosely) · **Parallel with**: U3, U4
- **Components**: D1 Audio Service, D3 Preferences Adapter

**Scope**
- Reusable audio service with gesture unlock, preference handling, and disposal
- Keyboard interaction model for the discrete grid
- Reduced-motion handling with static substitutions
- Mobile full-screen canvas mode
- Complete English, Spanish, and Portuguese content including tooltips

**Completion criteria**
- A full Easy level completable by keyboard alone
- Reduced motion suppresses sparks and celebration while preserving conveyed information
- Audio never outlives the game and fails silently when unsupported
- No English fallback text appears in Spanish or Portuguese
- Manual criteria from CB-6.1, CB-6.2, CB-6.3, CB-6.5, and CB-6.6 recorded as executed

**Note**: Can proceed largely in parallel with U3 because the audio service, localization, and reduced-motion work are independent of canvas internals. The keyboard model is the one part that needs U3's interaction controller in place.

*Stories: CB-6.1 to CB-6.6 · Requirements: NFR-CB-5 to NFR-CB-7, NFR-CB-10 to NFR-CB-18*

---

## U6 — Backend Integration

- **Package(s)**: `services/game`
- **Stage**: S3 · **Size**: Medium · **Depends on**: U2 · **Blocks**: U7
- **Components**: E1 Validator, E2 Re-evaluation, E3 Score Calculator

**Scope**
- Add the theme identifier to `PAID_GAMES`, the authoritative paid gate
- Bounded schema validation for all new inputs, using the numeric bounds set in U2
- Server-side re-evaluation calling the shared engine and shared success predicate
- Three-factor score calculation from verified metrics, returning the existing `ScoreBreakdown` shape
- Add the game to the review aggregation registry
- Theme validation acceptance

**Completion criteria**
- A Free-tier start is rejected even on direct route navigation
- A layout failing the success condition is rejected with no score recorded
- Out-of-bounds and unknown-type submissions rejected before processing
- Rejections return generic errors with no internal detail
- Every failure path fails closed, never producing a partial or default score
- `services/game` type-check and tests pass

**Caution**: This unit is production-affecting on merge. It should be the smallest reviewable change possible and independently revertible.

*Stories: CB-1.1 to CB-1.3, CB-4.2, CB-4.4, CB-4.5 · Requirements: FR-CB-21 to FR-CB-26, FR-CB-35, FR-CB-36, FR-CB-44*

---

## U7 — Reporting and Data

- **Package(s)**: `services/leaderboard`, `apps/web`, `scripts/`
- **Stage**: S3 · **Size**: Small · **Depends on**: U1, U6
- **Components**: none new

**Scope**
- Add the Circuit Builder game type to `services/leaderboard/src/types/index.ts` and `apps/web/src/api/leaderboard.ts`
- Add display metadata to leaderboard filter, History, Achievements, Recent Improvements, Admin Dashboard, and the daily email list
- Add the `GAME_FILTER_MAP` entry with category `Science & Math`
- Add the `PREMIUM_GAMES` entry so the paid badge renders
- Add route constants and register routes
- Registry consistency check
- `scripts/seed-circuit-builder.sh` plus an idempotent verification command

**Completion criteria**
- The tile appears under the `Science & Math` filter with the paid badge
- Scores appear in leaderboard, History, and Achievements
- The registry consistency check passes and fails loudly when an entry is removed
- The catalog and theme verification command passes and is safe to re-run

**Why last**: Registry entries and seeding are only meaningful once the routes and backend exist. Doing them earlier produces a visible tile for a game that cannot be played.

*Stories: CB-4.6, CB-4.7, CB-5.4, CB-5.5 · Requirements: FR-CB-37 to FR-CB-45, VER-1, VER-2*

---

## Summary

| Unit | Package(s) | Stage | Size | Depends on | Stories |
|---|---|---|---|---|---|
| U1 Prerequisite Enablement | leaderboard, web | S1 | Small | — | 3 |
| U2 Circuit Engine | shared | S2 | Large | — | 2 |
| U3 Game Surface | web | S2 | Large | U2 | 6 |
| U4 Levels and Learning | web, shared | S2 | Medium | U2, U3 | 12 |
| U5 Platform Quality | web | S2 | Medium | U3 (loose) | 6 |
| U6 Backend Integration | game | S3 | Medium | U2 | 6 |
| U7 Reporting and Data | leaderboard, web, scripts | S3 | Small | U1, U6 | 4 |
| **Total** | | | | | **39** |

## Per-Unit Completion Standard

Every unit satisfies the standard set in plan Question 2:
1. Code written
2. Type-check passes
3. The unit's own tests pass
4. The unit's stories are demonstrably satisfied, with manual criteria recorded where no automation exists

The fourth item exists because this feature's correctness lives in physics that can compile perfectly while being wrong, and because 17 approved acceptance criteria have no automated coverage by design.
