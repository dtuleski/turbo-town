# Business Logic Model - QM2 Backend and Table
**Stage**: CONSTRUCTION - Functional Design (minimal), unit QM2
**Basis**: `quest-map-services.md` (flows 1 to 3, error table, invariants: authoritative, not repeated here), `quest-map-component-methods.md`, QM1 business logic model, `domain-entities.md`
**Scope**: the decisions Application Design left to this stage. Where a flow is already specified in `quest-map-services.md`, this file points to it.

---

## 1. Repository contract (B1)
```text
getWorld(userId, worldId)
  GetItem(key). Missing -> undefined. Present -> shape check (nodes is a map, version is a number,
  badges is a list); fails check -> throw (fail closed). Returns WorldProgress.

listWorlds(userId)
  Query PK = :userId (one page; at most 2 items today). Same shape check per item.
  Items whose worldId is not in config are ignored (logged at warn, id only).

saveWorld(userId, progress, expectedVersion)
  Item = explicit field list from domain-entities (activeGauntlet omitted when undefined),
         version = expectedVersion + 1.
  PutItem with ConditionExpression:
         attribute_not_exists(userId) OR version = :expected
  ConditionalCheckFailedException -> throw QuestVersionConflictError (caught inside B1,
  never reaches mapDynamoDBError).
  Any other error -> thrown as is (mapped upstream).
```
All values go through ExpressionAttributeValues; no string concatenation (SECURITY-05).
`expectedVersion` is 0 for a first save and the version that was read otherwise. With `attribute_not_exists(userId) OR version = :expected`, a first save against an item that appeared meanwhile has `:expected = 0`, which does not match a stored `version >= 1`, so it conflicts correctly.

## 2. `validateStart` - decisions beyond the services doc
Order of checks is fixed in `quest-map-services.md` section 2. Added here:
1. **Reason codes** (fixed enum, for logs only; the caller always sees the one generic message): `BAD_SHAPE`, `UNKNOWN_WORLD`, `UNKNOWN_NODE`, `LEG_OUT_OF_RANGE`, `TIER_TOO_LOW`, `LEG_MISMATCH`, `NODE_LOCKED`, `NODE_UNAVAILABLE`, `LEG_ORDER`, `ATTEMPT_EXPIRED`.
2. `rawContext` is `unknown`. Parse with Q3 first; on failure log `BAD_SHAPE` with no input echoed.
3. World/node/leg lookups use only config (Q1) after the regex-bounded ids passed. The leg theme and difficulty compare is strict equality on both.
4. Reads happen in a fixed order: progress, then catalog. A failure in either is a fatal error for the request (not the generic message), see error table.
5. For `legIndex > 0` the attempt is taken from the already-read progress; expiry is evaluated here with `clock()` through `canStartLeg` (only place, as decided).
6. No write, no metric, no rate-limit call happens here.

## 3. `applyCompletion` - decision table
Entry: `finalizeQuest` has already returned `undefined` when `game.questContext` is absent (no I/O).

| Situation | Action | Result | Log |
|---|---|---|---|
| Config world, node or leg no longer exists | none | `undefined` | warn `CONFIG_GONE` |
| `game.themeId` or `game.difficulty` differs from the leg, or Circuit Builder `levelId` differs from `leg.params.levelId` | none | `undefined` | warn `LEG_DRIFT` |
| Plain node (or bonus), `lastGameId === game.gameId` | none | stored result for the node | info `DUPLICATE` |
| Plain node, new game | `applyNodeResult`, set `lastGameId`, conditional save | result payload | info progress change |
| Boss, non-final leg, new | `recordLeg`, conditional save of `activeGauntlet` (`lastActivityAt` = now) | `gauntlet.status = IN_PROGRESS`, `nextLeg` | info |
| Boss, final leg, new | `recordLeg` returns `COMPLETE` + combined score, then `applyNodeResult(combined)`, attempt cleared, one conditional save | `COMPLETE`, stars from combined score | info progress change |
| Boss, duplicate non-final leg (`attempt.legs[legIndex].gameId === gameId`) | none | `IN_PROGRESS`, same `nextLeg` | info `DUPLICATE` |
| Boss, duplicate final leg (no attempt, `lastGameId === gameId`) | none | `COMPLETE`, stored best | info `DUPLICATE` |
| Boss, out of order | attempt cleared, conditional save | `EXPIRED`, 0 stars | warn `LEG_ORDER` |
| `QuestVersionConflictError` | re-read, re-apply, one more save | as above | warn `CONFLICT_RETRY` |
| Second conflict, repository error, corrupt item | none | `undefined` (caller returns `quest: null`) | error + metric `QuestProgressWriteFailed` |

`applyCompletion` never throws: the whole body runs in try/catch, because it executes after the score is already stored.

Metrics after a successful save: `QuestNodeCleared` when stars go from 0 to at least 1 (never for a duplicate); `QuestWorldCleared` when `worldCleared` turns true. Both carry only the world id. Metric failures are swallowed.

## 4. `getProgressView`
1. `listWorlds(userId)`; `catalog.listAvailableGames()` (cached 60 s in the service instance); `rateLimiter.getUsage(userId, tier)`. Independent reads run in parallel; any failure fails the request.
2. `unavailableNodeIds` = nodes whose legs' `catalogGameId` is not in the available set (a boss is unavailable if any leg's game is).
3. Per config world: statuses and `totalStars` come from the QM1 evaluator, not from the stored `totalStars`. Accessible = `accessTier === 'FREE' || tier !== 'FREE'`. In an inaccessible world every node is `LOCKED` but stored stars are still shown.
4. `activeGauntlet` in the view is included only if the attempt exists and is not expired; `expiresAt = lastActivityAt + 30 min`.
5. `catalogGameId` is never copied into the view.
6. Paywall impression metric (definition fixed in the services doc): tier FREE and World 1 holds `WORLD_CLEARED` -> `publishQuestMetric('QuestPaywallHit', worldId)`; wrapped so it can never throw.

## 5. `getUsage` (B4)
```text
record = rate-limit record for userId (same key as checkLimit)
limit  = getTierLimit(tier)
if no record or resetAt <= now:  { limit, used: 0, remaining: limit, resetAt: next reset as checkLimit computes }
else:                            { limit, used: count, remaining: max(0, limit - count), resetAt: record.resetAt }
```
Read-only. Must not call `canStartGame`. A read failure throws (fatal for `getQuestProgress`).

## 6. Handler (B5) and persistence (B8)
- `getQuestProgress` has no input; `userId` comes from the JWT claim already extracted in `index.ts`; tier from `subscriptionRepository.getTier`.
- `completeGame` mapping adds `quest: result.quest ?? null`.
- `gameRepository.create` stores the validated `questContext` only when present.
