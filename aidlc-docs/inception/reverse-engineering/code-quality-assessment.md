# Code Quality Assessment

## Verified against

- `apps/web/package.json`, `apps/web/.eslintrc.cjs`, and `apps/web/tsconfig.json`
- `services/game/jest.config.js`, `services/auth/jest.config.js`, `services/leaderboard/jest.config.js`, and `packages/shared/jest.config.js`
- `services/game/tsconfig.json`, `services/auth/tsconfig.json`, `services/leaderboard/tsconfig.json`, and `packages/shared/tsconfig.json`
- `apps/web/src/main.tsx`, `services/game/src/index.ts`, `services/auth/src/index.ts`, and `services/leaderboard/src/index.ts`
- `apps/web/src/pages/mini-golf/MiniGolfGamePage.tsx`, `apps/web/src/pages/bond-and-burn/BondAndBurnGamePage.tsx`, and `services/game/src/services/game.service.ts`
- `infrastructure/lib/stacks/database-stack.ts`, `infrastructure/lib/stacks/api-stack.ts`, and `infrastructure/lib/stacks/lambda-stack.ts`
- `infrastructure/lib/stacks/eventbridge-stack.ts`, `infrastructure/lib/stacks/cognito-stack.ts`, and `infrastructure/lib/stacks/monitoring-stack.ts`
- `.github/workflows/deploy-lambdas.yml` and `aidlc-docs/inception/reverse-engineering/discovery-notes.md`

**Assessment scope:** source and configuration at branch `main`, commit `a328c74d99acdb561961ea36fcaa11426840a530`. Findings are observational. No application, infrastructure, or deployment file was changed.

## Overall Assessment

The repository has strong local TypeScript settings and several well-tested deterministic utility modules, but quality gates are fragmented by project. There is no workspace-level build, test, lint, or CI gate. Current backend tests are not all compilable/passing, newer games have little focused coverage, runtime contracts are duplicated, and source-defined infrastructure has material drift from runtime code. These conditions increase the integration risk of adding Circuit Builder even though the browser stack already supports the required UI and simulation patterns.

| Area | Assessment | Evidence |
|---|---|---|
| Type safety | Mixed | Every TypeScript project enables `strict`; Shared uses additional strict flags. Web and Game source type-check at the recorded snapshot, while Leaderboard source has known enum/type errors. |
| Automated tests | Mixed to poor by subsystem | Web utility and Shared suites pass in the recorded verification; Game tests do not compile, Leaderboard is partially failing, Auth has one failing assertion, and Infrastructure/Mobile have no first-party tests. |
| Coverage enforcement | Configured but not demonstrated | Game, Auth, Shared, and Leaderboard Jest configs specify 80% global thresholds. No current coverage report proves those thresholds, and normal `npm test` does not request coverage. Web has no coverage configuration. |
| Lint/format | Fragmented | Web, Game, Auth, and Shared have configurations. Leaderboard declares a lint script without ESLint/config; Infrastructure has neither lint nor format scripts. CI runs none of them. |
| Documentation/contracts | Drifted | GraphQL SDL, infrastructure README, shared models/constants, and current runtime behavior disagree in several places. |
| Release gate | Poor | The only GitHub Actions workflow deploys matching Lambda changes without type-check, tests, lint, vulnerability scanning, or smoke tests. |

## Test Coverage and Frameworks

### Recorded verification results

`aidlc-docs/inception/reverse-engineering/discovery-notes.md` records these local results for the same commit. This documentation step did not rerun application suites because it was restricted to documentation files.

