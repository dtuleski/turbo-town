# Business Rules - QM1 Shared Quest Core

**Stage**: CONSTRUCTION - Functional Design, unit QM1
**Basis**: `quest-map-requirements.md` (FR-QM-1/2/5/9/10/11/12/13/18, NFR-QM-5/12/13), `quest-map-component-methods.md`, `business-logic-model.md`, plan `quest-map-shared-core-functional-design-plan.md`
**Rule ids** are stable labels for tests and review. "Test" lists the QM1 test that proves the rule.

---

## 1. Stars and thresholds

| Id | Rule | Source | Test |
|---|---|---|---|
| R-STAR-1 | Stars come only from a numeric score and the node's three thresholds. Inclusive lower bounds: `>= t3` is 3, `>= t2` is 2, `>= t1` is 1, else 0 | FR-QM-9 | evaluator.test (boundary cases at each threshold, -1, +0) |
| R-STAR-2 | A non-finite score (`NaN`, `Infinity`, `-Infinity`) or a negative score is treated as 0 stars and is stored as 0 | SECURITY-15 | evaluator.test |
| R-STAR-3 | For a BOSS the score is the sum of its legs' scores; its thresholds are combined thresholds | FR-QM-10 | gauntlet.test, evaluator.test |
| R-STAR-4 | `thresholds` are strictly ascending positive numbers, and the 3-star value does not exceed `8000 x leg count` (the score ceiling for non-Mini-Golf legs in `game.service.ts`) | FR-QM-2, validator V7 and V17 | config.test |
| R-STAR-5 | Threshold values are seed values, to be calibrated against real percentiles before launch (pre-launch check PL3). Changing a number is a config edit; no code or test changes unless an ordering rule breaks | Q4=B | config.test on the real config |

## 2. Progress is monotonic

| Id | Rule | Source | Test |
|---|---|---|---|
| R-MONO-1 | `bestScore = max(stored, new)`; `stars = max(stored, new)`. A lower score never lowers either | FR-QM-11 | evaluator.property.test |
| R-MONO-2 | Applying the same result twice gives the same progress as once | NFR-QM-13 | evaluator.property.test |
| R-MONO-3 | The set of `AVAILABLE` nodes never shrinks as results are applied | NFR-QM-13 | evaluator.property.test (unlock chain monotonic) |
| R-MONO-4 | `lastGameId` is set on every applied result, whether or not it improved the score | unit-of-work completion criteria | evaluator.test |
| R-MONO-5 | `applyNodeResult` never mutates its inputs and never reads a clock | NFR-QM-12 | evaluator.test (frozen inputs) |
| R-MONO-6 | A 0-star result is recorded (best score, last played); `firstClearedAt` stays `''` until the first result of 1 star or more | plan Q4 | evaluator.test |

## 3. Unlocking

| Id | Rule | Source | Test |
|---|---|---|---|
| R-UNLOCK-1 | Node 1 of every world is available from the start | FR-QM-5 | evaluator.test |
| R-UNLOCK-2 | Node n+1 unlocks when node n has at least 1 star. With 0 stars it stays locked | FR-QM-5, AC5 | evaluator.test |
| R-UNLOCK-3 | A node with stars is always `AVAILABLE` (replay), whatever the state of its predecessors | FR-QM-11 | evaluator.test |
| R-UNLOCK-4 | An unavailable node (game removed) is passed for unlocking only if it is itself reachable; a chain of consecutive unavailable nodes is passed through | FR-QM-18, QM-13 | evaluator.test |
| R-UNLOCK-5 | An unavailable node is `UNAVAILABLE` even if it holds stars. Its stars and best score stay stored (no progress lost) but do not count in totals | FR-QM-18 | evaluator.test |
| R-UNLOCK-6 | `isNodeStartable` is true exactly for `AVAILABLE`; an unknown id is false. World tier access is not decided here | FR-QM-6 (QM2) | evaluator.test |

## 4. Bonus node

| Id | Rule | Source | Test |
|---|---|---|---|
| R-BONUS-1 | Totals count path nodes only (the 7 regular nodes and the boss). The bonus node is excluded from `totalStars`, `maxStars` and World Mastered, so it cannot unlock itself | FR-QM-12, QM-8 | evaluator.test |
| R-BONUS-2 | The bonus is available when `totalStars >= min(bonusStarThreshold, 3 x available path nodes)`; below that it is locked, and `bonusStarThreshold - totalStars` is what the UI shows as "stars remaining" | FR-QM-12 AC12 | evaluator.test |
| R-BONUS-3 | Seed thresholds: World 1 is 14 of a maximum 24; World 2 is 16 of 24 | plan Q6 | config.test |
| R-BONUS-4 | A bonus node with stars stays available even if the total later falls (config change or removed games) | FR-QM-11 | evaluator.test |
| R-BONUS-5 | World 1's bonus uses only free games at difficulty 3 or lower (validator V8 applies to the bonus node too) | FR-QM-12 | config.test |

