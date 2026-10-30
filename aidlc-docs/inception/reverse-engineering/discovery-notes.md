# DashDen Repository Discovery Notes

**Analysis date:** 2026-10-29T17:52:30Z  
**Workspace:** `C:\Users\diego.tuleski\Documents\kiro\turbo-town`  
**Repository snapshot:** branch `main`, commit `a328c74d99acdb561961ea36fcaa11426840a530`; the local commit matched the locally recorded `origin/main` ref during discovery. No network fetch was performed.  
**Scope:** source-level reverse engineering of applications, services, shared code, AWS CDK, scripts, tests, and CI/CD. No live AWS, Vercel, Cognito, DynamoDB, Stripe, Resend, or GitHub state was queried. Environment and credential files were not read.

These notes describe the existing system and likely integration surfaces. They do not define requirements or choose a design for Circuit Builder.

## High-value findings for the later Circuit Builder work

- DashDen is a collection of independently managed projects rather than an npm workspace. The active web app is React/Vite; the backend is split among Game, Leaderboard, Auth, and email Lambda code; CDK is a separate project; and Flutter mobile is independent.
- The newest interactive capability is Language Pronunciation, added by commit `40fe177` on 2026-09-07. The newest standalone-game batch is commit `30b0b1b` on 2026-08-01, which added Mini Golf, Bond & Burn, and Traffic Lab. Mini Golf is the best complete standalone-game trace, while Bond & Burn is the closest existing science/drag interaction.
- Adding a game currently requires edits in many duplicated registries: web routes, hub categories and paid-game lists, localization, Game Service theme lists and scoring branches, Leaderboard enums and filters, reviews, dashboards, achievements, email lists, and a DynamoDB theme/catalog seed operation.
- The Game Service owns authoritative session creation and score calculation, but it trusts client-supplied completion metrics. A game page calls `startGame`, runs all simulation logic in the browser, and calls `completeGame` with elapsed time, attempts, and optional accuracy counters.
- Catalog and theme registration are data-driven in DynamoDB. A catalog row makes a tile appear; a published theme row is required before `startGame` succeeds. CDK creates both tables but does not seed either.
- There is no reusable production audio/jingle layer. `env.features.enableSoundEffects` is unused. Existing audio code is limited to browser speech synthesis and microphone/Web Audio analysis in the language game.
- There is no active shared drag-and-drop canvas abstraction. Bond & Burn uses native HTML drag events plus touch hit-testing and tap fallback. Mini Golf demonstrates responsive canvas coordinate conversion and a `requestAnimationFrame` simulation loop. `@dnd-kit` is installed, but its only source consumer is an unreferenced legacy `BlockRenderer` component.
- The current backend deployment workflow is `.github/workflows/deploy-lambdas.yml`, triggered by pushes to `main`. The stated constraint for this feature is that backend commits and deployments must go through GitHub Actions. The repository contains numerous legacy/manual deploy scripts; they must not be treated as the feature deployment path without separate authorization.
- Current checks are uneven. Web type-check and 220 web utility tests pass, and Game Service source type-check passes. Game Service tests do not compile; Leaderboard source has 30 TypeScript errors and its test run is partially failing; the newest games have no focused automated tests.

## Repository layout and packages

The repository has 2,706 tracked files. Approximately 1,887 are committed generated/deployment-package files, leaving about 819 other tracked files. The generated copies make source-of-truth identification important: active TypeScript under `src/` should take precedence over `deploy/`, `lambda-deploy*`, `dist-package/`, `deployment-package/`, and `packages/shared/dist-lambda/`.

| Area | Type | Current responsibility and relationship |
|---|---|---|
| `apps/web/` | React 18 + TypeScript + Vite application | Production browser client for dashden.app. Calls Cognito directly through Amplify and calls Game and Leaderboard GraphQL-over-HTTP endpoints through Apollo clients. It does not import `@memory-game/shared`. |
| `apps/mobile/` | Flutter/Dart application | Memory Match mobile MVP. Manually mirrors the web GraphQL contracts and game logic. Native platform folders and `pubspec.lock` are intentionally absent and regenerated on macOS. It does not yet expose the wider game catalog. |
| `services/game/` | Node.js 20 TypeScript Lambda | Main application backend: game sessions, rate limits, theme validation, catalog, scoring, achievements, language learning, admin operations, subscriptions, reviews, email preferences, contact, Stripe webhook handling, and event publication. Depends on `@memory-game/shared` through `file:../../packages/shared`. |
| `services/leaderboard/` | Node.js 20 TypeScript Lambda | Consumes `GameCompleted` events and serves leaderboard/history GraphQL operations. It has its own independent enums and models rather than importing the shared package. |
| `services/auth/` | Node.js 20 TypeScript Lambda | Older GraphQL authentication/profile service over Cognito and DynamoDB. The current web client mostly bypasses it and uses Amplify/Cognito directly. It declares `@memory-game/shared` as a development dependency. |
| `services/email-sender/` | Node.js CommonJS Lambda | Cognito custom email sender using Resend and the AWS Encryption SDK. |
| `packages/shared/` | TypeScript library | Backend domain entities, enums, Zod schemas, result/error types, calculations, pricing, achievements, and rate-limit constants. Game and Auth consume it; web, mobile, and Leaderboard duplicate corresponding contracts. |
| `infrastructure/` | AWS CDK v2 TypeScript application | Defines DynamoDB, Cognito, Lambda, API Gateway HTTP API, EventBridge/SQS, and monitoring stacks. It bundles service source by path rather than consuming published artifacts. |
| `.github/workflows/` | GitHub Actions | Contains one production Lambda deployment workflow, `deploy-lambdas.yml`. |
| `scripts/` and root `*.sh` | Operations/data scripts | Lambda packaging/deploy, catalog/theme seeding, language-data maintenance, email deployment, migrations, kill switch, and many legacy deployment paths. |
| `.kiro/specs/` | Historical design/task documents | Specs for leaderboard, Math Maze, Pattern Recall, Scratch/Space Coder, Space Entry, Bond & Burn, activation email, and Tic Tac Toe. These are useful historical context but do not consistently match current code. |
| `aidlc-docs/` | AI-DLC documentation | Workflow artifacts only. Application source does not belong here. |
| Root Markdown and payload files | Legacy operational documentation and ad hoc test material | Many documents describe earlier deployment states, old accounts, AppSync, Amplify, or incomplete frontend status. Source and current steering rules are more reliable. Root response/test JSON files were not opened because they may contain request data or credentials. |

### Internal package relationships

- There is no root `workspaces` declaration, monorepo task runner, root build script, or root test script. The root `package.json` contains only DynamoDB SDK development dependencies.
- `services/game/package.json` has a regular file dependency on `@memory-game/shared`; `services/auth/package.json` has it under `devDependencies`; `services/leaderboard` is standalone.
- `infrastructure/lib/stacks/lambda-stack.ts` and `leaderboard-lambda-stack.ts` point `NodejsFunction.entry` directly at service `src/index.ts` files and use esbuild through CDK.
- The web and mobile clients manually duplicate API inputs, outputs, game-type enums, routes, and display metadata. Contract drift is already visible.
- Direct source counts observed were approximately: 165 files under `apps/web/src`, 20 under `apps/mobile/lib`, 33 under `services/game/src`, 13 under `services/leaderboard/src`, 12 under `services/auth/src`, 26 under `packages/shared/src`, and 12 under `infrastructure/lib`.

### Committed generated/deployment material

Notable tracked copies include:

- `services/game/deployment-package/` with 745 files.
- `services/game/deploy/`, `lambda-deploy/`, five `lambda-deploy-*` variants, and `dist-package/`, each containing compiled or packaged copies.
- `services/leaderboard/deploy/` and `dist-package/`.
- `packages/shared/dist-lambda/`.
- Duplicate filenames containing ` 2` occur in generated deploy directories.

