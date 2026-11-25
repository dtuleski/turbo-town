# MR1 Vertical Slice - NFR Requirements

Owner answers: all recommended options of `construction/plans/math-rally-slice-nfr-requirements-plan.md`. Each requirement below has a measurement method and a pass rule; results go to `construction/math-rally-slice/gate-report.md`.

## 1. Performance

| Id | Requirement | Method | Pass |
|---|---|---|---|
| P-1 (NFR-MK-1) | Frame rate over a full race | Gate protocol of the FD (`business-rules.md` Section 2): Hard fixture race, 3 runs per device and Android composition mode. Frame times from the `requestAnimationFrame` timestamp of each running frame (owner answer Q3); the race clock reading is recorded beside it | Median >= 50 fps and slowest 1% >= 30 fps in every run |
| P-2 (NFR-MK-2) | Input response | Slow-motion video (>= 240 fps) of 5 lane changes per device; count frames from the key or touch to the first visible kart movement | Every change <= 100 ms |
| P-3 | Android composition modes | Measure P-1 in each platform-view mode the plugin offers (expected: hybrid composition and texture layer); record the default | The shipping mode passes P-1 (the faster median if both pass) |
| P-4 | Quality fallback | The `low` profile is entered only by the FD rule (120 samples, median > 20 ms) | Recorded per run: start profile, switch frame |

Android is a later stage (owner answer 1a D): MR1's gate runs on the iPhone and desktop; P-1 to P-3 on Android run before MR5 on the reference phone named then. The emulator is never used for P-1 to P-3; it still runs the functional spike checks.

## 2. Size budgets (NFR-MK-3, first measurement)

| Id | Budget | Pass |
|---|---|---|
| S-1 | Math Rally game chunk(s) | <= 450 KB gzip |
| S-2 | Assets needed for the first race | <= 1.5 MB |
| S-3 | Entry chunk growth against `main` | <= 2 KB gzip |

**Method (owner answer Q2):** `apps/web/scripts/check-math-rally-size.mjs` runs after `vite build`. It gzips every output file at level 9 with Node's `zlib`, sums the Math Rally lazy chunks (S-1) and the files under `public/games/math-rally/` loaded by the first race (S-2), and compares the entry chunk with a build of the merge base on `main` (S-3). It prints a table and exits non-zero above a budget. In MR1 the dev chunk is measured from the gate build (`--mode gate`), since production builds contain no Math Rally code.

## 3. Production isolation

| Id | Requirement | Method (owner answer Q6) | Pass |
|---|---|---|---|
| I-1 | No Phaser or Math Rally code in production builds before MR4 | `apps/web/scripts/check-math-rally-isolation.mjs` reads every chunk of the production build (`npm run build`) and searches for Phaser's version banner, the `math-rally` route and the slice page's module id | No match; part of the MR1 verify step |
| I-2 | The dev route exists only in dev and gate builds | Unit test of the route table under each mode | Route absent in production mode |

## 4. Reliability

| Id | Requirement | Method | Pass |
|---|---|---|---|
| R-1 (FR-MK-44, AC-44.2) | A crash inside the game stops it and shows the race-stopped message | Fault trigger (F8 or the overlay button) throws inside a tween callback during a race | Slice shows "The race stopped unexpectedly." with Back; loop and sound stopped |
| R-2 (AC-48.2) | Same in the app spike | Fault trigger in the spike WebView | Race-stopped overlay; its button and Android Back leave |
| R-3 (AC-44.3) | Guard unit behaviour | Vitest cases of `services.md` Section 8 | All pass |
| R-4 | A game that never sends `ready` | 20 s timeout | "The race could not load." |
| R-5 (FD Q7) | Foreign-origin errors do not end a race on web | Unit test with an `error` event whose filename is another origin | Ignored and recorded |

## 5. Security (Security Baseline, enforced)

| Id | Requirement | Pass |
|---|---|---|
| SEC-1 (NFR-MK-17) | Desktop CSP: production web policy and the app page policy, each with the baseline run | Race adds no violation over the baseline |
| SEC-2 | WebView CSP `'self'` for every source, enforced | No violation at all; any `blob:` or `data:` allowance only if the engine cannot avoid it, documented |
| SEC-3 | WebView hardening checklist (tech-stack decisions Section 2) | Every item set and verified on both platforms |
| SEC-4 | No token, cookie or API call inside the WebView (inception Q24) | The spike page makes no network request outside the app-internal origin (recorded by the loader log) |
| SEC-5 | Licences (owner answer Q4) | Code: MIT, BSD, Apache-2.0 or ISC. Assets: CC0 or original, each in `CREDITS.json` |

## 6. Maintainability

- Every `core/*` module has Vitest unit tests (completion criteria of the unit).
- Exact version pins for new dependencies (no `^` or `~`).
- The slice and spike code paths are marked dev or gate only and removed or replaced in MR4 and MR5.

## 7. Platform minimums

- iOS 15.0 (unchanged).
- Android: the app's `minSdk` may be raised to what the plugin needs if that is 24 (Android 7.0) or lower; above 24 the owner decides (owner answer Q5). On the spike branch only; MR5 makes it final.
