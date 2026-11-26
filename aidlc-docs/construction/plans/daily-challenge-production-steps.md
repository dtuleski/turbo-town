# Daily Challenge and Push: Production Steps for Owner Approval

Status: COMPLETE, for owner approval (2026-11-26). P1 to P4 written by DC2 Infrastructure Design
(section "DC2 commands"); DC1 Infrastructure Design added P0, the push-devices parts of P1 to P3, and
P5 to P12 (section "DC1 commands"). Nothing here has been run. Every command uses account 342278407349,
`--profile dashden-new`, region `us-east-1`.

Rules carried from Quest Map: CDK deploys only `MemoryGame-Database-prod --exclusively` (never the Lambda
stack: its declared handler differs from the live `dist/index.handler`); env vars by read-merge-write;
IAM by `put-role-policy`; Game Lambda code only through CI on merge or `./scripts/deploy-game-lambda.sh prod`.

| # | Step | Unit | When |
|---|---|---|---|
| P0 | Read-only check that the Game Lambda role may `dynamodb:UpdateItem` on `memory-game-email-prefs-prod` (DC1 changes `setPrefs` from PutItem to UpdateItem); if not, add inline policy `EmailPrefsUpdate` | DC1 | before DC1 is merged (CI deploys the Game Lambda on merge) |
| P1 | Read-only: `cdk diff MemoryGame-Database-prod --exclusively -c environment=prod` shows exactly two new tables (`memory-game-daily-challenge-prod`, `memory-game-push-devices-prod`) plus outputs | DC2, DC1 | before P2 |
| P2 | `cdk deploy MemoryGame-Database-prod --exclusively -c environment=prod`; check both tables ACTIVE, keys and GSIs, PITR on | DC2, DC1 | after DC1 merged |
| P3 | Game Lambda role (`aws lambda get-function-configuration --function-name MemoryGame-GameService-prod --query Role`): inline policy `DailyChallengeAccess`. DC2 part: GetItem, PutItem, BatchWriteItem on `memory-game-daily-challenge-prod`, Query on it and its `index/*` (section P3 below). DC1 adds the push-devices table statements and `sns:DeleteEndpoint` on `arn:aws:sns:us-east-1:342278407349:endpoint/APNS/dashden-ios-prod/*` to the same document | DC2, DC1 | after P2 |
| P4 | Game Lambda env vars, read-merge-write: add `DAILY_CHALLENGE_TABLE_NAME=memory-game-daily-challenge-prod`, `PUSH_DEVICES_TABLE_NAME=memory-game-push-devices-prod`; check the count rises by 2 and nothing else changes | DC2, DC1 | after P3; the challenge goes live on the web here |
| P5 | Digest Lambda role (`DashDen-DailyEmail-prod`): inline policy `DailyChallengeNotifications` with `dynamodb:UpdateItem` on `memory-game-email-prefs-prod`, challenge table GetItem, PutItem, Query (table and indexes), device table Scan, UpdateItem, DeleteItem, SNS `CreatePlatformEndpoint` on the platform applications, `GetEndpointAttributes`, `SetEndpointAttributes`, `DeleteEndpoint`, `Publish` on their endpoints, `secretsmanager:GetSecretValue` on `dashden/apns/prod-??????` | DC1 | before P7 |
| P6 | Digest Lambda env vars, read-merge-write: `DAILY_CHALLENGE_TABLE_NAME`, `PUSH_DEVICES_TABLE_NAME`, `APNS_SECRET_ID=dashden/apns/prod`; timeout to 300 s; runtime check (Node.js 18 or later) | DC1 | before P7 |
| P7 | `./scripts/deploy-daily-email-lambda.sh --build-only`, then `./scripts/deploy-daily-email-lambda.sh` (backup kept) | DC1 | same session as P8 |
| P8 | `aws events put-rule --name DashDen-DailyDigest-Schedule --schedule-expression "cron(0/15 * * * ? *)"` (keep state, description and role; targets unchanged); between 00:00 and 11:45 UTC | DC1 | right after P7 |
| P9 | SNS topic `dashden-ops-alerts` (email to admin@dashden.app) and CloudWatch alarm `DashDen-DailyEmail-prod-Errors` (Errors >= 1 over 1 hour) | DC1 | after P8 |
| P10 | Apple Developer: enable Push Notifications on `app.dashden.dashdenMobile`; create an APNs key; note Key ID and Team ID | DC5 (steps written by DC1) | owner, any time |
| P11 | `aws secretsmanager create-secret --name dashden/apns/prod` with `keyId`, `teamId`, `bundleId`, `signingKey` | DC1 | after P10 |
| P12 | `aws sns create-platform-application --name dashden-ios-prod --platform APNS` with token-auth attributes from the secret (optional `dashden-ios-sandbox`, `APNS_SANDBOX`, for Xcode debug builds); then add `platformApplicationArn` to the secret (`put-secret-value`) | DC1 | after P11; push goes live here (within 10 minutes, the config cache) |
| P13 | Merge PRs in order DC2, DC3, DC1, DC4 (CI deploys the Game Lambda and Vercel the web); DC5 after P12 | all | DC2 to DC4 before P4; P0 before DC1; order matters |
| P14 | TestFlight build of the app with the push entitlement; App Store Connect privacy answers reviewed for push tokens | DC5 | after P12 |

