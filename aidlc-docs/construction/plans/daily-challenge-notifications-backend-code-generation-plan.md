# DC1 Notifications Backend: Code Generation Plan

Unit DC1, branch `feat/dc1-notifications-backend`. Design: `../daily-challenge-notifications-backend/`.
Self-approved 2026-11-26 under the owner's delegation.

## Steps

- [x] 1. `EmailPrefsService` (G7): injectable client and table; `setPrefs` via UpdateItem (`SET email,
      username, dailyDigest, updatedAt`); `setLocale` (validated zone and language, only given fields,
      no `updatedAt`); `claimSend` (`attribute_exists(userId) AND (attribute_not_exists(#a) OR #a <> :d)`);
      `releaseSend` (`REMOVE #a` if `#a = :d`). Test: `services/game/tests/unit/services/email-prefs.service.test.ts`
      (aws-sdk-client-mock).
- [x] 2. `PushDeviceRepository` (G5) and `PushDeviceService` (G6) with `createPushDeviceService(env)`;
      `deviceIdFor` = sha256 `IOS:<token lower-case>`; `@aws-sdk/client-sns` dev dependency
      (`^3.1009.0`, same as the other SDK clients; the runtime provides it). Test:
      `tests/unit/services/push-device.service.test.ts`.
- [x] 3. `GameHandler` routes `registerPushDevice`, `unregisterPushDevice` (`{ ok: false }` when off),
      `saveNotificationSettings`; `getEmailPrefs` reads a missing toggle as off; `schema.graphql` docs.
      Test: `tests/unit/game.handler.push.test.ts`.
- [x] 4. Account deletion (G8): devices via `user-index` and their SNS endpoints when
      `PUSH_DEVICES_TABLE_NAME` is set. Tests added to `tests/unit/services/account-deletion.service.test.ts`.
- [x] 5. `src/notifications/{due,texts,apns-config,push-sender,challenge-section}.ts`; `ChallengeService`
      gains `getMyEntry` and `hasPlayed`. Tests: `tests/unit/notifications/*.test.ts`.
- [x] 6. `src/daily-email.ts`: `runTick(deps, now)` with pre-draw, paginated scan, dedupe, devices, plan,
      APNs, shared data, digest email (existing content plus the challenge section), digest push, challenge
      push, summary; `handler` kept (adds the time budget). Test: `tests/unit/daily-email.tick.test.ts`.
- [x] 7. `scripts/deploy-daily-email-lambda.sh` (`--build-only` makes no AWS call); CDK
      `pushDevicesTable` and output `PushDevicesTableName` in `infrastructure/lib/stacks/database-stack.ts`.
- [x] 8. Build and Test summary `construction/build-and-test/daily-challenge-notifications-backend-build-and-test-summary.md`.
