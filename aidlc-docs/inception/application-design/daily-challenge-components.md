# Daily Challenge and Push: Components

Plan and decisions: `../plans/daily-challenge-application-design-plan.md` (Q1 to Q11).
Method signatures: `daily-challenge-component-methods.md`. Flows: `daily-challenge-services.md`.

## 1. Shared core (`packages/shared/src/challenge/`)

Pure TypeScript, no I/O, no zod. Used by the Game Lambda and the digest Lambda through
`@memory-game/shared`, and by the web through one funnel file, `apps/web/src/utils/challengeShared.ts`
(relative source import, same pattern as `questShared.ts`; Vercel already builds these, Quest Map is
live).

| Component | File | Responsibility |
|---|---|---|
| C1 Challenge types | `types.ts` | `ChallengeDay` (`YYYY-MM-DD`), `RotationEntry`, `DailyChallenge`, per-game content types, `ChallengeContent` union, `ChallengeLanguage` (`en`, `es`, `pt`) |
| C2 Rotation config | `rotation.ts` | The 16 rotation entries (game id, theme id, difficulty 2, settings, `enabled` = has a generator); `eligibleRotation()`. A generator is registered only after the game's web and app given-content modes have shipped (unit-of-work, Deferred) |
| C3 Challenge clock | `day.ts` | US Eastern challenge day for an instant, day bounds, previous and next day, local date and time in any IANA zone, IANA zone check; DST-safe through `Intl.DateTimeFormat` |
| C4 Seeded random | `rng.ts` | String seed hash to 32-bit state, `mulberry32`, `randInt`, `shuffle`, `pick`; the only randomness the generators use |
| C5 Daily draw | `draw.ts` | Deterministic pick for a day from the eligible rotation, excluding the previous day's game when at least 2 are eligible |
| C6 Content generators | `generators/<game>.ts` | One seeded generator per game (DC2: code-a-bot; DC3: sudoku, math-challenge, math-maze, word-puzzle, hangman), ported from `apps/web/src/utils/*` with `Math.random` replaced by C4; word lists copied into `generators/data/` |
| C7 Completion check | `generators/index.ts` | Per game, the metric totals a completion must report for the content (`expectedTotals(content)`), used by the server check of FR-DC-19 |

## 2. Game Lambda (`services/game`, `MemoryGame-GameService-<stage>`)

| Component | File | Responsibility |
|---|---|---|
| G1 ChallengeRepository | `src/repositories/challenge.repository.ts` | Challenge item get and conditional create; score get, conditional best-score update, top N by `rank-index`, rank count |
| G2 ChallengeService | `src/services/challenge.service.ts` | `ensureChallenge(day)` (draw and create once), `getToday`, `validateStart`, `applyCompletion` (fail-soft), `getLeaderboard`, `getDayResults` (digest) |
| G3 GameService hooks | `src/services/game.service.ts` | Optional trailing `challengeService` dependency (like `questService`); start validation before the rate limit; paid-game gate skipped only for a validated challenge start; `finalizeChallenge` after `finalizeQuest` |
| G4 Handler routes | `src/handlers/game.handler.ts` | `getDailyChallenge`, `getChallengeLeaderboard` (DC2); `registerPushDevice`, `unregisterPushDevice`, `saveNotificationSettings` (DC1); `challenge` field on `completeGame` |
| G5 PushDeviceRepository | `src/repositories/push-device.repository.ts` | Device upsert by token hash, delete by owner, list by user (GSI), delete all for a user |
| G6 PushDeviceService | `src/services/push-device.service.ts` | Input validation (token format, platform, environment, zone, language), register, unregister (also deletes the SNS endpoint) |
| G7 EmailPrefsService | `src/services/email-prefs.service.ts` | `setPrefs` becomes UpdateItem; new `setLocale(userId, timeZone?, language?)`; send claims (`claimSend`, `releaseSend`) |
| G8 AccountDeletion | `src/services/account-deletion.service.ts` | Also deletes devices (and their SNS endpoints) and challenge scores, each only when its table env var is set |

## 3. Digest Lambda (`services/game/src/daily-email.ts`, `DashDen-DailyEmail-<stage>`)

