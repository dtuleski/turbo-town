# Math Rally - Application Design and Units Plan

**Created**: 2026-11-25
**Stage**: INCEPTION - Application Design and Units Generation (planning for both, combined as for Quest Map)
**Basis**: `../requirements/math-kart-requirements.md` (FR-MK-1 to FR-MK-56, NFR-MK-1 to NFR-MK-26), `../user-stories/math-kart-stories.md` (MK-1 to MK-28), `../reverse-engineering/math-kart-delta-notes.md`, plus code read for this stage at `c6ccf0f` (cited in the design files)
**Name**: the game is "Math Rally" (owner answer Q22). Files keep the `math-kart-` prefix for this inception run; Construction renames them first (`math-kart-execution-plan.md` Section 8).
**Answers**: delegated by the owner. Every `[Answer]:` holds a recommendation marked **Recommended (pending owner approval)** with the evidence behind it. Changing a letter means revisiting the linked design section.

---

## Section A: Design Questions

## Question 1
Where does the game code (Phaser scenes, renderer, rules) live?

A) Inside `apps/web/src/games/math-rally/`, with Phaser as an `apps/web` dependency; the app bundle is a second build of the same folder
B) A new package `packages/math-rally-game` with its own `package.json` and Phaser dependency, imported by `apps/web`
C) A separate Vite app `apps/math-rally`
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). `apps/web` imports outside its folder only through relative funnel modules (`utils/questShared.ts`, `utils/circuitEngine.ts`), and those modules warn that bare package imports from outside `apps/web` may not resolve on Vercel. With B or C, `import 'phaser'` inside the other package would resolve from that package's `node_modules`, which the Vercel build may not install. A keeps one Phaser install, one lockfile and one test runner (Vitest). The pure shared parts (generator, constants) still live in `packages/shared` and enter through a funnel module.

## Question 2
How is the app's bundled copy of the game built?

A) A second Vite config in `apps/web` (`vite.math-rally-embed.config.ts`) in library mode with one classic IIFE script, a hand-written `index.html`, and the game assets copied next to it, produced by `scripts/build-math-rally-embed.mjs`
B) The normal web build output (ES module chunks loaded by `<script type="module">`)
C) A separate bundler (esbuild or Rollup) config
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). One classic script needs no module loading, so it does not depend on how each WebView treats module scripts and cross-origin rules on an app-internal origin (unverified, U6). Vite is already the build tool. Assets are loaded by the Phaser loader from a relative folder instead of being imported into JS, because Vite library mode inlines imported assets as base64 (about one third larger). B would ship hashed chunk names that change every build and depend on module-script support on a custom scheme.

## Question 3
Is the built app bundle committed to the repository?

A) Yes, under `apps/mobile/assets/math_rally/`, with a `build-info.json` holding the protocol version and source commit
B) No; it is git-ignored and every app build runs the web build first
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). iOS builds run only on the owner's Mac; A lets `flutter build` work from a checkout without Node or `npm ci` in `apps/web`, and the app ships exactly the bundle that was tested. Drift is controlled by the build id (FR-MK-51), a Dart test that the bundle's protocol version is one the app supports, and a release checklist step "rebuild and commit the bundle". Cost: about 2 MB of binary assets in git, stored twice (web `public/` and app `assets/`).

## Question 4
How is the pseudo-3D road drawn in Phaser?

A) Segment projection (road split into fixed-length segments, each projected toward the horizon every frame) drawn as filled quads into one Graphics object per frame, with pooled, scaled Image sprites for roadside objects and signs, far-to-near; distant segments merged 2 to 1 (level of detail)
B) A 3D mesh or a 3D plugin
C) Pre-rendered frames or video for the road
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). It needs only filled polygons and scaled sprites, which every Phaser version offers (owner answer Q1 excludes real 3D). The technique is well known from OutRun-style JavaScript racers drawn on a plain 2D canvas. The cost on a phone is not known (no device test was possible), so MR1 measures it against the gate and has named levers: draw distance, render scale, level of detail, and a custom vertex batch in place of Graphics if tessellation is the bottleneck.

