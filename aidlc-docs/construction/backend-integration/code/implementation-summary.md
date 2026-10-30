# Backend Integration - Implementation Summary

**Unit**: U6 Backend Integration (Circuit Builder)
**Package**: `services/game`
**Stage**: CONSTRUCTION - Code Generation
**Repository HEAD at completion**: `a328c74` - unchanged. Nothing was committed, staged,
stashed, pushed, merged, tagged, or deployed. No AWS, Vercel, or Stripe call was made.

---

## PRODUCTION DEPLOYMENT CAUTION - read before merging

`.github/workflows/deploy-lambdas.yml` triggers on a push to `main` that touches
`services/game/src/**` or `packages/shared/**`, and runs:

```
aws lambda update-function-code --function-name MemoryGame-GameService-prod --publish
```

**That job has no test step, no smoke test, no canary, and no rollback.** Merging this unit
ships it straight to the production Game Service Lambda.

Mitigation built into the change, so that the blast radius is as small as it can be:

- The new code is reachable only when `game.themeId === 'CIRCUIT_BUILDER'`. The branch sits
  immediately after the existing in-progress check and returns before any generic logic, so
  the other 23 games cannot enter it. Three tests assert that `MEMORY_MATCH` and `MINI_GOLF`
  still take the generic path, including when a `circuitSubmission` is attached.
- No existing method, constant, or array was altered in behaviour. The only edits to
  pre-existing lines are two string-array additions and one import line.
- The theme row does not exist in DynamoDB yet, so a real player cannot start the game until
  U7 seeds it. Until then the new code is unreachable in production even for a paid user.

**Revert recipe:** delete three new source files and five new test-side files, then undo seven
small hunks (all listed in section 2). Nothing else needs to move.

---

## 1. What was built

| Component | Where | What |
|---|---|---|
| **S4** Entitlement gate | `src/services/game.service.ts` | `'CIRCUIT_BUILDER'` added to `PAID_GAMES` in `startGame`; Free tier refused before the theme is looked up |
| **E1** Layout validator | `src/utils/circuit-validation.ts` (new) | Bounded, `.strict()` validation of the whole submission; never throws; every numeric bound imported from the engine |
| **E2** Re-evaluation orchestrator | `src/services/circuit-reevaluation.service.ts` (new) | Level resolution, difficulty match, shared `evaluate`, shared success predicate, fault clamp; derives verified metrics |
| **E3** Scorer | `src/services/score-calculator.service.ts` | New `calculateCircuitBuilderBreakdown` method; three-factor score; unchanged `ScoreBreakdown` shape |
| **S3** Orchestration | `src/services/game.service.ts` | Theme-guarded branch plus `completeCircuitBuilderGame`, reusing the existing persistence, achievement, metric, and event calls |
| Constants | `src/utils/circuit-builder.ts` (new) | Theme id, the one rejection message, size ceiling, scoring weights. No engine bound is copied here |
| Review registry | `src/services/review.service.ts` | `'CIRCUIT_BUILDER'` added to the fixed `gameTypes` list (FR-CB-44) |
| Input contract | `src/types/index.ts`, `src/utils/validation.ts`, `schema.graphql` | `circuitSubmission` declared so it reaches the service instead of being stripped by `z.object` |

---

## 2. Per-file changes

### New source files (3)

| File | Lines |
|---|---|
| `src/utils/circuit-builder.ts` | 104 |
| `src/utils/circuit-validation.ts` | 276 |
| `src/services/circuit-reevaluation.service.ts` | 108 |

### New test files (4) plus one fixture module

| File | Lines | Tests |
|---|---|---|
| `tests/unit/utils/circuit-validation.test.ts` | 327 | 51 |
| `tests/unit/services/circuit-reevaluation.service.test.ts` | 158 | 11 |
| `tests/unit/services/circuit-score.test.ts` | 235 | 18 |
| `tests/unit/services/game.service.circuit.test.ts` | 428 | 24 |
| `tests/unit/circuit-fixtures.ts` (imported, not a suite) | 91 | - |
| **Total** | | **104** |

### Modified files (7), with exact diff sizes

| File | Added | Deleted | What changed |
|---|---|---|---|
| `src/services/game.service.ts` | 157 | 2 | The two "deleted" lines are the import line, which gained `ValidationError`, and the `PAID_GAMES` line, which gained the theme id. Everything else is the new branch plus `completeCircuitBuilderGame`. |
| `src/services/score-calculator.service.ts` | 91 | **0** | Pure addition: the new method, the new imports, and one module-level `clampRange` helper. No existing line touched. |
| `schema.graphql` | 6 | 0 | Comment documenting the new field. |
| `jest.config.js` | 5 | 1 | **Bug fix, see section 6.** |
| `src/types/index.ts` | 3 | 0 | `circuitSubmission?: unknown` plus a comment. |
| `src/utils/validation.ts` | 3 | 0 | `circuitSubmission: z.unknown().optional()` plus a comment. |
| `src/services/review.service.ts` | 1 | 1 | The `'MATH_MAZE',` line gained `'CIRCUIT_BUILDER'`. |

### Files deliberately NOT changed

