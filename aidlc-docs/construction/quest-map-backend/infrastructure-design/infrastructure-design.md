# Infrastructure Design - QM2 Backend and Table
**Stage**: CONSTRUCTION - Infrastructure Design (minimal), unit QM2
**Basis**: `quest-map-components.md` U4 and I1 to I3, `database-stack.ts` (read), `lambda-stack.ts` (read), `bin/memory-game.ts` (read), plan `quest-map-backend-infrastructure-design-plan.md`
**Status of code**: the CDK changes below are specified here and written in Code Generation. Nothing in this stage changed `infrastructure/`. No AWS or CDK command was run.

---

## 1. Service mapping
| Logical component | AWS resource | Env | Notes |
|---|---|---|---|
| Quest progress store (B1) | DynamoDB table `memory-game-quest-progress-{env}` | dev, prod | New |
| Game Service (B2 to B8) | Existing Lambda `MemoryGame-GameService-{env}` | dev, prod | Gains one env var and one IAM grant. No new function |
| Metrics (B7) | CloudWatch custom metrics via the existing publisher | dev, prod | Existing `cloudwatch:PutMetricData` statement already covers it (read in `lambda-stack.ts`) |

No new network, API route, queue, bucket, alarm or secret.

## 2. I1 - table (`database-stack.ts`)
| Setting | Value | Matches existing tables |
|---|---|---|
| `tableName` | `memory-game-quest-progress-${environment}` | pattern `memory-game-<name>-${environment}` |
| Partition key | `userId` (STRING) | yes |
| Sort key | `worldId` (STRING) | like `gamesTable` (`userId` + `gameId`) |
| Billing | `PAY_PER_REQUEST` | yes |
| Encryption | `TableEncryption.AWS_MANAGED` | yes |
| Point-in-time recovery | `true` | yes |
| Removal policy | `RETAIN` | yes |
| GSIs / TTL / streams | none | n/a |

Also: `public readonly questProgressTable: dynamodb.Table;` and a `CfnOutput` `QuestProgressTableName` with export name `MemoryGame<Env>-QuestProgressTableName`, following the pattern at the end of the file.

## 3. I2 - Lambda stack (`lambda-stack.ts`)
- New required prop `questProgressTable: dynamodb.ITable`.
- Game function environment: `QUEST_PROGRESS_TABLE_NAME: props.questProgressTable.tableName`.
- Two new statements on the **Game function only**, separate from the existing shared statement (which is not edited):
  - Read: `dynamodb:GetItem`, `dynamodb:Query` on `props.questProgressTable.tableArn`.
  - Write: `dynamodb:PutItem`, `dynamodb:UpdateItem` on `props.questProgressTable.tableArn`.
- No `/index/*` resource (the table has no index), no wildcard action, no wildcard resource.
- Auth and Leaderboard functions are not touched.

## 4. I3 - wiring (`bin/memory-game.ts`)
Pass `questProgressTable: databaseStack.questProgressTable` to `LambdaStack`. The existing `lambdaStack.addDependency(databaseStack)` already orders the stacks.

**Expected synthesized effect on the Database stack** (confirmed on `cdk synth` in dev during Code Generation, before the owner runs anything in prod): one new `AWS::DynamoDB::Table`; the explicit `QuestProgressTableName` Output and export; and CDK-generated Output/export entries for the cross-stack references from `LambdaStack` (table name and ARN). All are additions. If synth shows anything else in the Database stack, Code Generation stops and escalates.

## 5. Runtime configuration
| Item | Value | Where set |
|---|---|---|
| `QUEST_PROGRESS_TABLE_NAME` | `memory-game-quest-progress-{env}` | dev: CDK or CLI (plan Q7); prod: **AWS CLI only** (read-merge-write) |
| `validateEnvironment()` in `services/game/src/index.ts` | Not edited | Variable is deliberately not required, so the code can ship before the table exists |
| Default in code | None | Unset means quest operations fail closed (plan Q8 of the functional plan) |

## 6. Deployment facts that shape the design
- `.github/workflows/deploy-lambdas.yml` runs only `aws lambda update-function-code` (Game, Leaderboard, Email Sender, on push to `main` for `services/game/src/**`, `services/leaderboard/src/**`, `services/email-sender/**`, `packages/shared/**`). No CDK runs in CI.
- `scripts/deploy-game-lambda.sh` ships a `dist/`-prefixed zip, checks and fixes `Handler` to `dist/index.handler`, deploys, and smoke tests. It does not touch environment variables (read in the script: it only calls `update-function-code` and `update-function-configuration --handler`), so a code deploy preserves the variable added by hand.
- CDK `LambdaStack` declares the Game function with `handler: 'handler'` and a root-level bundle. This differs from live `dist/index.handler`. **`MemoryGame-Lambda-prod` must never be CDK-deployed for this feature (O3).** `infrastructure/scripts/deploy.sh prod`, `cdk deploy --all` and `--require-approval never` against prod are forbidden for the same reason.
- Whether the live prod stacks in account `342278407349` are CDK-managed is unverified (O1). The read-only `cdk diff` is the gate; the `create-table` fallback exists.

## 7. Security Baseline compliance
| Rule | Status | Basis |
|---|---|---|
| SECURITY-01 | Compliant | Managed-key encryption at rest, PITR; DynamoDB API is TLS only |
| SECURITY-02 | N/A | No gateway, load balancer or CDN |
| SECURITY-03 | N/A for infra | Application logging is in the functional design; Lambda log retention is unchanged |
| SECURITY-04 | N/A | No HTML-serving endpoint |
| SECURITY-05 | N/A | No new API surface at infrastructure level |
| SECURITY-06 | Compliant, one documented exception | Four named actions, one table ARN, read and write in separate statements, Game Lambda only. Exception: in prod the grant is an inline policy (plan Q5), the approved release design; policy content is identical to a managed policy |
| SECURITY-07 | N/A | No network configuration; Lambda uses the DynamoDB public endpoint over TLS as the other tables do |
| SECURITY-08 | N/A for infra | Application-level control is in the functional design |
| SECURITY-09 | Compliant | No default credentials, no public resource; `RETAIN` prevents accidental deletion |
| SECURITY-10 | N/A | No dependency change |
| SECURITY-11 | Compliant | Separate statement avoids widening the shared grant |
| SECURITY-12 | N/A | No auth change |
| SECURITY-13 | Compliant | PITR gives recovery; procedure backs up Lambda configuration before the change |
| SECURITY-14 | N/A | No alarm added (pre-existing debt); table is covered by account-level CloudTrail if enabled (not verified) |
| SECURITY-15 | Compliant | Procedure has read-back verification and stop conditions after each step |

No blocking finding.
