# Component Inventory

## Verified against

- All tracked project manifests and source paths returned by local `git ls-files`; no remote or live service was queried
- `apps/web/package.json`, `apps/mobile/pubspec.yaml`, all `services/*/package.json`, `packages/shared/package.json`, and `infrastructure/package.json`
- `infrastructure/bin/memory-game.ts` and all files under `infrastructure/lib/`
- Every first-party script listed below at repository root, `scripts/`, `infrastructure/scripts/`, and `services/game/`
- Every first-party test file under web, shared, Auth, Game, and Leaderboard test paths
- `.github/workflows/deploy-lambdas.yml`

## Classification

- **Application**: a user-facing client, backend service, or deployable runtime handler.
- **Infrastructure**: AWS CDK app, stack, construct, or infrastructure configuration.
- **Shared**: code intended for reuse by multiple packages.
- **Test**: an automated first-party test suite or test support file.
- **Tooling**: build, deployment, data maintenance, diagnostics, ad hoc test, hosting, or CI automation.

Tracked compiled outputs, vendored dependency copies, ZIP contents, and deployment-package mirrors are summarized rather than counted as source components.

## Applications

| Component | Type | Purpose |
|---|---|---|
| `apps/web/` (`memory-game-web`) | Application | React 18, TypeScript, and Vite browser application for the authenticated game hub, games, subscriptions, dashboards, Leaderboard, profile, contact, and admin UI. |
| `apps/mobile/` (`dashden_mobile`) | Application | Flutter iOS/Android Memory Match MVP with Riverpod, Cognito, secure token storage, GoRouter, and a manually mirrored Game GraphQL client. |
| `apps/web/public/traffic-sim.html` | Tooling | Standalone traffic-simulation prototype. It is not integrated with React routes, Cognito, or DashDen Game APIs. |

## Backend services and deployable handlers

| Component | Type | Purpose |
|---|---|---|
| `services/game/` (`@memory-game/game-service`) | Application | Main Game Lambda package. It owns game sessions, catalog reads, rate limits, scoring, achievements, language learning, reviews, subscriptions, admin operations, preferences, contact, and completion events. |
| `services/auth/` (`@memory-game/auth-service`) | Application | Older Cognito/profile GraphQL-like Lambda. Current React login normally bypasses it and uses Amplify directly. |
| `services/leaderboard/` (`@memory-game/leaderboard`) | Application | Completion-event consumer and authenticated leaderboard/history HTTP service with its own types, repositories, rate limiter, and anomaly checks. |
| `services/email-sender/` (`dashden-email-sender`) | Application | CommonJS Cognito CustomEmailSender Lambda using the AWS Encryption SDK and Resend. |
| `services/game/src/index.ts` (`handler`) | Application | Main Game API Gateway handler; also dispatches handler-only Stripe webhook and unsubscribe paths. |
| `services/auth/src/index.ts` (`handler`) | Application | Auth API Gateway handler. |
| `services/leaderboard/src/index.ts` (`handler`) | Application | Leaderboard multiplexer for EventBridge, HTTP API, and AppSync-shaped events. |
| `services/email-sender/index.js` (`exports.handler`) | Application | Cognito custom email event handler. |
| `services/game/src/daily-email.ts` (`handler`) | Application | Scheduled daily digest handler; current CDK does not instantiate it. |
| `services/game/src/activation-email.ts` (`handler`) | Application | Scheduled zero-game activation email handler; deployed through separate manual tooling, not current CDK. |
| `services/game/src/pre-signup.ts` (`handler`) | Application | Cognito Pre Sign-Up external-provider account-linking handler; not attached by current CDK. |
| `services/game/src/webhook.ts` (`handler`) | Application | Standalone Stripe webhook handler; duplicate webhook handling also exists in the main Game handler. |
| `services/leaderboard/src/handlers/event.handler.ts` (`handler`) | Application | Internal exported `GameCompleted` consumer called by the Leaderboard entry point. |
| `services/leaderboard/src/handlers/graphql.handler.ts` (`handler`) | Application | Internal exported Leaderboard resolver adapter called by the Leaderboard entry point. |

