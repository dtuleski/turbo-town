# Circuit Builder - Integration Test Instructions

**Created**: 2026-10-30
**Stage**: CONSTRUCTION - Build and Test

**Note on file naming**: `integration-test-instructions.md` already exists from the original project; this file is kept separate.

## Honest scope statement

**No automated end-to-end or cross-service integration test exists for Circuit Builder, and none was run.** There is no reachable dev environment (the default AWS credentials reach only the production account, which has no `-dev` tables), and this feature was built without calling any live service. What follows is (A) the integration coverage that *does* exist as automated tests, and (B) the manual procedure to run before going live.

## A. Integration seams covered by automated tests

| Seam | Covered by | Strength |
|---|---|---|
| Web and Game Service share one engine | Both import `packages/shared`. Game tests exercise the real `evaluate` | Strong: same code, not a mock |
| Game Service event `gameType` equals Leaderboard enum | Registry check reads both sources; U7a drift-guard suite (20 tests) | Strong: string equality asserted |
| Web `GameType` equals Leaderboard enum | Registry check | Strong |
| Paid gate agrees between web and backend | Registry check compares `PREMIUM_GAMES` with `PAID_GAMES` | Strong for this game |
| Catalog id converts to theme id for review join | Registry check | Strong |
| Browser submission shape matches server contract | `selectSubmissionPayload` tests plus the validator tests | Moderate: both sides tested against the same documented contract, but not against each other over the wire |
| Game Service rejects tampering | `circuit-reevaluation` and `circuit-validation` suites | Strong |

## B. Manual integration procedure (required before go-live)

**Order matters. The seed is last.** Seeding before the frontend is live shows every player a tile that leads nowhere.

| Step | Action | Pass condition |
|---|---|---|
| 1 | Deploy the Leaderboard (merge the leaderboard change via GitHub Actions) | Lambda `LastUpdateStatus` is `Successful` |
| 2 | Deploy the Game Service (merge via GitHub Actions) | Same. The game is **unreachable** until step 5 because the theme row does not exist |
| 3 | Resolve the Vercel build context, deploy the frontend to the **dev** project `web`, verify `dev.dashden.app` builds and loads | See `SHARED-ENGINE-IMPORT-DECISION.md`. **Currently blocked** |
| 4 | Verify the CSP in a real browser using `apps/web/SECURITY-HEADERS.md` (15 items), then rename the header | Zero violation reports on every listed page and flow |
| 5 | `bash scripts/seed-circuit-builder.sh --prod` (type `SEED-PROD`) | Script prints both rows written |
| 6 | `bash scripts/verify-circuit-builder-seed.sh --prod` | Exits 0; both rows exist and are valid |
| 7 | Play-through as a **paid** user: tile appears under Science & Math with the paid badge, setup page loads, play a level at each difficulty 1 to 4, complete it, confirm the server-returned score appears | Score shown matches the server response; no local score |
| 8 | Same as a **Free** user | Hub tile shows the paid badge and redirects to subscription; a direct request to start a session is rejected by the server |
| 9 | After the first real completion, check CloudWatch metrics `LeaderboardEventProcessed` and `LeaderboardEventError` with dimension `GameType=CIRCUIT_BUILDER` | Processed rises, Error stays 0 |
| 10 | Check the leaderboard, History, Achievements, and Admin Dashboard | Circuit Builder appears with the right name and icon |

## Rollback

Delete **both** rows: themes `themeId = CIRCUIT_BUILDER` and catalog `gameId = circuit-builder`. Deleting only the themes row stops sessions but leaves the tile visible, so players would click into a game that refuses to start.

Backend Lambdas have **no automated rollback** (`deploy-lambdas.yml` has no test, smoke, canary, or rollback stage). Revert the commit and let CI redeploy. Keep each Lambda-touching change in its own merge so a problem can be traced and reverted alone.