- `src/handlers/game.handler.ts` - needs no change. It calls
  `validateCompleteGameInput(input)` and passes the result straight through, then returns
  `scoreBreakdown: result.scoreBreakdown || null`. The new field flows through the existing
  plumbing.
- `src/index.ts` - the pre-existing `JSON.stringify(event)` log is untouched and is not
  reached by a submission rejection (see `nfr-design.md`, section 2).
- `PREMIUM_GAME_THEMES` in either file, the `validateAttempts` skip-list, and the `preAccuracy`
  game-type list. The Circuit Builder branch reaches none of them, so adding the theme id would
  be dead code that reads like a live path.
- `packages/shared`, `apps/web`, `services/leaderboard`, `infrastructure/`, `.github/`,
  `aidlc-docs/aidlc-state.md`, `aidlc-docs/audit.md`.

---

## 3. Exact bounds enforced, and their source

Every engine-sourced value is **imported** from `@memory-game/shared`. None is restated as a
literal in `services/game`.

| Field | Bound | Source |
|---|---|---|
| serialized `circuitSubmission` | at most 65536 chars | **U6, derived** - worst legal payload is about 52 760 chars, so about 24% headroom |
| `levelId` | non-empty, at most 64 chars | `MAX_ID_LENGTH` = 64 |
| `layout.elements.length` | 1 to 64 | `MAX_ELEMENT_COUNT` = 64; lower bound 1 is U6's |
| `layout.connections.length` | 0 to 128 | `MAX_CONNECTION_COUNT` = 128 |
| `gridSize.cols` | integer 2 to 24 | `MIN_GRID_COLS` = 2, `MAX_GRID_COLS` = 24 |
| `gridSize.rows` | integer 2 to 16 | `MIN_GRID_ROWS` = 2, `MAX_GRID_ROWS` = 16 |
| `element.kind` | member of the 8 kinds | `ELEMENT_KINDS` |
| all ids and terminals | non-empty, at most 64 chars | `MAX_ID_LENGTH` = 64 |
| `position.col` / `position.row` | integer 0 to submitted grid minus 1; ceiling 23 / 15 | engine `isInsideGrid`; `MAX_GRID_COLS` / `MAX_GRID_ROWS` |
| `position.rotation` | 0, 90, 180, 270 | `VALID_ROTATIONS` |
| `params` values | finite numbers | engine `NON_FINITE_PARAM` |
| resistor `params.resistance` | 1 to 10000 | `MIN_RESISTANCE` = 1, `MAX_RESISTANCE` = 10000 |
| source `params.internalResistance` | 0 to 10000 | engine `validateParams`; `MAX_RESISTANCE` |
| `environment.sourceVoltage` | finite, 1.5 to 12 | `MIN_SOURCE_VOLTAGE` = 1.5, `MAX_SOURCE_VOLTAGE` = 12 |
| `environment.lightLevel` | finite, 0 to 1 | `MIN_LIGHT_LEVEL` = 0, `MAX_LIGHT_LEVEL` = 1 |
| `switches` values | `open` or `closed` | engine `SwitchState` |
| `switches` key count | at most 64 | derived from `MAX_ELEMENT_COUNT` |
| `completionTime` | integer 1 to 3600, plus the per-difficulty floor of `difficulty * 2` | existing `validateCompletionTime` `maxTime`; existing per-difficulty floor |
| `faultCount` | non-negative safe integer, then clamped to 20 | `MAX_FAULT_COUNT_PER_LEVEL` = 20 |
| unknown keys anywhere | rejected | U6 - every object schema is `.strict()` |

**"Unknown connection kind"** is enforced by `.strict()`, because the engine's `Connection`
type has no `kind` field. A connection carrying an extra discriminator is rejected as an
unrecognized key. Recorded as an interpretation, not an invention.

---

## 4. Scoring weights, and why

```
targetTime      = {1:90, 2:120, 3:150, 4:180}[difficulty] or 120 seconds
speedBonus      = clamp(0.90, 1.15, 1 + 0.15 * (targetTime - t) / targetTime)
budget          = sum of level.availableComponents + level.prePlaced.length   // cb-01 gives 7
efficiencyRatio = clamp(0, 1, (budget - componentCount) / max(1, budget - 2))
cleared         = max(0, faultCount - unresolvedFaultCount)
faultPenalty    = min(0.60, min(0.30, cleared * 0.05) + unresolvedFaultCount * 0.30)
qualityRatio    = clamp(0, 1, efficiencyRatio - faultPenalty)
finalScore      = clamp(0, 8000, round(1700 * difficultyMult * speedBonus * (0.5 + qualityRatio)))
```