## Shared package

| Component | Type | Purpose |
|---|---|---|
| `packages/shared/` (`@memory-game/shared`) | Shared | TypeScript domain entities/enums, Zod schemas, errors/Result types, score/statistics helpers, pricing, rate-limit constants, achievements, and application constants. Game consumes it at runtime; Auth declares it for development. Web, mobile, and Leaderboard duplicate related contracts. |
| `packages/shared/dist-lambda/` | Shared | Tracked generated CommonJS copy for historical Lambda packaging. It is not source-of-truth. |

## Infrastructure components

### CDK application and stacks

| Component | Type | Purpose | Instantiated by `bin/memory-game.ts` |
|---|---|---|---|
| `infrastructure/bin/memory-game.ts` | Infrastructure | Selects dev/staging/prod configuration, creates the stack graph, adds dependencies, and synthesizes the app. | Entry point |
| `infrastructure/lib/stacks/database-stack.ts` (`DatabaseStack`) | Infrastructure | Creates 15 on-demand DynamoDB tables and their indexes, retention, encryption, PITR, and TTL settings. | Yes |
| `infrastructure/lib/stacks/cognito-stack.ts` (`CognitoStack`) | Infrastructure | Creates Cognito User Pool, client, OAuth callbacks, MFA options, password policy, and hosted domain. | Yes |
| `infrastructure/lib/stacks/eventbridge-stack.ts` (`EventBridgeStack`) | Infrastructure | Creates two event buses, archives, log groups, and encrypted dead-letter queues. | Yes |
| `infrastructure/lib/stacks/lambda-stack.ts` (`LambdaStack`) | Infrastructure | Bundles and creates Auth and Game Node.js 20 Lambdas plus their environment variables and IAM policies. | Yes |
| `infrastructure/lib/stacks/leaderboard-lambda-stack.ts` (`LeaderboardLambdaStack`) | Infrastructure | Creates Leaderboard Lambda and the `GameCompleted` EventBridge rule with retries and DLQ. | Yes |
| `infrastructure/lib/stacks/api-stack.ts` (`ApiStack`) | Infrastructure | Creates HTTP API, Cognito authorizer, four routes, CORS, access logs, and throttling. | Yes |
| `infrastructure/lib/stacks/monitoring-stack.ts` (`MonitoringStack`) | Infrastructure | Creates SNS alarm topic, Auth/Game/API/selected-DynamoDB alarms, and dashboard. | Yes |
| `infrastructure/lib/stacks/leaderboard-event-rule-stack.ts` (`LeaderboardEventRuleStack`) | Infrastructure | Alternative separate stack for the completion-event rule. | No; direct rule creation in `LeaderboardLambdaStack` supersedes it. |

### Constructs and configuration

| Component | Type | Purpose |
|---|---|---|
| `infrastructure/lib/constructs/lambda-function.ts` (`LambdaFunction`) | Infrastructure | Reusable Lambda/log-group construct with helper IAM grants; current core stack uses `NodejsFunction` directly. |
| `infrastructure/lib/constructs/leaderboard-event-rule.ts` (`LeaderboardEventRule`) | Infrastructure | Reusable completion-event rule, retry, and DLQ construct used only by the uninstantiated alternative stack. |
| `infrastructure/lib/config/environment-config.ts` | Infrastructure | Dev/staging/prod account, region, throttle, memory, retention, domain, and feature maps. Several values are not consumed by current stacks. |
| `infrastructure/lib/config/constants.ts` | Infrastructure | General Lambda, DynamoDB, S3, CloudFront, alarm, and retry constants; many are not imported by current stacks. |
| `infrastructure/cdk.json` | Infrastructure | CDK compiled entry point, watch exclusions, and feature flags. |

## CI workflow

