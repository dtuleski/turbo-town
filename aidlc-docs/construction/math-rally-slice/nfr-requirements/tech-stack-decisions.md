# MR1 Vertical Slice - Tech Stack Decisions

## 1. Game engine

| Decision | Value | Reason |
|---|---|---|
| Engine | Phaser `4.2.1`, exact pin in `apps/web/package.json` | npm `latest` (2026-07-09), stable 4.x since `4.0.0` (2026-04-10); chosen at inception (Q1) |
| Licence | MIT | Allowed (Q4) |
| Import | The ES module build, imported only by `apps/web/src/games/math-rally/**`, loaded through a lazy route | Keeps Phaser out of the entry chunk (S-3) |
| To confirm in Code Generation | Gzip size of the imported build (U3), `loader.localScheme` defaults (U19), built-in texture keys (U20), loop and sound stop methods (U21) | Literals in `core/engineConfig.ts` updated where they differ from Phaser 3 |

## 2. WebView plugin (spike branch `spike/math-rally-webview` only, owner answer Q1)

Order:
1. `flutter_inappwebview` `6.1.5` (stable, 2024-10-08), exact pin.
2. For any checklist item that fails on `6.1.5`: retry that item on `6.2.0-beta.3` (2026-02-04).
3. If an item fails on both: stop and bring options to the owner (for example `webview_flutter` with a local HTTP server, which changes the design's app-internal origin).

The version that passes is recorded for MR5. Maintenance risk: the plugin's last stable release is over two years old; the gate report records it as a risk whatever the result.

Feature checklist (each item on Android and iOS):

| # | Item | Design reference |
|---|---|---|
| 1 | Serve bundled files from an app-internal origin (Android asset loader; iOS custom scheme `dashden-game://`), with content type from the extension and content length | A5, U6 |
| 2 | Loader status for a present and a missing file through Phaser's loader (image, atlas JSON, audio, missing) | U19, AC-46.3 |
| 3 | JavaScript message channel both ways (`ready`, `init`, `pauseChanged`, `raceFinished`, `error`) | G14, A4 |
| 4 | CSP `'self'` enforced on the custom scheme | U16 |
| 5 | Hardening: file access off, content access off, universal and file-URL access off, navigation limited to the app-internal origin, no mixed content, no geolocation or media permission prompts, no third-party cookies, remote debugging only in debug builds, zoom off, text selection and long-press menu off | SEC-3 |
| 6 | Android platform-view composition modes offered and the default | U18 |
| 7 | Audio: unlock after the first touch; behaviour with the iOS silent switch | R3 |
| 8 | Airplane mode: the race still loads and runs | Offline race (MR5) |

## 3. Build and tools

| Tool | Use |
|---|---|
| Vite (existing) | Dev route; `--mode gate` build for gate runs and the desktop CSP check through `vite preview` with an enforced policy header |
| `apps/web/vite.math-rally-embed.config.ts` and `scripts/build-math-rally-embed.mjs` | Embed build for the WebView (spike level, `--gate` includes the dev overlay) |
| Vitest (existing) | Unit tests of `core/*` |
| Node `zlib` script | Size budgets (S-1 to S-3) |
| Node isolation script | Production isolation (I-1) |
| Flutter 3.44.8, Xcode 26.6 on the MacBook | Spike on the owner's iPhone and the Android phone |

## 4. Licence rules (owner answer Q4)

- New code dependencies: MIT, BSD, Apache-2.0 or ISC; each recorded here with its licence. MR1 adds Phaser (MIT) to `apps/web` and `flutter_inappwebview` (Apache-2.0) to the spike branch only.
- Art and sound: CC0 or made for the project; every file in `apps/web/public/games/math-rally/CREDITS.json` (source, author, licence, date).
- No asset that resembles an existing game's kart, character, item or logo (NFR-MK-20).
