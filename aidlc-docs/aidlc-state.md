# AI-DLC State Tracking

## Project Information
- **Project Type**: Brownfield
- **Start Date**: 2026-03-01T00:00:00Z
- **Current Stage**: CONSTRUCTION - Per-Unit Loop (Circuit Builder), U1 and U2 in progress
- **Last Updated**: 2026-10-29T19:24:00Z
- **Session Status**: Active - INCEPTION complete; U1 and U2 running in parallel under standing auto-approval
- **Standing approval**: Granted 2026-10-29. Stage gates suspended for this session. Production deploy still requires explicit confirmation.

## Workspace State
- **Existing Code**: Yes
- **Reverse Engineering Needed**: Yes - current artifacts required
- **Workspace Root**: C:\Users\diego.tuleski\Documents\kiro\turbo-town

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Documentation**: aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| Security Baseline | Yes | Requirements Analysis |
| Security Baseline (Circuit Builder feature) | Yes | Requirements Analysis 2026-10-29 (Q4=A) |

### Circuit Builder Security Scope Decision (Q1=B)
Pre-existing non-compliant rules accepted as in-scope prerequisite remediation:
- SECURITY-04 (HTTP security headers)
- SECURITY-05 (bounded input validation)
- SECURITY-09 (stop rendering client stack traces / misconfiguration)
- SECURITY-11 (trustworthy score/result contract)
- SECURITY-15 (fail-closed exception handling)

Pre-existing non-compliant rules explicitly accepted as deferred debt for this feature
(baseline still enforced on all NEW Circuit Builder code):
- SECURITY-01, SECURITY-03, SECURITY-06, SECURITY-08, SECURITY-10, SECURITY-12, SECURITY-13, SECURITY-14

## Execution Plan Summary
- **MVP Scope**: Web application only (responsive design for desktop, tablet, mobile browsers)
- **Future Release**: iOS and Android mobile applications (Flutter)
- **Total Stages**: 11 stages (6 INCEPTION + 5 CONSTRUCTION per unit × 9 units + 1 Build and Test)
- **Stages to Execute**: Application Design, Units Generation, Functional Design (per unit), NFR Requirements (per unit), NFR Design (per unit), Infrastructure Design (per unit), Code Planning (per unit), Code Generation (per unit), Build and Test
- **Stages to Skip**: None - all stages will execute due to project complexity
- **Estimated Timeline**: 12-16 weeks (reduced from 16-22 weeks)

## Stage Progress
- [x] INCEPTION - Workspace Detection (COMPLETED)
- [x] INCEPTION - Requirements Analysis (COMPLETED)
- [x] INCEPTION - User Stories (COMPLETED)
- [x] INCEPTION - Workflow Planning (COMPLETED)
- [x] INCEPTION - Application Design (COMPLETED)
- [x] INCEPTION - Units Generation (COMPLETED)
- [~] CONSTRUCTION - Per-Unit Loop (IN PROGRESS - 35% Complete)
  - [x] Unit 1: Shared Components (COMPLETED - Code generated)
  - [~] Unit 2: Infrastructure (CORE COMPLETE - Database Stack + docs, remaining: 6 stacks)
  - [x] Unit 3: Authentication Service (CODE GENERATED - Tests pending)
  - [~] Unit 4: Game Service (DESIGN COMPLETE - Functional ✅, NFR Requirements ✅, NFR Design ✅)
  - [ ] Unit 5: Leaderboard Service
  - [ ] Unit 6: Payment Service
  - [ ] Unit 7: CMS Service
  - [ ] Unit 8: Admin Service
  - [ ] Unit 9: Web Frontend
  - [ ] Unit 10: Admin Dashboard
- [x] CONSTRUCTION - Build and Test (docs complete; U7b done; NOT ready for Operations: go-live gates open)

## Circuit Builder Feature Workflow
- **Requested**: 2026-10-29T17:42:59Z
- **Target**: Responsive web mini-game integrated into dashden.app
- [x] INCEPTION - Workspace Detection (COMPLETED)
- [x] INCEPTION - Reverse Engineering (COMPLETED - approved by user 2026-10-29, Option B)
  - **Artifacts Location**: aidlc-docs/inception/reverse-engineering/
  - **Analyzed HEAD**: a328c74
  - **Security Baseline result**: 1 Compliant, 1 N/A, 13 Non-compliant (all pre-existing)
  - **Approval**: Option B - fix blockers (Leaderboard build + chosen security subset) before Circuit Builder code