| Component | Type | Purpose |
|---|---|---|
| `.github/workflows/deploy-lambdas.yml` | Tooling | The only tracked GitHub Actions workflow. Pushes to `main` affecting Game, Leaderboard, email-sender, or shared paths run all three production deployment jobs. Game builds shared and service code and creates a clean ZIP; Leaderboard bundles with `npx esbuild`; email-sender installs and zips. No test, lint, scan, account assertion, approval, canary, smoke-test, or rollback job is present. |

## Automated test suites

### Web, 12 Vitest files

| Suite | Type | Purpose |
|---|---|---|
| `apps/web/src/utils/__tests__/mathMazeCompletion.test.ts` | Test | Math Maze completion messages and score components. |
| `apps/web/src/utils/__tests__/mathMazeGate.test.ts` | Test | Equation checking, gate state, and equation generation by difficulty. |
| `apps/web/src/utils/__tests__/mathMazeSetup.test.ts` | Test | Difficulty configuration, route construction, and setup enablement. |
| `apps/web/src/utils/__tests__/mathMazeTimer.test.ts` | Test | Timer formatting, per-difficulty limits, and urgency behavior. |
| `apps/web/src/utils/__tests__/mazeGenerator.smoke.test.ts` | Test | Repeated smoke checks for generated maze structure and playability. |
| `apps/web/src/utils/__tests__/mazePBT.test.ts` | Test | Property-based maze generation and invariant checks. |
| `apps/web/src/utils/__tests__/scratchCodingGenericConditions.test.ts` | Test | Example cases for generic Space Coder conditions. |
| `apps/web/src/utils/__tests__/scratchCodingGenericConditionsPBT.test.ts` | Test | Property-based generic condition behavior. |
| `apps/web/src/utils/__tests__/scratchCodingLevelSolvability.test.ts` | Test | Verifies configured Space Coder levels have a valid solution. |
| `apps/web/src/utils/__tests__/scratchCodingLevels.test.ts` | Test | Level data, execution, and expected goal behavior. |
| `apps/web/src/utils/__tests__/scratchCodingNestingUI.test.ts` | Test | Command-tree nesting and UI-derived structure behavior. |
| `apps/web/src/utils/__tests__/scratchCodingTreePBT.test.ts` | Test | Property-based command-tree execution/invariants. |

### Shared, 5 Jest files

| Suite | Type | Purpose |
|---|---|---|
| `packages/shared/src/schemas/game.schema.test.ts` | Test | Shared Game and create/complete schema validation. |
| `packages/shared/src/schemas/theme.schema.test.ts` | Test | Theme pair, entity, and create/update schema validation. |
| `packages/shared/src/schemas/user.schema.test.ts` | Test | Email, password, user, and user-create schema validation. |
| `packages/shared/src/types/errors.test.ts` | Test | Typed errors, HTTP status metadata, and serialization/log formats. |
| `packages/shared/src/types/results.test.ts` | Test | Success/failure construction and discriminated Result behavior. |

### Auth, 1 Jest suite plus support

| Suite | Type | Purpose |
|---|---|---|
| `services/auth/tests/unit/utils/validation.test.ts` | Test | Email, password, display-name, verification-code, registration, and sanitization utilities. |
| `services/auth/tests/setup.ts` | Test | Jest setup for Auth tests. |
| `services/auth/tests/helpers/test-data.ts` | Test | Reusable Auth test fixtures. |

### Game, 2 Jest files plus support

| Suite | Type | Purpose |
|---|---|---|
| `services/game/tests/integration/event-flow.test.ts` | Test | Game completion, event metadata, multiple game types, and non-blocking EventBridge failure scenarios. |
| `services/game/tests/unit/services/event-publisher.service.test.ts` | Test | EventBridge publication envelope, event bus, fields, and graceful failures. |
| `services/game/tests/setup.ts` | Test | Jest setup and environment for Game tests. |

### Leaderboard, 11 Jest files

