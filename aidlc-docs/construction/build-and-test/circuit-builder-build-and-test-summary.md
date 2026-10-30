# Circuit Builder - Build and Test Summary

**Created**: 2026-10-30
**Stage**: CONSTRUCTION - Build and Test
**State**: all work is **uncommitted** in the working tree. HEAD is `a328c74`. Nothing was committed, pushed, merged, or deployed. No seed script was run. The only AWS calls made were read-only (identity and table listing).

**Note on file naming**: `build-and-test-summary.md` already exists from the original Memory Game project; this file is kept separate.

## Build status

| Package | Type-check | Build | Notes |
|---|---|---|---|
| `packages/shared` | exit 0 | exit 0 | `dist` exposes 9 levels, difficulties 1 to 4, `evaluate`, `evaluateSuccess` |
| `services/game` | exit 0 | not separately run | Packaged by CI or `deploy-lambdas.sh` |
| `services/leaderboard` | exit 0 | not separately run | Was exit 1 with 30 errors before unit U1 |
| `apps/web` | exit 0 | exit 0, 1548 modules | Bundle grew about 45 kB gzip |

## Test execution summary

| Suite | Total | Passed | Failed | Status |
|---|---|---|---|---|
| `packages/shared` | 363 | 363 | 0 | Pass |
| `apps/web` | 629 | 629 | 0 | Pass |
| `services/game` Circuit Builder | 125 | 125 | 0 | Pass |
| `services/leaderboard` | 184 | 175 | 9 | **9 pre-existing, unchanged, documented** |
| `services/game` full package | n/a | n/a | n/a | 2 suites cannot compile (25 pre-existing TS errors); not run as a whole |

**Integration tests**: no automated cross-service or end-to-end test exists or was run (see `circuit-builder-integration-test-instructions.md`). Contract agreement between the three code bases is covered by the registry check and drift-guard suites, which compare source, not live behaviour.
**Performance**: engine measured at a median 0.63 ms for 64 elements on a laptop; unmeasured on a phone (see the performance document).
**Contract and security scans**: no dependency vulnerability scan, no SBOM, no penetration test was run. **Not run, not claimed.**

## Independent verification performed by the orchestrator

Agent reports were not simply accepted. Checked directly: every test count and exit code in the tables above; that the `packages/shared` tracked diff is `index.ts` +3/-0 only (additive); that no web registry file was touched outside unit U7b; that the Game Service event `gameType` equals the Leaderboard enum; that the audio unlock does not run on a hover; that the registry check fails when an entry is deleted (mutation test, file restored byte-identical); that the built `dist` contains the levels; and that both seed scripts pass `bash -n` with LF endings.

## Defects found by review loops and fixed (this is why the loops exist)

| Unit | Defect | Why it mattered |
|---|---|---|
| U2 | Sources included in the short-circuit path; engine returned a live reference to a position object | Wrong fault location, masked series-source short, caller could mutate engine input |
| U6 hardening (first fix) | Fault penalty used `max`, so the resistor exploit reopened at 3+ reported faults | Scoring rewarded omitting the LED's protection, the exact mistake the game teaches against |
| U3 | Fuse reset did not re-blow; 240-particle pool rebuilt every render | Broke the "mistake recurs" teaching moment; per-mouse-move allocation |
| U5 | Audio context created on mouse hover | Safari and Firefox would lose audio for the session; Chrome autoplay warning |
| U4 | Sliders printed numbers on Easy and Medium | Violated "Easy shows no numbers" |

Defects in the orchestrator's own work, recorded rather than hidden: the original brief claimed difficulty flows as numeric (wrong; the leaderboard string enum was already correct); the application design asserted an `apps/web` to `packages/shared` dependency that did not exist (see the deployment block); and the seed runbook said "dev first" and seeded before the frontend (both wrong, corrected).

## Security compliance (Security Baseline enabled)

Scope was set by the owner: SECURITY-04, 05, 09, 11, 15 in scope; 01, 03, 06, 08, 10, 12, 13, 14 accepted as pre-existing debt, with the baseline still enforced on **new** code.