The root `.gitignore` ignores normal `dist/`, `node_modules/`, ZIPs, and environment files, but these historical packaged directories remain tracked. Later work should edit only source-of-truth files unless a documented generation step explicitly requires a checked-in artifact.

## Build, test, lint, and formatting tooling

### Project commands

| Project | Build/type-check | Tests | Lint/format |
|---|---|---|---|
| `apps/web` | `npm run build` runs `tsc && vite build`; `npm run type-check` runs `tsc --noEmit`; Vite dev server is `npm run dev` on port 3000. | Vitest 4 is installed, but there is no `test` script. Existing tests run with `npx vitest run`. | `npm run lint`; Prettier config exists but no package script. |
| `packages/shared` | `npm run build`; `npm run typecheck`. | `npm test`, `npm run test:coverage`; Jest + ts-jest with 80% global thresholds. | `npm run lint`, `lint:fix`, `format`, `format:check`. |
| `services/game` | `npm run build`; `npm run typecheck`. | `npm test`, unit/integration/e2e selectors, and coverage; Jest + ts-jest with 80% thresholds. | `npm run lint`, `lint:fix`, `format`, `format:check`. |
| `services/auth` | `npm run build`; no named type-check script, though `npx tsc --noEmit` works with installed dependencies. | Jest commands for all/unit/integration/e2e/coverage, with 80% thresholds. | ESLint and Prettier scripts. |
| `services/leaderboard` | `npm run build`; no named type-check script. | `npm test`; Jest + ts-jest with 80% thresholds. | `npm run lint` only. |
| `infrastructure` | `npm run build`, `npm run synth`, `npm run diff:*`, and CDK deploy scripts. | `npm test` is declared, but no first-party infrastructure tests or Jest config were found. | No lint/format scripts. |
| `apps/mobile` | Standard Flutter commands are implied: `flutter pub get`, `flutter analyze`, and platform builds. | No Dart/Flutter test files were found. | `flutter_lints` via `analysis_options.yaml`. |

### Configuration facts

- Web: TypeScript strict mode, `noUnusedLocals`, `noUnusedParameters`, Vite 5, Tailwind 3, source maps enabled in production builds, `@` alias to `src`, and SPA rewrites in `apps/web/vercel.json`.
- Backend: CommonJS TypeScript output, declarations and source maps, strict mode, Node 20 target. Build tsconfigs exclude tests, so a source build can pass while Jest test compilation fails.
- All npm subprojects have committed lock files except Auth, which has a package manifest but no tracked `package-lock.json` in the inspected manifest inventory. Flutter intentionally has no lock file.
- Dependency ranges mostly use caret ranges. Lock files reduce npm resolution drift, but the projects are not centrally version-aligned.

### Verification snapshot from this discovery

No-emission checks and local tests were run; they did not alter tracked files.

- `apps/web`: `npm run type-check` passed. `npx vitest run` passed 12 files and 220 tests.
- `services/game`: `npm run typecheck` passed. `npm test -- --runInBand` failed before running tests because both test suites are stale against current constructors and `GameCompletedEvent` types.
- `services/auth`: `npx tsc --noEmit` passed. Jest ran 21 tests; 20 passed and one email-validation assertion failed because Zod reports format before minimum length for `a@b`.
- `packages/shared`: type-check passed; all 52 tests across five suites passed.
- `services/leaderboard`: `npx tsc --noEmit` failed with 30 errors in `src/services/scoring.service.ts`, where string-valued `Difficulty` enum members are compared numerically. Jest reported 7 failed suites and 4 passed suites, with 9 failed and 98 passed tests among tests that ran. Failures include stale event test types, scoring compile errors, tie-rank behavior, property-test counterexamples, and repository mock mismatches.
- `infrastructure`: local no-emission checking could not start because this checkout did not have the infrastructure project's TypeScript executable installed. No dependency installation was performed.
- Lint, production builds, CDK synth, Flutter checks, and any live smoke tests were not run.

## Web app

### Bootstrap, providers, layout, and routing

- `apps/web/src/main.tsx` configures Amplify, then mounts `ErrorBoundary`, `BrowserRouter`, Apollo's `ApolloProvider`, TanStack's `QueryClientProvider`, `App`, Vercel Analytics, and Speed Insights.
- `apps/web/src/App.tsx` is the route registry. Login, registration, forgot-password, and reset-password routes are public. All hub, game, dashboard, leaderboard, subscription, profile, contact, and admin routes are under `ProtectedRoute` and `AppLayout`.
- `apps/web/src/components/common/ProtectedRoute.tsx` only checks client authentication state. API Gateway and service checks remain the security boundary.
- `apps/web/src/components/layout/AppLayout.tsx` always wraps protected pages in `Header`, a centered/padded `<main>`, and `Footer`. Full-screen games therefore render inside the shared container rather than bypassing it.
- `apps/web/vercel.json` rewrites every route to `index.html`, enabling browser-router deep links.
- Route constants live in `apps/web/src/config/constants.ts`. Language routes, including pronunciation, are partly hard-coded directly in `App.tsx`; most standalone games use `ROUTES` constants.

### API clients and hooks

- `apps/web/src/api/client.ts` creates separate Auth and Game Apollo clients. The Game endpoint comes from `VITE_GAME_ENDPOINT` or string replacement on `VITE_API_URL`.
- `apps/web/src/api/leaderboard.ts` creates a third Apollo client and owns a separate `GameType` enum. It has a hard-coded fallback endpoint in source.
- Each auth link first calls Amplify `fetchAuthSession` and sends the Cognito ID token as `Authorization: Bearer ...`; it falls back to an ID token copied into local storage.
- Most API modules call Apollo clients directly. TanStack Query is configured in `apps/web/src/api/queryClient.ts`, but no `useQuery`/TanStack mutation use was found beyond provider setup.
- `apps/web/src/hooks/useGame.ts` is specific to Memory Match. Newer games implement their own session/timer/submission logic inside each page.
- `apps/web/src/api/game.ts` defines the shared browser functions `startGame`, `completeGame`, `canStartGame`, `listAvailableGames`, statistics/history, reviews, email preferences, and contact form operations.
- The browser `CompleteGameInput` supports `correctAnswers`, `totalQuestions`, `wordsFound`, `totalWords`, `hintsUsed`, and `pauseCount`, even though the checked-in GraphQL schema file does not declare those fields.

### Game catalog and hub

- `GameHubPage.loadGames` calls `listAvailableGames`, `getReviewStats`, and `canStartGame` concurrently with `Promise.allSettled`.
- The actual tile list comes from DynamoDB through `GameCatalogRepository.getAllGames`; there is no source fallback catalog. Only `ACTIVE` and `COMING_SOON` rows are returned and sorted by `displayOrder`.
- `GameTile` translates title, description, and category with `games.<catalog-game-id>.*`, falling back to server catalog strings.
- Subject filtering is a second hard-coded registry, `GAME_FILTER_MAP`, in `GameHubPage.tsx`. Mini Golf is absent, so it appears under “All” but disappears under every category filter. A future catalog row also needs a map entry to participate in filters.
- Paid-tile display and immediate hub redirection use `PREMIUM_GAMES` in `GameTile.tsx`. This set contains only `space-entry`, `scratch-coding`, and `bond-and-burn`, while the backend paid list additionally contains Traffic Lab, Mini Golf, and Language Pronunciation.
- Review ratings are joined by converting catalog IDs to uppercase underscore form. This convention matches `mini-golf` to `MINI_GOLF`, but only if the backend review-stat registry includes the game.

### Localization

- `apps/web/src/i18n.ts` loads `en`, `es`, and `pt`, with browser/local-storage detection and English fallback.
- `GameTile` has catalog-level translations only for game IDs present under the top-level `games` object.
- Bond & Burn has both catalog and page namespaces in all three locale files. Mini Golf has a page namespace but no catalog `games.mini-golf` entry. Traffic Lab has neither. Much of Mini Golf gameplay, all Traffic Lab text, and Pronunciation setup/game/results text are hard-coded English.
- `index.html` keeps `lang="en"` regardless of the selected locale.
- Translation coverage is therefore a manual, per-game concern rather than an enforced contract or test.

