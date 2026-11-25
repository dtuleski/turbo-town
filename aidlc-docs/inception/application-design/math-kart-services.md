# Math Rally - Services and Orchestration

**Created**: 2026-11-25
**Stage**: INCEPTION - Application Design
**Revision**: iteration 3, after the second design review of 2026-11-25. Changed in iteration 3: `mathRallyProtocol` passed through as `unknown` and checked in the service with the refused cases listed; built-in textures and the font in the error tables; the window margin in the invariant table. Iteration 2 changed: protocol version at start, timing against expected times, score without client time, `ready` timeout, language reduction, `touchUi`, pause hides the question, source-hash bundle check. Responses per finding: `math-kart-components.md` Sections 9 and 10.
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
| O7 | Embed build and bundle check | T1 | 4.4 |
| O8 | Protocol version change after launch | S1, B1, release order | 4.5 |
| O9 | Release and data seeding | D1 and the release order | `math-kart-unit-of-work-dependency.md` Section 3 |

---

## 2. Web Race Session (O1)

The host is a small state machine in `useMathRallyHost` (phases in `math-kart-component-methods.md` Section 3). The page is reached only through `/math-rally/game?difficulty=<easy|medium|hard|superhard>[&quest=...]`; an invalid or missing `difficulty` redirects to the setup page before anything loads. Both Math Rally routes are lazy with a 20 s load limit (H8).

1. **loadingEngine.** The hook checks `hasWebGL()`; then `mountMathRally(container, game, { assetBaseUrl: '/games/math-rally/', buildId: 'web' })` with a `DirectChannel` pair, and starts a `READY_TIMEOUT_MS` (20 s) timer. The effect cleanup calls `handle.destroy()` and clears the timer; under `React.StrictMode` the first mount is destroyed before the second is created, and G1's module guard makes a stray second instance impossible.
2. **ready.** BootScene sends `ready` after every asset and the font have loaded. The host clears the timer and calls `startMathRallyGame({ themeId: 'MATH_RALLY', difficulty, mathRallyProtocol: ready.protocolVersion })` (FR-MK-25, FR-MK-26). If the timer fires first, the host destroys the engine and shows "The race could not load." with Retry and Back; no `startGame` is sent (AC-25.2). A `ready` that arrives after the timeout is ignored.
3. **starting.** On success the host checks only that `mathRally` exists and sends `init { mode: 'scored', race: result.mathRally, difficulty, language: gameLanguage(i18n), sound: readSoundPreference(), reducedMotion: readReducedMotion(), touchUi: initialTouchUi(window) }`. `gameLanguage` reduces `i18n.resolvedLanguage ?? i18n.language` to its first two letters and maps it to `en`, `es` or `pt`, otherwise `en` (`pt-BR` races in Portuguese). The game validates the payload against its own protocol spec (methods Section 4) and starts the countdown.
4. **racing / paused.** `visibilitychange` to hidden sends `pause`. `pauseChanged` messages update the phase and, when `sound` changed, call `writeSoundPreference`. While paused the game shows its opaque pause panel and clears the ARIA live region it owns (G1, G9), so the host needs no extra message. `exitRequested` navigates to the setup page; no `completeGame` call (FR-MK-22, Q36).
5. **submitting.** On `raceFinished`, the host calls `completeGame({ gameId, completionTime: raceTimeMs / 1000, attempts: forks, mathRallySubmission: { choices, forkTimesMs } })`. `correctCount` from the game is not sent.
6. **result.** `ScoreBreakdownModal` shows the server breakdown (`gameType` `MATH_RALLY` for reviews; the speed bonus line reads x1.0); "Play again" returns to the setup page (a new play), "Close" to the hub. In quest mode the existing rule R2 inside the modal applies.

Teardown on route change, on result and on every failure path: `handle.destroy()` in the effect cleanup (NFR-MK-5).

## 3. App Race Session (O2, O6)

`MathRallyPlayScreen` keeps one WebView mounted from entry until the result screen, so pausing never rebuilds the game (finding F8).

