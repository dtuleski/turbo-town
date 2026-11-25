# MR1 Vertical Slice - Logical Components

All paths under `apps/web/`. "Pure" means no Phaser, no DOM, unit-tested with Vitest in Node.

| Component | Path | Kind | Responsibility | NFR |
|---|---|---|---|---|
| Shared funnel | `src/games/math-rally/core/shared.ts` | Pure | Re-exports track, layout and motion from `packages/shared/src/math-rally` | P-1 |
| Race clock (G10) | `core/clock.ts` | Pure | Integer ms, paused time excluded | P-1 |
| Track runtime (G5) | `core/trackRuntime.ts` | Pure | Frame rule, events at lines | P-1 |
| Lanes (G7) | `core/lanes.ts` | Pure | Lane state and moves | P-2 |
| Joystick (G8) | `core/joystick.ts` | Pure | Threshold, repeat, visibility | P-2 |
| Quality (G11) | `core/quality.ts` | Pure plus storage adapter | `chooseProfile`, stored choice | P-4 |
| Projection (G4) | `core/projection.ts` | Pure | `projectPoint`, `branchOffset` | P-1 |
| Engine config (G1) | `core/engineConfig.ts` | Pure | Phaser config fields, local schemes, built-in texture paths | SEC-1, SEC-2 |
| Fatal-error guard (G1) | `core/fatalErrorGuard.ts` | Pure plus listener installer | One error, loop and sound stop, origin filter | R-1 to R-5 |
| Engine facade (G1) | `MathRallyEngine.ts` | Phaser | Mount, init, destroy; owns the guard | R-1 |
| Boot scene (G2) | `phaser/scenes/BootScene.ts` | Phaser | Atlas and sounds, built-in texture check, `ready` | R-4 |
| Race scene (G3) | `phaser/scenes/RaceScene.ts` | Phaser | Road, fork, kart, signs, chips; calls the track runtime | P-1 |
| HUD scene (G9) | `phaser/scenes/HudScene.ts` | Phaser | Banner, fork count, coins, time, pause button | - |
| Road renderer | `phaser/render/roadRenderer.ts` | Phaser | One `Graphics` per frame, `maxY` clip | P-1 |
| Sprite pool | `phaser/render/spritePool.ts` | Phaser | Fixed pool, show and hide | P-1 |
| Input | `phaser/input/keyboard.ts`, `phaser/input/joystickView.ts` | Phaser | Keys and pointer to lane actions | P-2 |
| Host channel (G15) | `bridge/hostChannel.ts` | Pure | Direct channel for the slice page | - |
| Frame overlay (G17) | `dev/frameOverlay.ts` | DOM, dev only | Ring buffer, stats, CSV, Fault trigger | P-1 |
| Violation recorder (G17) | `dev/violationRecorder.ts` | DOM, dev only | `securitypolicyviolation` and `data:` URL log | SEC-1, SEC-2 |
| Embed page (G16) | `src/games/math-rally/embed/*` | DOM | `pageGuard.ts` first, then the engine; no inline script or style | SEC-2, R-2 |
| Slice page | `src/pages/dev/MathRallySlicePage.tsx` | React, dev only | Host role, states of the FD | - |
| Size check | `scripts/check-math-rally-size.mjs` | Node | S-1 to S-3 | S-1 to S-3 |
| Isolation check | `scripts/check-math-rally-isolation.mjs` | Node | I-1 | I-1 |
| Embed build | `vite.math-rally-embed.config.ts`, `scripts/build-math-rally-embed.mjs` | Node | Bundled files for the spike, `--gate` | R-2 |

Dependencies point one way: Phaser components use pure components; pure components never import Phaser or the DOM (checked by a test that reads the `core/` files, like MR2's isolation test).
