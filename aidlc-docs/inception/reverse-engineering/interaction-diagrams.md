# Interaction Diagrams

## Verified against

- `apps/web/src/context/AuthContext.tsx` (`AuthProvider`, authentication methods)
- `apps/web/src/pages/hub/GameHubPage.tsx` (`loadGames`, `handleGameClick`)
- `apps/web/src/api/game.ts` and `apps/web/src/api/leaderboard.ts`
- `services/game/src/index.ts` (`handler`) and `services/game/src/handlers/game.handler.ts` (`GameHandler.routeOperation`)
- `services/game/src/services/game.service.ts` (`GameService.startGame`, `completeGame`, `canStartGame`)
- `services/game/src/services/stripe.service.ts` (`StripeService`) and `services/game/src/services/review.service.ts` (`ReviewService`)
- `services/game/src/services/event-publisher.service.ts` (`EventPublisherService.publishGameCompleted`)
- `services/leaderboard/src/index.ts`, `services/leaderboard/src/handlers/event.handler.ts`, and `services/leaderboard/src/handlers/graphql.handler.ts`
- `infrastructure/lib/stacks/api-stack.ts` and `infrastructure/lib/stacks/leaderboard-lambda-stack.ts`
- `.github/workflows/deploy-lambdas.yml`

These diagrams describe observed source behavior. Dashed or optional interactions identify code paths whose deployed wiring is not fully represented by current CDK.

## Account registration and login

```mermaid
sequenceDiagram
  actor Player
  participant Web as Web authentication UI
  participant PublicApi as Public Game API route
  participant Game as Game Lambda
  participant Cognito as Amazon Cognito

  Player->>Web: Submit email username and password
  Web->>PublicApi: Check username availability
  PublicApi->>Game: Invoke checkUsernameAvailable
  Game->>Cognito: Search preferred username
  Cognito-->>Game: Matching users
  Game-->>Web: Availability result

  alt Username is available
    Web->>Cognito: Sign up through Amplify
    Cognito-->>Player: Send email confirmation code
    Player->>Web: Enter confirmation code
    Web->>Cognito: Confirm sign up
    Cognito-->>Web: Confirmation succeeds
  else Username is unavailable
    Web-->>Player: Request another username
  end

  Player->>Web: Submit login credentials
  Web->>Cognito: Sign in through Amplify
  Cognito-->>Web: ID token and user attributes
  Web-->>Player: Navigate to game hub
```
**Text alternative:** Registration first checks username availability through the unauthenticated `/game/public` route, whose Game handler queries Cognito. If available, the web app calls Cognito through Amplify and asks the player to confirm the emailed code when required. Login also goes directly through Amplify/Cognito. The web app stores the returned ID token for later API calls and navigates to the hub. Google login uses Cognito redirect flow as a separate option.

Evidence: `apps/web/src/context/AuthContext.tsx` (`register`, `confirmEmail`, `login`, `loginWithGoogle`), `apps/web/src/pages/auth/RegisterPage.tsx` (`onSubmit`, `onConfirmEmail`), `services/game/src/index.ts` (`isCheckUsername`, `isPublicRoute`), and `services/game/src/handlers/game.handler.ts` (`checkUsernameAvailable`). The custom Resend email-sender implementation exists at `services/email-sender/index.js`, but its Cognito trigger attachment is not defined by `CognitoStack`.

## Catalog discovery and session start