1. **loadingEngine.** The screen creates `InAppWebView` with the hardened settings of A5 and the entry URL from `gameEntryUrl`, and starts a 20 s timer. A spinner overlays it. `GameSessionController` comes from the existing `gameSessionProvider(args)`; the screen calls `start()` itself.
2. **ready.** The bridge receives `ready`; the timer is cleared. If `protocolVersion` is not in `kSupportedProtocolVersions`, the screen shows "Please update the app to play." and never calls `start()` (AC-49.2). If the timer fires first, the screen disposes the WebView and shows "The race could not load." with Back; `start()` is never called (AC-25.2).
3. **starting.** `session.start(mathRallyProtocol: ready.protocolVersion)` runs the existing rules plus one: an update-required refusal (`GameApiException.isUpdateRequired`) blocks with `BlockReason.updateRequired` and the screen shows the update message; rate limit, paywall or quest refusals block as today (BlockedView, or the map for a quest); any other failure gives an offline round with no game id.
   - Scored round: `state.startPayload` is checked with `validateRacePayload(raw, difficulty)`; the screen sends `init { mode: 'scored', race, ... }`.
   - Offline round (O6): the screen sends `init { mode: 'offline', seed: Random.secure().nextInt(1 << 32), ... }` and the game builds the race with the bundled S5 at its own protocol version. The result screen later says the race was not saved (existing `GameResult.saved == false`).
   - Settings in both cases: `sound` from `GameFeedback.isSoundEnabled()`, `reducedMotion` from `MediaQuery.disableAnimationsOf(context)`, `language` from `Localizations.localeOf(context).languageCode` mapped to `en`, `es` or `pt` (otherwise `en`), `touchUi: true`.
4. **racing / paused.** `didChangeAppLifecycleState` to `inactive`, `paused` or `hidden` sends `pause`. Android Back while racing sends `pause` (the game opens its menu); Back while paused opens the existing `confirmLeaveGame` dialog and leaves on confirm. `pauseChanged` calls `session.pause()` or `session.resume()` and stores a changed sound flag with `setSoundEnabled`. `exitRequested` pops the screen.
5. **submitting.** On `raceFinished`: scored rounds call `session.completeOrRecover(extra: { 'mathRallySubmission': { 'choices': ..., 'forkTimesMs': ... } }, attempts: forks, completionSeconds: (raceTimeMs / 1000).ceil())`. `ceil` keeps `forkTimesMs[last] <= completionTime * 1000` for the integer seconds the app API sends, and only makes the reported race time later, which the timing check accepts. Offline rounds call `session.complete()`.
6. **result.** On `completed` the screen disposes the WebView and shows `GameResultScreen` with "Play again" (back to setup) and, for quests, "Back to map".

## 4. Server Orchestrations

### 4.1 Start (O3), inside `GameService.startGame`
Order for `themeId === 'MATH_RALLY'` (existing steps unchanged for every other theme):
1. **New, pure input checks before any read**: difficulty must be 1 to 4, otherwise `ValidationError('Invalid difficulty for this game')`; `mathRallyProtocol` arrives as `unknown` (the schema passes any value through, B6) and must satisfy `Number.isInteger(v) && MR_SUPPORTED_PROTOCOLS.includes(v)`, otherwise `ValidationError(MATH_RALLY_UPDATE_REQUIRED_MESSAGE)` ("Please update the app to play."). Missing, `null`, 0, 2 (not supported at launch), 1.5, `"1"`, objects and arrays are all refused this way, never as `INTERNAL_ERROR`. Neither check writes anything or counts a play (AC-26.3). Other themes never read the field, whatever its value (AC-26.2).
2. Tier lookup; quest validation (existing).
3. Paid gate with `isBlockedForFreeTier(themeId, difficulty)` (O5); difficulty-4 gate for FREE (existing).
4. **New**: `seed = crypto.randomInt(0, 2 ** 32)`; `race = buildRace(seed, difficulty, mathRallyProtocol)`. Pure and fast (microseconds, unmeasured); built before step 5 so a failure here never consumes a play.
5. `checkLimit`; `validateTheme`; `create({ ..., mathRally: race.record })` (the record includes `protocolVersion`); `incrementUsage` (existing order).
6. Return `{ game, canPlay, rateLimit, mathRally: race.payload }`; the handler adds `mathRally` to the mapped response.