Rollback: P8 back to `cron(0 12 * * ? *)` and redeploy the previous digest zip from the backup; P6 remove
the three digest env vars (push and the challenge section off); P4 remove the two Game Lambda env vars
(features turn off, data kept); tables are RETAIN.
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
- `AWS::DynamoDB::Table` `memory-game-push-devices-prod` (DC1): key `deviceId` HASH (String); GSI
  `user-index` (`userId` HASH, projection ALL); `PAY_PER_REQUEST`; SSE enabled; point-in-time recovery
  enabled; `DeletionPolicy` and `UpdateReplacePolicy` `Retain`;
- added Outputs only: `DailyChallengeTableName` and `PushDevicesTableName` plus CDK-generated export entries.

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

Push-devices table (DC1), read-only:

```zsh
aws dynamodb describe-table --table-name memory-game-push-devices-prod \
  --profile dashden-new --region us-east-1 \
  --query 'Table.{Status:TableStatus,Keys:KeySchema,Billing:BillingModeSummary.BillingMode,SSE:SSEDescription.Status,GSIs:GlobalSecondaryIndexes[].{Name:IndexName,Keys:KeySchema,Projection:Projection.ProjectionType,Status:IndexStatus},Arn:TableArn}'
aws dynamodb describe-continuous-backups --table-name memory-game-push-devices-prod \
  --profile dashden-new --region us-east-1 \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus' --output text
```

Expected: `Status` ACTIVE; key `deviceId` HASH; `Billing` PAY_PER_REQUEST; `SSE` ENABLED; GSI `user-index`
ACTIVE (`userId` HASH, projection ALL); PITR `ENABLED`; `Arn`
`arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-push-devices-prod`.

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
    },
    {
      "Sid": "PushDevices",
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:BatchWriteItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-push-devices-prod"
    },
    {
      "Sid": "PushDevicesByUser",
      "Effect": "Allow",
      "Action": ["dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-push-devices-prod/index/*"
    },
    {
      "Sid": "PushEndpointDelete",
      "Effect": "Allow",
      "Action": ["sns:DeleteEndpoint"],
      "Resource": [
        "arn:aws:sns:us-east-1:342278407349:endpoint/APNS/dashden-ios-prod/*",
        "arn:aws:sns:us-east-1:342278407349:endpoint/APNS_SANDBOX/dashden-ios-sandbox/*"
      ]
    }
  ]
}
JSON
# Statements PushDevices, PushDevicesByUser and PushEndpointDelete are DC1's (register, unregister,
# account deletion of devices and their SNS endpoints).
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

## DC1 commands (P0, P5 to P12)

Same rules as the DC2 section: zsh with `aws` CLI v2 and `jq`, each block saved to a file and run with
`zsh -eu <file>` from the repository root on a clean `main` checkout, identity check first, stop at the
first unexpected result. Design: `construction/daily-challenge-notifications-backend/infrastructure-design/infrastructure-design.md`.

### P0. Game Lambda may update email prefs (before DC1 is merged)

DC1 changes `setPrefs` (the Profile toggle) and adds `saveNotificationSettings`, both UpdateItem on the
email-prefs table. CI deploys the Game Lambda when DC1 is merged, so the role must allow UpdateItem
first. The check is read-only; the policy is added only when the check says it is missing.

