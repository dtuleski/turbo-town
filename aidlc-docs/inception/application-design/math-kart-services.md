# Math Rally - Services and Orchestration

**Created**: 2026-11-25
**Stage**: INCEPTION - Application Design
**Scope**: how the components in `math-kart-components.md` work together at run time, what happens on every failure, which inputs are validated where, and which layer owns each invariant. No new deployable service is added: the work runs in the existing Game Service and Leaderboard Lambdas, the Vercel frontend, and the Flutter app.

---

## 1. Orchestrations

| Id | Orchestration | Owner | Section |
|---|---|---|---|
| O1 | Web race session (load engine, start, race, submit, result) | H2 `useMathRallyHost` | 2 |
| O2 | App race session (WebView, start, race, submit, result) | A2 `MathRallyPlayScreen` | 3 |
| O3 | Server start of a Math Rally game | B1 in `GameService.startGame` | 4.1 |
| O4 | Server completion and re-scoring | B2 `completeMathRallyGame` | 4.2 |
| O5 | Free-tier gate | B10 with S7 | 4.3 |
| O6 | Offline race in the app | A2 with G6 and S5 | 3 |
| O7 | Embed build and bundling | T1 | 4.4 |
| O8 | Release and data seeding | D1 and the release order | `math-kart-unit-of-work-dependency.md` Section 3 |

---

## 2. Web Race Session (O1)

The host is a small state machine in `useMathRallyHost` (phases in `math-kart-component-methods.md` Section 3). The page is reached only through `/math-rally/game?difficulty=<easy|medium|hard|superhard>[&quest=...]`; an invalid or missing `difficulty` redirects to the setup page before anything loads.

1. **loadingEngine.** `React.lazy` resolves the chunk. The hook checks `hasWebGL()`; then `mountMathRally(container, game, { assetBaseUrl: '/games/math-rally/', buildId })` with a `DirectChannel` pair. The effect cleanup calls `handle.destroy()`; under `React.StrictMode` the first mount is destroyed before the second is created, and G1's module guard makes a stray second instance impossible.
2. **ready.** BootScene sends `ready` after every asset and the font have loaded. Only now does the host call `startMathRallyGame({ themeId: 'MATH_RALLY', difficulty })` (FR-MK-25).
3. **starting.** On success the host validates nothing itself beyond "the field exists" and sends `init { mode: 'scored', race: result.mathRally, difficulty, language: i18n.language (en, es or pt, otherwise en), sound: readSoundPreference(), reducedMotion: readReducedMotion() }`. The game validates the payload (component methods Section 4) and starts the countdown.
4. **racing / paused.** `visibilitychange` to hidden sends `pause`. `pauseChanged` messages update the phase and, when `sound` changed, call `writeSoundPreference`. The ARIA live region is owned by the game core (G1 creates a visually hidden `aria-live="polite"` element inside the parent; G9 writes the current prompt and options into it as plain text), so the host needs no extra message. `exitRequested` navigates to the setup page; no `completeGame` call (FR-MK-22, Q36).
5. **submitting.** On `raceFinished`, the host calls `completeGame({ gameId, completionTime: raceTimeMs / 1000, attempts: forks, mathRallySubmission: { choices, forkTimesMs } })`. `correctCount` from the game is not sent.
6. **result.** `ScoreBreakdownModal` shows the server breakdown (`gameType` `MATH_RALLY` for reviews); "Play again" returns to the setup page (a new play), "Close" to the hub. In quest mode the existing rule R2 inside the modal applies.

Teardown on route change, on result and on every failure path: `handle.destroy()` in the effect cleanup (NFR-MK-5).

## 3. App Race Session (O2, O6)

`MathRallyPlayScreen` keeps one WebView mounted from entry until the result screen, so pausing never rebuilds the game (finding F8).

1. **loadingEngine.** The screen creates `InAppWebView` with the hardened settings of A5 and the entry URL from `gameEntryUrl`. A spinner overlays it. `GameSessionController` comes from `mathRallySessionProvider(args)` with `autoStart` behaviour off (the screen calls `start()` itself).
2. **ready.** The bridge receives `ready`. If `protocolVersion` is not in `kSupportedProtocolVersions`, the screen shows "Please update the app to play" and never calls `start()` (AC-49.2).
3. **starting.** `session.start()` runs the existing rules: rate limit, paywall or quest refusal block (BlockedView, or the map for a quest); any other failure gives an offline round with no game id.
   - Scored round: `state.startPayload` is checked with `validateRacePayload(raw, difficulty)`; the screen sends `init { mode: 'scored', race, ... }`.
   - Offline round (O6): the screen sends `init { mode: 'offline', seed: Random.secure().nextInt(1 << 32), ... }` and the game builds the race with the bundled S5. The result screen later says the race was not saved (existing `GameResult.saved == false`).
   - Settings: `sound` from `GameFeedback.isSoundEnabled()`, `reducedMotion` from `MediaQuery.disableAnimationsOf(context)`, `language` from the app locale (en, es or pt).