| Component | File | Responsibility |
|---|---|---|
| N1 Tick handler | `src/daily-email.ts` | Exported `handler` kept; runs every 15 minutes: pre-draws today and tomorrow, loads opted-in users, decides per user what is due, sends, never throws for one user's failure |
| N2 Due planner | `src/notifications/due.ts` | Pure: for a user, zone, `now` and claims, which of digest email, digest push, challenge push are due (8:00 to 8:59 and 12:00 to 12:59 local) |
| N3 Digest content | `src/daily-email.ts` (existing builders) plus `src/notifications/challenge-section.ts` | Existing digest content unchanged; added section "Yesterday's challenge" (winner, top 3, own score and rank, or invitation) |
| N4 Push texts | `src/notifications/texts.ts` | en/es/pt titles and bodies for digest push and challenge push; game names per language |
| N5 APNs config | `src/notifications/apns-config.ts` | Reads secret `APNS_SECRET_ID` from Secrets Manager, caches 10 minutes, returns `null` when missing |
| N6 Push sender | `src/notifications/push-sender.ts` | SNS: create or re-enable the endpoint for a device, publish APNs JSON, remove the device on `EndpointDisabled` or invalid token; bounded concurrency |
| N7 Deploy script | `scripts/deploy-daily-email-lambda.sh` | Clean build and zip for `DashDen-DailyEmail-prod`, `--build-only` mode, backup, handler check; same pattern as `deploy-activation-email-lambda.sh` |

## 4. Web (`apps/web`)

| Component | File | Responsibility |
|---|---|---|
| W1 Challenge API | `src/api/challenge.ts` | `getDailyChallenge`, `getChallengeLeaderboard` (DC3 creates, DC4 extends), `saveNotificationSettings` (DC4) |
| W2 Challenge launch | `src/utils/challengeLaunch.ts` | `parseChallengeParam(search)` (`challenge=<day>`), route and query per game, used by `startGame` in `src/api/game.ts` (sends `challengeContext`) |
| W3 Given-content hook | `src/hooks/useChallengeContent.ts` | For a page opened with `?challenge=`, loads today's challenge, checks game and day, returns typed content or redirects to the hub |
| W4 Game pages (first batch) | `src/pages/{code-a-bot,sudoku,math,math-maze,word-puzzle,hangman}/*GamePage.tsx` | Play the given content instead of generating when in challenge mode; difficulty from the challenge |
| W5 Challenge card | `src/components/challenge/DailyChallengeCard.tsx` | Top of `GameHubPage`: game, Play, own best and rank, today's top 5; hidden when there is no challenge |
| W6 Results page | `src/pages/challenge/ChallengeResultsPage.tsx` | `/challenge/results?day=` (digest email link): the day's game, winner, top 10, own rank |
| W7 Locale sync | `src/hooks/useNotificationSettingsSync.ts` | After sign-in, saves the browser time zone and language when they differ from the last saved values |
| W8 Texts | `src/locales/{en,es,pt}.json`, `src/pages/profile/ProfilePage.tsx`, `src/pages/legal/PrivacyPage.tsx` | Toggle renamed "Daily emails and notifications"; challenge strings; privacy text (plan Q9) |

## 5. App (`apps/mobile`, Flutter, iOS)

| Component | File | Responsibility |
|---|---|---|
| M1 Challenge API and models | `lib/api/challenge_api.dart`, `lib/api/challenge_models.dart` | `getDailyChallenge`, `getChallengeLeaderboard`; typed content per game |
| M2 Session context | `lib/game/framework/game_session.dart`, `lib/api/game_api.dart` | `GameSessionArgs` gains `challengeDay`; `startGame` sends `challengeContext`; completion parses `challenge` |
| M3 Given-content mode | `lib/game/{code_a_bot,sudoku,math,math_maze,word_puzzle,hangman}/*`, `lib/ui/screens/games/*_screens.dart`, `lib/ui/router.dart` | Play routes accept `challenge=<day>`; controllers take given content |
| M4 Challenge card and results | `lib/ui/widgets/daily_challenge_card.dart`, `lib/ui/screens/challenge_results_screen.dart` | Card at the top of `HubScreen`; results screen at `/challenge/results` |
| M5 Push bridge | `ios/Runner/AppDelegate.swift`, `lib/push/push_channel.dart` | Method channel `app.dashden/push`: permission request, APNs token, notification tap payload, device IANA time zone |
| M6 Push controller | `lib/push/push_controller.dart` | Soft-ask flow (plan Q10), registration, sign-out unregister, tap routing (challenge push to `/`, digest push to `/challenge/results?day=`) |
| M7 Profile and locale | `lib/ui/screens/profile_screen.dart`, `lib/api/profile_api.dart`, `lib/l10n/app_*.arb` | Toggle renamed; time zone and language saved at sign-in |
| M8 iOS entitlement | `ios/Runner/Runner.entitlements`, `ios/Runner.xcodeproj/project.pbxproj` | `aps-environment` and `CODE_SIGN_ENTITLEMENTS` for Debug, Release, Profile |

