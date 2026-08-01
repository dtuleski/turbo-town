# Implementation Plan: Inactive User Activation Email

## Overview

Implement a daily activation email system that identifies inactive users (zero games played) from Cognito, checks opt-out preferences in DynamoDB, and sends personalized HTML emails via Resend API encouraging them to play their first game. Includes an unsubscribe endpoint for CAN-SPAM compliance. Follows the same patterns as the existing `daily-email.ts` handler.

## Tasks

- [x] 1. Create activation email handler with user eligibility logic
  - [x] 1.1 Create `services/game/src/activation-email.ts` with Lambda handler scaffold
    - Set up imports for DynamoDB, Cognito, and Secrets Manager clients
    - Define `ActivationEmailResult` interface and `CognitoUser` interface
    - Implement `handler()` function skeleton that returns the summary response
    - Add environment variable references: `EMAIL_PREFS_TABLE_NAME`, `GAMES_TABLE_NAME`, `COGNITO_USER_POOL_ID`, `RESEND_API_KEY`
    - Use the same `sendViaResend` pattern from `daily-email.ts`
    - _Requirements: 2.1, 2.2, 7.3_

  - [x] 1.2 Implement Cognito user pool query with pagination
    - Use `ListUsersCommand` with `Filter: "email_verified = true"` to get verified users
    - Handle pagination via `PaginationToken` to retrieve all users
    - Extract `sub` (userId), `email`, `preferred_username`/`name` attributes into `CognitoUser` objects
    - User pool ID: `us-east-1_FoWLQ5lmI`
    - _Requirements: 1.1_

  - [x] 1.3 Implement inactive user classification logic
    - For each Cognito user, query `memory-game-games-prod` table with `userId` as partition key, `Limit: 1`, `Select: 'COUNT'`
    - Implement `isUserInactive(gameCount: number): boolean` — returns true iff gameCount === 0
    - Implement `isUserEligible(user, gameCount, optedOut): boolean` — true when emailVerified && gameCount === 0 && !optedOut
    - _Requirements: 1.2, 1.3, 4.1, 4.2_

  - [x] 1.4 Implement opt-out check against email preferences table
    - Query `memory-game-email-prefs-prod` for each inactive user by `userId`
    - Check for `activationEmailOptOut === true` field
    - Exclude opted-out users from eligible list
    - _Requirements: 1.4, 5.3_

  - [ ]* 1.5 Write property tests for user eligibility logic (fast-check)
    - **Property 1: User classification is determined solely by game count**
    - Generate random game counts (0 to 1000), verify `isUserInactive(count)` returns true iff count === 0
    - **Validates: Requirements 1.2, 1.3, 4.1**

  - [ ]* 1.6 Write property test for opt-out exclusion (fast-check)
    - **Property 2: Opted-out users are always excluded**
    - Generate random user sets with random opt-out flags, verify opted-out users never appear in eligible list
    - **Validates: Requirements 1.4, 5.3**

- [x] 2. Implement activation email template and sending
  - [x] 2.1 Implement `buildActivationEmailHTML(username: string): string`
    - Self-contained HTML with inline styles, no external CSS
    - DashDen branding: purple/pink gradient header (`#6366f1` to `#ec4899`)
    - Personalized greeting with username and friendly emoji
    - Body mentions specific games: Space Entry, Code-a-Bot, Math Challenge, Pattern Recall
    - Prominent "Play Now" CTA button linking to `https://dashden.app`
    - Explanation of why user is receiving the email ("You signed up but haven't played yet")
    - Unsubscribe link in footer pointing to `/api/unsubscribe?userId={userId}&type=activation`
    - Physical address / business contact info in footer for CAN-SPAM
    - Responsive design for mobile and desktop
    - Body text ≤ 150 words (excluding footer)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.5, 6.1, 6.3, 6.4, 6.5_

  - [x] 2.2 Implement `getActivationEmailSubject(): string`
    - Include "DashDen" text and a game-related emoji (e.g., 🎮, 🚀)
    - Keep subject concise and engaging for kids/families
    - _Requirements: 6.2_

  - [x] 2.3 Wire email sending into the handler loop
    - For each eligible user, render HTML with `buildActivationEmailHTML`
    - Send via `sendViaResend` from `no-reply@dashden.app`
    - Wrap each send in try/catch — on failure, log error with masked email and userId, increment `emailsFailed` counter, continue to next user
    - On success, increment `emailsSent` counter
    - _Requirements: 3.1, 3.7, 7.2_

  - [x] 2.4 Implement summary logging and response
    - Log run completion with: `totalCognitoUsers`, `inactiveUsers`, `optedOutUsers`, `eligibleUsers`, `emailsSent`, `emailsFailed`, `durationMs`
    - Return `ActivationEmailResult` with statusCode and summary object
    - _Requirements: 7.1, 7.3_

  - [ ]* 2.5 Write property tests for email template (fast-check)
    - **Property 3: Email personalization includes username**
    - Generate random username strings, verify `buildActivationEmailHTML(username)` contains the username
    - **Validates: Requirements 3.2**

  - [ ]* 2.6 Write property test for game mention (fast-check)
    - **Property 4: Email mentions at least one game**
    - Call `buildActivationEmailHTML` with random usernames, verify output contains at least one known game name
    - **Validates: Requirements 3.5**

  - [ ]* 2.7 Write property test for subject line (fast-check)
    - **Property 5: Subject line contains brand and emoji**
    - Call `getActivationEmailSubject()`, verify contains "DashDen" and at least one emoji character
    - **Validates: Requirements 6.2**

  - [ ]* 2.8 Write property test for body conciseness (fast-check)
    - **Property 6: Body content is concise**
    - Render email with random usernames, strip HTML, count words in body before footer, verify ≤ 150
    - **Validates: Requirements 6.3**

