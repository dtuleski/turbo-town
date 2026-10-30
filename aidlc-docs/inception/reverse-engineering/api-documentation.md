# API Documentation

## Verified against

- `infrastructure/lib/stacks/api-stack.ts` (`ApiStack`) and `infrastructure/lib/stacks/database-stack.ts` (`DatabaseStack`)
- `services/game/src/index.ts` (`handler`) and `services/game/src/handlers/game.handler.ts` (`GameHandler`)
- `services/game/src/services/game.service.ts` (`GameService`) and `services/game/src/utils/validation.ts`
- `services/leaderboard/src/index.ts`, `services/leaderboard/src/handlers/graphql.handler.ts`, `services/leaderboard/src/handlers/event.handler.ts`, and `services/leaderboard/src/types/index.ts`
- `services/auth/src/index.ts`, `services/auth/src/handlers/auth.handler.ts`, `services/auth/schema.graphql`, and `services/auth/src/utils/token.ts`
- `apps/web/src/api/game.ts`, `apps/web/src/api/client.ts`, `apps/web/src/api/leaderboard.ts`, `apps/web/src/api/language.ts`, `apps/web/src/api/admin.ts`, and `apps/web/src/api/stripe.ts`
- `packages/shared/src/index.ts`, `types/`, `schemas/`, `constants/`, and `utils/calculations.ts`
- DynamoDB access code under `services/game/src/repositories/`, `services/auth/src/repositories/`, and `services/leaderboard/src/repositories/`

## Transport model and contract authority

The public service endpoints accept GraphQL-shaped JSON over API Gateway HTTP API. The Lambdas do not instantiate a GraphQL parser or executor. They extract an operation name with regular expressions and call TypeScript methods. Consequently, runtime handlers and client documents are more authoritative than the checked-in `.graphql` files.

A typical request body has `query`, optional `variables`, and optional `operationName`. Successful Game and Leaderboard HTTP responses generally use `{"data":{"operationName":...}}`; operation failures use an `errors` array. This notation describes the envelope only and does not expose credentials.

Contract drift is material:

- `services/game/schema.graphql` omits optional completion metrics and many routed admin, review, email, contact, and subscription operations.
- `services/leaderboard/schema.graphql` lists only four game types plus Overall, while `services/leaderboard/src/types/index.ts` has the current runtime enum.
- The Auth schema is closer to its resolver surface, but the current web authentication path calls Amplify/Cognito directly rather than the Auth Lambda.

## API Gateway routes

`infrastructure/lib/stacks/api-stack.ts` (`ApiStack`) defines these source-managed routes:

| Method and path | Integration | Authentication | Runtime purpose |
|---|---|---|---|
| `POST /auth/graphql` | Auth Lambda | No API Gateway authorizer | Older registration, login, token, verification, and profile API. Protected resolvers inspect an Authorization header themselves. |
| `POST /game/graphql` | Game Lambda | Cognito `HttpUserPoolAuthorizer` | Game lifecycle, catalog, language, subscription, review, preference, contact, and admin operations. |
| `POST /game/public` | Game Lambda | None | Only `checkUsernameAvailable`; `services/game/src/index.ts` rejects other operations on this path. |
| `POST /leaderboard/graphql` | Leaderboard Lambda | Cognito `HttpUserPoolAuthorizer` | Leaderboard, rank, history, and admin clear operations. The Lambda validates the bearer token again against Cognito JWKS. |

The API allows GET, POST, and OPTIONS in CORS configuration, but only POST routes are registered. Allowed origins vary by environment and include DashDen web origins plus local ports 3000 and 5173. The default stage uses JSON access logs, burst 500, and rate 200.

### Handler-supported paths not defined by the current CDK route table

| Intended method and path | Handler | Authentication/control | Behavior |
|---|---|---|---|
| `POST .../webhook` | `services/game/src/index.ts` (`handleStripeWebhook`) or standalone `services/game/src/webhook.ts` (`handler`) | Stripe signature verification | Verifies the raw body/signature, then calls `StripeService.handleWebhook`. No `/webhook` route is present in `ApiStack`. |
| `GET .../unsubscribe?userId=...&type=activation` | `services/game/src/index.ts` (`handleUnsubscribe`) | No Cognito authentication | Writes `activationEmailOptOut: true` for activation mail and returns HTML. No `/unsubscribe` route is present in `ApiStack`. |

No live API Gateway state was queried, so manually created routes may exist outside source.

## Lambda handlers

