# DC1 Notifications Backend: NFR Requirements, NFR Design and Infrastructure Design Plan

Unit DC1, branch `feat/dc1-notifications-backend` (cut from `feat/dc3-repeatable-content` at 26dcfbb).
Inputs: `inception/requirements/daily-challenge-requirements.md`, application design (components G4 to
G8, N1 to N7, I1 to I5; flows S4 to S8; plan Q1 to Q3), the code of `services/game/src/daily-email.ts`,
`email-prefs.service.ts`, `account-deletion.service.ts`, `scripts/deploy-*.sh`. Answers self-approved
2026-11-26 under the owner's delegation ("I want to defer to all your recommendations. Just go!!"),
flagged for owner review. Depth: standard.

## Plan

- [x] NFR Requirements: delivery window and claims, 10,000-user sizing, secret handling, reliability,
      security, compatibility (`daily-challenge-notifications-backend/nfr-requirements/nfr-requirements.md`)
- [x] NFR Design: patterns and their files (`daily-challenge-notifications-backend/nfr-design/nfr-design.md`)
- [x] Infrastructure Design: push-devices table, IAM JSON for both roles, env vars, timeout, schedule,
      APNs and SNS, alarm, deploy script, release order (`daily-challenge-notifications-backend/infrastructure-design/infrastructure-design.md`)
- [x] Production steps: P0 added, push-devices parts of P1 to P3, P5 to P12 written
      (`construction/plans/daily-challenge-production-steps.md`)

## Questions and answers

### Q1. How long is a send window and what makes it once per day?
A) One local hour (08:00 to 08:59, 12:00 to 12:59) with a claim per kind per local date on the prefs
item (recommended); B) exact quarter-hour; C) a send log table.
[Answer]: A, as decided in application design Q2. The hour lets three later runs catch a missed one.

### Q2. How does a run fit 10,000 users?
A) One paginated prefs scan and one device scan per run, shared data once and only when due, pushes 10
users at a time, emails sequential, a 300 s timeout and a stop 30 s before it, the next run resuming
through the claims (recommended); B) fan out per user with SQS.
[Answer]: A. B adds a queue and a consumer for no gain at this size. Known limit recorded in the NFR
requirements: Resend's API rate limit bounds email throughput; the scale path is a sender change.

### Q3. Where does the push configuration come from?
A) The secret `APNS_SECRET_ID` read at runtime, cached 10 minutes, push off when absent (recommended).
[Answer]: A (application design Q3). Only the ARNs are read; the role may read only that secret.

### Q4. When does the Game Lambda's UpdateItem on email prefs become necessary?
[Answer]: When DC1 is deployed (CI on merge), because `setPrefs` moves from PutItem to UpdateItem. The
live role's permissions are not in the repository, so P0 is a read-only `simulate-principal-policy`
check before the merge, with a one-statement inline policy only when needed.

### Q5. Sandbox (Xcode debug) devices?
[Answer]: Supported by an optional second platform application `dashden-ios-sandbox` (`APNS_SANDBOX`) and
the secret key `platformApplicationArnSandbox`. Without it, sandbox devices are skipped. TestFlight and
App Store builds use production APNs.

### Q6. Is the push-devices table added to the CDK Lambda stack?
[Answer]: No. Only `database-stack.ts` (plan item 22). The prod Lambda stack is never deployed and the
live roles get inline policies.

## Approval

Self-approved 2026-11-26 under the owner's delegation; logged in `aidlc-docs/audit.md`.
