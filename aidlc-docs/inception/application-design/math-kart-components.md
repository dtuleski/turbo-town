# Math Rally - Components

**Created**: 2026-11-25
**Stage**: INCEPTION - Application Design
**Basis**: `../requirements/math-kart-requirements.md` (FR-MK-1 to 56, NFR-MK-1 to 26), `../user-stories/math-kart-stories.md` (MK-1 to 28), `../plans/math-kart-application-design-plan.md` (decisions Q1 to Q15), code read at `c6ccf0f`
**Name**: "Math Rally" (owner answer Q22). Files keep the `math-kart-` prefix for this inception run. Ids: theme and game type `MATH_RALLY`, catalog `math-rally`, routes `/math-rally/...`, locale namespace `mathRally`.
**Scope guard**: v1 only. No rivals, items, extra tracks, gamepad, Quest Map node or Flame port.

## 0. Overview and Locked Stack

Math Rally is one game core written once in TypeScript with Phaser 4. It runs in two hosts: a lazy-loaded React page on dashden.app, and a Flutter screen that shows the same code in a WebView from files bundled in the app. The game core knows nothing about React, Flutter, tokens or the network; it talks to its host through nine versioned JSON messages. Each host owns the API calls: the server builds every scored race from a seed, keeps the answer key, and re-scores the lanes the player chose. A pure shared module in `packages/shared` holds the question generator and every number the game and the server must agree on (paths, forks, reading windows, track distances, speeds, timing floors) plus the per-difficulty free gate.

**Technology stack (locked once this design is approved)**

| Area | Choice | Status |
|---|---|---|
| Game engine | Phaser 4, exact version pinned in `apps/web/package.json` at the start of MR1 (latest stable 4.x on npm that day) | Version and APIs unverified (U1 to U5); MR1 confirms. Any change of engine or major version goes to the owner |
| Language and build | TypeScript 5.3, Vite 5.1 (existing), Vitest 4 (existing), `fast-check` (existing) | Existing |
| Web host | React 18.2, `react-router-dom` 6, Apollo client, `react-i18next` (existing) | Existing |
| Shared core | `packages/shared`, Jest 29 and `fast-check` 3 (existing); the Math Rally module itself has no dependency (no `zod`) so `apps/web` can import it through a funnel | Existing tooling |
| Game Service and Leaderboard | Node Lambda, TypeScript, `zod` 3, Jest (existing) | Existing |
| App host | Flutter 3.19+, Dart 3.3+, Riverpod, go_router (existing); **new**: `flutter_inappwebview` 6.x pinned exactly | Plugin features unverified (U6); MR1 spike confirms |
| Font | Fredoka (SIL OFL 1.1), bundled as `woff2` | Licence checked and recorded at download |
| Art and sound | CC0 packs (for example Kenney.nl) and original simple art, listed in a credits manifest | Per-file licence recorded (U8) |
| Not used | three.js, Flame, any analytics, ads or remote-config SDK in the game, Google Fonts in the game, CDN scripts, third-party joystick plugins | Locked |

New npm dependency: Phaser only (in `apps/web`). New pub dependency: `flutter_inappwebview` only.

---

## 1. Findings From the Code That Shape the Design