| Entry point | Event shape | Purpose and source-managed deployment status |
|---|---|---|
| `services/game/src/index.ts` (`handler`) | API Gateway HTTP API v2-like event | Main Game HTTP adapter. `LambdaStack` points `NodejsFunction.entry` here. |
| `services/auth/src/index.ts` (`handler`) | API Gateway proxy event | Older Auth HTTP adapter. `LambdaStack` points `NodejsFunction.entry` here. |
| `services/leaderboard/src/index.ts` (`handler`) | EventBridge, API Gateway HTTP API, or AppSync-like event | Multiplexes completion consumption and leaderboard queries. `LeaderboardLambdaStack` points here. |
| `services/leaderboard/src/handlers/event.handler.ts` (`handler`) | `EventBridgeEvent<'GameCompleted', GameCompletedDetail>` | Internal exported completion consumer called by the Leaderboard entry point. |
| `services/leaderboard/src/handlers/graphql.handler.ts` (`handler`) | `AppSyncEvent` | Internal exported GraphQL resolver adapter called by the Leaderboard entry point. |
| `services/email-sender/index.js` (`exports.handler`) | Cognito CustomEmailSender event | Decrypts the Cognito code with the AWS Encryption SDK and sends through Resend. It is deployed by `.github/workflows/deploy-lambdas.yml`, not by the current CDK app. |
| `services/game/src/daily-email.ts` (`handler`) | Scheduled invocation, no input required | Sends opted-in daily digests using email preferences, recent leaderboard entries, and aggregates. Not instantiated by current CDK. |
| `services/game/src/activation-email.ts` (`handler`) | Scheduled invocation, no input required | Finds verified Cognito users with zero games, respects activation opt-out, and sends activation email. A manual deployment script exists; current CDK does not instantiate it. |
| `services/game/src/pre-signup.ts` (`handler`) | Cognito Pre Sign-Up trigger | Links external-provider sign-ups to matching native users or auto-confirms a new external user. Not attached by current CDK source. |
| `services/game/src/webhook.ts` (`handler`) | API Gateway-like Stripe webhook event | Standalone Stripe webhook adapter; the main Game handler also contains webhook logic. Not instantiated by current CDK. |

## Authentication and authorization

### Game API

API Gateway validates the Cognito JWT on `/game/graphql`. `services/game/src/index.ts` reads `sub`, username candidates, and email from `event.requestContext.authorizer.jwt.claims`. It accepts `checkUsernameAvailable` without `sub` and enforces that it is the only operation on `/game/public`.

Admin authorization is a hard-coded email/username allowlist in `services/game/src/handlers/game.handler.ts` (`isAdminUser`). It guards analytics, user listing, language maintenance, subscription changes, user deletion/confirmation, email-preference administration, and presigned uploads.

### Leaderboard API

API Gateway validates the JWT, then `services/leaderboard/src/handlers/graphql.handler.ts` calls `authenticateRequest`. `services/leaderboard/src/utils/auth.util.ts` checks issuer, expiry, token use, and signature against Cognito JWKS. It does not validate an audience/client ID. Every request also consumes one token from the DynamoDB-backed `RateLimiter`, configured by default for 100 tokens and 100 tokens per minute.

`clearAllRecords` additionally checks a hard-coded admin email list.

### Auth API

`/auth/graphql` has no API Gateway authorizer. `getCurrentUser`, `logout`, and `updateProfile` require a bearer token in resolver code. `services/auth/src/utils/token.ts` parses the JWT payload and expiration but does not verify its signature because the code assumes API Gateway already authenticated it. That assumption does not match `ApiStack`.

### Web and mobile callers

`apps/web/src/api/client.ts` and `apps/web/src/api/leaderboard.ts` call Amplify `fetchAuthSession` and send the Cognito ID token as `Authorization: Bearer <token>`, with a local-storage fallback. `apps/mobile/lib/api/graphql_client.dart` and `CognitoService` follow the same ID-token contract. Tokens and credentials are not reproduced here.

## Game API operation catalog

All operations below route through `services/game/src/handlers/game.handler.ts` (`GameHandler.routeOperation`). Except `checkUsernameAvailable`, they are intended for `/game/graphql` and require an authenticated `userId`. Runtime response keys are generated from the operation name normalized to lower camel case.

### Game lifecycle contracts

#### `startGame(input: StartGameInput)`

**Client:** `apps/web/src/api/game.ts` (`startGame`)  
**Runtime:** `GameHandler.startGame` to `GameService.startGame`

Input:

| Field | Runtime validation |
|---|---|
| `themeId: string` | Required, minimum length 1. Named IDs such as `MINI_GOLF` are accepted. |
| `difficulty: number` | Required integer from 1 through 5. |

Processing order in `GameService.startGame`:

1. Read the user's tier through `SubscriptionRepository.getTier`.
2. Reject Free users for `SPACE_ENTRY`, `SCRATCH_CODING`, `BOND_AND_BURN`, `TRAFFIC_LAB`, `MINI_GOLF`, or `LANGUAGE_PRONUNCIATION`.
3. Reject Free users for difficulty 4 or higher.
4. Call `RateLimiterService.checkLimit` using limits Free 3, Light 20, Standard 100, and Premium 1,000 per UTC day.
5. Call `ThemeRepository.validateTheme`; the theme row must exist and be `PUBLISHED` or expose `isPublished`.
6. Create an `IN_PROGRESS` game row with a UUID, then increment rate-limit use and emit a metric.

Response:

| Field | Meaning |
|---|---|
| `id`, `userId`, `themeId`, `difficulty`, `status`, `startedAt` | Created session. |
| `canPlay` | Whether another play remains after incrementing the current use. It is not permission for the session that was just created. At the exact limit, a valid session is created but this field is false. |
| `rateLimit` | `{ tier, limit, used, remaining, resetAt }`. |

Errors include paid-feature authorization, Super Hard authorization, daily rate limit, missing/unpublished theme, validation, and persistence errors. Errors are returned through a GraphQL-shaped `errors` array.

#### `completeGame(input: CompleteGameInput)`

**Client:** `apps/web/src/api/game.ts` (`completeGame`)  
**Runtime:** `GameHandler.completeGame` to `GameService.completeGame`

Input:

| Field | Runtime validation and use |
|---|---|
| `gameId: string` | Required UUID. The lookup key combines authenticated `userId` and this ID. |
| `completionTime: number` | Positive. Business validation requires at least `difficulty * 2` seconds and no more than 3,600 seconds. |
| `attempts: number` | Positive integer. Pair-count minimum validation applies only to Memory Match themes. |
| `correctAnswers?: number` | Optional non-negative integer; used with `totalQuestions` by most non-Memory games. |
| `totalQuestions?: number` | Optional positive integer. Runtime does not enforce `correctAnswers <= totalQuestions`. |
| `wordsFound?: number` | Optional non-negative integer for Word Puzzle. |
| `totalWords?: number` | Optional positive integer for Word Puzzle. |
| `hintsUsed?: number` | Optional non-negative integer included in event metrics. |
| `pauseCount?: number` | Optional non-negative integer included in event metrics. |

Processing:

1. Load the session by authenticated user and game ID; verify ownership and `IN_PROGRESS` status.
2. Validate time and, for Memory Match only, minimum attempts.
3. Derive client-reported accuracy. Word Puzzle uses `wordsFound / totalWords`; most other named games use `correctAnswers / totalQuestions`; Memory Match derives accuracy from attempts.
4. Call `ScoreCalculatorService.calculateScoreBreakdown`. The calculator caps difficulty 1/2/3+ at 5,000/6,500/8,000. `GameService` then applies another cap of 6,000 normally, 8,000 for premium/Super Hard, or 99,999 nominally for Mini Golf.
5. Update the Game row to `COMPLETED` with time, attempts, and server-calculated score.
6. Track achievements without allowing achievement failure to fail completion; publish metrics.
7. Publish `GameCompleted` through EventBridge and a direct asynchronous Leaderboard Lambda invocation. Both delivery failures are logged and swallowed.

Response:

| Field | Meaning |
|---|---|
| `id`, `status`, `completedAt`, `completionTime`, `attempts`, `score` | Updated Game result. |
| `scoreBreakdown` | `{ baseScore, difficultyMultiplier, speedBonus, accuracyBonus, finalScore, difficulty, completionTime, accuracy }`. |
| `leaderboardRank` | Always `null` in `GameHandler.completeGame`; Leaderboard processing is asynchronous. |
| `achievements` | Array of `{ type, unlocked, progress }`; the client requests `completedAt`, but the handler mapping does not provide it. |

The backend trusts browser-supplied completion time and accuracy counters. It bounds some values but does not reconstruct game-specific outcomes from authoritative state.

### Other game and catalog queries

| Runtime operation | Variables/input | Response and notable behavior |
|---|---|---|
| `getGame` | `gameId: string` | Game identity, owner, theme, difficulty, status, timestamps, time, attempts, and score. Ownership is checked. |
| `getGameHistory` | `input: GameHistoryInput` | `{ games, pagination }`. Defaults: page 1, page size 20, date descending; page size max 100. Optional theme/difficulty/date/sort fields validate, but date filtering and true cursor pagination are TODO. Free users are rejected. `themeName` is currently empty. |
| `getUserStatistics` | None | Totals, averages, best/fastest, favorite theme/difficulty, and streak placeholders. Reads up to 1,000 completed games and caches for five minutes. |
| `canStartGame` | None | `{ canPlay, rateLimit, message }`. Current `GameService.canStartGame` always returns `canPlay: true`, `used: 0`, and full remaining quota; only its tier/limit lookup is meaningful. |
| `listAvailableGames` | None | Array of catalog items `{ gameId, title, description, icon, route, status, displayOrder, ageRange, category }`. `GameCatalogRepository.getAllGames` queries `ACTIVE` and `COMING_SOON` through `StatusIndex` and sorts by `displayOrder`. |

