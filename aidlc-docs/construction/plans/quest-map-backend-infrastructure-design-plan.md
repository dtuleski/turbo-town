# Infrastructure Design Plan - Quest Map QM2 Backend and Table
**Created**: 2026-11-01
**Stage**: CONSTRUCTION - Infrastructure Design (Minimal depth), unit QM2
**Unit**: components I1 (DatabaseStack), I2 (LambdaStack), I3 (app wiring), plus the prod procedure
**Basis**: `quest-map-components.md` (U4, I1 to I3), `quest-map-unit-of-work.md` (QM2), `quest-map-unit-of-work-dependency.md` section 3, `infrastructure/lib/stacks/database-stack.ts`, `lambda-stack.ts`, `bin/memory-game.ts`, `.github/workflows/deploy-lambdas.yml`, `scripts/deploy-game-lambda.sh`, workspace deployment rule
**Answers**: The owner delegated all questions. Every `[Answer]:` is the design agent's recommendation, flagged for owner review at the approval gate. No answer is vague.
**Extensions**: Security Baseline enabled; compliance in `infrastructure-design.md` section 7.
**Constraint on this stage**: no AWS or CDK command is run. Everything under "prod" is a written procedure for the owner.
---
## Execution Steps
- [x] Step 1: Analyze functional design and the existing stacks
- [x] Step 2: Create this plan
- [x] Step 3: Generate questions (below)
- [x] Step 4: Store plan
- [x] Step 5: Collect answers (self-answered by delegation); no ambiguity left
- [x] Step 6a: Create `infrastructure-design/infrastructure-design.md`
- [x] Step 6b: Create `infrastructure-design/deployment-architecture.md` (prod procedure with exact commands, not executed)
- [x] Step 7: Present completion (approval is the workflow's gate)
---
## Questions and Answers

### Question 1: Billing, encryption, recovery and deletion settings for the new table
A) Same as the other tables in `database-stack.ts`: PAY_PER_REQUEST, AWS_MANAGED, point-in-time recovery, RETAIN
B) Provisioned capacity with autoscaling

[Answer]: A. Required by NFR-QM-10 and SECURITY-01. Traffic is a few small key reads/writes per play; on-demand avoids capacity planning.

### Question 2: Key schema
A) PK `userId` (S), SK `worldId` (S), no GSI
B) PK `userId`, SK `worldId`, plus a GSI for leaderboards

[Answer]: A. Every access is by user (Get or Query). A weekly leaderboard is v2 and can add a GSI then.

### Question 3: Should the Game Lambda get the table via the existing broad DynamoDB statement?
A) No. A separate statement scoped to the one table ARN, read and write split
B) Add the ARN to the existing statement

[Answer]: A. The existing statement carries Scan and Batch actions and many tables (pre-existing debt). The new table must not widen it (SECURITY-06). Only the Game Lambda gets access; the Leaderboard, Auth and Email Lambdas get nothing.

### Question 4: How does the prod Lambda receive the env var and the policy?
A) AWS CLI: read-merge-write for the env var, `put-role-policy` for IAM. CDK deploys only `MemoryGame-Database-prod`
B) `cdk deploy MemoryGame-Lambda-prod`

[Answer]: A. B is forbidden: CDK would replace the Game Lambda code with a root-level bundle while the live handler is `dist/index.handler` (open item O3). `cdk diff` cannot show this because it compares templates, not live configuration.

### Question 5: Inline or managed IAM policy for the prod role?
A) Inline policy `QuestProgressTableAccess` via `put-role-policy`
B) Customer-managed policy plus `attach-role-policy`

[Answer]: A, as in the approved release order. It is removable with one `delete-role-policy`, never shared with another role, and touches no existing policy. SECURITY-06 prefers managed policies "where possible"; this is the documented exception, because creating a managed policy adds a second resource to track for a single-table grant. Owner may choose B; the policy document is identical.

### Question 6: Which fallback if the live Database stack is not CDK-managed (O1)?
A) `aws dynamodb create-table` with the same key schema and settings, then continue at the IAM step
B) Import the stack

[Answer]: A. Commands are in `deployment-architecture.md` section 9. The CDK diff gate decides.

### Question 7: Dev environment
A) Create the table through the CDK Database stack in dev, and verify with `cdk synth`/`cdk diff` for dev; apply env var and IAM in dev with the same CLI procedure (default profile, `MemoryGame-GameService-dev`) unless the owner confirms dev is CDK-deployed end to end
B) Skip dev

[Answer]: A. Dev state was not inspected in this stage (no AWS commands), so which dev path applies is unverified; the owner confirms before any dev run.