| # | Finding (file read) | Consequence |
|---|---|---|
| F1 | The Game Service routes GraphQL by operation name and returns the full resolver object whatever the selection set (`services/game/src/handlers/game.handler.ts`: `extractOperationName`, `routeOperation`, `data: { [normalizedOp]: result }`). The `startGame` mapping lists fields explicitly | The handler adds `mathRally` to the start mapping only when present (AC-26.2). The web can send a second `StartGame` document with a `mathRally` selection (plan Q8) |
| F2 | `startGame` order: tier, quest validation, paid gate, difficulty-4 gate, `checkLimit`, `validateTheme`, `create`, `incrementUsage` (`game.service.ts`) | The race is built before `checkLimit` so a build failure costs no play; the per-difficulty gate replaces the paid gate condition in place, so a refused start costs no play (AC-56.4) |
| F3 | `completeGame` checks ownership and status, then branches to `completeCircuitBuilderGame` before the generic path; both call `finalizeQuest` | Math Rally adds a third branch at the same place, built like the Circuit Builder one |
| F4 | `GameRepository.create` writes an explicit attribute list (spreads `questContext` when present); `update` is a `SET` of the given keys | `create` gains the same conditional spread for `mathRally`; completion uses `update` with status, time, attempts and score only, so no choice is ever written (NFR-MK-19) |
| F5 | `apps/web/src/i18n.ts` imports `en.json`, `es.json` and `pt.json` whole into the entry bundle | In-race strings live in `apps/web/src/games/math-rally/locales/` (NFR-MK-9 refined) |
| F6 | Web CSP (Report-Only) has `connect-src 'self' ...` and `img-src 'self' data: https://upload.wikimedia.org`, no `blob:` (`apps/web/vercel.json`) | Same-origin asset XHR is allowed. If Phaser 4 creates `blob:` image URLs, the loader is set to load images as `HTMLImageElement` if available, otherwise `blob:` is added to `img-src` only (U5, NFR-MK-17) |
| F7 | `GameHubPage.tsx` redirects FREE users to the subscription page for any id in `PREMIUM_GAMES` (`GameTile.tsx`); the app's `buildHubTiles` marks paid games `paidUnavailable` for FREE users (`lib/game/hub_logic.dart`) | FR-MK-56 needs an exception in both places, driven by a free-difficulty copy |
| F8 | `GameSessionFrame` replaces the board with its own paused view when the session is paused (`lib/game/framework/game_session_frame.dart`) | The Math Rally play screen does not use `GameSessionFrame`; it keeps the WebView mounted through pause and drives `GameSessionController` itself |
| F9 | `GameSessionController.start()` returns no per-game start data; `complete()` and `completeOrRecover()` take `extra`, `attempts` and `completionSeconds` overrides; `GameApi.completeExtraKeys` allowlists extra keys | Additive: an optional `requestMathRallyRace` flag and a `startPayload` field (plan Q7); `mathRallySubmission` joins the allowlist |
| F10 | The app's sound setting is `GameFeedback.isSoundEnabled()` / `setSoundEnabled()` over `SharedPreferences` key `sound_enabled` (`lib/game/framework/game_feedback.dart`). There is no app-level reduced-motion setting | The app passes `isSoundEnabled()` and the OS flag `MediaQuery.disableAnimationsOf(context)` at `init`, and stores sound changes with `setSoundEnabled` |
| F11 | `services/leaderboard` has no dependency on `@memory-game/shared` | Leaderboard bounds are literals (plan Q11) |
| F12 | `metricsPublisher` methods catch and log their own failures (`services/game/src/utils/metrics.ts`) | The new rejection metric cannot change a response |

---

## 2. Component Map

```text
packages/shared/src/math-rally/        S1-S6  pure race core (no dependencies)
packages/shared/src/constants/         S7     free-difficulty exception and gate
apps/web/src/games/math-rally/         G1-G17 game core (Phaser), bridge, embed entry
apps/web/src/pages/math-rally/         H1-H3  setup page, lazy game page and host hook
apps/web/src/(api|utils|components|..) H4-H10 API, funnel, registries, hub, tests
services/game/src/                     B1-B10 start branch, completion exit, score, gate wiring
services/leaderboard/src/              L1     game type and window
scripts/                               D1     seed and verify scripts
apps/mobile/                           A1-A9  screens, bridge, asset server, session, registry
apps/web/ (build tooling)              T1     embed build config and script
```

Dependencies and data flows are in `math-kart-component-dependency.md`; signatures in `math-kart-component-methods.md`; orchestration and error handling in `math-kart-services.md`.

---

## 3. Components

### 3.1 Shared race core - `packages/shared/src/math-rally/` (unit MR2)

| Id | Component (file) | Responsibility |
|---|---|---|
| S1 | RaceConstants and TrackLayout (`constants.ts`, `track.ts`) | Section 4.0 table (paths, forks, reading windows per difficulty); world-unit distances (approach, branch, merge, gap, finish); speeds (cruise, maximum = boost, slow factor); effect durations; derived per-fork distances; `minForkTimesMs`, `minFinishTimeMs`, `nominalRaceSeconds`; timing tolerance. Single source for the game (kinematics, layout) and the server (FR-MK-30, score reference time) |
| S2 | SeededRng (`rng.ts`) | Deterministic 32-bit generator (mulberry32) with `nextInt`, `pick`, `shuffle`. No `Math.random`, no clock (FR-MK-18) |
| S3 | QuestionGenerator (`questions.ts`) | Question kinds per difficulty (FR-MK-13 table), operand ranges, exact answers as whole numbers or reduced fractions; prompts are data (`kind`, `operands`), never text (FR-MK-19) |
| S4 | DistractorBuilder (`distractors.ts`) | Mistake rules (off by 1 or 2, off by 10, neighbour product, wrong operation, swapped digits, sign error, fraction numerator-plus-denominator), range and length filters (at most 4 characters, no negatives below difficulty 4), random fill when rules run out (FR-MK-14, FR-MK-15) |
| S5 | RaceBuilder (`race.ts`) | `buildRace(seed, difficulty)`: N distinct questions, options with the correct position balanced (no run longer than 3), answer key; `toRacePayload` (FR-MK-16, FR-MK-17, FR-MK-26) |
| S6 | Types (`types.ts`, `index.ts`) | `MathRallyDifficulty`, `MathRallyQuestion`, `MathRallyRacePayload`, `MathRallyGameRecord`, `MathRallySubmission`; exported from `packages/shared/src/index.ts` (additive) |
| S7 | FreeTierGate (`constants/paid-games.ts`) | `FREE_DIFFICULTIES_IN_PAID_GAMES` (`MATH_RALLY`: `[1]`) and `isBlockedForFreeTier(themeId, difficulty, paidIds?, exceptions?)` (FR-MK-55). Inert while `MATH_RALLY` is absent from `PAID_GAME_THEME_IDS` |