| Suite | Type | Purpose |
|---|---|---|
| `services/leaderboard/tests/aggregate.repository.test.ts` | Test | Aggregate reads, creation, update, timeframe counters, and top results. |
| `services/leaderboard/tests/anomaly.service.test.ts` | Test | Statistical, velocity, and repeated-pattern anomaly detection. |
| `services/leaderboard/tests/auth.util.test.ts` | Test | Bearer extraction and Cognito JWT validation behavior. |
| `services/leaderboard/tests/event.handler.test.ts` | Test | Completion-event validation, retries, writes, metrics, and failures. |
| `services/leaderboard/tests/graphql.handler.test.ts` | Test | Resolver routing, authentication, limits, argument validation, and errors. |
| `services/leaderboard/tests/leaderboard.repository.test.ts` | Test | Entry writes and timeframe/history query construction. |
| `services/leaderboard/tests/leaderboard.service.property.test.ts` | Test | Property-based ranking and service invariants. |
| `services/leaderboard/tests/leaderboard.service.test.ts` | Test | Ranking, current user, rank/history, entry, and aggregate behavior. |
| `services/leaderboard/tests/ratelimit.util.test.ts` | Test | DynamoDB token-bucket refill, consumption, denial, status, and reset. |
| `services/leaderboard/tests/scoring.service.property.test.ts` | Test | Property-based score bounds, monotonicity, difficulty, accuracy, and configuration round trips. |
| `services/leaderboard/tests/scoring.service.test.ts` | Test | Example score calculations, validation, configuration, and edge cases. |

No first-party test files were found under `apps/mobile/` or `infrastructure/`. There are no focused tests for Mini Golf, Bond & Burn, Traffic Lab, or Language Pronunciation.

## Operational and developer scripts

The repository has 77 first-party script files in the scopes requested here: 35 at repository root, 35 under `scripts/`, two under `infrastructure/scripts/`, and five package-local Game scripts. Generated JavaScript under deployment-package directories and configuration files such as ESLint/Prettier configs are not counted as operational scripts.

### Repository-root scripts, 35

| Script | Type | Purpose |
|---|---|---|
| `configure-frontend.sh` | Tooling | Reads CDK outputs and writes a local web environment file; falls back to a template without `jq`. |
| `debug-leaderboard.sh` | Tooling | Inspects the configured AWS identity, event bus/rules, Lambda, tables, logs, and sample entries for the dev Leaderboard. |
| `deploy-all.sh` | Tooling | Legacy one-command dev Leaderboard/backend/frontend deployment through CDK and Vercel. |
| `deploy-backend.sh` | Tooling | Legacy all-stack backend build/bootstrap/CDK deployment with output extraction. |
| `deploy-frontend.sh` | Tooling | Legacy frontend build instructions for AWS Amplify manual upload. |
| `deploy-game-service.sh` | Tooling | Legacy Game esbuild/ZIP/direct dev Lambda update path. |
| `deploy-infrastructure-only.sh` | Tooling | Legacy direct deployment of database, Cognito, and EventBridge stacks. |
| `deploy-leaderboard.sh` | Tooling | Interactive legacy Leaderboard backend/frontend deploy, verify, and rollback menu. |
| `fix-cors.sh` | Tooling | Legacy API stack rebuild/deploy intended to update CORS. |
| `fix-vercel-env.sh` | Tooling | Removes and recreates a hard-coded set of production Vercel environment values, then deploys. |
| `quick-deploy-game.sh` | Tooling | Legacy incremental Game build/ZIP/direct dev Lambda update. |
| `restore-auth.sh` | Tooling | Restores a JWT authorizer to a hard-coded Game API route after temporary testing. |
| `seed-civics-quiz.sh` | Tooling | Writes Civics Quiz theme and catalog rows to dev and prod using the active/default CLI context. |
| `seed-color-by-number.sh` | Tooling | Writes Color by Number theme and catalog rows to dev and prod. |
| `seed-game-catalog.sh` | Tooling | Seeds initial dev catalog rows for Memory Match, Math Challenge, Word Puzzle, and Language Learning. |
| `seed-geo-quiz.sh` | Tooling | Writes Geography Quiz theme and catalog rows to dev and prod. |
| `seed-history-quiz.sh` | Tooling | Writes History Quiz theme and catalog rows to dev and prod. |
| `seed-math-theme.sh` | Tooling | Seeds the dev Math Challenge theme row. |
| `seed-sudoku-theme.sh` | Tooling | Seeds Sudoku theme rows to dev and prod. |
| `seed-themes.sh` | Tooling | Seeds initial dev Memory Match theme rows. |
| `setup-vercel-env.sh` | Tooling | Legacy hard-coded Vercel production environment setup and deployment. |
| `start-frontend.sh` | Tooling | Checks local web environment/dependencies, clears Vite cache, and starts the watch-mode development server. |
| `test-admin-api.js` | Tooling | Ad hoc HTTPS request for Game admin analytics using a token placeholder. |
| `test-admin-direct.js` | Tooling | Ad hoc direct dev Lambda admin invocation with a fabricated API Gateway event. |
| `test-admin.sh` | Tooling | Shell variant of direct admin Lambda invocation and response formatting. |
| `test-event-flow.sh` | Tooling | Live dev checks for EventBridge rule/target, Leaderboard Lambda/logs, and DLQ depth. |
| `test-graphql-direct.js` | Tooling | Ad hoc HTTPS language-word query using a test bearer value. |
| `test-lambda.sh` | Tooling | Ad hoc direct Game Lambda catalog invocation. Its selected fields are stale relative to the current catalog shape. |
| `test-leaderboard.sh` | Tooling | Interactive menu for backend tests, frontend dev server, live infrastructure checks, API checks, or a combined run. |
| `test-stripe-backend.js` | Tooling | Ad hoc direct Lambda checks for checkout and portal operations using stale tier/input examples. |
| `test-stripe-checkout.sh` | Tooling | Shell direct-invocation checkout test with stale tier/input examples. |
| `test-stripe-simple.sh` | Tooling | Combined checkout/portal direct Lambda smoke script. |
| `test-without-auth.sh` | Tooling | Temporarily removes the Game route authorizer for CORS diagnosis; paired with `restore-auth.sh`. |
| `update-cognito-email.sh` | Tooling | Legacy Cognito stack deploy intended to update verification email copy. |
| `update-vercel-env.sh` | Tooling | Placeholder command for setting the Stripe publishable key in Vercel. |