| Constant | Value | Reasoning |
|---|---|---|
| `CB_BASE_SCORE` | 1700 | the existing premium-game base, so scores are comparable across games |
| `CB_TIME_WEIGHT` | 0.15 | time spans 0.90 to 1.15, a 1.28x range; quality spans 0.5 to 1.5, a 3x range. Quality therefore has about 2.4x the leverage of speed - the "modest" weighting FR-CB-25 asks for, while speed still breaks ties |
| `CB_SPEED_BONUS_MIN` / `MAX` | 0.90 / 1.15 | keeps a very slow attempt from scoring zero and a very fast one from dominating |
| `CB_TARGET_TIME_BY_DIFFICULTY` | 90 / 120 / 150 / 180 s | U6's judgement, not a requirement. Sits between the existing `SCRATCH_CODING` targets (120/180/240) and `TRAFFIC_LAB` (60/90/120), which bracket a comparable puzzle game. One object to retune after playtesting |
| `CB_MIN_USEFUL_ELEMENTS` | 2 | one source plus one load is the irreducible minimum, so using exactly the minimum scores full efficiency |
| `CB_PER_FAULT_PENALTY` | 0.05 | each short the client reports having cleared costs 5% of the quality factor (FR-CB-24). Gentle because it is the one fault signal the server cannot verify |
| `CB_MAX_HISTORICAL_FAULT_PENALTY` | 0.30 | ceiling on the historical half alone, so a saturated client-reported count can never consume the room the engine-verified penalty needs under the 0.60 total. See section 10 |
| `CB_PER_UNRESOLVED_FAULT_PENALTY` | 0.30 | each fault the ENGINE still finds in the submitted layout. Its MARGINAL cost after netting, 0.25, must exceed what dropping one component buys on efficiency - 0.20 on cb-01's budget of 7 - or an unprotected LED would still out-score the protected solve. See section 10 |
| `CB_MAX_FAULT_PENALTY` | 0.60 | floors the total penalty so a score can never go negative, and makes an absurd reported count score identically to a merely bad one |
| `CB_SCORE_CAP` | 8000 | the same ceiling the generic path applies to premium games and to difficulty 4 |

**Verified by test, as exact integers** (level `cb-01-closed-circuit`, difficulty 1, budget 7):

| | components | faults | time | finalScore |
|---|---|---|---|---|
| A elegant, fault-free, slower | 3 | 0 | 120 s | **2100** |
| B careless, faster | 6 | 3 | 45 s | **1005** |
| C careless, fastest legal | 5 | 1 | 30 s | **1590** |

A out-scores both, which is FR-CB-25. The best legal submission - 2 components, 0 faults,
difficulty 4, 8 s - scores **7289**, below the cap, so the formula is never clipped. The worst
successful submission scores **765**: never zero, never negative. All five figures are
asserted in `circuit-score.test.ts`.

---

## 5. faultCount constraint and residual trust

U2's recommended approach, applied verbatim: **reject** a malformed count rather than coercing
it, **clamp** a merely large one, and **floor** the penalty.

| Direction | Status |
|---|---|
| The submitted final layout is shorted | **Fully verified.** The `noBlockingFault` success clause fails the objective on `SHORT_CIRCUIT` or `SINGULAR_SYSTEM`, so a shorted circuit is always rejected with no score. Covered by a test at both the E2 and the service level. |
| A non-blocking fault is present in the submitted final layout | **Fully verified, and penalized at 0.30 each.** E2 reports `unresolvedFaultCount` off `CircuitResult.faults`, so `faultCount: 0` cannot hide an `OVERCURRENT` or `REVERSED_POLARITY` the engine can see. Added by the hardening pass, section 10. |
| Over-reporting faults | **Bounded.** Clamped to 20 by `clampFaultCount`; the historical penalty saturates at its own 0.30 cap from 6 reported faults upward. `faultCount: 500` scores *exactly* the same as `faultCount: 20` - asserted by equality, so float error cannot make it brittle. |
| Under-reporting faults that were CLEARED during play | **NOT verified, and unprovable from a final layout.** Faults are historical events; a final layout cannot reconstruct them. |

**Quantified residual.** A player who shorted five times, repaired every one, and reports zero
gains at most `5 x 0.05 = 0.25` of `qualityRatio`, hence at most `0.25 x 1700 x 2.5 = 1062`
points - under 13% of the 8000 cap, and only at the highest difficulty. Closing it would
require streaming fault events to the server during play, which is outside this unit's scope.
**This is residual trust, documented, not claimed as verified.** Engine faults close the half
of the problem that is server-knowable and cannot close this half, so the figure stands
unchanged.

---

## 6. Deviation from the plan - one unplanned file

`services/game/jest.config.js` was modified. The plan did not list it, and it is the only edit
outside the planned set.

**Why it was unavoidable.** The mapper read:

```js
'^@memory-game/shared$': '<rootDir>/../shared/src',
```

With `rootDir` = `services/game`, that resolves to `services/shared/src`, **a directory that
has never existed** - the shared package is at `packages/shared`. Any suite importing
`@memory-game/shared` failed to run with
`Could not locate module @memory-game/shared mapped as: .../services/shared/src`. The plan's
baseline section claimed this mapping worked; it does not. The two pre-existing suites never
exposed it because they fail at TypeScript compilation first.

Without this fix, **none** of the required tests could run, since every one of them needs the
engine.

**Why it is safe:**

- `jest.config.js` is test-only configuration. Nothing in `src/` imports it.
- It is outside `services/game/src/**`, so it does not even match the deploy workflow's path
  filter - it cannot reach the production Lambda.