### 4.2 Completion (O4), `completeMathRallyGame`
Runs after the existing ownership and status checks, before any generic logic. Stages, in order; any failure throws `ValidationError(MATH_RALLY_SUBMISSION_REJECTED_MESSAGE)` (one text, "This race could not be saved."), logs a warning `{ userId, gameId, stage }`, publishes `MathRallySubmissionRejected{Stage}`, and writes nothing:
1. `record`: `parseMathRallyRecord(game.mathRally, game.difficulty)` (missing or malformed attribute, or a protocol version the server no longer supports).
2. `validation`: `validateMathRallySubmission(input.mathRallySubmission, input.completionTime, record)`.
3. Correct count: `correct[k] = choices[k] === record.key[k]`; `correctCount = count(correct)`.
4. `timing`: `checkTiming({ forkTimesMs, completionTime }, record, difficulty, correct)`: every fork time and the race time must be at least `expectedRaceTimesMs(record.protocolVersion, difficulty, correct)` minus that version's tolerance. Slower times are accepted up to 3600 s.
5. Score: `calculateMathRallyBreakdown({ correct: correctCount, forks, completionTime, difficulty, gameIsPaid: PAID_GAME_THEME_IDS.includes('MATH_RALLY') })`. Client time is not an input to the score.
6. `gameRepository.update` with `status`, `completedAt`, `completionTime`, `attempts: forks`, `score`.
7. Achievements (non-blocking, same try/catch as the other exits); `publishGameCompleted` metric; GameCompleted event `{ gameType: 'MATH_RALLY', difficulty label as today, score, completionTime: max(1, t), accuracy: correctCount / forks, performanceMetrics: { attempts: forks, correctAnswers: correctCount, totalQuestions: forks, hintsUsed: 0, pauseCount: 0, averageResponseTime: max(1, round(t / forks)) } }`; `statisticsCache.delete(userId)`; info log with ids, difficulty, correct count, forks and score.
8. `finalizeQuest(userId, game, score)` and return `{ game, achievements, scoreBreakdown, quest? }`.

A rejected game stays `IN_PROGRESS`, so a corrected submission for the same game can still complete it (AC-31.1); the existing status check refuses a second completion after success.

### 4.3 Free-tier gate (O5)
`startGame` replaces `PAID_GAME_THEME_IDS.includes(themeId) && tier === Free` with `tier === Free && isBlockedForFreeTier(themeId, difficulty)`. Same error class and message as today. For every theme without an exception the result is identical (AC-55.3). The rate limiter is untouched: an allowed FREE Easy race uses the shared daily allowance (AC-55.4).

### 4.4 Embed build and bundle check (O7)
`node apps/web/scripts/build-math-rally-embed.mjs` builds the IIFE bundle, copies the HTML and assets, writes `build-info.json` (protocol version, build id, `sourceHash`, per-file output hashes), and checks the 4 MB app budget. The developer commits the output with the source change. The release checklist (PL7) runs `--check-only` on the release commit before every app release: it recomputes `sourceHash` from the source tree and the hashes of the committed output, and exits 3 on any difference, naming the first differing file. Because the hash covers the source, the shared module, the assets, the embed config, the build scripts and the lockfile, a bundle built from older code fails the check even when its file list is unchanged.

### 4.5 Protocol version change after launch (O8)
1. A change to race parameters, track constants, kinds, operand rules or payload shapes is made in a new `v<N+1>/` folder; `MR_CLIENT_PROTOCOL` becomes N+1 and N+1 joins `MR_SUPPORTED_PROTOCOLS`; version N's files and golden fixtures stay unchanged.
2. Release order: Game Service first (it now builds and checks both versions), then web (its page sends N+1), then the app (its bundle sends N+1). Installed apps keep sending N and keep working.
3. Removing N from `MR_SUPPORTED_PROTOCOLS` is an owner decision. After it, a build that sends N gets "Please update the app to play." at start, before the rate limiter, so no play is used; an in-progress game of version N is refused at completion (stage `record`).
4. On web, a page that was open during a deploy keeps its loaded version, which the server still supports, so it finishes normally.

