# Daily Challenge and Push: Production Steps for Owner Approval

Status: DRAFT from Application Design (2026-11-26). DC2 and DC1 Infrastructure Design replace each
placeholder with the exact command and the policy JSON. Nothing here has been run. Every command uses
account 342278407349, `--profile dashden-new`, region `us-east-1`.

Rules carried from Quest Map: CDK deploys only `MemoryGame-Database-prod --exclusively` (never the Lambda
stack: its declared handler differs from the live `dist/index.handler`); env vars by read-merge-write;
IAM by `put-role-policy`; Game Lambda code only through CI on merge or `./scripts/deploy-game-lambda.sh prod`.

| # | Step | Unit | When |
|---|---|---|---|
| P1 | Read-only: `cdk diff MemoryGame-Database-prod --exclusively -c environment=prod` shows exactly two new tables (`memory-game-daily-challenge-prod`, `memory-game-push-devices-prod`) plus outputs | DC2, DC1 | before P2 |
| P2 | `cdk deploy MemoryGame-Database-prod --exclusively -c environment=prod`; check both tables ACTIVE, keys and GSIs, PITR on | DC2, DC1 | after DC1 merged |
| P3 | Game Lambda role (`aws lambda get-function-configuration --function-name MemoryGame-GameService-prod --query Role`): inline policy `DailyChallengeAccess` (GetItem, PutItem, UpdateItem, Query, DeleteItem, BatchWriteItem on both tables and their `index/*`) and `sns:DeleteEndpoint` on `arn:aws:sns:us-east-1:342278407349:endpoint/APNS/dashden-ios-prod/*` | DC2, DC1 | after P2 |
| P4 | Game Lambda env vars, read-merge-write: add `DAILY_CHALLENGE_TABLE_NAME=memory-game-daily-challenge-prod`, `PUSH_DEVICES_TABLE_NAME=memory-game-push-devices-prod`; check the count rises by 2 and nothing else changes | DC2, DC1 | after P3; the challenge goes live on the web here |
| P5 | Digest Lambda role (`DashDen-DailyEmail-prod`): inline policy with `dynamodb:UpdateItem` on `memory-game-email-prefs-prod`, the challenge and device table actions above, SNS `CreatePlatformEndpoint`, `GetEndpointAttributes`, `SetEndpointAttributes`, `DeleteEndpoint`, `Publish` scoped to the platform application and its endpoints, `secretsmanager:GetSecretValue` on `dashden/apns/prod-*` | DC1 | before P7 |
| P6 | Digest Lambda env vars, read-merge-write: `DAILY_CHALLENGE_TABLE_NAME`, `PUSH_DEVICES_TABLE_NAME`, `APNS_SECRET_ID=dashden/apns/prod`; timeout to 300 s | DC1 | before P7 |
| P7 | `./scripts/deploy-daily-email-lambda.sh --build-only`, then `./scripts/deploy-daily-email-lambda.sh` (backup kept) | DC1 | same session as P8 |
| P8 | `aws events put-rule --name DashDen-DailyDigest-Schedule --schedule-expression "cron(0/15 * * * ? *)"` (keep state and description; targets unchanged); between 00:00 and 11:45 UTC | DC1 | right after P7 |
| P9 | CloudWatch alarm on `DashDen-DailyEmail-prod` Errors >= 1 over 1 hour (SNS email to admin@dashden.app) | DC1 | after P8 |
| P10 | Apple Developer: enable Push Notifications on `app.dashden.dashdenMobile`; create an APNs key; note Key ID and Team ID | DC5 | owner, any time |
| P11 | `aws secretsmanager create-secret --name dashden/apns/prod` with `keyId`, `teamId`, `bundleId`, `signingKey` | DC1 | after P10 |
| P12 | `aws sns create-platform-application --name dashden-ios-prod --platform APNS` with token-auth attributes from the secret; then add `platformApplicationArn` to the secret (`put-secret-value`) | DC1 | after P11; push goes live here |
| P13 | Merge PRs in order DC2, DC3, DC1, DC4 (CI deploys the Game Lambda and Vercel the web); DC5 after P12 | all | DC2 to DC4 before P4; order matters |
| P14 | TestFlight build of the app with the push entitlement; App Store Connect privacy answers reviewed for push tokens | DC5 | after P12 |

Rollback: P8 back to `cron(0 12 * * ? *)` and redeploy the previous digest zip from the backup; P4 remove
the two env vars (features turn off, data kept); tables are RETAIN.