4. **racing / paused.** `didChangeAppLifecycleState` to `inactive`, `paused` or `hidden` sends `pause`. Android Back while racing sends `pause` (the game opens its menu); Back while paused opens the existing `confirmLeaveGame` dialog and leaves on confirm. `pauseChanged` calls `session.pause()` or `session.resume()` and stores a changed sound flag with `setSoundEnabled`. `exitRequested` pops the screen.
5. **submitting.** On `raceFinished`: scored rounds call `session.completeOrRecover(extra: { 'mathRallySubmission': { 'choices': ..., 'forkTimesMs': ... } }, attempts: forks, completionSeconds: (raceTimeMs / 1000).ceil())`. `ceil` keeps `forkTimesMs[last] <= completionTime * 1000` for the integer seconds the app API sends. Offline rounds call `session.complete()`.
6. **result.** On `completed` the screen disposes the WebView and shows `GameResultScreen` with "Play again" (back to setup) and, for quests, "Back to map".

## 4. Server Orchestrations

### 4.1 Start (O3), inside `GameService.startGame`
Order for `themeId === 'MATH_RALLY'` (existing steps unchanged for every other theme):
1. Tier lookup; quest validation (existing).
2. Paid gate with `isBlockedForFreeTier(themeId, difficulty)` (O5); difficulty-4 gate for FREE (existing).
3. **New**: difficulty must be 1 to 4, otherwise `ValidationError('Invalid difficulty for this game')`.
4. **New**: `seed = crypto.randomInt(0, 2 ** 32)`; `race = buildRace(seed, difficulty)`. Pure and fast (microseconds, unmeasured); built before step 5 so a failure here never consumes a play.
5. `checkLimit`; `validateTheme`; `create({ ..., mathRally: race.record })`; `incrementUsage` (existing order).
6. Return `{ game, canPlay, rateLimit, mathRally: race.payload }`; the handler adds `mathRally` to the mapped response.

### 4.2 Completion (O4), `completeMathRallyGame`
Runs after the existing ownership and status checks, before any generic logic. Stages, in order; any failure throws `ValidationError(MATH_RALLY_SUBMISSION_REJECTED_MESSAGE)` (one text, "This race could not be saved."), logs a warning `{ userId, gameId, stage }`, publishes `MathRallySubmissionRejected{Stage}`, and writes nothing:
1. `record`: `parseMathRallyRecord(game.mathRally)` (missing or malformed attribute).
2. `validation`: `validateMathRallySubmission(input.mathRallySubmission, input.completionTime, record)`.
3. `timing`: `checkTiming(forkTimesMs, completionTime, difficulty)` against `minForkTimesMs` and `minFinishTimeMs`.
4. Score: `correct = count(choices[k] === record.key[k])`; `calculateMathRallyBreakdown({ correct, forks, completionTime, difficulty, gameIsPaid: PAID_GAME_THEME_IDS.includes('MATH_RALLY') })`.
5. `gameRepository.update` with `status`, `completedAt`, `completionTime`, `attempts: forks`, `score`.
6. Achievements (non-blocking, same try/catch as the other exits); `publishGameCompleted` metric; GameCompleted event `{ gameType: 'MATH_RALLY', difficulty label as today, score, completionTime: max(1, t), accuracy: correct / forks, performanceMetrics: { attempts: forks, correctAnswers: correct, totalQuestions: forks, hintsUsed: 0, pauseCount: 0, averageResponseTime: max(1, round(t / forks)) } }`; `statisticsCache.delete(userId)`; info log with ids, difficulty, correct, forks and score.
7. `finalizeQuest(userId, game, score)` and return `{ game, achievements, scoreBreakdown, quest? }`.

A rejected game stays `IN_PROGRESS`, so a corrected submission for the same game can still complete it (AC-31.1); the existing status check refuses a second completion after success.

### 4.3 Free-tier gate (O5)
`startGame` replaces `PAID_GAME_THEME_IDS.includes(themeId) && tier === Free` with `tier === Free && isBlockedForFreeTier(themeId, difficulty)`. Same error class and message as today. For every theme without an exception the result is identical (AC-55.3). The rate limiter is untouched: an allowed FREE Easy race uses the shared daily allowance (AC-55.4).

