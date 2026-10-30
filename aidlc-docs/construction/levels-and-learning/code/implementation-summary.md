# Levels and Learning - Implementation Summary

**Unit**: U4 "Levels and Learning" - **Packages**: `apps/web` (primary), `packages/shared` (additive) - **Nothing committed, nothing deployed**

Every figure is from a command run in this unit; the commands and their output summaries are in
`.agents/tasks/u4/verification.md`.

---

## 1. STANDING FRONTEND DEPLOYMENT BLOCK

**Do not deploy the frontend (`apps/web`, Vercel project `web` or `web-prod`) from a tree containing this unit
until the block is cleared.**

`apps/web/src/utils/circuitEngine.ts` imports the shared engine by a relative path
(`../../../../packages/shared/src/circuit`). Whether Vercel can resolve that path when the project root is
`apps/web` is **unverified**; the options and the decision are in
`aidlc-docs/construction/game-surface/SHARED-ENGINE-IMPORT-DECISION.md`. Before U4 the block was latent because
nothing reachable from a route imported the engine. U4 registers `/circuit-builder/setup`, `/circuit-builder/game`
and `/circuit-builder/sandbox`, so the engine is now **reachable** and the production bundle includes it for the
first time (the local build, which does resolve it, grew from 1504 to 1547 modules). A local `npm run build`
passing does not prove the Vercel build passes. No Vercel build or deploy was run in this unit.

Related deploy trigger: `packages/shared` is on the production Lambda deploy path. The change there is additive
(one new file, two added lines in `levels.ts`, one assertion update), and the new level ids become valid
server-side the moment it deploys. That is harmless until U7b seeds the theme row.

---

## 2. What was built

| Area | Delivered |
|---|---|
| Levels | Seven new guided levels `cb-02` to `cb-08` in `packages/shared/src/circuit/guided-levels.ts`, with `cb-01` and `sandbox` unchanged: two per difficulty tier |
| Presentation (Constraint A) | `circuitPresentation.ts`: positive, finite, never `-0` values gated by disclosure tier |
| Rover | `marsRover.ts` (pure role activation) and `RoverPanel.tsx` (inline SVG, non-colour encoding) |
| Fault feedback | `circuitFaultOverlay.ts` (placement math) and `FaultTooltipOverlay.tsx` (non-modal card with Reset fuse) |
| Readout | `CircuitReadout.tsx` rendering the presented circuit per tier |
| Catalog helper | `circuitLevels.ts`: listing, sequence, URL parsing, copy keys |
| Guided session | `circuitGameSession.ts`: idempotent start, settle and single submission, whitelist payload, failure classes, no local score; `useGuidedSession.ts` as the React binding |
| Sandbox | `circuitSandboxSession.ts` plus an import-graph isolation test |
| Pages and routes | Setup, Game and Sandbox pages; three `ROUTES` entries; three routes inside the authenticated layout |
| API types | Additive `CircuitSubmissionInput`, `circuitSubmission?` and result types in `api/game.ts` |
| Locales | 120 new leaf keys per file in en, es, pt, all under `circuitBuilder` (block total 175 per file) |

---

## 3. File inventory (working-tree line counts, measured in this step)

### New - `packages/shared/src/circuit`

| File | Lines |
|---|---|
| `guided-levels.ts` | 135 |
| `guided-levels.test.ts` | 1006 |

### Modified - `packages/shared/src/circuit`

| File | Lines now | Change |
|---|---|---|
| `levels.ts` | 90 | import plus `...GUIDED_LEVELS` (2 added lines, per FEAT-001) |
| `levels.test.ts` | 141 | one assertion, renamed `ships the eight guided levels and the sandbox` |

The whole `packages/shared/src/circuit` directory is untracked in git in this working tree, so `git diff` cannot
show these deltas; the figures are the FEAT-001 report.

### New - `apps/web/src`

