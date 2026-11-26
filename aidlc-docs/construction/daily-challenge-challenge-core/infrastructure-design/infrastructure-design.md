# DC2 Challenge Core: Infrastructure Design

**Status: NOT EXECUTED.** Nothing here has been run against any AWS account. The owner runs the
production steps P1 to P4 in `construction/plans/daily-challenge-production-steps.md`.
Prod facts: account `342278407349`, profile `dashden-new`, region `us-east-1`, Game Lambda
`MemoryGame-GameService-prod` (handler `dist/index.handler`).

## 1. Table `memory-game-daily-challenge-<stage>` (I1)

Defined in `infrastructure/lib/stacks/database-stack.ts` as `dailyChallengeTable`, next to
`questProgressTable`.

| Property | Value |
|---|---|
| Partition key | `pk` (String): challenge day `YYYY-MM-DD` |
| Sort key | `sk` (String): `CHALLENGE` or `SCORE#<userId>` |
| GSI `rank-index` | partition `rankPk` (String), sort `rankKey` (String), projection ALL |
| GSI `user-index` | partition `userId` (String), sort `pk` (String), projection ALL |
| Billing | PAY_PER_REQUEST |
| Encryption | AWS_MANAGED (SECURITY-01) |
| Point-in-time recovery | on |
| Removal policy | RETAIN |
| Output | `DailyChallengeTableName`, export `MemoryGame<Stage>-DailyChallengeTableName` |

Size: one CHALLENGE item per day (a few KB) and at most one SCORE item per player per day. At 10,000
players the daily partition holds 10,000 small items; `countAhead` reads at most that many index keys
with `Select: 'COUNT'` (one or two pages), within on-demand capacity.

## 2. Game Lambda access (I2)

Used operations, from the code (`challenge.repository.ts`, `account-deletion.service.ts`):

| Operation | Resource | Why |
|---|---|---|
| `dynamodb:GetItem` | table | CHALLENGE and SCORE reads |
| `dynamodb:PutItem` | table | conditional CHALLENGE create, conditional best-score write |
| `dynamodb:Query` | table, `index/*` | `rank-index` top list and COUNT; `user-index` account deletion |
| `dynamodb:BatchWriteItem` | table | account deletion of SCORE items |

No `UpdateItem`, `DeleteItem` or `Scan` (SECURITY-06). Inline policy `DailyChallengeAccess` on the live
role (read with `get-function-configuration --query Role`), applied by `put-role-policy` (P3); DC1 adds
the push-devices table and `sns:DeleteEndpoint` statements to the same document before P3 is run.

CDK (`lambda-stack.ts`, dev parity only; the prod Lambda stack is never deployed): prop
`dailyChallengeTable`, env var `DAILY_CHALLENGE_TABLE_NAME`, a read statement (`GetItem`, `Query` on the
table and `index/*`) and a write statement (`PutItem`, `BatchWriteItem` on the table).

## 3. Environment variable

`DAILY_CHALLENGE_TABLE_NAME=memory-game-daily-challenge-prod` on `MemoryGame-GameService-prod`, by
read-merge-write (P4). It is not added to `validateEnvironment()` in `services/game/src/index.ts`: the
feature must stay optional. Until it is set, `createChallengeService` returns `undefined`, the challenge
operations return null, challenge starts fail closed, and account deletion skips the table.

## 4. Release order

1. Merge DC2 (and the later units, P13): CI deploys the Game Lambda code; the feature stays off.
2. P1 `cdk diff` (read-only), P2 `cdk deploy MemoryGame-Database-prod --exclusively`.
3. P3 IAM inline policy, P4 env var. The challenge appears on the web once DC4 is live.

Rollback: remove `DAILY_CHALLENGE_TABLE_NAME` by the same read-merge-write (feature off, data kept);
the table is RETAIN.

## 5. Security Baseline (infrastructure)

| Rule | Status |
|---|---|
| SECURITY-01 | Compliant: AWS-managed encryption at rest; DynamoDB over TLS |
| SECURITY-06 | Compliant: four named actions, one table ARN and its indexes, no wildcard actions |
| SECURITY-07 | N/A: no network change |
| SECURITY-15 | Compliant: unset env var turns the feature off; table RETAIN and PITR |
