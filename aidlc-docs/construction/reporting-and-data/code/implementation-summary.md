# Implementation Summary: U7a Reporting and Data (backend slice)

## ORDERING WARNING

**Deploy the Leaderboard GameType BEFORE seeding the theme row in prod.** If the theme row is seeded first, players complete Circuit Builder levels but the Leaderboard rejects the GameCompleted event, and they silently get no leaderboard entry. Both scripts carry this warning in their header comments, and the seed script repeats it in the production prompt.

Rollback: the Leaderboard change is additive and independently revertible (revert the four small src edits). Rolling the Leaderboard back after seeding drops scores again, so delete the theme row (`themeId` `CIRCUIT_BUILDER`) first.

## Files

Added:
- `services/leaderboard/tests/circuit-builder.game-type.test.ts`
- `scripts/seed-circuit-builder.sh`
- `scripts/verify-circuit-builder-seed.sh`
- `aidlc-docs/construction/reporting-and-data/functional-design/functional-design.md`
- `aidlc-docs/construction/reporting-and-data/code/implementation-summary.md`

Modified (additive; these files already carried uncommitted U1 changes, and this unit's diff sits on top):
- `services/leaderboard/src/types/index.ts`: `GameType.CIRCUIT_BUILDER`, `ScoringConfig.circuitBuilder`
- `services/leaderboard/src/services/scoring.service.ts`: `calculateScore` case, separate `validateScore` case, `circuitBuilder` entry in `loadConfiguration()`
- `services/leaderboard/src/services/leaderboard.service.ts`: added to the OVERALL time-based fan-out list
- `services/leaderboard/src/services/anomaly.service.ts`: one case line in `getDifficultiesForGameType` (latent, no caller)

Existing CRLF endings were preserved in the four modified files. New files use LF. No file under `apps/web`, `services/game`, `packages/shared`, `infrastructure/` or `.github/` was touched. Nothing was committed.

## Bounds (circuitBuilder validation rules)

| Rule | Value | Evidence |
|---|---|---|
| Completion time | 1 to 3600 s | `CB_MAX_COMPLETION_TIME` |
| Score | 0 to 8000 | `CB_SCORE_CAP`; theoretical max 7331; canonical 2210 and 2040 |
| Accuracy | existing 0 to 1 check | unchanged |

`mathChallenge` (10 to 600 s) was not reused because it would reject games longer than 10 minutes. Difficulty 1/2/3/4 publishes EASY/MEDIUM/HARD/HARD, all accepted. See the functional design for details.

## Tests

Commands run in `services/leaderboard`:

| Command | Result |
|---|---|
| `npx jest --json` before changes | 11 suites (3 failed, 8 passed); 164 tests, 155 passed, 9 failed |
| `npx tsc --noEmit` | exit 0 |
| `npx jest tests/circuit-builder.game-type.test.ts` | 20 passed |
| `npx jest --json` after changes | 12 suites (3 failed, 9 passed); 184 tests, 175 passed, 9 failed |
| ESLint on changed files | did not finish (timed out at 200 s); no lint result is claimed |

Per suite, before to after (passed/failed):

| Suite | Before | After |
|---|---|---|
| scoring.service.test.ts | 28/2 | 28/2 |
| auth.util.test.ts | 15/6 | 15/6 |
| leaderboard.repository.test.ts | 9/1 | 9/1 |
| leaderboard.service.test.ts | 10/0 | 10/0 |
| anomaly.service.test.ts | 17/0 | 17/0 |
| graphql.handler.test.ts | 17/0 | 17/0 |
| leaderboard.service.property.test.ts | 5/0 | 5/0 |
| aggregate.repository.test.ts | 6/0 | 6/0 |
| ratelimit.util.test.ts | 21/0 | 21/0 |
| scoring.service.property.test.ts | 12/0 | 12/0 |
| event.handler.test.ts | 15/0 | 15/0 |
| circuit-builder.game-type.test.ts | new | 20/0 |

The failing test names in the three failing suites are identical before and after (compared by full name). Those 9 failures are the pre-existing ones and were not touched.

New test coverage: drift guard (reads the constant and the publish call from Game Service source), event accepted with exact gameType for EASY/MEDIUM/HARD plus a 1500 s game, out-of-range score rejected through the handler, real scores 2210/2040/7331/8000/0 accepted at 1/90/600/601/3600 s, out-of-range rejected, MEMORY_MATCH and MINI_GOLF pinned, enum shape, OVERALL fan-out, latent anomaly case.

Sabotage proof: with the enum value temporarily changed to `CIRCUIT_BUILDER_X`, 7 tests failed (drift guard, all five handler tests, enum shape). The value was restored exactly and the suite is green again.

## Seed rows

Theme: `themeId` `CIRCUIT_BUILDER`, `name` `Circuit Builder`, `status` `PUBLISHED`.

Catalog: `gameId` `circuit-builder`, `title` `Circuit Builder`, `icon` `⚡`, `route` `/circuit-builder/setup`, `status` `ACTIVE`, `displayOrder` `23`, `ageRange` `8-16`, `category` `Science & Math`, plus a one-sentence description.

The scripts were checked statically only: `bash -n` passes on both, no CR characters, verify script contains no write verbs. **They were NOT run, and no AWS call was made by this unit.**

## Owner commands (not run by this unit)

> **Correction added by the orchestrator after review.** The original text of this section told the owner to seed "dev first, then prod". That cannot be done. A read-only check on 2026-10-30 found that the default AWS credentials resolve to account 342278407349 (production), whose only themes and catalog tables are `memory-game-themes-prod` and `memory-game-catalog-prod`; no `-dev` tables exist there, and the old dev account is not reachable. Running the script without `--prod` fails with `ResourceNotFoundException`. It is harmless but it is not a staging step.
>
> **The ordering was also wrong.** The original said to seed before the web registries. The seed writes the catalog row, which puts the hub tile in front of every player and routes to `/circuit-builder/setup`. Seeding before that route is deployed shows players a tile that leads nowhere. **Seed LAST.**
>
> Required order: (1) Leaderboard deployed, (2) Game Service deployed, (3) frontend with the route and registries deployed and verified live (currently blocked on the Vercel decision in `aidlc-docs/construction/game-surface/SHARED-ENGINE-IMPORT-DECISION.md`), (4) seed with `--prod`, (5) verify. Rollback requires deleting BOTH rows.

The only way to seed from this machine is `--prod`. You will be asked to type `SEED-PROD`. Run it only after steps 1 to 3 above, with profile `dashden-new` (account 342278407349):

```bash
bash scripts/seed-circuit-builder.sh --prod
bash scripts/verify-circuit-builder-seed.sh --prod
```

Raw fallbacks:

```bash
aws dynamodb get-item --table-name memory-game-themes-prod --region us-east-1 --profile dashden-new --key '{"themeId": {"S": "CIRCUIT_BUILDER"}}'
aws dynamodb get-item --table-name memory-game-catalog-prod --region us-east-1 --profile dashden-new --key '{"gameId": {"S": "circuit-builder"}}'
```

The Leaderboard prod deploy goes through `deploy-lambdas.yml`, which has no tests, smoke check, canary or rollback. After the first real game, check CloudWatch `LeaderboardService` metrics `LeaderboardEventProcessed` and `LeaderboardEventError` with dimension `GameType=CIRCUIT_BUILDER`.

## Remaining for U7b (list only, not done)

- `apps/web` `api/leaderboard.ts` enum value `CIRCUIT_BUILDER`
- `GameTypeFilter`, `GAME_FILTER_MAP`, `PREMIUM_GAMES`
- routes, display metadata, locales
- daily email game list in `services/game` `daily-email.ts` (outside this slice)
- registry consistency check

## Risks and assumptions

- displayOrder 23 cannot be confirmed against live data beyond the best-effort read-only query in the verify script.
- `ageRange` `8-16` follows the existing format examples; not confirmed with the owner.
- The theme row copies the Mini Golf shape (three attributes); no richer attributes were invented.
- Super Hard (difficulty 4) appears as HARD on the leaderboard; pre-existing Game Service behaviour.
- The Leaderboard `PerformanceMetrics` type does not declare `hintsUsed` or `pauseCount`, which the Game Service sends; the new test casts it. Not fixed (pre-existing).
- Pre-existing defects (orphaned `scoring.config.json`, 9 stale tests, Language Learning multiplier gap, anomaly difficulty labels) are untouched.