| Project | Framework/configuration | Recorded result | Coverage implications |
|---|---|---|---|
| `apps/web` | Vitest `^4.1.4`, fast-check `^4.6.0`; tests under `src/utils/__tests__` | `npm run type-check` passed; 12 files and 220 tests passed through `npx vitest run`. | Coverage is concentrated in Math Maze and Scratch/Space Coder pure utilities. There is no test script or coverage threshold in `apps/web/package.json`. |
| `packages/shared` | Jest/ts-jest with 80% global thresholds | Type-check passed; 52 tests across five suites passed. | Good coverage of selected schemas and error/result types, but the shared package has substantial drift from active Game contracts. |
| `services/game` | Jest/ts-jest with 80% thresholds; two tracked suites | Source type-check passed; Jest failed at TypeScript compilation before tests ran. | Thresholds provide no protection while tests cannot compile. No game-specific scoring/catalog tests cover recent games. |
| `services/auth` | Jest/ts-jest with 80% thresholds; one validation suite | Type-check passed; 20 of 21 tests passed. | The failure is a stale message expectation: `emailSchema` evaluates `.email()` before `.min()`, while the test expects the minimum-length message for `a@b`. Service/repository/authentication behavior lacks focused coverage. |
| `services/leaderboard` | Jest/ts-jest, fast-check, 80% thresholds; 11 tracked suites | Source type-check reported 30 errors; 7 suites failed and 4 passed, with 9 failed and 98 passed tests among tests that ran. | Current failures include scoring enum comparisons, stale event shapes, ranking/tie behavior, property counterexamples, and repository mocks. |
| `infrastructure` | Jest/ts-jest declared | No first-party test or Jest config was found; local no-emission checking could not start in the discovery run because the project compiler was unavailable. | No assertions cover stack resources, IAM, routes, encryption, retention, or environment wiring. |
| `apps/mobile` | `flutter_test` and `flutter_lints` | No test file was found. | Authentication, token storage, API mapping, and Memory Match behavior are uncovered. |
| `services/email-sender` | No test framework declared | No first-party test was found. | Ciphertext handling, template selection, and external delivery behavior are uncovered. |

### Concrete stale-test evidence

- `services/game/tests/integration/event-flow.test.ts` constructs `RateLimiterService` and `AchievementTrackerService` with obsolete signatures and calls `GameService.completeGame` without its current username argument.
- `services/game/tests/unit/services/event-publisher.service.test.ts` builds an old `GameCompletedEvent` shape (`userName`, `themeId`, numeric difficulty, `completedAt`) that does not match `services/game/src/types/index.ts`.
- Both `services/game/jest.config.js` and `services/auth/jest.config.js` map `@memory-game/shared` to `<rootDir>/../shared/src`; no first-party `services/shared/src` directory exists, while the package actually lives at `packages/shared/src`.
- `services/leaderboard/src/types/index.ts` defines `Difficulty` as string-valued members, while `ScoringService` repeatedly compares `difficulty <= 1` and `difficulty <= 2`.
- No focused test references Mini Golf, Bond & Burn, Traffic Lab, or Language Pronunciation. Existing browser tests are utility-only; there are no component, browser, accessibility, pointer/touch, responsive, animation-lifecycle, audio, or API end-to-end suites.

## Linting and Formatting

- `apps/web/.eslintrc.cjs` enables ESLint recommended rules, TypeScript recommended rules, React Hooks rules, and React Refresh. Its npm lint command rejects warnings. `.prettierrc` exists, but `apps/web/package.json` declares neither a Prettier package nor a format script.
- Game and Auth use type-aware TypeScript ESLint, `no-explicit-any`, and `no-floating-promises`; Game treats Prettier differences as lint errors. Both projects have format/check scripts.
- `packages/shared/.eslintrc.js` adds complexity and function-length warnings. Its `prebuild` invokes undeclared `rimraf`, so a clean isolated install is not self-describing.
- `services/leaderboard/package.json` declares `eslint src --ext .ts`, but neither ESLint packages nor a first-party ESLint config are present.
- Infrastructure has strict TypeScript but no lint/format command. Mobile uses `flutter_lints` plus a few local analyzer rules.
- `.github/workflows/deploy-lambdas.yml` runs none of the lint or format checks.

## Code Style Consistency

### Consistent practices

- Project tsconfigs consistently enable strict type-checking and CommonJS output for backend code.
- Most TypeScript follows two-space indentation and uses explicit service/repository names.
- Backend Game/Auth code has dedicated JSON logger utilities with timestamp, level, message, and contextual fields.
- Repositories isolate many DynamoDB calls; services contain business behavior; handlers adapt HTTP/GraphQL-shaped requests.

### Inconsistencies