### 3.2 Game core - `apps/web/src/games/math-rally/` (units MR1 and MR4)

Phaser names below follow the Phaser 3 API (Scene, Graphics, Image, Text, Loader, Scale Manager, Keyboard plugin, Sound manager). Their Phaser 4 equivalents are confirmed in MR1 (U1); a missing capability is a gate finding, not a silent workaround.

| Id | Component (file) | Unit | Responsibility |
|---|---|---|---|
| G1 | EngineFacade (`MathRallyEngine.ts`) | MR1 | `mount(parent, channel, options)` creates the single Phaser game and returns a handle whose `destroy()` stops audio, removes listeners and the canvas and releases the WebGL context (`WEBGL_lose_context`). A module-level guard destroys any previous instance first. Also creates a visually hidden `aria-live="polite"` element inside the parent, which G9 fills with the current prompt and options as plain text (FR-MK-43, NFR-MK-5, NFR-MK-7) |
| G2 | BootScene (`phaser/scenes/BootScene.ts`) | MR4 | Loads atlases, sounds and the font from `options.assetBaseUrl`; on any load error sends `error{ASSET_LOAD_FAILED}`; when done sends `ready` (FR-MK-25) |
| G3 | RaceScene (`phaser/scenes/RaceScene.ts`) | MR1 | Per frame: advances G5, asks G4 to draw road and sprites, positions the kart and its lean, boost flame, bumpy-branch shake (skipped in reduced motion) |
| G4 | RoadRenderer (`phaser/render/RoadRenderer.ts`, `core/projection.ts`) | MR1 | Segment projection (`core/projection.ts` is pure math); draws grass, rumble strips, road and lane lines as quads into one Graphics object, fork branches as P strips with lateral offsets, sky and hill layers as parallax images; sprite pool for trees and signs, scaled far-to-near; 2-to-1 merge of distant segments |
| G5 | TrackRuntime (`core/trackRuntime.ts`) | MR1 | Pure kinematics: position along the track, speed (accelerate to cruise, boost to maximum, slow factor), frame delta capped at 50 ms so the kart can never travel faster than the maximum speed in real time; emits "question start", "decision line", "merge", "finish" events from S1 distances |
| G6 | ForkController (`core/forkController.ts`) | MR4 | Current question index; at each decision line reads the lane from G7, records choice and fork time from G10, decides right or wrong from the payload's `correctIndex`, counts coins, triggers boost or slowdown and the feedback text (FR-MK-6 to FR-MK-12) |
| G7 | LaneModel (`core/lanes.ts`) | MR1 | Pure: lane count, current lane, `left()`/`right()` clamped at the edges, re-placement to the nearest valid lane when the count changes (FR-MK-9) |
| G8 | InputLayer (`phaser/input/KeyboardInput.ts`, `phaser/input/TouchJoystick.ts`, `core/joystick.ts`) | MR1 | Keyboard: arrows and A/D to lane actions, P and Escape to pause, arrow keys captured so the page does not scroll; touch joystick view at the bottom centre with the pure threshold-and-repeat model in `core/joystick.ts`; no input during the countdown (FR-MK-3, FR-MK-20, FR-MK-21) |
| G9 | HudScene (`phaser/scenes/HudScene.ts`) | MR1 basic, MR4 full | Top bar (pause button, fork k / N, coins, time), question banner, lane answer chips near the kart with the current lane marked by shape and border, feedback icon and text, countdown, finish celebration (static in reduced motion), pause menu (Resume, Sound, Quit with confirmation) (FR-MK-22, FR-MK-23, NFR-MK-6) |
| G10 | RaceClock (`core/raceClock.ts`) | MR1 | Pure, injected time source: starts at "Go", excludes paused time, reports elapsed and fork-crossing times in integer milliseconds (FR-MK-5) |
| G11 | QualityGovernor (`core/quality.ts`) | MR1 | Two profiles (draw distance, render scale, roadside density); one-way drop to low when the median frame time of the first 120 running frames exceeds 20 ms (plan Q15) |
| G12 | SoundBank (`phaser/audio/SoundBank.ts`) | MR4 | Chime, error buzz, coin, boost, countdown, finish; optional music only if within budget; respects the sound flag; starts after the first input (browser autoplay rules) |
| G13 | GameText (`i18n/gameText.ts`, `locales/{en,es,pt}.json`) | MR4 | Prompt templates per question kind, reveal text ("7 x 8 = 56"), HUD, pause menu, countdown, friendly feedback words; operands formatted the same in all languages (FR-MK-19, NFR-MK-9, NFR-MK-21) |
| G14 | Protocol (`bridge/protocol.ts`, `bridge/__fixtures__/messages.json`) | MR4 | Message types, envelope `{ v: 1, type, ... }`, validators with a 16 KB limit, race payload validator; fixture file shared with the Dart tests (FR-MK-49) |
| G15 | HostChannel (`bridge/hostChannel.ts`) | MR1 basic, MR4 full | Interface `send` / `onMessage`; `DirectChannel` for the React host (in memory, still validated) and `WebViewChannel` for the app (`window.flutter_inappwebview.callHandler('mathRally', json)` out, `window.__mathRallyReceive(json)` in) |
| G16 | EmbedEntry (`embed/main.ts`, `embed/index.html`) | MR1 spike, MR5 final | App-bundle entry: restrictive CSP meta tag, root element, waits for the WebView bridge to be ready, mounts G1 with `WebViewChannel` and `assetBaseUrl: './'`, build id from `__MATH_RALLY_BUILD_ID__` |
| G17 | DevFrameOverlay (`dev/frameOverlay.ts`) | MR1 | Frame-time overlay and CSV export for the gate; compiled only when `import.meta.env.DEV` or the gate build flag is set; absent from production and app release bundles (NFR-MK-1) |

