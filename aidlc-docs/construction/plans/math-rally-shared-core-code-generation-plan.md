# MR2 Shared Race Core - Code Generation Plan

This plan is the single source of truth for MR2 Code Generation. Steps run in order; each is ticked when done.

## Unit context

- **Unit**: MR2 Shared Race Core, `packages/shared` only (brownfield; existing files edited in place, additions only)
- **Design**: `construction/math-rally-shared-core/functional-design/` (approved), `inception/application-design/math-rally-component-methods.md` Section 1
- **Stories**: MK-11, MK-12 (primary); MK-4, MK-13, MK-15, MK-19, MK-28 (contributes)
- **Requirements**: FR-MK-8, 12 (constants), 13 to 18, 26 (registry), 30, 55 (function); NFR-MK-22, 23
- **Depends on**: nothing. **Used by**: MR1 (track, layout, motion), MR3 (race build, timing check, gate), MR4 and MR5 (bundled generator for offline races)
- **Tools already present**: `jest`, `ts-jest`, `fast-check` (devDependencies). No new dependency.
- **Constraint**: the `math-rally` folder imports nothing outside itself (no `zod`, no `date-fns`), so `apps/web` can use it through a funnel module.
- **Deploy**: none in this unit. `packages/shared/**` is a trigger path of `.github/workflows/deploy-lambdas.yml`, so merging to `main` redeploys three production Lambdas (no behaviour change). The work stays on `feat/math-kart`; when to merge is the owner's decision.

## Steps

All paths are under `packages/shared/`.

- [ ] **Step 1. Types and exact values** (S3, S4, S6)
  - Create `src/math-rally/types.ts` (difficulty, kinds, question, payload, record, submission, `Exact`, `TrackConstants` with the per-difficulty `approachLength`, `firstQuestionAt`, `mergeToNextQuestion`).
  - Create `src/math-rally/exact.ts`: `INTEGER_OPTION`, `FRACTION_OPTION`, `isCanonicalOption`, `parseOption`, `sameValue`, `formatExact`, plus internal `gcd` and `reduce`.
  - Test `src/math-rally/exact.test.ts`: canonical forms, `-0` and leading zeros refused, 4-character limit, reduction (`2/4` reads as `1/2`), `formatExact` writes integers for whole values.
- [ ] **Step 2. Seeded RNG** (S2)
  - Create `src/math-rally/rng.ts`: `createRng(seed)` (mulberry32, `seed >>> 0`), `nextUint32`, `nextInt`, `pick`, `weightedPick`, `shuffle`.
  - Test `src/math-rally/rng.test.ts`: same seed same sequence; `nextInt` bounds; `shuffle` keeps elements; first values for seed 1 pinned.
- [ ] **Step 3. Protocol registry and v1 parameters** (S1)
  - Create `src/math-rally/v1/params.ts` (Section 4.0 table), `src/math-rally/v1/track.ts` (FD constants, `timingToleranceMs` placeholder 100), `src/math-rally/protocols.ts` (`MATH_RALLY_THEME_ID`, `MR_CLIENT_PROTOCOL = 1`, `MR_SUPPORTED_PROTOCOLS = [1]` frozen, `MATH_RALLY_UPDATE_REQUIRED_MESSAGE`, `protocolSpec(version)`).
  - `protocolSpec` returns null for anything but a registered integer version.
- [ ] **Step 4. Track layout** (S1, FR-MK-8, 11, 12)
  - Create `src/math-rally/track.ts`: `trackLayout(spec, difficulty)` with the FD formulas.
  - Test `src/math-rally/track.test.ts`: the six contracts of the FD business logic model Section 3 for every supported version and difficulty, and the Easy positions of Section 2 (30 600, 36 600, 36 800, 356 400, 371 400).
- [ ] **Step 5. Motion and expected times** (S1, FR-MK-30)
  - Create `src/math-rally/motion.ts`: `initialMotion`, `speedAt`, `advanceMotion` (exact piecewise integration, `0 <= dtMs <= 50` precondition), `applyOutcome`.
  - Create `src/math-rally/timing.ts`: `expectedRaceTimesMs` (closed form, `Math.floor`), `isPlausibleTiming`.
  - Test `src/math-rally/timing.test.ts`: Easy all-correct total about 122.3 s (FD Section 4), null for an unknown version or wrong length, `isPlausibleTiming` edges.
  - Test `src/math-rally/motion.property.test.ts` (AC-30.2): harness with the frame rule, 1000 runs per difficulty, random answers, deltas 1 to 50 ms with 10% from 51 to 500 ms, up to 3 pauses; speed never above `maxSpeed`; no frame carries pause time.
- [ ] **Step 6. Measure and set `timingToleranceMs`**
  - Run the property test with tolerances 10, 20, ... 200 ms; take the smallest that passes, add 50 ms, cap at 250 ms.
  - Write the value into `src/math-rally/v1/track.ts` and into the FD (`domain-entities.md` Section 3.3). If nothing up to 200 ms passes, stop and report (FD Section 5).
