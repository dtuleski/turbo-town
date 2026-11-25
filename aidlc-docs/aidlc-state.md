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
- **Total Stages**: 11 stages (6 INCEPTION + 5 CONSTRUCTION per unit Ã— 9 units + 1 Build and Test)
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
  - [~] Unit 4: Game Service (DESIGN COMPLETE - Functional âœ…, NFR Requirements âœ…, NFR Design âœ…)
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
  - âš ï¸ PRODUCT DECISION (defaulted): sandbox has NO tier check, only the setup page redirects Free users. Reachable by direct URL; cannot be server-gated (local-only by FR-CB-31). Alternative worth considering: make the sandbox a deliberate free demo and gate only guided Start.
  - âš ï¸ Level design risk R10: cb-03 (no buzzer) and cb-06 (no return wire) shortcuts out-score the reference solution.
  - Not executed: manual playthrough M-U4-1..11, Vercel build, full-tree ESLint
- [x] U5 Platform Quality (COMPLETE - APPROVED on pass 2)
  - 21 files / 411 tests, `tsc` clean - verified independently
  - Review caught: audio unlocked on mouse-move (would kill audio on Safari/Firefox for the session). Fixed + 4 regression tests.
  - âš ï¸ OPEN PRE-LAUNCH ITEM M12: sliders are 24px vs 44px minimum. Test with a finger on a real phone; if unreliable, add 44px -/+ buttons beside each slider.
  - Full-screen mode does NOT enlarge the grid (risk R10).
  - Non-blocking: spark/place/connect cues preloaded but never played; no test ties FaultCode union to faultHelp keys.
- [x] U6 Backend Integration (COMPLETE incl. hardening - both APPROVED)
  - 4 suites / 125 tests pass, `tsc` exits 0 (verified independently); 2 pre-existing broken suites unchanged
  - Resistor exploit CLOSED: protected 2210 > unprotected 2040 at every reported fault count 0-20, margin >= 85
  - Hardening pass 1 was itself flawed (exploit reopened at fault counts >= 3); review loop caught it
  - âš ï¸ U4 CONSTRAINT: do NOT author a level where a valid solve can leave >= 2 unresolved faults (0.60 cap flattens marginal cost)
  - âš ï¸ U4 TODO: add a test over listLevels() pinning the budget-of-7 floor the ranking depends on
  - Production-affecting on merge (deploys MemoryGame-GameService-prod); unreachable until U7 seeds the theme row
- [~] U7 Reporting and Data - split in two
  - [x] U7a backend slice (leaderboard GameType + seed/verify scripts) - APPROVED
    - gameType string match verified from source: game emits 'CIRCUIT_BUILDER' == leaderboard enum
    - leaderboard: 175 pass / same 9 pre-existing failures; `tsc` clean; scripts pass `bash -n`, LF
    - âš ï¸ NO reachable dev environment: only `-prod` themes/catalog tables exist in the reachable account. Seeding is `--prod` only = real go-live.
    - âš ï¸ SEED LAST: after the frontend route is live. Seeding earlier shows a tile leading nowhere. Rollback = delete BOTH rows.
    - ESLint timed out in the unit; leaderboard lint for new files unverified
  - [ ] U7b web registries (api/leaderboard.ts, GameTypeFilter, GAME_FILTER_MAP, PREMIUM_GAMES, routes, display metadata, locales) - waits for U5 (apps/web)

### ðŸš¨ FRONTEND DEPLOYMENT BLOCKED - DECISION MADE, OWNER ACTION PENDING
**Decision: Option A â€” configure Vercel as a monorepo build.** Full rationale and runbook:
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

## Math Rally Feature Workflow (working name was "Math Kart")
- **Requested**: 2026-11-25T14:19:41Z (owner request logged verbatim in `aidlc-docs/audit.md`)
- **Workflow**: wf_629d46831cd3796b; worktree `.worktrees/math-kart`, branch `feat/math-kart` from `origin/main` `c6ccf0f`
- **Target**: kart-racing math game for ages 8 to 16, built once with Phaser 4 in `apps/web` (lazy route) and run in the Flutter app through a WebView with bundled files ("Option A"); Flame only as an owner-decided fallback
- **Name**: "Math Rally" (owner answer Q22, 2026-11-25). Ids `MATH_RALLY`, `math-rally`, `/math-rally/...`, namespace `mathRally`. Inception files keep the `math-kart-` prefix; Construction renames them first (`inception/plans/math-rally-execution-plan.md` Section 8)
- **Extension**: Security Baseline enabled (Q37); design-stage table in `inception/application-design/math-rally-components.md` Section 7, no blocking finding

