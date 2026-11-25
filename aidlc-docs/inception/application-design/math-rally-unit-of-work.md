# Math Rally - Units of Work

**Created**: 2026-11-25
**Stage**: INCEPTION - Units Generation
**Revision**: iteration 4, after the third design review of 2026-11-25: MR1 builds the fatal-error guard and the gate Fault trigger, confirms Phaser 4's built-in texture keys, default local schemes and loop stop, tests a missing `sys/white.png`, and applies the desktop CSP pass rule with a baseline run; MR4 re-runs that rule with the full game core; MR5 adds the Back fallback test (AC-48.3) and the race-stopped check (AC-48.2). Iteration 3: MR1 runs the slice under the app page policy on desktop, records every `data:` URL and CSP violation at boot and whether the built-in textures are configurable (U20); MR3 passes `mathRallyProtocol` through as `unknown`; MR4 checks the web copy of the update-message text. Iteration 2: MR1 spike and gate steps for the Android composition mode, iOS custom-scheme loading and the app page CSP; MR2 protocol registry, canonical options and shared motion; MR3 protocol check and score without client time; MR4 lazy routes and `ready` timeout; MR5 source-hash bundle check; PL7 reworded, PL8 added. Responses per finding: `math-rally-components.md` Sections 9 and 10.
**Project type**: Brownfield. Units are groupings for development, not new deployable services. Deployables stay the existing Game Service and Leaderboard Lambdas, the Vercel frontend and the Flutter app.
**Basis**: `math-rally-components.md`, `math-rally-stories.md`, plan decisions Q12 and Q13 in `../plans/math-rally-application-design-plan.md`
**Unit ids**: `MR1` to `MR5` (Math Rally). Requirement and story ids keep their `MK` labels.

Verification commands come from each package's `package.json` as read for this stage. Nothing was built or run (documentation-only stage). Whether Flutter and the Android SDK are installed on the Windows machine is not known (U13).

| Unit | One-line scope | Size | Depends on |
|---|---|---|---|
| MR1 | Vertical slice: one playable forked-road race on web and in a spike WebView, measured against the phone performance gate | Large | none |
| MR2 | Shared race core: protocol versions, seeded question generator with canonical options, distractors, motion and expected race times, free-tier gate | Medium | none |
| MR3 | Backend: server-built races with a protocol check, re-scored completion with timing against expected times, score breakdown, per-difficulty gate wiring, leaderboard type, seed scripts | Large | MR2 |
| MR4 | Web game and host: full game content, art and audio, lazy React routes and host, setup page, registries, locales, partly-free hub | Large | MR1 (gate passed), MR2, MR3 contract |
| MR5 | App host: bundled game in a hardened WebView, bridge, native setup and play screens, registry, partly-free hub, source-hash bundle check | Large | MR4, MR3 |

---

## MR1 - Vertical Slice and Performance Gate
- **Packages**: `apps/web` (merged); `apps/mobile` spike on branch `spike/math-rally-webview` (**not merged**)
- **Size**: Large · **Blocks**: MR4 and MR5 until the gate passes or the owner decides
- **Components**: G1 (with the fatal-error guard), G3, G4, G5 (with a local copy of the motion maths), G7, G8, G10, G11, G15 (DirectChannel), G16 (with `embed/pageGuard.ts`) and T1 (spike level), G17; basic G9 and G6 behaviour