### Review API

| Operation | Input | Response and storage |
|---|---|---|
| `submitGameReview` | `{ input: { gameType: string, rating: integer } }` | `{ success: true }`. Rating must be 1 through 5. `gameType` is not allowlisted. `ReviewService.submitReview` upserts `PK=USER#<userId>`, `SK=REVIEW#<gameType>`. |
| `getUserReview` | `{ gameType: string }` | `{ rating: number | null }` from the same composite key. |
| `getReviewStats` | None | `{ perGame, overall }`, where each entry is `{ gameType, averageRating, totalReviews }`. Aggregation queries `gameType-index`. The allowlist ends at Math Maze, so newer game reviews are stored but absent from aggregates. |

These operations are implemented in `services/game/src/services/review.service.ts` and consumed by `apps/web/src/api/game.ts` plus `ScoreBreakdownModal`.

### Language API

| Operation | Input | Response |
|---|---|---|
| `getLanguageWords` | `languageCode`, `category`, `difficulty`, `count` | `LanguageWord[]` with `id`, translated `word`, `pronunciation`, `correctImageUrl`, distractors, and category. Count must be 1 through 50. Current repository scans multi-language rows, prioritizes requested difficulty, de-duplicates translated words, shuffles, and slices. |
| `saveLanguageGameResult` | `{ languageCode, score, correctAnswers, totalQuestions, difficulty, category, timeSpent, xpGained }` | Result plus generated `gameId`; also updates XP, level, learned-word count, and last-played progress. |
| `getUserLanguageProgress` | None | All `{ languageCode, xp, level, wordsLearned, accuracy, lastPlayed }` rows for the caller. |
| `getLanguageProgressByCode` | `languageCode` | One progress object or `null`. |

`apps/web/src/api/language.ts` also defines `getUserCountry`, which calls the external `ipapi.co` endpoint directly from the browser. That call does not pass through DashDen's API.

### Subscription and Stripe operations

| Operation | Input | Response and validation |
|---|---|---|
| `createCheckoutSession` | `{ input: { priceId, tier } }` | `{ sessionId, url }`. Tier must be `LIGHT`, `STANDARD`, or `PREMIUM`; the handler substitutes its server-side tier-to-price mapping when the client value differs. In-memory limit: five attempts per user per hour per warm container. |
| `createPortalSession` | None | `{ url }`; requires an existing subscription with `stripeCustomerId`. |
| `changePlan` | `{ input: { tier } }` | Stripe service result, normally `{ success, tier }`; tier maps to a server-side price. |
| `verifyCheckoutSession` | `sessionId` | `{ success, tier }` and sometimes `message`; verifies session ownership and payment, then writes the subscription. |

The browser GraphQL documents are in `apps/web/src/api/stripe.ts`. The current `services/game/schema.graphql` declares an incomplete `CreateCheckoutSessionInput` and omits `changePlan` and `verifyCheckoutSession`.

### Admin, preference, contact, and public operations

| Operation | Input | Response |
|---|---|---|
| `getAdminAnalytics` | None | Overview, tier distribution, recent activity, and top users from `AdminService`. |
| `listAllUsers` | Optional page/pageSize/tier/sort input | `{ users, pagination }`, with Cognito status, game count, tier, and rate-limit details. |
| `getAllLanguageWords` | None | All administrative language-word records. |
| `getLanguageWordById` | `wordId` | One administrative language-word record. |
| `createLanguageWord` | Category, difficulty, language code, translations, image URL, distractors | Created record with generated `wordId` and timestamps. |
| `updateLanguageWord` | `wordId` plus optional image/distractor/translation changes | Updated record. |
| `deleteLanguageWord` | `wordId` | `{ success: true, wordId }`. |
| `updateUserSubscription` | `{ userId, tier, status }` | Echoes updated user/tier/status after persistence. |
| `adminDeleteUser` | `userId` | `{ success, userId }`; service comment restricts this to a Free-tier user. |
| `adminConfirmUser` | `email` | `{ success: true, email }` after Cognito confirmation. |
| `getPresignedUploadUrl` | `{ filename, contentType }` | `{ uploadUrl, publicUrl, key }`; URL expires after 300 seconds and key is under `language-images/`. |
| `getEmailPrefs` | None | Existing preference or `{ userId, dailyDigest: false }`. |
| `setEmailPrefs` | `{ input: { dailyDigest } }` | `{ userId, email, username, dailyDigest, updatedAt }`, although the browser selects only user ID and flag. |
| `adminSetEmailPrefs` | Target identity plus `dailyDigest` | Updated target preference. |
| `adminGetAllEmailPrefs` | None | `{ users: EmailPrefs[] }`, filtered to opted-in users. |
| `submitContactForm` | `{ type, subject, message }` | `{ success: true }`. Subject and message are required; limits are 200 and 5,000 characters. |
| `checkUsernameAvailable` | `username` | `{ available: boolean }`; trims/lowercases and performs Cognito exact/original/prefix searches. This is the only operation allowed on `/game/public`. |

