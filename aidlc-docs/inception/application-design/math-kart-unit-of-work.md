# Math Rally - Units of Work

**Created**: 2026-11-25
**Stage**: INCEPTION - Units Generation
**Project type**: Brownfield. Units are groupings for development, not new deployable services. Deployables stay the existing Game Service and Leaderboard Lambdas, the Vercel frontend and the Flutter app.
**Basis**: `math-kart-components.md`, `math-kart-stories.md`, plan decisions Q12 and Q13 in `../plans/math-kart-application-design-plan.md`
**Unit ids**: `MR1` to `MR5` (Math Rally). Requirement and story ids keep their `MK` labels.

Verification commands come from each package's `package.json` as read for this stage. Nothing was built or run (documentation-only stage). Whether Flutter and the Android SDK are installed on the Windows machine is not known (U13).

| Unit | One-line scope | Size | Depends on |
|---|---|---|---|
| MR1 | Vertical slice: one playable forked-road race on web and in a spike WebView, measured against the phone performance gate | Large | none |
| MR2 | Shared race core: seeded question generator, distractors, race constants and timing floors, free-tier gate | Medium | none |
| MR3 | Backend: server-built races, re-scored completion, score breakdown, per-difficulty gate wiring, leaderboard type, seed scripts | Large | MR2 |
| MR4 | Web game and host: full game content, art and audio, lazy React host, setup page, registries, locales, partly-free hub | Large | MR1 (gate passed), MR2, MR3 contract |
| MR5 | App host: bundled game in a hardened WebView, bridge, native setup and play screens, registry, partly-free hub | Large | MR4, MR3 |

---

## MR1 - Vertical Slice and Performance Gate
- **Packages**: `apps/web` (merged); `apps/mobile` spike on branch `spike/math-rally-webview` (**not merged**)
- **Size**: Large · **Blocks**: MR4 and MR5 until the gate passes or the owner decides
- **Components**: G1, G3, G4, G5, G7, G8, G10, G11, G15 (DirectChannel), G16 and T1 (spike level), G17; basic G9 and G6 behaviour

**Scope**
1. Pin Phaser 4 exactly; record version, licence and gzip size in the unit report (resolves U1, U3). Any blocker (missing capability, no stable 4.x) stops the unit and goes to the owner.
2. A development-only route `/dev/math-rally-slice` under `import.meta.env.DEV`, lazy-loaded, never in production builds.
3. One full race: pseudo-3D road with hills and curves, fork with real branches (plan Q5 A), signs, lane chips, kart from behind with lean, boost and bumpy-branch slowdown, countdown, finish line, basic HUD (banner, fork k / N, coins, time, pause button), keyboard and bottom joystick.
4. Questions from two static fixture races (Easy with 2 paths, Hard with 4 paths) in the test folder; the MR2 generator is not required.
5. Quality profiles (G11) and the development frame-time overlay with CSV export (G17).
6. Placeholder art and sound from CC0 sources or simple shapes, each file listed in a first credits manifest.
7. CSP check: run the slice under the production CSP value as an enforced header in a local `vite preview` config; record every blocked request (resolves U5).
8. WebView spike: embed build (T1 basic), Android asset loader and iOS custom scheme, a bridge round trip (`ready`, `init`, `pauseChanged`, `raceFinished`), hardening settings, airplane mode, audio unlock and the iOS silent switch, CSP `'self'` on the custom scheme (resolves U6, U16). iOS steps run on the owner's Mac with written instructions.
9. Gate (NFR-MK-1, NFR-MK-2, Q29): full race on the reference Android phone inside the spike WebView, the owner's iPhone (WebView), desktop Chrome and Safari. Pass: median at least 50 fps, slowest 1% of frames at least 30 fps, lane change visible within 100 ms (slow-motion video).

**Files**
- New: `apps/web/src/games/math-rally/{MathRallyEngine.ts, core/*, phaser/scenes/RaceScene.ts, phaser/scenes/HudScene.ts, phaser/render/*, phaser/input/*, bridge/hostChannel.ts, dev/frameOverlay.ts, embed/*}`, `apps/web/src/pages/dev/MathRallySlicePage.tsx`, fixtures and Vitest files for every `core/*` module, `apps/web/vite.math-rally-embed.config.ts`, `apps/web/scripts/build-math-rally-embed.mjs` (spike level), `apps/web/public/games/math-rally/` placeholder assets and `CREDITS.json`
- Edited: `apps/web/package.json` and `package-lock.json` (Phaser, exact pin), `apps/web/src/App.tsx` (dev-only route)