### 3.3 Web host - `apps/web/src/` (unit MR4)

| Id | Component (file) | Responsibility |
|---|---|---|
| H1 | MathRallySetupPage (`pages/math-rally/MathRallySetupPage.tsx`) | Four difficulty cards with path counts; lock state from H3; "How to play" (keys and joystick, plus the screen-reader limitation); Start navigates to `/math-rally/game?difficulty=<name>`; prefetches the game chunk on mount (FR-MK-40, NFR-MK-4) |
| H2 | MathRallyGamePage and host hook (`pages/math-rally/MathRallyGamePage.tsx`, `pages/math-rally/useMathRallyHost.ts`) | Lazy route. Parses `difficulty`; mounts G1 in a `touch-action: none` container; host state machine (Section 2 of `math-kart-services.md`); calls H4; shows `ScoreBreakdownModal`; pauses on `visibilitychange`; reads and writes the sound preference through `services/presentationPreferences.ts` (FR-MK-25, FR-MK-41 to FR-MK-44, FR-MK-50, NFR-MK-7) |
| H3 | Level lock rule (`pages/math-rally/levelLocks.ts`) | Pure: `lockState(difficulty, { tier, gameIsPaid, freeDifficulties })` returns `playable` or `lockedPaid` (FR-MK-56) |
| H4 | API additions (`api/game.ts`) | `START_MATH_RALLY_GAME` document (operation `StartGame`), `startMathRallyGame()` sharing the quest helper with `startGame()`; `CompleteGameInput.mathRallySubmission`; result types (FR-MK-43, FR-MK-52) |
| H5 | Shared funnel (`games/math-rally/shared.ts`) | The only `apps/web` module that names `packages/shared/src/math-rally/*` (per-file imports, no `zod`), same pattern as `utils/questShared.ts`. Used by the game core and by the setup page (path counts from `RACE_PARAMS`); it imports no Phaser, so the setup page stays light |
| H6 | Registries and locales | Entries in every web registry of `math-kart-delta-notes.md` Section 2 (routes, `GAME_FILTER_MAP`, leaderboard enum and filter, display maps, `games.math-rally.*`, `mathRally.*`) (FR-MK-35, FR-MK-36) |
| H7 | Partly-free hub presentation (`components/hub/GameTile.tsx`, `pages/hub/GameHubPage.tsx`) | `FREE_DIFFICULTIES_IN_PREMIUM_GAMES` copy keyed by catalog id, next to the existing `PREMIUM_GAMES` copy and checked against S7 by H9; tile badge "Paid" plus "Easy is free" note; no subscription redirect for partly-free games (FR-MK-56) |
| H8 | Routes (`config/constants.ts`, `App.tsx`) | `ROUTES.MATH_RALLY_SETUP`, `ROUTES.MATH_RALLY_GAME`; the game route is `React.lazy` inside `Suspense`; the dev-only slice route exists only under `import.meta.env.DEV` (MR1) |
| H9 | Consistency test (`__tests__/mathRallyRegistry.test.ts`) | Raw-text checks over web and backend registries, paid lists and free-difficulty copies, with a mutation suite (FR-MK-37) |
| H10 | Credits manifest (`public/games/math-rally/CREDITS.json`) and manifest test | Source, licence and URL per asset file; the test fails for any file under `public/games/math-rally/` without an entry (NFR-MK-20) |