## Leaderboard API

### Runtime enums

`services/leaderboard/src/types/index.ts` and `apps/web/src/api/leaderboard.ts` currently define these game types:

`MEMORY_MATCH`, `MATH_CHALLENGE`, `WORD_PUZZLE`, `LANGUAGE_LEARNING`, `SUDOKU`, `JIGSAW_PUZZLE`, `BUBBLE_POP`, `SEQUENCE_MEMORY`, `CODE_A_BOT`, `GEO_QUIZ`, `HISTORY_QUIZ`, `CIVICS_QUIZ`, `COLOR_BY_NUMBER`, `HANGMAN`, `TIC_TAC_TOE`, `MATH_MAZE`, `PATTERN_RECALL`, `SPACE_ENTRY`, `SCRATCH_CODING`, `BOND_AND_BURN`, `TRAFFIC_LAB`, `MINI_GOLF`, and `OVERALL`.

`LANGUAGE_PRONUNCIATION` is absent. Timeframes are `DAILY`, `WEEKLY`, `MONTHLY`, and `ALL_TIME`. Event difficulties accept `EASY`, `MEDIUM`, `HARD`, `BEGINNER`, `INTERMEDIATE`, and `ADVANCED`.

### Operations

| Operation | Variables | Response and behavior |
|---|---|---|
| `getLeaderboard` | `gameType`, `timeframe`, optional `limit` 1 through 100 | `{ entries, currentUserEntry, totalEntries, timeframe }`. Entries include rank, user/game identity, score, difficulty, completion time, accuracy, timestamp, and current-user flag. Time-based boards keep each user's best score. All-time uses aggregates. Overall fans out over every listed game type. |
| `getUserRank` | `gameType`, `timeframe` | `{ rank, score, gameType, timeframe, totalPlayers, percentile }` or `null`. |
| `getUserScoreHistory` | Optional `gameType`, optional `limit` 1 through 100 | Caller-owned `LeaderboardEntry[]`, newest first through `UserScoreHistoryIndex`. |
| `clearAllRecords` | None | `{ success, message }`; hard-coded admin email only. It scans and deletes entries and aggregates one item at a time. This mutation exists at runtime but is absent from `services/leaderboard/schema.graphql`. |

`apps/web/src/api/leaderboard.ts` is the browser client. It has a source fallback endpoint in addition to `VITE_LEADERBOARD_ENDPOINT` and a derived `VITE_API_URL` path.

### `GameCompleted` event contract

`services/game/src/types/index.ts` (`GameCompletedEvent`) publishes:

| Field | Shape |
|---|---|
| Identity | `gameId`, `userId`, `username`, `gameType` |
| Result | difficulty label, calculated `score`, completion time in seconds, accuracy ratio |
| `performanceMetrics` | Attempts; optional answer/word counters; hints, pauses, and average response time |
| Timestamp | ISO 8601 string |

Envelope fields are `source: game-service`, `detail-type: GameCompleted`, and `detail: event`. `Leaderboard EventHandler.validateEvent` requires all core fields, score at least zero, completion time above zero, accuracy from zero through one, and a game type in its local enum.

`LeaderboardRepository.createEntry` derives:

- Primary key `gameType`.
- Sort key `scoreTimestamp = SCORE#<zero-padded score>#TIMESTAMP#<timestamp>`.
- `date`, ISO `week`, `month`, and the three timeframe GSI partition keys.
- Metadata and `suspicious` anomaly flag.

The same completion can arrive through EventBridge and direct Lambda invocation. Entry keys usually overwrite the same game score/timestamp, but `AggregateRepository.updateAggregate` performs a read followed by `PutItem`, so duplicate or concurrent delivery can double-count or lose updates.

## Auth API

The Auth runtime resolver surface in `services/auth/src/handlers/auth.handler.ts` is:

