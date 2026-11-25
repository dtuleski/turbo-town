# MR1 Vertical Slice and Performance Gate - Code Generation Plan

This plan is the single source of truth for MR1 Code Generation. Steps run in order and are ticked when done. Steps marked **[owner]** need the owner at a device; everything else runs on the MacBook without help.

## Unit context

- **Unit**: MR1, `apps/web` (dev and gate builds only) plus a mobile spike on branch `spike/math-rally-webview` (never merged)
- **Design**: approved FD, NFR requirements and NFR design in `construction/math-rally-slice/`; methods file Sections 1 and 2; services Section 8
- **Stories**: MK-5, MK-6, MK-25 (primary); MK-3, MK-4, MK-7, MK-8, MK-9, MK-14, MK-17, MK-20, MK-21, MK-24 (contributes)
- **Depends on**: MR2 (done): track, layout and motion from `packages/shared/src/math-rally`
- **New dependencies**: `phaser` `4.2.1` exact (MIT) in `apps/web`; `flutter_inappwebview` `6.1.5` exact (Apache-2.0) on the spike branch only
- **Scope change from the owner**: the Android gate moves to a later stage (before MR5). MR1's gate runs on the owner's iPhone and desktop Chrome and Safari. The Android emulator still runs the functional spike checks.
- **Deploy**: none. Merging `apps/web` changes later would trigger a Vercel production build, but production builds contain no Math Rally code (checked by the isolation script). The work stays on `feat/math-kart`.

## Steps

All web paths are under `apps/web/`; `MR` = `src/games/math-rally/`.

- [x] **Step 1. Pin Phaser and confirm its literals** (U1, U3, U19 to U21)
  - Add `phaser@4.2.1` with an exact pin.
  - From Phaser 4's source, record: default `loader.localScheme` list, built-in texture keys, the loop stop and sound stop-all methods, and whether images can load as `HTMLImageElement` and built-in textures can point at files.
  - Measure the gzip size of the build the slice imports.
  - Any missing capability stops the unit and goes to the owner.
- [x] **Step 2. Pure core modules with Vitest tests** (G1, G4, G5, G7, G8, G10, G11)
  - `MR/core/shared.ts` (funnel to MR2), `clock.ts`, `trackRuntime.ts`, `lanes.ts`, `joystick.ts`, `quality.ts` (with the `localStorage` adapter), `projection.ts`, `engineConfig.ts`, `fatalErrorGuard.ts` (with `installPageErrorListeners` and the same-origin filter).
  - Tests per the unit's completion criteria: lanes, joystick and visibility, clock (60 s pause adds 0 s), motion through the runtime (clock readings only, clamp, no pause carried), quality rule, projection and `branchOffset` (0 at split and merge), `engineConfigFields` (no `data:` or `blob:`; schemes merged without duplicates), guard and listeners (one error, foreign origin ignored).
  - `MR/core/isolation.test.ts`: `core/` imports neither Phaser nor DOM-only modules.
- [ ] **Step 3. Fixture races**
  - `MR/__fixtures__/slice-easy.json` (2 paths, 10 forks) and `slice-hard.json` (4 paths, 15 forks), written by hand; a test checks each against MR2's option rules.
- [ ] **Step 4. Phaser layer** (G1 to G3, G9)
  - `MR/MathRallyEngine.ts` (mount, init, destroy; owns the guard), `MR/phaser/scenes/{BootScene,RaceScene,HudScene}.ts`, `MR/phaser/render/{roadRenderer,spritePool,forkRenderer,kartRenderer}.ts`, `MR/phaser/input/{keyboard,joystickView}.ts`, `MR/bridge/hostChannel.ts` (direct channel).
  - Countdown, pseudo-3D road with hills and curves, real fork branches, signs and lane chips, kart lean, boost and bumpy slowdown, finish line, HUD, pause (opaque), patterns of the NFR design (one road draw call, pools, no allocation per frame, profiles).
- [ ] **Step 5. Placeholder assets and credits**
  - Shapes drawn in code; a few CC0 sprites and sounds (Kenney); `public/games/math-rally/sys/{default,missing,white}.png`; one texture atlas; `public/games/math-rally/CREDITS.json` listing every file.