**Scope**
1. Pin Phaser 4 exactly; record version, licence and gzip size in the unit report (resolves U1, U3). Confirm and record, updating the literals in `core/engineConfig.ts` where they differ: the default `loader.localScheme` list (Phaser 3: `['file://', 'capacitor://']`, U19), the built-in texture keys (Phaser 3: `__DEFAULT`, `__MISSING`, `__WHITE`, U20), and the loop stop and sound stop-all methods the guard calls (Phaser 3: `game.loop.stop()`, `game.sound.stopAll()`, U21). Any blocker (missing capability, no stable 4.x) stops the unit and goes to the owner.
2. A development-only route `/dev/math-rally-slice` under `import.meta.env.DEV` (and in local gate builds, `vite build --mode gate`), lazy-loaded, never in production builds. Its module body registers the G17 violation recorder before it mounts the engine; `?mount=0` renders the page without mounting (baseline for the desktop CSP pass rule, `math-rally-services.md` Section 8).
3. One full race: pseudo-3D road with hills and curves, fork with real branches (plan Q5 A), signs, lane chips, kart from behind with lean, boost and bumpy-branch slowdown, countdown, finish line, basic HUD (banner, fork k / N, coins, time, pause button), keyboard and bottom joystick with the visibility rule (`touchUi` or first touch). Motion follows the frame rule of the methods file Section 1 (dt from the race clock, clamped to 50 ms); the maths sit in `core/motion.ts` until MR2 moves them to `packages/shared`.
4. Questions from two static fixture races (Easy with 2 paths, Hard with 4 paths) in the test folder; the MR2 generator is not required.
5. Quality profiles (G11) and the development frame-time overlay with CSV export (G17). The fatal-error guard (G1, `core/fatalErrorGuard.ts`) on the slice and in the embed page (`embed/pageGuard.ts` as the first import of `embed/main.ts`), the scenes' `update` try/catch, and the G17 Fault trigger (F8 on desktop, an overlay button on a phone; DEV and gate builds only) that throws inside a tween callback.
6. Placeholder art and sound from CC0 sources or simple shapes, each file listed in a first credits manifest.
7. CSP check on desktop, with images loaded as `HTMLImageElement` and the built-in textures pointed at `sys/` (G1 `engineConfigFields`), in a local `vite preview` of a gate build (`--mode gate`, step 2) whose preview config sends the policy as an enforced header (`vite preview` because the dev server injects an inline React refresh script):
   - under the production web policy (`apps/web/vercel.json`), which allows `data:` images and inline styles, so it cannot show a dependency on either;
   - under the app page policy of G16 (`'self'` for every source, no `data:`, no `blob:`, no inline styles), the stricter test, available on Windows before any phone run. The page is the main web app's shell, whose `index.html` links the Google Fonts stylesheet and fonts, so the run uses the desktop CSP pass rule of `math-rally-services.md` Section 8 (baseline run with `?mount=0`, then a race; the host shell's own violations are expected and listed);
   - record every blocked request and every `securitypolicyviolation` event (G17: directive, blocked scheme, origin, source file path), every `data:` URL requested at boot, and whether Phaser 4 has the image-load option and the built-in texture settings (resolves U5, first evidence for U20);
   - press the Fault trigger during a race: the slice host shows "The race stopped unexpectedly." with a way back (AC-44.2, first check; MR4 repeats it with the real host, which also must send no `completeGame`); record whether Phaser 4's loop had stopped by itself (U21).
8. WebView spike, on Android and on the owner's iPhone (iOS steps run on the owner's Mac with written instructions):
   - embed build (T1 basic, with `--gate` so that G17 is included), Android asset loader and iOS custom scheme (A5 sets the content type from the extension and the length of the bytes), G1 with `dashden-game://` as a local scheme;
   - loading test over the app-internal origin through the Phaser loader: one image, one atlas JSON file, one audio file and one missing file; record the XHR status each produces on each platform and whether the missing file surfaces as `ASSET_LOAD_FAILED` (resolves U19, AC-46.3);
   - a build with `sys/white.png` removed (the T1 presence check bypassed for this run only): record whether Phaser 4 boots without the white texture, and check that G2's built-in texture check reports `ASSET_LOAD_FAILED` and no `ready` is sent, or, if the engine never boots, that the 20 s `ready` timeout shows the load-failure message (U20);
   - the Fault trigger (overlay button) during a race: the spike screen shows its race-stopped overlay, and both its button and Android Back leave the screen (AC-48.2);
   - the app page CSP enforced as written (`'self'` for every source), with `embed/index.html` free of inline `<script>`, `<style>` elements and `style=` attributes (G16) and the font loaded through `FontFace` (G2); record every blocked request and CSP violation (G17, recorder installed by `embed/pageGuard.ts` before any other module), every `data:` URL Phaser 4 requests at boot, and whether its default, missing and white textures (and any further built-in texture) are configurable; pass: no violation at all (the WebView rule of `math-rally-services.md` Section 8); `blob:` or `data:` is added to `img-src` or `media-src` only if the engine cannot avoid it, and documented (U5, U20, NFR-MK-17, AC-46.3);
   - a bridge round trip (`ready`, `init` with `touchUi: true`, `pauseChanged`, `raceFinished`), hardening settings, airplane mode, audio unlock and the iOS silent switch, CSP `'self'` on the custom scheme (resolves U6, U16);
   - record which Android platform-view composition modes the plugin offers and which one it uses by default (U18).