---

## 5. Error Handling

Levels: **error** (unexpected, needs a look), **warn** (expected refusal or degraded path), **debug** (development only). Web host logs use `console.warn` / `console.error` with an error class and never the payload; production web builds keep these lines (existing practice) but they contain no user data. App logs use `debugPrint` inside `kDebugMode` only.

### 5.1 Web host

| Operation | Failure | Recoverable | User sees | Logged |
|---|---|---|---|---|
| Load a Math Rally route (`lazyWithTimeout`) | Network error, chunk missing after a deploy, or no chunk after 20 s | Yes, by retry | "The race could not load." Retry reloads the page; Back to hub | warn `chunk-load` |
| WebGL probe | `hasWebGL()` false | No | "This browser cannot run Math Rally." Back to hub. No `startGame` (AC-44.1) | warn `no-webgl` |
| Mount engine | `EngineStartError` | No | Same generic engine message, Back to hub; no `startGame` | error `engine-start` |
| Boot assets | `error{ASSET_LOAD_FAILED}` before `ready` | Yes, by reload | "The race could not load." Retry reloads the page | warn `assets` |
| Wait for `ready` | No `ready` within 20 s of mounting (includes a built-in texture that failed to load, Section 5.2) | Yes, by reload | "The race could not load." Retry reloads the page; no `startGame` (AC-25.2) | warn `ready-timeout` |
| `startMathRallyGame` | Rate limit | No (today) | Existing rate-limit page | warn `start-rate` |
| `startMathRallyGame` | Quest param present, any failure | n/a | Rule R1 inside `api/game.ts`: back to the map | (existing) |
| `startMathRallyGame` | Paid required (FREE at a locked level, `AuthorizationError` text contains "paid subscription") | No | Subscription page with `{ premiumRequired: true }` | warn `start-paid` |
| `startMathRallyGame` | Update required (`isUpdateRequiredError`) | Yes, by reload | "Math Rally was updated. Reload the page to play." with Reload; no play used | warn `start-update` |
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
| Built-in textures at engine boot | A `sys/` file (default, missing or white texture, G1) missing or blocked. From knowledge of the Phaser 3 source (not run), the game does not finish booting when a built-in texture fails to load, and the failure appears only as a texture-manager event; Phaser 4 is checked in MR1 (U20) | No | No `ready`; the host's 20 s `ready` timeout shows "The race could not load." (H10 and T1 make a missing file a test or build failure first) | none in game; host logs `ready-timeout` |
| Asset or font load | 404, parse or decode error, HTML returned by an SPA rewrite (U17), a missing file served over a local scheme (status not checked, so it surfaces as a parse or decode error), the `FontFace` load promise rejecting | No | `error{ASSET_LOAD_FAILED}`; no `ready` | none |
| `init` | Invalid message, or payload not matching the bundle's protocol spec | No | `error{INIT_INVALID}`; stays on the loading screen | none |
| WebGL context lost | Browser event | No | Clock stops; `error{CONTEXT_LOST}` | none |
| Frame hitch | Clock delta above 50 ms | Yes | Motion advances 50 ms; the clock keeps real time, so recorded times can only be later (never below the floor) | none |
| Audio unlock | Autoplay blocked | Yes | Sound starts on first input; race unaffected | none |
| Unexpected exception in a scene | Any throw in `update` | No | Caught by a scene-level guard: `error{INTERNAL}`, game stops | none |

### 5.3 App host