- [x] INCEPTION - Requirements Analysis (COMPLETED - depth: COMPREHENSIVE, awaiting user approval)
  - **Questions**: aidlc-docs/inception/requirements/circuit-builder-requirement-verification-questions.md (26 answered, approved 2026-10-29)
  - **Requirements**: aidlc-docs/inception/requirements/circuit-builder-requirements.md
  - **Counts**: 45 functional requirements, 28 non-functional requirements, 3 prerequisite work items
  - **Security**: No blocking finding; scoped remediation set recorded under Extension Configuration
- [x] INCEPTION - User Stories (COMPLETED - approved by user 2026-10-29)
  - **Assessment**: aidlc-docs/inception/plans/circuit-builder-user-stories-assessment.md (decision: EXECUTE, 5 of 6 high-priority indicators)
  - **Plan**: aidlc-docs/inception/plans/circuit-builder-story-generation-plan.md (12 questions answered, all 65 checklist items [x])
  - **Personas**: aidlc-docs/inception/user-stories/circuit-builder-personas.md (5 personas, standard detail)
  - **Stories**: aidlc-docs/inception/user-stories/circuit-builder-stories.md (39 stories, 6 epics, 26 P0)
  - **Coverage**: all 45 FR, 28 NFR, 3 PRE, 2 VER traced to at least one story
  - **Manual protocol**: 17 criteria marked for manual verification per NFR-CB-26
- [x] INCEPTION - Workflow Planning (COMPLETED - approved by user 2026-10-29)
  - **Plan**: aidlc-docs/inception/plans/circuit-builder-execution-plan.md
  - **Risk level**: High (production Lambda deploy on merge with no rollback stage; broken Leaderboard; CSP blast radius)
  - **Stages**: 12 of 14 execute; Infrastructure Design SKIP; Operations PLACEHOLDER
  - **Units**: 7 preliminary units (U1-U7) across 3 delivery stages
- [x] INCEPTION - Application Design (COMPLETED - approved 2026-10-29)
  - **Plan**: aidlc-docs/inception/plans/circuit-builder-application-design-plan.md (8 questions answered, 41 items [x])
  - **Artifacts**: aidlc-docs/inception/application-design/circuit-builder-{components,component-methods,services,component-dependency}.md
  - **Components**: 19 across 5 groups; dependency matrix verified acyclic
  - **Key decisions**: netlist model, Modified Nodal Analysis solver, stateless shared core, levels in packages/shared, layered canvas, useReducer, audio in apps/web, solar panel with light level
  - **Deferred to Functional Design**: 12 named areas including matrix stamping, fault thresholds, scoring weights, faultCount bounding
- [x] INCEPTION - Units Generation (COMPLETED)
  - **Plan**: aidlc-docs/inception/plans/circuit-builder-unit-of-work-plan.md (21 items [x])
  - **Artifacts**: circuit-builder-unit-of-work{,-dependency,-story-map}.md
  - **Units**: 7 (U1-U7); all 39 stories assigned, 0 orphaned; matrix acyclic; critical path U2-U3-U4

### CONSTRUCTION PHASE - Per-Unit Progress
- [x] U1 Prerequisite Enablement (COMPLETE - review APPROVED, 0 blocking)
  - Leaderboard `tsc --noEmit` exits 0 (was 30 errors) - verified independently by orchestrator
  - Tests 107 -> 164 running, 155 pass; 9 pre-existing failures documented not fixed
  - 4 headers enforcing; CSP ships Report-Only. **SECURITY-04 = PARTIAL, NOT MET** (needs browser verification + 1-line flip; 15-item checklist in apps/web/SECURITY-HEADERS.md)
  - My brief's "numeric 1-4" premise was WRONG; leaderboard string enum was already correct