## 6. Infrastructure (written as a plan, owner runs it)

| Component | Where | Notes |
|---|---|---|
| I1 Tables | `infrastructure/lib/stacks/database-stack.ts` | `memory-game-daily-challenge-<stage>`, `memory-game-push-devices-<stage>`; deployed with `cdk deploy MemoryGame-Database-prod --exclusively` after `cdk diff`, as Quest Map did |
| I2 Game Lambda config | CLI, read-merge-write | Env `DAILY_CHALLENGE_TABLE_NAME`, `PUSH_DEVICES_TABLE_NAME`; inline policy for both tables and indexes, `sns:DeleteEndpoint` on the platform application's endpoints |
| I3 Digest Lambda config | CLI | Env `DAILY_CHALLENGE_TABLE_NAME`, `PUSH_DEVICES_TABLE_NAME`, `APNS_SECRET_ID=dashden/apns/prod`; timeout 300 s; inline policy: email-prefs UpdateItem, both tables, SNS endpoint and publish actions, `secretsmanager:GetSecretValue` on the secret only |
| I4 Schedule | EventBridge | `DashDen-DailyDigest-Schedule` to `cron(0/15 * * * ? *)` right after the digest Lambda code deploy |
| I5 APNs | Apple Developer, Secrets Manager, SNS | Push capability on `app.dashden.dashdenMobile`, `.p8` key in `dashden/apns/prod`, SNS platform application `dashden-ios-prod` (APNS, token auth), ARN added to the secret |

## 7. Security Baseline compliance (design stage)

| Rule | Status | How |
|---|---|---|
| SECURITY-01 Encryption | Compliant | New tables use AWS-managed encryption; SNS, Secrets Manager, APNs and Resend calls are TLS |
| SECURITY-02 Access logging on intermediaries | N/A | No new API Gateway, load balancer or CDN; existing routes |
| SECURITY-03 Application logging | Compliant | Structured `logger`; push tokens, endpoint ARNs, secret values and email bodies are never logged; only user id, counts and error names |
| SECURITY-04 HTTP security headers | N/A | No new web host; `vercel.json` headers unchanged |
| SECURITY-05 Input validation | Compliant | Zod or explicit checks on every new input: day format, token hex length, platform and environment enums, IANA zone check with length cap, language enum, leaderboard `limit` 1 to 50 |
| SECURITY-06 Least privilege | Compliant | Inline policies per table ARN and index ARN; SNS actions scoped to the platform application; Secrets Manager scoped to one secret ARN |
| SECURITY-07 Network | N/A | No VPC or network change |
| SECURITY-08 Access control | Compliant | User id only from the verified JWT; unregister deletes only the caller's device (condition on `userId`); leaderboards return usernames, never user ids or tokens |
| SECURITY-09 Hardening | Compliant | Generic client errors (existing `sanitizeError`); push disabled, not failing, when unconfigured |
| SECURITY-10 Supply chain | Compliant | No new runtime dependency: AWS SDK clients are provided by the Lambda runtime (dev dependency for types only); the app uses a platform channel instead of a push plugin |
| SECURITY-11 Secure design | Compliant with a stated limit | The server fixes game, settings and day and checks completion totals; the score itself is still computed from client-reported metrics, the same trust level as the normal leaderboards. Server re-checking of answers (for example a submitted Sudoku grid) is a later improvement |
| SECURITY-12 Credentials | Compliant | APNs key only in Secrets Manager (and in SNS); no key in code, env vars or logs |
| SECURITY-13 Integrity | Compliant | Challenge content is generated and stored server-side; clients cannot choose it |
| SECURITY-14 Alerting | Compliant | The tick logs one summary line per run (sent, skipped, failed per kind); existing Lambda error metrics apply. A CloudWatch alarm on digest Lambda errors is listed in the production steps |
| SECURITY-15 Fail-safe | Compliant | Challenge start fails closed with one generic message and consumes no play; completion hook fails soft (normal score always saved); unset table env vars turn features off |