- [ ] **Step 6. Dev tools** (G17)
  - `MR/dev/frameOverlay.ts` (ring buffer, median and 1% low, CSV export, device label, Fault trigger on F8 and a button) and `MR/dev/violationRecorder.ts` (CSP violations and `data:` URLs).
- [ ] **Step 7. Slice page and dev-only route**
  - `src/pages/dev/MathRallySlicePage.tsx` with the FD states and test ids; lazy route `/dev/math-rally-slice` in `src/App.tsx` only when `import.meta.env.DEV` or the build mode is `gate`; `?race=`, `?touch=1`, `?mount=0`.
  - Route-table test: the route is absent in production mode (I-2).
- [ ] **Step 8. Checks and gate build**
  - `scripts/check-math-rally-size.mjs` (S-1 to S-3), `scripts/check-math-rally-isolation.mjs` (I-1).
  - `vite build --mode gate` and a preview config that sends either CSP as an enforced header (production web policy, app page policy).
- [ ] **Step 9. Desktop checks** (SEC-1, R-1, R-3, R-5)
  - Automated, headless Chromium and WebKit through Playwright run ad hoc with `npx` (not added to `package.json`): baseline run with `?mount=0`, then a race, under each policy; record violations and `data:` URLs; press the Fault trigger and check "The race stopped unexpectedly."
  - **[owner]** The same race once in real Chrome and real Safari on the MacBook, for the frame-rate numbers (step 12): written steps provided.
- [ ] **Step 10. Embed build (spike level)**
  - `vite.math-rally-embed.config.ts`, `scripts/build-math-rally-embed.mjs` (`--gate` includes the overlay); `MR/embed/{index.html,main.ts,pageGuard.ts}` with no inline script or style and the font loaded through `FontFace`.
- [ ] **Step 11. WebView spike** (branch `spike/math-rally-webview`, `apps/mobile`)
  - Add `flutter_inappwebview` `6.1.5`; a spike screen that serves the embed build from the app-internal origin (Android asset loader, iOS custom scheme `dashden-game://` with content type and length); bridge round trip; hardening settings; enforced CSP; loader statuses (image, atlas, audio, missing file); a build without `sys/white.png`; Fault trigger overlay and Back; airplane mode; audio unlock.
  - Android emulator: every functional item, plus the composition modes offered and the default.
  - **[owner]** iPhone: install with `flutter run` from this Mac (phone unlocked); play the checklist and the silent-switch test. CSV and logs come back through the app's Documents folder, pulled with `xcrun devicectl`.
  - Any checklist item that fails on `6.1.5` is retried on `6.2.0-beta.3`; failing both stops the unit and goes to the owner.
- [ ] **Step 12. Gate runs** (P-1, P-2)
  - **[owner]** iPhone (spike WebView): 3 Hard races with a mix of answers; slow-motion video of 5 lane changes.
  - **[owner]** Desktop Chrome and Safari: 3 Hard races each in the gate build.
  - Compute median and 1% low from the CSVs; lane-change latency from the videos.
  - Android: not in MR1 (later stage).
- [ ] **Step 13. Gate report**
  - `aidlc-docs/construction/math-rally-slice/gate-report.md` with every field of the unit's completion criteria; a failing gate stops here and goes to the owner with options (no automatic switch).
- [ ] **Step 14. Verify and summarise**
  - `npx vitest run`, `npx tsc --noEmit`, `npm run build`, isolation script (no Phaser in production), size script on the gate build; existing web tests unchanged.
  - Security Baseline re-check for the unit.
  - `aidlc-docs/construction/math-rally-slice/code/implementation-summary.md`.

## Story traceability

| Story | Steps |
|---|---|
| MK-5 (steer into an answer lane) | 2, 4, 7 |
| MK-6 (touch joystick) | 2, 4 |
| MK-25 (runs smoothly on phones) | 4, 11, 12, 13 |
| MK-3, MK-4, MK-7, MK-8, MK-9 (countdown, reading, feedback, pause, HUD) | 4 |
| MK-14 (crash handling) | 2, 6, 9, 11 |
| MK-17, MK-20, MK-21, MK-24 (accessibility basics, privacy, IP, CSP) | 4, 5, 9, 11 |

## Size

14 steps; about 35 new files in `apps/web` plus the spike branch. Large. Owner time: steps 9 (two desktop races), 11 (iPhone checklist, about 20 minutes) and 12 (iPhone and desktop gate runs, about 30 minutes).