- [x] U2 Circuit Engine (COMPLETE - review APPROVED on pass 2, 0 blocking)
  - 26 files in packages/shared/src/circuit/; 17 suites / 229 tests pass - verified independently
  - `packages/shared/src/index.ts` diff is +3/-0 - additive-only constraint HELD
  - Wheatstone bridge validated against an independent Thevenin calculation; KCL residual < 1e-12
  - Pass 1 caught 2 real blockers: sources wrongly included in short-circuit path; mutable position reference
- [~] U3 Game Surface (IN PROGRESS - workflow wf_f66f2695028432fd)
- [x] U4 Levels and Learning (COMPLETE - APPROVED on pass 2)
  - 7 new levels (cb-02..cb-08) in packages/shared, additive; each proven solvable with the real engine; all of difficulty 1-4 completable
  - Web 613 tests, shared 363, game circuit 125 - verified independently. Bundle +45 kB gzip (+10%).
  - Voltage shown positive (presentation helper); sliders now hide numbers on Easy/Medium (caught in review)
  - ⚠️ PRODUCT DECISION (defaulted): sandbox has NO tier check, only the setup page redirects Free users. Reachable by direct URL; cannot be server-gated (local-only by FR-CB-31). Alternative worth considering: make the sandbox a deliberate free demo and gate only guided Start.
  - ⚠️ Level design risk R10: cb-03 (no buzzer) and cb-06 (no return wire) shortcuts out-score the reference solution.
  - Not executed: manual playthrough M-U4-1..11, Vercel build, full-tree ESLint
- [x] U5 Platform Quality (COMPLETE - APPROVED on pass 2)
  - 21 files / 411 tests, `tsc` clean - verified independently
  - Review caught: audio unlocked on mouse-move (would kill audio on Safari/Firefox for the session). Fixed + 4 regression tests.
  - ⚠️ OPEN PRE-LAUNCH ITEM M12: sliders are 24px vs 44px minimum. Test with a finger on a real phone; if unreliable, add 44px -/+ buttons beside each slider.
  - Full-screen mode does NOT enlarge the grid (risk R10).
  - Non-blocking: spark/place/connect cues preloaded but never played; no test ties FaultCode union to faultHelp keys.
- [x] U6 Backend Integration (COMPLETE incl. hardening - both APPROVED)
  - 4 suites / 125 tests pass, `tsc` exits 0 (verified independently); 2 pre-existing broken suites unchanged
  - Resistor exploit CLOSED: protected 2210 > unprotected 2040 at every reported fault count 0-20, margin >= 85
  - Hardening pass 1 was itself flawed (exploit reopened at fault counts >= 3); review loop caught it
  - ⚠️ U4 CONSTRAINT: do NOT author a level where a valid solve can leave >= 2 unresolved faults (0.60 cap flattens marginal cost)
  - ⚠️ U4 TODO: add a test over listLevels() pinning the budget-of-7 floor the ranking depends on
  - Production-affecting on merge (deploys MemoryGame-GameService-prod); unreachable until U7 seeds the theme row
- [~] U7 Reporting and Data - split in two
  - [x] U7a backend slice (leaderboard GameType + seed/verify scripts) - APPROVED
    - gameType string match verified from source: game emits 'CIRCUIT_BUILDER' == leaderboard enum
    - leaderboard: 175 pass / same 9 pre-existing failures; `tsc` clean; scripts pass `bash -n`, LF
    - ⚠️ NO reachable dev environment: only `-prod` themes/catalog tables exist in the reachable account. Seeding is `--prod` only = real go-live.
    - ⚠️ SEED LAST: after the frontend route is live. Seeding earlier shows a tile leading nowhere. Rollback = delete BOTH rows.
    - ESLint timed out in the unit; leaderboard lint for new files unverified
  - [ ] U7b web registries (api/leaderboard.ts, GameTypeFilter, GAME_FILTER_MAP, PREMIUM_GAMES, routes, display metadata, locales) - waits for U5 (apps/web)

### 🚨 FRONTEND DEPLOYMENT BLOCKED - DECISION MADE, OWNER ACTION PENDING
**Decision: Option A — configure Vercel as a monorepo build.** Full rationale and runbook:
`aidlc-docs/construction/game-surface/SHARED-ENGINE-IMPORT-DECISION.md`