## 5. Config validator (`validateQuestConfig`)

Each rule yields one message `"<worldId>/<nodeId>: <text>"` per violation (world-level rules use `"<worldId>: ..."`). Each has a negative test that builds a copy of the real config with one defect and expects that message.

| Id | Check | Maps to |
|---|---|---|
| V1 | World ids unique; `order` unique; `accessTier` is `FREE` or `PAID` | FR-QM-2 AC2 |
| V2 | Node ids unique across **all** worlds, bonus included | FR-QM-2 AC2 |
| V3 | World and node ids match `^[a-z0-9-]{1,40}$` (they travel in `questContext` and the launch URL) | NFR-QM-5 |
| V4 | `nodes` is not empty, the last is `BOSS`, no other path node is `BOSS`, every other path node is `GAME`; `bonus.kind` is `BONUS` | FR-QM-1 |
| V5 | Leg count: BOSS has 2 or 3 legs; GAME and BONUS have exactly 1 | QM-14 |
| V6 | Every leg `themeId` is in `knownThemeIds` | AC2 unknown themeId |
| V7 | `thresholds` are finite, positive and strictly ascending | AC2 |
| V8 | In a `FREE` world: no leg `themeId` in `paidThemeIds` and no leg above difficulty 3 | AC2 |
| V9 | A `CIRCUIT_BUILDER` leg has `params.levelId`, the level exists, and its difficulty equals the leg's difficulty (`levelDifficulty(levelId)`). `levelId` on any other theme is an error | AC2 |
| V10 | Difficulty is an integer 1 to 4; a leg that is not `CIRCUIT_BUILDER` is at most 3 | design addition in `quest-map-components.md` U1 (pages encode only easy, medium, hard) |
| V11 | A leg whose `themeId` is in `pageThemeRequired` (Pattern Recall) has a non-empty `params.pageTheme` | QM-14 (page cannot encode a required param) |
| V12 | `bonusStarThreshold` is an integer from 1 to `3 x path node count` | design |
| V13 | `map.x` and `map.y` are inside 4 to 96 | design (map box) |
| V14 | Within a world, any two nodes (bonus included) are at least 10 units apart | design (touch targets) |
| V15 | `catalogGameId` is non-empty and matches `^[a-z0-9-]+$` | FR-QM-18 |
| V16 | A BOSS leg list contains no `CIRCUIT_BUILDER` leg without a `levelId` (covered by V9) and has no duplicate `(themeId, difficulty, params)` triple that would make leg order meaningless | design |
| V17 | `thresholds[2]` is at most `8000 x legs.length` (otherwise 3 stars is unreachable) | R-STAR-4 |

Notes:
- The caller supplies `knownThemeIds` (from `QUEST_KNOWN_THEME_IDS`), `paidThemeIds` (from `PAID_GAME_THEME_IDS`), `levelDifficulty` (from the circuit level registry) and `pageThemeRequired` (`PATTERN_RECALL`). Passing them in keeps the validator free of imports from the circuit module, so QM1 stays testable with fakes.
- V16's duplicate-leg rule is a guard against copy-paste in a boss; it does not forbid the same game in two different nodes.
- Whether each `catalogGameId` is ACTIVE and each themeId has a PUBLISHED row in prod is not a unit-test matter (pre-launch checks PL1, PL2).

## 6. Gauntlet (boss)