### Audio and celebration

- `apps/web/src/config/env.ts` exposes `features.enableSoundEffects`, but no consumer was found.
- Shared `UserSettings` models include sound/music flags and volumes, but the web app does not read them.
- `LanguageGamePage` uses `window.speechSynthesis` for word pronunciation.
- `useSpeechRecognition` and `AudioWaveform` use microphone access, Web Speech API, and Web Audio API analysis. They are not a general sound-effects system.
- `Confetti` is a reusable Framer Motion visual used through the older `GameOverModal`. Newer games generally use page-specific CSS/emoji overlays plus `ScoreBreakdownModal` and do not consistently use `Confetti`.
- No bundled sound assets, `HTMLAudioElement` usage, success jingle helper, audio preloader, mute control integration, or autoplay-policy abstraction was found.

### Styling, animation, and responsive interaction

- Tailwind is the primary styling mechanism; Framer Motion handles selected transitions. Global CSS defines a light card/button system, while newer games implement dark themes locally with Tailwind gradients.
- Mini Golf draws at a logical 600 by 600 canvas and scales through CSS. `getCanvasPos` converts mouse/touch viewport coordinates to logical canvas coordinates, and `touch-none` suppresses browser gestures.
- Traffic Lab renders a fixed 500 by 400 pixel board without a responsive scaling wrapper, which can overflow narrow screens.
- Bond & Burn uses native draggable elements, a flask drop zone, touch-end bounding-box detection, and click/tap fallback. This gives mouse and basic touch support but no keyboard-equivalent drag workflow.
- `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` are installed. `BlockRenderer.tsx` calls `useDroppable`, but no source imports `BlockRenderer`, and no active `DndContext` was found. It is not an established working integration pattern.
- The active Scratch Coding page uses click-to-insert commands rather than the legacy dnd-kit block editor.
- `apps/web/public/traffic-sim.html` is an unrelated standalone prototype with its own canvas simulation and Tailwind CDN script. It does not call DashDen auth or game APIs.

## Latest-game flow end to end

### Chronology clarification

Two “latest game” references matter:

1. **Newest interactive capability:** Language Pronunciation, commit `40fe177`, followed by pronunciation-scoring fixes through commit `9807e32`.
2. **Newest standalone-game addition:** commit `30b0b1b`, whose headline feature is Mini Golf but which also added Bond & Burn and Traffic Lab pages and utilities in the same commit.

The standalone flow below uses Mini Golf because it has the most complete catalog, route, game, score, leaderboard, and seed trail. Bond & Burn supplies the closest drag/science precedent. A pronunciation addendum follows because it is chronologically newer.

### Mini Golf integration trail

1. **Data registration:** `scripts/seed-mini-golf.sh` writes published theme `MINI_GOLF` to `memory-game-themes-{env}` and active catalog item `mini-golf` to `memory-game-catalog-{env}`, route `/mini-golf/setup`, display order 22. The production branch explicitly uses profile `dashden-new`.
2. **Hub discovery:** `GameCatalogRepository.getAllGames` queries the catalog `StatusIndex`; `GameHubPage` renders the returned row. Mini Golf lacks a `GAME_FILTER_MAP` entry and catalog translation keys. It is a backend-paid game but is missing from `GameTile.PREMIUM_GAMES`, so its tile does not display the paid badge.
3. **Routing:** `ROUTES.MINI_GOLF_SETUP` and `ROUTES.MINI_GOLF_GAME` are declared in `config/constants.ts`; `App.tsx` imports and registers `MiniGolfSetupPage` and `MiniGolfGamePage` under the authenticated app layout.
4. **Setup:** `MiniGolfSetupPage` calls `canStartGame` to derive tier and redirects `FREE` users to subscription. It selects `easy`, `medium`, or `hard`, previews local course data, and navigates with a `difficulty` query parameter.
5. **Session start:** `MiniGolfGamePage` calls browser API `startGame({ themeId: 'MINI_GOLF', difficulty: difficultyToNumber(...) })`. It saves the returned game ID. On any exception it returns to setup; if `result.canPlay` is false it redirects to subscription.
6. **Local simulation:** Course definitions and score labels live in `miniGolfData.ts`. Vector operations, environmental randomization, friction, wall/bumper/windmill collision, cup detection, and shot helpers live in `miniGolfPhysics.ts`. The page owns canvas rendering, refs, animation frame, timer, stroke count, mouse/touch input, overlays, and course progression.
7. **Completion metrics:** The page computes a squared stroke-efficiency ratio, encodes it as `correctAnswers` out of 100, and sends `gameId`, elapsed `completionTime`, `attempts: totalStrokes`, `correctAnswers`, and `totalQuestions` to `completeGame`.
8. **HTTP/auth boundary:** Apollo adds the Cognito ID token. CDK route `/game/graphql` uses `HttpUserPoolAuthorizer`; `services/game/src/index.ts` reads `sub`, username, and email from API Gateway JWT claims.
9. **Operation routing and validation:** `GameHandler` extracts an operation name with regex, routes `startGame`/`completeGame`, and applies Zod schemas from `services/game/src/utils/validation.ts`.
10. **Backend start:** `GameService.startGame` reads subscription tier, checks `PAID_GAMES`, checks the daily limit, validates the theme in `ThemeRepository`, creates the DynamoDB game record, increments rate-limit usage, publishes a metric, and returns session/rate-limit data.
11. **Backend completion:** `GameService.completeGame` loads the game with the caller's user ID in the key, checks ownership/status, validates client-provided time and attempts, derives accuracy from client counters, invokes `ScoreCalculatorService`, caps/stores score, tracks achievements non-blockingly, emits metrics, and publishes a `GameCompleted` event.
12. **Scoring:** `ScoreCalculatorService.calculateScoreBreakdown` has explicit `MINI_GOLF` time targets and base score. Despite a later `scoreCap = 99999` branch in `GameService`, the calculator itself caps Easy/Medium/Hard at 5,000/6,500/8,000, so Mini Golf is not actually uncapped.
13. **Event delivery:** `EventPublisherService.publishGameCompleted` publishes to EventBridge and separately invokes the Leaderboard Lambda asynchronously. Both failures are swallowed after logging, so game completion can succeed without a leaderboard entry.
14. **Leaderboard write:** `EventHandler` validates the event and score, marks anomalies, writes a `LeaderboardEntries` item, and performs a read-then-put update of the user's aggregate. `LeaderboardService` serves daily, weekly, monthly, and all-time rankings.
15. **Frontend completion:** `GameHandler.completeGame` hard-codes `leaderboardRank: null`; the asynchronous leaderboard cannot provide an immediate rank. `ScoreBreakdownModal` shows the score and allows a one-to-five-star review.
16. **Review path:** The modal submits `gameType="MINI_GOLF"`, but `ReviewService.getReviewStats` only enumerates older game types through Math Maze. Mini Golf, Bond & Burn, Traffic Lab, Pattern Recall, Space Entry, Scratch Coding, and Pronunciation reviews are not included in aggregate stats or hub ratings.
17. **Downstream display:** `apps/web/src/api/leaderboard.ts`, `GameTypeFilter.tsx`, `RecentImprovements.tsx`, and Admin Dashboard popularity metadata include Mini Golf. `HistoryPage.tsx` and `AchievementsPage.tsx` do not include the newer game metadata.
18. **Tests:** No automated test references Mini Golf, Bond & Burn, or Traffic Lab. Their simulation utilities and API integration are untested.

### Important behavior in the common session contract