- Web Prettier requires no semicolons, but several newer source files use semicolons extensively, including `apps/web/src/pages/language/PronunciationGamePage.tsx` and API/admin modules.
- Formatting rules differ between packages, such as trailing-comma settings in Game, Auth, and Shared.
- Leaderboard and Email Sender use ad-hoc `console` calls rather than the structured logger pattern used by Game/Auth.
- Runtime APIs use extensive `any` in handlers even where lint configurations prohibit it; Leaderboard has no functioning lint setup to enforce its intended style.
- Some route constants are centralized in `ROUTES` (`apps/web/src/config/constants.ts`), while language, subscription, and admin routes are hard-coded in `apps/web/src/App.tsx`.

## Documentation and Contract Quality

- `services/game/schema.graphql` does not include optional completion metrics used by `apps/web/src/api/game.ts`, and it omits several operations routed by `GameHandler.routeOperation`.
- `services/leaderboard/schema.graphql` lists only the original four game types plus Overall, while `services/leaderboard/src/types/index.ts` lists many more.
- The GraphQL schemas are not executed at runtime. `GameHandler.extractOperationName`, Auth `parseOperation`, and Leaderboard `handleHttpGraphQLRequest` route requests with regular expressions, so SDL cannot enforce request shape.
- `infrastructure/README.md` describes storage/CDN stacks, three S3 buckets, two CloudFront distributions, six Lambdas, and eight tables. `infrastructure/bin/memory-game.ts` instantiates a different stack set, and `DatabaseStack` defines 15 tables.
- Shared `gameSchema`, pricing, rate limits, achievements, and leaderboard models differ from active service/frontend definitions. For example, Shared rate limits are 3/10/30/100 while `RateLimiterService.getTierLimit` returns 3/20/100/1000.
- Numerous comments and TODOs accurately expose unfinished work, but there is no automated contract-generation or documentation-validation step to stop drift.

## Good Patterns

- **Pure deterministic logic with property tests:** Math Maze and Scratch Coding utilities separate algorithms from React and use fast-check. This is the strongest precedent for a circuit graph evaluator.
- **Responsive logical canvas:** `MiniGolfGamePage.getCanvasPos` maps viewport mouse/touch coordinates to a 600-by-600 logical canvas. Its render effect cancels `requestAnimationFrame` during cleanup.
- **Cross-input fallback:** `BondAndBurnGamePage` supports native drag/drop, touch hit-testing, and click/tap fallback. It demonstrates mobile accommodation, though not keyboard-equivalent wiring interaction.
- **Layered Game service:** `GameHandler`, `GameService`, repository classes, Zod schemas, error mapping, and metrics separate many responsibilities.
- **Ownership check:** `GameService.completeGame` loads a game with caller context and rechecks `game.userId` before mutation.
- **Restricted normal CORS:** `ApiStack` and normal Game/Auth responses use explicit origin allowlists rather than wildcard origins.
- **Infrastructure defaults:** CDK-defined DynamoDB tables use on-demand billing and AWS-managed encryption; most durable tables also use point-in-time recovery and retain-on-delete.
- **Operational cleanup:** The sanctioned Game deployment script rebuilds a clean package instead of incrementally patching a ZIP and checks archive structure/size before deployment.

## Anti-patterns and Technical Debt

