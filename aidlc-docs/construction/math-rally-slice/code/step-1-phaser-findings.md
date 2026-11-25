# MR1 Step 1 - Phaser 4.2.1 Findings

Read from `apps/web/node_modules/phaser` (version `4.2.1`, licence MIT, pinned exactly in `apps/web/package.json`).

| Item | Phaser 3 (design assumption) | Phaser 4.2.1 (found) | Source | Resolves |
|---|---|---|---|---|
| Default `loader.localScheme` | `['file://', 'capacitor://']` | Same | `src/core/Config.js` line 587 | U19 (literal) |
| Built-in texture keys | `__DEFAULT`, `__MISSING`, `__WHITE` | Same three, plus `__NORMAL` (made from a `Uint8Array`, no URL) | `src/textures/TextureManager.js` lines 206 to 221 | U20 (literal) |
| Built-in textures from files | `images.default`, `images.missing`, `images.white` | Same keys; `addBase64` sets the value as `image.src`, so a path works | `Config.js` 662 to 674, `TextureManager.js` 383 to 399 | U20 (setting exists) |
| Images without `blob:` | `loader.imageLoadType: 'HTMLImageElement'` | Same | `Config.js` 579, `loader/filetypes/ImageFile.js` 89 | U5 |
| Loop stop | `game.loop.stop()` | `TimeStep.stop` exists | `src/core/TimeStep.js` 895 | U21 (method) |
| Sound stop-all | `game.sound.stopAll()` | Exists | `src/sound/BaseSoundManager.js` 510 | U21 (method) |
| Console banner | `banner: false` hides it | Same; the banner uses a `data:` logo in console CSS only | `Config.js` 313 to 318, `DebugHeader.js` | - |
| Size | unknown | `dist/phaser.esm.min.js`: 1345 KB raw, **347 KB gzip** (level 9) | measured | U1, U3 (first number) |

## Finding to check in Steps 9 and 11

`src/device/CanvasFeatures.js` (`checkBlendMode`) loads two tiny PNGs from `data:` URLs into `Image` objects to test canvas blend modes. If it runs at boot, the app page policy (`img-src 'self'`, no `data:`) blocks both images. The block is harmless for a WebGL game (the result only sets `supportNewBlendModes` for the Canvas renderer) but it is a CSP violation, and the WebView pass rule allows none. Steps 9 and 11 record whether it fires. If it does, the options for the owner are: accept `data:` in `img-src` for the app page as the documented fallback of NFR-MK-17, or keep the policy and list this one violation as a known, harmless engine probe.

## Budget note

Phaser alone is 347 KB gzip of the 450 KB game-chunk budget (S-1), which leaves about 100 KB for the game code. The size script measures the real chunk in Step 8.

No missing capability: the unit continues.

## Owner decision (2026-11-25)

Option B: keep the app page policy at 'self' for every source and record the Phaser blend-mode probe as one known, harmless blocked request (owner: "I accept all your recommendations"). The WebView pass rule becomes: no violation other than this probe (one blocked `data:` image at module evaluation, `img-src`). Any other violation still fails.