### 3.4 Backend - `services/game/src/`, `services/leaderboard/src/`, `scripts/` (unit MR3)

| Id | Component (file) | Responsibility |
|---|---|---|
| B1 | Start branch (`services/game.service.ts`) | For `MATH_RALLY`: rejects difficulty outside 1 to 4 before any allowance check; draws a seed with `crypto.randomInt`; builds the race with S5 before `checkLimit`; stores the record on `create`; returns `mathRally` payload (FR-MK-26) |
| B2 | Completion exit (`services/game.service.ts`, `completeMathRallyGame`) | Record check, bounded validation (B3), timing floors (S1), correct count from the stored key, score (B4), update, achievements (non-blocking), metrics, event with server counts, cache invalidation, `finalizeQuest`; every rejection generic, nothing written (FR-MK-27 to FR-MK-33) |
| B3 | Submission validator (`utils/math-rally-validation.ts`) | Strict `zod` schema plus record-dependent bounds; returns `{ ok, value }` like `utils/circuit-validation.ts` (FR-MK-28) |
| B4 | Score breakdown (`services/score-calculator.service.ts`, `calculateMathRallyBreakdown`) | Base by difficulty x multiplier x time factor (0.9 to 1.1) x accuracy factor (0.5 + accuracy); cap 6000 or 8000 from paid membership and difficulty (FR-MK-32) |
| B5 | Constants (`utils/math-rally.ts`) | `MATH_RALLY_THEME_ID` re-export, rejection message, score constants (base per difficulty, time weight, factor bounds); Functional Design fixes the numbers |
| B6 | Handler mapping (`handlers/game.handler.ts`) | Adds `mathRally` to the start response only when present; `mathRallySubmission` passes through as `unknown` (`utils/validation.ts`) |
| B7 | Types and repository (`types/index.ts`, `repositories/game.repository.ts`, `packages/shared/src/types/entities.ts`) | `mathRally` on `StartGameResponse`, `CompleteGameInput.mathRallySubmission?: unknown`, optional `Game.mathRally`; `create` persists it |
| B8 | Rejection metric (`utils/metrics.ts`) | `publishMathRallyRejected(stage)`: metric `MathRallySubmissionRejected`, dimension `Stage` (NFR-MK-26) |
| B9 | Review list (`services/review.service.ts`) | Adds `MATH_RALLY` |
| B10 | Paid gate wiring (`services/game.service.ts`) | The paid-game condition calls S7 `isBlockedForFreeTier`; the difficulty-4 gate is unchanged (FR-MK-55) |
| L1 | Leaderboard (`services/leaderboard/src/types/index.ts`, `services/scoring.service.ts`) | `GameType.MATH_RALLY`; added to the standard group in `calculateScore`; dedicated `mathRally` config with validation 1 to 3600 s and score 0 to 8000 (FR-MK-38) |
| D1 | Seed and verify scripts (`scripts/seed-math-rally.sh`, `scripts/verify-math-rally-seed.sh`) | Circuit Builder pattern: DEV default, exact `--prod` with `--profile dashden-new`, typed confirmation, idempotent theme and catalog rows, read-only verify with distinct exit codes, production order warning (FR-MK-39) |

### 3.5 App host - `apps/mobile/` (unit MR5)