| Finding | Evidence | Impact on a new game |
|---|---|---|
| Duplicated game registry | `ROUTES` in `apps/web/src/config/constants.ts`, route registration in `apps/web/src/App.tsx`, `GAME_FILTER_MAP` in `apps/web/src/pages/hub/GameHubPage.tsx`, `PREMIUM_GAMES` in `apps/web/src/components/hub/GameTile.tsx`, Game Service lists, Leaderboard `GameType`, review allowlists, locales, and seed scripts | Circuit Builder can work in one surface while remaining absent or invalid elsewhere. |
| Large conditional scoring/type mapping | `GameService.completeGame` in `services/game/src/services/game.service.ts` repeats a long theme allowlist and per-theme accuracy branches; `ScoringService` in `services/leaderboard/src/services/scoring.service.ts` has parallel switches | Every game addition expands duplicated control flow and regression surface. |
| Client-authoritative outcomes | Browser game pages submit elapsed time, attempts, and accuracy counters; `completeGameInputSchema` in `services/game/src/utils/validation.ts` checks basic types but not `correctAnswers <= totalQuestions`; `GameService.completeGame` does not reconstruct simulation results | Circuit success/current/fault metrics could be manipulated unless later requirements choose an authoritative or bounded scoring contract. |
| Manual GraphQL parsing | `GameHandler.extractOperationName` (`services/game/src/handlers/game.handler.ts`), Auth `parseOperation` (`services/auth/src/index.ts`), and Leaderboard `handleHttpGraphQLRequest` (`services/leaderboard/src/index.ts`) extract operation names with regex and cast variables | Unknown fields, aliases, nested documents, payload bounds, and schema evolution are not handled like a real GraphQL server. |
| Event double-delivery path | `EventPublisherService.publishGameCompleted` in `services/game/src/services/event-publisher.service.ts` sends both EventBridge and direct Lambda events; `LeaderboardLambdaStack` in `infrastructure/lib/stacks/leaderboard-lambda-stack.ts` routes EventBridge to Leaderboard | A completion can be processed twice; aggregate updates are not protected by an explicit event-id idempotency contract. |
| Silent/non-blocking integration failure | `EventPublisherService.publishGameCompleted` catches both delivery failures; `GameService.completeGame` catches achievement failures | Game completion may succeed while downstream leaderboard/achievement data is missing. |
| CDK/runtime drift | Game source uses review, email-preference, S3, SES, direct-Lambda, and additional admin operations not fully wired in `infrastructure/lib/stacks/lambda-stack.ts`. That stack provides `USERS_TABLE_NAME`/`USER_SETTINGS_TABLE_NAME`, while `services/auth/src/index.ts` requires `DYNAMODB_USERS_TABLE`/`DYNAMODB_USER_SETTINGS_TABLE` | Changes that compile can fail after deployment or depend on manually managed resources. |
| Data-model drift | `services/game/src/repositories/game.repository.ts` persists `gameId` while Shared `Game` uses `id`; Auth repository keys and `DatabaseStack.usersTable` naming differ | Mapping bugs are easy to introduce when adding analytics or history for Circuit Builder. |
| Orphaned dependencies/components | dnd-kit is installed, but only unreferenced `apps/web/src/pages/scratch-coding/BlockRenderer.tsx` imports core; TanStack Query has a provider but no hooks; Stripe.js, dnd-kit sortable/utilities, Shared date-fns, and mobile Cupertino Icons have no source import | Existing packages should not be assumed to represent an established integration pattern. |
| Generated deployment material tracked | `services/game/deployment-package`, `services/game/lambda-deploy*`, `services/game/dist-package`, and Leaderboard package directories contain compiled copies alongside `src` | Search/review can select stale code instead of source-of-truth modules. |
| Production source maps | `apps/web/vite.config.ts`, `infrastructure/lib/stacks/lambda-stack.ts`, and `infrastructure/lib/stacks/leaderboard-lambda-stack.ts` enable source maps | Internal code and stack details can be easier to expose if deployment controls do not restrict map access. |
| Manual catalog data deployment | Hub tiles and published themes depend on DynamoDB rows seeded outside CDK/CI, as illustrated by `scripts/seed-mini-golf.sh` | A deployed Circuit Builder route can remain invisible or fail theme validation. |
| Incomplete availability API | `GameService.canStartGame` in `services/game/src/services/game.service.ts` returns placeholder usage and `canPlay: true` | Setup-page entitlement/limit feedback can disagree with actual `startGame` enforcement. |

## Known Risks

### Correctness and maintainability

- `startGame` returns `canPlay` based on remaining quota after consuming the current play. At the exact limit, a created session can be interpreted by newer pages as disallowed.
- `RateLimitsTable` in `infrastructure/lib/stacks/database-stack.ts` configures TTL on `resetAt`, while the `RateLimit` model and `RateLimitRepository` in `services/game/src/types/index.ts` and `services/game/src/repositories/rate-limit.repository.ts` use numeric `expiresAt`; this can leave stale records.
- `ReviewService.getReviewStats` in `services/game/src/services/review.service.ts` has a fixed game-type list that omits recent games. `services/leaderboard/src/types/index.ts` and `apps/web/src/api/leaderboard.ts` both omit Language Pronunciation even though `GameService.completeGame` emits that game type.
- `GameService.getGameHistory` has TODOs for date filtering, total count, and real pagination.
- The Leaderboard uses string `Difficulty`, but scoring code treats it as numeric. This is both a current build failure and a warning against duplicating Circuit Builder scoring logic there.
- Admin identity is repeated in hard-coded username/email arrays across browser and service files instead of using a shared role/group claim.