- [ ] **Step 7. Question generators** (S3, FR-MK-13, 17, 18)
  - Create `src/math-rally/v1/questions.ts`: kinds and weights per difficulty, one generator per kind with the FD operand rules and slot meanings, bounded redraws (64).
  - Test `src/math-rally/questions.test.ts`: per kind, 1000 draws stay within the FD ranges, answers canonical, no negatives below difficulty 4; weights within 3 points of the target over 10 000 draws.
- [ ] **Step 8. Distractors** (S3, FR-MK-15)
  - Create `src/math-rally/v1/distractors.ts`: the FD rule table, the filter (canonical, distinct value, no negatives below 4, no leading zero), the near-value fallback; `buildOptions` puts the correct option first.
  - Test `src/math-rally/distractors.test.ts`: each rule on worked examples (including `1/2 + 1/4` giving `2/6`, `50` never `05`), AC-15.1 (a rule-based distractor whenever a rule applies), exhaustive small-range fallback cases.
- [ ] **Step 9. Race builder and v1 entry** (S5)
  - Create `src/math-rally/v1/index.ts` (`PROTOCOL_V1`) and `src/math-rally/race.ts` (`buildRace`: kinds, no repeated prompts, options, position placement with no fourth repeat, payload and record).
  - Test `src/math-rally/race.property.test.ts` (1000 seeds per difficulty): determinism (deep equal), lengths, AC-13.1, AC-14.1, AC-15.2, key equals `correctIndex`, version fields; `Math.random` and `Date.now` stubbed to throw.
  - Test `src/math-rally/options.property.test.ts`: options canonical and distinct by value, one correct at `correctIndex`, written as `formatExact(answer)`.
  - Position balance over 10 000 forks per path count: each position within 2 points of `1 / paths`, no run longer than 3 (AC-16.1).
- [ ] **Step 10. Module index and isolation**
  - Create `src/math-rally/index.ts` exporting the public functions and types.
  - Test `src/math-rally/isolation.test.ts`: reads every non-test `.ts` file in the folder and fails on any import that does not start with `./` or `../` inside the folder.
- [ ] **Step 11. Golden fixtures** (freeze rule, NFR-MK-23)
  - Create `scripts/write-math-rally-fixtures.mjs`: reads the built `dist/math-rally`, writes `src/math-rally/__fixtures__/protocol-v1-races.json` (seeds 1 to 25 per difficulty) and `protocol-v1-times.json` (all right, all wrong, two alternating patterns), with `"frozen": false`; refuses to overwrite a file whose `"frozen"` is true.
  - Run `npm run build` then the script; commit both files.
  - Test `src/math-rally/golden.test.ts`: current output deep-equals both fixtures.
- [ ] **Step 12. Free-tier gate** (S7, FR-MK-55)
  - Edit `src/constants/paid-games.ts`: add `FREE_DIFFICULTIES_IN_PAID_GAMES` and `isBlockedForFreeTier` (additive; `PAID_GAME_THEME_IDS` unchanged).
  - Test `src/constants/paid-games.test.ts` (create or extend): launch lists unchanged for every theme; injected paid list with `MATH_RALLY`: difficulty 1 allowed, 2 to 4 blocked.
- [ ] **Step 13. Shared types and package index**
  - Edit `src/types/entities.ts`: optional `mathRally?: MathRallyGameRecord` on `Game`.
  - Edit `src/index.ts`: add `export * from './math-rally';` (one line, additions only). Check for export name clashes with `tsc`.
- [ ] **Step 14. Verify**
  - `npx jest`, `npx tsc --noEmit`, `npm run build` in `packages/shared`; record counts against the baseline.
  - Run the game service build and tests against the new shared build (`services/game`: `npx tsc --noEmit`, `npx jest`), to show the Lambdas that redeploy on merge still build.
  - `git diff` of `src/index.ts` and `src/constants/paid-games.ts` shows additions only.
  - Security Baseline re-check for this unit (SECURITY-03, 04, 05, 08, 09, 10, 11, 13, 15 as listed in the execution plan): expected N/A or compliant (pure functions, no I/O, no secrets, no logging); recorded in the summary.
- [ ] **Step 15. Code summary**
  - Write `aidlc-docs/construction/math-rally-shared-core/code/implementation-summary.md`: files created and edited, test counts, measured `timingToleranceMs`, any FD value changed and why.

## Story traceability

| Story | Steps |
|---|---|
| MK-11 (questions per difficulty) | 7, 9 |
| MK-12 (fair wrong answers) | 8, 9 |
| MK-4 (reading window constants) | 3, 4 |
| MK-13 (protocol registry) | 3, 11 |
| MK-15 (bundled generator for offline races) | 9, 10 |
| MK-19 (motion and expected times) | 5, 6 |
| MK-28 (Easy stays free after a switch) | 12 |

## Size

15 steps, about 25 new files (source, tests, fixtures, one script) and 3 edited files. Medium.