| Operation | Failure | Recoverable | User sees | Logged (debug only) |
|---|---|---|---|---|
| WebView creation or page load | Plugin error, asset handler refusal | No | "The race could not load." Back | `load` |
| Wait for `ready` | No `ready` within 20 s (includes a built-in texture that failed to load or was blocked by the page CSP, Section 5.2) | No | "The race could not load." Back; WebView disposed; no `start()` | `ready-timeout` |
| JS bridge not ready | Page sends before the plugin bridge is up | Yes | The entry waits for the plugin's ready event, then sends `ready` | none |
| `ready` version | Not in the app's own list (broken app build) | No | "Please update the app to play." No `start()` | `protocol` |
| `session.start()` | Update required (server no longer supports the version) | No | "Please update the app to play." No play used; not an offline race | `start-update` |
| `session.start()` | Rate limit, paywall, quest | No | Existing BlockedView or map (existing rules) | (existing) |
| `session.start()` | Other failure | Yes, as offline race | Offline race, result "not saved" (FR-MK-50) | (existing) |
| Start payload | Missing or invalid with a game id | No (play used) | "Could not start the race." Back | `payload` |
| Game `error` message | Any code | No | "The race stopped unexpectedly." Back | code |
| Render process gone (Android) or content process terminated (iOS) | Plugin callback | No | Same message; WebView disposed | `render-gone` |
| `completeOrRecover` | `SubmitFailure.unavailable` | Yes | "Could not save your race." Retry with the same payload | `submit` |
| `completeOrRecover` | `SubmitFailure.rejected` | No | "This race could not be saved." Home | `submit-rejected` |
| Navigation request | Any URL outside the own origin | Blocked | Nothing | `nav-blocked` |
| iOS scheme request | Path outside `assets/math_rally/`, containing `..`, or with an extension outside `mimeTypeFor` | Refused | Nothing (an asset error follows if the game needed it) | `asset-denied` |

### 5.4 Game Service

| Operation | Failure | Recoverable | Caller receives | Logged |
|---|---|---|---|---|
| Start, difficulty outside 1 to 4 | Validation | No | `ValidationError` "Invalid difficulty for this game"; no play used | warn `{ userId, difficulty }` |
| Start, protocol not a supported integer (missing, `null`, wrong type, non-integer, unsupported) | Validation | No (needs an update) | `ValidationError` "Please update the app to play."; no record, no play used | warn `{ userId, protocol }`, where `protocol` is the value if it is an integer, otherwise its type name |
| Start, FREE at a blocked difficulty | Gate | No | Existing `AuthorizationError` paid message; no play used | (existing, no log) |
| Start, `buildRace` throws | Bug | No | Existing sanitized `INTERNAL_ERROR`; no play used | error `{ userId, difficulty, protocol }` (no seed) |
| Start, DynamoDB `create` fails | Store | Yes, by retry | Existing mapped error; usage not incremented (increment follows create) | (existing) |
| Complete, record, validation or timing | Refusal | Yes with a corrected payload | Generic rejection message; nothing written; game stays `IN_PROGRESS` | warn `{ userId, gameId, stage }` and metric |
| Complete, DynamoDB `update` fails | Store | Yes, by retry | Existing mapped error; nothing else ran | (existing) |
| Complete, achievements | Any | n/a | Ignored (non-blocking, existing pattern) | error (existing) |
| Complete, event publish | Any | Inherits current behaviour of the other exits (not changed here) | Existing | (existing) |
| Rejection metric | CloudWatch error | n/a | Ignored (`metricsPublisher` catches) | error (existing helper) |

### 5.5 Leaderboard
An event that fails `validateScore` produces no entry (existing behaviour). The `mathRally` window is a superset of what the Game Service emits (component methods Section 5), so this path should never run for Math Rally; an L1 unit test pins the window against the extremes of AC-38.1. The anomaly pattern checks may flag honest Math Rally entries; a flagged entry is still stored and returned (AC-38.2, Q40).

---

## 6. Validation Rules for External Inputs