### INCEPTION PHASE
- [x] Workspace Detection (COMPLETED; brownfield, worktree created from `origin/main`)
- [x] Reverse Engineering (COMPLETED as delta: `inception/reverse-engineering/math-rally-delta-notes.md`)
- [x] Requirements Analysis (COMPLETED, comprehensive)
  - **Questions**: `inception/requirements/math-rally-requirement-verification-questions.md` (40, Q39 and Q40 added in iteration 2; owner answers Q1, Q2, Q6, Q7, Q10 to Q14, Q19 to Q22; owner context Q30, Q37; the rest Recommended, pending owner approval)
  - **Requirements**: `inception/requirements/math-rally-requirements.md` (56 FR, 26 NFR)
  - **Owner decisions of 2026-11-25**: pseudo-3D road; red X plus score effect; 2/3/4 paths; Super Hard 4 paths, 5 s, paid-only; free at launch; manual paid switch with checklist; after a switch Easy stays free for FREE users (server per-difficulty gate, normal shared allowance of 3 plays per 24 h); name "Math Rally"
- [x] User Stories (COMPLETED, standard): `inception/user-stories/math-rally-personas.md` (4 personas), `inception/user-stories/math-rally-stories.md` (28 stories, all 56 FR traced)
- [x] Workflow Planning (COMPLETED): `inception/plans/math-rally-execution-plan.md` (risk High)
- [x] Application Design (COMPLETED)
  - **Plan**: `inception/plans/math-rally-application-design-plan.md` (15 questions, recommendations pending owner approval)
  - **Artifacts**: `inception/application-design/math-rally-{components,component-methods,services,component-dependency,concept}.md`
- [x] Units Generation (COMPLETED): `inception/application-design/math-rally-unit-of-work{,-dependency,-story-map}.md`; 5 units, 28 stories assigned, matrix acyclic
- [x] Design review iteration 1: CHANGES_REQUESTED (1 HIGH, 7 MEDIUM, 11 NIT); iteration 2 revisions made on the requirements side and the design side (responses in `inception/requirements/math-rally-requirements.md` Section 13.1 and `inception/application-design/math-rally-components.md` Section 9)
- [x] Design review iteration 2: CHANGES_REQUESTED (0 HIGH, 1 MEDIUM, 6 NIT); iteration 3 revisions made on the requirements side and the design side (responses in `inception/requirements/math-rally-requirements.md` Section 13.2 and `inception/application-design/math-rally-components.md` Section 10); push of `feat/math-kart` left to the final workflow step
- [x] Design review iteration 3: CHANGES_REQUESTED (0 HIGH, 1 MEDIUM, 5 NIT); iteration 4 revisions made on the requirements side and the design side (responses in `inception/requirements/math-rally-requirements.md` Section 13.3 and `inception/application-design/math-rally-components.md` Section 11): fatal-error guard in the game core and the app page, Back fallback in the app, built-in texture check before `ready`, desktop CSP pass rule with a baseline run; push left to the final workflow step; re-review pending
- [x] Owner approval of the inception package (APPROVED by the owner on the MacBook, recommended answers and the "3 plays per day" interpretation included; see audit.md)

### CONSTRUCTION PHASE (in progress)
- [x] Step 0: renamed the 16 `math-kart-*` docs to `math-rally-*` and updated every link (0 broken links); MK id labels, branch and worktree names kept
- [ ] MR1 Vertical slice and performance gate (FD minimal, NFR Req standard, NFR Design minimal, Code) - gate decides whether MR4 and MR5 proceed
  - [ ] Functional Design: plan with 8 questions at `construction/plans/math-rally-slice-functional-design-plan.md`, waiting for owner answers
- [ ] MR2 Shared race core (FD standard, Code) - can run in parallel with MR1
  - [ ] Functional Design: plan with 8 questions at `construction/plans/math-rally-shared-core-functional-design-plan.md`, waiting for owner answers
- [ ] MR3 Backend: Game Service, Leaderboard, seed scripts (FD minimal, Code) - deploys two prod Lambdas on merge; unreachable until the seed
- [ ] MR4 Web game and host (FD standard, NFR Design minimal, Code)
- [ ] MR5 App host (FD standard, NFR Req minimal, Code) - iOS steps on the owner's Mac
- [ ] Build and Test (once, after MR5; pre-launch checks PL1 to PL8, PL8 freezes protocol v1 at the launch commit)
- Infrastructure Design: SKIP for all units (no cloud resource change)