| Operation | Auth requirement | Input | Response |
|---|---|---|---|
| `register` | Public | Email, password, display name | `{ user, accessToken: "", refreshToken: "", expiresIn: 0 }`; verification is required. |
| `verifyEmail` | Public | Email and code | Updated shared `User`. It is declared as a query. |
| `login` | Public | Email and password | `{ user, accessToken, refreshToken, expiresIn }`. |
| `loginWithSocial` | Public | Provider `GOOGLE` or `FACEBOOK`, provider access token | Same Auth response; creates a local user when absent. |
| `requestPasswordReset` | Public | Email | `true` after Cognito forgot-password request. |
| `confirmPasswordReset` | Public | Email, code, new password | `true`. |
| `refreshToken` | Public | Refresh token | `{ accessToken, refreshToken, expiresIn }`. |
| `getCurrentUser` | Bearer token in resolver | None | Shared `User` loaded by Cognito ID. |
| `logout` | Bearer token in resolver | None | `true` after Cognito global sign-out. |
| `updateProfile` | Bearer token in resolver | Optional display name and avatar URL | Updated shared `User`. |

Auth operation routing uses the parsed named operation, not a real selection-set parser. For example, the resolver keys are lower camel case. Callers must keep the operation name aligned with the field name or use an unnamed operation whose first field is the resolver name.

The current React app does not call these operations for normal authentication. `apps/web/src/context/AuthContext.tsx` uses `aws-amplify/auth` directly and only calls `/game/public` for username availability.

## Browser and mobile client APIs

### Web exported functions

- `apps/web/src/api/game.ts`: `startGame`, `completeGame`, `getUserStatistics`, `getGameHistory`, `canStartGame`, `listAvailableGames`, `submitGameReview`, `getUserReview`, `getReviewStats`, `getEmailPrefs`, `setEmailPrefs`, `adminSetEmailPrefs`, `adminGetAllEmailPrefs`, and `submitContactForm`.
- `apps/web/src/api/leaderboard.ts`: `getLeaderboard`, `getUserRank`, `getUserScoreHistory`, and `clearAllRecords`.
- `apps/web/src/api/language.ts`: `getLanguageWords`, `saveLanguageGameResult`, `getUserLanguageProgress`, `getLanguageProgressByCode`, and browser-only `getUserCountry`.
- `apps/web/src/api/admin.ts`: analytics/user/language/subscription/Cognito-admin/presigned-upload wrappers.
- `apps/web/src/api/stripe.ts`: exported GraphQL documents for checkout, portal, verification, and plan change; pages execute them through `gameClient`.

### Mobile exported methods

`apps/mobile/lib/api/game_api.dart` (`GameApi`) exposes `startGame`, `completeGame`, and `canStartGame`. `apps/mobile/lib/api/game_models.dart` manually maps `RateLimitInfo`, `StartGameResult`, `ScoreBreakdown`, `CompleteGameResult`, and `CanStartGameResult`. It does not import a generated schema or shared TypeScript contract.

## Internal service APIs

### Game internals

| Class | Principal methods |
|---|---|
| `GameService` | `startGame`, `completeGame`, `getGame`, `getGameHistory`, `getUserStatistics`, `canStartGame` |
| `GameRepository` | `create`, `getById`, `update`, `queryByUser`, `queryByStatus`, `delete` |
| `ThemeRepository` | `getById`, `validateTheme` |
| `GameCatalogRepository` | `listAvailableGames`, `getAllGames` |
| `SubscriptionRepository` | `getByUserId`, `getTier`, `updateSubscription` |
| `RateLimitRepository` | `get`, `upsert`, `increment`, `reset` |
| `AchievementRepository` | `create`, `getByUser`, `getByUserAndType`, `update`, `unlock` |
| `LanguageRepository` | Word reads/admin CRUD, result writes, and progress reads/writes |
| `ScoreCalculatorService` | `calculateScore`, `calculateScoreBreakdown` |
| `RateLimiterService` | `checkLimit`, `incrementUsage`, `getTierLimit`, `getNextMidnightUTC` |
| `EventPublisherService` | `publishGameCompleted` |
| `ReviewService` | `submitReview`, `getUserReview`, `getReviewStats` |
| `EmailPrefsService` | `getPrefs`, `setPrefs`, `getOptedInUsers` |

### Leaderboard internals

`services/leaderboard/src/index.ts` explicitly exports `ScoringService`, `LeaderboardService`, `LeaderboardRepository`, `AggregateRepository`, and every symbol from `types/index.ts`.

