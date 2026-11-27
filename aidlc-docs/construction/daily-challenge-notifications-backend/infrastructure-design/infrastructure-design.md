# DC1 Notifications Backend: Infrastructure Design

**Status: NOT EXECUTED.** Nothing here has been run against any AWS account. The owner runs the
production steps in `construction/plans/daily-challenge-production-steps.md` (P0, P1 to P3 additions,
P5 to P12). Prod facts: account `342278407349`, profile `dashden-new`, region `us-east-1`; Game Lambda
`MemoryGame-GameService-prod` (handler `dist/index.handler`); digest Lambda `DashDen-DailyEmail-prod`
(handler `dist/daily-email.handler`); schedule `DashDen-DailyDigest-Schedule` (today `cron(0 12 * * ? *)`).

## 1. Table `memory-game-push-devices-<stage>` (I1)

Defined in `infrastructure/lib/stacks/database-stack.ts` as `pushDevicesTable`, after
`dailyChallengeTable`; deployed with the same `cdk deploy MemoryGame-Database-prod --exclusively` (P2).

| Property | Value |
|---|---|
| Partition key | `deviceId` (String): sha256 hex of `IOS:<token lower-case>` |
| GSI `user-index` | partition `userId` (String), projection ALL |
| Billing | PAY_PER_REQUEST |
| Encryption | AWS_MANAGED |
| Point-in-time recovery | on |
| Removal policy | RETAIN |
| Output | `PushDevicesTableName`, export `MemoryGame<Stage>-PushDevicesTableName` |

Item: `{ deviceId, userId, platform, token, environment, endpointArn?, timeZone?, language?, createdAt,
updatedAt }`. 10,000 devices are about 4 MB.

`lambda-stack.ts` is not changed: the prod Lambda stack is never deployed, and the live roles get
inline policies (P3, P5).

## 2. Email-prefs table (existing `memory-game-email-prefs-prod`)

No schema change. New attributes on the item: `timeZone`, `language`, `lastDigestEmailOn`,
`lastDigestPushOn`, `lastChallengePushOn`. Writes move from PutItem to UpdateItem in the Game Lambda
(`setPrefs`, `saveNotificationSettings`) and UpdateItem is new for the digest Lambda (claims).

## 3. Game Lambda access (I2): additions to `DailyChallengeAccess` (P3) and P0

| Operation | Resource | Why |
|---|---|---|
| `dynamodb:GetItem`, `PutItem`, `DeleteItem`, `BatchWriteItem` | push-devices table | register (read, write), unregister (conditional delete), account deletion (batch) |
| `dynamodb:Query` | push-devices `index/*` | account deletion via `user-index` |
| `sns:DeleteEndpoint` | `arn:aws:sns:us-east-1:342278407349:endpoint/APNS/dashden-ios-prod/*` and `.../endpoint/APNS_SANDBOX/dashden-ios-sandbox/*` | unregister and account deletion |
| `dynamodb:UpdateItem` | `memory-game-email-prefs-prod` | `setPrefs` and `saveNotificationSettings` (P0: required before DC1 is merged, because CI deploys the Game Lambda on merge) |

Full JSON: production steps P3 (statements `PushDevices`, `PushDevicesByUser`, `PushEndpointDelete`) and P0
(`EmailPrefsUpdate`, only if the read-only simulation says it is missing).

## 4. Digest Lambda (I3): role, env vars, timeout