```mermaid
sequenceDiagram
  actor Player
  participant Web as Game hub or setup page
  participant Api as Protected Game API route
  participant Game as Game Lambda
  participant Catalog as Catalog table
  participant Reviews as Reviews table
  participant Subs as Subscriptions table
  participant Limits as Daily rate limits table
  participant Themes as Themes table
  participant Sessions as Games table

  Web->>Api: Request available games
  Api->>Game: Invoke listAvailableGames
  Game->>Catalog: Query active and coming soon rows
  Catalog-->>Game: Sorted catalog items
  Game-->>Web: Catalog items

  Web->>Api: Request review statistics
  Api->>Game: Invoke getReviewStats
  Game->>Reviews: Query game type index
  Reviews-->>Game: Ratings
  Game-->>Web: Per game ratings

  Web->>Api: Request canStartGame
  Api->>Game: Invoke canStartGame
  Game->>Subs: Read active tier
  Subs-->>Game: Tier or Free
  Game-->>Web: Tier and placeholder allowance

  Player->>Web: Choose game and difficulty
  Web->>Api: Submit startGame
  Api->>Game: Invoke authenticated start
  Game->>Subs: Read active tier
  Game->>Limits: Check daily allowance
  Game->>Themes: Require published theme
  Game->>Sessions: Create in progress session
  Game->>Limits: Increment usage
  Game-->>Web: Session and post start remaining flag
  alt Page receives canPlay false
    Web-->>Player: Redirect even though session exists
  else Page receives canPlay true
    Web-->>Player: Begin local gameplay
  end
```
**Text alternative:** The hub independently loads catalog items, review summaries, and the user's tier. A frontend paid-game list may redirect the player before play. The authoritative `startGame` operation reads the subscription, enforces paid-game and difficulty rules plus the daily allowance, verifies a published theme, creates an in-progress game record, and increments usage. Its `canPlay` flag describes remaining allowance after that increment. Some current pages redirect when the flag is false even though the just-created session is valid; otherwise the session ID is used for later completion.

Evidence: `apps/web/src/pages/hub/GameHubPage.tsx` (`loadGames`, `handleGameClick`), `services/game/src/repositories/game-catalog.repository.ts` (`getAllGames`), `services/game/src/services/review.service.ts` (`getReviewStats`), and `services/game/src/services/game.service.ts` (`canStartGame`, `startGame`). The `canStartGame` response currently reports `canPlay: true`, zero usage, and full remaining allowance; only `startGame` performs the actual limit check. Its returned `canPlay` indicates whether another play remains after incrementing usage, although some pages treat it as permission for the session just created.

## Browser gameplay and completion processing

```mermaid
sequenceDiagram
  actor Player
  participant Web as Browser game engine
  participant Api as Protected Game API route
  participant Game as Game Service
  participant Sessions as Games table
  participant Score as Score calculator
  participant Achievements as Achievement tracker
  participant Bus as EventBridge game events
  participant Leader as Leaderboard Lambda
  participant LeaderData as Leaderboard data

  Player->>Web: Interact with local game simulation
  Web->>Web: Track time attempts and performance counters
  Player->>Web: Finish the game
  Web->>Api: Submit completeGame metrics
  Api->>Game: Invoke authenticated completion
  Game->>Sessions: Read session by user and game ID
  Sessions-->>Game: In progress session
  Game->>Score: Calculate score breakdown
  Score-->>Game: Final score and factors
  Game->>Sessions: Mark completed and store score
  Game->>Achievements: Track completion milestones
  Achievements-->>Game: Newly unlocked achievements or empty list
  Game->>Bus: Publish GameCompleted
  Game->>Leader: Invoke asynchronously
  Game-->>Web: Score breakdown achievements and null rank
  Web-->>Player: Show completion modal

  Bus-->>Leader: Deliver GameCompleted through rule
  Leader->>Leader: Validate score and inspect anomalies
  Leader->>LeaderData: Put leaderboard entry
  Leader->>LeaderData: Read and put user aggregate
```
**Text alternative:** Gameplay state is local to the browser. On completion, the browser reports elapsed time, attempts, and optional counters. The Game Service validates the session and generic bounds, computes and stores the score, and attempts achievement tracking. It submits the same completion payload through EventBridge and a direct asynchronous Lambda invocation. The browser receives the score breakdown immediately, but not a rank. Leaderboard processing later validates the event, checks anomalies, writes an entry, and updates the user's aggregate. Either delivery route can reach Leaderboard, so duplicate delivery is possible.