- `LeaderboardService`: `getLeaderboard`, `getUserRank`, `getUserScoreHistory`, `createLeaderboardEntry`, `updateUserAggregate`, and `clearAllRecords`.
- `LeaderboardRepository`: `createEntry`, `queryByGameTypeAndTimeframe`, `queryUserHistory`, and `clearAllEntries`.
- `AggregateRepository`: `getAggregate`, `getTopAggregates`, `updateAggregate`, and `clearAllAggregates`.
- `ScoringService`: calculation/configuration methods plus `validateScore`.
- `AnomalyService`: `detectAnomalies`, `getGameStatistics`, and `updateGameStatistics`.
- `RateLimiter`: `checkRateLimit`, `getRateLimitStatus`, and `resetRateLimit`; `enforceRateLimit` throws `RateLimitError` when denied.

## Shared package API

`packages/shared/src/index.ts` is the public barrel for `@memory-game/shared`.

### Types and entities

- Enums: `UserRole`, `SubscriptionTier`, `GameStatus`, `TimePeriod`, `SubscriptionStatus`, `BillingPeriod`, `ThemeCategory`, `ThemeStatus`, `AchievementType`, `InvoiceStatus`, `UITheme`.
- Entities: `User`, `Game`, legacy `LeaderboardEntry`, `Subscription`, `ThemePair`, `Theme`, `Achievement`, `RateLimit`, `Invoice`, `UserSettings`.
- Generic API shapes: `PaginationInput`, `PaginatedResponse<T>`, `GameFilters`, `LeaderboardFilters`, `ThemeFilters`, and `UserFilters`.

### Validation APIs

`packages/shared/src/schemas/index.ts` exports:

- `validate<T>(schema, data): Result<T>`.
- `getCachedSchema<T>(key, schemaFactory): ZodSchema<T>`.
- `userSchema`, `userCreateSchema`, `userUpdateSchema`, `emailSchema`, `passwordSchema`.
- `gameSchema`, `gameCreateSchema`, `gameCompleteSchema`.
- Theme, subscription, leaderboard, and achievement schemas and their inferred input types.

These schemas model the original Memory Match domain and are not the runtime Game request schemas in `services/game/src/utils/validation.ts`.

### Errors, results, utilities, and constants

- `AppError` with `toJSON` and `toLogFormat`; typed `AuthenticationError`, `AuthorizationError`, `ValidationError`, `NotFoundError`, `RateLimitError`, and `PaymentError`.
- `Result<T>`, `Success<T>`, `Failure`, `success(data)`, and `failure(error)`.
- `scoreUtils.calculateGameScore`, `calculateRank`, and `qualifiesForLeaderboard`.
- `statsUtils.average`, `median`, and `percentile`.
- `RATE_LIMITS`, `SUBSCRIPTION_PRICING`, `ACHIEVEMENTS`, `APP_CONSTANTS`, and `ERROR_CODES`.

The shared rate limits and pricing differ from current Game Service and subscription UI values, so consumers must not assume they describe current entitlement behavior.

## DynamoDB tables and key schemas

### Tables defined by `DatabaseStack`

All listed tables use on-demand billing and AWS-managed encryption. Names use the shown environment suffix.