**Owner action required (cannot be done from this repo):** in Vercel project `web`, set
Root Directory to `apps/web` AND enable "Include source files outside of the Root Directory
in the Build Step". Verify `dev.dashden.app` builds, then repeat for `web-prod`.

**Ordering is critical.** The repo-side change (adding the `file:` dependency + Vite alias and
collapsing the import) is DEFERRED until after the Vercel setting is verified on dev. Doing it
first would break the currently-working production frontend for no benefit, since the frontend
is not deploying Circuit Builder yet.

**Also pending:** `.kiro/steering/deployment.md` says to deploy "from `apps/web/`". If CLI
deploys move to the repo root, that instruction becomes wrong and must be corrected.

**Units U4, U5, U7 can complete without this.** Only frontend DEPLOYMENT is blocked; backend is
unaffected because the Lambda bundler already includes `@memory-game/shared`.

**Original problem:** `apps/web` cannot import `packages/shared` under the current Vercel model.
- Verified: zero references to `@memory-game/shared` or `packages/shared` exist anywhere in `apps/web`. The frontend has never consumed the shared package.
- The deploy procedure runs `vercel --prod` from `apps/web/`, which uploads only that directory. There is no root `vercel.json`, `.vercelignore`, `turbo.json`, or npm `workspaces` field, and `vercel.json` sets `buildCommand`, so Vercel builds from source.
- Consequence: a relative import into `packages/shared/src` resolves locally but will likely FAIL on Vercel.
- **This is a gap in my own Application Design.** `circuit-builder-component-dependency.md` asserts an `apps/web -> packages/shared` contract and marks FR-CB-16 as "Pass". I verified the engine's placement but never that the frontend could consume it.
- Contained: U3 funnels the import through ONE module, so the fix touches one named file.
- **Do not deploy the frontend until this is resolved.**
- Options: (a) reconfigure Vercel as a monorepo build with rootDirectory `apps/web`, (b) publish `packages/shared` to a registry, (c) accept a build-time copy step. Vendoring a duplicate is rejected as it reintroduces the drift FR-CB-16 exists to prevent.

### Open Items Discovered During Construction (NOT Circuit Builder scope)
1. **SECURITY-04 incomplete**: CSP is Report-Only, enforcing nothing. Needs browser verification on dev.dashden.app and dashden.app, then a one-line header rename.
2. **Orphaned scoring config**: `services/leaderboard/src/config/scoring.config.json` is checked in but never imported; `loadConfiguration()` hardcodes a drifted copy. Root cause of 3 related latent defects.
3. **Language Learning multipliers**: BEGINNER/INTERMEDIATE/ADVANCED keys missing, silently falling back to 1.0. Latent (calculateScore has no production caller). Fix would raise scores up to 2x.
4. **Difficulty labels in anomaly.service**: same mismatch; latent, since `updateGameStatistics` has no caller.
5. **Stale auth tests**: 6 failures because the implementation became more secure (real RSA vs mock-signature). Needs a rewrite around an RSA keypair.
6. **No test pins the 8000 score cap** that the U1 change preserved.
7. **`/traffic-sim.html`** is an orphan prototype that the CSP will break; recommend deliberate deletion.

### U2 Non-Blocking Findings Carried Forward
8. **Negative disclosed voltages** (assigned to U4): node voltages referenced to the positive rail.
9. **Zero float margin at the 1.0 ohm threshold**: solar and content-set `internalResistance` reach the boundary.
10. **Overcurrent gap**: a 1 ohm resistor drawing 6 A reports no fault.
11. **`SOURCE_VOLTAGE_STEP`** exported but not enforced.
12. **Stale threshold comments** in `constants.ts` and `faults.ts`.
13. **Two untested contracts**: mid-chain switch in a series chain; stale-switch-key mapping at the facade.
- [ ] CONSTRUCTION - Infrastructure Design (SKIP - no cloud resource changes)
- [x] CONSTRUCTION - Build and Test (docs complete; U7b done; NOT ready for Operations: go-live gates open) (EXECUTE after all units)

### Circuit Builder Extension Status
- **Security Baseline**: Enabled (inherited from Extension Configuration)
