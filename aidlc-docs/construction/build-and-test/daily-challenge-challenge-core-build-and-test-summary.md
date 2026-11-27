# DC2 Challenge Core: Build and Test Summary

Branch `feat/dc2-challenge-core` (cut from `feat/daily-challenge` at 0e2cd8e). Run 2026-11-26 on macOS,
Node 20, in the worktree. Nothing was deployed; no AWS call was made.

## Commands and results

| # | Command | Result | Baseline (1a5e044) |
|---|---|---|---|
| 1 | `cd packages/shared && npx jest` | 28 suites, 591 tests, all pass | 24 suites, 539 tests |
| 2 | `cd packages/shared && npm run build` | pass | pass |
| 3 | `cd services/game && npx tsc --noEmit` | pass | pass |
| 4 | `cd services/game && npx jest` | 21 suites pass, 2 fail (`tests/unit/services/event-publisher.service.test.ts`, `tests/integration/event-flow.test.ts`, the known failures on main); 351 tests pass | 17 suites pass, 2 fail; 291 tests |
| 5 | `cd infrastructure && npx tsc --noEmit` | pass | pass |

## New tests

| Suite | Covers |
|---|---|
| `packages/shared/src/challenge/day.test.ts` | Eastern day at 04:59Z/05:00Z (winter) and 03:59Z/04:00Z (summer); DST change days 2026-03-08 (23 h) and 2026-11-01 (25 h); bounds agree with `challengeDayOf` for 366 days; `addDays`; `isChallengeDay`; `localParts` for Asia/Kolkata (+5:30) and America/Los_Angeles; `isValidTimeZone` incl. length cap |
| `packages/shared/src/challenge/rng.test.ts` | Golden values for `seedFrom`, `mulberry32`, `randInt`, `shuffle`; ranges; `pick` on empty |
| `packages/shared/src/challenge/draw.test.ts` | Determinism; no game on consecutive days over 365 days with 2, 3, 6 and 16 eligible; single-game repeat; rotation of 16 entries, all difficulty 2, word-puzzle and hangman language-dependent; only code-a-bot eligible |
| `packages/shared/src/challenge/generators.test.ts` | Code-a-Bot content `[1..5]`, same every day, JSON round-trip; `expectedTotals` 5; no generator throws |
| `services/game/tests/unit/services/challenge.repository.test.ts` | Item shapes, `attribute_not_exists(pk)` create, best-score condition (equal kept with the earlier time, higher replaces), `rank-index` top and paginated COUNT, error mapping, unconfigured table |
| `services/game/tests/unit/services/challenge.service.test.ts` | `createChallengeService` off without the env var; draw once and stored item wins; lost race re-read; start validation failures all generic incl. DB error and Eastern vs UTC day; ties by earlier time; late and wrong-totals completions not recorded; leaderboard order, usernames only, `me` outside the top, limit clamp, past/future/malformed days; `getDayResults` |
| `services/game/tests/unit/services/game.service.challenge.test.ts` | Invalid or unconfigured challenge start throws the generic message and calls neither `checkLimit` nor `incrementUsage`; valid start counts a play and stores `challengeDay`; FREE user starts a paid-theme challenge, the paid gate stays for normal starts; normal start record unchanged; completion records the server score, equal score kept, after midnight and wrong totals not recorded with the score still returned, hook failure still completes |
| `services/game/tests/unit/game.handler.challenge.test.ts` | Without `DAILY_CHALLENGE_TABLE_NAME` both queries return null and the game service has no challenge service; JSON-text `settings` and `content`; leaderboard args; validation error surfaced; `completeGame.challenge` null or passed through |
| `services/game/tests/unit/services/account-deletion.service.test.ts` (2 added) | Challenge table untouched when unset; scores deleted through `user-index` when set |

## Security Baseline

| Rule | Status |
|---|---|
| SECURITY-01 Encryption | Compliant: the new table uses AWS-managed encryption at rest; DynamoDB calls are TLS |
| SECURITY-02 Access logging on intermediaries | N/A: no new API Gateway, load balancer or CDN |
| SECURITY-03 Application logging | Compliant: structured `logger`; logs carry user id, game id, day and a fixed reason; never the raw challenge context, tokens or secrets |
| SECURITY-04 HTTP security headers | N/A: no web host change in this unit |
| SECURITY-05 Input validation | Compliant: `challengeContext` passed as `unknown` and checked (object, real `YYYY-MM-DD`, today); leaderboard `day` validated and future days rejected; `limit` clamped 1..50; stored items shape-checked on read |
| SECURITY-06 Least privilege | Compliant: Game Lambda gets GetItem, PutItem, Query, BatchWriteItem on the one table (Query also on its indexes); no UpdateItem, DeleteItem, Scan or wildcard actions (CDK and the P3 policy JSON) |
| SECURITY-07 Network | N/A: no VPC or network change |
| SECURITY-08 Access control | Compliant: user id only from the verified JWT; a user writes only their own `SCORE#<userId>` item; leaderboards return usernames and `isMe`, never user ids |
| SECURITY-09 Hardening | Compliant: one generic start error (`CHALLENGE_UNAVAILABLE_MESSAGE`); repository errors mapped without SDK messages (`sanitizeError` path unchanged) |
| SECURITY-10 Supply chain | Compliant: no new dependency |
| SECURITY-11 Secure design | Compliant with the stated limit: the server fixes game, settings, content and day and checks totals; the score still comes from client-reported metrics, the same trust as the normal leaderboards |
| SECURITY-12 Credentials | N/A: no credentials or secrets in this unit |
| SECURITY-13 Integrity | Compliant: content is generated and stored server-side once per day (`attribute_not_exists(pk)`); clients cannot choose it |
| SECURITY-14 Alerting | N/A for this unit: no new scheduled job; existing Game Lambda error metrics cover the new code paths (the digest alarm is P9, DC1) |
| SECURITY-15 Fail-safe | Compliant: challenge start fails closed before the rate limit; completion hook fails soft; unset `DAILY_CHALLENGE_TABLE_NAME` turns the feature off and account deletion skips the table |

## Notes for later units

- `ChallengeContent` is `CodeABotContent` only; DC3 extends the union, registers its generators in
  `packages/shared/src/challenge/generators/index.ts` and adds a `case` per kind in `expectedTotals`.
  `rotation.test.ts` expectations (`eligibleRotation()` = `['code-a-bot']`) change with it.
- `ChallengeService.getDayResults(day, userId?, limit = 3)` is ready for the DC1 digest section.
- `tests/unit/challenge-fixtures.ts` (`memoryTable`, `challengeRig`) is the in-memory table for challenge
  suites (needs `jest.unmock('@aws-sdk/lib-dynamodb')`).