9. Gate (NFR-MK-1, NFR-MK-2, Q29): full race on the reference Android phone inside the spike WebView, measured in each composition mode found in step 8; the owner's iPhone (WebView); desktop Chrome and Safari. Pass: median at least 50 fps, slowest 1% of frames at least 30 fps, lane change visible within 100 ms (slow-motion video). The composition mode that ships is the one that passes (the faster one if both pass) and is recorded for MR5. Every fatal-error guard report during normal play in these runs (G17 records code and error type) is a gate finding: a cause in Math Rally code is fixed before MR4; a cause inside the engine goes to the owner with options.

**Files**
- New: `apps/web/src/games/math-rally/{MathRallyEngine.ts, core/*, phaser/scenes/RaceScene.ts, phaser/scenes/HudScene.ts, phaser/render/*, phaser/input/*, bridge/hostChannel.ts, dev/frameOverlay.ts, dev/violationRecorder.ts, embed/*}` (`core/*` includes `engineConfig.ts` and `fatalErrorGuard.ts`; `embed/*` includes `pageGuard.ts`), `apps/web/src/pages/dev/MathRallySlicePage.tsx`, fixtures and Vitest files for every `core/*` module, `apps/web/vite.math-rally-embed.config.ts`, `apps/web/scripts/build-math-rally-embed.mjs` (spike level), `apps/web/public/games/math-rally/` placeholder assets, the three `sys/` texture PNGs and `CREDITS.json`
- Edited: `apps/web/package.json` and `package-lock.json` (Phaser, exact pin), `apps/web/src/App.tsx` (dev-only route)

