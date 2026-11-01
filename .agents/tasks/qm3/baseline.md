# QM3 baselines (after Step 0)

- services/game `npx tsc --noEmit`: clean (exit 0)
- services/game `npx jest --ci --runInBand`: 214 tests pass (211 baseline + 3 new in tests/unit/game.handler.quest.test.ts). 9 suites pass, 2 suites fail to run (pre-existing): tests/unit/services/event-publisher.service.test.ts, tests/integration/event-flow.test.ts
- infrastructure `npx tsc --noEmit`: clean (exit 0)
- packages/shared `npx jest --ci --runInBand`: 23 suites, 532 tests pass
- apps/web `npx vitest run`: 31 files, 629 tests; 628 pass, 1 fail (pre-existing, unrelated to Step 0): src/__tests__/circuitBuilderRegistry.test.ts "is registered in every hub, leaderboard, display and backend registry" -> "[services/game game.service.ts PAID_GAMES] add CIRCUIT_BUILDER (web PREMIUM_GAMES and backend PAID_GAMES must agree)"
- apps/web `npm ci` fails (lock file missing lightningcss optional platform packages); `npm install` was used, and the resulting apps/web/package-lock.json change was reverted (not committed).

## Step 0 changes
- IAM write grant on quest table reduced to dynamodb:PutItem (lambda-stack.ts, deployment-architecture.md step 5, infrastructure-design.md). Quest repository uses only GetCommand, QueryCommand, PutCommand.
- Added handler test for completeGame `quest ?? null` mapping and getQuestProgress routing.