| File | Lines |
|---|---|
| `utils/circuitPresentation.ts` | 248 |
| `utils/marsRover.ts` | 67 |
| `utils/circuitFaultOverlay.ts` | 101 |
| `utils/circuitLevels.ts` | 88 |
| `services/circuitGameSession.ts` | 495 |
| `services/circuitSandboxSession.ts` | 19 |
| `hooks/useGuidedSession.ts` | 49 |
| `pages/circuit-builder/RoverPanel.tsx` | 157 |
| `pages/circuit-builder/CircuitReadout.tsx` | 150 |
| `pages/circuit-builder/FaultTooltipOverlay.tsx` | 112 |
| `pages/circuit-builder/CircuitBuilderSetupPage.tsx` | 213 |
| `pages/circuit-builder/CircuitBuilderGamePage.tsx` | 178 |
| `pages/circuit-builder/CircuitBuilderSandboxPage.tsx` | 38 |
| `utils/__tests__/circuitPresentation.test.ts` | 391 |
| `utils/__tests__/marsRover.test.ts` | 90 |
| `utils/__tests__/circuitFaultOverlay.test.ts` | 104 |
| `utils/__tests__/circuitLevels.test.ts` | 103 |
| `utils/__tests__/circuitRecovery.test.ts` | 83 |
| `utils/__tests__/circuitTestLayouts.ts` (helper, not a test file) | 338 |
| `services/__tests__/circuitGameSession.test.ts` | 845 |
| `services/__tests__/circuitSandboxIsolation.test.ts` | 201 |
| `locales/__tests__/circuitLevelCopy.test.ts` | 174 |

### Modified - `apps/web/src` (additive)

| File | Lines now | Change |
|---|---|---|
| `pages/circuit-builder/CircuitBuilderSurface.tsx` | 597 | `onFrame`, `celebrate`, `showRover`, `showReadout`, `CircuitFrame` type, fault overlay inside the canvas, rover and readout in the right column, fault-help status span now `sr-only` |
| `pages/circuit-builder/index.ts` | 3 | `export type CircuitFrame` |
| `utils/circuitEngine.ts` | 301 | export list only; BLOCKING DEPLOYMENT RISK comment unchanged (file is untracked, so no diff available) |
| `api/game.ts` | 459 | +67 lines in `git diff --numstat`; `COMPLETE_GAME`, `completeGame`, `startGame` untouched |
| `App.tsx` | 170 | +6 lines in `git diff --numstat`: three imports, three routes |
| `config/constants.ts` | 101 | `git diff --numstat` shows +4 for the file, which includes another unit's `SOUND_ENABLED`; U4 added three `ROUTES` lines (CRLF kept) |
| `locales/en.json`, `es.json`, `pt.json` | 1091, 1089, 1089 | 120 leaf keys each; `git diff --numstat` shows +237 per file because the tree also holds earlier units' uncommitted locale edits |

Files not touched by U4 despite sitting in the tree: `services/**`, `infrastructure/`, `.github/`, `main.tsx`,
`vercel.json`, `SECURITY-HEADERS.md`, `AppLayout.tsx`, `aidlc-state.md`, `audit.md`.

---

## 4. Test counts, before and after

| Package | Command | Before | After (this step) |
|---|---|---|---|
| `packages/shared` | `npx jest` | 17 suites, 229 tests | 18 suites, 363 tests (+134, all in `guided-levels.test.ts`), 0 failed |
| `apps/web` | `npx vitest run` | 21 files, 411 tests | 30 files, 613 passed, 0 failed, 0 skipped (+202) |
| `services/game` (read-only regression) | `npx jest --testPathPattern=circuit` | 125 tests | 4 suites, 125 passed |

The `apps/web` run passed with two intermediate states recorded by FEAT-002 (28 files, 575 passed, 2 skipped, the
sandbox page cases waiting for the page); the page now exists and they run as hard assertions. The before figures
for each package are the baselines measured at the start of the unit (task context). `services/game` has two
pre-existing failing suites unrelated to this unit; the circuit filter excludes them.

---

## 5. Verification evidence (run in this step)

| Check | Result |
|---|---|
| `packages/shared`: `npx tsc --noEmit` | exit 0 |
| `packages/shared`: `npx prettier --check` on the four touched files | "All matched files use Prettier code style!" |
| `apps/web`: `npm run type-check` | exit 0 |
| `apps/web`: `npm run build` | succeeds; 1547 modules; main chunk 1,707.09 kB, gzip 493.77 kB; only the pre-existing >500 kB warning |
| `apps/web`: `npx eslint` over the circuit files, `--max-warnings 0 --report-unused-disable-directives` | exit 0, no output |
| Locale leaf count under `circuitBuilder` | en 175, es 175, pt 175 |

ESLint over the whole `src/utils` and `src/services`/`pages` paths exits non-zero because of 7 errors in unrelated
files (`codeABotUtils.ts`, `colorByNumberData.ts`, `pronunciationScoring.ts`, `scratchCodingUtils.ts`,
`spaceEntryPuzzles.ts`); that is FEAT-003's finding and was not re-run here. The circuit-scoped run above is clean.