Evidence: `apps/web/src/pages/mini-golf/MiniGolfGamePage.tsx` (`MiniGolfGamePage`, `handleGameComplete`), `apps/web/src/api/game.ts` (`CompleteGameInput`), `services/game/src/services/game.service.ts` (`completeGame`), `services/game/src/services/score-calculator.service.ts` (`calculateScoreBreakdown`), `services/game/src/services/event-publisher.service.ts` (`publishGameCompleted`), and `services/leaderboard/src/handlers/event.handler.ts` (`handleGameCompletedEvent`). `GameHandler.completeGame` explicitly returns `leaderboardRank: null`.

## Leaderboard read

```mermaid
sequenceDiagram
  actor Player
  participant Web as Leaderboard page
  participant Api as Protected Leaderboard API route
  participant Entry as Leaderboard Lambda entry point
  participant Handler as GraphQL handler
  participant Cognito as Cognito JWKS endpoint
  participant Bucket as Rate limit buckets table
  participant Service as Leaderboard service
  participant Entries as Leaderboard entries table
  participant Aggregates as User aggregates table

  Player->>Web: Select game type and timeframe
  Web->>Api: Send query with Cognito ID token
  Api->>Api: Validate token with user pool authorizer
  Api->>Entry: Invoke HTTP Lambda event
  Entry->>Handler: Convert to AppSync shaped event
  Handler->>Cognito: Fetch or reuse signing keys
  Cognito-->>Handler: Public signing keys
  Handler->>Handler: Verify signature issuer expiry and token use
  Handler->>Bucket: Consume one token
  Bucket-->>Handler: Remaining request allowance
  Handler->>Service: Request ranked view

  alt All time ranking
    Service->>Aggregates: Read top user aggregates
    Aggregates-->>Service: Aggregate records
    Service->>Entries: Resolve best game records
    Entries-->>Service: Best score records
  else Daily weekly or monthly ranking
    Service->>Entries: Query timeframe index
    Entries-->>Service: Matching scores
  end

  Service->>Service: Keep user bests sort and assign ranks
  Service-->>Web: Entries current user entry and total
  Web-->>Player: Render leaderboard
```
**Text alternative:** The browser sends a Cognito token to the protected Leaderboard route. API Gateway validates it once. The Leaderboard GraphQL handler validates the bearer token again against Cognito signing keys and consumes a DynamoDB token-bucket unit. Time-based views query leaderboard indexes; all-time views start from aggregates and resolve best game records. The service deduplicates users, sorts scores with completion time as a tiebreaker, assigns ranks, and returns the current user's row when present.

Evidence: `apps/web/src/api/leaderboard.ts` (`getLeaderboard`), `infrastructure/lib/stacks/api-stack.ts` (leaderboard route and authorizer), `services/leaderboard/src/index.ts` (`handleHttpGraphQLRequest`), `services/leaderboard/src/handlers/graphql.handler.ts` (`handleQuery`, `getLeaderboardResolver`), `services/leaderboard/src/utils/auth.util.ts` (`authenticateRequest`, `validateToken`), `services/leaderboard/src/utils/ratelimit.util.ts` (`enforceRateLimit`), and `services/leaderboard/src/services/leaderboard.service.ts` (`getLeaderboard`).

## Paid-game access decision

```mermaid
sequenceDiagram
  actor Player
  participant Web as Hub or game setup
  participant Game as Game Service
  participant Subs as Subscriptions table
  participant Limits as Daily rate limits table
  participant Themes as Themes table

  Player->>Web: Select a game marked as paid
  Web->>Game: Request canStartGame
  Game->>Subs: Read current tier
  Subs-->>Game: Free or paid tier
  Game-->>Web: Tier with placeholder allowance

  alt Frontend recognizes paid game and Free tier
    Web-->>Player: Redirect to subscription page
  else Frontend allows start attempt
    Web->>Game: Submit startGame
    Game->>Subs: Read current tier again
    alt Backend paid list contains game and tier is Free
      Game-->>Web: Paid subscription error
      Web-->>Player: Show or redirect from error path
    else Tier permits the game
      Game->>Limits: Enforce daily allowance
      Game->>Themes: Validate published theme
      Game-->>Web: Started session
    end
  end
```
**Text alternative:** The browser may perform an early tier-based redirect, but its paid-game registry is separate from the backend registry. Every real start reads the tier again. The Game Service rejects a Free user when the requested uppercase theme ID is in its paid list, then applies the daily limit and published-theme checks. This backend start operation is the authoritative gate.