### Performance and UX

- Each newer game page owns timers, animation state, API lifecycle, and completion wiring; there is no shared game-session controller.
- Canvas and drag precedents do not provide a keyboard-accessible terminal/wire model.
- There is no reusable sound-effects/jingle layer or integration with stored sound/music preferences. Existing browser audio is speech synthesis and pronunciation microphone analysis.
- No automated mobile viewport, pointer/touch, frame-rate, animation cleanup, or reduced-motion test protects simulation-heavy pages.

### Delivery

- Backend CI deploys immediately on matching pushes to `main` and does not run tests, lint, security scans, account assertions, smoke tests, canary rollout, or rollback.
- The Leaderboard workflow invokes `npx esbuild` without installing or pinning it in the Leaderboard manifest.
- Auth and mobile lockfiles are intentionally ignored; dependency resolution is not reproducible from tracked files alone for those projects.
- Runtime-required review/email/statistics resources and several permissions are absent from current CDK, while old/manual scripts create additional deployment paths.

## Security Compliance

The Security Baseline extension is enabled in `aidlc-docs/aidlc-state.md`. Statuses below assess repository evidence only; live controls managed outside the repository were not queried. Under the enabled baseline, every **Non-compliant** row is a blocking finding for later design/construction until addressed or explicitly reconfigured by the workflow owner.