### `scripts/` files, 35

| Script | Type | Purpose |
|---|---|---|
| `scripts/_zip-dir.ps1` | Tooling | Windows .NET ZIP helper that forces forward-slash Lambda archive entries. |
| `scripts/backfill-achievements.sh` | Tooling | Reads production completed games, computes achievement history, and writes production achievement rows using the production profile. |
| `scripts/calculate-dau.py` | Tooling | Boto3 DAU/engagement analysis from dev Games and RateLimits tables plus MAU estimates. |
| `scripts/calculate-dau.sh` | Tooling | AWS CLI/jq DAU calculation from dev Games, RateLimits, and API logs. |
| `scripts/deploy-activation-email-lambda.sh` | Tooling | Clean-build/manual production deployment for the activation-email Lambda and handler verification. |
| `scripts/deploy-game-lambda.sh` | Tooling | Sanctioned manual clean-build Game Lambda deployment, Windows ZIP fallback, production-profile selection, backup, and smoke invocation. |
| `scripts/fix-all-distractor-images.py` | Tooling | Empty tracked placeholder; it has no executable behavior. |
| `scripts/fix-animal-images.js` | Tooling | Inspects and updates selected dev language animal images and distractors. |
| `scripts/fix-broken-images.sh` | Tooling | Replaces a fixed list of broken dev language image URLs. |
| `scripts/fix-color-images-v2.sh` | Tooling | Replaces dev/prod color images with unambiguous solid swatches. |
| `scripts/fix-color-images.sh` | Tooling | Earlier dev/prod color-image replacement using object photographs. |
| `scripts/fix-number-images-v2.sh` | Tooling | Portable function-based dev/prod number-image and distractor replacement. |
| `scripts/fix-number-images.sh` | Tooling | Earlier associative-array version of number-image replacement. |
| `scripts/insert-language-data.mjs` | Tooling | Reads a JSON payload and inserts generated-ID language rows using Node ESM. |
| `scripts/insert-language-data.ts` | Tooling | TypeScript/ts-node version of JSON language-row insertion. |
| `scripts/kill-switch.sh` | Tooling | Account-wide emergency concurrency/rule disable or restore operation; broader than DashDen-only resources. |
| `scripts/migrate-language-images-to-s3.py` | Tooling | Downloads external production language images, uploads them to S3, and rewrites DynamoDB URLs using the production profile. |
| `scripts/review-language-data.js` | Tooling | Scans dev language rows, reports image/translation structure and mismatches, and contains targeted update support. |
| `scripts/seed-bond-and-burn.sh` | Tooling | Seeds Bond & Burn theme and catalog rows; production mode selects the production profile. |
| `scripts/seed-language-data-massive.ts` | Tooling | Large TypeScript vocabulary seed across categories, difficulties, and seven languages. |
| `scripts/seed-language-data.js` | Tooling | Initial JavaScript sample language vocabulary seed. |
| `scripts/seed-language-data.ts` | Tooling | TypeScript version of the initial language vocabulary seed. |
| `scripts/seed-language-expansion.sh` | Tooling | Adds a second large multi-language vocabulary batch, with optional AWS profile. |
| `scripts/seed-language-words.py` | Tooling | Python bulk language vocabulary seed across categories/difficulties. |
| `scripts/seed-language-words.sh` | Tooling | Shell bulk language vocabulary seed using direct DynamoDB writes. |
| `scripts/seed-language-words.ts` | Tooling | TypeScript batch-write language vocabulary seed. |
| `scripts/seed-math-maze.sh` | Tooling | Seeds Math Maze catalog data; unlike newer complete scripts, it writes no theme row. |
| `scripts/seed-mini-golf.sh` | Tooling | Seeds Mini Golf published theme and active catalog rows; production mode selects the production profile. |
| `scripts/seed-new-words-batch2.py` | Tooling | Seeds the second Python vocabulary expansion batch. |
| `scripts/seed-new-words.py` | Tooling | Seeds a Python vocabulary expansion batch with direct CLI writes. |
| `scripts/seed-pattern-recall.sh` | Tooling | Seeds Pattern Recall published theme and catalog rows; production mode selects the production profile. |
| `scripts/seed-prod-data.sh` | Tooling | Legacy copy of catalog, themes, and language words from dev to prod using the active/default CLI context. |
| `scripts/seed-pronunciation-theme.sh` | Tooling | Seeds the `LANGUAGE_PRONUNCIATION` theme only; accepts table and optional profile arguments. |
| `scripts/seed-space-entry.sh` | Tooling | Seeds Space Entry published theme and catalog rows; production mode selects the production profile. |
| `scripts/test-admin-language-api.js` | Tooling | Live dev DynamoDB inspection of sample language records for the admin UI. |