| Id | Component (file) | Responsibility |
|---|---|---|
| A1 | MathRallySetupScreen (`lib/ui/screens/games/math_rally_screens.dart`) | Native difficulty picker in the existing setup style; lock state from A9; how-to-play card (FR-MK-45, FR-MK-56) |
| A2 | MathRallyPlayScreen (same file) | Hosts the WebView through all phases until the result; drives the session controller; lifecycle observer (background pauses), Android Back (pause, then confirm leave); generic error and "update the app" overlays; result through `GameResultScreen` (FR-MK-45, FR-MK-47, FR-MK-48, FR-MK-50) |
| A3 | MathRallyBridge and WebViewPort (`lib/game/math_rally/bridge.dart`) | Sends host messages (built only from allowlisted fields, never a token or user detail), receives and validates game messages; `WebViewPort` interface so tests run without a WebView (FR-MK-47, FR-MK-49) |
| A4 | Protocol (`lib/game/math_rally/protocol.dart`) | Dart message types and validators mirroring G14; reads the shared fixture in tests; supported protocol versions `{1}` |
| A5 | GameAssetServer (`lib/game/math_rally/asset_server.dart`) | Android: `WebViewAssetLoader` with an assets path handler on `https://appassets.androidplatform.net/`; iOS: custom scheme `dashden-game://app/` answered from `rootBundle` with an allowlist under `assets/math_rally/`, MIME types by extension, `..` rejected; navigation to any other origin cancelled; WebView hardening settings (FR-MK-46, NFR-MK-18) |
| A6 | Session additions (`lib/api/game_api.dart`, `lib/api/game_models.dart`, `lib/game/framework/game_session.dart`, `lib/game/math_rally/math_rally_session.dart`) | Second `StartGame` document with `mathRally`; `StartGameResult.mathRally` (raw map); optional `requestMathRallyRace` flag and `GameSessionState.startPayload`; `mathRallySessionProvider`; `mathRallySubmission` in `completeExtraKeys` (plan Q7) |
| A7 | Registry, display, routes, paid copy, hub (`lib/game/game_registry.dart`, `lib/stats/game_meta.dart`, `lib/ui/router.dart`, `lib/config/paid_games.dart`, `lib/game/hub_logic.dart`) | `math-rally` entry (Science & Math, `MATH_RALLY`); meta icon and colour; `/math-rally/setup` and `/math-rally/play` with `quest` parsing; `kFreeDifficultiesInPaidGames`; partly-free tile playable with a paid badge (FR-MK-36, FR-MK-52, FR-MK-56) |
| A8 | Bundled game (`assets/math_rally/**`, `pubspec.yaml` asset entries) | Output of T1, committed with `build-info.json`; each asset subfolder listed in `pubspec.yaml` (Flutter asset folders are not recursive) (FR-MK-46, FR-MK-51) |
| A9 | Level lock rule (`lib/game/math_rally/level_locks.dart`) | Same rule as H3, in Dart |

### 3.6 Build tooling (units MR1 and MR5)

| Id | Component (file) | Responsibility |
|---|---|---|
| T1 | Embed build (`apps/web/vite.math-rally-embed.config.ts`, `apps/web/scripts/build-math-rally-embed.mjs`) | Vite library mode, format `iife`, one `math-rally.js`, no source maps, `define` of the build id (`git rev-parse --short HEAD`, plus `-dirty` when the tree has changes); copies `embed/index.html`, `public/games/math-rally/**` and writes `build-info.json` into `apps/mobile/assets/math_rally/`; fails with a non-zero exit if the output exceeds the NFR-MK-3 app budget (FR-MK-51, NFR-MK-3) |

---

## 4. Data Decisions