---

## 6. Manual playthrough checklist - RECORDED NOT EXECUTED

No browser was opened and no backend was called in this unit. Every item below is **RECORDED NOT EXECUTED**.

| ID | Check | Status |
|---|---|---|
| M-U4-1 | `/circuit-builder/setup` loads under the authenticated layout; Free tier is sent to subscription | RECORDED NOT EXECUTED |
| M-U4-2 | Each difficulty card explains itself; its levels list; Start opens the game with `?difficulty` and `level` | RECORDED NOT EXECUTED |
| M-U4-3 | Full playthrough of all eight levels with the reference layouts from the functional design; each ends with rover roles active, celebration and the server score modal; network tab shows exactly one `startGame` in dev StrictMode | RECORDED NOT EXECUTED |
| M-U4-4 | One `completeGame` per solve while dragging parts back and forth | RECORDED NOT EXECUTED |
| M-U4-5 | Easy shows no numbers; Medium shows bars without units; Hard shows voltage and resistance; Super Hard shows current, drops and totals; nothing negative | RECORDED NOT EXECUTED |
| M-U4-6 | Short a battery: spark, tooltip at the fault cell, Reset fuse works, attempt not ended, reduced motion respected | RECORDED NOT EXECUTED |
| M-U4-7 | Rover wheels, headlight, buzzer and solar differ between on and off in greyscale | RECORDED NOT EXECUTED |
| M-U4-8 | Sandbox: no `startGame` or `completeGame` in the network tab, no score, no allowance used | RECORDED NOT EXECUTED |
| M-U4-9 | Offline or blocked `completeGame`: banner and Retry, circuit and celebration remain | RECORDED NOT EXECUTED |
| M-U4-10 | es and pt render every new string, no raw keys | RECORDED NOT EXECUTED |
| M-U4-11 | Mobile full-screen toggle with the new rover and readout columns | RECORDED NOT EXECUTED |

What automated tests cover instead: the pure and service layers (levels, presentation, rover activation, fault
overlay math, session, payload, sandbox import isolation, locale copy). Not covered by any automated test, and
unverified: route rendering, focus and selection visuals, SVG appearance, tooltip pixel placement, 44 px targets,
audio and celebration once per solve, StrictMode behaviour in a real browser, the score modal with a circuit
breakdown, i18next count handling for `difficulty.N.levels` (no plural forms exist, so it falls back to the base
key).

---

## 7. Handoff to U7b (not done here)

- Catalog row pointing at `/circuit-builder/setup`
- `GAME_FILTER_MAP` and `PREMIUM_GAMES` entries
- `apps/web/src/api/leaderboard.ts` `GameType` and `GameTypeFilter`
- History, Achievements, Admin and RecentImprovements display metadata
- Hub tile `games.*` translations
- Theme row seed for `CIRCUIT_BUILDER`

---

## 8. Residual risk

| ID | Risk |
|---|---|
| R1 | Frontend deployment block (section 1) |
| R2 | Closed success registry: series versus parallel is taught, not enforced, on cb-03 and cb-04 |
| R3 | The server does not require pre-placed elements to be present: a crafted request can omit a pre-placed switch for a higher score. `services/game` was off limits |
| R4 | An under-reported `faultCount` cannot be verified server-side |
| R5 | No UI to set resistance (M12), so levels use the default 470 ohm only |
| R6 | `ScoreBreakdownModal` shows circuit quality under the label "Accuracy" |
| R7 | No browser coverage for drag, rover SVG, tooltip placement, animation |
| R8 | es and pt copy has not had native-speaker review (M11) |
| R9 | StrictMode idempotence is tested at the service level only |
| R10 | Two fault-free shortcuts out-score the reference: cb-03 dropping the optional buzzer (3087 against 2646) and cb-06 dropping the optional return wire (4685 against 3964). Not asserted; the success predicate does not need those parts |
| R11 | Bundle grew 10.0% gzip with no code splitting |

## 9. Open pre-launch items

1. M12 resistance control (sliders or equivalent) so resistance can be varied in cb-07.
2. Native review of the es and pt copy (M11).
3. Rename or relabel the `ScoreBreakdownModal` "Accuracy" row for circuit quality.
4. Server (U6) to require pre-placed elements in a submission.
5. Owner decision on extending the success-condition registry for topology predicates.
6. Execute the manual checklist in section 6 and verify the Vercel build of the relative engine import before any
   frontend deploy.