- `GameService.canStartGame` currently always returns `canPlay: true`, `used: 0`, and full remaining allowance; only its tier value is useful. The actual rate-limit check happens in `startGame`.
- `startGame` sets response `canPlay` to whether another play remains **after** incrementing usage. At the exact daily limit, a valid game record is created and usage is consumed, but `canPlay` becomes false. Pages that treat this response as permission for the just-created game can discard the final allowed session.
- Newer game pages fail closed on `startGame` errors by navigating away. The older Memory Match `useGame` deliberately allows offline play after API failure.
- Completion time is supplied by the browser and only checked against generic bounds; it is not reconciled with the persisted `startedAt` timestamp.
- Accuracy counters are supplied by the browser. The backend does not enforce `correctAnswers <= totalQuestions`, does not clamp the pre-score ratio, and does not reconstruct game-specific results.
- `GameRepository` persists key attribute `gameId` but casts loaded records to shared `Game`, whose identifier is `id`. This creates an `id`/`gameId` mapping mismatch in returned objects.
- EventBridge plus direct Lambda invocation can process the same completion twice if both paths are authorized. The leaderboard entry key is likely overwritten idempotently, but `AggregateRepository.updateAggregate` is non-atomic and can double-count or lose concurrent updates.

### Language Pronunciation addendum

- `LanguageGameSetup` adds a paid mode toggle based on `canStartGame` tier and browser speech-recognition support.
- `App.tsx` hard-codes `/language/pronunciation/:languageCode`; no `ROUTES` constant was added.
- `PronunciationGamePage` loads language words, starts theme `LANGUAGE_PRONUNCIATION`, performs browser speech recognition and client-side similarity scoring, then reports average accuracy through the generic completion fields.
- `scripts/seed-pronunciation-theme.sh` registers the published theme but does not add a separate catalog row because pronunciation is a mode beneath Language Learning.
- Game Service paid lists and score configuration include `LANGUAGE_PRONUNCIATION`.
- Leaderboard service and web `GameType` enums do not include `LANGUAGE_PRONUNCIATION`. Its `GameCompleted` event therefore fails Leaderboard `GameType` validation and cannot appear in leaderboard/history/dashboard flows.
- Pronunciation submits reviews under `LANGUAGE_PRONUNCIATION`, but the review aggregation allowlist omits it.
- The feature's user-facing copy is predominantly hard-coded English, and no focused pronunciation tests are tracked despite extensive `data-testid` attributes.

## Backend services and handlers

### Game Service

Key entry points and symbols:

- `services/game/src/index.ts`: Lambda `handler`, CORS allowlist, JWT claim extraction, public-route checks, Stripe webhook dispatch, unsubscribe HTML handler, top-level error handling, and `validateEnvironment`.
- `services/game/src/handlers/game.handler.ts`: `GameHandler`, `handleRequest`, regex operation extraction, `routeOperation`, GraphQL-shaped response wrapping, admin checks, and per-operation adapters.
- `services/game/src/services/game.service.ts`: `GameService.startGame`, `completeGame`, `getGame`, paid-only `getGameHistory`, statistics, and `canStartGame`.
- Repositories: `GameRepository`, `ThemeRepository`, `GameCatalogRepository`, `SubscriptionRepository`, `RateLimitRepository`, `AchievementRepository`, and `LanguageRepository`.
- Services: scoring, rate limiting, achievements, EventBridge/direct invocation, Stripe, language, admin analytics, reviews, email preferences, and contact email.
- `services/game/schema.graphql` is documentation rather than an enforced runtime schema. The Lambda does not instantiate a GraphQL parser/executor. The file omits many operations routed by `GameHandler`, optional completion metrics, review/email/contact/admin operations, and most current game types. `schema-admin.graphql` is empty.

Other service behavior:

- `ReviewService` stores one item per user/game type with `PK=USER#...` and `SK=REVIEW#...`, plus `gameType` for a GSI.
- `LanguageRepository.getWordsByCategory` scans rather than querying its available GSIs and logs extensive item/translation details. It falls back to embedded/external-image sample data on read failure.
- `ContactService` validates subject/message lengths, escapes angle brackets only in the message HTML, and sends through SES.
- Stripe secrets are intended to come from Secrets Manager, with environment fallback in development.
- `daily-email.ts`, `activation-email.ts`, `pre-signup.ts`, and `webhook.ts` are additional Lambda entry points colocated in the Game package but are not all represented in the current CDK app or GitHub workflow.

### Leaderboard Service

- `services/leaderboard/src/index.ts` distinguishes EventBridge, API Gateway HTTP, and AppSync-style events. It logs the full incoming event.
- HTTP GraphQL handling extracts the operation with regex and converts it into an AppSync-like event for `GraphQLHandler`.
- `GraphQLHandler` validates the JWT again through Cognito JWKS, consumes a DynamoDB token-bucket unit, validates game type/timeframe/limit, and invokes `LeaderboardService`.
- `EventHandler` uses the Game Service score as the single score source, validates it, checks anomalies, writes an entry, updates an aggregate, retries writes up to three times, and emits CloudWatch metrics.
- `LeaderboardRepository` supports date/week/month GSIs and user history. `AggregateRepository` stores totals, averages, best score, and timeframe counters.
- Anomaly flags are stored but are not filtered out of leaderboard queries.
- `services/leaderboard/schema.graphql` is stale and lists only four game types plus overall.
- The checked-in JSON scoring config has only four game sections; `ScoringService` embeds a larger config in TypeScript instead of loading that file.

### Auth Service

- The active web login/register flow uses `aws-amplify/auth`, not the Auth Lambda API module.
- The older Auth Lambda exposes public `/auth/graphql`; its own protected resolvers parse JWT payloads without signature verification because comments assume API Gateway already verified them. CDK does not attach an authorizer to this route.
- CDK passes `USERS_TABLE_NAME` and `USER_SETTINGS_TABLE_NAME`; Auth code requires `DYNAMODB_USERS_TABLE` and `DYNAMODB_USER_SETTINGS_TABLE`.
- CDK defines the Users partition key as `userId`; `UserRepository` writes and addresses `id`.
- These contract mismatches mean the source-defined Auth Lambda/CDK path is not internally deployable without reconciliation, even though direct Amplify authentication can continue to work.

### Email and ancillary Lambdas

- `services/email-sender/index.js` decrypts Cognito custom-email codes with the AWS Encryption SDK and calls Resend.
- `daily-email.ts` scans opted-in users, recent leaderboard entries, and aggregates, then builds personalized daily digests.
- `activation-email.ts` lists Cognito users, identifies zero-game users, checks opt-out preferences, and sends activation messages. Its preference-read failure path explicitly fails open and assumes the user did not opt out.
- `pre-signup.ts` links external-provider accounts to native Cognito users with the same email and otherwise auto-confirms external users.
- These entry points use manually managed environment defaults and deployment scripts; they are not all first-class CDK resources.

## Shared package types and contract drift

`packages/shared/src/index.ts` exports all types, schemas, utilities, and constants. Important definitions are:

- `types/enums.ts`: `SubscriptionTier`, `GameStatus`, roles, theme status/category, achievement types, and UI theme.
- `types/entities.ts`: `Game`, `User`, `Theme`, `Achievement`, legacy leaderboard entry, subscription, rate limit, and user settings.
- `schemas/game.schema.ts`, `theme.schema.ts`, `leaderboard.schema.ts`, and `subscription.schema.ts`: original Memory Match-oriented validation.
- `constants/rate-limits.ts`, `pricing.ts`, and `achievements.ts`.
- `utils/calculations.ts`: an older score formula not used by current `GameService` scoring.

Observed drift:

