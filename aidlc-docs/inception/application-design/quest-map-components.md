# Quest Map v1 - Components

**Created**: 2026-11-01
**Stage**: INCEPTION - Application Design
**Basis**: `quest-map-requirements.md`, `quest-map-stories.md`, `quest-map-application-design-plan.md` (decisions Q1 to Q7)
**Scope guard**: v1 only. No weekly challenge, lives, brackets or Flutter.

## 0. Overview and Locked Stack

Quest Map adds one pure module in `packages/shared`, one service and one repository in `services/game`, one DynamoDB table, and a map page plus three small hooks into existing screens in `apps/web`. The server computes everything that matters (unlocks, stars, badges, remaining plays) and returns a ready view model, so the web app renders and launches but never decides.

**Stack (locked once approved)**: TypeScript. `packages/shared` and `services/game` use `zod` 3 and `jest` with `fast-check` (already present); `services/game` uses `@aws-sdk/lib-dynamodb`. `apps/web` uses React 18, `react-router-dom` 6, Apollo client, `react-i18next`, Tailwind, `framer-motion` (for `useReducedMotion`) and `vitest`. **No new npm dependency** in any package. Infrastructure is AWS CDK in `infrastructure/`.

---

## 1. Resolved Assumptions

### U1 - Launch contract (resolved by reading the pages)
Eleven of the 13 v1 game pages already start from a URL with no setup page and Circuit Builder reads `?difficulty=&level=`; Memory Match reads router state. All 13 reach the server through `startGame()` in `apps/web/src/api/game.ts` (Memory Match via `hooks/useGame.ts`, Circuit Builder via `hooks/useGuidedSession.ts` and `services/circuitGameSession.ts`, which receive `startGame` from `@/api/game`; the other 11 import it directly; confirmed by search). That single choke point carries two central rules, so most pages need no edit. They do **not** all behave well on a failed start today, which is why rule R1 exists.

**Launch URL** (uniform): `<game route>?difficulty=<value>[&theme=<value>][&level=<value>]&quest=<worldId>:<nodeId>:<legIndex>`