### Open Items Carried Into Construction
- Unverified: U1 to U7 (Phaser 4 version, size, Canvas fallback, `blob:` use; WebView plugin features; WebView frame rate), U13 (Flutter on this Windows machine), U14 (prod tables), U15 to U17 (Vite JSON tree-shaking, CSP `'self'` on a custom scheme, Vercel static files before the SPA rewrite), U18 (Android platform-view composition mode and its frame-rate effect), U19 (Phaser loader and iOS custom-scheme response status; Phaser 4's default local schemes), U20 (Phaser 4 boots under the app page's enforced `img-src 'self'` and `style-src 'self'` with its built-in textures from bundled files; whether it boots without one), U21 (whether an uncaught exception ends Phaser 4's frame loop; the fatal-error guard does not depend on it)
- Error handling (iteration 4): the game core has its own top-level handler (fatal-error guard in G1, installed first on the app page by G16) because the web app's React error boundary covers render errors only and `apps/web/src` has no window-level error listener; the app's Back opens the leave confirmation if the game does not confirm a pause within 1 s. Stated limit: a hang without an error is not detected (on iOS the player closes the app)
- Pre-existing SECURITY-03 debt (not Math Rally scope, no change in v1): the Game Service handler's catch block (`services/game/src/handlers/game.handler.ts` line 151, `handleRequest`) logs every failed operation of every game at error level with `operationName`, `userId` and `username`, domain refusals included, so Math Rally refusals also write that line
- Scoring and fairness (iteration 2): score from the server's correct count only; fork and race times checked against the shared kinematics for the given answers; race rules frozen per protocol version after launch, clients send `mathRallyProtocol` to `startGame`
- Release order: Leaderboard and Game Service, then web, then app, seed last (`inception/application-design/math-rally-unit-of-work-dependency.md` Section 3)
- Quest Map: no node in v1; a World 1 node after a paid switch would first need the quest validator to honour the Easy-only exception (backlog)

## Quest Map v1 Feature Workflow
- **Requested**: 2026-10-30 ("can you spec out your recommendation for V1?")
- **Last Updated**: 2026-11-01 (second inception revision after design review: prod deploy path no longer lets CDK replace Game Lambda code, idempotent boss legs, hub card always shown, optional QuestService injection)
- **Status**: INCEPTION complete (documentation only). Awaiting owner approval to enter CONSTRUCTION. No application code changed, nothing committed, pushed or deployed.
- **Branch note**: working tree is on `fix/circuit-builder-max-score-8000`; Quest Map docs are uncommitted.
- **Security Baseline (Quest Map)**: Enabled, enforced on new design; compliance table in `quest-map-components.md` Section 5; no blocking finding.

### INCEPTION (Quest Map v1)
- [x] Workspace Detection (reused)
- [x] Reverse Engineering (reused, HEAD a328c74)
- [x] Requirements Analysis (APPROVED 2026-10-30: 19 FR, 14 NFR, 13 questions)
  - `aidlc-docs/inception/requirements/quest-map-requirements.md`, `quest-map-requirement-verification-questions.md`
- [x] User Stories, minimal (3 personas, 15 stories; plan `plans/quest-map-story-generation-plan.md`)
  - `user-stories/quest-map-personas.md`, `quest-map-stories.md`
- [x] Workflow Planning (`plans/quest-map-execution-plan.md`; risk Medium)
- [x] Application Design (`plans/quest-map-application-design-plan.md`; `application-design/quest-map-components.md`, `quest-map-component-methods.md`, `quest-map-services.md`, `quest-map-component-dependency.md`)
- [x] Units Generation (`application-design/quest-map-unit-of-work.md`, `quest-map-unit-of-work-dependency.md`, `quest-map-unit-of-work-story-map.md`; merged unit plan lives in the application design plan)

### CONSTRUCTION (Quest Map v1) - PLANNED
- [x] QM1 Shared Quest Core (`packages/shared`): Functional Design standard, Code Generation (COMPLETED, reviewer APPROVED, pushed feat/quest-map c29c427, no PR yet). Merge redeploys 3 Lambdas (additive only)
- [x] QM2 Backend and Table (`services/game`, `infrastructure`): Functional Design minimal, Infrastructure Design minimal, Code Generation (COMPLETED, reviewer APPROVED, pushed feat/quest-map 1a993c5, no PR yet; prod steps NOT executed). Release: Merge first (quest fails closed), then `cdk diff` and `cdk deploy MemoryGame-Database-prod --exclusively` (table only), IAM by `put-role-policy`, env var by read-merge-write, then `./scripts/deploy-game-lambda.sh prod` (only Game Lambda code deploy). Never `deploy.sh prod`, `--all` or `cdk deploy MemoryGame-Lambda-prod` (live handler is `dist/index.handler`, CDK declares `handler`; O3)
- [x] QM3 Web Map and Launch (`apps/web`): Functional Design minimal, Code Generation (COMPLETED, pushed feat/quest-map 08bbe23, no PR yet; review pending). Deploy only after QM2 is live in prod; hub card always shown (FR-QM-16); O2 resolved before merge
- [x] QM4 Rewards and Polish (`apps/web`): Code Generation (COMPLETED, pushed feat/quest-map 636248b, no PR yet; review pending)
- [x] Build and Test (DONE after QM4 and the QM-FIX defect fix a2ad57b, reviewer APPROVED). Summary: `aidlc-docs/construction/build-and-test/quest-map-build-and-test-summary.md`. shared 534 tests, game 214 (+2 baseline suites fail to run), web 833, tsc and builds pass.
- **PR**: https://github.com/dtuleski/turbo-town/pull/26 (base main, head feat/quest-map). NOT merged. DO NOT MERGE until the backend prod steps are done.
- **Operations readiness**: Quest Map is NOT ready for Operations. Still required: owner-run prod steps (backend Lambda code, quest table, IAM policy, env var `QUEST_PROGRESS_TABLE_NAME`), pre-launch checks PL1 to PL6, and the manual browser checks (QM3, QM4, PL5). Only then merge the PR.
- NFR Requirements and NFR Design: SKIP for all units (rationale in the execution plan)

### Assumptions Resolved at Inception
- **U1 launch contract**: URL parameter `quest=<worldId>:<nodeId>:<legIndex>`, read once in `apps/web/src/api/game.ts`. Two central rules cover all 13 pages: R1 (in `startGame`, a failed quest start redirects to the map and never returns to the page, fixing hub/setup-page redirects and Scratch Coding unscored play) and R2 (in `ScoreBreakdownModal`, quest mode hides "Play again" and owns every close path). R1 also returns `canPlay: true` for a valid quest start so the last allowed play works on Bond and Burn, Traffic Lab, Mini Golf and Circuit Builder (they read `canPlay`). Only Memory Match (URL fallback) and Circuit Builder (result buttons) are edited.
- **U4 infrastructure deploy**: CI never runs CDK; infrastructure is deployed by hand. The CDK `LambdaStack` declares `handler: 'handler'` but the live Game Lambda runs `dist/index.handler` (set by `deploy-game-lambda.sh`), which `cdk diff` cannot see; a CDK deploy of the Lambda stack would break prod until the script re-runs. Decision: CDK for the Database stack only, CLI for env var and IAM, script for code. Whether live prod stacks are CDK-managed is NOT verified (O1).
- **U7 modal props**: no slot for extra actions; resolved with a result store read by the modal plus rule R2 for `onPlayAgain` and `onClose`.
- **U6 theme rows in prod**: not resolvable from code; pre-launch check PL1.

### Open Items (Quest Map v1)
1. **O1**: Confirm the prod Database stack in account 342278407349 is CDK-managed (read-only `cdk diff MemoryGame-Database-prod`, owner approval). Else create the table with `aws dynamodb create-table`.
1b. **O3**: Reconcile the CDK Game function handler/bundling with the live `dist/index.handler` before anyone deploys `MemoryGame-Lambda-prod`.
2. **O2**: Whether Vercel also builds on merge to `main` via Git integration (no workflow shows it).
3. **PL1 to PL6**: theme rows, catalog ids, threshold calibration from real percentiles, `cdk diff`, manual accessibility/mobile/reduced-motion pass, node duration playtest.
4. **Requirements text correction**: Q2 quotes `RATE_LIMITS` from `packages/shared`; the server enforces `RateLimiterService.getTierLimit` (LIGHT 20, STANDARD 100, PREMIUM 1000). FREE is 3 in both. Decision unchanged.
5. **NFR-QM-4 gap**: the existing `localeCompleteness.test.ts` checks only the `circuitBuilder` block; QM3 adds a quest block test.
6. **U8 / U9 / U2 / U3 / U5**: U5 resolved (new read-only `getUsage`); U2, U3, U8 still unverified; U9 (Flutter) out of scope.
7. **Carried from Circuit Builder**: `apps/web` has no `@memory-game/shared` dependency and the Vercel monorepo setting is unverified; Quest Map web adds no new dependence on it. `apps/web` has no `@types/node`; the quest-themes test uses a Vite `?raw` import (fallback: pinned dev-only `@types/node`).