- **Start payload** (`startGame` response field `mathRally`, only for `MATH_RALLY`): `{ protocolVersion: 1, difficulty, forks, paths, readSeconds, questions: [{ kind, operands, options, correctIndex }] }`. `correctIndex` is sent on purpose (instant feedback; stated limit NFR-MK-13).
- **Game record attribute** `mathRally` on `memory-game-games-{env}`: `{ seed, generatorVersion, paths, forks, key }`. `key` has N integers. It is not personal data and stays on the record after completion so a completed race can be audited; choices are never stored (NFR-MK-19). No new table, no new index, no new environment variable.
- **Submission** (`completeGame` input `mathRallySubmission`): `{ choices: int[N], forkTimesMs: int[N] }` plus the top-level `completionTime` (seconds) and `attempts` (N). The server ignores `correctAnswers`, `totalQuestions` and `score` for this game.
- **Stored on completion**: `status`, `completedAt`, `completionTime`, `attempts` (N), `score`. Correct count travels in the GameCompleted event only.
- **Message envelope**: JSON text, at most 16 KB, `{ "v": 1, "type": "<name>", ... }`. The full list and field rules are in `math-kart-component-methods.md` Section 4.
- **Seeds**: server seeds come from `crypto.randomInt(0, 2 ** 32)`; offline app races use a seed from `Random.secure()` in Dart, passed in `init`.
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
| FR-MK-10 to 12 | G5, G6, G9, G12, S1 |
| FR-MK-13 to 18 | S2 to S5 |
| FR-MK-19 | S3, G13 |
| FR-MK-20, 21 | G8 |
| FR-MK-22 | G9, G10, H2, A2 |
| FR-MK-23 | G9 |
| FR-MK-24 | G9, H2, A2 |
| FR-MK-25 | G2, H2, A2 |
| FR-MK-26 | B1, S5, B6, B7 |
| FR-MK-27 to 31 | B2, B3, S1, B8 |
| FR-MK-32 | B4, B5 |
| FR-MK-33 | B2 |
| FR-MK-34 | B1, B2, B10 |
| FR-MK-35, 36 | H6, H8, B9, L1, A7, D1 |
| FR-MK-37 | H9, A7 (paid-list parity test) |
| FR-MK-38 | L1 |
| FR-MK-39 | D1 |
| FR-MK-40 | H1, H3 |
| FR-MK-41 | H8, T1 (no impact on the web build), H1 (prefetch only from setup) |
| FR-MK-42 | G1 to G16 (no React, Flutter or network imports; import check in MR4) |
| FR-MK-43, 44 | G1, H2 |
| FR-MK-45 | A1, A2, A7 |
| FR-MK-46 | A5, A8, G16 |
| FR-MK-47 | A2, A3, A6 |
| FR-MK-48 | A2 |
| FR-MK-49 | G14, G15, A3, A4 |
| FR-MK-50 | A2, A6, H2 |
| FR-MK-51 | T1, A8, G16 |
| FR-MK-52 | H4, A7, B2 |
| FR-MK-53 | S7 (launch lists), H7, A7 |
| FR-MK-54 | Checklist in Build and Test (Section 8 of `math-kart-execution-plan.md`) |
| FR-MK-55 | S7, B10 |
| FR-MK-56 | H3, H7, A7, A9 |
| NFR-MK-1, 2 | G4, G11, G17 |
| NFR-MK-3, 4, 5 | H8, T1, G1, G2 |
| NFR-MK-6 | G9 (lane chips) |
| NFR-MK-7, 8 | G1 and G9 (live region), G3, G9, H2 and A2 (reduced-motion flag) |
| NFR-MK-9, 10 | G13, G2 (font) |
| NFR-MK-11 to 15 | B2, B3, G14, A4, A3 |
| NFR-MK-16 | T1, A8 (pins and audits recorded at MR1 and MR5) |
| NFR-MK-17, 18 | G16, A5, H2 |
| NFR-MK-19 to 21 | B2 (no choices stored), H10, G13 |
| NFR-MK-22 | Section 6 of `math-kart-services.md` |
| NFR-MK-23 | B6 (additive mapping), A7 (older apps) |
| NFR-MK-24 | G1 (WebGL check), H2 (fallback message) |
| NFR-MK-25 | Section 0 |
| NFR-MK-26 | B8 |

Every FR-MK-1 to FR-MK-56 has at least one component.

---

## 6. Refinements of the Requirements Made Here

| Item | Requirement text | Design | Why |
|---|---|---|---|
| R-D1 | NFR-MK-9, Q33: one namespace in the main locale files | Host strings there; in-race strings in `games/math-rally/locales/` (requirements updated) | F5: the main files are in the entry chunk (NFR-MK-3) |
| R-D2 | NFR-MK-17: app page `connect-src 'none'` | `connect-src 'self'` (requirements and MK-21 updated) | The Phaser loader fetches atlases and sounds with XHR from its own origin |
| R-D3 | Q18 wording: leaderboard minimum "from the server's minimum plausible race" | 1 s minimum | F11; AC-38.1 still holds |
| R-D4 | FR-MK-49 lists `pauseChanged` without fields | `pauseChanged { paused, sound }` carries the sound toggle so the host can store it | Keeps the message list of FR-MK-49 unchanged |
| R-D5 | FR-MK-50 web: "anything else back to the hub" | A paid-required refusal goes to the subscription page with `premiumRequired` (existing pattern), other failures to the hub | FR-MK-56 asks for the existing upgrade path |

---

## 7. Security Baseline Compliance (new design)