**Completion criteria**
- Unit tests pass for lanes, joystick, clock (60 s pause adds 0 s, AC-5.1), kinematics (speed never above maximum, delta clamp), quality rule, projection maths
- Gate report at `aidlc-docs/construction/math-rally-slice/gate-report.md` with per-device median fps, 1% low, input latency, chunk size, and the U1, U3 to U7, U16 findings
- Production build check: the entry chunk and every production route are unchanged in content (bundle report shows no Phaser module outside the dev chunk)
- **If the gate fails after the levers** (draw distance, render scale, level of detail, vertex batch, painted-lane fork of plan Q5 B): stop, present options to the owner (fewer effects, lower resolution, other renderer mode, Flame fallback). No automatic switch.

**Deploy implications**: Merging changes `apps/web` only. Whether Vercel builds production on merge to `main` is an open item from Quest Map (O2); the dev route is excluded from production builds either way, and Phaser is not imported by production code. No Lambda trigger path is touched.

**Verify**: `cd apps/web && npx vitest run && npx tsc --noEmit && npm run build`

*Stories: MK-5, MK-6, MK-25 (primary); MK-3, MK-4, MK-7, MK-8, MK-9, MK-17, MK-20, MK-21, MK-24 (contributes) · Requirements: FR-MK-1 to 5, 9 to 12 (behaviour), 20, 21, NFR-MK-1, 2, 3 (first measurement), 5, 17 (finding), 18 (finding)*

---

## MR2 - Shared Race Core
- **Package**: `packages/shared` · **Size**: Medium · **Blocks**: MR3, MR4 · **Can run in parallel with MR1**
- **Components**: S1 to S7

**Scope**
- Race constants for the Section 4.0 table and track distances and speeds, with the layout contracts of the methods file Section 1 as tests
- Seeded RNG; question generator for the FR-MK-13 content table; distractor rules; race builder with balanced positions and no repeats; types
- `FREE_DIFFICULTIES_IN_PAID_GAMES` and `isBlockedForFreeTier` in `constants/paid-games.ts`, tested with injected lists for the post-switch case
- Optional `mathRally` attribute on the shared `Game` type
- Functional Design (standard) settles: operand ranges per question kind, the distractor rules that apply per kind, track distances and speeds that satisfy the reading-window and reveal contracts, and the timing tolerance

**Files**
- New: `packages/shared/src/math-rally/{types,constants,track,rng,questions,distractors,race,index}.ts`; tests `race.property.test.ts`, `questions.test.ts`, `distractors.test.ts`, `track.test.ts`, `rng.test.ts`, `constants/paid-games.test.ts` additions
- Edited (additive): `packages/shared/src/index.ts` (`export * from './math-rally'`), `packages/shared/src/constants/paid-games.ts`, `packages/shared/src/types/entities.ts`

**Completion criteria**
- Property tests of the methods file Section 1 pass for 1000 seeds per difficulty; position balance over 10 000 forks
- The module imports nothing (no `zod`, no `date-fns`), so `apps/web` can use it through a funnel; a test reads the source files and fails on any import outside the folder
- `isBlockedForFreeTier`: with the launch lists, unchanged results for every theme; with `MATH_RALLY` added to an injected paid list, difficulty 1 allowed and 2 to 4 blocked (AC-55.1 at unit level)
- No existing export is altered (diff of `index.ts` is additions only)

**Deploy implications**: `packages/shared/**` is a trigger path of `.github/workflows/deploy-lambdas.yml`; merging redeploys the Game, Leaderboard and Email Sender Lambdas with no behaviour change, since nothing calls the new code until MR3.

**Verify**: `cd packages/shared && npx jest && npx tsc --noEmit`

*Stories: MK-11, MK-12 (primary); MK-4 (reading-window constants), MK-15 (bundled generator), MK-19 (timing floors), MK-28 (gate function) (contributes) · Requirements: FR-MK-8, 12 (constants), 13 to 18, 55 (function), NFR-MK-22*

---

## MR3 - Backend: Game Service, Leaderboard and Data Scripts
- **Packages**: `services/game`, `services/leaderboard`, `scripts/` · **Size**: Large · **Depends on**: MR2 · **Blocks**: MR4 integration, MR5 integration (contract can be frozen earlier so MR4 builds against fixtures)
- **Components**: B1 to B10, L1, D1