**Completion criteria**
- Unit tests pass for lanes, joystick model and visibility rule, clock (60 s pause adds 0 s, AC-5.1), motion (speed never above maximum, delta clamp, first frame after resume carries no pause), quality rule, projection maths, `engineConfigFields` (no `data:` or `blob:` value; default local schemes plus the given ones without duplicates), `createFatalErrorGuard` and `installPageErrorListeners` (AC-44.3, cases in `math-rally-services.md` Section 8)
- Fault trigger: on web the slice shows "The race stopped unexpectedly." (AC-44.2, first check); in the spike WebView the race-stopped overlay appears and its button and Android Back leave (AC-48.2)
- Gate report at `aidlc-docs/construction/math-rally-slice/gate-report.md` with per-device median fps, 1% low, input latency, the Android composition mode of each measurement and the one chosen, chunk size, the loader statuses of step 8, the CSP violations and `data:` URLs of steps 7 and 8 with the built-in texture settings found (the host shell's expected violations listed separately), the missing `sys/white.png` result, the Phaser 4 literals confirmed in step 1, every guard report during normal play, and the U1, U3 to U7, U16, U18 to U21 findings
- Production build check: the entry chunk and every production route are unchanged in content (bundle report shows no Phaser module outside the dev chunk)
- **If the gate fails after the levers** (draw distance, render scale, level of detail, vertex batch, painted-lane fork of plan Q5 B, the other Android composition mode): stop, present options to the owner (fewer effects, lower resolution, other renderer mode, Flame fallback). No automatic switch.

**Deploy implications**: Merging changes `apps/web` only. Whether Vercel builds production on merge to `main` is an open item from Quest Map (O2); the dev route is excluded from production builds either way, and Phaser is not imported by production code. No Lambda trigger path is touched.

**Verify**: `cd apps/web && npx vitest run && npx tsc --noEmit && npm run build`

*Stories: MK-5, MK-6, MK-25 (primary); MK-3, MK-4, MK-7, MK-8, MK-9, MK-14, MK-17, MK-20, MK-21, MK-24 (contributes) · Requirements: FR-MK-1 to 5, 9 to 12 (behaviour), 20, 21, 44 (guard, AC-44.2 first check, AC-44.3), 46 (spike), 48 (AC-48.2 in the spike), NFR-MK-1, 2, 3 (first measurement), 5, 14 (top-level handler), 17 (finding), 18 (finding)*

---

## MR2 - Shared Race Core
- **Package**: `packages/shared` · **Size**: Medium · **Blocks**: MR3, MR4 · **Can run in parallel with MR1**
- **Components**: S1 to S7

**Scope**
- Protocol registry (`MR_CLIENT_PROTOCOL`, `MR_SUPPORTED_PROTOCOLS`, `protocolSpec`) and the `v1/` folder: Section 4.0 table, track distances, acceleration and speeds, kinds and operand rules, with the layout contracts of the methods file Section 1 as tests
- Seeded RNG; exact values and canonical option patterns (`parseOption`, `sameValue`, `formatExact`); question generator for the FR-MK-13 content table; distractor rules with the canonical filter; race builder with balanced positions and no repeats; types
- Motion maths (`advanceMotion`, `applyOutcome`), moved from MR1's `core/motion.ts` if it exists, otherwise written from the methods file contract (MR1 then adapts); `expectedRaceTimesMs` in closed form; `isPlausibleTiming`; the AC-30.2 frame-loop property test
- Golden fixtures for protocol v1 and the fixture script that refuses to overwrite a frozen fixture
- `FREE_DIFFICULTIES_IN_PAID_GAMES` and `isBlockedForFreeTier` in `constants/paid-games.ts`, tested with injected lists for the post-switch case
- Optional `mathRally` attribute on the shared `Game` type
- Functional Design (standard) settles: operand ranges per question kind, the distractor rules that apply per kind, track distances, acceleration and speeds that satisfy the layout contracts, and `timingToleranceMs` from the property test

**Files**
- New: `packages/shared/src/math-rally/{types,protocols,track,motion,timing,rng,exact,race,index}.ts`, `packages/shared/src/math-rally/v1/{params,track,questions,distractors,index}.ts`, `packages/shared/src/math-rally/__fixtures__/protocol-v1-{races,times}.json`, `packages/shared/scripts/write-math-rally-fixtures.mjs`; tests `race.property.test.ts`, `options.property.test.ts`, `motion.property.test.ts`, `questions.test.ts`, `distractors.test.ts`, `track.test.ts`, `timing.test.ts`, `rng.test.ts`, `golden.test.ts`, `constants/paid-games.test.ts` additions
- Edited (additive): `packages/shared/src/index.ts` (`export * from './math-rally'`), `packages/shared/src/constants/paid-games.ts`, `packages/shared/src/types/entities.ts`

**Completion criteria**
- Property tests of the methods file Section 1 pass for 1000 seeds per difficulty (AC-13.1, AC-14.1, AC-15.1, AC-15.2, AC-17.1, AC-18.1); position balance over 10 000 forks (AC-16.1); the frame-loop timing test passes with the chosen tolerance (AC-30.2)
- Golden fixtures for v1 committed and matched; `golden.test.ts` fails when any generator, distractor, track or motion output for v1 changes
- The module imports nothing (no `zod`, no `date-fns`), so `apps/web` can use it through a funnel; a test reads the source files and fails on any import outside the folder
- `isBlockedForFreeTier`: with the launch lists, unchanged results for every theme; with `MATH_RALLY` added to an injected paid list, difficulty 1 allowed and 2 to 4 blocked (AC-55.1 at unit level)
- No existing export is altered (diff of `index.ts` is additions only)

**Deploy implications**: `packages/shared/**` is a trigger path of `.github/workflows/deploy-lambdas.yml`; merging redeploys the Game, Leaderboard and Email Sender Lambdas with no behaviour change, since nothing calls the new code until MR3.

**Verify**: `cd packages/shared && npx jest && npx tsc --noEmit`

*Stories: MK-11, MK-12 (primary); MK-4 (reading-window constants), MK-13 (protocol registry), MK-15 (bundled generator), MK-19 (motion and expected times), MK-28 (gate function) (contributes) · Requirements: FR-MK-8, 12 (constants), 13 to 18, 26 (registry), 30 (motion and expected times), 55 (function), NFR-MK-22, 23*

---

## MR3 - Backend: Game Service, Leaderboard and Data Scripts
- **Packages**: `services/game`, `services/leaderboard`, `scripts/` · **Size**: Large · **Depends on**: MR2 · **Blocks**: MR4 integration, MR5 integration (contract can be frozen earlier so MR4 builds against fixtures)
- **Components**: B1 to B10, L1, D1

**Scope**
- `startGameInputSchema` gains `mathRallyProtocol`, `completeGameInputSchema` gains `mathRallySubmission`, both `z.unknown().optional()` (plain `z.object` schemas drop undeclared keys, and a schema failure would become `INTERNAL_ERROR`)
- `startGame` branch for `MATH_RALLY`: difficulty and protocol checks before any read (anything other than a supported integer gets the update message, no play used; other themes ignore the field), seed, race build with the requested version before `checkLimit`, record with `protocolVersion` on `create`, payload returned; handler mapping
- `completeMathRallyGame` exit with record (version still supported), validation, correct count from the key, timing against `expectedRaceTimesMs` for those answers, breakdown without client time (`MR_BASE` 2000/2000/2000/2134, `speedBonus` 1.0), caps, achievements, metrics, event with server counts, cache invalidation and `finalizeQuest`
- Paid gate wired to `isBlockedForFreeTier`
- `publishMathRallyRejected` metric; `MATH_RALLY` in the review list; `schema.graphql` documentation
- Leaderboard `GameType.MATH_RALLY` with the 1 to 3600 s, 0 to 8000 window; a test that a flagged entry is still returned (AC-38.2); `anomaly.service.ts` unchanged (Q40)
- `scripts/seed-math-rally.sh` and `scripts/verify-math-rally-seed.sh` (theme row `MATH_RALLY` `PUBLISHED`, catalog row `math-rally` `ACTIVE`, route `/math-rally/setup`, category `Science & Math`, `ageRange` `8-16`)
- Functional Design (minimal) settles: the seed script's `displayOrder` and the completion sequence check against the Circuit Builder exit; the score constants and both refusal texts are fixed by this design

**Files**
- New: `services/game/src/utils/math-rally.ts`, `services/game/src/utils/math-rally-validation.ts`; tests `tests/unit/services/game.service.math-rally.test.ts`, `tests/unit/utils/math-rally-validation.test.ts`, `tests/unit/services/score-calculator.math-rally.test.ts`, `tests/unit/services/paid-gate.test.ts`; `services/leaderboard` tests for the window and the flagged entry; `scripts/seed-math-rally.sh`, `scripts/verify-math-rally-seed.sh`
- Edited: `services/game/src/services/game.service.ts`, `services/score-calculator.service.ts`, `services/review.service.ts`, `handlers/game.handler.ts`, `utils/validation.ts`, `utils/metrics.ts`, `types/index.ts`, `repositories/game.repository.ts`, `schema.graphql` (reference only); `services/leaderboard/src/types/index.ts`, `services/leaderboard/src/services/scoring.service.ts`

**Completion criteria**
- AC-26.1 to 26.3, 27.1, 28.1, 29.1, 30.1, 31.1, 32.1 to 32.5, 33.1, 33.2, 34.1, 38.1, 38.2, 52.1, 53.1, 55.1 to 55.4, 56.4 covered by named tests. AC-33.2 and AC-52.1 construct `GameService` with a stub `QuestService` (through the existing optional `questService` constructor parameter) whose `validateStart` accepts one `MATH_RALLY` leg and whose `applyCompletion` returns a quest result
- Existing `services/game` suites pass unchanged, including the suites that construct `GameService` with seven arguments; the two pre-existing broken suites stay as recorded in `aidlc-state.md`
- Leaderboard: new tests pass; the 9 pre-existing failures are unchanged in number and names
- Scripts pass `bash -n`, use LF line endings, refuse unknown arguments with exit 2, and write nothing without the typed confirmation

**Deploy implications**
1. Merging to `main` deploys `MemoryGame-GameService-prod` and `MemoryGame-LeaderboardService-prod` through CI (paths `services/game/src/**`, `services/leaderboard/src/**`). The workspace rule applies to any manual Game Lambda deploy: `./scripts/deploy-game-lambda.sh prod` only, never a hand-made zip.
2. The Math Rally paths are unreachable in production until the theme row exists (`validateTheme` refuses), so the merge changes behaviour only through the paid-gate wiring, which keeps every current result (AC-55.3). The two new schema fields are optional and ignored by every other theme.
3. Seeding is the go-live action and runs last (release order in `math-rally-unit-of-work-dependency.md` Section 3), with `--prod` and `--profile dashden-new` and explicit owner approval.

**Verify**: `cd services/game && npx jest && npx tsc --noEmit`; `cd services/leaderboard && npx jest && npx tsc --noEmit`; `bash -n scripts/seed-math-rally.sh scripts/verify-math-rally-seed.sh`

*Stories: MK-19, MK-22, MK-28 (primary); MK-1 (seed), MK-3, MK-8, MK-10, MK-13 (protocol check at start), MK-20, MK-23, MK-26, MK-27 (contributes: server side) · Requirements: FR-MK-26 to 34, 38, 39, 52 (server), 53, 55, NFR-MK-11 to 15, 19, 23, 26*

---

## MR4 - Web Game and Host
- **Package**: `apps/web` · **Size**: Large · **Depends on**: MR1 gate passed (or owner decision), MR2, MR3 contract (live MR3 for the integration checks)
- **Components**: G2, G5 (shared motion), G6, G9, G12 to G15 (full), H1 to H10; final art, sound and credits

**Scope**
- Full game core: boot loading with the built-in texture check before `ready`, every game `error` through the fatal-error guard, all four difficulties from the shared generator, G5 switched to the shared motion through the funnel (MR1's local copy deleted), fork controller, full HUD, opaque pause screen that hides the question, signs and chips and clears the live region, feedback with reveal text, reduced-motion behaviour, sound bank, game text in three languages, protocol and fixture, payload validation against the client protocol spec
- Final v1 art (one bright countryside track, original Benji, CC0 roadside objects) and sound, every file in `CREDITS.json`
- React host: both routes lazy through `lazyWithTimeout` (20 s) with a route error boundary; setup page with lock rule; game page and host hook with the 20 s `ready` timeout, game errors mapped by phase, protocol pass-through, update-required handling, `touchUi` and language reduction; the dev slice route gains an offline-race mode with the full game core (DEV and gate builds only) for the desktop CSP run; prefetch from setup; sound preference; visibility pause; result modal; error states of `math-rally-services.md` Section 5.1
- `api/game.ts`: `startMathRallyGame` with `mathRallyProtocol`, sharing the quest helper; local update-message constant and `isUpdateRequiredError` (no import of the shared race module, so the entry chunk stays free of it); `mathRallySubmission`
- Registries and locales (H6), partly-free hub (H7), routes (H8), consistency test including the web (`api/game.ts`) and Dart copies of the update-message text (H9), credits manifest test (H10)
- CSP: apply the narrow change found in MR1, if any, to `apps/web/vercel.json`
- Functional Design (standard) settles: HUD layout at 320 and 1280 px, feedback timings, sign and chip sizes, the pause panel, setup page content, host state transitions, the hub "Easy is free" note

**Files**
- New: `apps/web/src/games/math-rally/{phaser/scenes/BootScene.ts, core/forkController.ts, phaser/audio/SoundBank.ts, i18n/gameText.ts, locales/{en,es,pt}.json, bridge/protocol.ts, bridge/__fixtures__/messages.json}`, `apps/web/src/pages/math-rally/{MathRallySetupPage.tsx, MathRallyGamePage.tsx, useMathRallyHost.ts, hostEnv.ts, levelLocks.ts}`, `apps/web/src/utils/lazyWithTimeout.ts`, `apps/web/src/games/math-rally/shared.ts`, `apps/web/src/__tests__/mathRallyRegistry.test.ts`, `apps/web/src/locales/__tests__/mathRallyLocaleCompleteness.test.ts` (main `mathRally` namespace and the game locale files, same pattern as `questLocaleCompleteness.test.ts`), credits manifest test, tests per module; final assets under `apps/web/public/games/math-rally/`
- Edited: `src/App.tsx`, `src/config/constants.ts`, `src/api/game.ts`, `src/api/leaderboard.ts`, `src/components/hub/GameTile.tsx`, `src/pages/hub/GameHubPage.tsx`, `src/components/leaderboard/GameTypeFilter.tsx`, `src/components/dashboard/RecentImprovements.tsx`, `src/pages/admin/AdminDashboard.tsx`, `src/pages/dashboard/{HistoryPage,AchievementsPage,StatisticsPage}.tsx`, `src/locales/{en,es,pt}.json`, and `vercel.json` only if MR1 found a needed source; deleted: `src/games/math-rally/core/motion.ts` (MR1 copy)

**Completion criteria**
- Automated: every [U] criterion of FR-MK-6 to 24, 37, 40 to 44, 49 (TypeScript side), 56 (web), NFR-MK-9; G5 frame-rule test (motion follows the clock, not Phaser's delta); host state machine with fake timers (AC-25.2 logic), the update refusal and a game `error` in each phase (load failure before `ready`, race stopped and no `completeGame` from `starting` to `paused`, ignored from `submitting` on); import check for FR-MK-42; registry mutation suite
- Bundle report: Phaser, game code and every module of `packages/shared/src/math-rally/` only in the lazy chunks (AC-41.1); code outside the lazy chunks grows by at most 2 KB gzip, measured without the `mathRally` locale strings and the registry and display-map entries, which the report lists separately; game chunk at most 450 KB gzip; first-race assets at most 1.5 MB (NFR-MK-3); any miss is reported to the owner with options
- Manual checklist (written in Construction): 320 x 568 and 1280 x 720 layouts, four signs readable on the reference phone, lazy loading in the network panel (AC-41.2), StrictMode remount (AC-43.1), WebGL disabled (AC-44.1), `ready` never arriving (AC-25.2, by blocking the asset folder in devtools), keyboard scroll capture, joystick visible at the countdown on a touch phone in landscape (AC-21.4), pause hides the question (AC-22.3), reduced motion, sound off persists, a `pt-BR` browser races in Portuguese, FREE and paid setup states, the Fault trigger in a local gate build of the game page (AC-44.2: "The race stopped unexpectedly.", no `completeGame` in the network panel), and the desktop CSP run under the app page policy on the slice route with the full game core and an offline race (pass rule in `math-rally-services.md` Section 8: no `data`, `blob`, `inline` or `eval` violation and none from a game file beyond the `?mount=0` baseline; the host shell's Google Fonts violations from `apps/web/index.html` are expected and listed)
- Gate re-run on desktop Chrome and Safari with the full game

**Deploy implications**: Frontend only. Production deploy per the workspace rule: from `apps/web/`, `npx vercel link --project web-prod --yes && npx vercel --prod --yes`, then re-link to `web` and restore `.env.local`. Only after MR3 is live. Until the seed, the hub shows no tile (no catalog row); a direct visit to the route reaches `startGame`, which fails with "Theme not found" and returns to the hub with the generic message.

**Verify**: `cd apps/web && npx vitest run && npx tsc --noEmit && npm run build`

*Stories: MK-1, MK-2, MK-3, MK-4, MK-7, MK-8, MK-9, MK-10, MK-16, MK-17, MK-18, MK-20, MK-23, MK-24, MK-26, MK-27 (primary); MK-5, MK-11, MK-13, MK-22, MK-25, MK-28 (contributes) · Requirements: FR-MK-1 to 25, 35 to 37, 40 to 44, 49, 50 (web), 52 (web), 54 (checklist draft), 56 (web), NFR-MK-3 to 10, 14 (web host), 16, 17, 19 to 22, 24*

---

## MR5 - App Host
- **Packages**: `apps/mobile`, plus T1 and G16 final in `apps/web` · **Size**: Large · **Depends on**: MR4 (game core and protocol), MR3 (live API for scored races)
- **Components**: A1 to A9, T1 and G16 (final)

**Scope**
- `flutter_inappwebview` pinned exactly; hardened settings; the Android composition mode recorded by the MR1 gate; Android asset loader and iOS custom scheme with path and extension allowlist and content types; navigation filter
- Bridge and protocol in Dart (shared fixture, `correctCount` in `RaceFinishedMessage`), message builders with no route for tokens or user details, `touchUi: true` in `init`
- Session additions: `start({int? mathRallyProtocol})`, second start document, start payload, `BlockReason.updateRequired` and `isUpdateRequired`, `mathRallySubmission` allowlisted
- Setup and play screens, 20 s `ready` timeout, local protocol check, lifecycle handling, Back through the `backAction` rule with the 1 s fallback, offline race, race-stopped, load-failure and update overlays (game errors mapped by phase, page-process end), result screen, language reduced to `en`, `es` or `pt`; final `embed/pageGuard.ts`
- Registry entry, display meta, routes with quest parsing, paid copy with `kFreeDifficultiesInPaidGames`, partly-free hub tile, level lock rule
- Final embed build: markup check of `embed/index.html` and presence of the `sys/` textures (exit 1), `sourceHash` and per-file output hashes in `build-info.json`, `--check-only`, the AC-51.2 Vitest test of `math-rally-source-hash.mjs`; committed bundle, `pubspec.yaml` asset folders, regenerated ARB files for the host strings
- Functional Design (standard) and NFR Requirements (minimal) settle: play-screen states and overlays, WebView settings per platform as confirmed in the MR1 spike, iOS audio session behaviour

**Files**
- New: `apps/mobile/lib/game/math_rally/{protocol,bridge,asset_server,level_locks}.dart`, `apps/mobile/lib/ui/screens/games/math_rally_screens.dart`, `apps/mobile/assets/math_rally/**`, tests under `apps/mobile/test/math_rally/`; `apps/web/scripts/math-rally-source-hash.mjs`, `apps/web/src/__tests__/mathRallySourceHash.test.ts`
- Edited: `apps/mobile/pubspec.yaml`, `pubspec.lock`, `lib/api/game_api.dart`, `lib/api/game_models.dart`, `lib/game/framework/game_session.dart` (additive), `lib/game/game_registry.dart`, `lib/game/hub_logic.dart`, `lib/config/paid_games.dart` (and its parity test), `lib/stats/game_meta.dart`, `lib/ui/router.dart`, `lib/l10n/app_{en,es,pt}.arb` (generated), `android/app/src/main/AndroidManifest.xml` and `ios/Runner/Info.plist` only if the plugin requires entries; `apps/web/vite.math-rally-embed.config.ts`, `apps/web/scripts/build-math-rally-embed.mjs`, `apps/web/src/games/math-rally/embed/*`

**Completion criteria**
- Dart tests: protocol fixture parity, AC-47.1 (no token or user detail in any message), AC-49.1, AC-49.2, `kSupportedProtocolVersions` contains the bundle's `build-info.json` protocol version, session `start(mathRallyProtocol)` and the `updateRequired` block (never an offline race), level locks and hub tiles (AC-56.2, 56.3), iOS asset allowlist and MIME table, navigation filter, `backAction` for every phase, play-screen states with a fake `WebViewPort`, fake `GameApi` and fake timers (ready timeout; Back with a bridge that never sends `pauseChanged` opens the leave confirmation after 1 s and at once on a second Back, AC-48.3; game `error` before and after `ready`)
- Vitest: AC-51.2 (`computeSourceHash` changes with any input byte, not with input order or CRLF-only changes)
- Existing app tests pass unchanged, including the paid-list parity test extended to the free-difficulty map
- Manual on the reference Android phone and the owner's iPhone: AC-21.4 (joystick at the countdown after Start on the native screen), AC-25.2 (no `ready`), AC-45.1, 46.1 to 46.3, 48.1, 48.2 (repeated with a local `--gate` embed build that is reverted afterwards; `--check-only` refuses a gate build, so a leftover cannot reach a release), 50.1, 51.1 (`--check-only` on the release commit), sound and silent switch, gate re-run with the full game inside the WebView in the chosen composition mode
- App size growth at most 4 MB (NFR-MK-3); `flutter pub outdated` and licences recorded

**Deploy implications**: App store releases (Android built on Windows since `7f5db13`; iOS built and submitted from the owner's Mac). Older app versions never list Math Rally (registry). The release checklist runs the embed build with `--check-only` on the release commit first (PL7).

**Verify**: `cd apps/mobile && flutter analyze && flutter test`; `cd apps/web && npx vitest run src/__tests__/mathRallySourceHash.test.ts`; `node apps/web/scripts/build-math-rally-embed.mjs --check-only`

*Stories: MK-13, MK-14, MK-15, MK-21 (primary); MK-1, MK-2, MK-3, MK-6, MK-9, MK-16, MK-18, MK-22, MK-23, MK-25, MK-26, MK-28 (app side, contributes) · Requirements: FR-MK-21 (app), 25 (app), 44 (app), 45 to 51, 52 (app), 56 (app), NFR-MK-3 (app), 14 (app page), 16, 17 (app page), 18, 23*

---

## Pre-Launch Checks (not units)

| Id | Check | Source |
|---|---|---|
| PL1 | Gate passed on the full game (MR4 desktop, MR5 phones, Android in the recorded composition mode) | NFR-MK-1, MK-25 |
| PL2 | Credits manifest complete; IP review of every asset against NFR-MK-20 | MK-20, R7 |
| PL3 | Quick trademark search on "Math Rally" recorded | R6 |
| PL4 | Owner playtest of each difficulty with a child of the target age | R14 |
| PL5 | Paid-switch checklist (FR-MK-54) written, first step the per-difficulty gate check | AC-54.1 |
| PL6 | Production theme and catalog tables accept the rows (verify script, read-only, owner approval) | U14 |
| PL7 | On the release commit, `build-math-rally-embed.mjs --check-only` exits 0: the committed `sourceHash` equals the hash of the source tree, every bundled file matches its recorded hash, and the bundle is not a gate build; run before each app release | FR-MK-51, AC-51.1 |
| PL8 | Protocol v1 frozen at the launch commit: golden fixtures carry `"frozen": true`, `MR_CLIENT_PROTOCOL` is 1 and `MR_SUPPORTED_PROTOCOLS` is `[1]` | FR-MK-26, NFR-MK-23, R18 |