### 4.4 Embed build (O7)
`node apps/web/scripts/build-math-rally-embed.mjs` builds the IIFE bundle, copies the HTML and assets, writes `build-info.json`, and checks the 4 MB app budget. The developer commits the output with the source change. The release checklist runs it with `--check-only` before every app release (exit 3 on drift).

---

## 5. Error Handling

Levels: **error** (unexpected, needs a look), **warn** (expected refusal or degraded path), **debug** (development only). Web host logs use `console.warn` / `console.error` with an error class and never the payload; production web builds keep these lines (existing practice) but they contain no user data. App logs use `debugPrint` inside `kDebugMode` only.

### 5.1 Web host

| Operation | Failure | Recoverable | User sees | Logged |
|---|---|---|---|---|
| Load game chunk (`React.lazy`) | Network error, chunk missing after a deploy | Yes, by retry | "The race could not load." Retry (re-imports) and Back to hub | warn `chunk-load` |
| WebGL probe | `hasWebGL()` false | No | "This browser cannot run Math Rally." Back to hub. No `startGame` (AC-44.1) | warn `no-webgl` |
| Mount engine | `EngineStartError` | No | Same generic engine message, Back to hub; no `startGame` | error `engine-start` |
| Boot assets | `error{ASSET_LOAD_FAILED}` before `ready` | Yes, by reload | "The race could not load." Retry reloads the page | warn `assets` |
| `startMathRallyGame` | Rate limit | No (today) | Existing rate-limit page | warn `start-rate` |
| `startMathRallyGame` | Quest param present, any failure | n/a | Rule R1 inside `api/game.ts`: back to the map | (existing) |
| `startMathRallyGame` | Paid required (FREE at a locked level, `AuthorizationError` text contains "paid subscription") | No | Subscription page with `{ premiumRequired: true }` | warn `start-paid` |
| `startMathRallyGame` | Any other error (network, 5xx) | Yes, from the hub | Hub with "Could not start the race." | error `start` |
| Start payload | `mathRally` missing or `error{INIT_INVALID}` | No (play already used) | "Could not start the race." Back to hub | error `payload` |
| Race | `error{CONTEXT_LOST}` or `error{INTERNAL}` | No (play used, no submission) | "The race stopped unexpectedly." Back to setup | error `context-lost` / `internal` |
| `completeGame` | Network or 5xx | Yes | "Could not save your race." Retry resends the same payload kept in memory; Back to hub | warn `submit-unavailable` |
| `completeGame` | Rejection (generic message) | No | "This race could not be saved." Back to setup | warn `submit-rejected` |
| `completeGame` | "already completed" after a lost response | No | "Your race was already saved. See History." | warn `submit-duplicate` |
| Incoming game message | Fails validation | Ignored | Nothing (an invalid `raceFinished` is treated as `error{INTERNAL}`) | debug type name |
| Sound preference write | Storage blocked | Yes (session keeps the value) | Nothing | none (existing helper swallows) |

### 5.2 Game core

| Operation | Failure | Recoverable | Result | Logged |
|---|---|---|---|---|
| Renderer creation | No WebGL or Phaser throws | No | `mountMathRally` throws `EngineStartError`; inside the app bundle the entry catches it and sends `error{ENGINE_START_FAILED}` | none in game; host logs |
| Asset or font load | 404, decode error, HTML returned by an SPA rewrite (U17) | No | `error{ASSET_LOAD_FAILED}`; no `ready` | none |
| `init` | Invalid message or payload | No | `error{INIT_INVALID}`; stays on the loading screen | none |
| WebGL context lost | Browser event | No | Clock stops; `error{CONTEXT_LOST}` | none |
| Frame hitch | Delta above 50 ms | Yes | Kinematics clamp; the clock keeps real time, so recorded times can only be slower | none |
| Audio unlock | Autoplay blocked | Yes | Sound starts on first input; race unaffected | none |
| Unexpected exception in a scene | Any throw in `update` | No | Caught by a scene-level guard: `error{INTERNAL}`, game stops | none |

### 5.3 App host

