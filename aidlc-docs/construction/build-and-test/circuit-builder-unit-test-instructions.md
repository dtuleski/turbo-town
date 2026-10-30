# Circuit Builder - Unit Test Execution

**Created**: 2026-10-30
**Stage**: CONSTRUCTION - Build and Test

**Note on file naming**: `unit-test-instructions.md` already exists from the original Memory Game project; this file is kept separate.

Run each package separately. There is no root `npm test`, and `apps/web` has **no `test` script** (use `npx vitest run`).

## Commands and measured results

| Package | Command | Result measured at HEAD `a328c74` (uncommitted tree) | Before Circuit Builder |
|---|---|---|---|
| `packages/shared` | `cd packages/shared; npx jest` | **18 suites, 363 tests, all pass** | 5 suites, 52 tests (the engine added 12 suites and 171 tests; unit U4's levels brought it to 363) |
| `apps/web` | `cd apps/web; npx vitest run` | **31 files, 629 tests, all pass** | 12 files, 220 tests |
| `services/game` (Circuit Builder only) | `cd services/game; npx jest circuit` | **4 suites, 125 tests, all pass** | 0 (the package baseline was RED, see below) |
| `services/leaderboard` | `cd services/leaderboard; npx jest` | **12 suites: 9 pass, 3 fail. 175 tests pass, 9 fail** | 107 tests ran; 3 suites could not compile |

Type-checks, all measured exit 0: `packages/shared`, `services/game`, `services/leaderboard`, `apps/web` (`npx tsc --noEmit`).

## What the tests prove, and what they cannot

**Proven by automated tests**
- The solver is correct, including a **Wheatstone bridge** checked against an independent Thevenin calculation (the case that justifies using nodal analysis).
- Series breaks the whole chain; parallel branches survive; series bulbs receive less current than the same bulbs in parallel.
- Fault detection: short circuit, overcurrent, reversed polarity, singular system.
- Every authored level is **solvable** (its reference solution passes `evaluateSuccess` against the real engine) and its obvious wrong answers fail. Every difficulty 1 to 4 has a completable level.
- Server-side: Free tier is refused before theme lookup; paid tiers accepted; out-of-bounds or unknown-kind input is rejected with one generic message; a layout that fails the objective earns no score; a protected LED circuit out-scores an unprotected one at every reported fault count 0 to 20.
- The game identifier is identical in the Game Service, the Leaderboard, and the web app, and the **registry check fails when an entry is removed** (independently confirmed: deleting the `GAME_FILTER_MAP` entry made 2 of 16 registry tests fail, with a message naming `GAME_FILTER_MAP`).
- Es and pt locales have exact key parity with en for the whole `circuitBuilder` block.
- Audio never creates its context on a hover (4 regression tests).
- The sandbox module graph does not import the game API wrapper.

**NOT proven by any automated test** (no jsdom, no testing-library, no browser tooling exists in `apps/web`)
- Anything drawn on the canvas, drag and touch behaviour, keyboard behaviour in a real browser, the rover's appearance, tooltip placement, audio playback, reduced-motion visuals, and mobile layout. See the manual checklist in `circuit-builder-build-and-test-summary.md`.

## Pre-existing failures (do NOT fix as part of this feature)

| Where | Failures | Cause |
|---|---|---|
| `services/leaderboard` | 9 tests in 3 suites | 6 are `auth.util` tests expecting a mock signature after the implementation moved to real RSA verification against Cognito JWKS (the code got safer, the tests are stale); 2 are Language Learning multiplier tests pinned to the current 1.0 fallback and labelled a confirmed latent bug; 1 is `leaderboard.repository.test.ts` line 108 |
| `services/game` | 2 suites fail to compile | 25 TypeScript errors that predate this work |
| `apps/web` lint | about 89 errors | in files this feature never touched; the new files lint clean when run on their own |

## If a test fails

1. Run only that package, with its own command from the table.
2. For `services/game`, run suites individually: `npx jest circuit-score` and so on.
3. A failure in `circuitBuilderRegistry.test.ts` names the missing registry. Add the entry; do not weaken the test.
4. If the Circuit Builder game tests fail with "cannot find module", rebuild `packages/shared` first.

## Output rendering tip

If a long command prints only its echo in the Kiro terminal, send output to a file and read the file, for example `npx vitest run > $env:TEMP\out.txt 2>&1`.