- [x] 3. Checkpoint - Ensure core logic and template tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement error isolation and batch processing
  - [x] 4.1 Ensure error isolation in the send loop
    - Verify that a failure sending to one user does not halt processing of remaining users
    - Use individual try/catch per user in the batch loop
    - Log each failure with `[ActivationEmail]` prefix, userId, and masked email
    - _Requirements: 2.3, 7.2_

  - [ ]* 4.2 Write property test for error isolation (fast-check)
    - **Property 7: Error isolation — single failure does not halt processing**
    - Mock Resend to fail at random position K in a batch of N users, verify N-1 other sends are attempted
    - **Validates: Requirements 7.2**

  - [ ]* 4.3 Write property test for summary accuracy (fast-check)
    - **Property 8: Summary response accuracy**
    - Run handler with mocked dependencies, random N eligible users, random M failures, verify summary counts match
    - **Validates: Requirements 7.3**

- [x] 5. Implement unsubscribe endpoint
  - [x] 5.1 Add public unsubscribe route to the game service
    - Create a handler for `GET /api/unsubscribe` that accepts `userId` and `type=activation` query params
    - Write `activationEmailOptOut: true` to `memory-game-email-prefs-prod` table for the given userId
    - Return a simple HTML page confirming the unsubscribe ("You've been unsubscribed from DashDen activation emails")
    - No authentication required (public route for CAN-SPAM compliance)
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ]* 5.2 Write unit tests for unsubscribe endpoint
    - Test that valid userId writes opt-out preference to DynamoDB
    - Test that missing userId returns 400 error
    - Test that response HTML confirms unsubscription
    - _Requirements: 5.2, 5.3_

- [x] 6. Checkpoint - Ensure all handler and unsubscribe tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Infrastructure and deployment wiring
  - [x] 7.1 Create deployment script or update existing infrastructure for the new Lambda
    - Lambda function name: `DashDen-ActivationEmail-prod`
    - Handler: `dist/activation-email.handler`
    - Runtime: Node.js 18.x
    - Timeout: 900 seconds (15 min for large user base)
    - Environment variables: `EMAIL_PREFS_TABLE_NAME`, `GAMES_TABLE_NAME`, `COGNITO_USER_POOL_ID`
    - IAM permissions: Cognito ListUsers, DynamoDB Query/GetItem/PutItem, Secrets Manager GetSecretValue
    - _Requirements: 2.1, 2.2_

  - [x] 7.2 Configure EventBridge cron rule
    - Rule: `cron(0 13 * * ? *)` (13:00 UTC = 8am EST)
    - Target: `DashDen-ActivationEmail-prod` Lambda
    - _Requirements: 2.1_

  - [x] 7.3 Wire the unsubscribe route into the game service router
    - Add the `/api/unsubscribe` GET route to the game service's Express/API handler
    - Ensure the route is publicly accessible (no auth middleware)
    - _Requirements: 5.2, 5.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- The activation email handler follows the same patterns as `services/game/src/daily-email.ts`
- Use `--profile dashden-new` for all prod AWS CLI deployments
- The Resend API key is stored in Secrets Manager, following existing patterns

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.1", "2.2"] },
    { "id": 2, "tasks": ["1.5", "1.6", "2.3", "2.5", "2.6", "2.7", "2.8"] },
    { "id": 3, "tasks": ["2.4", "4.1", "5.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.2"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3"] }
  ]
}
```
