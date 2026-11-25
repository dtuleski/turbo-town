# Math Rally - Components

**Created**: 2026-11-25
**Stage**: INCEPTION - Application Design
**Basis**: `../requirements/math-kart-requirements.md` (FR-MK-1 to 56, NFR-MK-1 to 26), `../user-stories/math-kart-stories.md` (MK-1 to 28), `../plans/math-kart-application-design-plan.md` (decisions Q1 to Q15), code read at `c6ccf0f`
**Revision**: iteration 4, after the third design review of 2026-11-25 (`.agents/tasks/math-kart-inception/review.md`): fatal-error guard in G1 and G16, built-in texture check in G2, Phaser's default local schemes as a literal, G17 violation record and listener timing, logging facts F17 and F18. Responses: iteration 1 findings in Section 9, iteration 2 findings in Section 10, iteration 3 findings in Section 11.
**Name**: "Math Rally" (owner answer Q22). Files keep the `math-kart-` prefix for this inception run. Ids: theme and game type `MATH_RALLY`, catalog `math-rally`, routes `/math-rally/...`, locale namespace `mathRally`.
**Scope guard**: v1 only. No rivals, items, extra tracks, gamepad, Quest Map node or Flame port.

## 0. Overview and Locked Stack

Math Rally is one game core written once in TypeScript with Phaser 4. It runs in two hosts: a lazy-loaded React page on dashden.app, and a Flutter screen that shows the same code in a WebView from files bundled in the app. The game core knows nothing about React, Flutter, tokens or the network; it talks to its host through nine versioned JSON messages. Each host owns the API calls: the server builds every scored race from a seed, keeps the answer key, re-scores the lanes the player chose, and checks the reported times against the times the kart needs for those answers. A pure shared module in `packages/shared` holds the question generator, every number the game and the server must agree on (paths, forks, reading windows, track distances, speeds), the motion maths and expected-time function, and the per-difficulty free gate. Race rules are grouped into protocol versions that are frozen after launch, so an installed app keeps working when the server learns a newer version.

**Technology stack (locked once this design is approved)**

| Area | Choice | Status |
|---|---|---|
| Game engine | Phaser 4, exact version pinned in `apps/web/package.json` at the start of MR1 (latest stable 4.x on npm that day) | Version and APIs unverified (U1 to U5, U19 to U21); MR1 confirms. Any change of engine or major version goes to the owner |
| Language and build | TypeScript 5.3, Vite 5.1 (existing), Vitest 4 (existing), `fast-check` (existing) | Existing |
| Web host | React 18.2, `react-router-dom` 6, Apollo client, `react-i18next` (existing) | Existing |
| Shared core | `packages/shared`, Jest 29 and `fast-check` 3 (existing); the Math Rally module itself has no dependency (no `zod`) so `apps/web` can import it through a funnel | Existing tooling |
| Game Service and Leaderboard | Node Lambda, TypeScript, `zod` 3, Jest (existing) | Existing |
| App host | Flutter 3.19+, Dart 3.3+, Riverpod, go_router (existing); **new**: `flutter_inappwebview` 6.x pinned exactly | Plugin features unverified (U6, U18); MR1 spike confirms |
| Font | Fredoka (SIL OFL 1.1), bundled as `woff2` | Licence checked and recorded at download |
| Art and sound | CC0 packs (for example Kenney.nl) and original simple art, listed in a credits manifest | Per-file licence recorded (U8) |
| Not used | three.js, Flame, any analytics, ads or remote-config SDK in the game, Google Fonts in the game, CDN scripts, third-party joystick plugins | Locked |

New npm dependency: Phaser only (in `apps/web`). New pub dependency: `flutter_inappwebview` only.

---

## 1. Findings From the Code That Shape the Design

| # | Finding (file read) | Consequence |
|---|---|---|
| F1 | The Game Service routes GraphQL by operation name and returns the full resolver object whatever the selection set (`services/game/src/handlers/game.handler.ts`: `extractOperationName`, `routeOperation`, `data: { [normalizedOp]: result }`). The `startGame` mapping lists fields explicitly | The handler adds `mathRally` to the start mapping only when present (AC-26.2). The web can send a second `StartGame` document with a `mathRally` selection (plan Q8) |
| F2 | `startGame` order: tier, quest validation, paid gate, difficulty-4 gate, `checkLimit`, `validateTheme`, `create`, `incrementUsage` (`game.service.ts`) | The Math Rally input checks (difficulty, protocol) run first and the race is built before `checkLimit`, so neither a refusal nor a build failure costs a play; the per-difficulty gate replaces the paid gate condition in place, so a refused start costs no play (AC-26.3, AC-56.4) |
| F3 | `completeGame` checks ownership and status, then branches to `completeCircuitBuilderGame` before the generic path; both call `finalizeQuest` | Math Rally adds a third branch at the same place, built like the Circuit Builder one |
| F4 | `GameRepository.create` writes an explicit attribute list (spreads `questContext` when present); `update` is a `SET` of the given keys | `create` gains the same conditional spread for `mathRally`; completion uses `update` with status, time, attempts and score only, so no choice is ever written (NFR-MK-19) |
| F5 | `apps/web/src/i18n.ts` imports `en.json`, `es.json` and `pt.json` whole into the entry bundle, with the browser language detector and `fallbackLng: 'en'` | In-race strings live in `apps/web/src/games/math-rally/locales/` (NFR-MK-9); the race language is the detected language reduced to its base code (`pt-BR` to `pt`) |
| F6 | Web CSP (Report-Only, `apps/web/vercel.json`) has `connect-src 'self' ...`, `img-src 'self' data: https://upload.wikimedia.org`, `style-src 'self' 'unsafe-inline' ...`, `font-src 'self' ...` and no `blob:` | Same-origin asset XHR and fonts are allowed. The web policy allows `data:` images and inline styles, so a web run cannot show whether the game depends on them; the app page policy (`'self'` only, G16) is the stricter test, and MR1 runs the slice under it on desktop (step 7) and in the WebView (step 8). G1 configures Phaser so that it needs neither `blob:` nor `data:`: images load as `HTMLImageElement`, and the built-in default, missing and white textures point at bundled files under `sys/`. Only a source the engine cannot avoid is added, to `img-src` (and `media-src` if audio needs it) of both policies, and documented (U5, U20, NFR-MK-17) |
| F7 | `GameHubPage.tsx` redirects FREE users to the subscription page for any id in `PREMIUM_GAMES` (`GameTile.tsx`); the app's `buildHubTiles` marks paid games `paidUnavailable` for FREE users (`lib/game/hub_logic.dart`) | FR-MK-56 needs an exception in both places, driven by a free-difficulty copy |
| F8 | `GameSessionFrame` replaces the board with its own paused view when the session is paused (`lib/game/framework/game_session_frame.dart`) | The Math Rally play screen does not use `GameSessionFrame`; it keeps the WebView mounted through pause and drives `GameSessionController` itself |
| F9 | `GameSessionController.start()` takes no arguments and returns no per-game start data; on a `GameApiException` that is not rate limit, quest or paywall it starts an offline round; `complete()` and `completeOrRecover()` take `extra`, `attempts` and `completionSeconds`; `GameApi.completeExtraKeys` allowlists extra keys; `BlockReason` is used by equality checks, not exhaustive switches | Additive: `start({int? mathRallyProtocol})`, a `startPayload` field, and `BlockReason.updateRequired` checked before the offline fallback, so an unsupported protocol never turns into an offline race; `mathRallySubmission` joins the allowlist (plan Q7) |
| F10 | The app's sound setting is `GameFeedback.isSoundEnabled()` / `setSoundEnabled()` over `SharedPreferences` key `sound_enabled` (`lib/game/framework/game_feedback.dart`). There is no app-level reduced-motion setting | The app passes `isSoundEnabled()` and the OS flag `MediaQuery.disableAnimationsOf(context)` at `init`, and stores sound changes with `setSoundEnabled` |
| F11 | `services/leaderboard` has no dependency on `@memory-game/shared` | Leaderboard bounds are literals (plan Q11) |
| F12 | `metricsPublisher` methods catch and log their own failures (`services/game/src/utils/metrics.ts`) | The new rejection metric cannot change a response |
| F13 | `startGameInputSchema` and `completeGameInputSchema` in `services/game/src/utils/validation.ts` are plain `z.object` schemas, which drop undeclared keys. The handler parses them before `GameService` runs (`handlers/game.handler.ts`), and a `ZodError` reaches the client as `INTERNAL_ERROR` (F16) | `mathRallyProtocol` and `mathRallySubmission` are declared there as `z.unknown().optional()` (the `questContext` and `circuitSubmission` pattern), so every value reaches the service, which decides (B1, B3). A typed schema would turn a malformed protocol into `INTERNAL_ERROR`, which the app treats as a reason for an offline race (F9) |
| F14 | `.gitattributes` forces LF for `.ts`, `.json`, `.dart` and others, but `.html` and `.mjs` fall under `* text=auto` and are checked out with native line endings | The bundle's source hash normalises CRLF to LF for text files, so a Windows checkout and the owner's Mac compute the same hash |
| F15 | `GameService` takes an optional `questService` constructor parameter (`game.service.ts`), and `QuestService.validateStart` rejects any leg not in the shared quest config with `LEG_MISMATCH` (`quest.service.ts`) | The quest tests (AC-33.2, AC-52.1) pass a stub `QuestService` with one `MATH_RALLY` leg; no v1 node is added |
| F16 | `sanitizeError` in `services/game/src/utils/error-mapper.ts` passes `ValidationError` messages to the client unchanged and maps anything else, including a `ZodError`, to `INTERNAL_ERROR`; the app classifies refusals by code and message (`GameApiException.isPaywall` matches "paid subscription") | The update refusal is a `ValidationError` with one fixed text; web (`isUpdateRequiredError`) and app (`isUpdateRequired`) match that text through their own copies of it, and H9 keeps the web and Dart copies equal to the shared constant |
| F17 | The catch block of `GameHandler.handleRequest` (`services/game/src/handlers/game.handler.ts` line 151) logs every error a resolver throws, `ValidationError` and `AuthorizationError` refusals included, with `logger.error('GraphQL operation failed', error, { operationName, userId, username })` | Every Math Rally refusal and rejected submission also writes this error-level line with the username. Existing behaviour for every game, unchanged in v1 and recorded as pre-existing SECURITY-03 debt (services Section 5.4, requirements gap 15) |
| F18 | `apps/web/src/main.tsx` wraps the app in `React.StrictMode` and a class `ErrorBoundary` (render errors only) and mounts `Analytics` and `SpeedInsights`; `apps/web/src` registers no window-level `error` or `unhandledrejection` listener (`git grep`) | Errors from Phaser's frame loop, tween and timer callbacks, input handlers and promises reach no handler today, so the game core brings its own: the fatal-error guard in G1 and G16 (NFR-MK-14, requirements gap 16) |