| Operation | Failure | Recoverable | User sees | Logged (debug only) |
|---|---|---|---|---|
| WebView creation or page load | Plugin error, asset handler 404 | No | "The race could not load." Back | `load` |
| JS bridge not ready | Page sends before the plugin bridge is up | Yes | The entry waits for the plugin's ready event, then sends `ready` | none |
| `ready` version | Unsupported protocol | No | "Please update the app to play." No `start()` | `protocol` |
| `session.start()` | Rate limit, paywall, quest | No | Existing BlockedView or map (existing rules) | (existing) |
| `session.start()` | Other failure | Yes, as offline race | Offline race, result "not saved" (FR-MK-50) | (existing) |
| Start payload | Missing or invalid with a game id | No (play used) | "Could not start the race." Back | `payload` |
| Game `error` message | Any code | No | "The race stopped unexpectedly." Back | code |
| Render process gone (Android) or content process terminated (iOS) | Plugin callback | No | Same message; WebView disposed | `render-gone` |
| `completeOrRecover` | `SubmitFailure.unavailable` | Yes | "Could not save your race." Retry with the same payload | `submit` |
| `completeOrRecover` | `SubmitFailure.rejected` | No | "This race could not be saved." Home | `submit-rejected` |
| Navigation request | Any URL outside the own origin | Blocked | Nothing | `nav-blocked` |
| iOS scheme request | Path outside `assets/math_rally/` or containing `..` | Blocked (404) | Nothing (an asset error follows if the game needed it) | `asset-denied` |

### 5.4 Game Service

| Operation | Failure | Recoverable | Caller receives | Logged |
|---|---|---|---|---|
| Start, FREE at a blocked difficulty | Gate | No | Existing `AuthorizationError` paid message; no play used | (existing, no log) |
| Start, difficulty outside 1 to 4 | Validation | No | `ValidationError` "Invalid difficulty for this game"; no play used | warn `{ userId, difficulty }` |
| Start, `buildRace` throws | Bug | No | Existing sanitized `INTERNAL_ERROR`; no play used | error `{ userId, difficulty }` (no seed) |
| Start, DynamoDB `create` fails | Store | Yes, by retry | Existing mapped error; usage not incremented (increment follows create) | (existing) |
| Complete, record, validation or timing | Refusal | Yes with a corrected payload | Generic rejection message; nothing written; game stays `IN_PROGRESS` | warn `{ userId, gameId, stage }` and metric |
| Complete, DynamoDB `update` fails | Store | Yes, by retry | Existing mapped error; nothing else ran | (existing) |
| Complete, achievements | Any | n/a | Ignored (non-blocking, existing pattern) | error (existing) |
| Complete, event publish | Any | Inherits current behaviour of the other exits (not changed here) | Existing | (existing) |
| Rejection metric | CloudWatch error | n/a | Ignored (`metricsPublisher` catches) | error (existing helper) |

### 5.5 Leaderboard
An event that fails `validateScore` produces no entry (existing behaviour). The `mathRally` window is a superset of what the Game Service emits (component methods Section 5), so this path should never run for Math Rally; an L1 unit test pins the window against the extremes of AC-38.1.

---

## 6. Validation Rules for External Inputs

| Input | Where validated | Required | Type and limits | On failure |
|---|---|---|---|---|
| `startGame.input.themeId` | Existing schema and `validateTheme` | Yes | Non-empty string; published theme | Existing errors |
| `startGame.input.difficulty` for `MATH_RALLY` | Existing schema (int 1..5) plus B1 (1..4) | Yes | Integer 1 to 4 | `ValidationError`, no play used |
| `startGame.input.questContext` | Existing Quest Map rules | No | Existing schema | Existing generic quest error |
| `completeGame.input.completionTime` | Existing schema (positive) plus B3 | Yes | Finite number, 1 to 3600 s | Generic rejection |
| `completeGame.input.attempts` | Existing schema (positive int) | Yes | Ignored for scoring; stored value is `forks` | Existing error if not a positive integer |
| `completeGame.input.mathRallySubmission` | B3 strict schema | Yes for `MATH_RALLY` | `choices` int array of length `forks`, each 0..paths-1; `forkTimesMs` int array of length `forks`, strictly increasing, 0..3 600 000, last <= completionTime x 1000; no other keys | Generic rejection |
| `completeGame.input.correctAnswers`, `totalQuestions` | Existing schema | No | Ignored for `MATH_RALLY` | n/a |
| Stored `game.mathRally` | `parseMathRallyRecord` | Yes for `MATH_RALLY` | `seed` uint32, `generatorVersion` int >= 1, `paths` 2..4, `forks` 1..15, `key` length `forks`, each 0..paths-1 | Generic rejection, stage `record` |
| Web `?difficulty` | `parseGameSearch` | Yes | `easy`, `medium`, `hard` or `superhard` | Redirect to setup |
| Web `?quest` | Existing `parseQuestParam` | No | Existing format | Existing (ignored if invalid) |
| Bridge messages (both directions) | G14, A4 | Yes | Section 4 of the methods file; 16 KB | Ignored; `raceFinished` invalid becomes an error |
| Race payload (`init.race`) | G14 `validateRacePayload`; A4 shape check before sending | Yes when scored | Methods file Section 4 | `error{INIT_INVALID}` |
| Offline `init.seed` | G14 | Yes when offline | Integer 0..4 294 967 295 | `error{INIT_INVALID}` |
| iOS asset request URL | A5 | n/a | Scheme `dashden-game`, host `app`, path resolved under `assets/math_rally/`, no `..`, known extension | 404 response |
| Navigation request URL | A5 `isAllowedNavigation` | n/a | Own origin only | Cancelled |
| Server strings rendered in the canvas | G9 and G13 | n/a | Rendered as canvas text, never as HTML | n/a |