| Rule | Status | Concise evidence and rationale |
|---|---|---|
| SECURITY-01: Encryption at Rest and in Transit | **Non-compliant** | All 15 tables created by `DatabaseStack` use `TableEncryption.AWS_MANAGED` in `infrastructure/lib/stacks/database-stack.ts`, and both dead-letter queues use KMS-managed encryption in `EventBridgeStack` (`infrastructure/lib/stacks/eventbridge-stack.ts`). However, `ReviewService` (`services/game/src/services/review.service.ts`), `EmailPrefsService` (`services/game/src/services/email-prefs.service.ts`), `AnomalyService.statisticsTableName` (`services/leaderboard/src/services/anomaly.service.ts`), and `GameHandler.getPresignedUploadUrl` (`services/game/src/handlers/game.handler.ts`) reference stores/buckets absent from active CDK, so encryption and non-TLS rejection cannot be verified for every persistence store. |
| SECURITY-02: Access Logging on Network Intermediaries | **Compliant** | `ApiStack` assigns JSON `accessLogSettings` on `defaultStage` to a dedicated CloudWatch log group in `infrastructure/lib/stacks/api-stack.ts`. `infrastructure/bin/memory-game.ts` defines no load balancer or CDN distribution. Vercel platform logging is outside repository evidence. |
| SECURITY-03: Application-Level Logging | **Non-compliant** | Game/Auth have structured logger classes, but `createAuthLink` in `apps/web/src/api/client.ts` logs session details and token prefixes, the `handler` catch in `services/game/src/index.ts` logs the serialized event, and the Leaderboard `handler` in `services/leaderboard/src/index.ts` logs full events with ad-hoc console output. These paths can include authorization headers and user data; logging is not consistently structured or sanitized. |
| SECURITY-04: HTTP Security Headers for Web Applications | **Non-compliant** | `apps/web/vercel.json` defines build/rewrites but no CSP, HSTS, nosniff, frame, or referrer headers. `handleUnsubscribe` in `services/game/src/index.ts` serves HTML without those headers. The CSP requirement is therefore unmet for HTML-serving endpoints. |
| SECURITY-05: Input Validation on All API Parameters | **Non-compliant** | `services/game/src/utils/validation.ts` validates only start/completion/history inputs. `GameHandler.routeOperation` in `services/game/src/handlers/game.handler.ts` forwards many admin, language, review, email, contact, Stripe, upload, and public parameters through `any`; `ReviewService.submitReview` does not bound/allowlist `gameType`, and `GameHandler.getPresignedUploadUrl` does not allowlist `contentType`. The handlers configure no request-body size limit, and manual GraphQL parsing does not enforce SDL. |
| SECURITY-06: Least-Privilege Access Policies | **Non-compliant** | `LambdaStack` (`infrastructure/lib/stacks/lambda-stack.ts`) and `LeaderboardLambdaStack` (`infrastructure/lib/stacks/leaderboard-lambda-stack.ts`) combine read/write/delete/scan actions across broad table sets rather than separating read/write statements. CloudWatch metric policies use `resources: ['*']` without a documented service limitation exception. Game source also calls services/resources not represented in the role, showing permission drift rather than controlled least privilege. |
| SECURITY-07: Restrictive Network Configuration | **N/A** | No VPC, subnet, route table, network ACL, or security group is defined under `infrastructure/lib`; `infrastructure/bin/memory-game.ts` composes managed public API/Lambda/DynamoDB services. API CORS is assessed under SECURITY-08, not as a VPC firewall. |
| SECURITY-08: Application-Level Access Control | **Non-compliant** | `ApiStack` protects Game/Leaderboard routes with `HttpUserPoolAuthorizer`, and `GameService.completeGame` in `services/game/src/services/game.service.ts` rechecks ownership. However, `infrastructure/lib/stacks/api-stack.ts` exposes `/auth/graphql` without an authorizer, while `parseJWT` in `services/auth/src/utils/token.ts` parses payloads without signature/audience/issuer verification. Admin privilege is based on hard-coded `ADMIN_EMAILS`/`ADMIN_USERNAMES` in `services/game/src/handlers/game.handler.ts`, `services/leaderboard/src/handlers/graphql.handler.ts`, and browser guards. Auth's missing-body response in `services/auth/src/index.ts` also combines wildcard origin with credentials. |
| SECURITY-09: Security Hardening and Misconfiguration Prevention | **Non-compliant** | `ErrorBoundary` in `apps/web/src/main.tsx` renders `error.message` plus `error.stack`; `apps/web/vite.config.ts`, `LambdaStack`, and `LeaderboardLambdaStack` enable source maps. `infrastructure/lib/stacks/lambda-stack.ts` contains production-sensitive account/resource drift and does not wire all runtime dependencies/resources. `infrastructure/README.md` describes a stale topology. These are concrete error-disclosure and misconfiguration risks. |
| SECURITY-10: Software Supply Chain Security | **Non-compliant** | Most npm projects have tracked lockfiles, but `services/auth/.gitignore` excludes its lockfile and `apps/mobile/.gitignore` excludes `pubspec.lock`. `.github/workflows/deploy-lambdas.yml` has no dependency/secret scan or SBOM, uses moving major action tags, and runs undeclared `npx esbuild` for Leaderboard. Several dependencies documented in `dependencies.md` have no first-party source consumer. |
| SECURITY-11: Secure Design Principles | **Non-compliant** | Security concerns are partly separated in `RateLimiterService` (`services/game/src/services/rate-limiter.service.ts`) and the Cognito authorizer, while `ApiStack.defaultRouteSettings` throttles routes. However, `GameService.completeGame` trusts browser-reported time/accuracy, duplicated entitlement lists can diverge, and no source design control addresses game-result abuse. Circuit Builder would inherit that misuse path. |
| SECURITY-12: Authentication and Credential Management | **Non-compliant** | `CognitoStack` in `infrastructure/lib/stacks/cognito-stack.ts` configures an eight-character mixed-case/digit policy, one-hour access/ID tokens, and optional MFA; service code uses credential key names rather than committed credential values. Missing baseline controls include breached-password checking and enforced admin MFA. The public Auth route trusts `parseJWT`, and `AuthContext` in `apps/web/src/context/AuthContext.tsx` copies the ID token into local storage. |
| SECURITY-13: Software and Data Integrity Verification | **Non-compliant** | Lockfile integrity helps npm installs, but `.github/workflows/deploy-lambdas.yml` does not verify deployment artifacts or use immutable action SHAs. `apps/web/index.html` loads external fonts and `apps/web/public/traffic-sim.html` loads an external Tailwind script without SRI. Critical repository/service writes do not consistently record actor plus before/after values. |
| SECURITY-14: Alerting and Monitoring | **Non-compliant** | `MonitoringStack` in `infrastructure/lib/stacks/monitoring-stack.ts` provides general Lambda, DynamoDB, API alarms and a dashboard, but omits Leaderboard/newer resources and security-event alarms. `LambdaStack`, `LeaderboardLambdaStack`, and `ApiStack` retain logs for one month; `EventBridgeStack` retains event logs/archives for seven days. Both are below the baseline's 90-day default, and no authentication/authorization-failure alerts are defined. |
| SECURITY-15: Exception Handling and Fail-Safe Defaults | **Non-compliant** | Service entry points have top-level catches and Game uses `sanitizeError`, but Leaderboard's `handler`/`handleHttpGraphQLRequest` in `services/leaderboard/src/index.ts` return internal error messages, and web `ErrorBoundary` renders stacks. `hasOptedOut` in `services/game/src/activation-email.ts` explicitly treats a failed preference read as permission to send. `EventPublisherService.publishGameCompleted` swallows both delivery failures, and not every external call has local fail-closed handling. |