- Shared `gameSchema` expects UUID theme IDs and difficulty values 12 through 48; current Game Service accepts string identifiers such as `MINI_GOLF` and difficulty 1 through 5.
- Shared leaderboard models are theme/difficulty-period records and do not model the current dedicated Leaderboard Service event/table shape.
- Shared rate limits are 3/10/30/100, while current Game Service and subscription UI use 3/20/100/1000.
- Shared pricing says Light $1.99, Standard $5.99, Premium $9.99; the subscription UI says $2.99/$5.99/$9.99; Admin revenue calculations use $1.99/$4.99/$9.99.
- Shared achievement names and requirements differ from both backend tracker behavior and the frontend's independently calculated achievement catalog.
- The web and Leaderboard packages do not consume these definitions, so a new game type must be added separately in each layer.

## Infrastructure and CDK stacks

### Stack graph in source

`infrastructure/bin/memory-game.ts` creates:

1. `DatabaseStack`.
2. `CognitoStack`.
3. `EventBridgeStack`.
4. `LambdaStack` for Auth and Game.
5. `LeaderboardLambdaStack` for Leaderboard and its EventBridge rule.
6. `ApiStack`.
7. `MonitoringStack`.

`LeaderboardEventRuleStack` and the reusable `LeaderboardEventRule` construct exist but are not instantiated by the app; `LeaderboardLambdaStack` creates the rule directly.

### DynamoDB and retention settings

- `DatabaseStack` defines 15 DynamoDB tables, all on-demand and AWS-managed encrypted. Most durable tables enable point-in-time recovery and use `RETAIN` removal policy.
- The two rate-limit tables omit PITR. `rateLimitsTable` configures TTL on `resetAt`, but the repository stores `resetAt` as an ISO string and `expiresAt` as the numeric TTL value. DynamoDB TTL requires a numeric epoch field, so the configured TTL does not match the persisted model.
- No review, email-preferences, or game-statistics table is defined even though runtime services reference them.

### Lambda and permissions

- Auth and Game use `NodejsFunction`, Node 20, CommonJS bundling, source maps, X-Ray, 30-second timeout, and one-month logs.
- Game gets broad CRUD/query/scan permissions over the passed application tables, EventBridge `PutEvents`, CloudWatch metrics, limited Cognito lookup, and Stripe Secrets Manager access.
- Missing from the Game role in source are permissions used by current code for direct Leaderboard `lambda:InvokeFunction`, SES contact email, S3 presigned uploads, admin Cognito delete/confirm, reviews, and email preferences.
- `LEADERBOARD_FUNCTION_NAME`, `REVIEWS_TABLE_NAME`, and `EMAIL_PREFS_TABLE_NAME` are not supplied to Game Lambda by CDK.
- Game Stripe secret ARNs in `lambda-stack.ts` point to old account `848403890404`, while production is account `342278407349`. This is a concrete account-drift risk.
- In a dev deployment, missing `LEADERBOARD_FUNCTION_NAME` falls back to the production function name.

### API Gateway and Cognito

- Production steering identifies AWS profile `dashden-new`, account `342278407349`, region `us-east-1`, and Cognito user pool `us-east-1_FoWLQ5lmI`. The default CLI account `848403890404` is the old dev/migration account. Live identity or drift state was not queried.
- `ApiStack` creates an HTTP API with protected `/game/graphql` and `/leaderboard/graphql`, public `/auth/graphql`, and narrowly intended public `/game/public`.
- API Gateway has an explicit origin allowlist, credentials support, access logging, and default throttles of burst 500/rate 200. Environment-specific throttle values in `EnvironmentConfig` are not consumed.
- No CDK routes are defined for Game Service `/webhook` or `/unsubscribe`, although `services/game/src/index.ts` dispatches those paths.
- `CognitoStack` supports email sign-in, self-sign-up, email verification, an 8-character mixed-case/digit password policy, optional SMS/TOTP MFA, authorization-code OAuth, and web/mobile callback URLs.
- The Google identity provider source block is deliberately commented pending secret setup and drift review. The file warns that production Cognito was manually changed and that replacement-sensitive changes require a careful diff.

### Eventing and monitoring

- `EventBridgeStack` creates both `MemoryGame-{env}` and `game-events-{env}` buses, archives, log groups, and encrypted SQS DLQs.
- Game Lambda receives the `game-events` bus; Leaderboard's rule matches source `game-service` and detail type `GameCompleted`.
- Event logs and archives retain seven days. Lambda and API logs retain one month.
- `MonitoringStack` alarms and dashboards cover Auth, Game, API, and a subset of older tables. It does not include Leaderboard Lambda, newer leaderboard tables, reviews, email, or security-specific authentication/authorization alarms.
- `EnvironmentConfig.logRetentionDays`, memory maps, X-Ray flags, and detailed-metrics flags are largely not wired into stack resources; many values are hard-coded in stacks.

### Documentation drift

`infrastructure/README.md` describes storage and CDN stacks, S3 buckets, CloudFront distributions, six Lambdas, and eight tables that are not the current source layout. `DASHDEN-ARCHITECTURE.md` better reflects the live-service concept but lists 16 tables; current CDK defines 15 and runtime references additional unmanaged tables. Live cloud state was not inspected, so manual resources may exist outside CDK.

## CI/CD and deploy scripts

### GitHub Actions

`.github/workflows/deploy-lambdas.yml` is the only tracked workflow.

- Trigger: push to `main` when Game source, Leaderboard source, email-sender files, or shared package files change.
- Game job: checkout, Node 20, build shared and Game with `npm ci`, assemble a fresh ZIP, and update `MemoryGame-GameService-prod`.
- Leaderboard job: invokes `npx esbuild` to bundle and updates `MemoryGame-LeaderboardService-prod`.
- Email job: installs dependencies, zips, and updates `DashDen-EmailSender`.
- All three jobs run whenever any trigger path changes; there is no job-level changed-path selection.
- No job runs type-check, unit tests, lint, vulnerability scan, secret scan, SBOM generation, smoke test, infrastructure diff, deployment approval, account-ID assertion, alias/canary shift, or rollback.
- `actions/checkout@v4`, `actions/setup-node@v4`, and `configure-aws-credentials@v4` use moving major tags rather than immutable commit SHAs.
- The Leaderboard job does not install its package and invokes an undeclared `esbuild` through `npx`, allowing tool-version drift.
- Auth, daily email, activation email, pre-signup, CDK, catalog/theme data, and frontend are not deployed by this workflow.

### Required deployment path for Circuit Builder

For this feature, backend commits and deployments are required to go through GitHub Actions. The practical existing path is a reviewed commit/PR merged to `main`, after which `deploy-lambdas.yml` handles matching backend source paths. Do not run a local production AWS deployment as part of feature implementation.

A catalog/theme registration gap remains: current game seed scripts call DynamoDB directly, but no GitHub Action applies those data changes. That gap must be addressed or explicitly authorized in a later planning/design stage; discovery did not execute or choose a solution.

### Manual and legacy paths

- `.kiro/steering/deployment.md` designates `scripts/deploy-game-lambda.sh` as the only valid manual Game Lambda packaging path. It rebuilds from scratch, selects `dashden-new` for prod, verifies handlers/ZIP size, deploys, backs up, and smoke-tests.
- Root scripts such as `deploy-game-service.sh`, `quick-deploy-game.sh`, `deploy-backend.sh`, `deploy-all.sh`, and infrastructure deploy scripts predate current constraints. Several default to the old/default account, run broad CDK deploys, use `npm install`, or bypass the current packaging process.
- Older seed scripts iterate dev/prod without the required production profile. Newer scripts for Pattern Recall, Space Entry, Bond & Burn, and Mini Golf explicitly add `--profile dashden-new` for prod.
- `scripts/kill-switch.sh` defaults to `dashden-new` but disables every Lambda and EventBridge rule in the selected account, a much broader blast radius than DashDen alone.
- Frontend deployment rules distinguish Vercel project `web` for dev and `web-prod` for production. `apps/web/vercel.json` contains build/SPA config; no frontend GitHub Action is tracked.
- `amplify.yml` and `deploy-frontend.sh` are legacy AWS Amplify hosting material, while current steering identifies Vercel as the host.

## Authentication and subscription gating

### Authentication

