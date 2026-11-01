# Quest Map v1 - Units of Work

**Created**: 2026-11-01
**Stage**: INCEPTION - Units Generation
**Project type**: Brownfield. Units are logical groupings for development, not new deployable services. Deployable artifacts stay the existing Lambdas, the CDK stacks and the Vercel frontend.
**Basis**: `quest-map-components.md`, `quest-map-stories.md`, plan Q8 to Q10.

Verification commands below come from each package's `package.json` and jest or vitest config as read for this stage. A build was not run (documentation-only stage).

---

## QM1 - Shared Quest Core
- **Package**: `packages/shared` · **Size**: Medium · **Blocks**: QM2
- **Components**: Q1 to Q7

**Scope**
- Types, `QUEST_WORLDS` (2 worlds, 7 regular nodes + boss + bonus each), `questContextSchema`, evaluator, gauntlet rules, config validator
- `PAID_GAME_THEME_IDS` constant (same ids as the local `PAID_GAMES` in `game.service.ts`: SPACE_ENTRY, SCRATCH_CODING, BOND_AND_BURN, TRAFFIC_LAB, MINI_GOLF, LANGUAGE_PRONUNCIATION, CIRCUIT_BUILDER)
- `QUEST_KNOWN_THEME_IDS` constant (allowlist for config validation; the 12 non-card game themeIds plus the Memory Match card theme ids used by legs). It is the union of two exported arrays, `QUEST_CARD_THEME_IDS` and `QUEST_GAME_THEME_IDS`; web compares the card ids with `GAME_THEMES` in QM3
- Gauntlet expiry measured from `lastActivityAt`, evaluated only at leg start (`canStartLeg`); `recordLeg` has no clock check but **is idempotent on `gameId`** (a duplicate leg completion changes nothing); `NodeProgress.lastGameId` supports duplicate detection for the final leg
- Optional `questContext` on the shared `Game` type
- Functional Design settles: threshold numbers per node (seeded as a percentage of each game's achievable score per Q4=B, from `score-calculator.service.ts`), the world-complete rule when the boss itself is unavailable, node ids and map coordinates

**Files**
- New: `packages/shared/src/quest/{types,config,schema,evaluator,gauntlet,validate,index}.ts`, `packages/shared/src/constants/paid-games.ts`, `packages/shared/src/constants/quest-themes.ts`, tests `evaluator.test.ts`, `evaluator.property.test.ts` (fast-check), `gauntlet.test.ts`, `config.test.ts`
- Edited (additive only): `packages/shared/src/index.ts` (`export * from './quest'`), `packages/shared/src/constants/index.ts`, `packages/shared/src/types/entities.ts`

**Completion criteria**
- Evaluator and gauntlet rules are pure (no I/O, no clock); property tests show: lower score never lowers stars or best score, applying a result twice equals once, unlock chain is monotonic
- Config test passes on the real config and has a negative case per validator rule
- Named gauntlet tests: "duplicate non-final leg completion keeps the attempt" and "duplicate final leg completion changes nothing" and "duplicate of a lower-scoring final leg changes nothing and reports `COMPLETE`" (`lastGameId` is set whether or not the result improved)
- No existing `packages/shared` export is altered

**Deploy implications**: `packages/shared/**` is a trigger path of `.github/workflows/deploy-lambdas.yml`. Merging to `main` redeploys the Game, Leaderboard and Email Sender Lambdas with no behavior change. Keep the unit additive.

**Verify**: `cd packages/shared && npx jest && npx tsc --noEmit`

*Stories: QM-8, QM-14 (primary); rules used by QM-4 to 7, 9, 12, 13 · Requirements: FR-QM-1, 2, 5, 10, 11, 12, 13, NFR-QM-5, 12, 13*

---

## QM2 - Backend and Table
- **Package**: `services/game`, `infrastructure` · **Size**: Large · **Depends on**: QM1 · **Blocks**: QM3
- **Components**: B1 to B8, I1 to I3

**Scope**
- Quest progress repository with versioned conditional save; `QuestService`; the `startGame` check and both `completeGame` hooks; `getQuestProgress`; `RateLimiterService.getUsage`; five metrics; `questContext` persisted on the game record
- Replace the local `PAID_GAMES` constant in `game.service.ts` with the shared `PAID_GAME_THEME_IDS`
- `GameService` gets `questService?: QuestService` as an **optional trailing** constructor parameter; `GameHandler` injects it. With no service, a request with `questContext` fails closed (generic quest error, no play consumed); without `questContext` nothing changes
- CDK (declarative record plus dev): table `memory-game-quest-progress-{env}` in `database-stack.ts`, env var `QUEST_PROGRESS_TABLE_NAME` and a separate least-privilege IAM statement in `lambda-stack.ts`. In prod only the Database stack is CDK-deployed; env var and IAM are applied by CLI (see deploy implications). Infrastructure Design task: run `cdk synth` in dev and confirm the Database stack diff is exactly one new `AWS::DynamoDB::Table` plus added Outputs/exports that reference it (expected, not verified: the cross-stack reference from `LambdaStack` should add them)
- A test that every themeId in the config is in `QUEST_KNOWN_THEME_IDS` (the QM1 config test); there is no server-side check against the inline theme arrays in `completeGame`, which stay untouched

**Files**
- New: `services/game/src/services/quest.service.ts`, `services/game/src/repositories/quest-progress.repository.ts`, `services/game/src/utils/quest.ts`; tests under `services/game/tests/unit/`
- Edited: `game.service.ts`, `rate-limiter.service.ts`, `game.handler.ts`, `utils/validation.ts`, `utils/metrics.ts`, `repositories/game.repository.ts`, `types/index.ts`, `services/game/schema.graphql` (reference only)
- Edited: `infrastructure/lib/stacks/database-stack.ts`, `infrastructure/lib/stacks/lambda-stack.ts`, `infrastructure/bin/memory-game.ts`
- Not edited: `index.ts` `validateEnvironment()` (new env var deliberately excluded)

**Completion criteria**
- Rejection matrix test: every invalid start returns the one generic message and consumes no play
- Both `completeGame` exits invoke the hook; non-quest plays take no new I/O
- Two simultaneous completions never lower a result (retry test with a fake repository)
- Existing `services/game` suites pass unchanged and are not edited (FR-QM-19), including the two that call `new GameService(...)` with seven arguments (`tests/unit/services/game.service.circuit.test.ts`, `tests/integration/event-flow.test.ts`); two pre-existing broken suites noted in `aidlc-state.md` stay as they are
- Named tests: "quest context without QuestService fails closed" (generic error, no play consumed); duplicate or concurrent completion of one boss leg keeps the attempt and a duplicate final leg changes nothing

**Deploy implications (U4 resolved; read the warning)**
1. CI (`deploy-lambdas.yml`) does **not** run CDK (verified: it only runs `update-function-code`); infrastructure is deployed by hand. The CDK `LambdaStack` declares the Game function with `handler: 'handler'` (root-level bundle), but the live prod function runs `dist/index.handler`, set out-of-band by `scripts/deploy-game-lambda.sh`. `cdk diff` compares templates, not live configuration, so it cannot detect this. **A CDK deploy of `MemoryGame-Lambda-prod` would make prod game start and completion fail until the script re-runs.** Never run `infrastructure/scripts/deploy.sh prod`, `cdk deploy --all`, `cdk deploy MemoryGame-Lambda-prod` or `--require-approval never` against prod (open item O3).
2. Prod order (commands in `quest-map-unit-of-work-dependency.md` Section 3): merge QM2 (CI deploys code; quest ops fail closed while the env var is unset); `cdk diff` then `cdk deploy MemoryGame-Database-prod --exclusively` (only the new table and its added Outputs/exports); IAM statement by `aws iam put-role-policy` (one table ARN); env var by read-merge-write of the full environment map; `./scripts/deploy-game-lambda.sh prod` as the only Game Lambda code deploy.
3. Open O1: that the live prod stacks are CDK-managed is not verified. If the diff shows anything other than exactly one new `AWS::DynamoDB::Table` (`memory-game-quest-progress-prod`) and added `Outputs`/exports that reference it (any modified or replaced resource, any change to an existing table, or any removed export), stop; the fallback is `aws dynamodb create-table` with the same key schema and settings. Open O3: reconcile the CDK handler/bundling with the live `dist/index.handler` before anyone deploys `MemoryGame-Lambda-prod`. No automated rollback exists; rollback is reverting the commit and redeploying with the script. The table is `RETAIN` and additive, so it can stay.

**Verify**: `cd services/game && npx jest && npx tsc --noEmit`; `cd infrastructure && npm run build` (tsc). `cdk synth` against the new stack code is expected to need account context and is unverified.

*Stories: QM-4, QM-6, QM-7, QM-10, QM-12, QM-13, QM-15 (primary) · Requirements: FR-QM-5 to 11, 17 to 19, NFR-QM-1, 5 to 11, 13, 14*

---

## QM3 - Web Map, Launch and Result
- **Package**: `apps/web` · **Size**: Large · **Depends on**: QM2 (contract frozen earlier allows parallel build) · **Blocks**: QM4
- **Components**: W1 to W8, W11 (core keys)

**Scope**
- `getQuestProgress` client, `quest` start parameter, start-failure rule R1 and result store in `api/game.ts`, launch table and builder for the 13 v1 games, `ROUTES.QUEST_MAP` and route, map page with node panel and plays-left bar, locked World 2 teaser with subscription link, hub card, banner in `AppLayout`, quest section in `ScoreBreakdownModal`, static "new" marker
- Rule R2 in `ScoreBreakdownModal`: in quest mode hide "Play again" and own every close path (navigate to the map; the page's `onClose` is not called)
- Hub card **always rendered** for signed-in users (FR-QM-16, story QM-1); it makes no `getQuestProgress` call and there is no env flag. The release order (web only after the backend and table are live, O2 gating the QM3 merge) is the safety net
- Page edits limited to two: Memory Match URL fallback with theme/difficulty validation (`GamePage.tsx`; `StartGameModal` stays) and Circuit Builder result buttons hidden in quest mode. The other 11 pages are not edited (R1 also returns `canPlay: true` for a valid quest start, so the four pages that read `canPlay` need no edit); per-page behaviour is in `quest-map-components.md` U1
- A web vitest that reads `packages/shared/src/constants/quest-themes.ts` through a Vite `?raw` import and compares its `QUEST_CARD_THEME_IDS` array with `GAME_THEMES`
- Locale keys in en, es, pt plus a locale completeness test for the `quest` block (the existing `localeCompleteness.test.ts` checks only the `circuitBuilder` block, so it does not cover quest keys)

**Files**
- New: `src/api/quest.ts`, `src/utils/questLaunch.ts`, `src/utils/questResultStore.ts`, `src/hooks/useQuestProgress.ts`, `src/pages/quest/QuestMapPage.tsx`, `src/components/quest/*`, `src/locales/__tests__/questLocaleCompleteness.test.ts`, vitest files per module
- Edited: `src/config/constants.ts`, `src/App.tsx`, `src/api/game.ts`, `src/components/layout/AppLayout.tsx`, `src/components/game/ScoreBreakdownModal.tsx`, `src/pages/hub/GameHubPage.tsx`, `src/pages/game/GamePage.tsx`, `src/hooks/useGame.ts`, `src/pages/circuit-builder/CircuitBuilderGamePage.tsx`, `src/locales/{en,es,pt}.json`

**Completion criteria**
- `buildLaunchUrl` yields the documented URL for every one of the 13 table rows (test per row)
- Named tests: R1 for rate-limit, quest-rejected and non-quest errors; "last allowed play in quest mode resolves with `canPlay: true`" for Bond and Burn, Traffic Lab, Mini Golf and Circuit Builder; Scratch Coding unscored play prevented (R1 never resolves, so the page's `catch` cannot run); R2 hides "Play again" and does not call the page's `onClose`; R2 with an empty store; hub card renders for a signed-in user without any quest request
- `tsc --noEmit` passes with the quest-themes test. Checked: `@types/node` is **not** in `apps/web/package.json` nor in `node_modules/@types`, so a node `fs` import would fail type-checking. Decision: the test reads the file with a Vite `?raw` import (needs only `vite/client` types) instead of `fs`. If `?raw` cannot resolve a path outside `apps/web` under vitest, the fallback is a pinned dev-only `@types/node`, the single exception to "no new dependency"; confirm which applies when the test is written
- A hub-launched game shows no banner and no quest section (store cleared on `startGame`)
- MANUAL checklist executed: 320 px layout, keyboard order, node accessible names, reduced motion (U8 means no automated coverage); each of the 13 pages opened once from a node, including a forced start failure and a last-allowed-play start (exactly one play left: the node plays normally, the next start goes to the rate-limit page)
- O2 (does Vercel build on merge to `main`?) is resolved **before** QM3 is merged

**Deploy implications**: Frontend only. No workflow in `.github/workflows/` deploys it. `deployment.md` says to run `npx vercel link --project web-prod --yes && npx vercel --prod --yes` from `apps/web/`, then re-link to `web`. Whether Vercel also builds on merge to `main` through its Git integration cannot be seen from the repo (open item O2); it must be answered before the QM3 merge. Do not deploy before QM2 is live in prod (the hub card is always shown, so release order is the only guard). This unit adds no import of `packages/shared`, so it adds no dependence on the open Vercel monorepo item.

**Verify**: `cd apps/web && npx vitest run && npx tsc --noEmit && npm run build`

*Stories: QM-1, QM-2, QM-3, QM-5, QM-11 (primary); QM-10 (contributes: R1 routing to the rate-limit page) · Requirements: FR-QM-3, 4, 6, 7, 14, 15, 16, 17, NFR-QM-2, 3, 4, 13*

---

## QM4 - Rewards and Polish
- **Package**: `apps/web` · **Size**: Small · **Depends on**: QM3
- **Components**: W9, W10, W11 (badge keys)

**Scope**
- Badge shelf on the map, "World Cleared" and "World Mastered" per world
- Achievements page section reading `getQuestProgress`
- Animated unlock on return to the map, falling back to the static marker under `prefers-reduced-motion` (use `useReducedMotion` from `framer-motion`, already a dependency)
- The Achievements page uses hard-coded English strings today; the new section uses `t()` keys

**Files**: `src/components/quest/BadgeShelf.tsx`, edits to `QuestNodeButton`, `src/pages/dashboard/AchievementsPage.tsx`, locale files, tests

**Completion criteria**: Both badges render locked and earned on both pages; reduced-motion path shows no animation (test with a mocked media query)

**Deploy implications**: Frontend only, as QM3.


*Stories: QM-9 (primary) · Requirements: FR-QM-13, FR-QM-15 AC15, NFR-QM-3, 13*

---

## Pre-Launch Checks (not units; owner approval needed for AWS reads)
| Id | Check | Source of the need |
|---|---|---|
| PL1 | Every themeId in config has a PUBLISHED row in `memory-game-themes-prod` | U6 |
| PL2 | Every `catalogGameId` in config is `ACTIVE` in `memory-game-catalog-prod` | FR-QM-18 |
| PL3 | Calibrate thresholds from real score percentiles (read-only leaderboard data) | Q4=B, U3 |
| PL4 | `cdk diff MemoryGame-Database-prod` (read-only) shows exactly one new `AWS::DynamoDB::Table` (`memory-game-quest-progress-prod`) and only added Outputs/exports that reference it; any modified or replaced resource, change to an existing table, or removed export means stop | U4, O1 |
| PL5 | Manual accessibility, 320 px and reduced-motion pass | NFR-QM-3, U8 |
| PL6 | Playtest node durations are acceptable for ages 8 to 16 | U2 |