- The target is the shared **source**, matching the pre-existing intent (`/src`, not `/dist`),
  so tests need no build step.
- The bug is pre-existing, dating to the initial commit (`60004f1`).

Recorded as a deviation rather than folded in silently.

---

## 7. Verification

Run from `services/game` unless stated otherwise. A reviewer can read these results without
re-running anything.

### (a) `npx tsc --noEmit` - PASSES

```
exit code 0
```

Confirmed both before any edit (baseline) and after every edit. `tsconfig.json` excludes
`**/*.test.ts`, so this gate covers `src/` only - which is exactly what deploys.

### (b) Test suite - baseline versus after

| | Baseline at `a328c74` | After U6 | After the hardening pass | After the review follow-up |
|---|---|---|---|---|
| Command | `npm test` | `npm test` | `npm test` | `npm test` |
| Test Suites | **2 failed, 2 total** | **2 failed, 4 passed, 6 total** | **2 failed, 4 passed, 6 total** | **2 failed, 4 passed, 6 total** |
| Tests | **0 total** | **104 passed, 104 total** | **121 passed, 121 total** | **125 passed, 125 total** |
| Exit code | 1 | 1 (the two pre-existing failures) | 1 (the same two) | 1 (the same two) |
| Pre-existing TypeScript errors in test files | 25 | **25 - identical** | **25 - identical** | **25 - identical** |

Per-suite figures for the hardening pass, and the evidence behind them, are in
`.agents/tasks/u6-hardening/verification.md`.

Per-file compile-error tally, measured from the run output with ANSI codes stripped:

| File | Baseline | After |
|---|---|---|
| `tests/integration/event-flow.test.ts` | 16 | **16** |
| `tests/unit/services/event-publisher.service.test.ts` | 9 | **9** |
| any other file, including all four new suites | 0 | **0** |

New suites, all passing:

| Suite | Tests |
|---|---|
| `tests/unit/utils/circuit-validation.test.ts` | 51 passed |
| `tests/unit/services/circuit-reevaluation.service.test.ts` | 11 passed |
| `tests/unit/services/circuit-score.test.ts` | 18 passed |
| `tests/unit/services/game.service.circuit.test.ts` | 24 passed |
| `npx jest --testPathPattern="circuit"` | **4 suites passed, 104 tests passed** |

**The two failing suites were deliberately not fixed.** `tests/integration/event-flow.test.ts`
and `tests/unit/services/event-publisher.service.test.ts` fail to compile for reasons entirely
unrelated to Circuit Builder - they call `new RateLimiterService()` and
`new AchievementTrackerService()` with no arguments, call `completeGame` with two arguments
instead of three, assign `null` to a typed optional, index `Entries` on a union AWS SDK input
type, and pass a numeric `difficulty` where a string is declared. Repairing them would mean
rewriting two unrelated test files, which would enlarge a diff that deploys straight to
production with no rollback. The honest baseline is therefore **zero passing tests**, and the
honest result is **104 passing tests with the same two suites failing for the same 25
pre-existing reasons and no third failure**.

### (c) Scope of changes - mine only

`git -C <repo> diff --name-only`, restricted to paths this unit owns:

```
services/game/jest.config.js
services/game/schema.graphql
services/game/src/services/game.service.ts
services/game/src/services/review.service.ts
services/game/src/services/score-calculator.service.ts
services/game/src/types/index.ts
services/game/src/utils/validation.ts
```

Untracked, created by this unit:

```
services/game/src/services/circuit-reevaluation.service.ts
services/game/src/utils/circuit-builder.ts
services/game/src/utils/circuit-validation.ts
services/game/tests/unit/circuit-fixtures.ts
services/game/tests/unit/utils/circuit-validation.test.ts
services/game/tests/unit/services/circuit-reevaluation.service.test.ts
services/game/tests/unit/services/circuit-score.test.ts
services/game/tests/unit/services/game.service.circuit.test.ts
aidlc-docs/construction/backend-integration/functional-design/functional-design.md
aidlc-docs/construction/backend-integration/nfr-requirements/nfr-requirements.md
aidlc-docs/construction/backend-integration/nfr-design/nfr-design.md
aidlc-docs/construction/backend-integration/code/implementation-summary.md
```

**Other units' dirty paths, left untouched and never staged or reverted:**
`aidlc-docs/aidlc-state.md`, `aidlc-docs/audit.md`, `apps/web/src/main.tsx`,
`apps/web/vercel.json`, `apps/web/src/locales/en.json`, `packages/shared/package.json`,
`packages/shared/package-lock.json`, `packages/shared/src/index.ts`,
`services/leaderboard/src/services/{leaderboard,scoring}.service.ts`, four
`services/leaderboard/tests/*` files, and the untracked `.agents/`,
`aidlc-docs/construction/{circuit-engine,prerequisite-enablement}/`, the
`aidlc-docs/inception/` Circuit Builder documents, `apps/web/SECURITY-HEADERS.md`,
`apps/web/src/utils/circuitBuilder*`, and `packages/shared/src/circuit/`.