---

## 2. Component Map

```text
packages/shared/src/math-rally/        S1-S6  pure race core (no dependencies), one folder per protocol version
packages/shared/src/constants/         S7     free-difficulty exception and gate
apps/web/src/games/math-rally/         G1-G17 game core (Phaser), bridge, embed entry
apps/web/src/pages/math-rally/         H1-H3  setup page, game page and host hook (both lazy)
apps/web/src/(api|utils|components|..) H4-H10 API, funnel, registries, hub, tests
services/game/src/                     B1-B10 start branch, completion exit, score, gate wiring
services/leaderboard/src/              L1     game type and window
scripts/                               D1     seed and verify scripts
apps/mobile/                           A1-A9  screens, bridge, asset server, session, registry
apps/web/ (build tooling)              T1     embed build config, source hash and script
```

Dependencies and data flows are in `math-kart-component-dependency.md`; signatures in `math-kart-component-methods.md`; orchestration and error handling in `math-kart-services.md`.

---

## 3. Components

### 3.1 Shared race core - `packages/shared/src/math-rally/` (unit MR2)

| Id | Component (file) | Responsibility |
|---|---|---|
| S1 | Protocol registry, track and motion (`protocols.ts`, `v1/params.ts`, `v1/track.ts`, `track.ts`, `motion.ts`, `timing.ts`) | `MR_CLIENT_PROTOCOL`, `MR_SUPPORTED_PROTOCOLS`, `protocolSpec(version)`; per version: the Section 4.0 table, world-unit distances, acceleration, cruise and boost speeds, slow factor, effect durations, timing tolerance. `trackLayout`, exact motion integration (`advanceMotion`, `applyOutcome`), `expectedRaceTimesMs` and `isPlausibleTiming`. Single source for the game's kinematics and layout and the server's timing check (FR-MK-8, FR-MK-30). Freeze rule and golden fixtures in the methods file Section 1 |
| S2 | SeededRng and exact values (`rng.ts`, `exact.ts`) | Deterministic 32-bit generator (mulberry32) with `nextInt`, `pick`, `shuffle`; reduced fractions, `parseOption`, `sameValue`, `formatExact`, canonical option patterns. No `Math.random`, no clock (FR-MK-14, FR-MK-18) |
| S3 | QuestionGenerator (`v1/questions.ts`) | Question kinds per difficulty (FR-MK-13 table), operand rules, exact answers as whole numbers or reduced fractions within the canonical forms; prompts are data (`kind`, `operands`), never text (FR-MK-19) |
| S4 | DistractorBuilder (`v1/distractors.ts`) | Mistake rules (off by 1 or 2, off by 10, neighbour product, wrong operation, swapped digits without leading zeros, sign error, fraction numerator-plus-denominator), canonical-form filter, value-based distinctness, random fill when rules run out (FR-MK-14, FR-MK-15) |
| S5 | RaceBuilder (`race.ts`) | `buildRace(seed, difficulty, version)`: N distinct questions, options with the correct position balanced (no run longer than 3), answer key and protocol version in the record (FR-MK-16, FR-MK-17, FR-MK-26) |
| S6 | Types (`types.ts`, `index.ts`) | `MathRallyDifficulty`, `MathRallyQuestion`, `MathRallyRacePayload`, `MathRallyGameRecord`, `MathRallySubmission`; exported from `packages/shared/src/index.ts` (additive) |
| S7 | FreeTierGate (`constants/paid-games.ts`) | `FREE_DIFFICULTIES_IN_PAID_GAMES` (`MATH_RALLY`: `[1]`) and `isBlockedForFreeTier(themeId, difficulty, paidIds?, exceptions?)` (FR-MK-55). Inert while `MATH_RALLY` is absent from `PAID_GAME_THEME_IDS` |

### 3.2 Game core - `apps/web/src/games/math-rally/` (units MR1 and MR4)

Phaser names below follow the Phaser 3 API (Scene, Graphics, Image, Text, Loader, Scale Manager, Keyboard plugin, Sound manager). Their Phaser 4 equivalents are confirmed in MR1 (U1); a missing capability is a gate finding, not a silent workaround.

