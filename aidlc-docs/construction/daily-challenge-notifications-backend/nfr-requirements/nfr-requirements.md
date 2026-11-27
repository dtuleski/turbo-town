# DC1 Notifications Backend: NFR Requirements

Unit DC1 (branch `feat/dc1-notifications-backend`). Sources: requirements FR-DC-1 to FR-DC-10,
FR-DC-22 to FR-DC-24, NFR-DC-1 to NFR-DC-7; application design flows S4 to S8; plan decisions Q1 to Q3.
Self-approved 2026-11-26 under the owner's delegation. Tech stack is fixed (Node 20 Lambda, TypeScript,
DynamoDB, SNS, Secrets Manager, Resend): no stack selection in this stage.

## 1. Delivery window and claims (FR-DC-8 to FR-DC-10, NFR-DC-3)

| Id | Requirement | Measure |
|---|---|---|
| NFR-DC1-1 | The digest email and digest push are due from 08:00 to 08:59 local; the challenge push from 12:00 to 12:59 local | `dueSends` returns due only inside the hour (tests at :59 before, :00, :59, :00 after) |
| NFR-DC1-2 | The scheduler runs every 15 minutes, so a send arrives within 15 minutes of the target time when runs succeed; up to three missed runs in a row are caught up inside the hour | EventBridge `cron(0/15 * * * ? *)` (P8) |
| NFR-DC1-3 | Local time follows the IANA zone and its DST rules, including half-hour zones | Tests: `Asia/Kolkata` 08:00 = 02:30Z; New York on 2026-03-08 (8am = 12:00Z) and 2026-11-01 (8am = 13:00Z) |
| NFR-DC1-4 | At most one send per user, per kind (`DigestEmail`, `DigestPush`, `ChallengePush`), per local date, across retries and overlapping runs | Conditional claim on the email-prefs item (`attribute_not_exists(#a) OR #a <> :date`); a failed send releases its claim; tick test with two runs and with two concurrent runs |
| NFR-DC1-5 | Zone resolution: saved zone if valid, else the most recently updated device zone, else `America/New_York` | `resolveTimeZone` tests |

## 2. Scale: 10,000 users (NFR-DC-4)

Assumptions: 10,000 opted-in prefs items of about 300 bytes; up to 10,000 device items of about 400 bytes;
in the worst case every user is in one zone (US Eastern), so all digests fall in the same hour.

| Id | Requirement | Sizing |
|---|---|---|
| NFR-DC1-6 | One prefs scan per run, paginated (the filter is unchanged) | ~3 MB scanned = 3 to 4 pages of 1 MB, well under one second; 96 runs a day |
| NFR-DC1-7 | One device scan per run (also the zone fallback), only when `PUSH_DEVICES_TABLE_NAME` is set | ~4 MB = 4 to 5 pages |
| NFR-DC1-8 | Shared data loaded once per run and only when someone is due: existing leaderboard and aggregate scans (unchanged `Limit: 500` and `Limit: 1000`), yesterday's challenge results, the APNs secret | no extra reads in the runs with nobody due (about 64 of 96 a day for a user base in the four main US zones) |
| NFR-DC1-9 | Per due user: one claim write per send, one `getMyEntry` (GetItem plus a COUNT query) for the digest, one GetItem (`hasPlayed`) for the challenge push | 10,000 users: about 40,000 small requests a day; on-demand cost well under 1 USD a month |
| NFR-DC1-10 | Push: at most 10 users in flight (`PUSH_CONCURRENCY`), each user's devices in turn | SNS Publish ~50 to 100 ms: 10,000 pushes in under 2 minutes |
| NFR-DC1-11 | Email: Resend calls sequential, as today | ~0.2 to 0.4 s each |
| NFR-DC1-12 | Lambda timeout 300 s (P6); a run stops starting new sends 30 s before its deadline (`STOP_MARGIN_MS`) and the next run continues where it stopped (unclaimed users are still due) | 4 runs per hour of about 270 s of sending each |

