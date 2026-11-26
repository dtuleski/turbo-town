# DC1 Notifications Backend: Build and Test Summary

Branch `feat/dc1-notifications-backend` (cut from `feat/dc3-repeatable-content` at 26dcfbb). Run
2026-11-26 on macOS, Node 20.20.2, in the worktree. Nothing was deployed; no AWS call was made (the
`--build-only` run used a PATH shim that records `aws` invocations: zero calls).

## Commands and results

| # | Command | Result | Baseline (DC3 tip 26dcfbb) |
|---|---|---|---|
| 1 | `cd packages/shared && npx jest` | 29 suites, 617 tests, all pass | 29 suites, 617 tests |
| 2 | `cd packages/shared && npm run build` | pass | pass |
| 3 | `cd services/game && npx tsc --noEmit` | pass | pass |
| 4 | `cd services/game && npx jest` | 30 suites pass, 2 fail (`tests/unit/services/event-publisher.service.test.ts`, `tests/integration/event-flow.test.ts`, the known failures on main); 454 tests pass | 22 suites pass, 2 fail; 354 tests |
| 5 | `scripts/deploy-daily-email-lambda.sh --build-only` | exit 0; prints `Zip: /tmp/daily-email-lambda-prod.zip` (1.4 MB, 1,176 entries); `unzip -l` lists `dist/daily-email.js`, `dist/notifications/*.js`, `node_modules/@memory-game/shared/dist/index.js`; 0 `aws` calls | new |
| 6 | `cd infrastructure && npx tsc --noEmit` | pass | pass |

Extra check: the zip was unpacked and `dist/daily-email.js` loaded with only the AWS SDK supplied from
outside (`handler` and `runTick` are functions); every module resolved outside the zip belongs to the
AWS SDK v3 tree the Lambda Node.js runtime provides (`@aws-sdk/*`, `@smithy/*`, `tslib`, `mnemonist`,
`obliterator`).

Web and app are not touched by this unit (baselines stay web 55 files / 961 tests, app 763 tests).

## New tests (100)

| Suite | Tests | Covers |
|---|---|---|
| `tests/unit/services/email-prefs.service.test.ts` | 16 | `setPrefs` sends UpdateItem with only email, username, dailyDigest, updatedAt (no Put, no REMOVE, no zone, language or claim attribute); `setLocale` writes only given fields, never `dailyDigest` or `updatedAt`, rejects bad zones and languages without a write; claim condition and attribute per kind; taken claim = false; other errors rethrown; release conditional and tolerant |
| `tests/unit/services/push-device.service.test.ts` | 20 | off without the env var; `deviceId` = sha256 `IOS:<lower-case token>`; register stores the caller's device; a token moves to the new user and keeps its endpoint; environment change drops and deletes the endpoint; 8 invalid inputs rejected with one message and no write; unregister deletes only the caller's device; endpoint deleted best effort; malformed token = `ok: false`; user-index listing; `setEndpoint` never re-creates |
| `tests/unit/game.handler.push.test.ts` | 6 | `{ ok: false }` for both device operations without `PUSH_DEVICES_TABLE_NAME`; service built when set; JWT user id passed (input `userId` ignored); validation error surfaced; `saveNotificationSettings` always available; `getEmailPrefs` reads a missing toggle as off |
| `tests/unit/services/account-deletion.service.test.ts` (+2) | 2 | push-devices table and SNS untouched when unset; devices deleted via `user-index` and their endpoints deleted (failure tolerated) when set; login still removed last |
| `tests/unit/notifications/due.test.ts` | 7 | 08:00 to 08:59 and 12:00 to 12:59 local only; `Asia/Kolkata` (02:30Z); New York DST days 2026-03-07/08 and 2026-11-01; claims per kind and date; unknown or invalid zone = America/New_York; zone and language resolution |
| `tests/unit/notifications/texts.test.ts` | 7 | a name for every rotation game in en, es, pt; push texts; section with winner, escaped top 3, own score and rank, invitation, nobody played; `escapeHtml` |
| `tests/unit/notifications/apns-config.test.ts` | 11 | only ARNs read; malformed secrets = null; no secret id = no call; missing secret = null, never a throw; cache 10 minutes |
| `tests/unit/notifications/push-sender.test.ts` | 11 | payload and `APNS`/`APNS_SANDBOX` key; endpoint created and stored; "already exists" ARN reused and re-enabled; stored endpoint reused; `EndpointDisabled` and a rejected token remove the device and endpoint; `NotFound` clears the endpoint; other errors keep the device; sandbox app or skip; Android skipped; concurrency cap 10 and isolation |
| `tests/unit/daily-email.tick.test.ts` | 20 | see below |