| Rule | Status for this feature | Evidence and caveat |
|---|---|---|
| SECURITY-01 | N/A (new code) | No new data store. Pre-existing gaps deferred |
| SECURITY-02 | Compliant | Existing API Gateway access logging covers the routes |
| SECURITY-03 | Compliant for new code, per unit reviews | New paths avoid logging layouts or tokens. Not independently grepped. Pre-existing full-event logging deferred |
| SECURITY-04 | **PARTIAL, NOT MET** | HSTS, nosniff, X-Frame-Options, Referrer-Policy enforce. **CSP is Report-Only and enforces nothing** until browser-verified and renamed. `/traffic-sim.html` will break once enforced |
| SECURITY-05 | Compliant for new input | Strict bounded schema, size cap, unknown kinds rejected, one generic message |
| SECURITY-06 | N/A (new code) | No new IAM. Deferred |
| SECURITY-07 | N/A | No network layer |
| SECURITY-08 | Compliant for new code | Paid gate and re-evaluation are server-side. **The sandbox is reachable by direct URL** because it is local-only; accepted, see open items |
| SECURITY-09 | Addressed | ErrorBoundary no longer renders message or stack; backend rejects generically. Source maps still enabled (pre-existing) |
| SECURITY-10 | Deferred | `fast-check` added as a dev dependency; lockfile changed. No vulnerability scan or SBOM exists |
| SECURITY-11 | Addressed, with residual trust | Server re-evaluates the layout. **`faultCount` cannot be verified** (faults are historical); it is clamped, and under-reporting is quantified at about 1062 points of residual |
| SECURITY-12 | N/A (new code) | Existing Cognito flow reused. Deferred |
| SECURITY-13 | Deferred | |
| SECURITY-14 | Deferred | No new alarms for this feature |
| SECURITY-15 | Addressed for new code | Eleven distinct failure causes fail closed with no score, event, or persistence |

**Blocking finding under the baseline's own rule: SECURITY-04 is only partially satisfied.** The owner-accepted staging (enforce four headers now, CSP Report-Only first) is documented, but a Report-Only policy does not protect anyone. It is a tracked open item, not a closed one.

## Overall status

- **Build**: success
- **Automated tests**: pass (with the 9 documented pre-existing leaderboard failures)
- **Ready for Operations**: **NO.** The code is complete and verified as far as this environment allows. Go-live is gated on the items below.

## Gates before go-live (all require a human or a real browser)

1. **Vercel build context.** Apply `SHARED-ENGINE-IMPORT-DECISION.md` on the dev project `web`, confirm `dev.dashden.app` builds, then collapse the relative import in `circuitEngine.ts` and remove its warning block, then repeat for `web-prod` and correct `.kiro/steering/deployment.md`. **Do not deploy the frontend before this.**
2. **CSP in a real browser.** Run the checklist in `apps/web/SECURITY-HEADERS.md` on `dev.dashden.app` and `dashden.app`, then rename `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.
3. **Manual verification, none of which has been executed:** unit U3 checklist (CB-2.1, 2.2, 2.6) in `game-surface/code/implementation-summary.md`; unit U4 playthrough `M-U4-1` to `M-U4-11` in `levels-and-learning/code/implementation-summary.md`; unit U5 `M1` to `M12` in `platform-quality/code/implementation-summary.md`, including **M12: finger-test the 24 px sliders on a real phone and add 44 px minus/plus buttons if the thumb cannot be hit**.
4. **Merge in separate pull requests, in this order**, because three of them deploy production Lambdas with no tests, smoke check, or rollback:
   1. `services/leaderboard` repair and the new game type (U1 leaderboard part, U7a)
   2. `packages/shared` engine and levels (U2, U4 levels). Additive; **also deploys the Game, Leaderboard, and Email Sender Lambdas**. Commit `packages/shared/package-lock.json` with it or CI fails
   3. `services/game` (U6, including hardening)
   4. `apps/web` (U1 headers and ErrorBoundary, U3, U4, U5, U7b). No Lambda deploy; frontend deploy waits on gate 1
5. **Seed last**: `bash scripts/seed-circuit-builder.sh --prod`, then `bash scripts/verify-circuit-builder-seed.sh --prod`. There is no dev environment to rehearse on. Rollback deletes both rows.

## Open items and known weaknesses (none are Circuit Builder blockers by themselves)

| # | Item | Notes |
|---|---|---|
| 1 | Sandbox is reachable by direct URL | Cannot be server-gated. Consider making it a deliberate free demo and gating only guided Start |
| 2 | cb-03 (no buzzer) and cb-06 (no return wire) shortcuts out-score the reference | Level-design weakness, risk R10 in the unit U4 docs |
| 3 | Full-screen mode does not enlarge the grid | Risk R10 in the unit U5 docs |
| 4 | Spark, place, and connect audio cues are preloaded but never played | |
| 5 | No test ties the engine `FaultCode` union to the `faultHelp` keys | A future fifth code would render a raw key |
| 6 | Daily email list does not include Circuit Builder | Deliberately untouched: no tests, production-affecting, would advertise a paid game to Free users |
| 7 | "Play every game" achievement now needs one more game | Intended effect of registering the game |
| 8 | Pre-existing latent defects found, not fixed | Orphaned `scoring.config.json`; Language Learning multipliers; `anomaly.service` difficulty labels; 6 stale auth tests; `/traffic-sim.html`; other games missing from `GAME_FILTER_MAP` and `PREMIUM_GAMES` |
| 9 | Untracked helper `scripts/watch-agents.ps1` and workflow scratch under `.agents/tasks/` | Decide whether to commit or ignore |