**Scope**
- `startGame` branch for `MATH_RALLY` (difficulty check, seed, race build before `checkLimit`, record on `create`, payload returned) and the handler mapping
- `completeMathRallyGame` exit with record, validation and timing stages, re-scoring from the key, breakdown, caps, achievements, metrics, event with server counts, cache invalidation and `finalizeQuest`
- Paid gate wired to `isBlockedForFreeTier`
- `publishMathRallyRejected` metric; `MATH_RALLY` in the review list; `schema.graphql` documentation
- Leaderboard `GameType.MATH_RALLY` with the 1 to 3600 s, 0 to 8000 window
- `scripts/seed-math-rally.sh` and `scripts/verify-math-rally-seed.sh` (theme row `MATH_RALLY` `PUBLISHED`, catalog row `math-rally` `ACTIVE`, route `/math-rally/setup`, category `Science & Math`, `ageRange` `8-16`)
- Functional Design (minimal) settles: `MR_BASE` per difficulty and `MR_TIME_WEIGHT` meeting AC-32.4, the rejection message text, the seed script's `displayOrder`

**Files**
- New: `services/game/src/utils/math-rally.ts`, `services/game/src/utils/math-rally-validation.ts`; tests `tests/unit/services/game.service.math-rally.test.ts`, `tests/unit/utils/math-rally-validation.test.ts`, `tests/unit/services/score-calculator.math-rally.test.ts`, `tests/unit/services/paid-gate.test.ts`; `services/leaderboard` test for the window; `scripts/seed-math-rally.sh`, `scripts/verify-math-rally-seed.sh`
- Edited: `services/game/src/services/game.service.ts`, `services/score-calculator.service.ts`, `services/review.service.ts`, `handlers/game.handler.ts`, `utils/validation.ts`, `utils/metrics.ts`, `types/index.ts`, `repositories/game.repository.ts`, `schema.graphql` (reference only); `services/leaderboard/src/types/index.ts`, `services/leaderboard/src/services/scoring.service.ts`

**Completion criteria**
- AC-26.1, 26.2, 27.1, 28.1, 29.1, 30.1, 31.1, 32.1 to 32.5, 33.1, 33.2, 34.1, 38.1, 53.1, 55.1 to 55.4, 56.4 covered by named tests
- Existing `services/game` suites pass unchanged, including the suites that construct `GameService` with seven arguments; the two pre-existing broken suites stay as recorded in `aidlc-state.md`
- Leaderboard: new test passes; the 9 pre-existing failures are unchanged in number and names
- Scripts pass `bash -n`, use LF line endings, refuse unknown arguments with exit 2, and write nothing without the typed confirmation

**Deploy implications**
1. Merging to `main` deploys `MemoryGame-GameService-prod` and `MemoryGame-LeaderboardService-prod` through CI (paths `services/game/src/**`, `services/leaderboard/src/**`). The workspace rule applies to any manual Game Lambda deploy: `./scripts/deploy-game-lambda.sh prod` only, never a hand-made zip.
2. The Math Rally paths are unreachable in production until the theme row exists (`validateTheme` refuses), so the merge changes behaviour only through the paid-gate wiring, which keeps every current result (AC-55.3).
3. Seeding is the go-live action and runs last (release order in `math-kart-unit-of-work-dependency.md` Section 3), with `--prod` and `--profile dashden-new` and explicit owner approval.

**Verify**: `cd services/game && npx jest && npx tsc --noEmit`; `cd services/leaderboard && npx jest && npx tsc --noEmit`; `bash -n scripts/seed-math-rally.sh scripts/verify-math-rally-seed.sh`

*Stories: MK-19, MK-22, MK-28 (primary); MK-1 (seed), MK-3, MK-8, MK-10, MK-20, MK-23, MK-26, MK-27 (contributes: server side) · Requirements: FR-MK-26 to 34, 38, 39, 52 (server), 53, 55, NFR-MK-11 to 15, 19, 26*

---

## MR4 - Web Game and Host
- **Package**: `apps/web` · **Size**: Large · **Depends on**: MR1 gate passed (or owner decision), MR2, MR3 contract (live MR3 for the integration checks)
- **Components**: G2, G6, G9, G12 to G15 (full), H1 to H10; final art, sound and credits