- `quest` is the only new parameter. `difficulty`, `theme` and `level` stay in each page's existing format; the per-game format is encoded once, in the launch table (W2).
- **R1 - quest start failure (central, in `api/game.ts`).** `startGame()` wraps the mutation. If it throws and `parseQuestParam(window.location.search)` is valid, it calls `window.location.replace(ROUTES.QUEST_MAP + '?startFailed=rate')` when the error is a rate-limit error (same test the pages use today: message contains `Rate limit` or `extensions.code === 'RATE_LIMIT_EXCEEDED'`), otherwise `'?startFailed=quest'`, and then returns `new Promise<never>(() => {})`, so the page's own `catch` never runs. This removes the per-page differences below (hub, setup page, silent unscored play) without editing those pages. Precedent for a hard redirect from a start failure: `useGame.ts` sets `window.location.href = '/rate-limit?rateLimited=true'`. **Accepted simplification:** R1 maps every non-rate-limit start error with a valid `quest` param (network, auth expiry, server error as well as a quest rejection) to the same generic "That node is not available right now" notice. The map refetches progress on arrival, so a transient failure is recoverable by tapping the node again (how an expired session surfaces there is not verified and is left to Functional Design). No separate `startFailed=error` notice in v1. The map page reads `startFailed`: `rate` navigates to `ROUTES.RATE_LIMIT` with `{ rateLimited: true }` (FR-QM-17), `quest` shows a generic "That node is not available right now" notice and refetches. Without a valid `quest` param the code path is unchanged, so hub-launched games behave as today.
- **R1 also covers a successful start with `canPlay: false` (last allowed play).** The server returns `canPlay: rateLimitInfo.remaining > 0` (`game.service.ts`, `startGame` return), so on a player's last allowed play of the day the game exists, the play is consumed and `canPlay` is `false`. Four pages treat that as a failure (see the "Reads `canPlay` today" column): Bond and Burn, Traffic Lab and Mini Golf navigate to the subscription page, and Circuit Builder's `classifyStartResult` returns `paywall` or `rateLimited`. Therefore, when `parseQuestParam` is valid and `startGame` resolves with a non-empty `id`, R1 returns the result with `canPlay: true`. Rationale: `checkLimit` already ran before the game was created, so `canPlay: false` after the increment only means "this was the last play", not "do not play". Without a valid `quest` param the result is returned unchanged. **Out-of-scope observation (not fixed in v1):** the same last-play behaviour affects normal hub play on those four pages today (the paid player's last daily play lands on the subscription or rate-limit page with the play consumed); the fix is limited to quest plays.
- **R2 - quest result handling (central, in `ScoreBreakdownModal`).** In quest mode (valid `quest` URL param, or a non-null result store) the modal (a) hides the "Play again" button, so `onPlayAgain` is never called (this also removes the `window.location.reload()` re-run of `startGame` on Space Entry, Math, Math Maze and Word Puzzle, and the redirects to setup pages elsewhere), (b) replaces every close path (X button, overlay, "Close") with its own `navigate(ROUTES.QUEST_MAP)` and does **not** call the page's `onClose`, so there is no double navigation, (c) shows "Back to map" and "Next node/leg" from the store. If the store is empty in quest mode (progress write failed, `quest: null`), it shows "Back to map" and a short "progress could not be saved, replay to retry" line. Pages that render `ScoreBreakdownModal` conditionally keep working because the navigation happens inside the modal.

**Per-page table** (read in the current working tree; "start failure today" is the catch block of the page's `startGame` call):

| Game (themeId) | Reads today | Start failure today | Result wiring today (`onClose` / `onPlayAgain`) | Reads `canPlay` today | Page change |
|---|---|---|---|---|---|
| Memory Match (card theme e.g. ANIMALS), `pages/game/GamePage.tsx`, `hooks/useGame.ts` | `location.state` `{theme, difficulty}`; redirects to setup if absent | Rate limit: hard redirect to `/rate-limit`; other errors logged, game plays **unscored** | Setup / `restartGame`. A second `GameOverModal` (setup / `restartGame`) shows only when no score breakdown exists | No | **Yes.** Fall back to `?theme=&difficulty=` when `state` is empty, validated against `GAME_THEMES` and `DifficultyLevel` (invalid: redirect to setup as today). `StartGameModal` stays (one extra click; it is not the setup page). R1 covers the unscored-play case |
| MATH_CHALLENGE | `?difficulty=` easy, medium, hard (no default) | Rate limit to `ROUTES.RATE_LIMIT`, else `ROUTES.HUB` | setup / reload | No | None (R1, R2) |
| WORD_PUZZLE | `?difficulty=` default easy | Not read; R1 applies regardless | hub / reload | No | None (R1, R2) |
| SEQUENCE_MEMORY | `?difficulty=`, `?theme=` default `f1-2025` | Not read; R1 applies regardless | hub / setup | No | None (R1, R2); `theme` only if the leg sets `pageTheme` |
| PATTERN_RECALL | `?theme=` and `?difficulty=` both required, else redirect to setup | hub | setup / setup | No | None (R1, R2); `theme` (colors, animals, musical-notes, emojis) is **required** from the leg |
| MATH_MAZE | `?difficulty=` validated | setup page | setup / reload | No | None (R1, R2) |
| BUBBLE_POP | `?difficulty=` default easy | hub | hub / setup | No | None (R1, R2) |
| BOND_AND_BURN | `?difficulty=` default easy | **any** error to setup page (rate limit included) | hub / setup | **Yes**: `!canPlay` routes to subscription / rate-limit page (R1 returns `canPlay: true`) | None (R1 fixes the rate-limit routing for quest plays) |
| SPACE_ENTRY | `?difficulty=` default easy | hub | setup / reload | No | None (R1, R2) |
| TRAFFIC_LAB | `?difficulty=` default easy | **any** error to setup page | hub / setup | **Yes**: `!canPlay` routes to subscription / rate-limit page (R1 returns `canPlay: true`) | None (R1, R2) |
| MINI_GOLF | `?difficulty=` default easy | **any** error to setup page | hub / setup | **Yes**: `!canPlay` routes to subscription / rate-limit page (R1 returns `canPlay: true`) | None (R1, R2) |
| SCRATCH_CODING | `?difficulty=` default easy | Only rate limit handled; **other errors swallowed, game plays unscored** | hub / setup | No | None (R1 redirects before the swallow) |
| CIRCUIT_BUILDER | `?difficulty=<1-4>&level=<id>`; level difficulty must equal `difficulty` (`utils/circuitLevels.ts`, `parseGameSearch`) | `routeForStartOutcome` sends to its setup page | modal `onClose` closes the modal / `goSetup`; result panel also has "Next level" and "Back to setup" | **Yes**: `!canPlay` routes to subscription / rate-limit page (R1 returns `canPlay: true`) | **Yes, small.** Hide the result-panel buttons that leave the quest when `quest` is present (the modal offers "Back to map"). R1 and R2 otherwise apply |

So **2 of 13 pages need an edit** (Memory Match, Circuit Builder). The other 11 depend on R1 and R2, which are edits to two shared files (`api/game.ts`, `ScoreBreakdownModal.tsx`); R1 also handles `canPlay`, so the four pages that read it (Bond and Burn, Traffic Lab, Mini Golf, Circuit Builder) need no edit for the last allowed play. Named QM3 tests: R1 for rate-limit, quest-rejected and non-quest errors; "last allowed play in quest mode resolves with `canPlay: true`" for Bond and Burn, Traffic Lab, Mini Golf and Circuit Builder (and a non-quest start keeps `canPlay: false`); Scratch Coding unscored-play prevented (R1 never resolves, so the page's `catch` cannot run); R2 hides "Play again" and does not call the page's `onClose`; R2 with an empty store.

All word-style pages accept exactly `easy`, `medium`, `hard` and map them to 1, 2, 3 (read in each page's `startGame` call). Only Circuit Builder can use difficulty 4. **Design addition to FR-QM-2:** the config test also rejects a non-Circuit-Builder leg above difficulty 3 and a Pattern Recall leg without `pageTheme`.

Not verified: the exact accepted values of `SpaceEntryDifficulty` (line 41 of its page maps `easy`, `medium`, anything else to 3); confirm in Functional Design. The Word Puzzle and Sequence Memory start-failure paths were not read; R1 makes them irrelevant in quest mode, and the QM3 manual check should still open each of the 13 pages once from a node.

### U4 - How infrastructure is deployed (resolved by reading files)
`.github/workflows/deploy-lambdas.yml` is the only workflow. It runs on push to `main` for paths `services/game/src/**`, `services/leaderboard/src/**`, `services/email-sender/**`, `packages/shared/**` and does `aws lambda update-function-code` on `MemoryGame-GameService-prod` and two others. It runs **no CDK**. Infrastructure is deployed by hand: `infrastructure/scripts/deploy.sh <env>` runs `build-lambdas.sh` and then `cdk deploy --all -c environment=<env> --require-approval never` over all stacks declared in `infrastructure/bin/memory-game.ts` (Database, Cognito, EventBridge, Lambda, LeaderboardLambda, API, Monitoring).

**Warning that shapes the release order:** the CDK `LambdaStack` also owns the **code** of the Game and Auth Lambdas (`infrastructure/lib/stacks/lambda-stack.ts`: `NodejsFunction` with `entry` `services/game/src/index.ts` and `handler: 'handler'`, so CDK bundles a root-level `index.js`). The live prod Game Lambda is different: `scripts/deploy-game-lambda.sh` ships a zip with a `dist/` prefix and, in a step commented "Ensure handler is set correctly (our zip uses dist/ prefix)", sets `Handler` to `dist/index.handler` out-of-band (the workspace deployment rule states the same handler). `cdk diff` compares the synthesized template with the deployed CloudFormation template, not with live configuration, so it **cannot** show that mismatch. A CDK update of `MemoryGame-Lambda-prod` would replace the code with a root-level bundle while the live `Handler` stays `dist/index.handler`; every prod game start and completion would fail until `deploy-game-lambda.sh` ran again. Therefore **CDK must not deploy `MemoryGame-Lambda-prod`** for this feature, and `deploy.sh prod` or `--all` (which include it) are forbidden.

**Decision (prod):**
1. Table: deploy only `MemoryGame-Database-prod` with CDK (`--exclusively`). That stack owns no Lambda code. A read-only `cdk diff` first must show exactly one new `AWS::DynamoDB::Table` (`memory-game-quest-progress-prod`) and only added `Outputs`/exports that reference it (expected, not verified: a cross-stack reference from `LambdaStack` makes CDK synthesize export Outputs for the table name and ARN; QM2 Infrastructure Design confirms this on `cdk synth` in dev). Any modified or replaced resource, any change to an existing table, or any removed export: stop (O1).
2. Env var: add `QUEST_PROGRESS_TABLE_NAME` by read-merge-write (`aws lambda get-function-configuration --query Environment`, merge, write the whole merged map back), because `update-function-configuration --environment` replaces all variables.
3. IAM: add a new inline policy with `aws iam put-role-policy`, scoped to the one table ARN (four actions).
4. `lambda-stack.ts` and `bin/memory-game.ts` still get the declarative change so dev and a future reconciled CDK deploy match. `cdk deploy MemoryGame-Lambda-prod` is **not run against prod** until the handler/bundling mismatch is reconciled (open item O3).
5. `./scripts/deploy-game-lambda.sh prod` stays the only Game Lambda code deploy (CI on merge to `main` also publishes the same source with `update-function-code`).
Exact commands are in `quest-map-unit-of-work-dependency.md` Section 3. If the owner later prefers CDK for the Lambda stack, the doc requires an announced outage window, `deploy-game-lambda.sh prod` immediately after, and a pre-check that `aws lambda get-function-configuration --query Handler` equals the handler CDK would set.

Still unverified: whether the live prod stacks in account `342278407349` are actually CDK-managed (open item O1). The CDK lambda stack hard-codes the old account id `848403890404` in its Stripe secret ARNs, and `prodConfig.account` comes from `CDK_DEFAULT_ACCOUNT`. If `cdk diff MemoryGame-Database-prod` shows anything beyond the one new table and its added Outputs/exports (any modified or replaced resource, change to an existing table, or removed export), stop and escalate; if the Database stack is not what is live, create the table by CLI instead (O1 fallback, commands in the dependency doc). `cdk diff` needs the `dashden-new` profile and owner approval.

### U7 - Result modal props (resolved by reading the component)
`ScoreBreakdownModal` props are `isOpen, onClose, scoreBreakdown, leaderboardRank?, onPlayAgain?, gameType?`. It has no slot for extra actions, so the assumption was false. Resolution (plan Q3): a store, W3, filled by `completeGame()`, read by the modal itself, plus rule R2 (U1 above) for `onPlayAgain` and `onClose`. No prop changes and no edits to the 22 importing pages.

### U6 - Theme rows published in prod
Not resolvable from code (`validateTheme` reads the themes table). Recorded as **pre-launch check PL1**: for each themeId in config, confirm a PUBLISHED row exists in `memory-game-themes-prod` using the existing read-only pattern of `scripts/verify-circuit-builder-seed.sh` (needs the `dashden-new` profile and owner approval). A `startGame` with a missing theme fails with "Theme not found", which the node would surface as unavailable.

---

## 2. Components

### Shared module - `packages/shared/src/quest/` (unit QM1)
| Id | Component | Responsibility |
|---|---|---|
| Q1 | QuestConfig (`config.ts`) | The 2 worlds as data: nodes, legs, thresholds, map coordinates, access tier, bonus threshold |
| Q2 | QuestTypes (`types.ts`) | `QuestWorld`, `QuestNode`, `QuestLeg`, `WorldProgress`, `NodeStatus`, `GauntletAttempt`, `QuestContext` |
| Q3 | QuestContextSchema (`schema.ts`) | `zod` schema for `questContext` (ids `^[a-z0-9-]{1,40}$`, `legIndex` 0 to 2, unknown keys stripped) |
| Q4 | QuestEvaluator (`evaluator.ts`) | Pure functions: stars for a score, node statuses, startable check, apply a node result, badges. No I/O, no clock |
| Q5 | GauntletRules (`gauntlet.ts`) | Pure functions: leg order check, expiry (30 min), record a leg, combine scores |
| Q6 | ConfigValidator (`validate.ts`) | Returns a list of config errors; the unit test asserts the list is empty |
| Q7 | QuestThemeConstants (`constants/paid-games.ts`, `constants/quest-themes.ts`) | `PAID_GAME_THEME_IDS`, extracted from the local constant in `game.service.ts` so config validation and the service share one list; and `QUEST_KNOWN_THEME_IDS`, the allowlist of themeIds a leg may use (the 12 non-card game themeIds of the launch content, plus the Memory Match card theme ids used by legs). `packages/shared` has no theme registry today (searched), and the card themes live only in web `GAME_THEMES`, so this list is the source for FR-QM-2 AC2. The card ids are a separate exported array, `QUEST_CARD_THEME_IDS`, and a QM3 vitest reads `quest-themes.ts` through a Vite `?raw` import (no `@types/node` in `apps/web`) and compares that array with web `GAME_THEMES`, so drift fails CI (web does not import `packages/shared`). Adding a leg with a new game means adding its id here, which is a one-line change next to the config |

### Game Service - `services/game/src/` (unit QM2)
| Id | Component | Responsibility |
|---|---|---|
| B1 | QuestProgressRepository (`repositories/quest-progress.repository.ts`) | Get and list a user's world items, conditional versioned save |
| B2 | QuestService (`services/quest.service.ts`) | Validate a quest start, apply a completion, build the progress view |
| B3 | GameService changes | Quest validation before `rateLimiter.checkLimit`; quest hook at **both** exits of `completeGame` |
| B4 | RateLimiterService `getUsage` | Read-only usage from the real rate-limit record |
| B5 | GameHandler | `getQuestProgress` operation; `quest` field in the `completeGame` mapping |
| B6 | Validation | `questContext` accepted as `unknown` in `startGameInputSchema`, parsed with Q3 inside the service |
| B7 | MetricsPublisher additions | `publishQuestMetric` for five metric names |
| B8 | GameRepository change | Persist optional `questContext` on create; shared `Game` type gains the optional field |

### Infrastructure - `infrastructure/` (unit QM2)
| Id | Component | Responsibility |
|---|---|---|
| I1 | DatabaseStack | Table `memory-game-quest-progress-{env}`: key `userId` + `worldId`, on-demand, `AWS_MANAGED` encryption, point-in-time recovery, `RETAIN` |
| I2 | LambdaStack | Env var `QUEST_PROGRESS_TABLE_NAME` on the Game Lambda; its **own** IAM statement (GetItem, PutItem, UpdateItem, Query on this table ARN only). In prod this is the declarative record only; the env var and policy are applied by CLI and `MemoryGame-Lambda-prod` is not CDK-deployed (U4, O3) |
| I3 | App wiring (`bin/memory-game.ts`) | Pass the table to `LambdaStack` |

### Web - `apps/web/src/` (units QM3 and QM4)
| Id | Component | Unit | Responsibility |
|---|---|---|---|
| W1 | Quest API (`api/quest.ts`) and `api/game.ts` changes | QM3 | `getQuestProgress` query; `startGame` reads `quest`, sends `questContext`, and applies rule R1 on failure (redirect to the map, never-resolving promise); `completeGame` selects `quest` and fills W3 |
| W2 | Launch table and builder (`utils/questLaunch.ts`) | QM3 | themeId to route and parameter format; builds the launch URL |
| W3 | Quest result store (`utils/questResultStore.ts`) | QM3 | Holds the last `quest` result; cleared on each `startGame` |
| W4 | QuestMapPage and parts (`pages/quest/`, `components/quest/`) | QM3 | World path, node buttons, node panel, plays-left bar, locked World 2 teaser |
| W5 | QuestBanner | QM3 | Rendered once in `AppLayout`; shows node name, goal and "Back to map" when `quest` is valid |
| W6 | ScoreBreakdownModal quest section | QM3 | Stars, goal, combined score, "Back to map", "Next node" or "Next leg". Rule R2: in quest mode hides "Play again" and owns every close path (navigates to the map; the page's `onClose` is not called) |
| W7 | Hub card | QM3 | Quest Map card above the grid in `GameHubPage.tsx`, linking to `ROUTES.QUEST_MAP`. **Always rendered** for signed-in users (FR-QM-16); no `getQuestProgress` call from the hub, no env flag. Release order is the safety net (web only after QM2 is live) |
| W8 | Game page adjustments | QM3 | Memory Match URL fallback with theme/difficulty validation (`StartGameModal` stays); Circuit Builder quest-mode buttons. The other 11 pages: no edit (R1 handles `canPlay` for the four pages that read it) |
| W9 | Badge shelf and unlock animation | QM4 | Badge display on the map; unlock animation with a reduced-motion static marker |
| W10 | Achievements badges section | QM4 | World badges on `AchievementsPage.tsx` |
| W11 | Locales | QM3, QM4 | `quest.*` keys in `locales/en.json`, `es.json`, `pt.json`; new locale completeness test for the quest block |

Routing: `ROUTES.QUEST_MAP = '/quest-map'` added to `config/constants.ts`; one `<Route>` inside the protected `AppLayout` group in `App.tsx`.

---

## 3. Data (decisions that differ from the requirements sketch)

- `QuestNode` has no `nameKey`; display names come from locale keys derived from ids (`quest.worlds.<worldId>.name`, `quest.nodes.<nodeId>.name`).
- **Game name in the node panel (QM-3)**: the panel shows the game name from the locale key `quest.games.<themeId>` (for example `quest.games.MATH_CHALLENGE`, `quest.games.ANIMALS`). The server already sends `themeId` per leg, and `catalogGameId` stays withheld. W2 holds the same key as `nameKey` per launch-table row, and the quest locale completeness test checks that every themeId in the launch table has a `quest.games.*` key in en, es and pt.
- `QuestLeg` adds `catalogGameId` (for the FR-QM-18 availability check; catalog ids are kebab-case; ids seen in `GameHubPage.tsx` and `GameTile.tsx` cover 11 of the 13 v1 games, and `mini-golf` is confirmed from `scripts/seed-mini-golf.sh`, which writes `"gameId": "mini-golf"` to the catalog table (and `ROUTES.MINI_GOLF_*` exist). Whether that row is `ACTIVE` in prod is still checked in PL2. A wrong id would make a node permanently "unavailable and counted as passed" with no error) and `params?: { levelId?: string; pageTheme?: string }`.
- `totalStars` is stored for convenience but the evaluator recomputes it on every read and write; it is never trusted.
- The bonus node is not counted in `totalStars` or in "World Mastered" (avoids a circular unlock). Path nodes include the boss; the bonus node is excluded.

---

## 4. Requirement Coverage

| FR/NFR | Components |
|---|---|
| FR-QM-1, 2 | Q1, Q2, Q6, Q7 (`QUEST_KNOWN_THEME_IDS`) |
| FR-QM-3, 4 | W4, W7, W1, I3 (route) |
| FR-QM-5 | Q4, B2 |
| FR-QM-6 | B2, Q1 (accessTier), W4 |
| FR-QM-7 | W2, W1, W8 |
| FR-QM-8 | Q3, B2, B3, B6, B8 |
| FR-QM-9 | Q4, B2, B3, B5, W6 |
| FR-QM-10 | Q5, B2, W6 |
| FR-QM-11 | Q4, B1 |
| FR-QM-12 | Q4, Q1 |
| FR-QM-13 | Q4, W9, W10 |
| FR-QM-14 | W5 |
| FR-QM-15 | W3, W6, W9 |
| FR-QM-16 | W7 |
| FR-QM-17 | B4, B2, W4 |
| FR-QM-18 | B2 (catalog read), Q4 |
| FR-QM-19 | B3 (hook adds, never replaces) |
| NFR-QM-4 | W11 |
| NFR-QM-10 | I1, I2 |
| NFR-QM-11 | B7 |
| NFR-QM-12 | Q4, Q5 (pure, no I/O) |

---

## 5. Security Baseline Compliance (new design)

| Rule | Status | Basis |
|---|---|---|
| SECURITY-01 | Compliant | New table `AWS_MANAGED` encryption plus point-in-time recovery (I1); SDK calls use TLS |
| SECURITY-02 | N/A | No gateway, load balancer or CDN added; the existing API stack is unchanged |
| SECURITY-03 | Compliant | `logger` with ids, stars, scores only (B2); no tokens, emails, usernames or raw input |
| SECURITY-04 | N/A | No header or HTML-serving change. Pre-existing CSP Report-Only debt is recorded in `aidlc-state.md` |
| SECURITY-05 | Compliant | Q3 regex, bounds and unknown-key stripping; generic error on failure; no concatenated queries |
| SECURITY-06 | Compliant for new code | I2 adds a separate statement: four actions, one table ARN. The existing shared statement is unchanged (pre-existing debt) |
| SECURITY-07 | N/A | No network configuration |
| SECURITY-08 | Compliant | `userId` from the verified JWT claim in `index.ts`; table keyed by it; tier gate in B2; no client-writable path to stars |
| SECURITY-09 | Compliant | One generic rejection message; no stack traces or internals returned |
| SECURITY-10 | N/A | No new dependency; lock files unchanged |
| SECURITY-11 | Compliant, with stated limit | Quest logic isolated in Q4/Q5/B2. Misuse cases considered: forged `questContext`, World 2 as FREE, skipped boss legs, replayed boss legs, parallel tabs. Stars inherit today's client-reported scoring trust (NFR-QM-7). The daily allowance remains the throttle |
| SECURITY-12 | N/A | No auth flow change |
| SECURITY-13 | Compliant for new code | Input parsed by `zod` allowlist; progress changes logged with user, node, previous and new best stars |
| SECURITY-14 | N/A for new code | No new deployed component; inherits Game Lambda logging. Metric `QuestProgressWriteFailed` makes a later alarm possible. No alarm added; pre-existing debt |
| SECURITY-15 | Compliant | Every DynamoDB call wrapped; quest **access** checks fail closed. The completion reward write is deliberately fail-soft (NFR-QM-8): it grants nothing and denies nothing, so no access control is bypassed |

No blocking finding.