### Package-local scripts, 7

| Script | Type | Purpose |
|---|---|---|
| `infrastructure/scripts/build-lambdas.sh` | Tooling | Builds Auth and Game, then installs production dependencies into each `dist` directory. |
| `infrastructure/scripts/deploy.sh` | Tooling | Legacy interactive/all-stack CDK deployment wrapper, including Lambda builds and output display. |
| `services/game/backup-before-deploy.sh` | Tooling | Downloads the current dev Lambda package/configuration and records commit/package metadata before deployment. |
| `services/game/build-and-deploy.sh` | Tooling | Legacy Game esbuild, validation, ZIP, Python deployment, and smoke-test chain. |
| `services/game/deploy-lambda.js` | Tooling | Direct dev Lambda code update through AWS SDK v3. |
| `services/game/deploy-lambda.py` | Tooling | Direct dev Lambda code update through boto3. |
| `services/game/smoke-test.sh` | Tooling | Live dev direct-invocation checks for catalog, canStartGame, Lambda size, and recent errors; some selected catalog fields are stale. |

## Build, lint, test, and hosting configuration

| Component | Type | Purpose |
|---|---|---|
| Root `package.json` | Tooling | DynamoDB SDK development dependency holder; not a workspace coordinator. |
| `apps/web/package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js` | Tooling | Web dependencies, lock, compiler, bundler, and CSS pipeline. |
| `apps/web/vercel.json` | Tooling | Vercel build/output declaration and SPA rewrite. |
| `amplify.yml` | Tooling | Legacy AWS Amplify hosting build configuration. Current deployment guidance identifies Vercel instead. |
| `apps/mobile/pubspec.yaml`, `analysis_options.yaml` | Tooling | Flutter dependencies/SDK range and lint analysis. |
| `packages/shared/package.json`, `package-lock.json`, `tsconfig*.json`, `jest.config.js`, `.eslintrc.js`, `.prettierrc.js` | Tooling | Shared build, test, lint, formatting, and Lambda compiler configuration. |
| `services/game/package.json`, `package-lock.json`, `tsconfig.json`, `jest.config.js`, `.eslintrc.js`, `.prettierrc.js` | Tooling | Game dependency/build/test/quality configuration. |
| `services/auth/package.json`, `tsconfig.json`, `jest.config.js`, `.eslintrc.js`, `.prettierrc.js` | Tooling | Auth dependency/build/test/quality configuration; no tracked Auth lock file was found. |
| `services/leaderboard/package.json`, `package-lock.json`, `tsconfig.json`, `jest.config.js` | Tooling | Leaderboard dependency/build/test/lint configuration. |
| `services/email-sender/package.json`, `package-lock.json` | Tooling | Email sender runtime dependency and lock. |
| `infrastructure/package.json`, `package-lock.json`, `tsconfig.json`, `cdk.json` | Tooling | CDK dependency/build/synth/deploy and app configuration. |
| `services/game/schema.graphql`; `services/auth/schema.graphql`; `services/leaderboard/schema.graphql` | Tooling | Human-facing GraphQL schema documents. They are not loaded by runtime handlers and contain known drift. |

