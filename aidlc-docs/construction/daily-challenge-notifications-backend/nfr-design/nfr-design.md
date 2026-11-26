# DC1 Notifications Backend: NFR Design

Patterns that meet `../nfr-requirements/nfr-requirements.md`, and where each lives in the code.
Self-approved 2026-11-26 under the owner's delegation.

## 1. Components and files

| Component | File | Role |
|---|---|---|
| G7 EmailPrefsService | `services/game/src/services/email-prefs.service.ts` | `setPrefs` (UpdateItem), `setLocale`, `claimSend`, `releaseSend`; `CLAIM_ATTRIBUTES` |
| G5 PushDeviceRepository | `services/game/src/repositories/push-device.repository.ts` | `get`, `upsert`, `deleteOwned`, `listForUser` (user-index), `scanAll`, `delete`, `deleteMany`, `setEndpoint` |
| G6 PushDeviceService | `services/game/src/services/push-device.service.ts` | `register`, `unregister`, `deviceIdFor`, `deleteEndpointQuietly`, `createPushDeviceService(env)` |
| G4 routes | `services/game/src/handlers/game.handler.ts` | `registerPushDevice`, `unregisterPushDevice`, `saveNotificationSettings` |
| G8 deletion | `services/game/src/services/account-deletion.service.ts` | devices and endpoints when `PUSH_DEVICES_TABLE_NAME` is set |
| N1 tick | `services/game/src/daily-email.ts` | `handler`, `runTick(deps, now)`, `TickDeps`, `TickSummary` |
| N2 planner | `services/game/src/notifications/due.ts` | `dueSends`, `resolveTimeZone`, `resolveLanguage` |
| N3 section | `services/game/src/notifications/challenge-section.ts` | `challengeSectionHtml`, `escapeHtml`, `resultsUrl` |
| N4 texts | `services/game/src/notifications/texts.ts` | `pushText`, `gameName`, `SECTION_TEXTS` (en, es, pt) |
| N5 APNs config | `services/game/src/notifications/apns-config.ts` | `createApnsConfigLoader`, `parseApnsSecret`, `loadApnsConfig` |
| N6 sender | `services/game/src/notifications/push-sender.ts` | `PushSender.send`, `apnsMessage`, `mapWithConcurrency` |
| N7 deploy | `scripts/deploy-daily-email-lambda.sh` | clean build, zip, `--build-only`, backup, handler check |

## 2. Patterns

### P-1 Claim before send, release on failure (NFR-DC1-4, NFR-DC1-19)
A send is a lease on the prefs item: `UpdateItem SET #a = :date` with
`attribute_exists(userId) AND (attribute_not_exists(#a) OR #a <> :date)`. Exactly one of any number of
concurrent runs wins; `attribute_exists(userId)` keeps a claim from re-creating the item of an account
deleted during the run. After a failure, `REMOVE #a` with `#a = :date` gives it back (a claim taken by a
later date is never removed). The planner also reads the claims from the scanned item, so a later run
in the window does not even try.

### P-2 Pure planner (NFR-DC1-1, NFR-DC1-3, NFR-DC1-5)
`dueSends(user, now)` has no I/O: zone, hour from `localParts` (shared, `Intl.DateTimeFormat`, DST-safe),
claims. Tests use fixed instants. Zone and language are resolved before planning from the saved value,
then the most recent device, then the default.

### P-3 Shared data once, only when needed (NFR-DC1-8)
The run plans first, then loads: APNs config only if a push is due; leaderboard and aggregates only if an
email is due; yesterday's results only if a digest is due. Per-user reads are limited to the user's own
rank (`ChallengeService.getMyEntry`) and the played check (`ChallengeService.hasPlayed`), two small
public methods added to the DC2 service.

### P-4 Bounded concurrency and isolation (NFR-DC1-10, NFR-DC1-17)
Emails go one at a time (as today). Pushes are queued as one job per user and run through
`mapWithConcurrency(jobs, 10)`: each worker catches its own errors; inside a job each device is sent in
turn and a throw counts as `failed` for that device only.

### P-5 Time budget (NFR-DC1-12)
`handler(event, context)` computes the deadline from `context.getRemainingTimeInMillis()` minus 30 s and
passes `shouldStop` to the tick. The tick checks it before each email and each push job. Users not yet
claimed remain due for the next run in the window.

### P-6 Lazy endpoints, idempotent creation (NFR-DC1-18)
Registration stores only the device. The sender creates the SNS endpoint the first time it sends:
`CreatePlatformEndpoint` (idempotent for the same token and attributes); on `InvalidParameter ... Endpoint
<arn> already exists` it reuses that ARN. Then `GetEndpointAttributes`, and `SetEndpointAttributes
Enabled=true, Token` when disabled or different (the AWS-recommended flow). The ARN is stored on the
device with a condition that the device still exists. Publish uses `MessageStructure: 'json'` with key
`APNS` (or `APNS_SANDBOX`) and the payload
`{"aps":{"alert":{"title","body"},"sound":"default"},"route":"..."}`.

### P-7 Fail-closed configuration (NFR-DC1-15, NFR-DC1-27)
Each optional part is off when its env var is unset: `createChallengeService(env)` and
`createPushDeviceService(env)` return `undefined`; the tick's `challenge` and `listDevices` deps are
absent; `loadApnsConfig` returns null for a missing id, secret, JSON or ARN. The ARN is checked against
`arn:aws:sns:<region>:<account>:app/APNS(_SANDBOX)/<name>`.

### P-8 Safe logging (NFR-DC1-24)
Structured `logger` with user id, kind, counts and `error.name`. `deleteEndpointQuietly` and the sender log
no ARN; the device id (a token hash) is not logged either. One `Daily tick` summary per run.

### P-9 Ownership by condition (NFR-DC1-22)
`deleteOwned` is a single `DeleteItem` with `ConditionExpression: 'userId = :u'` and `ReturnValues:
ALL_OLD`: no read-then-delete race, and the old item gives the endpoint to delete.

### P-10 Device identity (FR-DC-3, FR-DC-5)
`deviceId = sha256('IOS:' + token.toLowerCase())`: one owner per device; a token signed in by another user
moves to that user (the endpoint is kept, it is the same device); a change of APNs environment drops the
endpoint (it belongs to the other platform application). The `platform` attribute allows `ANDROID` items
later without a migration; the input accepts only `IOS` today.

## 3. Decisions taken in this stage (owner review)

- The tick filters scanned items on `dailyDigest === true` as well as the unchanged scan filter
  (defence in depth; same result).
- The prefs scan now paginates (`ExclusiveStartKey`); it used to read one page only, which would drop
  users past 1 MB of scanned data (NFR-DC-4).
- `saveNotificationSettings` writes only the given fields and not `updatedAt` (the digest keeps the most
  recent `updatedAt` per email address; locale saves must not change that choice).
- `getEmailPrefs` reads an item created by `saveNotificationSettings` (no `dailyDigest`) as off.
- The email subject date uses the user's zone (unchanged for US Eastern at 8am).
- The "Yesterday's challenge" section uses the user's language (FR-DC-6); the rest of the digest stays
  English as today.
- No smoke invoke in the deploy script: invoking the function sends whatever is due.
