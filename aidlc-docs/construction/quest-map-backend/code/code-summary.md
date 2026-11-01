# Code Summary - QM2 Backend and Table
**Plan**: `aidlc-docs/construction/plans/quest-map-backend-code-generation-plan.md` (all steps ticked)

## What was built
| Id | File | Change |
|---|---|---|
| B1 | `services/game/src/repositories/quest-progress.repository.ts` | New. `getWorld`, `listWorlds`, `saveWorld` (PutItem with `attribute_not_exists(userId) OR #version = :expected`, stored version = expected + 1). `ConditionalCheckFailedException` becomes `QuestVersionConflictError`. Table name is read per call from `QUEST_PROGRESS_TABLE_NAME`; unset or a corrupt item fails closed |
| B2 | `services/game/src/services/quest.service.ts` | New. `validateStart` (read-only), `applyCompletion` (never throws; one retry on conflict), `getProgressView`. All decisions call the shared evaluator and gauntlet rules |
| B3 | `services/game/src/services/game.service.ts` | `questService?` is an optional trailing constructor parameter. Quest validation runs right after the tier read, before the paid-game gate, the difficulty gate and `checkLimit`. `finalizeQuest` runs just before both `completeGame` returns. The local `PAID_GAMES` array is replaced by `PAID_GAME_THEME_IDS` (same 7 ids) |
| B4 | `rate-limiter.service.ts` | `getUsage` reads the record `checkLimit` reads; never writes |
| B5 | `handlers/game.handler.ts` | Builds and injects `QuestService`; `getQuestProgress` operation; `quest: result.quest ?? null` in the `completeGame` mapping |
| B6 | `utils/validation.ts`, `types/index.ts`, `types/quest.ts` | `questContext: z.unknown().optional()`; response types |
| B7 | `utils/metrics.ts` | `publishQuestMetric(name, worldId)`; five names; World is the only dimension; never throws |
| B8 | `repositories/game.repository.ts` | Persists the validated `questContext` only when present |
| I1 to I3 | `infrastructure/lib/stacks/database-stack.ts`, `lambda-stack.ts`, `bin/memory-game.ts` | Table, env var, two Game-Lambda-only statements on the table ARN |
| Docs | `services/game/schema.graphql` | Documentation of the new input, result and query |

## Behaviour worth knowing
- **Order in `startGame`**: tier read, quest validation, paid-game gate, difficulty gate, `checkLimit`, theme check, create, increment. A quest failure never reaches `checkLimit`, so no play is consumed. A request with `questContext` and no injected `QuestService` fails closed with the same generic message. `questContext: null` counts as absent.
- **Paywall**: quest validation adds a World 2 tier check on top of the existing gates; it removes none. A FREE user cannot reach a paid game through a context (tested).
- **Completion**: stars come from the server score (`score` after the cap in the generic path, the verified score in the Circuit Builder path). Plain nodes use `applyNodeResult` (monotonic). Boss legs use `recordLeg`; the last leg applies the combined score. Duplicates are detected by `lastGameId` or by the recorded leg's gameId and write nothing. Expiry is checked only at leg start.
- **Fail-soft**: any error in the hook (read, second conflict, catalog) is logged with ids, publishes `QuestProgressWriteFailed`, and the response carries no `quest` (the handler maps it to `null`).
- **Least privilege**: the code uses GetItem, PutItem and Query. `UpdateItem` stays in the write statement because the approved design lists it (R-DATA-3); remove it if the reviewer prefers.

## Not done here (by instruction)
No `cdk synth`, `diff` or `deploy`, and no AWS or Vercel command. The expected effect on the Database stack stated in the infrastructure design (one table, its explicit output, and CDK cross-stack outputs) is therefore still unconfirmed by synth.
`validateEnvironment()` in `index.ts` is intentionally unchanged.

## Security Baseline (code)
SECURITY-03: logs carry ids, stars, scores and reason codes only; the raw context is never logged. SECURITY-05: shared zod schema plus bound DynamoDB values. SECURITY-06: separate Game-Lambda-only statements on one ARN. SECURITY-08: `userId` comes from the JWT everywhere; no operation accepts one. SECURITY-09: one generic rejection message; SDK messages are never returned. SECURITY-15: access checks fail closed; only the reward write is fail-soft.
