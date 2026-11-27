# Daily Challenge and Push: Production Steps for Owner Approval

Status: DRAFT from Application Design (2026-11-26). P1 to P4 completed by DC2 Infrastructure Design
(2026-11-26, section "DC2 commands" below); DC1 adds its table, statements and P5 to P12. Nothing here has been run. Every command uses
account 342278407349, `--profile dashden-new`, region `us-east-1`.

Rules carried from Quest Map: CDK deploys only `MemoryGame-Database-prod --exclusively` (never the Lambda
stack: its declared handler differs from the live `dist/index.handler`); env vars by read-merge-write;
IAM by `put-role-policy`; Game Lambda code only through CI on merge or `./scripts/deploy-game-lambda.sh prod`.

| # | Step | Unit | When |
|---|---|---|---|
| P1 | Read-only: `cdk diff MemoryGame-Database-prod --exclusively -c environment=prod` shows exactly two new tables (`memory-game-daily-challenge-prod`, `memory-game-push-devices-prod`) plus outputs | DC2, DC1 | before P2 |
| P2 | `cdk deploy MemoryGame-Database-prod --exclusively -c environment=prod`; check both tables ACTIVE, keys and GSIs, PITR on | DC2, DC1 | after DC1 merged |
| P3 | Game Lambda role (`aws lambda get-function-configuration --function-name MemoryGame-GameService-prod --query Role`): inline policy `DailyChallengeAccess`. DC2 part: GetItem, PutItem, BatchWriteItem on `memory-game-daily-challenge-prod`, Query on it and its `index/*` (section P3 below). DC1 adds the push-devices table statements and `sns:DeleteEndpoint` on `arn:aws:sns:us-east-1:342278407349:endpoint/APNS/dashden-ios-prod/*` to the same document | DC2, DC1 | after P2 |
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
## DC2 commands (P1 to P4)

Shell: zsh on macOS, `aws` CLI v2 and `jq`. Run from the repository root on a clean checkout of `main`
that contains the merged units (`git status` clean). Save each block below to a file and run it with
`zsh -eu <file>` (not pasted into an interactive shell), so `exit 1` and any failing command stop only
that block. Stop at the first unexpected result. Identity check before every session:

```zsh
aws sts get-caller-identity --profile dashden-new --region us-east-1 --query Account --output text
# expected: 342278407349. Anything else: stop.
```

Forbidden against prod: `infrastructure/scripts/deploy.sh prod`, `cdk deploy --all`,
`cdk deploy MemoryGame-Lambda-prod`, `--require-approval never`.

### P1. Read-only diff

```zsh
cd infrastructure
npx cdk diff MemoryGame-Database-prod -c environment=prod --profile dashden-new --exclusively
cd ..
```

Pass only if the diff shows nothing but added resources and outputs:
- `AWS::DynamoDB::Table` `memory-game-daily-challenge-prod`: keys `pk` HASH, `sk` RANGE (String);
  GSI `rank-index` (`rankPk` HASH, `rankKey` RANGE, projection ALL) and GSI `user-index` (`userId` HASH,
  `pk` RANGE, projection ALL); `PAY_PER_REQUEST`; SSE enabled; point-in-time recovery enabled;
  `DeletionPolicy` and `UpdateReplacePolicy` `Retain`;