Note: `apps/web/src/locales/en.json` appeared as modified *during* this unit's work. It is the
concurrent frontend agent's change, not this unit's - no file under `apps/web` was opened for
writing here.

### (d) Nothing committed

```
git rev-parse HEAD  ->  a328c74d99acdb561961ea36fcaa11426840a530
git stash list      ->  (empty)
```

### (e) Forbidden packages untouched by this unit

`packages/shared`, `apps/web`, `services/leaderboard`, `infrastructure/`, and `.github/`
contain no edit from this unit. The engine was consumed through
`import { ... } from '@memory-game/shared'` only. No Circuit Builder `GameType` was added to
the leaderboard, and no frontend registry entry was created - both are U7.

### (f) No existing game behaviour changed

| Evidence | Result |
|---|---|
| `score-calculator.service.ts` diff | 91 added lines, **0 deletions** - no existing scoring line altered |
| Only pre-existing lines replaced anywhere | 3 total: one import line gaining `ValidationError`, one `PAID_GAMES` array literal, one `gameTypes` array literal |
| `MEMORY_MATCH` still takes the generic path | asserted - `baseScore` 1000, client-reported `attempts` 12 persisted, event `gameType` `MEMORY_MATCH` |
| `MINI_GOLF` still takes the generic path | asserted - `baseScore` 1800, event `gameType` `MINI_GOLF` |
| A `circuitSubmission` attached to a non-Circuit-Builder game | asserted ignored; the generic path runs unchanged |
| Free-tier start of a free game | asserted still permitted |
| Generic `calculateScoreBreakdown` output | asserted unchanged for `MEMORY_MATCH` |

### Formatting

`npx prettier --check` passes on all eight new files. Pre-existing files were **not**
reformatted - the repo-wide lint baseline is 6851 problems dominated by `prettier/prettier` on
pre-existing code, so `npm run lint` is not a usable gate and was not used as one.

---

## 8. Required test coverage - where each lives

| Required test | Suite | Result |
|---|---|---|
| Free start rejected for this theme | `game.service.circuit.test.ts` | pass |
| LIGHT / STANDARD / PREMIUM start accepted | `game.service.circuit.test.ts` | pass |
| Too many elements rejected | `circuit-validation.test.ts` | pass |
| Too many connections rejected | `circuit-validation.test.ts` | pass |
| Coordinates outside the grid rejected | `circuit-validation.test.ts`, `game.service.circuit.test.ts` | pass |
| Voltage out of range rejected | `circuit-validation.test.ts`, `game.service.circuit.test.ts` | pass |
| Light level out of range rejected | `circuit-validation.test.ts` | pass |
| Negative completion time rejected | `circuit-validation.test.ts`, `game.service.circuit.test.ts` | pass |
| Unknown element kind rejected | `circuit-validation.test.ts`, `game.service.circuit.test.ts` | pass |
| Unknown connection kind rejected | `circuit-validation.test.ts` | pass |
| Payload over the size ceiling rejected | `circuit-validation.test.ts` | pass |
| Circular payload rejected without throwing | `circuit-validation.test.ts` | pass |
| Layout not satisfying the objective rejected, no score recorded | `circuit-reevaluation.service.test.ts`, `game.service.circuit.test.ts` | pass |
| Valid layout scores correctly | `circuit-score.test.ts`, `game.service.circuit.test.ts` | pass |
| Efficient fault-free out-scores faster careless | `circuit-score.test.ts` | pass |
| faultCount above the clamp is clamped, not honoured | `circuit-reevaluation.service.test.ts`, `circuit-score.test.ts` | pass |
| Every failure path fails closed - no score, no event, no metric | `game.service.circuit.test.ts` (11 causes) | pass |
| Every rejection carries the identical message | `game.service.circuit.test.ts` | pass |
| Spoofed score produces no score | `game.service.circuit.test.ts` | pass |
| The other 23 games are unaffected | `game.service.circuit.test.ts` | pass |

Added by the hardening pass (section 10):

| Required test | Suite | Result |
|---|---|---|
| Protected solve out-scores the unprotected one, exact integers | `circuit-score.test.ts` | pass |
| A fault in the final layout is penalized with `faultCount: 0` | `circuit-score.test.ts`, `circuit-reevaluation.service.test.ts` | pass |
| The penalty takes the larger signal, never the sum | `circuit-score.test.ts` | pass |
| An unprotected solve is still **accepted**, not failed (CB-3.8) | `circuit-reevaluation.service.test.ts` | pass |
| Too many of a kind the level grants rejected | `circuit-reevaluation.service.test.ts`, `game.service.circuit.test.ts` | pass |
| A kind the level does not grant rejected | `circuit-reevaluation.service.test.ts`, `game.service.circuit.test.ts` | pass |
| Coordinates outside the level grid rejected | `circuit-reevaluation.service.test.ts`, `game.service.circuit.test.ts` | pass |
| `MEMORY_MATCH` and `MINI_GOLF` exact scores unchanged | `game.service.circuit.test.ts` | pass |

---

## 9. Residual risk - stated, not hidden