- `AuthContext` restores and manages the Cognito session with Amplify, fetches user attributes, stores a display user and ID token locally, and fetches tier through `canStartGame`.
- Registration checks username availability through the unauthenticated `/game/public` route before calling Cognito `signUp`.
- `ProtectedRoute` prevents unauthenticated page navigation, while API Gateway JWT authorizers protect Game and Leaderboard data routes.
- Game Service uses API Gateway claims for `sub`, username, and email. Resource reads use `userId` in DynamoDB keys and then recheck ownership.
- Admin checks in Game and Leaderboard are hard-coded username/email allowlists rather than Cognito groups or shared role claims. The browser also hides destructive Leaderboard UI based on one hard-coded email, but the service repeats an email check server-side.

### Subscription and play limits

- `SubscriptionRepository.getTier` returns Free unless a record exists with status `ACTIVE`.
- Backend paid theme IDs are centralized only locally inside `GameService.startGame`: Space Entry, Scratch Coding, Bond & Burn, Traffic Lab, Mini Golf, and Language Pronunciation.
- Hub paid IDs, setup page checks, Game Service paid IDs, score premium IDs, and subscription UI copy are separate lists and can drift.
- Any paid tier above Free currently unlocks all paid games; there is no game-by-tier matrix.
- Super Hard difficulty 4 is paid-only for every theme.
- Current Game Service limits are Free 3, Light 20, Standard 100, Premium 1,000 per UTC day. Several shared constants and docs still say 3/10/30/100.
- `RateLimiterService.checkLimit` and `RateLimitRepository` enforce limits at `startGame`; `canStartGame` does not report real usage.
- Rate-limit and paid-game errors are GraphQL errors. Newer pages generally redirect or return to setup; older Memory Match allows local play on backend failure.
- Stripe checkout validates allowed tier and replaces a mismatched client price ID with the server's configured mapping. Subscription records and rate-limit tier are updated on relevant events.

## Data model and DynamoDB tables

### Tables defined by `DatabaseStack`

| Table suffix | Primary key | Important indexes/use |
|---|---|---|
| `users-{env}` | `userId` | `EmailIndex`, `CognitoIdIndex`; current Auth repository incorrectly uses `id`. |
| `games-{env}` | `userId` + `gameId` | `ThemeIndex` and `StatusIndex`; stores all game sessions, with `themeId` serving as the game-kind identifier. |
| `catalog-{env}` | `gameId` | `StatusIndex(status, displayOrder)` drives hub visibility/order. |
| `leaderboards-{env}` | `themeIdDifficultyPeriod` + `scoreUserId` | Legacy leaderboard table, still passed to Monitoring but not used by the current Leaderboard Service. |
| `subscriptions-{env}` | `userId` | Stripe-customer and status indexes. |
| `themes-{env}` | `themeId` | Category/status indexes; `ThemeRepository.validateTheme` requires an existing published row. |
| `achievements-{env}` | `userId` + `achievementType` | Backend achievement progress. |
| `rate-limits-{env}` | `userId` | Daily game count; TTL configuration/persisted field mismatch noted above. |
| `user-settings-{env}` | `userId` | Sound, music, notification, language, theme, and progression preferences in shared/Auth models. |
| `language-words-{env}` | `wordId` | Category/difficulty and language/category indexes, though current reads scan. |
| `language-progress-{env}` | `userId` + `languageCode` | XP, level, learned words, accuracy, last played. |
| `language-results-{env}` | `userId` + `gameId` | Language result history and LanguageIndex. |
| `leaderboard-entries-{env}` | `gameType` + `scoreTimestamp` | Daily, weekly, monthly, and user-history GSIs. |
| `user-aggregates-{env}` | `userId` + `gameType` | Totals, average/best scores, timeframe counts; Overall index exists but current code often scans. |
| `rate-limit-buckets-{env}` | `userId` | Leaderboard API token bucket; TTL on numeric `expiresAt`. |

### Runtime-referenced but absent from current CDK

- `memory-game-reviews-*`: expected keys `PK` + `SK`, with `gameType-index`.
- `memory-game-email-prefs-*`: keyed by `userId`.
- `GameStatistics` or environment-specific equivalent: keyed by `gameType` + `difficulty` for anomaly baselines.

### Game session and event shapes

- Session creation persists `userId`, `gameId`, `themeId`, numeric difficulty, status, timestamps, attempts, and score.
- Completion persists client-reported duration/attempts and server-calculated score.
- `GameCompletedEvent` carries game/user/username, game type, difficulty label, score, duration, accuracy, optional performance metrics, and timestamp.
- Leaderboard entries derive `date`, ISO week, month, and composite GSI keys. Rankings use highest score and completion time as a tiebreaker.
- Catalog rows are operational data, not source constants. A route can exist without appearing in the hub, and a catalog tile can exist while `startGame` fails if the matching theme row is absent.

## Tests and quality coverage

### Existing first-party automated tests

- Web: 12 Vitest files, all under `src/utils/__tests__`, focused on Math Maze and Scratch/Space Coder utility behavior. They include property-based tests with `fast-check`.
- Shared: five Jest files covering game/theme/user schemas and error/result types.
- Auth: one validation utility suite.
- Game: one event-flow integration suite and one event-publisher unit suite; both are stale and currently fail TypeScript compilation.
- Leaderboard: 11 Jest suites covering repositories, scoring, service ranking, event/GraphQL handlers, auth, rate limit, anomaly logic, and property tests.
- Infrastructure: no first-party tests found.
- Mobile: no tests found.

### Coverage gaps relevant to a new game

- No tests cover the hub catalog join, route availability, paid gating, review aggregation, or localization completeness.
- No tests cover Mini Golf physics, Bond & Burn recipe logic, Traffic Lab simulation, or Language Pronunciation despite those being the newest interactions.
- No browser component/E2E tests cover mouse, touch, keyboard, responsive scaling, animation cleanup, audio, or API start/complete flows.
- CI does not run any existing test suite.
- Game and Leaderboard tests are not a reliable regression gate in their present state.
- Pure engine utilities are the best-tested frontend pattern: Math Maze and Scratch separate deterministic logic from React and use both example and property-based tests.

## Security observations

The Security Baseline extension is enabled in `aidlc-docs/aidlc-state.md`. This is a source-only assessment; live cloud controls may differ. Existing non-compliance is recorded here because this documentation-only task was not authorized to change application or infrastructure code.

### Priority findings

1. **Sensitive logging:** `apps/web/src/api/client.ts` logs token prefixes and session details. `services/game/src/index.ts` logs serialized request events on failure, and `services/leaderboard/src/index.ts` logs the full event, potentially including Authorization headers and user data. This conflicts with SECURITY-03.
2. **Missing web security headers:** `apps/web/vercel.json`, `index.html`, and server source contain no required CSP, HSTS, nosniff, frame, or referrer headers. This conflicts with SECURITY-04.
3. **Incomplete API validation:** only selected Game inputs use Zod. Manual regex GraphQL routing bypasses schema enforcement; many admin, review, email, Stripe, and language inputs lack complete type/length/allowlist validation; request-body size limits are not configured in source. This conflicts with SECURITY-05.
4. **Auth route trust mismatch:** `/auth/graphql` is public in CDK, while Auth protected resolvers decode JWTs without signature verification. This conflicts with SECURITY-08 and SECURITY-12, even though the current web app normally uses Cognito directly.
5. **User-facing stack traces:** `main.tsx` renders `error.message` and `error.stack` in the browser ErrorBoundary. This conflicts with SECURITY-09 and SECURITY-15.
6. **Supply-chain gaps:** lock files exist for most npm projects, but CI has no vulnerability scan, secret scan, SBOM, or immutable action pins, and Leaderboard uses undeclared `npx esbuild`. This conflicts with SECURITY-10 and SECURITY-13.
7. **Retention and security alerting:** production source retains Lambda/API logs for 30 days and EventBridge logs for seven days, below the baseline's 90-day default. No authentication-failure or authorization-failure alarms are defined. This conflicts with SECURITY-14.
8. **Fail-open email preference handling:** activation email treats a failed opt-out read as permission to send. This conflicts with SECURITY-15 and creates a privacy risk.
9. **Client-authoritative score metrics:** game completion trusts browser time and accuracy counters, enabling business-logic abuse up to score caps. This conflicts with the abuse-case expectation in SECURITY-11.
10. **Account/deployment drift:** CDK contains old-account secret ARNs; workflows do not assert the target account before production updates; several legacy scripts omit the production profile. This is a least-privilege and misconfiguration concern under SECURITY-06 and SECURITY-09.