- the push-devices table from DC1 (its checks are in DC1's section);
- added Outputs only: `DailyChallengeTableName` (and DC1's) plus CDK-generated export entries.

Stop if any existing resource, output or export is modified, replaced or removed.

### P2. Deploy the Database stack and verify

```zsh
cd infrastructure
# Mutating. Leave the approval prompt on.
npx cdk deploy MemoryGame-Database-prod -c environment=prod --profile dashden-new --exclusively
cd ..

# Read-only checks
aws dynamodb describe-table --table-name memory-game-daily-challenge-prod \
  --profile dashden-new --region us-east-1 \
  --query 'Table.{Status:TableStatus,Keys:KeySchema,Billing:BillingModeSummary.BillingMode,SSE:SSEDescription.Status,GSIs:GlobalSecondaryIndexes[].{Name:IndexName,Keys:KeySchema,Projection:Projection.ProjectionType,Status:IndexStatus},Arn:TableArn}'
aws dynamodb describe-continuous-backups --table-name memory-game-daily-challenge-prod \
  --profile dashden-new --region us-east-1 \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus' --output text
```

Expected: `Status` ACTIVE; keys `pk` HASH, `sk` RANGE; `Billing` PAY_PER_REQUEST; `SSE` ENABLED; both
GSIs ACTIVE with the keys above and projection ALL; PITR `ENABLED`; `Arn`
`arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-daily-challenge-prod`.

### P3. Inline policy on the live Game Lambda role

```zsh
FN=MemoryGame-GameService-prod
TMP=$(mktemp -d)
ROLE_ARN=$(aws lambda get-function-configuration --function-name "$FN" \
  --profile dashden-new --region us-east-1 --query Role --output text) || exit 1
ROLE_NAME=${ROLE_ARN##*/}
echo "Role: $ROLE_NAME"   # confirm it is the Game Lambda's role before continuing

cat > "$TMP/daily-challenge-policy.json" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DailyChallengeRead",
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:Query"],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-daily-challenge-prod",
        "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-daily-challenge-prod/index/*"
      ]
    },
    {
      "Sid": "DailyChallengeWrite",
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:BatchWriteItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-daily-challenge-prod"
    }
  ]
}
JSON
# DC1 appends its push-devices and sns:DeleteEndpoint statements to this document before it is run.
jq . "$TMP/daily-challenge-policy.json" > /dev/null || exit 1   # valid JSON

# Mutating: adds one new inline policy; existing policies are untouched.
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name DailyChallengeAccess \
  --policy-document "file://$TMP/daily-challenge-policy.json" --profile dashden-new --region us-east-1

# Verify (read-only): the stored document equals the file
aws iam get-role-policy --role-name "$ROLE_NAME" --policy-name DailyChallengeAccess \
  --profile dashden-new --region us-east-1 --query PolicyDocument --output json \
  | jq -S . | diff - <(jq -S . "$TMP/daily-challenge-policy.json") && echo "policy OK"
rm -rf "$TMP"
```

### P4. Environment variables by read-merge-write

`update-function-configuration --environment` replaces every variable, so the full map is read, merged
and written back. The backup holds secret ARNs: it stays in a temp folder outside the repository and is
deleted at the end.

```zsh
FN=MemoryGame-GameService-prod
TMP=$(mktemp -d)
aws lambda get-function-configuration --function-name "$FN" \
  --profile dashden-new --region us-east-1 --output json > "$TMP/config-backup.json" || exit 1
BEFORE=$(jq '.Environment.Variables | length' "$TMP/config-backup.json")
[[ "$BEFORE" -gt 0 ]] || { echo "no existing variables; stop"; exit 1; }
jq -e '.Environment.Variables | has("DAILY_CHALLENGE_TABLE_NAME") or has("PUSH_DEVICES_TABLE_NAME") | not' \
  "$TMP/config-backup.json" > /dev/null || { echo "already set; stop and review"; exit 1; }

jq '{Variables: (.Environment.Variables + {
      DAILY_CHALLENGE_TABLE_NAME: "memory-game-daily-challenge-prod",
      PUSH_DEVICES_TABLE_NAME: "memory-game-push-devices-prod"})}' \
  "$TMP/config-backup.json" > "$TMP/env.json"
echo "Before: $BEFORE. To write: $(jq '.Variables | length' "$TMP/env.json") (must be before + 2)"

# Mutating
aws lambda update-function-configuration --function-name "$FN" --environment "file://$TMP/env.json" \
  --profile dashden-new --region us-east-1 --query '{State:LastUpdateStatus,Count:length(Environment.Variables)}'
aws lambda wait function-updated --function-name "$FN" --profile dashden-new --region us-east-1

# Verify: count is before + 2, old variables unchanged, handler unchanged
aws lambda get-function-configuration --function-name "$FN" \
  --profile dashden-new --region us-east-1 --output json > "$TMP/after.json"
echo "After: $(jq '.Environment.Variables | length' "$TMP/after.json") (expected $((BEFORE + 2)))"
echo "Handler: $(jq -r .Handler "$TMP/after.json") (expected dist/index.handler)"
diff <(jq -S '.Environment.Variables | del(.DAILY_CHALLENGE_TABLE_NAME, .PUSH_DEVICES_TABLE_NAME)' "$TMP/after.json") \
     <(jq -S '.Environment.Variables' "$TMP/config-backup.json") && echo "old variables unchanged"
rm -rf "$TMP"
```

Smoke check after P4 (web signed in, or any GraphQL client with a valid token): `getDailyChallenge`
returns `gameId` `code-a-bot` until DC3's generators are deployed, then a drawn game.

Rollback of P4: the same read-merge-write with
`jq '{Variables: (.Environment.Variables | del(.DAILY_CHALLENGE_TABLE_NAME, .PUSH_DEVICES_TABLE_NAME))}'`.
