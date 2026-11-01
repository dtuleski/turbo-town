# Quest Map Integration Test Instructions

## Purpose
Check that shared, game service, infrastructure and web agree on the quest contract.

## Automated cross-unit coverage (runs with the unit suites)
| Boundary | Where covered |
|---|---|
| shared quest rules to game service | `services/game/tests/unit/services/quest.service.test.ts`, `game.service.quest.test.ts` (fake repository, rejection matrix, fail-closed without QuestService, concurrent completion retry) |
| shared themes to web themes | web vitest comparing `QUEST_CARD_THEME_IDS` with `GAME_THEMES` via `?raw` import |
| game service to CDK | `infrastructure` `npx tsc --noEmit` (table, env var and IAM definitions compile) |
| web launch table to game pages | `buildLaunchUrl` tests per row for the 13 games; R1 and R2 tests |

## Not automated
- `services/game/tests/integration/event-flow.test.ts` does not run (baseline).
- No test runs against live DynamoDB, Lambda or AppSync. `cdk synth`/`cdk diff` were not run (need account context, owner-run).

## Manual end-to-end (dev, after backend is deployed to dev)
1. Sign in as a paid user, open the hub, open the Quest Map card.
2. Start a node; play to completion; confirm the result modal shows the quest section and no "Play again".
3. Return to the map; confirm stars, best score and unlock updated.
4. Force a start failure; confirm the rate-limit or generic quest message and no play consumed.
5. Complete a boss gauntlet leg twice (same game); confirm no change on the duplicate.

## Cleanup
No setup is created by automated tests. Remove any dev test progress rows manually if needed.