### Baseline status summary

| Rule | Source-level status | Evidence |
|---|---|---|
| SECURITY-01, encryption | Partially compliant | CDK DynamoDB tables use AWS-managed encryption; SQS DLQs use KMS. HTTPS is provided by managed API/hosting endpoints. Live unmanaged reviews/email/statistics stores were not verified. |
| SECURITY-02, intermediary access logs | Compliant for defined API Gateway | `ApiStack` configures centralized JSON access logs. No load balancer/CDN is defined in current CDK; Vercel logging is outside repository evidence. |
| SECURITY-03, application logging | Non-compliant | Game/Auth have structured loggers, but Leaderboard/email use ad hoc console logging, and multiple paths log tokens, full events, PII, or stack traces. |
| SECURITY-04, HTTP security headers | Non-compliant | No required frontend header configuration was found. |
| SECURITY-05, input validation | Non-compliant | Partial Zod and manual checks exist, but not every operation has bounded schema validation and no request-size policy is defined. |
| SECURITY-06, least privilege | Non-compliant | Resource ARNs are often scoped, but broad CRUD sets are shared across tables, read/write are not separated, CloudWatch uses wildcard resources without documented exception, and several required permissions are managed outside source. |
| SECURITY-07, restrictive networks | N/A/managed-service scope | No VPC, security groups, load balancers, or private subnets are defined. API CORS is allowlisted. |
| SECURITY-08, application access control | Non-compliant | Game/Leaderboard routes use API Gateway JWT and game ownership checks, but Auth's public route trusts unverified payloads and admin identity is hard-coded. Leaderboard's secondary JWT validation does not check audience/client ID. |
| SECURITY-09, hardening | Non-compliant | Browser stack traces, source-map publication, unmanaged drift, and stale/manual deployment paths remain. Current Node 20 runtime is supported. |
| SECURITY-10, supply chain | Non-compliant | Locking is incomplete across projects and CI lacks scanning/SBOM/immutable pins. |
| SECURITY-11, secure design | Partially compliant | Auth, rate limit, and subscription logic are separated and APIs are throttled, but client-authoritative scores and duplicated entitlement lists leave abuse paths. |
| SECURITY-12, auth/credentials | Non-compliant | Cognito password policy, optional MFA, and Secrets Manager intent exist; breached-password checks/admin MFA enforcement are absent, and web tokens are copied to local storage. |
| SECURITY-13, software/data integrity | Non-compliant | No SBOM/artifact verification, external Google Fonts and the public Tailwind CDN prototype have no SRI, and critical data changes lack consistent before/after audit records. |
| SECURITY-14, alerting/monitoring | Non-compliant | General alarms exist, but log retention is below baseline and security-event alerts and full service coverage are absent. |
| SECURITY-15, fail-safe exceptions | Non-compliant | Top-level handlers exist, but user-visible stacks, broad swallowed errors, offline/fail-open paths, and activation-email preference behavior violate the baseline. |

Additional observations:

- `apps/web/index.html` loads Google Fonts externally, while `styles/index.css` also imports the same font URL. The standalone `public/traffic-sim.html` executes `https://cdn.tailwindcss.com`; neither path has SRI.
- CORS for Game/Auth uses explicit origins in normal responses. The Auth missing-body response uses wildcard origin with credentials, which is both inconsistent and invalid in browsers.
- `ContactService` escapes the message body but interpolates subject, username, and email into HTML without equivalent escaping.
- `ReviewService.submitReview` validates rating but accepts arbitrary unbounded `gameType` strings.
- A historical `SECURITY-AUDIT-REPORT.md` documents previously exposed Stripe material and remediation, but this discovery did not inspect credential files or Git history and cannot verify rotation status.

## Dependencies

### Web direct dependencies

- UI/runtime: React 18, React DOM, React Router 6, Framer Motion 11, Tailwind/PostCSS/Autoprefixer, and `clsx`.
- Data/API: Apollo Client 3, GraphQL 16, TanStack Query 5, Amplify/Auth 6, Stripe.js 8, React Hook Form 7, Zod 3, and hookform resolvers.
- Interaction: dnd-kit core/sortable/utilities, currently not active in a routed page.
- Localization/telemetry: i18next 26, react-i18next 17, browser language detector, Vercel Analytics, and Speed Insights.
- Tooling: TypeScript 5.3, Vite 5, ESLint 8, Vitest 4, and fast-check 4.

### Backend and infrastructure dependencies

- AWS SDK v3 clients for DynamoDB, CloudWatch, Cognito, EventBridge, Lambda, S3, SES, Secrets Manager, and presigning.
- Game: `@memory-game/shared`, Stripe 12, UUID 8, Zod 3, and GraphQL 16.
- Auth: Cognito/DynamoDB/CloudWatch SDKs, GraphQL, and Zod.
- Leaderboard: DynamoDB/CloudWatch SDKs; Jest, ts-jest, AWS SDK mocks, and fast-check in development.
- Shared: Zod and date-fns; current source does not visibly use date-fns in the inspected runtime paths, and the sanctioned deploy script explicitly omits it.
- Infrastructure: AWS CDK v2, constructs 10, esbuild, ts-node, and TypeScript.
- Email sender: AWS Encryption SDK for Cognito custom-email ciphertext.

### Mobile dependencies

Flutter Riverpod, `graphql_flutter`, pure-Dart Cognito, secure storage, go_router, web auth, crypto, and HTTP. Its default configuration points to production unless overridden with `--dart-define`, and its platform folders must be regenerated/configured on macOS.

## Risks and technical debt

### Integration and correctness

- Game identity is duplicated across catalog kebab-case IDs, uppercase theme IDs, Leaderboard enums, review IDs, route constants, dashboard maps, achievements, and email maps.
- `schema.graphql` files are stale and not executable contracts; clients can compile documents that disagree with checked-in schemas.
- Mini Golf is absent from hub filters and catalog translations. Traffic Lab has no tracked theme/catalog seed script. Pronunciation cannot pass Leaderboard game-type validation.
- Backend review aggregation and frontend History/Achievements omit recent games.
- `canStartGame` is a tier lookup masquerading as a real availability check, and `startGame.canPlay` has final-allowance semantics that callers interpret incorrectly.
- Immediate leaderboard rank is never returned.
- Duplicate EventBridge/direct delivery plus non-atomic aggregate updates can double-count or lose data.
- Newer game simulation logic is entirely client-side and unverified by the server.
- Game `id` versus persisted `gameId` and Auth `id` versus CDK `userId` are concrete model mismatches.

### Maintainability

- Each game page reimplements timer, phase state, API session lifecycle, error behavior, result submission, and modal wiring.
- Paid-game, game-type, icon/name, category, scoring, review, achievement, and email registries are duplicated rather than generated from one manifest.
- New-game additions have tended to land as large multi-concern commits. Commit `30b0b1b` changed 81 files across games, auth, Stripe, admin, email, tests, and infrastructure.
- Root and package documentation frequently describes old architecture, prices, limits, hosting, accounts, and incomplete status.
- Nearly 70% of tracked files are generated/deployment packages, increasing review noise and the chance of editing stale output.
- Web uses Apollo directly while also carrying an unused TanStack Query provider. dnd-kit dependencies and `BlockRenderer` appear orphaned.
- Production source maps are enabled, and duplicate Google Fonts loading exists.

