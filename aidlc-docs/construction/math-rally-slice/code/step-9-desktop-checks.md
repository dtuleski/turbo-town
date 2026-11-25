# MR1 Step 9 - Desktop Checks (automated part)

Run on 2026-11-25 against the gate build (`vite build --config vite.math-rally-gate.config.ts --mode gate`) served by `vite preview` with each policy sent as an enforced `Content-Security-Policy` header. Headless Chromium (SwiftShader) and WebKit through Playwright (`scripts/check-math-rally-desktop.cjs`, Playwright installed in a scratch folder, not in `package.json`). Raw results: `mr-desktop-app.json`, `mr-desktop-web.json`.

| Check | Chromium, app policy | WebKit, app policy | Chromium, web policy | WebKit, web policy |
|---|---|---|---|---|
| Baseline (`?mount=0`) CSP violations | 1 (`img-src`, `data:`) | 1 (`img-src`, `data:`) | 0 (one `data:` image allowed by the policy) | 0 (same) |
| Extra violations during a Hard race (12 s) | 0 | 0 | 0 | 0 |
| Race reaches `running` | yes | yes | yes | yes |
| Fault trigger (F8, throw inside a tween) | "The race stopped unexpectedly." | same | same | same |
| Uncaught errors other than the fault | none | none | none | none |

Pass rule (`services.md` Section 8): the race adds no violation over the baseline. **Passes** in all four runs (SEC-1, R-1 first check, R-5 path exercised by the guard).

## The one `data:` image

It comes from the Math Rally chunk itself, at module evaluation (the slice page imports the engine statically): Phaser 4.2.1's `CanvasFeatures.checkBlendMode` loads a tiny PNG from a `data:` URL to probe Canvas blend modes (Step 1 finding). It fires before any mount, so the baseline run already contains it. Under the app page policy the browser blocks it; the game is unaffected (WebGL renderer). The WebView rule allows no violation at all, so this needs an owner decision before MR5 (options in the Step 1 findings).

## Host shell findings (expected, not Math Rally)

- Under the app page policy the shell's Google Fonts stylesheets are blocked (`style-src 'self'`), as the design expected.
- `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` return 404 in a local preview (they exist only on Vercel).

## Visual check

Screenshots after the fixes in `screens/` (desktop 1280 x 720 and phone 390 x 844 with the touch joystick). The first screenshots showed: road not reaching the bottom of the screen, signs covering the view when very close, kart too large and behind the joystick, lane chips staying after the decision line. All four were fixed before this record.

## Still to do (owner)

Frame-rate numbers are not taken here: headless browsers render in software. The owner plays the Hard race in real Chrome and real Safari on the MacBook (Step 12).