| Risk | Severity | Status |
|---|---|---|
| **Under-reported `faultCount`** cannot be verified from a final layout | Low - bounded at about 1062 points, under 13% of the cap | Documented, not fixed. Fixing needs in-play fault event streaming |
| **Raw request body size** is not bounded before the Lambda parses it | Low | Pre-existing for all 23 games. Bounding it would be a global change on a straight-to-production Lambda |
| **The leaderboard drops the Circuit Builder event until U7** adds the `GameType` | Expected | Deliberate, and the stated reason for the U6-before-U7 ordering. The invocation is async, so the score is still persisted and the player still sees the breakdown |
| **Resubmission after rejection** is permitted | Low | Pre-existing for all games. With one generic message, a retry loop leaks nothing |
| **`attempts: 1` is a placeholder** on the game record and in `performanceMetrics` | Low | Deliberate: overloading it with the component count would mislead the leaderboard's anomaly service |
| **`ScoreBreakdownModal` labels `accuracy` as "Accuracy"**, while for this game it carries circuit quality | Cosmetic | The `ScoreBreakdown` shape is fixed by contract; relabelling is frontend scope (U7). Recorded in a code comment at the field |
| **Target completion times** (90/120/150/180 s) are U6's judgement, not a requirement | Low | One constant object; retune after playtesting |
| **`level.difficulty === game.difficulty`** is a new check that constrains U4's level authoring | By design | Closes a difficulty-multiplier exploit. Written down as a contract in `functional-design.md`, section 3 |
| **The DynamoDB theme row does not exist yet**, so end-to-end `startGame` cannot succeed until U7 seeds it | Expected | U6 makes no AWS call. The gate *ordering* is what CB-1.3 actually asks for, and that is asserted |

### Suspected engine issues

**None found.** `packages/shared` was consumed, not modified. The engine behaved exactly as its
own `implementation-summary.md` documents, including the two behaviours this unit had to
respect:

- `totalCurrent` and `totalResistance` describe the dominant source only, so E3 reads neither.
- A `switchStates` key naming no existing switch element yields `UNKNOWN_SWITCH_ELEMENT` and
  therefore `STRUCTURAL_INVALID`. A drifted client gets a rejection; that strictness is
  deliberate and is covered by a test.

---

## 10. Hardening pass - three fixes, one root cause

A follow-up pass on the reviewed and approved U6 code. **No new file, no new directory, no new
dependency.** The production-deployment caution at the top of this document applies unchanged;
every edit is still inside the theme-guarded Circuit Builder branch.

### The shared root cause

All three findings trace to the same omission: **E3 discarded `CircuitResult.faults`.** E2 held
the authoritative engine result, used it for `componentCount` and for the success predicate,
and then threw the fault list away. Everything followed from that:

- The only fault input to the score was the number the browser sent, so the server trusted the
  client on the one scoring factor it was fully able to compute itself.
- An unprotected LED's `OVERCURRENT` was therefore free. Omitting the resistor improved
  component efficiency at no cost, so the mistake the level exists to teach against out-scored
  the canonical solve.
- The same habit of reading only part of the level and the result showed up in E2, which
  checked `level.difficulty` and ignored `level.availableComponents` and `level.gridSize`.

### Fix 1 - score from the engine's faults (the important one)

`VerifiedCircuitMetrics` gains `unresolvedFaultCount`, set from `outcome.faults.length`. E3
combines the two signals as:

```
cleared      = max(0, faultCount - unresolvedFaultCount)
faultPenalty = min(0.60, min(0.30, cleared * 0.05) + unresolvedFaultCount * 0.30)
```

Three properties, each the answer to a way this combination can fail:

- **Netted, so no fault is charged twice.** A fault present at submission necessarily also
  occurred during the attempt, so it is already inside whatever the client reported. Netting it
  out of the cleared count means reporting a fault honestly costs exactly what hiding it costs
  - `faultCount: 1` with one unresolved fault scores the same 2040 as `faultCount: 0` with one.
- **Summed, not maximised.** The first version of this pass took `max(historical, verified)`.
  That kept the *absolute* penalty honest but let the historical signal absorb the verified
  one: the marginal cost of leaving a fault in the layout was `0.30 - 0.05 * faultCount`,
  which hits zero at a reported count of 6, so the resistor exploit reopened from a reported
  count of 3 upward. Summing the netted terms holds that marginal cost flat at 0.25.
- **Capped separately.** A single 0.60 ceiling over the sum reproduces the inversion at high
  counts, because both halves saturate it and the verified fault becomes free again. Capping
  the historical half at 0.30 leaves exactly one verified fault's worth of room under the
  total, so the verified penalty always survives the ceiling.

Neither signal can hide the other, in absolute or in marginal terms: a client reporting
`faultCount: 0` still pays 0.30 for every fault the engine finds, an honestly reported pile of
cleared faults still costs its historical penalty on a spotless layout, and at no reported
count does either term absorb the other's marginal cost. Full reasoning in
`functional-design.md`, section 4.

The historical signal is deliberately **kept** at 0.05. FR-CB-24 asks for a penalty per short
incurred, and a short that was genuinely repaired leaves nothing in the final layout to
re-derive. Section 5's residual-trust analysis is therefore preserved verbatim, including the
1062-point figure - engine faults close the server-knowable half of the problem and cannot
close the other half. Claiming otherwise would be the dishonest version of this fix.

