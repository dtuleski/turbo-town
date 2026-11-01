# Quest Map Unit Test Instructions

## Run
```powershell
cd packages/shared;  npx jest --ci --runInBand
cd services/game;    npx jest --ci --runInBand
cd services/game;    npx jest circuit
cd apps/web;         npx vitest run
```

## Expected results (recorded on branch feat/quest-map)
| Package | Command | Expected |
|---|---|---|
| packages/shared | `npx jest --ci --runInBand` | 23 suites, 534 tests pass |
| services/game | `npx jest --ci --runInBand` | 9 suites pass, 214 tests pass; 2 suites fail to run (baseline) |
| services/game | `npx jest circuit` | 4 suites, 125 tests pass |
| apps/web | `npx vitest run` | 44 files, 833 tests pass |

## Known baseline failures
`services/game/tests/unit/services/event-publisher.service.test.ts` and `services/game/tests/integration/event-flow.test.ts` fail with "Test suite failed to run". They are pre-existing, noted in `aidlc-state.md`, and are not touched by Quest Map (FR-QM-19). Any other failing suite is a regression.

## Notes
- Quest tests log ERROR lines (for example "Quest progress write failed", "dynamo down"). These are expected output from failure-path tests, not failures.
- Coverage: not measured in this run.

## If tests fail
1. Read the first failing assertion.
2. Rebuild `packages/shared` if the failure is a missing export.
3. Fix and rerun the single package.