---

## 7. Invariant Ownership

| Invariant | Owning layer | Why there |
|---|---|---|
| Score and correct count come only from the stored key and verified submission | Game Service (B2, B3, B4) | The client is untrusted; the server is the only place a key the client cannot change exists |
| A FREE user can start only free difficulties of a paid game, and never difficulty 4 | Game Service (B10 with S7) | Access control must be server-side (SECURITY-08); host locks (H3, A9) are presentation |
| No submitted race is faster than the kart allows | Game Service with S1 constants | Same numbers as the game's kinematics, so honest play can never fall below the floor |
| Reading window at top speed and rejoin before the next question | S1 constants, enforced by unit tests | Both the game layout and the server floors derive from them |
| Each fork has exactly one correct, distinct, well-formed option; correct positions balanced | S5 (property tests); re-checked by the game's payload validator | One generator, used by the server for scored races and by the game for offline races |
| Race length is N forks | S1; B3 checks submission length; G14 checks payload length | Server-side for scoring; game-side so a malformed payload never starts |
| One engine instance per page | G1 (module guard) and H2 (effect cleanup) | StrictMode double mounting happens in React; the facade is the last line |
| The WebView never receives a token or user detail | A3 and A4 (message builders take only allowlisted values) | The Dart side is where tokens exist; a test pins it (AC-47.1) |
| The page cannot leave its own origin or reach the network | A5 settings and navigation filter, G16 CSP | Defence in depth: CSP inside the page, filter in the host |
| Choices are not stored | B2 (update call lists only five fields) | NFR-MK-19; the repository writes only what it is given |
| Paid lists and free-difficulty copies agree | H9 and the app parity test | Copies exist for presentation; tests stop drift (R16) |

---

## 8. Testability

| Area | Unit and property tests (automated) | Integration tests (automated) | Manual (written steps in Construction) |
|---|---|---|---|
| Shared core (MR2) | Generator, distractors, positions, determinism, layout constraints, timing floors, gate function with injected lists (Jest, `fast-check`) | n/a | Owner playtest of content difficulty (R14) |
| Game core (MR1, MR4) | Lanes, joystick, clock, kinematics, fork controller, quality rule, projection maths, protocol validators against the shared fixture, game text completeness, import-graph check (no `react`, Apollo or `fetch`) (Vitest, node environment) | Scenes are not run in tests (no browser tooling, finding 12 of the requirements) | Look and feel, fork readability, lane chips at 320 px, reduced motion, audio, frame-time gate |
| Web host (MR4) | `lockState`, `parseGameSearch`, host state machine with a fake channel and fake API, registry consistency with mutation suite, credits manifest, locale completeness | Bundle report: Phaser absent from the entry chunk; entry growth measured | Lazy loading in the network panel, StrictMode remount, CSP enforced locally, keyboard scroll capture, hub and setup for FREE and paid |
| Backend (MR3) | Score breakdown properties (AC-32.1 to 32.5), validator cases (AC-28.1), timing checks (AC-30.1), gate wiring | Start payload and stored record (AC-26.1, 26.2); completion matrix, rejection leaves the game open (AC-31.1); event content (AC-33.1); quest hook (AC-33.2); existing suites unchanged | Seed and verify script dry runs |
| App (MR5) | Protocol validators against the shared fixture; message builders never carry a token (AC-47.1); level locks; hub tiles for partly-free games; iOS asset resolver allowlist; navigation filter; session flag and payload; protocol version check (AC-49.2) | Play-screen state with a fake `WebViewPort` and a fake `GameApi` | Real WebView on the reference Android phone and the owner's iPhone: assets offline, navigation refused, lifecycle pause, Back, audio and silent switch, gate re-run on the full game |