**Scope**
- Full game core: boot loading, all four difficulties from the shared generator, fork controller, full HUD and pause menu, feedback with reveal text, reduced-motion behaviour, live region, sound bank, game text in three languages, protocol and fixture
- Final v1 art (one bright countryside track, original Benji, CC0 roadside objects) and sound, every file in `CREDITS.json`
- React host: setup page with lock rule, lazy game page and host hook, prefetch from setup, sound preference, visibility pause, result modal, error states of `math-kart-services.md` Section 5.1
- `api/game.ts`: `startMathRallyGame` sharing the quest helper, `mathRallySubmission`
- Registries and locales (H6), partly-free hub (H7), routes (H8), consistency test (H9), credits manifest test (H10)
- CSP: apply the narrow change found in MR1, if any, to `apps/web/vercel.json`
- Functional Design (standard) settles: HUD layout at 320 and 1280 px, feedback timings, sign and chip sizes, setup page content, host state transitions, the hub "Easy is free" note

**Files**
- New: `apps/web/src/games/math-rally/{phaser/scenes/BootScene.ts, core/forkController.ts, phaser/audio/SoundBank.ts, i18n/gameText.ts, locales/{en,es,pt}.json, bridge/protocol.ts, bridge/__fixtures__/messages.json}`, `apps/web/src/pages/math-rally/{MathRallySetupPage.tsx, MathRallyGamePage.tsx, useMathRallyHost.ts, levelLocks.ts}`, `apps/web/src/games/math-rally/shared.ts`, `apps/web/src/__tests__/mathRallyRegistry.test.ts`, `apps/web/src/locales/__tests__/mathRallyLocaleCompleteness.test.ts` (main `mathRally` namespace and the game locale files, same pattern as `questLocaleCompleteness.test.ts`), credits manifest test, tests per module; final assets under `apps/web/public/games/math-rally/`
- Edited: `src/App.tsx`, `src/config/constants.ts`, `src/api/game.ts`, `src/api/leaderboard.ts`, `src/components/hub/GameTile.tsx`, `src/pages/hub/GameHubPage.tsx`, `src/components/leaderboard/GameTypeFilter.tsx`, `src/components/dashboard/RecentImprovements.tsx`, `src/pages/admin/AdminDashboard.tsx`, `src/pages/dashboard/{HistoryPage,AchievementsPage,StatisticsPage}.tsx`, `src/locales/{en,es,pt}.json`, and `vercel.json` only if MR1 found a needed source

**Completion criteria**
- Automated: every [U] criterion of FR-MK-6 to 24, 37, 40 to 44, 49 (TypeScript side), 56 (web), NFR-MK-9; import check for FR-MK-42; registry mutation suite
- Bundle report: Phaser and game code only in the lazy chunk (AC-41.1); entry chunk growth at most 2 KB gzip; game chunk at most 450 KB gzip; first-race assets at most 1.5 MB (NFR-MK-3); if the entry growth is over budget, the setup page is lazy-loaded too; any remaining miss is reported to the owner with options
- Manual checklist (written in Construction): 320 x 568 and 1280 x 720 layouts, four signs readable on the reference phone, lazy loading in the network panel (AC-41.2), StrictMode remount (AC-43.1), WebGL disabled (AC-44.1), keyboard scroll capture, reduced motion, sound off persists, FREE and paid setup states, enforced-CSP run
- Gate re-run on desktop Chrome and Safari with the full game

**Deploy implications**: Frontend only. Production deploy per the workspace rule: from `apps/web/`, `npx vercel link --project web-prod --yes && npx vercel --prod --yes`, then re-link to `web` and restore `.env.local`. Only after MR3 is live. Until the seed, the hub shows no tile (no catalog row); a direct visit to the route reaches `startGame`, which fails with "Theme not found" and returns to the hub with the generic message.

**Verify**: `cd apps/web && npx vitest run && npx tsc --noEmit && npm run build`

*Stories: MK-1, MK-2, MK-3, MK-4, MK-7, MK-8, MK-9, MK-10, MK-16, MK-17, MK-18, MK-20, MK-23, MK-24, MK-26, MK-27 (primary); MK-5, MK-11, MK-13, MK-22, MK-25, MK-28 (contributes) · Requirements: FR-MK-1 to 25, 35 to 37, 40 to 44, 49, 50 (web), 52 (web), 54 (checklist draft), 56 (web), NFR-MK-3 to 10, 16, 17, 19 to 22, 24*

---