### Fix 2 - the protective-resistor exploit, with the numbers

`cb-01-closed-circuit`, difficulty 1, both at 90 s so `speedBonus` is exactly 1.000 and the
ranking is decided by circuit quality alone:

| | components | efficiency | unresolved faults | penalty | quality | accuracyBonus | score before | score after |
|---|---|---|---|---|---|---|---|---|
| protected: battery + 470 ohm resistor + LED | 3 | 0.80 | 0 | 0.00 | 0.80 | 1.30 | 2210 | **2210** |
| unprotected: battery + LED | 2 | 1.00 | 1 `OVERCURRENT` | 0.30 | 0.70 | 1.20 | 2550 | **2040** |

Before: the unprotected solve scored **15.4% more** than the protected one. After: the
protected solve wins by 170 points, **8.3%**. Both rows are scored through the production path
in the test - E1, then E2's engine re-evaluation, then E3 - so the fault count is the engine's
own, not a hand-written metrics object. The old 2550 figure is also asserted, so the defect
cannot return unnoticed.

Both rows above report `faultCount: 0`. The ranking also has to hold at every other reported
count, since the historical penalty applies to both layouts. Every integer here is asserted:

| reported `faultCount` | protected | unprotected | margin |
|---|---|---|---|
| 0 | **2210** | 2040 | +170 |
| 1 | **2125** | 2040 | +85 |
| 2 | **2040** | 1955 | +85 |
| 3 | **1955** | 1870 | +85 |
| 6 | **1700** | 1615 | +85 |
| 7 | **1700** | 1530 | +170 |
| 12 | **1700** | 1530 | +170 |
| 20 (the clamp) | **1700** | 1530 | +170 |

The arithmetic behind the 85-point floor: one component is worth `1 / max(1, budget - 2)` of
the quality factor, which is 0.20 on cb-01's budget of 7. The marginal cost of leaving the
`OVERCURRENT` in the layout is `0.30 - 0.05 = 0.25` after netting. The 0.05 difference times
the 1700 base is 85. Because that marginal cost is 0.25 rather than the bare 0.30, the
**contract for U4's level authoring** tightened from a budget of 6 to a budget of **7** - at 6
the two solves tie, below 6 the unprotected one wins again. Written up in
`functional-design.md`, section 4; `cb-01-closed-circuit` grants 7.

**`OVERCURRENT` is still non-blocking.** The unprotected solve still completes the level; it
just scores less (FR-CB-19, CB-3.8 - a fault teaches rather than terminates). A test asserts
E2 **accepts** it, so this cannot drift into a hard failure.

### Fix 3 - the remaining level constraints

E2 now also refuses a layout that uses more of a kind than `level.availableComponents` grants
(a kind the level does not list has an allowance of 0), or that places an element outside
`level.gridSize`. Two new internal rejection reasons, `LEVEL_BUDGET_EXCEEDED` and
`OUTSIDE_LEVEL_GRID`, for server-side logging only - the player still receives the single
generic `CIRCUIT_SUBMISSION_REJECTED_MESSAGE`, so no disclosure oracle is created.

The budget comes from the `LevelDefinition` already in hand, so nothing is duplicated into
`services/game`. `level.prePlaced` is added to the allowance, because a pre-placed element is
supplied by the level rather than drawn from the tray budget - and E3's efficiency budget now
counts `prePlaced` too, so the two halves of the level contract agree. Without that, a level
granting `wire: 2` plus two pre-placed batteries would admit a four-element layout at E2 and
then score `(2 - 4) / max(1, 0)`, clamped to zero efficiency, for every submission including
the ideal one. Both authored levels pre-place nothing, so no score moves today.

Coordinates are *bounded* against the level grid rather than `layout.gridSize` being required
to *equal* it, which leaves a responsive client free to render a smaller canvas. The check runs
before `evaluate`, so an unentitled layout never reaches the solver.
`level.lockedElementIds` is still not enforced, recorded as a gap in `functional-design.md`,
section 2.3.

### Per-file changes in this pass

| File | What changed |
|---|---|
| `src/utils/circuit-builder.ts` | `CB_PER_UNRESOLVED_FAULT_PENALTY = 0.3` and `CB_MAX_HISTORICAL_FAULT_PENALTY = 0.3` added; the doc comment on `CB_PER_FAULT_PENALTY` now says which signal it prices |
| `src/services/circuit-reevaluation.service.ts` | `unresolvedFaultCount` on `VerifiedCircuitMetrics`; two new rejection reasons; `levelConstraintViolation` and `countByKind` helpers |
| `src/services/score-calculator.service.ts` | the fault-penalty expression and the budget expression only. The generic `calculateScoreBreakdown` is untouched |
| `src/services/game.service.ts` | one field added to the existing success log line |
| `tests/unit/circuit-fixtures.ts` | four fixtures: `unprotectedHeadlightLayout`, `overBudgetLayout`, `ungrantedKindLayout`, `outsideLevelGridLayout` |
| `tests/unit/services/circuit-score.test.ts` | the `metrics` helper takes the new count; three new describe blocks |
| `tests/unit/services/circuit-reevaluation.service.test.ts` | two new describe blocks; `unresolvedFaultCount` asserted on existing acceptance cases; the `OVERCURRENT` code asserted off the engine |
| `tests/unit/services/game.service.circuit.test.ts` | three new fail-closed causes; exact `finalScore` assertions for `MEMORY_MATCH` and `MINI_GOLF` |