## Question 5
How is the fork drawn?

A) Real branches: before the decision line the road has one lane per path; at the line it splits into P road strips whose lateral offset grows (grass medians appear between them) and later shrinks back to zero at the merge
B) Painted lanes only: the road never splits; lanes are divided by lines and the signs stand over the lanes
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). The owner asked for a "bifurcation" with one answer per path; physical branches make the choice readable and dramatic. Rendering cost only rises inside the fork zone (P strips for about a third of the visible road). B is the documented fallback lever if the gate fails, chosen by the owner (Q29).

## Question 6
Which Flutter WebView plugin is used?

A) `flutter_inappwebview` 6.x, pinned exactly, for its Android `WebViewAssetLoader` support, iOS custom-scheme handler, and JavaScript handler channel
B) `webview_flutter` (the Flutter team's plugin)
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Q23 needs an app-internal origin, not `file://`. As far as known without web access, `webview_flutter` loads Flutter assets through `file://` URLs on Android (rejected in Q23 B). The `flutter_inappwebview` features named in A are **unverified** (U6); the MR1 spike confirms each on Android and iOS before MR5 starts. If one is missing, the spike stops and the owner decides (no silent swap to another plugin or to a localhost server).

## Question 7
How does the app's play screen get the race payload from `startGame`?

A) Reuse `GameSessionController`: an optional constructor flag asks `GameApi.startGame` for the Math Rally selection set, and the state carries the raw start payload; a dedicated provider builds the controller for Math Rally only
B) A new controller copied from `GameSessionController`
C) The screen calls `GameApi` directly without a session controller
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). The controller already owns the rules FR-MK-47 and FR-MK-50 need (blocked for rate limit, paywall and quest, offline round, recoverable submit with `completeOrRecover`, quest result). A is additive: existing games keep using `gameSessionProvider` unchanged. B duplicates those rules; C loses them.

## Question 8
How does the web ask the server for the race?

A) A second GraphQL document in `api/game.ts` with the same operation name `StartGame` plus a `mathRally` selection, exposed as `startMathRallyGame()`, sharing the quest handling of `startGame()` through one internal helper
B) Add `mathRally` to the shared `START_GAME` selection set used by every game
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). The Game Service routes by operation name and returns the whole object regardless of selection (`game.handler.ts`, `extractOperationName`, `routeOperation`), so a second document needs no server change. B would make Apollo look for a field that 20 other games never receive. Sharing one helper keeps the Quest Map rule R1 for Math Rally.

## Question 9
How are bridge messages validated?

A) Hand-written validators on both sides (TypeScript in the game, Dart in the app) against one written contract, with one JSON fixture file of valid and invalid messages that both test suites read
B) `zod` in the game and hand-written Dart
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). The contract is small (9 message types). A keeps `zod` out of the game bundle (NFR-MK-3) and the shared fixture catches drift between the two validators.

## Question 10
Where is the per-difficulty free gate of FR-MK-55 implemented?

A) A constant and a pure function in `packages/shared/src/constants/paid-games.ts`, called by `GameService.startGame`; web and app keep copies of the constant for presentation, checked by tests
B) Inline in `GameService.startGame`
C) A DynamoDB configuration row read at every start
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). It sits next to `PAID_GAME_THEME_IDS`, is testable with injected lists (so the post-switch behaviour is tested while the game is still free), and keeps security logic in one module (SECURITY-11). C adds a read to every start and an admin path.

## Question 11
What completion-time window does the leaderboard use for `MATH_RALLY`?