## MR5 - App Host
- **Packages**: `apps/mobile`, plus T1 and G16 final in `apps/web` · **Size**: Large · **Depends on**: MR4 (game core and protocol), MR3 (live API for scored races)
- **Components**: A1 to A9, T1 and G16 (final)

**Scope**
- `flutter_inappwebview` pinned exactly; hardened settings; Android asset loader and iOS custom scheme with path allowlist; navigation filter
- Bridge and protocol in Dart (shared fixture), message builders with no route for tokens or user details
- Session additions (second start document, start payload, provider, `mathRallySubmission` allowlisted)
- Setup and play screens, lifecycle and Back handling, offline race, error overlays, result screen
- Registry entry, display meta, routes with quest parsing, paid copy with `kFreeDifficultiesInPaidGames`, partly-free hub tile, level lock rule
- Final embed build with `build-info.json`, committed bundle, `pubspec.yaml` asset folders, regenerated ARB files for the host strings
- Functional Design (standard) and NFR Requirements (minimal) settle: play-screen states and overlays, WebView settings per platform as confirmed in the MR1 spike, iOS audio session behaviour

**Files**
- New: `apps/mobile/lib/game/math_rally/{protocol,bridge,asset_server,math_rally_session,level_locks}.dart`, `apps/mobile/lib/ui/screens/games/math_rally_screens.dart`, `apps/mobile/assets/math_rally/**`, tests under `apps/mobile/test/math_rally/`
- Edited: `apps/mobile/pubspec.yaml`, `pubspec.lock`, `lib/api/game_api.dart`, `lib/api/game_models.dart`, `lib/game/framework/game_session.dart` (additive), `lib/game/game_registry.dart`, `lib/game/hub_logic.dart`, `lib/config/paid_games.dart` (and its parity test), `lib/stats/game_meta.dart`, `lib/ui/router.dart`, `lib/l10n/app_{en,es,pt}.arb` (generated), `android/app/src/main/AndroidManifest.xml` and `ios/Runner/Info.plist` only if the plugin requires entries; `apps/web/vite.math-rally-embed.config.ts`, `apps/web/scripts/build-math-rally-embed.mjs`, `apps/web/src/games/math-rally/embed/*`

**Completion criteria**
- Dart tests: protocol fixture parity, AC-47.1 (no token or user detail in any message), AC-49.1, AC-49.2, level locks and hub tiles (AC-56.2, 56.3), iOS asset allowlist, navigation filter, play-screen states with a fake `WebViewPort` and fake `GameApi`
- Existing app tests pass unchanged, including the paid-list parity test extended to the free-difficulty map
- Manual on the reference Android phone and the owner's iPhone: AC-45.1, 46.1, 46.2, 48.1, 50.1, 51.1, sound and silent switch, gate re-run with the full game inside the WebView
- App size growth at most 4 MB (NFR-MK-3); `flutter pub outdated` and licences recorded

**Deploy implications**: App store releases (Android built on Windows since `7f5db13`; iOS built and submitted from the owner's Mac). Older app versions never list Math Rally (registry). The release checklist runs the embed build with `--check-only` first.

**Verify**: `cd apps/mobile && flutter analyze && flutter test`; `node apps/web/scripts/build-math-rally-embed.mjs --check-only`

*Stories: MK-13, MK-14, MK-15, MK-21 (primary); MK-1, MK-2, MK-6, MK-9, MK-16, MK-18, MK-22, MK-23, MK-25, MK-26, MK-28 (app side, contributes) · Requirements: FR-MK-45 to 51, 52 (app), 56 (app), NFR-MK-3 (app), 16, 17 (app page), 18, 23*

---

## Pre-Launch Checks (not units)

| Id | Check | Source |
|---|---|---|
| PL1 | Gate passed on the full game (MR4 desktop, MR5 phones) | NFR-MK-1, MK-25 |
| PL2 | Credits manifest complete; IP review of every asset against NFR-MK-20 | MK-20, R7 |
| PL3 | Quick trademark search on "Math Rally" recorded | R6 |
| PL4 | Owner playtest of each difficulty with a child of the target age | R14 |
| PL5 | Paid-switch checklist (FR-MK-54) written, first step the per-difficulty gate check | AC-54.1 |
| PL6 | Production theme and catalog tables accept the rows (verify script, read-only, owner approval) | U14 |
| PL7 | Embed bundle matches source (`--check-only`) before each app release | FR-MK-51 |