### Testing and release

- Backend CI deploys without tests or lint.
- Game tests cannot compile; Leaderboard source and tests are failing; Auth has one assertion failure.
- No game-level E2E suite validates catalog-to-route-to-start-to-complete-to-leaderboard behavior.
- No automated accessibility, localization, mobile viewport, pointer/touch, animation-performance, or audio tests exist.
- Infrastructure has no tests and could not be locally checked in this checkout without installing its dependencies.
- GitHub Actions deploys all Lambda jobs for any matching backend change and provides no account guard, approval, canary, smoke test, or automated rollback.

### Infrastructure drift and operations

- Production has two AWS account contexts; source still contains old-account ARNs and numerous old-account scripts/docs.
- Runtime-required review/email/statistics tables and permissions are absent from current CDK.
- Webhook/unsubscribe handlers have no CDK route definitions.
- Cognito source explicitly warns of manual drift and replacement risk.
- Monitoring omits the Leaderboard and newer resources; log retention is below the enabled baseline.
- Catalog/theme seeding is manual and outside the only GitHub Actions deployment workflow.

## Candidate extension points for Circuit Builder

These are code locations that a later requirements/design stage must evaluate. They are not a prescribed implementation.

### Browser game surface

- Route constants: `apps/web/src/config/constants.ts`, `ROUTES`.
- Route imports/registration: `apps/web/src/App.tsx`.
- New setup/game pages: follow the folder convention under `apps/web/src/pages/<game-id>/`.
- Pure circuit model/evaluator and level data: the testable utility convention is under `apps/web/src/utils/`; Math Maze and Scratch utilities are the strongest test examples.
- Simulation/rendering precedent: `MiniGolfGamePage` and `miniGolfPhysics.ts` for a logical coordinate system, mouse/touch conversion, refs, and animation frames.
- Drag precedent: `BondAndBurnGamePage` for native drag/touch/tap; dnd-kit can only be considered as an installed dependency, not as an established working app pattern.
- Shared completion UI/reviews: `apps/web/src/components/game/ScoreBreakdownModal.tsx`; shared celebration visual: `Confetti.tsx`.
- Responsive shell concern: `AppLayout.tsx` wraps all protected routes; a game needing edge-to-edge canvas must account for the parent container.
- Accessibility must be added deliberately for a terminal/wire canvas because current canvas and native drag examples do not provide a keyboard interaction model.

### Catalog, entitlement, and localization

- Catalog row and published theme row: a tracked, repeatable data operation equivalent to `scripts/seed-mini-golf.sh`, subject to the GitHub Actions-only backend deployment requirement.
- Hub category: `GAME_FILTER_MAP` in `GameHubPage.tsx`.
- Paid badge/redirect if applicable: `PREMIUM_GAMES` in `GameTile.tsx`; authoritative paid check is `PAID_GAMES` in `GameService.startGame`.
- Catalog translations and page copy: `apps/web/src/locales/en.json`, `es.json`, and `pt.json`.
- Game icon/name maps: Leaderboard filter, History, Achievements, Recent Improvements, Admin Dashboard, and daily email lists.

### Game Service

- Browser GraphQL wrappers and input shape: `apps/web/src/api/game.ts`.
- Runtime input schemas: `services/game/src/utils/validation.ts`.
- Non-Memory-Match classification, accuracy mapping, game-type mapping, score caps, and paid lists: `services/game/src/services/game.service.ts`.
- Time targets/base score: `services/game/src/services/score-calculator.service.ts`.
- Theme validation and session persistence: `ThemeRepository` and `GameRepository`.
- Review aggregation: `services/game/src/services/review.service.ts`.
- Event contract: `services/game/src/types/index.ts` and `EventPublisherService`.
- The checked-in GraphQL schema should be treated as a drift point that must be reconciled if it remains part of developer documentation/tooling.

### Leaderboard and downstream reporting

- Add game type consistently in `services/leaderboard/src/types/index.ts` and `apps/web/src/api/leaderboard.ts`.
- Event validation/scoring acceptance: `EventHandler` and `ScoringService`.
- Overall leaderboard fan-out: `LeaderboardService.getOverallTimeBasedLeaderboard`.
- User selector: `components/leaderboard/GameTypeFilter.tsx`.
- History/Achievement/Admin/Recent Improvements metadata maps and `services/game/src/daily-email.ts` game lists.
- Existing Leaderboard TypeScript/test failures are a prerequisite risk for safe backend integration.

### Audio and effects

- There is no reusable audio service. A later design must account for browser user-gesture requirements, mute/preferences, cleanup, asset loading, and unsupported environments rather than attaching autoplay directly to success state.
- Existing visual effect pieces are Framer Motion components and page-local CSS keyframes. Canvas particles would be a new reusable capability unless implemented entirely inside the game page.

### Tests and verification surfaces

- Unit/property tests for graph connectivity, open/closed switches, series/parallel behavior, resistance/current bounds, direct-source short paths, and deterministic scoring belong next to a pure utility engine under `apps/web/src/utils/__tests__/` if the existing convention is retained.
- Component or browser tests would need new tooling because the current web suite is utility-only.
- Backend tests need to cover theme acceptance, any paid gate, completion metric bounds, game-type event mapping, Leaderboard acceptance, and review aggregation.
- Catalog/theme registration needs an idempotent verification path that does not require ad hoc production CLI use.
- The minimum safe repository checks exposed by current tooling are web type-check/tests, Game type-check/tests after repair, Leaderboard type-check/tests after repair, and relevant build commands. The production Action should not be treated as a test runner.

## Source files most likely to matter later

- `apps/web/src/App.tsx`
- `apps/web/src/config/constants.ts`
- `apps/web/src/pages/hub/GameHubPage.tsx`
- `apps/web/src/components/hub/GameTile.tsx`
- `apps/web/src/api/game.ts`
- `apps/web/src/api/client.ts`
- `apps/web/src/components/game/ScoreBreakdownModal.tsx`
- `apps/web/src/components/game/Confetti.tsx`
- `apps/web/src/locales/en.json`
- `apps/web/src/locales/es.json`
- `apps/web/src/locales/pt.json`
- `apps/web/src/pages/mini-golf/MiniGolfGamePage.tsx`
- `apps/web/src/utils/miniGolfPhysics.ts`
- `apps/web/src/pages/bond-and-burn/BondAndBurnGamePage.tsx`
- `apps/web/src/pages/scratch-coding/BlockRenderer.tsx` as an orphaned dnd-kit example only
- `services/game/src/index.ts`
- `services/game/src/handlers/game.handler.ts`
- `services/game/src/services/game.service.ts`
- `services/game/src/services/score-calculator.service.ts`
- `services/game/src/services/event-publisher.service.ts`
- `services/game/src/services/review.service.ts`
- `services/game/src/repositories/game.repository.ts`
- `services/game/src/repositories/theme.repository.ts`
- `services/game/src/repositories/game-catalog.repository.ts`
- `services/game/src/utils/validation.ts`
- `services/game/src/types/index.ts`
- `services/leaderboard/src/types/index.ts`
- `services/leaderboard/src/handlers/event.handler.ts`
- `services/leaderboard/src/services/leaderboard.service.ts`
- `services/leaderboard/src/services/scoring.service.ts`
- `apps/web/src/api/leaderboard.ts`
- `apps/web/src/components/leaderboard/GameTypeFilter.tsx`
- `infrastructure/lib/stacks/database-stack.ts`
- `infrastructure/lib/stacks/lambda-stack.ts`
- `infrastructure/lib/stacks/api-stack.ts`
- `infrastructure/lib/stacks/leaderboard-lambda-stack.ts`
- `.github/workflows/deploy-lambdas.yml`
- `.kiro/steering/deployment.md`