Known limit (owner review): email throughput is bounded by Resend's API rate limit, not by the tick.
Resend documents a default of 2 requests per second per team (confirm the account's value). At that
rate one hour holds about 7,200 sends, or about 2,200 within the four runs' sending time. Sends rejected
with 429 release their claim and are retried by the next run in the window, so nothing is sent twice,
but at several thousand users in one zone some digests would miss their hour. The scale path is a
sender change behind `TickDeps.sendEmail` (Resend batch endpoint, 100 emails per call, or a raised
limit); the tick, the claims and the planner do not change. At today's ~50 users a run takes seconds.

## 3. Secret handling (NFR-DC-1, SECURITY-12)

| Id | Requirement |
|---|---|
| NFR-DC1-13 | The APNs signing key (`.p8`), Key ID, Team ID and bundle id live only in the Secrets Manager secret `dashden/apns/prod` and in the SNS platform application created from it. No key in code, env vars, CDK, logs or the repository |
| NFR-DC1-14 | The digest Lambda reads only `platformApplicationArn` (and the optional `platformApplicationArnSandbox`) from the secret. The secret id comes from env `APNS_SECRET_ID`. The value is cached 10 minutes |
| NFR-DC1-15 | A missing env var, a missing secret, an unreadable secret or a secret without a valid SNS application ARN means push is off: no push attempt, no push claim taken, email unaffected |
| NFR-DC1-16 | The digest role may call `secretsmanager:GetSecretValue` on that one secret ARN only (`dashden/apns/prod-??????`). Trade-off accepted in plan Q3: the role could read the key fields it does not use |

## 4. Reliability (NFR-DC-5)

| Id | Requirement |
|---|---|
| NFR-DC1-17 | One device failing (any error) never stops the next device or the next user |
| NFR-DC1-18 | `EndpointDisabled` on publish, or SNS rejecting the token at endpoint creation, removes the device item and its SNS endpoint (FR-DC-5). `NotFound` clears the stored endpoint so the next run recreates it |
| NFR-DC1-19 | A user's push claim is kept when at least one device received it, otherwise released |
| NFR-DC1-20 | The handler throws only when the prefs scan fails (nothing has been sent), so EventBridge/Lambda async retries are safe. Every other failure (pre-draw, digest data, results, devices, one user, one device) is logged and the run continues |
| NFR-DC1-21 | A failed challenge pre-draw does not stop the email: the digest goes out without the challenge section |

## 5. Security and privacy (NFR-DC-1, NFR-DC-2)

| Id | Requirement |
|---|---|
| NFR-DC1-22 | Device and settings operations take the user id only from the verified JWT; `unregisterPushDevice` deletes a device only when the caller owns it (`ConditionExpression userId = :u`) |
| NFR-DC1-23 | Input validation: token `/^[0-9a-f]{64,200}$/i`, platform `IOS`, environment `production` or `sandbox`, zone by `isValidTimeZone` (length 64 cap), language `en`, `es`, `pt`; one generic message per operation |
| NFR-DC1-24 | Logs carry user ids, counts, kinds and error names; never push tokens, endpoint ARNs, secret values, email addresses or email bodies (the old per-user failure log printed the address and is replaced) |
| NFR-DC1-25 | Usernames inserted into the new email section are HTML-escaped |
| NFR-DC1-26 | Account deletion removes the user's devices and their SNS endpoints, only when `PUSH_DEVICES_TABLE_NAME` is set (a missing table must not break deletion) |

## 6. Compatibility (NFR-DC-7)

| Id | Requirement |
|---|---|
| NFR-DC1-27 | Without `PUSH_DEVICES_TABLE_NAME`: device operations answer `{ ok: false }`, the tick sends no push and reads no device table. Without `DAILY_CHALLENGE_TABLE_NAME`: no pre-draw and no challenge section or challenge push. Without `APNS_SECRET_ID`: no push |
| NFR-DC1-28 | Existing digest content is unchanged: same nudges, leaderboard, CTA, footer and subject format (the subject date now uses the user's zone, which is the same date for US Eastern at 8am) |
| NFR-DC1-29 | `setPrefs` becomes UpdateItem and keeps `timeZone`, `language` and the claim attributes; `post-confirmation.ts` is unchanged (new accounts on) |
| NFR-DC1-30 | The exported `handler` and its handler path `dist/daily-email.handler` are unchanged |

## 7. Observability (SECURITY-14)

One summary log line per run (`Daily tick`): users, due counts, sent/failed/skipped per kind, devices
removed, APNs on/off/unused, challenge ok/failed/off, stopped. CloudWatch alarm on the digest Lambda's
`Errors` (P9).