| Table | Primary key | Secondary indexes | Runtime model/purpose |
|---|---|---|---|
| `memory-game-users-{env}` | Partition `userId` | `EmailIndex(email)`, `CognitoIdIndex(cognitoId)` | User identity/profile. Auth `UserRepository` instead reads/writes primary key `id`, which conflicts with the CDK key. |
| `memory-game-games-{env}` | Partition `userId`, sort `gameId` | `ThemeIndex(themeId, completedAt)`, `StatusIndex(status, startedAt)` | Session theme ID, numeric difficulty, status, start/completion timestamps, client metrics, server score, and audit timestamps. |
| `memory-game-catalog-{env}` | Partition `gameId` | `StatusIndex(status, displayOrder)` | Hub title, description, icon, route, state, display order, age range, and category. |
| `memory-game-leaderboards-{env}` | Partition `themeIdDifficultyPeriod`, sort `scoreUserId` | `UserIndex(userId, achievedAt)` | Legacy shared-model leaderboard, not the current dedicated Leaderboard Service store. |
| `memory-game-subscriptions-{env}` | Partition `userId` | `StripeCustomerIndex(stripeCustomerId)`, `StatusIndex(status, currentPeriodEnd)` | Tier, status, Stripe IDs, period dates, effective/start dates, and timestamps. |
| `memory-game-themes-{env}` | Partition `themeId` | `CategoryIndex(category, publishedAt)`, `StatusIndex(status, publishedAt)` | Operational game/theme registration. `ThemeRepository.validateTheme` requires a row and published state before play. |
| `memory-game-achievements-{env}` | Partition `userId`, sort `achievementType` | None | Type, progress, completed/unlocked state, and timestamps. Some repository methods incorrectly use sort-key attribute `type`. |
| `memory-game-rate-limits-{env}` | Partition `userId` | None | Tier, daily count, reset time, numeric expiry, updated time. CDK configures TTL on `resetAt`, while the repository stores that field as ISO text and numeric TTL in `expiresAt`. |
| `memory-game-user-settings-{env}` | Partition `userId` | None | Sound/music flags and volumes, notification, locale, UI theme, auto-progression, timestamps. |
| `memory-game-language-words-{env}` | Partition `wordId` | `CategoryIndex(category, difficulty)`, `LanguageIndex(languageCode, category)` | Category, difficulty, language code, translations, image, distractors, timestamps. Current gameplay reads scan rather than these indexes. |
| `memory-game-language-progress-{env}` | Partition `userId`, sort `languageCode` | None | XP, level, words learned, accuracy, last played, updated time. |
| `memory-game-language-results-{env}` | Partition `userId`, sort `gameId` | `LanguageIndex(languageCode, completedAt)` | Language result metrics and timestamps. |
| `memory-game-leaderboard-entries-{env}` | Partition `gameType`, sort `scoreTimestamp` | `DailyLeaderboardIndex(gameTypeDate, score)`, `WeeklyLeaderboardIndex(gameTypeWeek, score)`, `MonthlyLeaderboardIndex(gameTypeMonth, score)`, `UserScoreHistoryIndex(userId, timestamp)` | One completion projection with score/time/accuracy, derived periods, metadata, and anomaly flag. |
| `memory-game-user-aggregates-{env}` | Partition `userId`, sort `gameType` | `OverallLeaderboardIndex(gameType, totalScore)` | Username, total/games/average/best, last played, and daily/weekly/monthly scores and counts. Current top-aggregate reads scan instead of the index. |
| `memory-game-rate-limit-buckets-{env}` | Partition `userId` | None | Leaderboard API token count, last refill milliseconds, numeric `expiresAt` TTL. |

### Runtime-referenced tables absent from current `DatabaseStack`

| Expected table | Key contract | Consumers |
|---|---|---|
| `memory-game-reviews-*` | Partition `PK`, sort `SK`; GSI `gameType-index` on `gameType` | `ReviewService` |
| `memory-game-email-prefs-*` | Partition `userId` | `EmailPrefsService`, unsubscribe, daily email, activation email |
| `GameStatistics` or configured equivalent | Partition `gameType`, sort `difficulty` | `AnomalyService.getGameStatistics` and `updateGameStatistics` |

No live DynamoDB state was queried. These tables may be manually managed outside CDK.

## Principal data shapes and relationships

### Game session

A Game session belongs to one user through the `userId` partition and identifies a game kind through `themeId`. `gameId` is the DynamoDB sort key. `GameRepository.create` maps it to shared `Game.id` when returning a newly created object, but `getById` and `update` cast DynamoDB objects directly without mapping `gameId` back to `id`. This can make returned `id` undefined after a read/update.

### Catalog and theme

Catalog and theme are separate operational rows:

- A catalog row makes a tile discoverable and supplies its browser route.
- A theme row makes `startGame(themeId)` valid.
- A route can exist without a catalog tile, and a tile can exist while start fails because the theme is absent or unpublished.

### Review

One user/game review is addressed by `USER#<userId>` and `REVIEW#<gameType>`. Aggregate reads use the `gameType-index`. The service stores arbitrary `gameType` strings but reports only its hard-coded aggregate list.

### Leaderboard

Each completion creates or overwrites a Leaderboard entry keyed by game type and a score/timestamp composite. UserAggregate relates the same user to each game type and stores rolling counters. Rankings sort score descending, then completion time ascending. Anomaly flags remain stored with entries and are not filtered from normal reads.

### User and settings

The shared `User` entity uses `id`, while `DatabaseStack` declares `userId`; Auth repository operations use `id`. UserSettings consistently uses `userId`. Current web login generally bypasses the Auth tables and builds its user view from Cognito attributes.

## Response/error behavior

- `GameHandler.handleRequest` catches operation errors, sanitizes them, and returns an `errors` array inside HTTP 200. Top-level Game parse/environment/auth failures return 401 only for messages containing `Unauthorized`; other top-level failures return 500.
- Auth returns HTTP 200 for resolver errors and HTTP 400 only when the request body is absent.
- Leaderboard's HTTP adapter wraps success under `data`; thrown resolver errors reach its catch and produce HTTP 500 with an `errors` array.
- Game completion deliberately treats achievement and completion-event delivery as non-blocking. Leaderboard/eventual ranking can therefore be absent even when the Game response succeeds.