```zsh
FN=MemoryGame-GameService-prod
PREFS=arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-email-prefs-prod
ROLE_ARN=$(aws lambda get-function-configuration --function-name "$FN" \
  --profile dashden-new --region us-east-1 --query Role --output text) || exit 1
ROLE_NAME=${ROLE_ARN##*/}
echo "Role: $ROLE_NAME"
# Read-only
DECISION=$(aws iam simulate-principal-policy --policy-source-arn "$ROLE_ARN" \
  --action-names dynamodb:UpdateItem dynamodb:GetItem --resource-arns "$PREFS" \
  --profile dashden-new --query 'EvaluationResults[?EvalActionName==`dynamodb:UpdateItem`].EvalDecision' --output text) || exit 1
echo "UpdateItem on email prefs: $DECISION"
if [[ "$DECISION" != "allowed" ]]; then
  TMP=$(mktemp -d)
  cat > "$TMP/email-prefs-update.json" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EmailPrefsUpdate",
      "Effect": "Allow",
      "Action": ["dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-email-prefs-prod"
    }
  ]
}
JSON
  # Mutating: one new inline policy
  aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name EmailPrefsUpdate \
    --policy-document "file://$TMP/email-prefs-update.json" --profile dashden-new
  rm -rf "$TMP"
  sleep 10
  aws iam simulate-principal-policy --policy-source-arn "$ROLE_ARN" --action-names dynamodb:UpdateItem \
    --resource-arns "$PREFS" --profile dashden-new --query 'EvaluationResults[0].EvalDecision' --output text
  # expected: allowed
fi
```

### P5. Inline policy on the digest Lambda role

```zsh
FN=DashDen-DailyEmail-prod
TMP=$(mktemp -d)
ROLE_ARN=$(aws lambda get-function-configuration --function-name "$FN" \
  --profile dashden-new --region us-east-1 --query Role --output text) || exit 1
ROLE_NAME=${ROLE_ARN##*/}
GAME_ROLE=$(aws lambda get-function-configuration --function-name MemoryGame-GameService-prod \
  --profile dashden-new --region us-east-1 --query Role --output text) || exit 1
[[ "$ROLE_ARN" != "$GAME_ROLE" ]] || { echo "digest and Game Lambda share a role; stop and review"; exit 1; }
echo "Role: $ROLE_NAME"
# Read-only: what the role has today (kept as is)
aws iam list-role-policies --role-name "$ROLE_NAME" --profile dashden-new --output text
aws iam list-attached-role-policies --role-name "$ROLE_NAME" --profile dashden-new --output text

cat > "$TMP/notifications-policy.json" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EmailPrefsClaims",
      "Effect": "Allow",
      "Action": ["dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-email-prefs-prod"
    },
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
      "Sid": "DailyChallengeDraw",
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-daily-challenge-prod"
    },
    {
      "Sid": "PushDevices",
      "Effect": "Allow",
      "Action": ["dynamodb:Scan", "dynamodb:UpdateItem", "dynamodb:DeleteItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:342278407349:table/memory-game-push-devices-prod"
    },
    {
      "Sid": "SnsCreateEndpoint",
      "Effect": "Allow",
      "Action": ["sns:CreatePlatformEndpoint"],
      "Resource": [
        "arn:aws:sns:us-east-1:342278407349:app/APNS/dashden-ios-prod",
        "arn:aws:sns:us-east-1:342278407349:app/APNS_SANDBOX/dashden-ios-sandbox"
      ]
    },
    {
      "Sid": "SnsEndpoints",
      "Effect": "Allow",
      "Action": ["sns:GetEndpointAttributes", "sns:SetEndpointAttributes", "sns:DeleteEndpoint", "sns:Publish"],
      "Resource": [
        "arn:aws:sns:us-east-1:342278407349:endpoint/APNS/dashden-ios-prod/*",
        "arn:aws:sns:us-east-1:342278407349:endpoint/APNS_SANDBOX/dashden-ios-sandbox/*"
      ]
    },
    {
      "Sid": "ApnsSecret",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:342278407349:secret:dashden/apns/prod-??????"
    }
  ]
}
JSON
jq . "$TMP/notifications-policy.json" > /dev/null || exit 1

# Mutating: adds one new inline policy; existing policies are untouched.
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name DailyChallengeNotifications \
  --policy-document "file://$TMP/notifications-policy.json" --profile dashden-new

# Verify (read-only)
aws iam get-role-policy --role-name "$ROLE_NAME" --policy-name DailyChallengeNotifications \
  --profile dashden-new --query PolicyDocument --output json \
  | jq -S . | diff - <(jq -S . "$TMP/notifications-policy.json") && echo "policy OK"
rm -rf "$TMP"
```

