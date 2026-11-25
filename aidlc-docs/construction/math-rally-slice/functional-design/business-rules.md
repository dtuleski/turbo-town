# MR1 Vertical Slice - Business Rules

## 1. Gate devices

| Device | Status | How |
|---|---|---|
| Reference Android phone | **Open** (owner question 1a) | Spike WebView, each composition mode the plugin offers |
| Owner's iPhone (`iPhone18,3`, iPhone 17 Pro) | Confirmed (Q2 A) | Spike WebView |
| Desktop Chrome and Safari | Confirmed | Gate build in `vite preview` on the MacBook |

The Android emulator (`turbo_pixel`) is used for the functional spike checks of step 8 only, never for frame-rate numbers.

## 2. Gate run protocol (owner answer Q5)

- G-1 A run is the Hard fixture race (4 paths, 15 forks), played to the finish with a mix of right and wrong answers (at least 4 of each).
- G-2 3 runs per device, and on Android per composition mode.
- G-3 Frame times come from the dev frame overlay (G17) using the race clock's readings, from "Go" to the finish; the countdown is excluded.
- G-4 A run passes when median frame rate >= 50 fps and the slowest 1% of frames >= 30 fps.
- G-5 The device passes when all 3 runs pass. Input response passes when a lane change shows visible kart movement within 100 ms on a slow-motion video (at least 240 fps), measured on 5 lane changes.
- G-6 On Android the shipping composition mode is the one that passes; if both pass, the faster median.
- G-7 Every fatal-error guard report during a gate run is a finding: a cause in Math Rally code is fixed before MR4; a cause inside Phaser goes to the owner with options.
- G-8 If the gate fails after the levers (draw distance, render scale, level of detail, vertex batch, painted-lane fork, the other composition mode), work stops and the owner decides. No automatic switch of engine or design.

## 3. Pass rule for the CSP checks

As written in `inception/application-design/math-rally-services.md` Section 8: on desktop, a baseline run with `?mount=0` lists the host shell's own violations (expected: Google Fonts under the app page policy); a race run passes when it adds no violation. In the WebView no violation at all is allowed.

## 4. Error messages (owner answer Q6)

| Phase | Codes | Message |
|---|---|---|
| Before `ready` | `ENGINE_START_FAILED`, `ASSET_LOAD_FAILED`, any other code, or the 20 s `ready` timeout | "The race could not load." (existing design, R-D9) |
| After `ready`, the game refuses `init` | `INIT_INVALID` | "Could not start the race." (owner answer Q6, matches services 5.1) |
| From the countdown to the finish | `CONTEXT_LOST`, `INTERNAL` or any other code | "The race stopped unexpectedly." |

The methods file's host mapping and R-D9 in the components file now carry the `INIT_INVALID` exception.

## 5. Guard filter (owner answer Q7)

| Event | Reacts when | Otherwise |
|---|---|---|
| `error` | `event.filename` starts with the page's origin | Recorded (dev builds), ignored |
| `unhandledrejection` | The game core is mounted | Ignored |

## 6. Assets and credits (owner answer Q8)

- Shapes drawn in code plus a few CC0 sprites and sounds (Kenney or similar CC0 sources).
- Every file is listed in `apps/web/public/games/math-rally/CREDITS.json` with source URL, author, licence and date.
- The kart is an original simple shape; nothing that resembles an existing game's kart, character, item or logo (NFR-MK-20).

## 7. Production isolation

- The route `/dev/math-rally-slice` exists only when `import.meta.env.DEV` is true or the build mode is `gate`.
- Production builds contain no Phaser module and no Math Rally code outside the dev chunk (bundle report check).