Inline policy `DailyChallengeNotifications` on the digest role (P5); the existing Scan permissions on
email-prefs, leaderboard entries and aggregates are kept as they are.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "EmailPrefsClaims", "Effect": "Allow", "Action": ["dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-email-prefs-prod" },
    { "Sid": "DailyChallengeRead", "Effect": "Allow", "Action": ["dynamodb:GetItem", "dynamodb:Query"],
      "Resource": ["arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-daily-challenge-prod",
                   "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-daily-challenge-prod/index/*"] },
    { "Sid": "DailyChallengeDraw", "Effect": "Allow", "Action": ["dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-daily-challenge-prod" },
    { "Sid": "PushDevices", "Effect": "Allow", "Action": ["dynamodb:Scan", "dynamodb:UpdateItem", "dynamodb:DeleteItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-push-devices-prod" },
    { "Sid": "SnsCreateEndpoint", "Effect": "Allow", "Action": ["sns:CreatePlatformEndpoint"],
      "Resource": ["arn:aws:sns:us-east-1:342278407349:app/APNS/dashden-ios-prod",
                   "arn:aws:sns:us-east-1:342278407349:app/APNS_SANDBOX/dashden-ios-sandbox"] },
    { "Sid": "SnsEndpoints", "Effect": "Allow",
      "Action": ["sns:GetEndpointAttributes", "sns:SetEndpointAttributes", "sns:DeleteEndpoint", "sns:Publish"],
      "Resource": ["arn:aws:sns:us-east-1:342278407349:endpoint/APNS/dashden-ios-prod/*",
                   "arn:aws:sns:us-east-1:342278407349:endpoint/APNS_SANDBOX/dashden-ios-sandbox/*"] },
    { "Sid": "ApnsSecret", "Effect": "Allow", "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:342278407349:secret:dashden/apns/prod-??????" }
  ]
}
```

Why each action: claims (UpdateItem prefs); pre-draw (GetItem today/yesterday, PutItem conditional
create); results and own rank (GetItem, Query `rank-index` with COUNT); played check (GetItem); devices
(Scan once per run, UpdateItem `endpointArn`, DeleteItem invalid devices); SNS lazy endpoint flow and
publish; the APNs secret. No wildcard actions; the sandbox application ARN is listed so debug builds
work if the owner creates it (P12, optional).

Env vars (P6, read-merge-write, nothing else changes):

| Name | Value |
|---|---|
| `DAILY_CHALLENGE_TABLE_NAME` | `memory-game-daily-challenge-prod` |
| `PUSH_DEVICES_TABLE_NAME` | `memory-game-push-devices-prod` |
| `APNS_SECRET_ID` | `dashden/apns/prod` |

Existing variables (`EMAIL_PREFS_TABLE_NAME`, `LEADERBOARD_TABLE_NAME`, `AGGREGATES_TABLE_NAME`,
`RESEND_API_KEY`, if set) are kept. Timeout: 300 s (from whatever it is today). The runtime must be
Node.js 18 or later (AWS SDK v3 provided; SNS and Secrets Manager clients are not bundled); P6 checks it.

## 5. Schedule (I4)

`DashDen-DailyDigest-Schedule`: `cron(0 12 * * ? *)` to `cron(0/15 * * * ? *)`, state, description and
targets unchanged (P8), right after the code deploy (P7), between 00:00 and 11:45 UTC. The new code
sends only what is due: left on the old daily 12:00 UTC schedule it would send almost nothing (12:00 UTC
is 7am in New York in winter), which is why P7 and P8 run in one session. Lambda async retries (2) are
safe: the handler throws only when the prefs scan fails, and claims stop duplicates.

## 6. APNs and SNS (I5)

| Resource | Name | Notes |
|---|---|---|
| Apple app id capability | Push Notifications on `app.dashden.dashdenMobile` | P10, Apple Developer portal |
| APNs auth key | `.p8`, Key ID, Team ID | P10; downloaded once; kept only in the secret |
| Secret | `dashden/apns/prod` | JSON `{ keyId, teamId, bundleId, signingKey, platformApplicationArn, platformApplicationArnSandbox? }`; AWS-managed KMS key (P11, P12) |
| SNS platform application | `dashden-ios-prod`, platform `APNS`, token auth | App Store and TestFlight builds (P12) |
| SNS platform application (optional) | `dashden-ios-sandbox`, platform `APNS_SANDBOX` | Xcode debug builds only (P12) |

Push goes live when the secret holds `platformApplicationArn` (cache: within 10 minutes).

## 7. Alarm (SECURITY-14)

P9: SNS topic `dashden-ops-alerts` with an email subscription to `admin@dashden.app`, and alarm
`DashDen-DailyEmail-prod-Errors` on `AWS/Lambda` `Errors` for `FunctionName=DashDen-DailyEmail-prod`,
Sum >= 1 over 3600 s, `TreatMissingData notBreaching`.

## 8. Deploy script (N7)

`scripts/deploy-daily-email-lambda.sh`: builds shared and the game service from a clean `dist/`, checks
`dist/daily-email.js` (syntax and `exports.handler`), assembles `dist/` plus `uuid`, `zod` and
`@memory-game/shared` (the AWS SDK comes from the runtime), zips to `/tmp/daily-email-lambda-prod.zip`,
checks the size and the entries with `unzip -l`. `--build-only` stops there with no AWS call. Deploy mode:
account check, backup of the deployed code (`aws lambda get-function` `Code.Location`, kept in
`services/game/lambda-backups/`, last 5), `update-function-code`, wait, handler check
`dist/daily-email.handler`, rollback command printed. No smoke invoke.

## 9. Release order and rollback

1. P0 (Game Lambda can UpdateItem email prefs) before DC1 is merged. Merge DC2, DC3, DC1, DC4 (P13); push
   and the tick stay off (no env vars on the digest Lambda; old code still deployed there).
2. P1 diff and P2 deploy both tables; P3 Game Lambda policy; P4 Game Lambda env vars (device operations
   live; devices are stored, nothing is sent).
3. P5 digest policy, P6 env vars and timeout, P7 digest code, P8 schedule (one session).
4. P9 alarm.
5. P10 to P12 APNs; push goes live. DC5 app release after P12.

Rollback: P8 back to `cron(0 12 * * ? *)` and redeploy the backup zip; remove the digest env vars (push and
challenge section off); remove `PUSH_DEVICES_TABLE_NAME` from the Game Lambda (device operations answer
`ok: false`). Tables are RETAIN; the secret can be scheduled for deletion by the owner.

## 10. Security Baseline (infrastructure)

| Rule | Status |
|---|---|
| SECURITY-01 | Compliant: push-devices table AWS-managed encryption; secret encrypted by Secrets Manager; SNS, APNs, Secrets Manager and DynamoDB over TLS |
| SECURITY-06 | Compliant: named actions per table, index, platform application, endpoint prefix and one secret ARN; no wildcard actions |
| SECURITY-07 | N/A: no network change |
| SECURITY-12 | Compliant: APNs key only in Secrets Manager and SNS |
| SECURITY-14 | Compliant: summary log per run and the P9 alarm |
| SECURITY-15 | Compliant: unset env vars turn each part off; tables RETAIN and PITR |