### P6. Digest Lambda env vars and timeout (read-merge-write)

```zsh
FN=DashDen-DailyEmail-prod
TMP=$(mktemp -d)
aws lambda get-function-configuration --function-name "$FN" \
  --profile dashden-new --region us-east-1 --output json > "$TMP/config-backup.json" || exit 1
echo "Runtime: $(jq -r .Runtime "$TMP/config-backup.json")  Handler: $(jq -r .Handler "$TMP/config-backup.json")  Timeout: $(jq .Timeout "$TMP/config-backup.json")"
jq -e '.Runtime | test("^nodejs(1[89]|[2-9][0-9])\\.x$")' "$TMP/config-backup.json" > /dev/null \
  || { echo "runtime older than nodejs18.x (AWS SDK v3 not provided); stop"; exit 1; }
[[ "$(jq -r .Handler "$TMP/config-backup.json")" == "dist/daily-email.handler" ]] || { echo "unexpected handler; stop"; exit 1; }
BEFORE=$(jq '(.Environment.Variables // {}) | length' "$TMP/config-backup.json")
[[ "$BEFORE" -gt 0 ]] || { echo "no existing variables (RESEND_API_KEY expected); stop"; exit 1; }
jq -e '(.Environment.Variables // {}) | (has("DAILY_CHALLENGE_TABLE_NAME") or has("PUSH_DEVICES_TABLE_NAME") or has("APNS_SECRET_ID")) | not' \
  "$TMP/config-backup.json" > /dev/null || { echo "already set; stop and review"; exit 1; }

jq '{Variables: ((.Environment.Variables // {}) + {
      DAILY_CHALLENGE_TABLE_NAME: "memory-game-daily-challenge-prod",
      PUSH_DEVICES_TABLE_NAME: "memory-game-push-devices-prod",
      APNS_SECRET_ID: "dashden/apns/prod"})}' \
  "$TMP/config-backup.json" > "$TMP/env.json"
echo "Before: $BEFORE. To write: $(jq '.Variables | length' "$TMP/env.json") (must be before + 3)"

# Mutating
aws lambda update-function-configuration --function-name "$FN" --environment "file://$TMP/env.json" \
  --timeout 300 --profile dashden-new --region us-east-1 --query '{State:LastUpdateStatus,Timeout:Timeout}'
aws lambda wait function-updated --function-name "$FN" --profile dashden-new --region us-east-1

# Verify
aws lambda get-function-configuration --function-name "$FN" \
  --profile dashden-new --region us-east-1 --output json > "$TMP/after.json"
echo "After: $(jq '.Environment.Variables | length' "$TMP/after.json") (expected $((BEFORE + 3))); Timeout $(jq .Timeout "$TMP/after.json") (expected 300)"
diff <(jq -S '.Environment.Variables | del(.DAILY_CHALLENGE_TABLE_NAME, .PUSH_DEVICES_TABLE_NAME, .APNS_SECRET_ID)' "$TMP/after.json") \
     <(jq -S '.Environment.Variables // {}' "$TMP/config-backup.json") && echo "old variables unchanged"
rm -rf "$TMP"
```

The old code ignores the new variables, so P6 changes nothing until P7.

### P7. Deploy the digest Lambda code

```zsh
./scripts/deploy-daily-email-lambda.sh --build-only     # no AWS call
unzip -l /tmp/daily-email-lambda-prod.zip dist/daily-email.js
./scripts/deploy-daily-email-lambda.sh                  # account check, backup, deploy, handler check
```

Note the backup path the script prints. Continue with P8 in the same session.

### P8. Schedule every 15 minutes (between 00:00 and 11:45 UTC)

