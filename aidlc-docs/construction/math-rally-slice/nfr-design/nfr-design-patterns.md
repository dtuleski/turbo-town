# MR1 Vertical Slice - NFR Design Patterns

Each pattern names the requirement it serves (`nfr-requirements/nfr-requirements.md`).

## 1. Frame loop and delta clamp (P-1, FR-MK-30)

- One loop: Phaser's game loop calls `RaceScene.update` once per frame. Nothing else schedules frames.
- Motion uses the race clock, never Phaser's `delta`: `dt = clamp(clock.elapsedMs(now) - lastElapsed, 0, 50)` and `advanceMotion` from `packages/shared` (MR2). Rendering reads the resulting `Motion`.
- The frame overlay records the frame's `requestAnimationFrame` timestamp (Phaser's `time` argument) for the gate, and the clock reading beside it (P-1, owner answer Q3).
- `visibilitychange` to hidden pauses the race clock and puts the scenes to sleep; resuming never carries the paused time (FR-MK-30).

## 2. Road rendering (P-1)

- Classic segment projection: for each segment within the draw distance, project its near edge with `projectPoint` and draw the quad between consecutive segments.
- Draw order back to front for sprites; road quads front to back with a running `maxY` clip, so hidden quads are skipped (no overdraw for hills).
- All road quads of a frame go into one `Graphics` object that is cleared and redrawn each frame (one draw call for the road). If P-1 fails, the next lever is a pre-allocated vertex mesh instead of `Graphics` (the "vertex batch" lever of the gate rule).
- Fork branches use `branchOffset` from the FD, drawn as extra quads per branch; the grass between branches is the background colour, not extra geometry.

## 3. No allocation per frame (P-1)

- Projection results go into pre-allocated arrays sized to the high profile's draw distance (300 entries); no objects are created in `update`.
- Sprite pool: a fixed pool of roadside sprites (trees, fences, posts), sized to the maximum visible count; each frame assigns pool entries to visible objects and hides the rest.
- Signs: one pool of `paths` sign containers (4 at most), reused per fork; their text is set once when the fork's question arrives.
- Particles (boost puffs, bump dust): emitters created once at scene start, started and stopped, never re-created.
- The frame overlay writes into a pre-allocated `Float64Array` ring (20 000 frames, enough for a full Hard race at 60 fps); the CSV string is built only on export.

## 4. Level of detail and quality profiles (P-1, P-4)

| Lever | `high` | `low` |
|---|---|---|
| Draw distance | 300 segments | 150 segments |
| Render scale | 1.0 | 0.75 |
| Roadside sprites | every segment | every second segment |
| Sprites beyond 60% of the draw distance | drawn | skipped |
| Hills parallax layers | 3 | 1 |
| Particles | on | off |

- Render scale sets the canvas's internal resolution: CSS size x min(devicePixelRatio, 2) x renderScale; the canvas is stretched to its CSS size.
- `chooseProfile` runs once per second from "Go"; switching to `low` applies every lever in the same frame and stores the choice (FD Section 5).

## 5. Textures and text (P-1, SEC-1, SEC-2)

- One texture atlas for every sprite (kart, signs, roadside objects, particles), to keep texture switches low. Images load as `HTMLImageElement` (no `data:` or `blob:` URLs).
- Built-in textures point at `sys/default.png`, `sys/missing.png` and `sys/white.png` (engine config); BootScene checks them before `ready`.
- Text uses Phaser text objects (canvas textures uploaded to the GPU; no image URL is created). Sign and banner text is set once per fork, not per frame. The CSP checks record whether any text path requests a `data:` URL.

## 6. Input response (P-2)

- Keyboard: `keydown` events change the target lane at once; the kart's lean and lateral tween start in the same frame.
- Joystick: pointer events feed `joystickStep`; a crossing of the threshold produces the action in the same event.
- Lane changes are never queued behind a frame: the action updates state, the next frame renders it (at 60 fps the first movement is visible within about 17 to 33 ms).

## 7. Error containment (R-1 to R-5)

- `fatalErrorGuard` is installed before the engine mounts (slice page) or as the first import (embed page).
- `RaceScene.update` and `HudScene.update` wrap their bodies in `try/catch` and pass any error to the guard, which stops the loop and sound, then sends one `error` (first error wins).
- Web filter: `error` events count only when `event.filename` starts with the page origin; `unhandledrejection` counts only while the game is mounted (FD Q7).

## 8. Build isolation (S-3, I-1, I-2)

- The slice route is declared inside `if (import.meta.env.DEV || import.meta.env.MODE === 'gate')`, so production builds tree-shake it and its lazy import of Phaser.
- The isolation script (I-1) fails the verify step if a production chunk contains Phaser or Math Rally code.