**Revert recipe for this pass alone:** undo the four `src/` hunks above. No file needs to be
deleted and no other unit's work is involved.

### FR-CB-25's exact integers are unchanged

2100, 1590, and 1005 all still hold, and the assertions were not edited. Each of those rows
submits a layout with **no** unresolved fault, so `cleared = faultCount` and the historical
penalty is `min(0.30, 0.05 * faultCount)`, which equals `0.05 * faultCount` at 3 faults and at
1. The arithmetic is identical to before. 765 and the sub-cap 7289 bound are also unchanged.
Nothing was silently re-baselined.

### One assertion was re-baselined, deliberately and not silently

`charges the larger of the two signals, never their sum` asserted 2040 for
`metrics(componentCount: 2, faultCount: 6, unresolvedFaultCount: 1)` under the `max` rule. That
test asserted the property that caused the inversion, so it was **replaced**, not re-numbered:
`nets the verified faults out of the historical count, charging no fault twice` asserts the
honesty-neutrality pair at 2040 each and the netted mixed case at **1615** - five cleared
faults at 0.05 plus one verified at 0.30 is 0.55, where pricing all six as cleared would have
charged 0.60 and scored 1530. No other existing assertion changed value.

### Proof that no existing game's scoring moved

`ScoreCalculatorService` is shared by all 24 games, so this is the one risk worth proving
rather than asserting.

| Evidence | Result |
|---|---|
| Diff of `score-calculator.service.ts` | **121 insertions, 0 deletions** across three hunks: the import list, the whole new `calculateCircuitBuilderBreakdown`, and the module-level `clampRange`. Not one pre-existing line is touched. `calculateScore`, `calculateScoreBreakdown`, `getDifficultyMultiplier`, `getPairsForDifficulty`, `PREMIUM_GAME_THEMES`, and every per-theme `maxTime` and `baseScore` branch are outside the diff |
| Reachability | `calculateCircuitBuilderBreakdown` is called from exactly one place, `completeCircuitBuilderGame`, which only runs when `game.themeId === 'CIRCUIT_BUILDER'` |
| `MEMORY_MATCH` exact score | asserted at **2217** - difficulty 1, 60 s, 12 attempts - through the full service path, plus `baseScore` 1000 and client-reported `attempts: 12` persisted |
| `MINI_GOLF` exact score | asserted at **3240** - difficulty 2, 60 s, 8 attempts, 4/4 correct - plus `baseScore` 1800 |
| Generic breakdown unit test | the pre-existing `leaves the generic score path untouched` case still passes unchanged |
| `VerifiedCircuitMetrics` | a Circuit-Builder-only type. The new required field cannot reach another game's call path, and `tsc` proves every construction site supplies it |

### Review follow-up - what the second pass changed

The hardening pass was reviewed and returned `CHANGES_REQUESTED` on the combination rule. Five
findings, all addressed inside the same four `src/` hunks:

| Finding | Resolution |
|---|---|
| **Blocking.** `max` let the historical signal absorb the verified one, so the resistor exploit reopened at a reported fault count of 3 or more | The counts are netted and the two penalties are summed. Marginal cost flat at 0.25, asserted across the whole reported range |
| **Blocking.** A single 0.60 ceiling flattened the same ranking at a reported count of 12 or more | The historical half is capped separately at `CB_MAX_HISTORICAL_FAULT_PENALTY = 0.30`, leaving one verified fault's room under the total. Asserted at the clamp: 2040 clean against 1530 faulted |
| `prePlaced` counted as allowance in E2 but not as budget in E3 | E3's budget now adds `level.prePlaced.length`. Zero change on both authored levels, which pre-place nothing; asserted on a synthetic level |
| The engine fault's identity was never asserted | A test reads `evaluate`'s own result on the unprotected fixture and asserts the fault list is exactly `['OVERCURRENT']` on the `led` element |
| The combination rationale omitted the regime where the ranking inverted | Both documents now carry the full reported-count table, including what the superseded `max` rule scored in each row |

One correction to the previous pass's reporting: it recorded `prettier --check` as passing on
`score-calculator.service.ts`. It does **not** pass, and did not at `a328c74` either - the
pre-existing generic method carries a 137-character `PREMIUM_GAME_THEMES` line and two
signatures prettier would re-wrap. The file was left unformatted on purpose: running
`--write` would reformat the generic scoring path that every other game uses, which is exactly
what this work must leave alone. Every line added by Circuit Builder is prettier-conformant,
verified by diffing the formatter's output and confirming no suggested change falls inside the
new method. `circuit-builder.ts` and both test files pass `--check` outright.