Tick acceptance (FEAT-004), each a test in `daily-email.tick.test.ts`:
- Digest email and digest push only between 08:00 and 08:59 local, challenge push only between 12:00 and
  12:59 local; each at most once per local date across two runs and across two concurrent runs.
- Nothing for `dailyDigest` false; the handler's prefs scan keeps `FilterExpression 'dailyDigest = :yes'`
  on every page (aws-sdk-client-mock).
- America/New_York when no zone; saved zone; device zone; half-hour zone.
- No challenge push for a user with a score for today's challenge (`hasPlayed`).
- APNs secret missing: no push attempt, no push claim, the email still sends.
- One failing device does not stop the next device or the next user; a removed device is counted and its
  user's claim released.
- Existing digest HTML still contains its sections (header, greeting, the four nudges, "Today's Top
  Players" with the user's row, Play Now link, footer) plus "Yesterday's challenge"; `buildEmailHTML`
  without a section is identical to calling it with `''`.
- Failed email releases its claim; pre-draw failure still sends the email; stop near the timeout.

## Security Baseline

| Rule | Status |
|---|---|
| SECURITY-01 Encryption | Compliant: push-devices table with AWS-managed encryption (CDK); the APNs key encrypted in Secrets Manager; DynamoDB, SNS, Secrets Manager and Resend over TLS |
| SECURITY-02 Access logging on intermediaries | N/A: no new API Gateway, load balancer or CDN |
| SECURITY-03 Application logging | Compliant: structured logs with user id, kind, counts and error names; no tokens, endpoint ARNs, device ids, secret values, email addresses or bodies (the old per-user failure log with the address is replaced); one summary line per run |
| SECURITY-04 HTTP security headers | N/A: no web host change |
| SECURITY-05 Input validation | Compliant: token hex 64 to 200, platform `IOS`, environment enum, zone `isValidTimeZone` (64 cap), language enum, all as `unknown` then checked; malformed secrets and device items rejected on read; usernames HTML-escaped in the email |
| SECURITY-06 Least privilege | Compliant: P3 additions and the P5 policy list named actions per table, index, SNS application, endpoint prefix and one secret ARN; no wildcard actions |
| SECURITY-07 Network | N/A: no VPC or network change |
| SECURITY-08 Access control | Compliant: user id only from the verified JWT; unregister deletes only the caller's device (condition `userId = :u`); tokens never returned to clients |
| SECURITY-09 Hardening | Compliant: one generic message per invalid device or settings input; `{ ok: false }` when off; push off (not failing) without configuration |
| SECURITY-10 Supply chain | Compliant: no new runtime dependency; `@aws-sdk/client-sns` added as a dev dependency pinned to the same `^3.1009.0` as the other SDK clients (types and tests), provided by the Lambda runtime; lockfile updated |
| SECURITY-11 Secure design | Compliant: claims make sends idempotent; ownership enforced by a conditional delete; the digest reads only the ARNs from the secret |
| SECURITY-12 Credentials | Compliant: APNs key only in Secrets Manager and SNS (P11, P12); nothing in code, env vars or logs |
| SECURITY-13 Integrity | Compliant: challenge content and results come from the server tables; the push route and texts are built server-side |
| SECURITY-14 Alerting | Compliant: `Daily tick` summary per run; P9 alarm on digest Lambda errors |
| SECURITY-15 Fail-safe | Compliant: each part off without its env var; one device or user failing never stops the run; the handler throws only when nothing has been sent; account deletion touches the device table only when configured |

## Notes for later units

- DC4 web: `saveNotificationSettings(input: { timeZone, language })` returns `{ timeZone, language }`
  (null when unknown); invalid values give the GraphQL error `Invalid notification settings`.
- DC5 app: `registerPushDevice(input: { token, platform: IOS, environment: production|sandbox, timeZone?,
  language? })` and `unregisterPushDevice(token)` return `{ ok }`; `ok: false` while the backend table is
  not configured. Push payload: `aps.alert.{title, body}`, `sound: default`, top-level `route` (`/` for the
  challenge push, `/challenge/results?day=<yesterday>` for the digest push, `/` when there was no challenge).
- Before DC1 is merged the owner runs P0 (Game Lambda UpdateItem on email prefs).