| Input | Where validated | Required | Type and limits | On failure |
|---|---|---|---|---|
| `startGame.input.themeId` | Existing schema and `validateTheme` | Yes | Non-empty string; published theme | Existing errors |
| `startGame.input.difficulty` for `MATH_RALLY` | Existing schema (int 1..5) plus B1 (1..4) | Yes | Integer 1 to 4 | `ValidationError`, no play used |
| `startGame.input.mathRallyProtocol` | B6 passes it through (`z.unknown().optional()`), B1 decides | Yes for `MATH_RALLY`; ignored otherwise, whatever its value | `Number.isInteger(v)` and in `MR_SUPPORTED_PROTOCOLS` | Update message (never `INTERNAL_ERROR`), no record, no play used |
| `startGame.input.questContext` | Existing Quest Map rules | No | Existing schema | Existing generic quest error |
| `completeGame.input.completionTime` | Existing schema (positive) plus B3 | Yes | Finite number, 1 to 3600 s | Generic rejection |
| `completeGame.input.attempts` | Existing schema (positive int) | Yes | Ignored for scoring; stored value is `forks` | Existing error if not a positive integer |
| `completeGame.input.mathRallySubmission` | B6 declares it (`unknown`), B3 strict schema | Yes for `MATH_RALLY` | `choices` int array of length `forks`, each 0..paths-1; `forkTimesMs` int array of length `forks`, strictly increasing, 0..3 600 000, last <= completionTime x 1000; each at least the expected time minus the tolerance; no other keys | Generic rejection |
| `completeGame.input.correctAnswers`, `totalQuestions` | Existing schema | No | Ignored for `MATH_RALLY` | n/a |
| Stored `game.mathRally` | `parseMathRallyRecord` | Yes for `MATH_RALLY` | `seed` uint32, `protocolVersion` in `MR_SUPPORTED_PROTOCOLS`, `paths` and `forks` equal to that version's parameters for the game's difficulty, `key` length `forks`, each 0..paths-1 | Generic rejection, stage `record` |
| Web `?difficulty` | `parseGameSearch` | Yes | `easy`, `medium`, `hard` or `superhard` | Redirect to setup |
| Web `?quest` | Existing `parseQuestParam` | No | Existing format | Existing (ignored if invalid) |
| Bridge messages (both directions) | G14, A4 | Yes | Section 4 of the methods file; 16 KB | Ignored; `raceFinished` invalid becomes an error |
| Race payload (`init.race`) | G14 `validateRacePayload`; A4 shape check before sending | Yes when scored | Methods file Section 4 (canonical options, distinct by value, bundle protocol spec) | `error{INIT_INVALID}` |
| Offline `init.seed` | G14 | Yes when offline | Integer 0..4 294 967 295 | `error{INIT_INVALID}` |
| iOS asset request URL | A5 | n/a | Scheme `dashden-game`, host `app`, path resolved under `assets/math_rally/`, no `..`, extension in `mimeTypeFor` | Request refused |
| Navigation request URL | A5 `isAllowedNavigation` | n/a | Own origin only | Cancelled |
| Server strings rendered in the canvas | G9 and G13 | n/a | Rendered as canvas text, never as HTML | n/a |

---

## 7. Invariant Ownership

| Invariant | Owning layer | Why there |
|---|---|---|
| Score and correct count come only from the stored key and verified submission; client time never enters the score | Game Service (B2, B3, B4) | The client is untrusted; the server is the only place a key the client cannot change exists |
| A FREE user can start only free difficulties of a paid game, and never difficulty 4 | Game Service (B10 with S7) | Access control must be server-side (SECURITY-08); host locks (H3, A9) are presentation |
| No fork time or race time is more than the tolerance below what the kart needs for the given answers | S1 (motion and expected times) used by B3; G5 frame rule; property test AC-30.2 | One implementation of the motion for game and server, so honest play cannot fall below the floor |
| Reading window at top speed, rejoin before the next question, no effect window (plus one clamped frame of travel at top speed) reaching the next line or the finish | S1 layout contracts, enforced by unit tests | Both the game layout and the server's expected times derive from them; the one-frame margin keeps a late slowdown from carrying the kart past a line early |
| A race built for protocol version N is built and checked with version N's rules for as long as N is supported | S1 freeze rule with golden fixtures; B1 stores the version; B3 reads it | Installed app bundles cannot be updated by the server; the shared module is the only place both sides read |
| Each fork has exactly one correct option, all options canonical and distinct by value, correct positions balanced | S5 (property tests); re-checked by the game's payload validator | One generator, used by the server for scored races and by the game for offline races |
| Race length is N forks | S1; B3 checks submission length; G14 checks payload length | Server-side for scoring; game-side so a malformed payload never starts |
| The question and options are not visible while paused | G9 (opaque panel, hidden objects) and G1 (live region cleared) | Only the game core draws them |
| One engine instance per page | G1 (module guard) and H2 (effect cleanup) | StrictMode double mounting happens in React; the facade is the last line |
| The WebView never receives a token or user detail | A3 and A4 (message builders take only allowlisted values) | The Dart side is where tokens exist; a test pins it (AC-47.1) |
| The app page cannot leave its own origin or reach the network | A5 settings and navigation filter, G16 CSP | Defence in depth: CSP inside the page, filter in the host |
| The app page needs no inline markup and, unless documented, no `data:` or `blob:` source | G16 markup rules checked by T1; G1 `engineConfigFields` with its unit test; G17 violation record in the MR1 runs | The enforced policy blocks anything else; checking at build and unit level finds it before a device run |
| Choices are not stored | B2 (update call lists only five fields) | NFR-MK-19; the repository writes only what it is given |
| Paid lists, free-difficulty copies and the update-message text agree | H9 and the app parity test | Copies exist for presentation; tests stop drift (R16) |
| The committed app bundle matches its source | T1 `--check-only` in the release checklist (PL7) | App releases cannot be rolled back |