Evidence: `apps/web/src/components/hub/GameTile.tsx` (`PREMIUM_GAMES`), `apps/web/src/pages/hub/GameHubPage.tsx` (`handleGameClick`), `apps/web/src/pages/mini-golf/MiniGolfSetupPage.tsx` (`checkAccess`), and `services/game/src/services/game.service.ts` (`startGame`, `PAID_GAMES`). The current frontend and backend lists disagree for several existing games.

## Subscription checkout and activation

```mermaid
sequenceDiagram
  actor Player
  participant Web as Subscription page
  participant Game as Game Service
  participant Stripe as Stripe
  participant Subs as Subscriptions table
  participant Limits as Daily rate limits table

  Player->>Web: Select paid tier
  Web->>Game: Create checkout session
  Game->>Game: Validate tier and choose server price
  Game->>Stripe: Create subscription checkout
  Stripe-->>Game: Hosted checkout URL
  Game-->>Web: Checkout URL
  Web->>Stripe: Open hosted checkout
  Player->>Stripe: Complete payment

  opt Stripe webhook route is externally configured
    Stripe->>Game: Send signed subscription event
    Game->>Stripe: Verify webhook signature
    Game->>Subs: Upsert active subscription
    Game->>Limits: Synchronize tier
  end

  Stripe-->>Web: Redirect to success page with session ID
  Web->>Game: Verify checkout session
  Game->>Stripe: Retrieve checkout session
  Stripe-->>Game: Paid session and metadata
  Game->>Subs: Upsert active subscription
  Game-->>Web: Verification result
  Web-->>Player: Show active subscription message
```
**Text alternative:** The subscription page asks the Game Service for a Stripe Checkout URL. The service validates the requested tier and uses its server-side price mapping. After payment, a configured webhook can verify the signature, update the subscription, and synchronize the rate-limit tier. Independently, the browser success page calls `verifyCheckoutSession`, which retrieves the session and updates the subscription record. The next authoritative game start reads that subscription.

Evidence: `apps/web/src/pages/subscription/RateLimitPage.tsx` (`handleSubscribe`), `apps/web/src/pages/subscription/SubscriptionSuccessPage.tsx` (`SubscriptionSuccessPage`), `services/game/src/handlers/game.handler.ts` (`createCheckoutSession`, `verifyCheckoutSession`), and `services/game/src/services/stripe.service.ts` (`createCheckoutSession`, `handleWebhook`, `handleCheckoutCompleted`). The Game Lambda contains a `/webhook` branch, but `infrastructure/lib/stacks/api-stack.ts` does not define that route.

## Review submission and aggregation

```mermaid
sequenceDiagram
  actor Player
  participant Modal as Score breakdown modal
  participant Game as Game Service
  participant Reviews as Reviews table
  participant Hub as Game hub

  Player->>Modal: Choose one to five stars
  Modal->>Game: Submit game type and rating
  Game->>Game: Validate integer rating range
  Game->>Reviews: Upsert user and game review
  Reviews-->>Game: Write completes
  Game-->>Modal: Success

  Hub->>Game: Request review statistics
  loop Each allowlisted game type
    Game->>Reviews: Query game type index
    Reviews-->>Game: Ratings for game type
  end
  Game->>Game: Calculate per game and overall averages
  Game-->>Hub: Review statistics
```
**Text alternative:** After a scored completion, the shared modal can submit a rating with a game type. The backend validates one through five and overwrites the user's prior review for that game type. The hub later requests aggregate statistics; the backend queries reviews only for game types in its fixed allowlist and calculates per-game and overall averages. A stored review for an unlisted new type does not enter those aggregates.