```zsh
RULE=DashDen-DailyDigest-Schedule
TMP=$(mktemp -d)
NOW_MIN=$(( 10#$(date -u +%H) * 60 + 10#$(date -u +%M) ))
(( NOW_MIN <= 705 )) || { echo "run between 00:00 and 11:45 UTC; stop"; exit 1; }
aws events describe-rule --name "$RULE" --profile dashden-new --region us-east-1 --output json > "$TMP/rule.json" || exit 1
jq '{Name, ScheduleExpression, State, Description, RoleArn, EventBusName}' "$TMP/rule.json"
[[ "$(jq -r .ScheduleExpression "$TMP/rule.json")" == "cron(0 12 * * ? *)" ]] || { echo "unexpected schedule; stop"; exit 1; }
aws events list-targets-by-rule --rule "$RULE" --profile dashden-new --region us-east-1 --output json > "$TMP/targets-before.json"
ARGS=(--name "$RULE" --schedule-expression "cron(0/15 * * * ? *)" --state "$(jq -r .State "$TMP/rule.json")")
DESC=$(jq -r '.Description // empty' "$TMP/rule.json")
ROLE=$(jq -r '.RoleArn // empty' "$TMP/rule.json")
if [[ -n "$DESC" ]]; then ARGS+=(--description "$DESC"); fi
if [[ -n "$ROLE" ]]; then ARGS+=(--role-arn "$ROLE"); fi

# Mutating
aws events put-rule "${ARGS[@]}" --profile dashden-new --region us-east-1

# Verify
aws events describe-rule --name "$RULE" --profile dashden-new --region us-east-1 --query '{Schedule:ScheduleExpression,State:State}'
aws events list-targets-by-rule --rule "$RULE" --profile dashden-new --region us-east-1 --output json \
  | jq -S . | diff - <(jq -S . "$TMP/targets-before.json") && echo "targets unchanged"
rm -rf "$TMP"
```

Expected: `cron(0/15 * * * ? *)`, state unchanged (ENABLED). In CloudWatch Logs of `DashDen-DailyEmail-prod`
the next runs log one `Daily tick` line each; at 8am New York (13:00 UTC in winter, 12:00 UTC in summer)
`digestEmail.sent` matches the opted-in US Eastern users.

Rollback: the same put-rule with `cron(0 12 * * ? *)`, then
`aws lambda update-function-code --function-name DashDen-DailyEmail-prod --zip-file fileb://<backup zip> --profile dashden-new --region us-east-1`.

### P9. Error alarm

```zsh
TOPIC_ARN=$(aws sns create-topic --name dashden-ops-alerts --profile dashden-new --region us-east-1 \
  --query TopicArn --output text) || exit 1
aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol email --notification-endpoint admin@dashden.app \
  --profile dashden-new --region us-east-1
echo "Confirm the subscription from the email sent to admin@dashden.app"
aws cloudwatch put-metric-alarm --alarm-name DashDen-DailyEmail-prod-Errors \
  --namespace AWS/Lambda --metric-name Errors --dimensions Name=FunctionName,Value=DashDen-DailyEmail-prod \
  --statistic Sum --period 3600 --evaluation-periods 1 --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold --treat-missing-data notBreaching \
  --alarm-actions "$TOPIC_ARN" --profile dashden-new --region us-east-1
aws cloudwatch describe-alarms --alarm-names DashDen-DailyEmail-prod-Errors \
  --profile dashden-new --region us-east-1 --query 'MetricAlarms[0].{State:StateValue,Threshold:Threshold,Period:Period}'
```

### P10. Apple Developer (owner, in the browser)

1. developer.apple.com, Certificates, Identifiers & Profiles, Identifiers, `app.dashden.dashdenMobile`:
   tick Push Notifications, Save (regenerate the App Store provisioning profile afterwards; Xcode
   automatic signing does this on the next archive).
2. Keys, "+": name `DashDen APNs`, tick Apple Push Notifications service (APNs), environment Sandbox &
   Production, Continue, Register, Download `AuthKey_<KEYID>.p8` (only once). Note the Key ID.
3. Membership details: note the Team ID.

Keep the `.p8` outside the repository; delete the local copy after P12.

### P11. Secret with the APNs key