---

## 8. Testability

| Area | Unit and property tests (automated) | Integration tests (automated) | Manual (written steps in Construction) |
|---|---|---|---|
| Shared core (MR2) | Generator, canonical options and value distinctness (AC-14.1, AC-15.2), distractors, positions, determinism, layout contracts, motion integration, expected times, the AC-30.2 frame-loop property test, golden fixtures per protocol version, gate function with injected lists (Jest, `fast-check`) | n/a | Owner playtest of content difficulty (R14) |
| Game core (MR1, MR4) | Lanes, joystick model and visibility rule, clock, G5 frame rule (motion follows the clock, not Phaser's delta), fork controller, quality rule, projection maths, `engineConfigFields` (no `data:` or `blob:` value, built-in textures under `sys/`), protocol validators against the shared fixture, game text completeness, import-graph check (no `react`, Apollo or `fetch`) (Vitest, node environment) | Scenes are not run in tests (no browser tooling, finding 12 of the requirements) | Look and feel, fork readability, lane chips at 320 px, pause hides the question, reduced motion, audio, frame-time gate |
| Web host (MR4) | `lockState`, `parseGameSearch`, `gameLanguage`, `initialTouchUi`, host state machine with a fake channel, fake API and fake timers (ready timeout, update refusal), registry consistency with mutation suite, credits manifest, locale completeness, source hash (AC-51.2) | Bundle report: Phaser absent from the entry chunk; entry code growth measured | Lazy loading in the network panel, StrictMode remount, slice and game under the enforced app page policy on desktop (no CSP violation, AC-46.3 precondition), keyboard scroll capture, joystick on a touch phone in landscape, hub and setup for FREE and paid |
| Backend (MR3) | Score breakdown (AC-32.1 to 32.5), validator cases (AC-28.1), timing checks at the boundary (AC-30.1), gate wiring, leaderboard window and flagged entry (AC-38.1, AC-38.2) | Start payload and stored record (AC-26.1); other themes unchanged with `mathRallyProtocol` absent, `0` or `"x"` (AC-26.2); update refusal before the rate limiter for missing, `null`, 0, 2, 1.5 and `"1"`, never `INTERNAL_ERROR` (AC-26.3); completion matrix, rejection leaves the game open (AC-31.1); event content (AC-33.1); quest hook with a stub `QuestService` passed through the `questService` constructor parameter (AC-33.2, AC-52.1); existing suites unchanged | Seed and verify script dry runs |
| App (MR5) | Protocol validators against the shared fixture (including `correctCount`); message builders never carry a token (AC-47.1); level locks; hub tiles for partly-free games; iOS asset resolver allowlist and MIME table; navigation filter; session `start(mathRallyProtocol)`, payload and `updateRequired` block; local protocol check (AC-49.2) | Play-screen state with a fake `WebViewPort`, a fake `GameApi` and fake timers (ready timeout) | Real WebView on the reference Android phone and the owner's iPhone: assets offline, image, atlas and audio over the internal origin (AC-46.3), navigation refused, lifecycle pause, Back, audio and silent switch, joystick at the countdown, gate re-run on the full game |