Evidence: `apps/web/src/components/game/ScoreBreakdownModal.tsx` (`ScoreBreakdownModal`), `apps/web/src/api/game.ts` (`submitGameReview`, `getReviewStats`), and `services/game/src/services/review.service.ts` (`submitReview`, `getReviewStats`).

## Email preferences and engagement messages

```mermaid
sequenceDiagram
  actor Player
  participant Profile as Profile page
  participant Game as Game Service
  participant Prefs as Email preferences table
  participant Daily as Daily digest Lambda
  participant Activation as Activation email Lambda
  participant Cognito as Amazon Cognito
  participant Sessions as Games table
  participant LeaderData as Leaderboard data
  participant Resend as Resend API

  Player->>Profile: Toggle daily digest
  Profile->>Game: Set email preferences
  Game->>Prefs: Put preference record
  Prefs-->>Game: Write completes
  Game-->>Profile: Updated preference

  Daily->>Prefs: Scan opted in users
  Daily->>LeaderData: Scan recent entries and aggregates
  Daily->>Resend: Send personalized daily digests

  Activation->>Cognito: List users
  Activation->>Sessions: Check whether each user has a game
  Activation->>Prefs: Check activation opt out
  Activation->>Resend: Send first play prompts to eligible users

  Player->>Game: Open activation unsubscribe link
  Game->>Prefs: Store activation opt out
  Game-->>Player: Return confirmation page
```
**Text alternative:** Players manage daily-digest consent on the Profile page, and the Game Service stores the choice. The daily function scans opted-in users plus recent leaderboard and aggregate data, then sends personalized messages with Resend. The activation function lists Cognito users, selects verified users with no game records, checks opt-out data, and sends first-play prompts. Its unsubscribe link invokes a Game handler that records activation opt-out state and returns HTML.

Evidence: `apps/web/src/pages/profile/ProfilePage.tsx` (`toggleDigest`), `services/game/src/services/email-prefs.service.ts` (`EmailPrefsService`), `services/game/src/daily-email.ts` (`handler`), `services/game/src/activation-email.ts` (`handler`, `isUserEligible`), and `services/game/src/index.ts` (`handleUnsubscribe`). The daily, activation, and unsubscribe deployment or route wiring is not fully represented in the current CDK application.

## Production backend deployment pipeline

```mermaid
flowchart LR
  Developer["Developer prepares backend change"] --> Review["Reviewed Git change"]
  Review --> Main["Push or merge to main"]
  Main --> Filter["GitHub Actions backend path filter"]
  Filter --> GameJob["Build Shared and Game package"]
  Filter --> LeaderJob["Bundle Leaderboard entry point"]
  Filter --> EmailJob["Install and package email sender"]
  GameJob --> GameLambda["Game Service production Lambda"]
  LeaderJob --> LeaderLambda["Leaderboard production Lambda"]
  EmailJob --> EmailLambda["Email Sender production Lambda"]

  DataChange["Theme or catalog data change"] -.-> Gap["No current GitHub Actions deployment job"]
  FrontendChange["Frontend change"] -.-> Vercel["Separate Vercel project deployment"]
```
**Text alternative:** A reviewed backend change reaches `main` and triggers the GitHub Actions workflow when Game, Leaderboard, Email Sender, or Shared paths match. The workflow builds or bundles all three Lambda packages and publishes each production function. The workflow has no job for theme/catalog data, infrastructure, ancillary email Lambdas, Auth, or the frontend. Frontend release is a separate Vercel process.

For Circuit Builder, backend commits and deployments are required to follow this GitHub Actions path. Direct local production AWS deployment is not part of the authorized feature workflow. Evidence: `.github/workflows/deploy-lambdas.yml` (`on.push`, `deploy-game-lambda`, `deploy-leaderboard-lambda`, `deploy-email-sender`), `apps/web/vercel.json`, and `.kiro/steering/deployment.md`. The current workflow deploys without running tests, lint, type-check, an account assertion, or a smoke test.
