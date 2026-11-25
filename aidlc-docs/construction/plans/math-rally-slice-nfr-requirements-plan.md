# MR1 Vertical Slice - NFR Requirements Plan

**Unit**: MR1 Vertical Slice and Performance Gate, depth Standard
**Basis**: approved functional design (`construction/math-rally-slice/functional-design/`), NFR-MK-1 to 3, 5, 14, 17, 18, execution plan Section 3 (NFR Requirements scope for MR1)
**Scope from the execution plan**: Phaser version pin and licence; size budget method; frame-time measurement method (per Android composition mode); WebView plugin pin and feature checklist; CSP check method; fault-injection check of the top-level error handler.

## Facts found

- **Phaser**: `4.2.1` is npm `latest` (2026-07-09), MIT. The npm package is about 112 MB unpacked (sources, types and several builds); only the imported build counts toward the bundle.
- **WebView plugin**: the design's candidate `flutter_inappwebview` has its last stable release `6.1.5` from 2024-10-08; the newest is `6.2.0-beta.3` (2026-02-04); its repository was last pushed 2026-02-10 and has 233 open issues. The official `webview_flutter` is current (`4.14.1`, 2026-07-07). As far as I know it has no iOS custom-scheme handler and no Android asset-loader origin in its public API, which the design relies on (A5, U6, U16, U19); not checked against its source yet.
- **App minimums**: iOS 15.0; Android `minSdk` is Flutter's default.

## Plan

- [x] 1. Answer the questions below (owner): all recommended options (A)
- [x] 2. Resolve any ambiguous answer: none needed
- [x] 3. Write `construction/math-rally-slice/nfr-requirements/nfr-requirements.md` (performance, size, reliability, security and measurement methods, with pass rules)
- [x] 4. Write `construction/math-rally-slice/nfr-requirements/tech-stack-decisions.md` (Phaser pin, WebView plugin and fallback order, build tooling, licence rules)
- [ ] 5. Present for approval

## Questions

## Question 1
Which WebView plugin does the spike use?

A) `flutter_inappwebview` `6.1.5` (stable, the design's candidate) first. If any item of the feature checklist fails (asset loader, iOS custom scheme and loader status, JavaScript handlers, hardening settings, composition modes), retry that item on `6.2.0-beta.3`. If both fail, stop and bring options to the owner (for example `webview_flutter` with a local HTTP server, which needs a design change). (Recommended)
B) `flutter_inappwebview` `6.2.0-beta.3` from the start (newer fixes, but a beta in a shipped app)
C) `webview_flutter` with a small local HTTP server inside the app (official and current, but changes the design's app-internal origin and adds a server)
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "MR1: use the recommendations")

## Question 2
How is the game's download size measured against the budgets (game chunk at most 450 KB gzip, first-race assets at most 1.5 MB, entry chunk growth at most 2 KB)?

A) A script after `vite build` gzips each output file at level 9 with Node's `zlib`, sums the Math Rally lazy chunks and the first-race assets, and compares the entry chunk with the same build of `main`; it prints a table and fails above a budget. (Recommended)
B) Read the sizes Vite prints at the end of the build, by hand
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "MR1: use the recommendations")

## Question 3
Which clock feeds the frame-time numbers of the gate?

A) The `requestAnimationFrame` timestamp of each frame, recorded beside the race clock reading; the gate uses the frame timestamps (what the player sees), the race uses the clock (Recommended)
B) The race clock readings only (simpler, but they exclude paused time and are floored to whole ms)
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "MR1: use the recommendations")

## Question 4
Which licences are allowed for code and assets added by Math Rally?

A) Code dependencies: MIT, BSD, Apache-2.0 or ISC. Art and sound: CC0 or made for the project. Each asset in `CREDITS.json`; each new dependency's licence recorded in the tech-stack decisions. (Recommended)
B) Same as A, and CC-BY assets are also allowed if credited in the app
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "MR1: use the recommendations")

## Question 5
If the plugin needs a higher Android minimum version than the app has today, what happens?

A) Raise the app's Android `minSdk` to what the plugin needs, if it is 24 (Android 7.0) or lower, and record it; above 24, ask the owner (Recommended)
B) Never raise it; pick another plugin version instead
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "MR1: use the recommendations")

## Question 6
How strict is the production-isolation check (no Phaser or Math Rally code in production builds before MR4)?

A) Automated: a script inspects the production build's chunks and fails if any contains Phaser or the slice route; it runs as part of the MR1 verify step (Recommended)
B) Manual check of the bundle report once at the end of MR1
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "MR1: use the recommendations")
