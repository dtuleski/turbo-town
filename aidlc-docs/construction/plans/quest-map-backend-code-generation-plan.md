# Code Generation Plan - QM2 Backend and Table
**Stage**: CONSTRUCTION - Code Generation, unit QM2 (services/game + infrastructure; no apps/web)
**Basis**: `quest-map-components.md` (B1 to B8, I1 to I3), `quest-map-services.md`, `quest-map-backend/functional-design/*`, `quest-map-backend/infrastructure-design/*`
**Constraint**: PR #25 owns `services/game/src/utils/circuit-builder.ts` and `services/game/tests/unit/services/circuit-score.test.ts`; neither is touched.
**Application code lives in the workspace root; this file and the summary are documentation only.**

## Part 1 - Infrastructure (code only; no synth, diff or deploy was run)
- [x] 1. `infrastructure/lib/stacks/database-stack.ts`: table `memory-game-quest-progress-{env}` (userId + worldId, on-demand, AWS_MANAGED, PITR, RETAIN), public `questProgressTable`, output `QuestProgressTableName` (I1)
- [x] 2. `infrastructure/lib/stacks/lambda-stack.ts`: prop `questProgressTable`, env var `QUEST_PROGRESS_TABLE_NAME`, two statements on the Game function only (read: GetItem, Query; write: PutItem, UpdateItem), table ARN only (I2)
- [x] 3. `infrastructure/bin/memory-game.ts`: pass `questProgressTable` to `LambdaStack` (I3)

## Part 2 - Game service source
- [x] 4. `src/types/quest.ts`: `QuestResultPayload`, `QuestProgressView` and parts (no `catalogGameId`)
- [x] 5. `src/repositories/quest-progress.repository.ts` (B1): get, list, versioned conditional save, `QuestVersionConflictError`, fail closed on missing table name or corrupt item
- [x] 6. `src/services/quest.service.ts` (B2): `validateStart`, `applyCompletion` (one retry, fail-soft, gauntlet, idempotency), `getProgressView`, catalog cache
- [x] 7. `src/services/rate-limiter.service.ts` (B4): read-only `getUsage`
- [x] 8. `src/utils/metrics.ts` (B7): `publishQuestMetric` and `QuestMetricName`
- [x] 9. `src/repositories/game.repository.ts` (B8): persist optional `questContext`
- [x] 10. `src/services/game.service.ts` (B3): optional trailing `QuestService`; quest validation before the paid-game gates and `checkLimit`; `finalizeQuest` at both `completeGame` exits; local `PAID_GAMES` replaced by shared `PAID_GAME_THEME_IDS`
- [x] 11. `src/handlers/game.handler.ts` (B5): build and inject `QuestService`; `getQuestProgress`; `quest` in the `completeGame` mapping
- [x] 12. `src/utils/validation.ts` (B6) and `src/types/index.ts`: `questContext: z.unknown().optional()`; `StartGameInput.questContext`, `CompleteGameResponse.quest`
- [x] 13. `services/game/schema.graphql`: documentation of `questContext`, `quest`, `getQuestProgress`

## Part 3 - Tests (`services/game/tests/unit/`)
- [x] 14. `quest-fixtures.ts`: in-memory repository enforcing the same version condition as the real one
- [x] 15. `services/quest.service.test.ts`: rejection matrix, tier gate, locked node, boss order/expiry/idempotency/combined score, monotonic best (lower replay and real version conflict), second conflict and repository error fail-soft, view (remaining plays, no catalog ids, FREE World 2, recomputed stars, paywall metric)
- [x] 16. `services/game.service.quest.test.ts`: validation before rate limit, no allowance consumed, paywall not bypassable, no-QuestService fail closed, both completeGame exits, fail-soft, unchanged behaviour without `questContext`, `PAID_GAME_THEME_IDS` parity
- [x] 17. `services/rate-limiter.usage.test.ts`: `getUsage` for missing, expired, active and over-limit records, with no writes
- [x] 18. `services/quest-progress.repository.test.ts`: condition expression, version bump, conflict translation, corrupt item, missing table name

## Part 4 - Verification and documentation
- [x] 19. Run verification and record it in `.agents/tasks/qm2/verification.md`
- [x] 20. Code summary: `aidlc-docs/construction/quest-map-backend/code/code-summary.md`