```zsh
P8_FILE=$HOME/Downloads/AuthKey_XXXXXXXXXX.p8   # set to the downloaded file
KEY_ID=XXXXXXXXXX                               # Key ID from P10
TEAM_ID=XXXXXXXXXX                              # Team ID from P10
BUNDLE_ID=app.dashden.dashdenMobile
[[ -f "$P8_FILE" && "$KEY_ID" != XXXXXXXXXX && "$TEAM_ID" != XXXXXXXXXX ]] || { echo "set P8_FILE, KEY_ID, TEAM_ID"; exit 1; }
grep -q "BEGIN PRIVATE KEY" "$P8_FILE" || { echo "not a .p8 key; stop"; exit 1; }
TMP=$(mktemp -d); chmod 700 "$TMP"
jq -n --arg keyId "$KEY_ID" --arg teamId "$TEAM_ID" --arg bundleId "$BUNDLE_ID" --rawfile signingKey "$P8_FILE" \
  '{keyId: $keyId, teamId: $teamId, bundleId: $bundleId, signingKey: $signingKey}' > "$TMP/secret.json"

# Mutating
aws secretsmanager create-secret --name dashden/apns/prod \
  --description "APNs token-auth key for DashDen iOS push (Amazon SNS)" \
  --secret-string "file://$TMP/secret.json" --profile dashden-new --region us-east-1 --query ARN --output text
rm -rf "$TMP"
# Verify (keys only, never the values)
aws secretsmanager get-secret-value --secret-id dashden/apns/prod --profile dashden-new --region us-east-1 \
  --query SecretString --output text | jq -c 'keys'
# expected: ["bundleId","keyId","signingKey","teamId"]
```

The ARN ends in `dashden/apns/prod-` plus 6 characters, which the P5 policy matches.

### P12. SNS platform application, then push goes live

```zsh
SECRET_ID=dashden/apns/prod
TMP=$(mktemp -d); chmod 700 "$TMP"
aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --profile dashden-new --region us-east-1 \
  --query SecretString --output text > "$TMP/secret.json" || exit 1
jq '{PlatformCredential: .signingKey, PlatformPrincipal: .keyId, ApplePlatformTeamID: .teamId, ApplePlatformBundleID: .bundleId}' \
  "$TMP/secret.json" > "$TMP/attrs.json"

# Mutating: App Store and TestFlight builds use the production APNs environment
APP_ARN=$(aws sns create-platform-application --name dashden-ios-prod --platform APNS \
  --attributes "file://$TMP/attrs.json" --profile dashden-new --region us-east-1 \
  --query PlatformApplicationArn --output text) || exit 1
echo "$APP_ARN"   # expected arn:aws:sns:us-east-1:342278407349:app/APNS/dashden-ios-prod

# Optional, for Xcode debug builds (environment sandbox) only:
# SANDBOX_ARN=$(aws sns create-platform-application --name dashden-ios-sandbox --platform APNS_SANDBOX \
#   --attributes "file://$TMP/attrs.json" --profile dashden-new --region us-east-1 --query PlatformApplicationArn --output text)
# and add  platformApplicationArnSandbox: $SANDBOX_ARN  in the jq below.

jq --arg arn "$APP_ARN" '. + {platformApplicationArn: $arn}' "$TMP/secret.json" > "$TMP/secret-new.json"
# Mutating: new secret version with the ARN; push turns on within 10 minutes (config cache)
aws secretsmanager put-secret-value --secret-id "$SECRET_ID" --secret-string "file://$TMP/secret-new.json" \
  --profile dashden-new --region us-east-1 --query VersionId --output text
rm -rf "$TMP"

# Verify (read-only)
aws sns get-platform-application-attributes --platform-application-arn "$APP_ARN" \
  --profile dashden-new --region us-east-1 --query 'Attributes.{Enabled:Enabled,Auth:AuthenticationMethod,Bundle:ApplePlatformBundleID}'
# expected Enabled true, Auth Token, Bundle app.dashden.dashdenMobile
aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --profile dashden-new --region us-east-1 \
  --query SecretString --output text | jq -c 'keys'
# expected: ["bundleId","keyId","platformApplicationArn","signingKey","teamId"]
```

After P12, the next `Daily tick` with a due push logs `apns: "on"`. Until the app (DC5) registers
devices there is nothing to send. Delete the local `.p8` file.