| Id | Component (file) | Unit | Responsibility |
|---|---|---|---|
| G1 | EngineFacade (`MathRallyEngine.ts`) | MR1 | `mount(parent, channel, options)` creates the single Phaser game and returns a handle whose `destroy()` stops audio, removes listeners and the canvas and releases the WebGL context (`WEBGL_lose_context`). A module-level guard destroys any previous instance first. Builds the Phaser config from the pure `engineConfigFields(options)` (`core/engineConfig.ts`): the loader loads images as `HTMLImageElement` and treats Phaser's default local schemes plus `options.localSchemes` as local (U5, U19), and Phaser's built-in default, missing and white textures load from `assetBaseUrl + 'sys/'` instead of `data:` URIs (U20, NFR-MK-17). **Fatal-error guard** (`core/fatalErrorGuard.ts`, pure, no run-time imports; NFR-MK-14, FR-MK-44): while the game is mounted, listeners on `window` for `error` and `unhandledrejection` (bubble phase, so element load errors that the loader handles do not trigger it) report to one guard. The first report stops the game loop and sound, clears the live region and sends one `error` (`ENGINE_START_FAILED` before `ready`, `INTERNAL` after, or the code a caller names); later reports are ignored. Every `error` the game sends goes through the guard, so a host receives at most one per mount. On web `mountMathRally` creates the guard and installs the listeners; on the app page it uses the guard G16 installed first. `destroy()` removes the listeners and disposes a guard it created, so page errors after it send nothing (AC-44.3). Also creates a visually hidden `aria-live="polite"` element inside the parent, which G9 fills with the current prompt and options as plain text and clears while paused (FR-MK-22, FR-MK-43, NFR-MK-5, NFR-MK-7) |
| G2 | BootScene (`phaser/scenes/BootScene.ts`) | MR4 | Loads atlases and sounds from `options.assetBaseUrl` with the Phaser loader, and the font with the browser `FontFace` API (`new FontFace('Fredoka', 'url(' + assetBaseUrl + 'fonts/fredoka.woff2)')`, `document.fonts.add`, `await face.load()`), so no stylesheet or `@font-face` rule is needed; any load, parse or decode error reports `ASSET_LOAD_FAILED` through the G1 guard. In `create()`, before `ready`, it checks `this.textures.exists(key)` for each of the three built-in keys (`BUILTIN_TEXTURE_KEYS`, Phaser 3 names `__DEFAULT`, `__MISSING`, `__WHITE`; Phaser 4 names confirmed in MR1 step 1); if any is missing it reports `ASSET_LOAD_FAILED` and sends no `ready`. Otherwise it sends `ready` with `MR_CLIENT_PROTOCOL` (FR-MK-25) |
| G3 | RaceScene (`phaser/scenes/RaceScene.ts`) | MR1 | Per frame: feeds the race clock reading to G5, asks G4 to draw road and sprites, positions the kart and its lean, boost flame, bumpy-branch shake (skipped in reduced motion); hides the signs while paused. Its `update` body and HudScene's run inside a try/catch that reports `INTERNAL` through the G1 guard (first layer; the guard's window listeners catch everything else) |
| G4 | RoadRenderer (`phaser/render/RoadRenderer.ts`, `core/projection.ts`) | MR1 | Segment projection (`core/projection.ts` is pure math); draws grass, rumble strips, road and lane lines as quads into one Graphics object, fork branches as P strips with lateral offsets, sky and hill layers as parallax images; sprite pool for trees and signs, scaled far-to-near; 2-to-1 merge of distant segments |
| G5 | TrackRuntime (`core/trackRuntime.ts`) | MR1 local, MR4 shared | Thin adapter over S1 motion: applies the frame rule (dt from the race clock reading, clamped to 50 ms; never Phaser's smoothed delta), emits "question start", "decision line", "merge", "finish" with the clock time of the frame. MR1 may hold a local copy of the motion maths; MR4 replaces it with the S1 import |
| G6 | ForkController (`core/forkController.ts`) | MR4 | Current question index; at each decision line reads the lane from G7, records choice and fork time from the G5 event, decides right or wrong from the payload's `correctIndex`, counts coins, triggers boost or slowdown and the feedback text (FR-MK-6 to FR-MK-12) |
| G7 | LaneModel (`core/lanes.ts`) | MR1 | Pure: lane count, current lane, `left()`/`right()` clamped at the edges, re-placement to the nearest valid lane when the count changes (FR-MK-9) |
| G8 | InputLayer (`phaser/input/KeyboardInput.ts`, `phaser/input/TouchJoystick.ts`, `core/joystick.ts`) | MR1 | Keyboard: arrows and A/D to lane actions, P and Escape to pause, arrow keys captured so the page does not scroll; touch joystick view at the bottom centre with the pure threshold-and-repeat model in `core/joystick.ts`; joystick visible from the first frame when `init.touchUi` is true, otherwise after the first `pointerdown` with `pointerType === 'touch'` anywhere on the page, then for the rest of the session; no input during the countdown (FR-MK-3, FR-MK-20, FR-MK-21) |
| G9 | HudScene (`phaser/scenes/HudScene.ts`) | MR1 basic, MR4 full | Top bar (pause button, fork k / N, coins, time), question banner, lane answer chips near the kart with the current lane marked by shape and border, feedback icon and text, countdown, finish celebration (static in reduced motion), pause screen: an opaque panel over road and HUD with Resume, Sound and Quit (with confirmation); while it shows, the banner, signs and chips are hidden and the live region is empty (FR-MK-22, FR-MK-23, NFR-MK-6) |
| G10 | RaceClock (`core/raceClock.ts`) | MR1 | Pure, injected time source: starts at "Go", excludes paused time, reports elapsed time in integer milliseconds (floor) (FR-MK-5) |
| G11 | QualityGovernor (`core/quality.ts`) | MR1 | Two profiles (draw distance, render scale, roadside density); one-way drop to low when the median frame time of the first 120 running frames exceeds 20 ms (plan Q15) |
| G12 | SoundBank (`phaser/audio/SoundBank.ts`) | MR4 | Chime, error buzz, coin, boost, countdown, finish; optional music only if within budget; respects the sound flag; starts after the first input (browser autoplay rules) |
| G13 | GameText (`i18n/gameText.ts`, `locales/{en,es,pt}.json`) | MR4 | Prompt templates per question kind, reveal text ("7 x 8 = 56"), HUD, pause menu, countdown, friendly feedback words; operands formatted the same in all languages (FR-MK-19, NFR-MK-9, NFR-MK-21) |
| G14 | Protocol (`bridge/protocol.ts`, `bridge/__fixtures__/messages.json`) | MR4 | Message types, envelope `{ v: 1, type, ... }`, validators with a 16 KB limit, race payload validator against the bundle's protocol spec; fixture file shared with the Dart tests (FR-MK-49) |
| G15 | HostChannel (`bridge/hostChannel.ts`) | MR1 basic, MR4 full | Interface `send` / `onMessage`; `DirectChannel` for the React host (in memory, still validated) and `WebViewChannel` for the app (`window.flutter_inappwebview.callHandler('mathRally', json)` out, `window.__mathRallyReceive(json)` in) |
| G16 | EmbedEntry (`embed/main.ts`, `embed/index.html`, `embed/page.css`) | MR1 spike, MR5 final | App-bundle entry. `index.html` holds only a charset meta, the enforced CSP meta tag (`'self'` for every source; `blob:` or `data:` only by the F6 rule), a viewport meta, `<link rel="stylesheet" href="./page.css">`, one `<div id="root">` and `<script src="./math-rally.js">`. It has no inline `<script>`, no `<style>` element and no `style=` attribute; page sizing, background, `touch-action: none` and `user-select: none` live in `page.css`, and the font loads through G2's `FontFace` call. **Page guard** (`embed/pageGuard.ts`): the first import of `main.ts`, so its module body runs before every other module, Phaser included (ES module evaluation order, kept by the IIFE build). It creates the page's fatal-error guard (G1) and installs its `window` listeners for `error` and `unhandledrejection`, and in gate mode also installs the G17 violation recorder. An error before `ready` reports `ENGINE_START_FAILED`, one after it `INTERNAL` (NFR-MK-14). The guard's send holds its single message until `main.ts` has created the `WebViewChannel`, then sends it; if the bridge never comes up, the app's 20 s `ready` timeout applies. `main.ts` then waits for the WebView bridge to be ready, mounts G1 with `WebViewChannel`, `errorGuard: pageGuard`, `assetBaseUrl: './'`, `localSchemes: ['dashden-game://']`, build id from `__MATH_RALLY_BUILD_ID__`; an `EngineStartError` from the mount is reported as `ENGINE_START_FAILED` through the same guard |
| G17 | DevFrameOverlay (`dev/frameOverlay.ts`, `dev/violationRecorder.ts`) | MR1 | Frame-time overlay and CSV export for the gate. `violationRecorder.ts` (no imports) records every `securitypolicyviolation` event on `document` into the same export: `violatedDirective`, the blocked scheme (the keyword `inline` or `eval` when `blockedURI` is one, otherwise the URL scheme such as `data`, `blob` or `https`), the origin for `http` and `https` URLs, and the `sourceFile` path without its query string; never a full URL or page content. Its listener is registered before `mountMathRally` runs: in the module body of the slice page, and by `embed/pageGuard.ts` in the embed. The overlay also records each fatal-error guard report (code and the error's constructor name only) and offers a **Fault** trigger (keyboard F8 on desktop, an overlay button on a phone) that starts a tween whose update callback throws, for AC-44.2 and AC-48.2. Compiled only when `import.meta.env.DEV` is true or the build runs in the local gate mode (`vite build --mode gate`, used only on a developer machine and never deployed); absent from production and app release bundles (NFR-MK-1, U20) |

### 3.3 Web host - `apps/web/src/` (unit MR4)

| Id | Component (file) | Responsibility |
|---|---|---|
| H1 | MathRallySetupPage (`pages/math-rally/MathRallySetupPage.tsx`) | Lazy route. Four difficulty cards with path counts; lock state from H3; "How to play" (keys and joystick, plus the screen-reader limitation); Start navigates to `/math-rally/game?difficulty=<name>`; prefetches the game chunk on mount (FR-MK-40, FR-MK-41, NFR-MK-4) |
| H2 | MathRallyGamePage and host hook (`pages/math-rally/MathRallyGamePage.tsx`, `pages/math-rally/useMathRallyHost.ts`, `pages/math-rally/hostEnv.ts`) | Lazy route. Parses `difficulty`; mounts G1 in a `touch-action: none` container; host state machine (Section 2 of `math-kart-services.md`) with a 20 s `ready` timeout; passes `ready.protocolVersion` to H4; sends `init` with `touchUi` from `initialTouchUi(window)` and the language from `gameLanguage(i18n)`; shows `ScoreBreakdownModal`; pauses on `visibilitychange`; reads and writes the sound preference through `services/presentationPreferences.ts` (FR-MK-21, FR-MK-25, FR-MK-41 to FR-MK-44, FR-MK-50, NFR-MK-7, NFR-MK-9) |
| H3 | Level lock rule (`pages/math-rally/levelLocks.ts`) | Pure: `lockState(difficulty, { tier, gameIsPaid, freeDifficulties })` returns `playable` or `lockedPaid` (FR-MK-56) |
| H4 | API additions (`api/game.ts`) | `START_MATH_RALLY_GAME` document (operation `StartGame`), `startMathRallyGame()` with `mathRallyProtocol`, sharing the quest helper with `startGame()`; a local `const MATH_RALLY_UPDATE_REQUIRED_MESSAGE = 'Please update the app to play.'` and `isUpdateRequiredError`; `CompleteGameInput.mathRallySubmission`; result types declared locally (the race payload is `unknown` here). `api/game.ts` is imported by eager pages, so it imports nothing from `packages/shared/src/math-rally/*` or the funnel H5; H9 keeps the local message equal to the shared constant (FR-MK-26, FR-MK-43, FR-MK-52) |
| H5 | Shared funnel (`games/math-rally/shared.ts`) | The only `apps/web` module that names `packages/shared/src/math-rally/*` (per-file imports, no `zod`), same pattern as `utils/questShared.ts`. Used only by the game core and by the setup page (path counts from the client protocol spec); it imports no Phaser. Both users are lazy chunks and no eager module imports the funnel (H4 keeps its own message copy), so the funnel never reaches the entry chunk; the MR4 bundle report confirms it |
| H6 | Registries and locales | Entries in every web registry of `math-kart-delta-notes.md` Section 2 (routes, `GAME_FILTER_MAP`, leaderboard enum and filter, display maps, `games.math-rally.*`, `mathRally.*`) (FR-MK-35, FR-MK-36) |
| H7 | Partly-free hub presentation (`components/hub/GameTile.tsx`, `pages/hub/GameHubPage.tsx`) | `FREE_DIFFICULTIES_IN_PREMIUM_GAMES` copy keyed by catalog id, next to the existing `PREMIUM_GAMES` copy and checked against S7 by H9; tile badge "Paid" plus "Easy is free" note; no subscription redirect for partly-free games (FR-MK-56) |
| H8 | Routes (`config/constants.ts`, `App.tsx`, `utils/lazyWithTimeout.ts`) | `ROUTES.MATH_RALLY_SETUP`, `ROUTES.MATH_RALLY_GAME`; both routes are `lazyWithTimeout(() => import(...), 20 000)` inside `Suspense` with a route error boundary ("The race could not load.", Retry reloads the page); the dev-only slice route exists only under `import.meta.env.DEV` or in the local gate mode of G17 (MR1) |
| H9 | Consistency test (`__tests__/mathRallyRegistry.test.ts`) | Raw-text checks over web, backend and app registries, paid lists, free-difficulty copies and the two copies of the update-message text (`api/game.ts` and the Dart constant) against the shared constant, with a mutation suite (FR-MK-37) |
| H10 | Credits manifest (`public/games/math-rally/CREDITS.json`) and manifest test | Source, licence and URL per asset file; the test fails for any file under `public/games/math-rally/` without an entry, and when `sys/default.png`, `sys/missing.png` or `sys/white.png` is missing (original PNGs of at most 32 x 32 px that replace Phaser's built-in `data:` textures, G1) (NFR-MK-20) |

### 3.4 Backend - `services/game/src/`, `services/leaderboard/src/`, `scripts/` (unit MR3)

| Id | Component (file) | Responsibility |
|---|---|---|
| B1 | Start branch (`services/game.service.ts`) | For `MATH_RALLY`, before any read: difficulty must be 1 to 4, and `mathRallyProtocol` (type `unknown`) must pass `Number.isInteger(v) && MR_SUPPORTED_PROTOCOLS.includes(v)`; any other value (missing, `null`, 0, 2, 1.5, `"1"`, an object) gets the update message and uses no play. Other themes never read the field. After the existing gates: seed from `crypto.randomInt`, `buildRace(seed, difficulty, version)` before `checkLimit`; stores the record (with `protocolVersion`) on `create`; returns the `mathRally` payload (FR-MK-26) |
| B2 | Completion exit (`services/game.service.ts`, `completeMathRallyGame`) | Record check, bounded validation (B3), correct count from the stored key, timing against the expected times for those answers (S1), score (B4), update, achievements (non-blocking), metrics, event with server counts, cache invalidation, `finalizeQuest`; every rejection generic, nothing written (FR-MK-27 to FR-MK-33) |
| B3 | Submission validator (`utils/math-rally-validation.ts`) | Stored record check by protocol version, strict `zod` schema plus record-dependent bounds, `checkTiming`; returns `{ ok, value }` like `utils/circuit-validation.ts` (FR-MK-28, FR-MK-30) |
| B4 | Score breakdown (`services/score-calculator.service.ts`, `calculateMathRallyBreakdown`) | `MR_BASE` (2000, 2000, 2000, 2134) x multiplier (1.0, 1.5, 2.0, 2.5) x accuracy factor (0.5 + accuracy); `speedBonus` always 1.0; cap 6000 or 8000 from paid membership and difficulty (FR-MK-32) |
| B5 | Constants (`utils/math-rally.ts`) | `MATH_RALLY_THEME_ID` and `MATH_RALLY_UPDATE_REQUIRED_MESSAGE` re-exports, rejection message "This race could not be saved.", `MR_BASE` |
| B6 | Input schemas and handler mapping (`utils/validation.ts`, `handlers/game.handler.ts`) | Declares `mathRallyProtocol` and `mathRallySubmission`, both `z.unknown().optional()` (F13), so no value of either field can fail the handler's parse; adds `mathRally` to the start response only when present |
| B7 | Types and repository (`types/index.ts`, `repositories/game.repository.ts`, `packages/shared/src/types/entities.ts`) | `StartGameInput.mathRallyProtocol?: unknown`, `mathRally` on `StartGameResponse`, `CompleteGameInput.mathRallySubmission?: unknown`, optional `Game.mathRally`; `create` persists it |
| B8 | Rejection metric (`utils/metrics.ts`) | `publishMathRallyRejected(stage)`: metric `MathRallySubmissionRejected`, dimension `Stage` (NFR-MK-26) |
| B9 | Review list (`services/review.service.ts`) | Adds `MATH_RALLY` |
| B10 | Paid gate wiring (`services/game.service.ts`) | The paid-game condition calls S7 `isBlockedForFreeTier`; the difficulty-4 gate is unchanged (FR-MK-55) |
| L1 | Leaderboard (`services/leaderboard/src/types/index.ts`, `services/scoring.service.ts`) | `GameType.MATH_RALLY`; added to the standard group in `calculateScore`; dedicated `mathRally` config with validation 1 to 3600 s and score 0 to 8000; anomaly checks unchanged, covered by the AC-38.2 test (FR-MK-38, Q40) |
| D1 | Seed and verify scripts (`scripts/seed-math-rally.sh`, `scripts/verify-math-rally-seed.sh`) | Circuit Builder pattern: DEV default, exact `--prod` with `--profile dashden-new`, typed confirmation, idempotent theme and catalog rows, read-only verify with distinct exit codes, production order warning (FR-MK-39) |

### 3.5 App host - `apps/mobile/` (unit MR5)

| Id | Component (file) | Responsibility |
|---|---|---|
| A1 | MathRallySetupScreen (`lib/ui/screens/games/math_rally_screens.dart`) | Native difficulty picker in the existing setup style; lock state from A9; how-to-play card (FR-MK-45, FR-MK-56) |
| A2 | MathRallyPlayScreen (same file) | Hosts the WebView through all phases until the result; 20 s `ready` timeout; checks `ready.protocolVersion` against A4 and passes it to `session.start(mathRallyProtocol: ...)`; sends `init` with `touchUi: true` (the Start tap happened on the native screen) and the app language reduced to `en`, `es` or `pt`; lifecycle observer (background pauses); Android Back through the pure `backAction` rule (pause first; the leave confirmation opens directly when the game has not confirmed the pause within 1 s or on a second Back, so leaving never depends on the game answering); "race stopped" overlay on any game `error` after `ready` or when the page process ends, whose button and Android Back leave the screen; load-failure and "update the app" overlays; result through `GameResultScreen` (FR-MK-21, FR-MK-44, FR-MK-45, FR-MK-47 to FR-MK-50) |
| A3 | MathRallyBridge and WebViewPort (`lib/game/math_rally/bridge.dart`) | Sends host messages (built only from allowlisted fields, never a token or user detail), receives and validates game messages; `WebViewPort` interface so tests run without a WebView (FR-MK-47, FR-MK-49) |
| A4 | Protocol (`lib/game/math_rally/protocol.dart`) | Dart message types and validators mirroring G14; reads the shared fixture in tests; supported protocol versions `{1}`; update-message constant (FR-MK-49) |
| A5 | GameAssetServer (`lib/game/math_rally/asset_server.dart`) | Android: `WebViewAssetLoader` with an assets path handler on `https://appassets.androidplatform.net/`, in the platform-view composition mode chosen by the MR1 gate (U18); iOS: custom scheme `dashden-game://app/` answered from `rootBundle` with an allowlist under `assets/math_rally/`, the content type set from the extension table and the length of the bytes, `..` rejected; navigation to any other origin cancelled; WebView hardening settings (FR-MK-46, NFR-MK-18) |
| A6 | Session additions (`lib/api/game_api.dart`, `lib/api/game_models.dart`, `lib/game/framework/game_session.dart`) | Second `StartGame` document with `mathRally`, used when `mathRallyProtocol` is given; `StartGameResult.mathRally` (raw map); `start({int? mathRallyProtocol})`, `GameSessionState.startPayload`, `BlockReason.updateRequired` and `GameApiException.isUpdateRequired`; `mathRallySubmission` in `completeExtraKeys`; the screen uses the existing `gameSessionProvider` (plan Q7) |
| A7 | Registry, display, routes, paid copy, hub (`lib/game/game_registry.dart`, `lib/stats/game_meta.dart`, `lib/ui/router.dart`, `lib/config/paid_games.dart`, `lib/game/hub_logic.dart`) | `math-rally` entry (Science & Math, `MATH_RALLY`); meta icon and colour; `/math-rally/setup` and `/math-rally/play` with `quest` parsing; `kFreeDifficultiesInPaidGames`; partly-free tile playable with a paid badge (FR-MK-36, FR-MK-52, FR-MK-56) |
| A8 | Bundled game (`assets/math_rally/**`, `pubspec.yaml` asset entries) | Output of T1, committed with `build-info.json`; each asset subfolder listed in `pubspec.yaml` (Flutter asset folders are not recursive) (FR-MK-46, FR-MK-51) |
| A9 | Level lock rule (`lib/game/math_rally/level_locks.dart`) | Same rule as H3, in Dart |

### 3.6 Build tooling (units MR1 and MR5)

| Id | Component (file) | Responsibility |
|---|---|---|
| T1 | Embed build (`apps/web/vite.math-rally-embed.config.ts`, `apps/web/scripts/build-math-rally-embed.mjs`, `apps/web/scripts/math-rally-source-hash.mjs`) | Vite library mode, format `iife`, one `math-rally.js`, no source maps; copies `embed/index.html`, `embed/page.css` and `public/games/math-rally/**` (including `sys/`) into `apps/mobile/assets/math_rally/`; fails with exit 1 if `index.html` contains an inline `<script>`, a `<style>` element or a `style=` attribute, or if a `sys/` texture is missing; writes `build-info.json` with the protocol version, build id, `sourceHash` (SHA-256 over the inputs listed in the methods file Section 7, sorted, CRLF normalised) and a per-file hash list of the output; fails with exit 1 if the output exceeds the NFR-MK-3 app budget; `--gate` builds in the local gate mode (G17 included) and marks `build-info.json` as a gate build, for device checks only; `--check-only` recomputes both hashes, exits 3 on any difference, and also exits 3 for a gate build (FR-MK-51, NFR-MK-3) |

---

## 4. Data Decisions

- **Start input** (`startGame` for `MATH_RALLY`): existing fields plus `mathRallyProtocol`, the version from `ready`. Required for `MATH_RALLY`; ignored for other themes.
- **Start payload** (`startGame` response field `mathRally`, only for `MATH_RALLY`): `{ protocolVersion, difficulty, forks, paths, readSeconds, questions: [{ kind, operands, options, correctIndex }] }`. `correctIndex` is sent on purpose (instant feedback; stated limit NFR-MK-13).
- **Game record attribute** `mathRally` on `memory-game-games-{env}`: `{ seed, protocolVersion, paths, forks, key }`. `key` has N integers. It is not personal data and stays on the record after completion, so an operator can regenerate the race that was issued; the score cannot be re-derived from stored data because choices are not stored (NFR-MK-19). No new table, no new index, no new environment variable.
- **Protocol versions**: race parameters, track constants, kinds, operand rules and payload shapes are frozen per version after launch (methods file Section 1). The server builds and checks with the version stored on the record; the game validates the payload against its own version, which is the version its host sent.
- **Submission** (`completeGame` input `mathRallySubmission`): `{ choices: int[N], forkTimesMs: int[N] }` plus the top-level `completionTime` (seconds) and `attempts` (N). The server ignores `correctAnswers`, `totalQuestions` and `score` for this game.
- **Stored on completion**: `status`, `completedAt`, `completionTime`, `attempts` (N), `score`. Correct count travels in the GameCompleted event only.
- **Message envelope**: JSON text, at most 16 KB, `{ "v": 1, "type": "<name>", ... }`. The full list and field rules are in `math-kart-component-methods.md` Section 4.
- **Seeds**: server seeds come from `crypto.randomInt(0, 2 ** 32)`; offline app races use a seed from `Random.secure()` in Dart, passed in `init`, and the bundled generator at the bundle's protocol version.
- **Asset URLs**: web `/games/math-rally/...` (Vercel static files, fetched only by the game chunk); app `./` relative to the bundled `index.html`.

---

## 5. Requirement Coverage

| Requirements | Components |
|---|---|
| FR-MK-1, 2 | G3, G4, G12, H10 |
| FR-MK-3 | G5, G8, G9 |
| FR-MK-4, 5 | S1, G5, G10, G9 |
| FR-MK-6 to 8 | S1, G5, G6, G9 |
| FR-MK-9 | G7, G8 |
| FR-MK-10 to 12 | S1, G5, G6, G9, G12 |
| FR-MK-13 to 18 | S1 (versions), S2 to S5 |
| FR-MK-19 | S3, G13 |
| FR-MK-20 | G8 |
| FR-MK-21 | G8, H2 (`touchUi`), A2 (`touchUi: true`) |
| FR-MK-22 | G1 (live region), G9, G10, H2, A2 |
| FR-MK-23 | G9 |
| FR-MK-24 | G9, H2, A2 |
| FR-MK-25 | G2, H2, A2 (20 s timeout in both hosts) |
| FR-MK-26 | B1, B6, B7, S1, S5, H4, A6 |
| FR-MK-27 to 29 | B2, B3, B6 |
| FR-MK-30 | S1 (motion, expected times), G5 (frame rule), B3 |
| FR-MK-31 | B2, B8 |
| FR-MK-32 | B4, B5 |
| FR-MK-33 | B2 |
| FR-MK-34 | B1, B2, B10 |
| FR-MK-35, 36 | H6, H8, B9, L1, A7, D1 |
| FR-MK-37 | H9, A7 (paid-list parity test) |
| FR-MK-38 | L1 |
| FR-MK-39 | D1 |
| FR-MK-40 | H1, H3 |
| FR-MK-41 | H8 (both routes lazy), T1 (no impact on the web build), H1 (prefetch only from setup) |
| FR-MK-42 | G1 to G16 (no React, Flutter or network imports; import check in MR4) |
| FR-MK-43 | G1, H2 |
| FR-MK-44 | G1 (fatal-error guard), G3 (scene try/catch), G16 (page guard), G17 (Fault trigger in gate builds), H2, A2 |
| FR-MK-45 | A1, A2, A7 |
| FR-MK-46 | A5, A8, G1 (local schemes), G16 |
| FR-MK-47 | A2, A3, A6 |
| FR-MK-48 | A2 (`backAction` rule, race-stopped overlay) |
| FR-MK-49 | G14, G15, A3, A4, H2, A2 |
| FR-MK-50 | A2, A6, H2 |
| FR-MK-51 | T1, A8, G16 |
| FR-MK-52 | H4, A7, B2 |
| FR-MK-53 | S7 (launch lists), H7, A7 |
| FR-MK-54 | Checklist in Build and Test (`math-kart-unit-of-work.md`, pre-launch check PL5) |
| FR-MK-55 | S7, B10 |
| FR-MK-56 | H3, H7, A7, A9 |
| NFR-MK-1, 2 | G4, G5, G11, G17, A5 (composition mode) |
| NFR-MK-3, 4, 5 | H8, H5, T1, G1, G2 |
| NFR-MK-6 | G9 (lane chips) |
| NFR-MK-7, 8 | G1 and G9 (live region), G3, G9, H2 and A2 (reduced-motion flag) |
| NFR-MK-9, 10 | G13, G2 (font), H2 and A2 (language reduction) |
| NFR-MK-11 to 13 | B2, B3, B6, G14, A4, A3 |
| NFR-MK-14 | G1 and G16 (fatal-error guard, the game's top-level handler), H2 and A2 (generic messages), B2 and B3 (write only after validation) |
| NFR-MK-15 | B1, B2, B8 (new log lines); F17 (existing handler line, unchanged) |
| NFR-MK-16 | T1, A8 (pins and audits recorded at MR1 and MR5) |
| NFR-MK-17, 18 | G1 (image load type, built-in textures from `sys/`), G2 (font through `FontFace`), G16 (markup rules), G17 (violation record in the gate build), T1 (markup check), A5, H2 |
| NFR-MK-19 to 21 | B2 (no choices stored), H10, G13 |
| NFR-MK-22 | Section 8 of `math-kart-services.md` |
| NFR-MK-23 | S1 (protocol registry, freeze rule), B1, B6 (additive mapping), A6 (update block), A7 (older apps) |
| NFR-MK-24 | G1 (WebGL check), H2 (fallback message) |
| NFR-MK-25 | Section 0 |
| NFR-MK-26 | B8 |

Every FR-MK-1 to FR-MK-56 has at least one component.

---

## 6. Refinements of the Requirements Made Here

| Item | Requirement text | Design | Why |
|---|---|---|---|
| R-D1 | NFR-MK-9, Q33: one namespace in the main locale files | Host strings there; in-race strings in `games/math-rally/locales/` (requirements updated in iteration 1) | F5: the main files are in the entry chunk (NFR-MK-3) |
| R-D2 | NFR-MK-17: app page `connect-src 'none'` | `connect-src 'self'` (requirements and MK-21 updated in iteration 1) | The Phaser loader fetches atlases and sounds with XHR from its own origin |
| R-D3 | Q18 wording: leaderboard minimum "from the server's minimum plausible race" | 1 s minimum | F11; AC-38.1 still holds (the fastest accepted difficulty 4 race is far above 1 s) |
| R-D4 | FR-MK-49 lists `pauseChanged` without fields | `pauseChanged { paused, sound }` carries the sound toggle so the host can store it | Keeps the message list of FR-MK-49 unchanged |
| R-D5 | FR-MK-50 web: "anything else back to the hub" | A paid-required refusal goes to the subscription page with `premiumRequired` (existing pattern); the update refusal shows a reload message; other failures go to the hub | FR-MK-56 asks for the existing upgrade path; a web page that sends an outdated version needs a reload, not the hub |
| R-D6 | AC-32.3 (iteration 3 wording): 0 correct scores 1000, 1500, 2000 and 2668 at difficulty 1 to 4, one third of the uncapped all-correct product | Same numbers (methods file Section 5); no refinement left. Kept as a record: before iteration 3 the requirement said "one third of an all-correct race", which does not hold at difficulty 4 | `MR_BASE[4]` is the integer 2134, so 8000 is reached through the cap (8003 before it), as for the generic Super Hard base 1100 |
| R-D7 | FR-MK-49: `init` carries "whether to show the joystick from the start" | Field name `touchUi` (boolean) | Names the FR-MK-21 rule's host input |
| R-D8 | AC-44.2 and AC-48.2: "pressing the debug key" | F8 on a desktop keyboard; on a phone, the Fault button of the gate overlay (G17). Both exist only in DEV and gate builds | A phone in the WebView has no keyboard |
| R-D9 | FR-MK-44 and FR-MK-48 name the error message for a failed race; they do not say which message a game error before `ready` gets, or what Android Back does outside racing and paused | A game `error` before `ready` gets the load-failure message ("The race could not load.", no play used); from `ready` on, "The race stopped unexpectedly."; after `raceFinished` a game error is ignored so the submission completes. Back: loading leaves, submitting is ignored, every overlay leaves (methods Section 6 `backAction`) | Before `ready` nothing was started; after `raceFinished` the result no longer depends on the game |

---

## 7. Security Baseline Compliance (new design)

| Rule | Status | Basis |
|---|---|---|
| SECURITY-01 | N/A for new stores | No new store; one attribute on the existing games table (existing encryption) |
| SECURITY-02 | N/A | No new gateway, load balancer or CDN |
| SECURITY-03 | Compliant for new log lines; pre-existing debt remains | B2 and B8 log ids, difficulty, counts, score and stage only; never choices, key, seed, protocol payloads, token, email or username. B1 logs a refused `mathRallyProtocol` only as an integer or as its JavaScript type name, never the raw value. Host logs carry error classes only; the app logs only in debug builds. Pre-existing: the handler's catch block logs every failed operation of every game at error level with `operationName`, `userId` and `username` (F17), so Math Rally refusals also write that line; it carries no choices or key, and changing it is out of v1 scope (services Section 5.4, requirements gap 15) |
| SECURITY-04 | Compliant for new code; pre-existing Report-Only CSP remains | Game works without `unsafe-eval` or inline script. The app page carries its own enforced `'self'`-only CSP and has no inline `<script>`, no `<style>` element and no `style=` attribute (G16, checked by T1). Phaser is configured to need neither `blob:` (images load as image elements) nor `data:` (built-in textures from bundled `sys/` files) (G1). Only a source the engine cannot avoid is added, to `img-src` (and `media-src` for audio) of both policies, and documented (U5, U20). Such a URL is created on the device, so nothing leaves it |
| SECURITY-05 | Compliant | B6 passes the two new inputs through as `unknown` (the `questContext` pattern), so a malformed value cannot become `INTERNAL_ERROR`; B3 strict schema with sizes and a record check; B1 checks difficulty and protocol before any read and refuses every value other than a supported integer; G14 and A4 validators with a 16 KB limit; race payload validated by the game against its protocol spec; iOS scheme handler path and extension allowlist (A5); web query parameters allowlisted (H2) |
| SECURITY-06 | N/A | No IAM change |
| SECURITY-07 | N/A | No network change |
| SECURITY-08 | Compliant | `userId` from the verified JWT; ownership and status checks reused; free-tier decisions only on the server (B10, S7); the WebView never holds a token (A3); CORS unchanged |
| SECURITY-09 | Compliant | Generic errors in every host; release WebView with debugging and file access off, external navigation and pop-ups refused (A5); dev overlay absent from production (G17); no source maps in the app bundle (T1) |
| SECURITY-10 | Compliant for new dependencies; SBOM is pre-existing debt | Phaser and `flutter_inappwebview` pinned exactly with lockfiles; `npm audit` and `flutter pub outdated` recorded at MR1 and MR5; licences recorded; no CDN |
| SECURITY-11 | Compliant, with stated limit | Security logic isolated in S1 (timing), S7, B1, B2, B3. Misuse cases: invented answers, unissued questions, times faster than the kart can drive for the given answers, replayed completion, probing which check failed, tampered bridge messages, a forged or outdated protocol version, FREE user at a paid difficulty, path traversal in the iOS scheme handler. Rate limiting: existing per-user daily allowance plus API Gateway. Stated limit: a script that reads the payload can pick every right answer; because the score uses only the server's correct count and times below the floor are refused, it can equal a perfect human race and never exceed one (NFR-MK-13) |
| SECURITY-12 | N/A | No authentication change |
| SECURITY-13 | Compliant | No CDN loads; bundle ships inside the signed app, and `--check-only` compares its source hash and file hashes before release; messages parsed with `JSON.parse` / `jsonDecode` then validated against allowlists (no object revival). The stored seed and key let an operator regenerate the race that was issued; the score cannot be re-derived because choices are not stored (NFR-MK-19) |
| SECURITY-14 | N/A for new code; pre-existing gaps remain | Rejection metric makes a later alarm possible; no alarm added |
| SECURITY-15 | Compliant | Top-level handler of the game: the G1 fatal-error guard listens on `window` for `error` and `unhandledrejection` while the game is mounted, and on the app page (a new application entry point) G16's `embed/pageGuard.ts` installs it before any other module runs; the first error stops the game and sends one generic code, later ones are ignored (NFR-MK-14, AC-44.3). The existing React error boundary in `main.tsx` stays for render errors (F18). Every external call has explicit handling (tables in `math-kart-services.md` Section 5), including the `ready` timeout and the app's Back fallback, which never depends on the game answering; access checks fail closed; engine teardown in `finally` paths |

No blocking finding.

---

## 8. Unverified Assumptions Carried Into Construction

| Id | Assumption | Where it is resolved | If false |
|---|---|---|---|
| U1 | A stable Phaser 4 on npm with Scene, Graphics, Image, Text, Loader, Scale, Keyboard and Sound equivalents | MR1 step 1 | Owner decides (stay on Phaser 3.x latest, or wait) |
| U3 | Phaser 4 gzip size fits 450 KB with the game | MR1 build report | Custom build, lighter assets (Q27 B) |
| U4 | Canvas renderer fallback without WebGL | MR1 | FR-MK-44 message only |
| U5 | Phaser 4 can load images as `HTMLImageElement` (Phaser 3: `loader.imageLoadType`), so it creates no `blob:` URLs; Phaser 3's default XHR image loading creates them | MR1 step 7 (desktop, under the app page policy) and step 8 (WebView) | Narrow `img-src blob:` (and `media-src blob:` if audio needs it) in both CSPs, documented |
| U6 | `flutter_inappwebview` supports `WebViewAssetLoader`, an iOS custom scheme handler, JS handlers and the hardening settings on the app's minimum OS versions | MR1 spike | Stop; owner decides |
| U7 | WebGL in the Android System WebView and WKWebView reaches the gate | MR1 gate | Levers, then owner (Q29) |
| U15 | Vite JSON named imports keep the game locale files out of the entry chunk | MR4 bundle report | Load game strings with a dynamic `import()` inside the chunk |
| U16 | CSP `'self'` matches a custom-scheme origin in WKWebView | MR1 spike | List `dashden-game:` explicitly |
| U17 | Vercel serves `public/games/math-rally/**` as static files before the SPA rewrite in `vercel.json` | MR4 preview deploy check | Exclude the folder from the rewrite pattern |
| U18 | Which Android platform-view composition mode `flutter_inappwebview` 6.x uses by default (believed to be the setting `useHybridComposition`), which other mode it offers, and how much each changes WebGL frame rate | MR1 gate, measured in both modes | The faster mode ships and is recorded; if neither passes, the remaining levers, then owner |
| U19 | Phaser 4's loader accepts the XHR response an iOS custom-scheme handler produces. Phaser 3 treats status other than 200 as a failure unless the response URL starts with a scheme in `loader.localScheme` (default `['file://', 'capacitor://']`, which `engineConfigFields` repeats as a literal because the pure module cannot read Phaser); a scheme-handler response may reach script as status 0; `CustomSchemeResponse` in the plugin may not carry a status | MR1 step 1 confirms Phaser 4's default list and updates the literal; MR1 spike step: one image, one atlas JSON, one audio file and one missing file over `dashden-game://` | G1 already lists the scheme as local (no change); if Phaser 4 has no local-scheme setting, A5 must produce a status-200 response, else stop and the owner decides |
| U20 | Phaser 4 boots under an enforced `img-src 'self'` and `style-src 'self'` with its default textures configured. Phaser 3 loads its default, missing and white textures from `data:` URIs unless `images.default`, `images.missing` and `images.white` name other files (`TextureManager.boot` sets each as an `Image` source), and the white texture backs untextured WebGL fills, which G4's road uses. Whether Phaser 4 keeps these settings, adds further built-in textures, or inserts a `<style>` element or a markup `style` attribute is unknown here. Whether a built-in texture that fails to load stops the boot is also unknown: one reading of Phaser 3's `TextureManager.boot` counts a failed texture toward READY, so the game would boot without it (from knowledge of the Phaser 3 source, not run). The design depends on neither reading: G2 checks the three keys before `ready`, and an engine that never boots meets the hosts' 20 s timeout | MR1 step 7 (desktop, under the app page policy) and step 8 (WebView): G17 records every `securitypolicyviolation` and every `data:` URL requested at boot; the report states whether each built-in texture is configurable; step 8 also runs a build with `sys/white.png` removed and records whether Phaser 4 boots and whether G2 reports `ASSET_LOAD_FAILED` | A built-in texture that cannot be configured: `data:` added to the app page's `img-src` only (the web policy already lists it), documented under the same rule as `blob:`. A required `<style>` element or markup `style` attribute: stop and the owner decides (no `'unsafe-inline'` without a decision) |
| U21 | An uncaught exception in Phaser 4's frame step ends its `requestAnimationFrame` loop (Phaser 3 runs the step before requesting the next frame; from knowledge of its source, not run), and Phaser 4 has a loop stop and a sound stop-all (Phaser 3 `game.loop.stop()`, `game.sound.stopAll()`) for the guard to call | MR1 Fault trigger on web and in the spike WebView (AC-44.2, AC-48.2); MR1 step 1 for the method names | Nothing changes in the guard: it stops the game and reports in either case. A missing stop method: the guard skips that step, and the host's teardown destroys the engine |

The other assumptions of requirements Section 10 are resolved at these points: U2 (template pattern only; no template code is copied unless its licence is recorded) at MR1 start; U8 (CC0 licences) per file at download; U9 (Vercel resolves `packages/shared`) at the MR4 preview deploy; U10 (reference Android phone) before MR1 measurement; U11 (store policies) at the first MR5 submission; U12 (race length, load time) by the MR1 and MR4 measurements; U13 (Flutter on Windows) at MR5 start; U14 (production tables) by pre-launch check PL6.

---

## 9. Responses to the Design Review (iteration 1)

Review: `.agents/tasks/math-kart-inception/review.md`, verdict CHANGES_REQUESTED. Requirement-side responses are in `../requirements/math-kart-requirements.md` Section 13; this table covers the design-side files (`math-kart-execution-plan.md`, `math-kart-application-design-plan.md`, the application design files, the unit files, the concept page and `aidlc-state.md`).

| Finding | Response | Where |
|---|---|---|
| 1 HIGH, the time factor rewards nothing the player controls | Addressed. Shared motion maths with exact per-frame integration and the G5 frame rule (dt from the race clock, clamped); `expectedRaceTimesMs` is the closed-form continuous solution for the given right/wrong answers; `isPlausibleTiming` rejects any time more than the tolerance below it; the tolerance comes from a property test with frame deltas in [1, 50] ms plus clamp and pause cases. `minForkTimesMs`, `minFinishTimeMs` and `nominalRaceSeconds` removed. Score: `speedBonus` 1.0, `MR_BASE` 2000/2000/2000/2134, all-correct 3000/4500/6000/8000. SECURITY-11 limit reworded | Methods Sections 1, 2 and 5; services Sections 4.2, 7 and 8; components S1, G5, B3, B4, Section 7; unit MR2 and MR3 |
| 2 MEDIUM, installed bundles break when parameters change | Addressed. Protocol registry with one folder per version, freeze rule enforced by golden fixtures that become read-only at launch (PL8); `mathRallyProtocol` declared in the start schema, checked by B1 before any read; record stores `protocolVersion`; B3 checks with that version; the app blocks with `BlockReason.updateRequired` instead of falling back to an offline race | Methods Sections 1, 5 and 6; services Sections 2, 3, 4.1, 5 and 6; components F9, F13, S1, B1, B6, A6; dependency Section 6; unit MR2, MR3, MR5 |
| 3 MEDIUM, equal-value signs and no canonical form | Addressed. Canonical patterns (integer -999..999 without leading zero or "-0"; fraction with one- or two-digit parts; at most 4 characters), `parseOption` and `sameValue`, value-based contracts and the AC-15.2 property test | Methods Section 1 "Options"; components S2 to S4; game payload validation (methods Section 4) |
| 4 MEDIUM, pause shows the question | Addressed with Q39 A: opaque pause panel, banner, signs and chips hidden, live region cleared, window continues on resume; countdown freezes | Methods Section 2 (`setPaused`); components G1, G3, G9; concept Section 3 and the pause mock |
| 5 MEDIUM, joystick can be hidden on a touch phone | Addressed. `init.touchUi`; web sets it from `(any-pointer: coarse)` or `maxTouchPoints > 0`; the app always sends `true`; otherwise the joystick appears on the first touch pointer | Methods Sections 2 to 4; components G8, H2, A2; concept Section 3 |
| 6 MEDIUM, the WebView spike misses known risks | Addressed. MR1 measures the gate in both Android composition modes and adds the mode to the levers; G1 marks `dashden-game://` as a local scheme and A5 sets content type and length; spike step loads an image, an atlas JSON, an audio file and a missing file; the `blob:` rule applies to the enforced app CSP; U18 and U19 added | Unit MR1 steps 7 to 9; components G1, G16, A5, Section 8; methods Section 6 (`mimeTypeFor`) |
| 7 MEDIUM, privacy statement too broad for web | Requirement-side wording addressed by the requirements author. Design files checked: the only "no request" claims are about the app page (A5, G16 CSP), which is correct as stated | Services Section 7 invariant row reworded to "the app page" |
| 8 MEDIUM, `--check-only` cannot detect a stale bundle | Addressed. `sourceHash` over the sorted inputs with CRLF normalisation (F14), per-file output hashes, `--check-only` recomputes both and exits 3; build id derived from the hash, no git commit id; PL7 and plan Q3 reworded | Methods Section 7; components T1, F14; services Section 4.4; unit MR5, PL7; plan Q3 |
| 9 NIT, fork count and "sum" in the concept | Addressed: "FORK 3/12" in the mock and text alternative; "the correct result" | Concept Sections 1 and 2 |
| 10 NIT, Dart `RaceFinishedMessage` lacks `correctCount` | Addressed | Methods Section 4 |
| 11 NIT, `?difficulty=` on the wrong page | Requirement fixed by the requirements author; the design already parsed it on the game route only (services Section 2) | n/a |
| 12 NIT, quest ACs need a test seam | Addressed in the design: F15, stub `QuestService` through the optional constructor parameter | Components F15; services Section 8; unit MR3 criteria |
| 13 NIT, entry-chunk budget | Addressed. Both routes lazy through `lazyWithTimeout`; the funnel lives only in lazy chunks; the budget counts code outside lazy chunks, excluding locale JSON and registry entries, which the bundle report lists separately; the "lazy-load setup if over budget" fallback removed | Components H1, H5, H8; unit MR4 criteria |
| 14 NIT, regional language codes | Addressed: `gameLanguage(i18n)` on web, base language code in the app | Methods Section 3; services Sections 2 and 3 |
| 15 NIT, no `ready` timeout | Addressed: 20 s in both hosts, no `startGame`, generic load message; the lazy route load has the same 20 s limit | Methods Section 3; services Sections 2, 3, 5.1 and 5.3 |
| 16 NIT, "auditable" overstated | Addressed | Section 4 and Section 7 SECURITY-13 |
| 17 NIT, ASCII mock outside the allowed set | Addressed by redrawing: every drawing stroke uses only the allowed set (plus, minus, vertical bar, caret, the letter v, angle brackets); text labels keep ordinary punctuation (as the standard's own examples do), recorded in a note under the mock | Concept Sections 1 to 3 |
| 18 NIT, branch not pushed | Not done in this step: the step instructions say "commit, do not push". The push belongs to the final step of the workflow, before the report | n/a |
| 19 NIT, housekeeping | `aidlc-state.md` now ends with a newline (R16 order fixed by the requirements author) | `aidlc-state.md` |

Cross-document fix made in this step: none to the requirements text. R-D6 records how AC-32.3 is read at difficulty 4.

---

## 10. Responses to the Design Review (iteration 2)

Review: `.agents/tasks/math-kart-inception/review.md` (iteration 2), verdict CHANGES_REQUESTED (0 HIGH, 1 MEDIUM, 6 NIT). Requirement-side responses are in `../requirements/math-kart-requirements.md` Section 13.2; this table covers the design-side files.

| Finding | Response | Where |
|---|---|---|
| 1 MEDIUM, the app page's `'self'`-only CSP blocks Phaser's built-in `data:` textures | Addressed. G1 builds the Phaser config from the pure `engineConfigFields(options)`: `images.default`, `images.missing` and `images.white` point at bundled original PNGs under `assetBaseUrl + 'sys/'` (listed in `CREDITS.json`, presence checked by H10 and T1), and a unit test asserts that no config value starts with `data:` or `blob:`. G16: `index.html` has no inline `<script>`, no `<style>` element and no `style=` attribute (T1 fails the build otherwise); page styles live in a linked `page.css`; G2 loads the font with the `FontFace` API. A missing or blocked `sys/` file stops the engine before `ready`, so the hosts' 20 s timeout applies. MR1 step 7 now also runs the slice on desktop under the app page policy (the web policy allows `data:` and inline styles, so it cannot show the problem); step 8 records every `data:` URL requested at boot, every CSP violation (G17) and whether each built-in texture is configurable. Fallback if not configurable: `data:` in the app page's `img-src` only, documented. U20 added | Components F6, G1, G2, G16, G17, H10, T1, Section 5 (NFR-MK-17 row), Section 7 SECURITY-04, Section 8 U5 and U20; methods Sections 2, 6 and 7; services Sections 5.2 and 5.3; unit MR1 steps 7 and 8 and criteria; `aidlc-state.md` open items |
| 2 NIT, H4 brings the shared race module into the entry chunk | Addressed. `api/game.ts` defines its own `MATH_RALLY_UPDATE_REQUIRED_MESSAGE` and imports nothing from the race module or the funnel; H9 checks this copy and the Dart copy against the shared constant. `H4 --> S1` removed from the graph, the H4/S1 matrix cell emptied, the text alternative updated | Components F16, H4, H5, H9; methods Section 3; dependency Sections 1 and 2; unit MR4 scope |
| 3 NIT, the FR-MK-14 integer pattern accepts "-0" | Requirement side (fixed by the requirements author). The methods file (Section 1, `INTEGER_OPTION`) already used the pattern that rejects "-0"; no design change | n/a |
| 4 NIT, out-of-range `mathRallyProtocol` values never reach the update-message check | Addressed. B6 declares `mathRallyProtocol: z.unknown().optional()`; for `MATH_RALLY`, B1 accepts only `Number.isInteger(v) && MR_SUPPORTED_PROTOCOLS.includes(v)` and refuses anything else with the update message before any read; other themes never read the field. The refusal log carries the value only as an integer or as its type name. Tests list missing, `null`, 0, 2, 1.5 and `"1"` (AC-26.3) and other themes with `0` and `"x"` (AC-26.2) | Components F13, B1, B6, B7, Section 7 SECURITY-03 and SECURITY-05; methods Section 5; services Sections 4.1, 5.4, 6 and 8; unit MR3 scope |
| 5 NIT, AC-32.3 conflicts with AC-32.4 at Super Hard | Requirement side (AC-32.3 now names 1000, 1500, 2000 and 2668). R-D6 updated to say no refinement is left; methods Section 5 cites the new wording | Section 6 R-D6; methods Section 5 |
| 6 NIT, the floor argument misstates the late-window effect, and the layout contract has no one-frame margin | Addressed. Contract: `max(maxSpeed x boostSeconds, slowFactor x cruiseSpeed x slowSeconds) + maxSpeed x 0.05 < gap` for every gap and for `finishLine - decisionLine[N - 1]` (0.05 s is the 50 ms frame clamp). The argument now says that once both windows have ended the frame position equals the exact position at the same kinematic time; that during a late boost the frame kart is behind; and that during a late slowdown it is ahead by at most `(1 - slowFactor) x cruiseSpeed x 0.05` until up to one frame after the exact window ends, which is why no line may lie within one frame's travel after a window | Methods Section 1; services Section 7 invariant row |
| 7 NIT, the branch is still not pushed | Backlogged to the final workflow step. This step's instructions say "commit, do not push"; the push (`git -C ...\.worktrees\math-kart push -u origin feat/math-kart`) belongs to the orchestrator's final step, before the report | n/a |

Cross-document fix made in this step: none to the requirements, questions, delta notes or stories (the requirements author already revised them for findings 1, 3, 4 and 5).

---

## 11. Responses to the Design Review (iteration 3)

Review: `.agents/tasks/math-kart-inception/review.md` (iteration 3), verdict CHANGES_REQUESTED (0 HIGH, 1 MEDIUM, 5 NIT). Requirement-side responses are in `../requirements/math-kart-requirements.md` Section 13.3; this table covers the design-side files.

| Finding | Response | Where |
|---|---|---|
| 1 MEDIUM, no top-level error handler in the game core or the app page; the app's Back rule depends on the game being alive | Addressed. G1 fatal-error guard: the pure `createFatalErrorGuard(send)` sends at most one `error` (`ENGINE_START_FAILED` before `ready`, `INTERNAL` after, or a named code) after stopping the loop and sound, ignores later reports and does nothing after `dispose`; `installPageErrorListeners` adds `window` listeners for `error` and `unhandledrejection`; every `error` the game sends goes through the guard; `destroy()` removes the listeners. Both are Vitest-tested in node with a plain `EventTarget` (AC-44.3). G16: `embed/pageGuard.ts` is the first import of `main.ts`, so the listeners exist before any other module runs, and the guard holds its one message until the channel exists. The scenes' `update` try/catch stays as a first layer. Hosts map a game error by phase (R-D9). A2: Back runs through the pure `backAction` rule; after a Back that sent `pause`, the leave confirmation opens if `pauseChanged { paused: true }` has not arrived 1 s later, or on the next Back (AC-48.3); the race-stopped overlay's button and Android Back leave. SECURITY-15 row names the guard next to the React error boundary (F18). MR1: G17 Fault trigger (F8 or an overlay button, R-D8) throws inside a tween callback; on web the slice shows "The race stopped unexpectedly.", in the spike the overlay appears and Back leaves; guard reports during normal gate play are gate findings. U21 added | Components F18, G1, G3, G16, G17, A2, Sections 5 to 8; methods Section 2 (guard, `pageGuard.ts`, BootScene, `HostFailure`), Section 6 (`backAction`); services Sections 2, 3, 5.1 to 5.3, 7, 8; unit MR1, MR4, MR5; story map MK-3, MK-14; execution plan risk driver 9 |
| 2 NIT, a failed built-in texture probably does not stop Phaser's boot; `engineConfigFields` cannot read Phaser's default `localScheme` | Addressed. G2 checks `this.textures.exists` for `BUILTIN_TEXTURE_KEYS` (Phaser 3 `__DEFAULT`, `__MISSING`, `__WHITE`) in `create()` before `ready` and reports `ASSET_LOAD_FAILED` if one is missing; an engine that never boots meets the 20 s timeout, so the design depends on neither reading. `PHASER_DEFAULT_LOCAL_SCHEMES = ['file://', 'capacitor://']` is a literal in `core/engineConfig.ts`, merged with the given schemes without duplicates. MR1 step 1 confirms both literals for Phaser 4; step 8 runs a build without `sys/white.png`. This corrects the Section 10 statement that a missing `sys/` file always ends in the timeout | Components G2, U19, U20; methods Section 2; services Sections 5.1 to 5.3; unit MR1 steps 1 and 8 |
| 3 NIT, the desktop run under the app page policy cannot be violation-free inside the React shell; G17 listener timing unspecified | Addressed. Desktop CSP pass rule (services Section 8): a baseline run with `?mount=0` and a race run; no `data`, `blob`, `inline` or `eval` violation and none from a game file beyond the baseline; the Google Fonts stylesheet and fonts linked by `apps/web/index.html` are expected and listed in the gate report. MR4 runs it on the slice route with the full game core and an offline race, because the policy's `connect-src 'self'` blocks the API. In the WebView the rule is no violation at all. G17 records `violatedDirective`, the blocked scheme, the origin of `http` and `https` URLs and the `sourceFile` path without its query string; its recorder (`dev/violationRecorder.ts`, no imports) is registered in the slice page's module body and by `embed/pageGuard.ts`, both before `mountMathRally` | Components G17; services Section 8; unit MR1 steps 2, 7 and 8, MR4 scope and checklist; execution plan MR1 NFR Requirements |
| 4 NIT, every refusal also writes the handler's existing error-level line with the username | Addressed. F17 records the fact; services Section 5.4 says it below the table and the FREE-gate row no longer says "no log"; the levels paragraph of Section 5 points to it; SECURITY-03 row reads "Compliant for new log lines; pre-existing debt remains"; `aidlc-state.md` open items record it as pre-existing SECURITY-03 debt. No handler change | Components F17, Section 7; services Sections 5 and 5.4; `aidlc-state.md` |
| 5 NIT, requirements Section 7 names the rejected start-document option | Requirement side, fixed by the requirements author (row now names `START_MATH_RALLY_GAME`, operation `StartGame`). The design files already used plan Q8 A (H4, methods Section 3); no design change | n/a |
| 6 NIT, the branch is still not pushed | Backlogged to the final workflow step. This step's instructions say "commit, do not push"; the orchestrator runs `git -C ...\.worktrees\math-kart push -u origin feat/math-kart` before the report | n/a |

Found while revising: an app gate build left in `apps/mobile/assets/math_rally/` could reach a release, so T1 gains `--gate` (marks `build-info.json`) and `--check-only` exits 3 for a gate build (PL7). Cross-document fix made in this step: none to the requirements, questions, delta notes or stories.