### Highest-priority security findings for later work

1. Remove sensitive/full-event logging and standardize structured, redacted logs before extending game telemetry (SECURITY-03).
2. Add the required web/HTML security headers and stop exposing client stack traces (SECURITY-04, SECURITY-09, SECURITY-15).
3. Put every operation behind bounded schema validation and define a trustworthy score/result contract for a browser-simulated circuit (SECURITY-05, SECURITY-11).
4. Reconcile the public Auth route with cryptographic token validation and role-based admin authorization (SECURITY-08, SECURITY-12).
5. Add reproducible dependency locking, scanning, SBOM/artifact verification, and pinned CI tools/actions (SECURITY-10, SECURITY-13).
6. Raise log retention and add security-event alarms across all services (SECURITY-14).

## Relevance to Adding Circuit Builder

### Existing assets worth reusing

- React 18, Tailwind, and Framer Motion already support the requested dark, animated browser UI.
- `MiniGolfGamePage` supplies a proven viewport-to-logical-coordinate conversion and animation cleanup pattern.
- `BondAndBurnGamePage` supplies mouse drag, touch hit-testing, and tap fallback behavior for a science interaction.
- The web test stack already supports deterministic unit and property tests. A pure circuit model can be tested without rendering React.
- `startGame`, `completeGame`, `ScoreBreakdownModal`, and catalog-backed `GameHubPage` provide the current session/completion shell.

### Gaps that later requirements/design must account for

- dnd-kit is not an active application pattern; its only core consumer is orphaned. Keyboard-accessible wire/terminal manipulation needs deliberate design rather than copying current drag behavior.
- The repository has no circuit graph, electrical calculation library, reusable canvas scene graph, particle engine, or sound-effects service.
- Series/parallel connectivity, open switches, source/load polarity, resistance/current rules, and direct-source short detection should be isolated from React and covered by example and property tests.
- Circuit Builder registration must be consistent across `ROUTES` in `apps/web/src/config/constants.ts`, routes in `apps/web/src/App.tsx`, catalog/category/paid lists, `apps/web/src/locales/en.json`, `apps/web/src/locales/es.json`, and `apps/web/src/locales/pt.json`, Game validation/scoring/event mapping, Leaderboard enums, reviews, history/achievements/admin/email maps, and catalog/theme data.
- Client-reported simulation success cannot be treated as authoritative without accepting the existing score-tampering risk or defining additional server-side validation.
- Responsive mouse/touch support is not enough for accessibility. The component tray, terminals, wires, switches, fault feedback, and completion state need keyboard and assistive-technology semantics.
- Success audio must respect browser gesture/autoplay rules and user sound preferences; the current application has no shared jingle layer.
- Backend work should not rely on the current deployment workflow as a test gate. Game and Leaderboard suites need to be compilable and relevant checks must run before release.