| Id | Rule | Source | Test |
|---|---|---|---|
| R-GAUNT-1 | Leg 0 can always be started. Leg k above 0 can be started only with an attempt for the same node, with exactly k completed legs, not expired | FR-QM-10 AC10 | gauntlet.test |
| R-GAUNT-2 | Expired means `now - lastActivityAt >= 30 minutes`. `lastActivityAt` moves with every completed leg; `startedAt` never matters. Exactly 30:00 is expired; 29:59.999 is not | FR-QM-10 | gauntlet.test (boundary) |
| R-GAUNT-3 | A missing, empty or unparseable `lastActivityAt` counts as expired (fail closed) | SECURITY-15, plan Q9 | gauntlet.test |
| R-GAUNT-4 | Expiry is evaluated only at leg start (`canStartLeg`). `recordLeg` has no clock check | unit-of-work scope | gauntlet.test |
| R-GAUNT-5 | `recordLeg` is idempotent on `gameId`: a repeat of a recorded leg returns the attempt unchanged with `IN_PROGRESS` | unit-of-work scope | gauntlet.test "duplicate non-final leg completion keeps the attempt" |
| R-GAUNT-6 | A duplicate of the final leg is detected by `QuestService` through `NodeProgress.lastGameId`, which `applyNodeResult` sets (R-MONO-4) | unit-of-work scope | gauntlet.test "duplicate final leg completion changes nothing", "duplicate of a lower-scoring final leg changes nothing and reports COMPLETE" (these two exercise the pair `recordLeg` and `applyNodeResult` with the service's `lastGameId` rule written as a small pure helper in the test) |
| R-GAUNT-7 | Out-of-order or invalid leg index returns `EXPIRED` with no attempt, never throws | SECURITY-15 | gauntlet.test |
| R-GAUNT-8 | Starting leg 0 replaces any attempt, including one for another node. A world has one active attempt | requirements data model | gauntlet.test |
| R-GAUNT-9 | The combined score is the sum of leg scores; stars use the boss's combined thresholds | FR-QM-10 | gauntlet.test |
| R-GAUNT-10 | Every leg consumes one play. This is enforced by the caller (the rate limiter runs in `startGame`); QM1 only makes the leg count explicit | FR-QM-10 AC10 | n/a in QM1 |

## 7. Badges and world completion

| Id | Rule | Source | Test |
|---|---|---|---|
| R-BADGE-1 | `WORLD_CLEARED`: the boss has 1 star or more | FR-QM-13 | evaluator.test |
| R-BADGE-2 | `WORLD_MASTERED`: every **available** path node (boss included, bonus excluded) has 3 stars, and there is at least one available path node | FR-QM-13, Q7 | evaluator.test |
| R-BADGE-3 | **Boss unavailable rule.** When the boss itself is unavailable (any of its legs' games not ACTIVE), the boss counts as passed. `WORLD_CLEARED` is awarded when the boss is reached, meaning every earlier node is starred or unavailable-and-reachable. It is never awarded while an earlier node is still unplayed | FR-QM-18, QM-13, plan Q2 | evaluator.test |
| R-BADGE-4 | If the boss later becomes available again with 0 stars, an already awarded badge stays | FR-QM-13 "awarded once" | evaluator.test |
| R-BADGE-5 | Badges are never removed; each is awarded once. `badgesAwarded` lists only badges that were not in `progress.badges` before the call | FR-QM-13 AC13 | evaluator.test |
| R-BADGE-6 | `worldCleared` in the outcome is true only on the call that newly awards `WORLD_CLEARED` | plan Q1 | evaluator.test |
| R-BADGE-7 | The backend `AchievementType` enum is not touched; badges live in `WorldProgress.badges` | FR-QM-13 AC13 | n/a in QM1 |
| R-BADGE-8 | Edge accepted: if every path node of a world is unavailable, the boss is reached and `WORLD_CLEARED` is awarded when `computeBadges` runs, but no result can be applied to such a world, so this cannot occur through play | design | evaluator.test (documents the behaviour) |

## 8. Removed games (FR-QM-18)

| Id | Rule |
|---|---|
| R-REMOVED-1 | The caller builds `unavailableNodeIds`: a node is unavailable when **any** of its legs' `catalogGameId` is not ACTIVE. The evaluator only reads the set |
| R-REMOVED-2 | An unavailable node is excluded from `totalStars`, `maxStars`, the bonus total and World Mastered; it counts as passed for unlocking (R-UNLOCK-4); stored stars stay |
| R-REMOVED-3 | `effectiveBonusThreshold = min(bonusStarThreshold, 3 x available path nodes)` so removal can never make the bonus unreachable |
| R-REMOVED-4 | Unavailable boss: R-BADGE-3. A multi-leg boss with one removed leg is wholly unavailable; legs are never skipped or rescaled (plan Q3) |
| R-REMOVED-5 | An unavailable bonus node is `UNAVAILABLE` and is not required for anything |

## 9. Context schema

| Id | Rule | Source |
|---|---|---|
| R-CTX-1 | `worldId` and `nodeId` are strings matching `^[a-z0-9-]{1,40}$`; `legIndex` is an integer 0 to 2 (a numeric string, a float, `NaN` or a negative value fails) | NFR-QM-5 |
| R-CTX-2 | Unknown keys are stripped, not rejected; the parsed value contains only the three fields. `__proto__`, `constructor` and similar keys never appear in the output | SECURITY-05 |
| R-CTX-3 | A failure is a `safeParse` failure; the schema never throws on any input type (`undefined`, `null`, array, string) | SECURITY-15 |
| R-CTX-4 | The schema does not check existence. Exceeding 40 characters fails the pattern, so no oversize id reaches a lookup | SECURITY-05 |

## 10. Reuse by v2 (NFR-QM-12)

| Id | Rule |
|---|---|
| R-REUSE-1 | All evaluator and gauntlet functions take the world as an argument (no import of `QUEST_WORLDS` inside them). A weekly node list can be passed as a `QuestWorld` |
| R-REUSE-2 | No function imports from `services/*`, `apps/*`, AWS or the circuit module. The only imports are `zod` (schema) and the quest types |
| R-REUSE-3 | Display names are not in config; they come from locale keys derived from ids (`quest.worlds.<worldId>.name`, `quest.nodes.<nodeId>.name`) |

## 11. Error handling

| Situation | Behaviour |
|---|---|
| Unknown `nodeId` passed to `applyNodeResult` | Throws `Error('Unknown quest node')` (programmer error; `QuestService` validated the id and catches, NFR-QM-8) |
| Invalid `legIndex`, out-of-order leg, no attempt for leg above 0 | `recordLeg` returns `EXPIRED`, no throw |
| Invalid score (`NaN`, negative) | Treated as 0 |
| Bad `lastActivityAt` | Expired |
| Config errors | Returned as strings; the real config's test fails the build. Nothing validates at runtime in production |
| Unknown world id (`getWorld`) | Returns `undefined` |

## 12. Security Baseline compliance (extension enabled)

| Rule | Status | Basis |
|---|---|---|
| SECURITY-05 Input validation | Compliant | `questContextSchema` allowlist pattern, bounds, integer check, unknown keys stripped (R-CTX-1 to 4). The validator also checks that ids match the same pattern (V3), so every config id can pass the schema |
| SECURITY-11 Secure design | Compliant | Rules isolated in pure, side-effect-free modules; thresholds server-side only. Misuse cases covered by tests: forged/oversize ids, `__proto__` keys, non-finite scores, out-of-order and replayed legs, expiry boundary. The residual limit (client-reported scoring inputs, NFR-QM-7) is a QM2/game-service property, unchanged by this unit |
| SECURITY-15 Fail-safe defaults | Compliant | Non-finite scores to 0; unparseable timestamp to expired; invalid leg to `EXPIRED`; unknown id throws instead of silently succeeding |
| SECURITY-03 Logging | N/A | No logging in a pure module; validator messages carry config ids only |
| SECURITY-08 Access control | N/A | No identity in QM1. Tier gate and `userId` from the JWT are QM2 (`QuestService`) |
| SECURITY-10 Supply chain | Compliant | No new dependency: `zod` ^3.22.4 and `fast-check` ^3.23.2 are already in `packages/shared/package.json` |
| SECURITY-01, 02, 04, 06, 07, 09, 12, 13, 14 | N/A | No storage, network, header, IAM, auth or deployment change in QM1 |

No blocking finding.

## 13. Requirement and story coverage

| Requirement or story | Rules |
|---|---|
| FR-QM-1 | R-STAR-5, R-REUSE-3; domain-entities.md |
| FR-QM-2 | V1 to V17 |
| FR-QM-5 | R-UNLOCK-1 to 6 |
| FR-QM-9 | R-STAR-1 to 3 |
| FR-QM-10 | R-GAUNT-1 to 10 |
| FR-QM-11 | R-MONO-1 to 6 |
| FR-QM-12 | R-BONUS-1 to 5 |
| FR-QM-13 | R-BADGE-1 to 8 |
| FR-QM-18 | R-REMOVED-1 to 5, R-UNLOCK-4, R-UNLOCK-5, R-BADGE-3 |
| NFR-QM-5 | R-CTX-1 to 4, V3 |
| NFR-QM-12 | R-REUSE-1 to 3, R-MONO-5 |
| NFR-QM-13 | property tests R-MONO-1 to 3 |
| QM-8 | R-BONUS-1 to 5 |
| QM-14 | V1 to V17, R-STAR-5 |
