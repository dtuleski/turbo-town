# Business Rules - QM2 Backend and Table
**Stage**: CONSTRUCTION - Functional Design (minimal), unit QM2
**Basis**: `quest-map-requirements.md` (FR-QM-5 to 11, 17 to 19, NFR-QM-5 to 11, 13, 14), `quest-map-services.md`, `business-logic-model.md`
**Rule ids** are labels for tests and review. "Test" is the planned QM2 test (`services/game/tests/unit/`).

---

## 1. Start validation
| Id | Rule | Source | Test |
|---|---|---|---|
| R-START-1 | `questContext` is validated before `rateLimiter.checkLimit` and before the paid-game and difficulty-4 gates; any failure returns the single message `This quest is not available right now.` | FR-QM-8 | rejection matrix, one case per reason code |
| R-START-2 | A failed validation consumes no play (no `incrementUsage`, no game record) | FR-QM-8 AC8 | fake rate limiter asserts zero calls |
| R-START-3 | World 2 (`accessTier: PAID`) requires a tier other than FREE, decided from the server-read tier | FR-QM-6 | matrix case `TIER_TOO_LOW` |
| R-START-4 | `leg.themeId === themeId` and `leg.difficulty === difficulty`, strict | FR-QM-8 | matrix case `LEG_MISMATCH` |
| R-START-5 | Leg k>0 needs an unexpired attempt for the same node with exactly k legs recorded | FR-QM-10 | matrix cases `LEG_ORDER`, `ATTEMPT_EXPIRED` |
| R-START-6 | No `QuestService` injected + `questContext` present = generic quest error, no play consumed. No `questContext` = behavior unchanged | services doc | "quest context without QuestService fails closed" |
| R-START-7 | Missing `QUEST_PROGRESS_TABLE_NAME` fails closed (`Quest progress is not configured`) for quest operations only; ordinary games are unaffected | NFR-QM-14 | unit: repository constructed without name |
| R-START-8 | The boss attempt is not written at start | services doc | `validateStart` makes no write call |

## 2. Completion
| Id | Rule | Source | Test |
|---|---|---|---|
| R-DONE-1 | Both `completeGame` exits call `finalizeQuest`; non-quest games take no extra I/O | FR-QM-19 | spy on both exits; zero repository calls without context |
| R-DONE-2 | The hook runs after the game record is updated; any failure inside it returns `quest: null` and never fails `completeGame` | NFR-QM-8 | repository throws -> success response |
| R-DONE-3 | Stars derive only from the stored server-computed score and config thresholds; no request field feeds the evaluator | FR-QM-9, NFR-QM-6 | grep-style test: `applyCompletion` signature takes no client stars |
| R-DONE-4 | Stored best score and stars never decrease, including under two concurrent completions | FR-QM-11 | fake repository with a forced conflict |
| R-DONE-5 | One retry on `QuestVersionConflictError`; a second conflict is fail-soft | services doc | retry test |
| R-DONE-6 | Duplicate completion of one `gameId` (plain node, non-final leg, final leg) changes nothing | services doc | three named tests (see QM1 plan) at service level |
| R-DONE-7 | Expiry is not evaluated at completion; a leg started at minute 29 and finished at 33 counts | FR-QM-10 | named test |
| R-DONE-8 | A game whose theme, difficulty or Circuit Builder level no longer matches the leg yields `quest: null` and no write | services doc | `LEG_DRIFT` case |

## 3. Read model
| Id | Rule | Source | Test |
|---|---|---|---|
| R-VIEW-1 | `getQuestProgress` takes no client input; the user is the JWT user | NFR-QM-6 | handler test |
| R-VIEW-2 | Stored `totalStars` is ignored; it is recomputed | components doc | corrupt-total fixture |
| R-VIEW-3 | A FREE user sees World 2 with every node `LOCKED`, stored stars visible | FR-QM-6 | view test |
| R-VIEW-4 | `remaining` comes from `getUsage`, which reads the record `checkLimit` reads | FR-QM-17 | `getUsage`: missing, expired, active record |
| R-VIEW-5 | Catalog or progress read failure fails the request | services doc | fake throws |
| R-VIEW-6 | `catalogGameId` never appears in the response | components doc | view test asserts key absent |

## 4. Logging and metrics
| Id | Rule | Source |
|---|---|---|
| R-LOG-1 | Use the existing `logger`. Log userId, worldId, nodeId, gameId, scores, stars, reason code. Never log raw `questContext` input, tokens, emails or usernames | SECURITY-03, NFR-QM-9 |
| R-LOG-2 | Every progress change logs previous and new best stars and best score | SECURITY-13 |
| R-LOG-3 | Rejected starts log at `warn` with a reason code from the fixed enum; ids only if they passed config lookup | services doc |
| R-LOG-4 | Metrics: `QuestNodeStarted` (after `publishGameStarted`), `QuestNodeCleared`, `QuestWorldCleared`, `QuestPaywallHit`, `QuestProgressWriteFailed`; world id is the only dimension; publish never throws | NFR-QM-11 |

## 5. Data access
| Id | Rule | Source |
|---|---|---|
| R-DATA-1 | `userId` is part of every key; no operation accepts a `userId` from the client | SECURITY-08 |
| R-DATA-2 | All DynamoDB access uses key conditions and `ExpressionAttributeValues` | SECURITY-05 |
| R-DATA-3 | Only `GetItem`, `PutItem`, `UpdateItem`, `Query` are used on the table. The code uses `GetItem`, `PutItem`, `Query` today; `UpdateItem` stays granted because the approved policy lists it, and may be removed at the Code Generation review if unused (least privilege) | SECURITY-06 |
| R-DATA-4 | Version conflict is translated inside the repository so it is never shown to clients as a 409 | services doc |

## 6. Security Baseline compliance (this stage)
| Rule | Status | Basis |
|---|---|---|
| SECURITY-01 | Compliant | Table encryption/PITR in the infrastructure design; SDK over TLS |
| SECURITY-02 | N/A | No gateway, load balancer or CDN added |
| SECURITY-03 | Compliant | R-LOG-1 |
| SECURITY-04 | N/A | No HTML-serving change |
| SECURITY-05 | Compliant | Q3 allowlist + R-DATA-2; the existing zod path for the rest |
| SECURITY-06 | Compliant | R-DATA-3; table-scoped statement in the infrastructure design |
| SECURITY-07 | N/A | No network configuration |
| SECURITY-08 | Compliant | R-VIEW-1, R-DATA-1, R-START-3 |
| SECURITY-09 | Compliant | One generic rejection message; no SDK text returned |
| SECURITY-10 | N/A | No new dependency |
| SECURITY-11 | Compliant, stated limit | Logic isolated in Q4, Q5, B2. Misuse cases: forged context (R-START-1/4), World 2 as FREE (R-START-3), skipped or replayed boss legs (R-START-5, R-DONE-6), parallel tabs (R-DONE-4/5). Score trust limit as in NFR-QM-7 |
| SECURITY-12 | N/A | No auth flow change |
| SECURITY-13 | Compliant | R-LOG-2 |
| SECURITY-14 | N/A for new code | Metric `QuestProgressWriteFailed` enables a later alarm; no alarm added (pre-existing debt) |
| SECURITY-15 | Compliant | R-START-7 fail closed on access; R-DONE-2 fail-soft only for the reward write, which denies and grants nothing |

No blocking finding.