A) 1 to 3600 s, score 0 to 8000, like Circuit Builder's dedicated entry
B) The per-difficulty minimum race time from the shared constants up to 3600 s
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). `services/leaderboard` does not depend on `@memory-game/shared` (its `package.json` has no such entry), so B would copy numbers that can drift and silently drop events. The Game Service already rejects impossible races (FR-MK-30), so the leaderboard window only has to never reject what the Game Service emits. This refines the Q18 wording ("from the server's minimum plausible race") while meeting AC-38.1.

## Question 12
How many units?

A) Five: MR1 vertical slice and performance gate, MR2 shared race core, MR3 backend, MR4 web game and host, MR5 app host
B) Three: game, backend, app
C) Seven or more, as for Circuit Builder
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). MR1 tests the two biggest unknowns (feel and phone performance) before anything else is spent (Q38). MR2 and MR3 are Lambda deploy trigger paths, so isolating them keeps production-affecting merges small. MR5 is separate because iOS checks depend on the owner's Mac.

## Question 13
Does the vertical slice reach production?

A) No. The slice runs on a development-only route (`import.meta.env.DEV`) and through `vite preview` on the local network for phones; the app spike runs a debug-only screen on a spike branch that is not merged
B) Yes, on a hidden production route
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Nothing unfinished becomes reachable on dashden.app, and no debug WebView settings can reach a release build.

## Question 14
How is text drawn inside the canvas?

A) Phaser Text objects with one bundled open-licence font (Fredoka, SIL OFL 1.1, licence checked at download), each text rendered to a texture once and then scaled as an image
B) Bitmap fonts
C) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). Localised prompts in three languages are easiest as real text; signs are at most 4 characters, so per-sign textures are cheap. B is a performance fallback.

## Question 15
How does the game react to a slow device?

A) Two fixed quality profiles (high and low: draw distance, render scale, roadside density). The race starts on high and drops once to low when the median frame time of the first 120 frames exceeds 20 ms
B) One profile only
C) Continuous adaptive quality
D) Other (please describe after [Answer]: tag below)

[Answer]: A - Recommended (pending owner approval). A is one pure, testable rule and a lever the gate may need. C can oscillate and is harder to test. The drop is one-way so the picture does not change back and forth mid-race.

---

## Section B: Ambiguity Analysis

All answers are single letters with a stated reason. Q11 refines the wording of requirement Q18 without changing AC-38.1; this is listed in `math-kart-components.md` Section 6. Q2 and Q3 depend on Q1 = A and are consistent with it. Q6 depends on an unverified plugin capability and has an explicit stop-and-ask rule. No follow-up questions are needed.

---

## Section C: Execution Checklist

### Application Design
- [x] Analyse context: requirements, stories, delta notes; code of the Game Service, Leaderboard, shared package, web API and hub, Flutter session framework, game API, hub logic, router and feedback settings
- [x] Apply the owner answers of 2026-11-25 (Q7, Q20, Q21, Q22) to the requirements, stories and personas, including new FR-MK-55, FR-MK-56 and story MK-28
- [x] Apply design-driven corrections: NFR-MK-9 and Q33 (in-race strings outside the entry chunk), NFR-MK-17 and MK-21 (`connect-src 'self'` in the app page)
- [x] Generate `math-kart-components.md`
- [x] Generate `math-kart-component-methods.md`
- [x] Generate `math-kart-services.md`
- [x] Generate `math-kart-component-dependency.md`
- [x] Generate `math-kart-concept.md` (screen mock)
- [x] Validate completeness: every FR-MK maps to a component (`math-kart-components.md` Section 5)
- [x] Security Baseline compliance summary (`math-kart-components.md` Section 7)

### Units Generation
- [x] Generate `math-kart-unit-of-work.md`
- [x] Generate `math-kart-unit-of-work-dependency.md`
- [x] Generate `math-kart-unit-of-work-story-map.md`
- [x] Validate boundaries and dependencies (no cycles, matrix in the dependency file)
- [x] Assign all 28 stories to a primary unit
- [x] Greenfield code-organisation step: not applicable (brownfield)