| Rule | Status | Basis |
|---|---|---|
| SECURITY-01 | N/A for new stores | No new store; one attribute on the existing games table (existing encryption) |
| SECURITY-02 | N/A | No new gateway, load balancer or CDN |
| SECURITY-03 | Compliant | B2 and B8 log ids, difficulty, counts, score and stage only; never choices, key, seed, token, email or username. Host logs carry error classes only; the app logs only in debug builds |
| SECURITY-04 | Compliant for new code; pre-existing Report-Only CSP remains | Game works without `unsafe-eval` or inline script; at most a narrow `blob:` in `img-src` (F6); app page carries its own `'self'`-only CSP (G16) |
| SECURITY-05 | Compliant | B3 strict schema with sizes; G14 and A4 validators with a 16 KB limit; race payload validated by the game; iOS scheme handler path allowlist (A5); web query parameters allowlisted (H2) |
| SECURITY-06 | N/A | No IAM change |
| SECURITY-07 | N/A | No network change |
| SECURITY-08 | Compliant | `userId` from the verified JWT; ownership and status checks reused; free-tier decisions only on the server (B10, S7); the WebView never holds a token (A3); CORS unchanged |
| SECURITY-09 | Compliant | Generic errors in every host; release WebView with debugging and file access off, external navigation and pop-ups refused (A5); dev overlay absent from production (G17); no source maps in the app bundle (T1) |
| SECURITY-10 | Compliant for new dependencies; SBOM is pre-existing debt | Phaser and `flutter_inappwebview` pinned exactly with lockfiles; `npm audit` and `flutter pub outdated` recorded at MR1 and MR5; licences recorded; no CDN |
| SECURITY-11 | Compliant, with stated limit | Security logic isolated in S7, B2, B3. Misuse cases: invented answers, unissued questions, impossible speed, replayed completion, probing which check failed, tampered bridge messages, FREE user at a paid difficulty, path traversal in the iOS scheme handler. Rate limiting: existing per-user daily allowance plus API Gateway. Stated limit: a script can play perfectly and then scores like a perfect human (NFR-MK-13) |
| SECURITY-12 | N/A | No authentication change |
| SECURITY-13 | Compliant | No CDN loads; bundle ships inside the signed app; messages parsed with `JSON.parse` / `jsonDecode` then validated against allowlists (no object revival); completed games are auditable through the stored key and the GameCompleted event |
| SECURITY-14 | N/A for new code; pre-existing gaps remain | Rejection metric makes a later alarm possible; no alarm added |
| SECURITY-15 | Compliant | Every external call has explicit handling (tables in `math-kart-services.md` Section 5); access checks fail closed; engine teardown in `finally` paths; the global React error boundary stays |

No blocking finding.

---

## 8. Unverified Assumptions Carried Into Construction

| Id | Assumption | Where it is resolved | If false |
|---|---|---|---|
| U1 | A stable Phaser 4 on npm with Scene, Graphics, Image, Text, Loader, Scale, Keyboard and Sound equivalents | MR1 step 1 | Owner decides (stay on Phaser 3.x latest, or wait) |
| U3 | Phaser 4 gzip size fits 450 KB with the game | MR1 build report | Custom build, lighter assets (Q27 B) |
| U4 | Canvas renderer fallback without WebGL | MR1 | FR-MK-44 message only |
| U5 | `blob:` image URLs or an `HTMLImageElement` load option | MR1 under an enforced local CSP | Narrow `img-src blob:` |
| U6 | `flutter_inappwebview` supports `WebViewAssetLoader`, an iOS custom scheme handler, JS handlers and the hardening settings on the app's minimum OS versions | MR1 spike | Stop; owner decides |
| U7 | WebGL in the Android System WebView and WKWebView reaches the gate | MR1 gate | Levers, then owner (Q29) |
| U15 | Vite JSON named imports keep the game locale files out of the entry chunk | MR4 bundle report | Load game strings with a dynamic `import()` inside the chunk |
| U16 | CSP `'self'` matches a custom-scheme origin in WKWebView | MR1 spike | List `dashden-game:` explicitly |
| U17 | Vercel serves `public/games/math-rally/**` as static files before the SPA rewrite in `vercel.json` | MR4 preview deploy check | Exclude the folder from the rewrite pattern |

The other assumptions of requirements Section 10 are resolved at these points: U2 (template pattern only; no template code is copied unless its licence is recorded) at MR1 start; U8 (CC0 licences) per file at download; U9 (Vercel resolves `packages/shared`) at the MR4 preview deploy; U10 (reference Android phone) before MR1 measurement; U11 (store policies) at the first MR5 submission; U12 (race length, load time) by the MR1 and MR4 measurements; U13 (Flutter on Windows) at MR5 start; U14 (production tables) by pre-launch check PL6.