## Generated and deployment material

| Component | Type | Purpose/status |
|---|---|---|
| `services/game/deployment-package/` | Tooling | Large tracked packaged dependency tree, including third-party tests. Not first-party source or test inventory. |
| `services/game/deploy/`, `lambda-deploy*`, `dist-package/`, `deploy-temp/` | Tooling | Historical compiled/package variants. Several contain duplicate filenames and stale output. |
| `services/leaderboard/deploy/`, `services/leaderboard/dist-package/` | Tooling | Historical compiled/package copies. |
| `apps/web/dist/` and `apps/web/vite.config.ts.timestamp-*.mjs` | Tooling | Local ignored web build output plus a tracked generated Vite timestamp module; neither is source. |

## Counts

| Kind | Count | Notes |
|---|---:|---|
| User-facing application packages | 2 | Web and mobile. |
| Backend service packages | 4 | Game, Auth, Leaderboard, email-sender. |
| Shared packages | 1 | `@memory-game/shared`. |
| CDK stack classes | 8 | Seven instantiated, one uninstantiated alternative rule stack. |
| Reusable CDK constructs | 2 | Lambda and Leaderboard event rule. |
| Exported Lambda-style handler entry points | 10 | Eight deployable/top-level candidates plus two internal Leaderboard adapters. |
| First-party automated test suite files | 31 | Web 12, Shared 5, Auth 1, Game 2, Leaderboard 11. Setup/fixture files are listed but excluded from this count. |
| First-party operational/developer script files | 77 | Root 35, `scripts/` 35, infrastructure-local 2, Game-local 5. |
| GitHub Actions workflows | 1 | `deploy-lambdas.yml`. |

Source file counts from the inspected tree are: web 165 under `apps/web/src`, mobile 20 under `apps/mobile/lib`, Game 33 under `services/game/src`, Auth 12 under `services/auth/src`, Leaderboard 13 under `services/leaderboard/src`, Shared 26 under `packages/shared/src`, and Infrastructure 13 across `infrastructure/bin` plus `infrastructure/lib`.
