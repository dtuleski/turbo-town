# Environment Architecture: Dev vs Production

## Current State Analysis

### ✅ What You Have

**Infrastructure is ALREADY configured for multi-environment deployment!**

Your CDK infrastructure supports three environments:
- `dev` (currently deployed)
- `staging` (configured but not deployed)
- `prod` (configured but not deployed)

### 🔴 Current Reality: Everything is in DEV

**Backend (AWS)**:
- Lambda Functions: `MemoryGame-GameService-dev`, `MemoryGame-AuthService-dev`
- DynamoDB Tables: All have `-dev` suffix
- Cognito User Pool: `MemoryGame-UserPool-dev`
- API Gateway: Single endpoint for dev environment

**Frontend**:
- Domain: `turbo-town.com` (pointing to dev backend)
- Environment: Using dev Cognito and dev API endpoints

**Stripe**:
- Using TEST mode keys (`pk_test_...`, `sk_test_...`)
- Sandbox environment (that's why you see "sandbox" in the UI)

---

## 🎯 Recommended Architecture

### Environment Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT (DEV)                        │
├─────────────────────────────────────────────────────────────┤
│ Purpose: Active development, testing new features           │
│ Domain:  dev.turbo-town.com (or localhost:5173)            │
│ Backend: MemoryGame-*-dev resources                        │
│ Stripe:  TEST mode (sandbox)                               │
│ Data:    Test data, can be wiped                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION (PROD)                        │
├─────────────────────────────────────────────────────────────┤
│ Purpose: Live users, real payments                          │
│ Domain:  turbo-town.com                                     │
│ Backend: MemoryGame-*-prod resources                       │
│ Stripe:  LIVE mode (real payments)                         │
│ Data:    Real user data, protected                         │
└─────────────────────────────────────────────────────────────┘
```

**Skip Staging**: For a small project, dev + prod is sufficient. Staging adds complexity without much benefit.

---

## 🏗️ AWS Architecture Diagrams

### Complete System Architecture (Current DEV Environment)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET / USERS                                │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌───────────────────┐     ┌──────────────────┐
        │   turbo-town.com  │     │  Stripe Checkout │
        │   (Frontend SPA)  │     │   (Test Mode)    │
        │                   │     └──────────────────┘
        │  - React + Vite   │              │
        │  - Hosted on S3   │              │ Webhooks
        │  - CloudFront CDN │              │
        └─────────┬─────────┘              │
                  │                        │
                  │ GraphQL                │
                  │ Queries                │
                  ▼                        ▼
    ┌─────────────────────────────────────────────────────┐
    │         AWS API Gateway (HTTP API)                  │
    │   https://ooihrv63q8.execute-api.us-east-1...      │
    │                                                     │
    │   Routes:                                           │
    │   • /auth/graphql  → Auth Lambda                   │
    │   • /game/graphql  → Game Lambda                   │
    │   • /webhooks/stripe → Game Lambda                 │
    └──────────────┬──────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
┌──────────────────┐  ┌──────────────────┐
│  Auth Lambda     │  │  Game Lambda     │
│  (Node.js 20)    │  │  (Node.js 20)    │
│                  │  │                  │
│  • Register      │  │  • Start Game    │
│  • Login         │  │  • Complete Game │
│  • Forgot Pass   │  │  • Leaderboard   │
│  • Reset Pass    │  │  • Achievements  │
│  • Refresh Token │  │  • Subscriptions │
│                  │  │  • Admin APIs    │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         │                     │
         ▼                     ▼
┌──────────────────────────────────────────────────────┐
│              AWS Cognito User Pool                   │
│          (MemoryGame-UserPool-dev)                   │
│                                                      │
│  • User authentication & authorization               │
│  • JWT token generation                             │
│  • Password policies                                │
│  • Email verification                               │
│  • User pool: us-east-1_jPkMWmBup                  │
└──────────────────────────────────────────────────────┘
         │
         │
         ▼
┌──────────────────────────────────────────────────────┐
│              Amazon DynamoDB Tables                  │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  memory-game-users-dev                     │    │
│  │  • userId (PK)                             │    │
│  │  • email, username, createdAt              │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  memory-game-games-dev                     │    │
│  │  • gameId (PK)                             │    │
│  │  • userId, themeId, difficulty, score      │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  memory-game-catalog-dev                   │    │
│  │  • gameType (PK)                           │    │
│  │  • name, description, status               │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  memory-game-themes-dev                    │    │
│  │  • themeId (PK)                            │    │
│  │  • name, emoji, items                      │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  memory-game-leaderboards-dev              │    │
│  │  • leaderboardId (PK)                      │    │
│  │  • gameType, period, rankings              │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  memory-game-subscriptions-dev             │    │
│  │  • userId (PK)                             │    │
│  │  • tier, status, stripeCustomerId          │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  memory-game-achievements-dev              │    │
│  │  • userId (PK), achievementId (SK)         │    │
│  │  • unlockedAt, progress                    │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  memory-game-rate-limits-dev               │    │
│  │  • userId (PK)                             │    │
│  │  • gamesPlayed, resetAt                    │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  memory-game-user-settings-dev             │    │
│  │  • userId (PK)                             │    │
│  │  • preferences, notifications              │    │
│  └────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
         │
         │
         ▼
┌──────────────────────────────────────────────────────┐
│           Amazon EventBridge Event Bus               │
│         (MemoryGame-EventBus-dev)                    │
│                                                      │
│  • Game completed events                            │
│  • Achievement unlocked events                      │
│  • Subscription changed events                      │
└──────────────────────────────────────────────────────┘
         │
         │
         ▼
┌──────────────────────────────────────────────────────┐
│            Amazon CloudWatch                         │
│                                                      │
│  • Lambda logs (7 day retention)                    │
│  • API Gateway metrics                              │
│  • DynamoDB metrics                                 │
│  • Custom application metrics                       │
│  • Alarms for errors and throttling                │
└──────────────────────────────────────────────────────┘
```

### Request Flow: User Plays a Game

```
┌──────────┐
│  User    │
│ Browser  │
└────┬─────┘
     │
     │ 1. Login
     ▼
┌─────────────────┐
│  turbo-town.com │
│   (Frontend)    │
└────┬────────────┘
     │
     │ 2. POST /auth/graphql
     │    mutation { login }
     ▼
┌──────────────────────────┐
│   API Gateway            │
│   /auth/graphql          │
└────┬─────────────────────┘
     │
     │ 3. Invoke
     ▼
┌──────────────────────────┐
│   Auth Lambda            │
│   • Validate credentials │
└────┬─────────────────────┘
     │
     │ 4. Authenticate
     ▼
┌──────────────────────────┐
│   Cognito User Pool      │
│   • Generate JWT tokens  │
└────┬─────────────────────┘
     │
     │ 5. Query user data
     ▼
┌──────────────────────────┐
│   DynamoDB               │
│   memory-game-users-dev  │
└────┬─────────────────────┘
     │
     │ 6. Return tokens
     ▼
┌──────────────────────────┐
│   Frontend               │
│   • Store tokens         │
│   • Navigate to hub      │
└────┬─────────────────────┘
     │
     │ 7. POST /game/graphql
     │    mutation { startGame }
     │    Authorization: Bearer <token>
     ▼
┌──────────────────────────┐
│   API Gateway            │
│   /game/graphql          │
│   • Verify JWT           │
└────┬─────────────────────┘
     │
     │ 8. Invoke
     ▼
┌──────────────────────────┐
│   Game Lambda            │
│   • Check rate limit     │
│   • Create game record   │
└────┬─────────────────────┘
     │
     │ 9. Check rate limit
     ▼
┌──────────────────────────┐
│   DynamoDB               │
│   rate-limits-dev        │
└────┬─────────────────────┘
     │
     │ 10. Create game
     ▼
┌──────────────────────────┐
│   DynamoDB               │
│   memory-game-games-dev  │
└────┬─────────────────────┘
     │
     │ 11. Return game data
     ▼
┌──────────────────────────┐
│   Frontend               │
│   • Start game timer     │
│   • Display cards        │
└────┬─────────────────────┘
     │
     │ 12. User completes game
     │
     │ 13. POST /game/graphql
     │     mutation { completeGame }
     ▼
┌──────────────────────────┐
│   Game Lambda            │
│   • Update game record   │
│   • Check achievements   │
│   • Update leaderboard   │
└────┬─────────────────────┘
     │
     │ 14. Publish event
     ▼
┌──────────────────────────┐
│   EventBridge            │
│   GameCompleted event    │
└──────────────────────────┘
```

### Stripe Payment Flow

```
┌──────────┐
│  User    │
│ Browser  │
└────┬─────┘
     │
     │ 1. Click "Subscribe"
     ▼
┌─────────────────┐
│  Frontend       │
│  Rate Limit Page│
└────┬────────────┘
     │
     │ 2. POST /game/graphql
     │    mutation { createCheckoutSession }
     ▼
┌──────────────────────────┐
│   API Gateway            │
└────┬─────────────────────┘
     │
     │ 3. Invoke
     ▼
┌──────────────────────────┐
│   Game Lambda            │
│   • Call Stripe API      │
└────┬─────────────────────┘
     │
     │ 4. Create checkout session
     ▼
┌──────────────────────────┐
│   Stripe API             │
│   (Test Mode)            │
│   • Generate session URL │
└────┬─────────────────────┘
     │
     │ 5. Return checkout URL
     ▼
┌──────────────────────────┐
│   Frontend               │
│   • Redirect to Stripe   │
└────┬─────────────────────┘
     │
     │ 6. User enters payment
     ▼
┌──────────────────────────┐
│   Stripe Checkout        │
│   • Process payment      │
└────┬─────────────────────┘
     │
     │ 7. Webhook: checkout.session.completed
     ▼
┌──────────────────────────┐
│   API Gateway            │
│   /webhooks/stripe       │
└────┬─────────────────────┘
     │
     │ 8. Invoke
     ▼
┌──────────────────────────┐
│   Game Lambda            │
│   • Verify signature     │
│   • Update subscription  │
└────┬─────────────────────┘
     │
     │ 9. Update subscription
     ▼
┌──────────────────────────┐
│   DynamoDB               │
│   subscriptions-dev      │
│   • tier: PREMIUM        │
│   • status: ACTIVE       │
└────┬─────────────────────┘
     │
     │ 10. Redirect to success page
     ▼
┌──────────────────────────┐
│   Frontend               │
│   • Show success message │
│   • User can play games  │
└──────────────────────────┘
```

### Dev vs Prod: Side-by-Side Comparison

```
┌─────────────────────────────────────┬─────────────────────────────────────┐
│         DEV ENVIRONMENT             │        PROD ENVIRONMENT             │
│         (Currently Active)          │        (Not Yet Deployed)           │
├─────────────────────────────────────┼─────────────────────────────────────┤
│                                     │                                     │
│  Frontend:                          │  Frontend:                          │
│  ┌───────────────────────────────┐ │  ┌───────────────────────────────┐ │
│  │ turbo-town.com                │ │  │ turbo-town.com                │ │
│  │ (or dev.turbo-town.com)       │ │  │                               │ │
│  │ .env.local                    │ │  │ .env.production               │ │
│  └───────────────────────────────┘ │  └───────────────────────────────┘ │
│           │                         │           │                         │
│           ▼                         │           ▼                         │
│  ┌───────────────────────────────┐ │  ┌───────────────────────────────┐ │
│  │ API Gateway                   │ │  │ API Gateway                   │ │
│  │ ooihrv63q8.execute-api...     │ │  │ <new-prod-id>.execute-api...  │ │
│  └───────────────────────────────┘ │  └───────────────────────────────┘ │
│           │                         │           │                         │
│           ▼                         │           ▼                         │
│  ┌───────────────────────────────┐ │  ┌───────────────────────────────┐ │
│  │ Lambda Functions              │ │  │ Lambda Functions              │ │
│  │ • MemoryGame-AuthService-dev  │ │  │ • MemoryGame-AuthService-prod │ │
│  │ • MemoryGame-GameService-dev  │ │  │ • MemoryGame-GameService-prod │ │
│  └───────────────────────────────┘ │  └───────────────────────────────┘ │
│           │                         │           │                         │
│           ▼                         │           ▼                         │
│  ┌───────────────────────────────┐ │  ┌───────────────────────────────┐ │
│  │ Cognito User Pool             │ │  │ Cognito User Pool             │ │
│  │ MemoryGame-UserPool-dev       │ │  │ MemoryGame-UserPool-prod      │ │
│  │ us-east-1_jPkMWmBup           │ │  │ us-east-1_<new-id>            │ │
│  └───────────────────────────────┘ │  └───────────────────────────────┘ │
│           │                         │           │                         │
│           ▼                         │           ▼                         │
│  ┌───────────────────────────────┐ │  ┌───────────────────────────────┐ │
│  │ DynamoDB Tables               │ │  │ DynamoDB Tables               │ │
│  │ • memory-game-users-dev       │ │  │ • memory-game-users-prod      │ │
│  │ • memory-game-games-dev       │ │  │ • memory-game-games-prod      │ │
│  │ • memory-game-catalog-dev     │ │  │ • memory-game-catalog-prod    │ │
│  │ • memory-game-themes-dev      │ │  │ • memory-game-themes-prod     │ │
│  │ • memory-game-leaderboards-dev│ │  │ • memory-game-leaderboards-prd│ │
│  │ • memory-game-subscriptions-dv│ │  │ • memory-game-subscriptions-pd│ │
│  │ • memory-game-achievements-dev│ │  │ • memory-game-achievements-prd│ │
│  │ • memory-game-rate-limits-dev │ │  │ • memory-game-rate-limits-prod│ │
│  │ • memory-game-user-settings-dv│ │  │ • memory-game-user-settings-pd│ │
│  └───────────────────────────────┘ │  └───────────────────────────────┘ │
│           │                         │           │                         │
│           ▼                         │           ▼                         │
│  ┌───────────────────────────────┐ │  ┌───────────────────────────────┐ │
│  │ Stripe Integration            │ │  │ Stripe Integration            │ │
│  │ TEST MODE (Sandbox)           │ │  │ LIVE MODE (Real Payments)     │ │
│  │ pk_test_...                   │ │  │ pk_live_...                   │ │
│  │ sk_test_...                   │ │  │ sk_live_...                   │ │
│  │ Test cards: 4242 4242...      │ │  │ Real credit cards only        │ │
│  └───────────────────────────────┘ │  └───────────────────────────────┘ │
│                                     │                                     │
│  Data: Test users, can be wiped    │  Data: Real users, protected       │
│  Cost: ~$15/month                  │  Cost: ~$30-110/month              │
│  Monitoring: Basic (7 day logs)    │  Monitoring: Full (30 day logs)    │
│  Throttling: 500 req/s             │  Throttling: 5000 req/s            │
│                                     │                                     │
└─────────────────────────────────────┴─────────────────────────────────────┘

KEY POINT: These are COMPLETELY SEPARATE environments
• Different databases (no shared data)
• Different user pools (users must register in each)
• Different API endpoints
• Different Stripe accounts (test vs live)
```

### AWS Service Breakdown

```
┌──────────────────────────────────────────────────────────────────┐
│                    YOUR AWS SERVICES                             │
│                    Account: 848403890404                         │
│                    Region: us-east-1                             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  1. AWS Lambda (Serverless Compute)                              │
├──────────────────────────────────────────────────────────────────┤
│  What: Runs your backend code without managing servers          │
│  Cost: Pay per request + execution time                         │
│                                                                  │
│  Your Functions:                                                 │
│  • MemoryGame-AuthService-dev (512 MB)                          │
│    - Handles login, register, password reset                    │
│    - Runtime: Node.js 20                                        │
│                                                                  │
│  • MemoryGame-GameService-dev (512 MB)                          │
│    - Handles game logic, leaderboards, subscriptions            │
│    - Runtime: Node.js 20                                        │
│                                                                  │
│  Pricing: $0.20 per 1M requests + $0.0000166667 per GB-second  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  2. Amazon API Gateway (HTTP API)                                │
├──────────────────────────────────────────────────────────────────┤
│  What: Entry point for all API requests                         │
│  Cost: Pay per request                                          │
│                                                                  │
│  Your API:                                                       │
│  • Endpoint: https://ooihrv63q8.execute-api.us-east-1...       │
│  • Routes:                                                       │
│    - POST /auth/graphql → Auth Lambda                          │
│    - POST /game/graphql → Game Lambda                          │
│    - POST /webhooks/stripe → Game Lambda                       │
│  • Features:                                                     │
│    - JWT authorization (Cognito)                                │
│    - CORS enabled                                               │
│    - Throttling: 500 req/s (dev), 5000 req/s (prod)           │
│                                                                  │
│  Pricing: $1.00 per million requests                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  3. Amazon Cognito (User Authentication)                         │
├──────────────────────────────────────────────────────────────────┤
│  What: Manages user accounts, login, JWT tokens                 │
│  Cost: Free for first 50,000 monthly active users               │
│                                                                  │
│  Your User Pool:                                                 │
│  • Name: MemoryGame-UserPool-dev                                │
│  • ID: us-east-1_jPkMWmBup                                      │
│  • Client ID: XXXXXXXXXXXXXXXXXXXXXXX                       │
│  • Features:                                                     │
│    - Email/password authentication                              │
│    - Email verification                                         │
│    - Password reset                                             │
│    - JWT token generation                                       │
│    - Custom attributes (username, etc.)                         │
│                                                                  │
│  Pricing: Free (under 50k MAU)                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  4. Amazon DynamoDB (NoSQL Database)                             │
├──────────────────────────────────────────────────────────────────┤
│  What: Fast, scalable database for all your data                │
│  Cost: Pay per read/write + storage                             │
│                                                                  │
│  Your Tables (9 total):                                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ memory-game-users-dev                                      │ │
│  │ Stores: User profiles, preferences                         │ │
│  │ Key: userId (PK)                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ memory-game-games-dev                                      │ │
│  │ Stores: Game sessions, scores, completion times            │ │
│  │ Key: gameId (PK)                                           │ │
│  │ GSI: userId-index (query games by user)                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ memory-game-catalog-dev                                    │ │
│  │ Stores: Available games (Memory, Math, Word Puzzle)        │ │
│  │ Key: gameType (PK)                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ memory-game-themes-dev                                     │ │
│  │ Stores: Game themes (Animals, Fruits, F1, etc.)            │ │
│  │ Key: themeId (PK)                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ memory-game-leaderboards-dev                               │ │
│  │ Stores: Top scores by game type and time period            │ │
│  │ Key: leaderboardId (PK)                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ memory-game-subscriptions-dev                              │ │
│  │ Stores: User subscription tiers, Stripe customer IDs       │ │
│  │ Key: userId (PK)                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ memory-game-achievements-dev                               │ │
│  │ Stores: User achievements, unlock dates                    │ │
│  │ Key: userId (PK), achievementId (SK)                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ memory-game-rate-limits-dev                                │ │
│  │ Stores: Daily game counts for rate limiting                │ │
│  │ Key: userId (PK)                                           │ │
│  │ TTL: Auto-deletes after 24 hours                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ memory-game-user-settings-dev                              │ │
│  │ Stores: User preferences, notification settings            │ │
│  │ Key: userId (PK)                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Pricing: ~$5-50/month depending on usage                       │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  5. Amazon EventBridge (Event Bus)                               │
├──────────────────────────────────────────────────────────────────┤
│  What: Pub/sub event system for decoupled services              │
│  Cost: Pay per event                                            │
│                                                                  │
│  Your Event Bus:                                                 │
│  • Name: MemoryGame-EventBus-dev                                │
│  • Events:                                                       │
│    - GameCompleted                                              │
│    - AchievementUnlocked                                        │
│    - SubscriptionChanged                                        │
│                                                                  │
│  Use Case: Trigger actions when events happen                   │
│  Example: When game completes → check achievements              │
│                                                                  │
│  Pricing: $1.00 per million events                              │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  6. Amazon CloudWatch (Monitoring & Logs)                        │
├──────────────────────────────────────────────────────────────────┤
│  What: Logs, metrics, alarms for monitoring                     │
│  Cost: Pay per GB ingested + storage                            │
│                                                                  │
│  Your Monitoring:                                                │
│  • Lambda Logs:                                                  │
│    - /aws/lambda/MemoryGame-AuthService-dev                     │
│    - /aws/lambda/MemoryGame-GameService-dev                     │
│    - Retention: 7 days (dev), 30 days (prod)                   │
│                                                                  │
│  • Metrics:                                                      │
│    - Lambda invocations, errors, duration                       │
│    - API Gateway requests, latency, errors                      │
│    - DynamoDB read/write capacity, throttles                    │
│                                                                  │
│  • Alarms:                                                       │
│    - Lambda errors > threshold                                  │
│    - API Gateway 5xx errors                                     │
│    - DynamoDB throttling                                        │
│                                                                  │
│  Pricing: ~$2-10/month                                          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  7. External: Stripe (Payment Processing)                        │
├──────────────────────────────────────────────────────────────────┤
│  What: Handles subscriptions and payments                       │
│  Cost: 2.9% + $0.30 per transaction                            │
│                                                                  │
│  Your Setup:                                                     │
│  • Mode: TEST (sandbox) - no real money                         │
│  • Products:                                                     │
│    - DashDen Basic: $1.99/month                                │
│    - DashDen Premium: $4.99/month                              │
│  • Test Cards: 4242 4242 4242 4242                             │
│                                                                  │
│  Integration:                                                    │
│  • Checkout: Hosted by Stripe                                   │
│  • Webhooks: Sent to your API Gateway                          │
│  • Customer Portal: Managed by Stripe                           │
│                                                                  │
│  Pricing: No monthly fee, just transaction fees                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📋 Step-by-Step: Create Production Environment

### Phase 1: Deploy Production Backend (30 minutes)

#### 1.1 Set Environment Variables

Create `infrastructure/.env.prod`:
```bash
# AWS Configuration
CDK_DEFAULT_ACCOUNT=848403890404
CDK_DEFAULT_REGION=us-east-1

# Stripe LIVE Keys (get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASIC_PRICE_ID=price_...  # Create in Stripe Dashboard
STRIPE_PREMIUM_PRICE_ID=price_... # Create in Stripe Dashboard

# Frontend URL
FRONTEND_URL=https://turbo-town.com

# Monitoring
ALERT_EMAIL=your-email@example.com
```

#### 1.2 Deploy Production Stack

```bash
cd infrastructure

# Deploy all production stacks
npm run deploy:prod

# Or deploy individually
cdk deploy MemoryGame-Database-prod --context environment=prod
cdk deploy MemoryGame-Cognito-prod --context environment=prod
cdk deploy MemoryGame-EventBridge-prod --context environment=prod
cdk deploy MemoryGame-Lambda-prod --context environment=prod
cdk deploy MemoryGame-API-prod --context environment=prod
cdk deploy MemoryGame-Monitoring-prod --context environment=prod
```

#### 1.3 Seed Production Data

```bash
# Update seed scripts to use prod tables
./seed-game-catalog.sh prod
./seed-themes.sh prod
```

### Phase 2: Configure Production Frontend (15 minutes)

#### 2.1 Create Production Environment File

Create `apps/web/.env.production`:
```bash
# AWS Cognito Configuration (from prod deployment output)
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=<prod-user-pool-id>
VITE_COGNITO_CLIENT_ID=<prod-client-id>
VITE_COGNITO_DOMAIN=memory-game-prod

# API Configuration (from prod deployment output)
VITE_AUTH_ENDPOINT=<prod-api-gateway-url>/auth/graphql
VITE_GAME_ENDPOINT=<prod-api-gateway-url>/game/graphql

# Environment
VITE_ENV=production
```

#### 2.2 Update Build Configuration

The frontend build automatically uses `.env.production` when building for production.

### Phase 3: Setup Stripe Production (20 minutes)

#### 3.1 Activate Stripe Live Mode

1. Go to Stripe Dashboard: https://dashboard.stripe.com
2. Toggle from "Test mode" to "Live mode" (top right)
3. Complete business verification if required

#### 3.2 Create Live Products

```bash
# Create products in LIVE mode
stripe products create --name="DashDen Basic" --description="Up to 10 games per day"
stripe prices create --product=<product-id> --unit-amount=199 --currency=usd --recurring[interval]=month

stripe products create --name="DashDen Premium" --description="Unlimited games"
stripe prices create --product=<product-id> --unit-amount=499 --currency=usd --recurring[interval]=month
```

#### 3.3 Get Live API Keys

1. Dashboard → Developers → API keys
2. Copy "Publishable key" (starts with `pk_live_`)
3. Copy "Secret key" (starts with `sk_live_`)
4. Update `infrastructure/.env.prod`

#### 3.4 Setup Webhook for Production

```bash
# Create webhook endpoint
stripe listen --forward-to <prod-api-gateway-url>/webhooks/stripe --live

# Or configure in Dashboard:
# Dashboard → Developers → Webhooks → Add endpoint
# URL: <prod-api-gateway-url>/webhooks/stripe
# Events: checkout.session.completed, customer.subscription.*
```

### Phase 4: Deploy Production Frontend (10 minutes)

#### 4.1 Build Production Bundle

```bash
cd apps/web
npm run build  # Uses .env.production automatically
```

#### 4.2 Deploy to Production

**Option A: Manual Deploy** (if using S3/CloudFront directly)
```bash
aws s3 sync dist/ s3://turbo-town-prod --delete
aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/*"
```

**Option B: Git-based Deploy** (if using hosting service)
```bash
# Create production branch
git checkout -b production
git push origin production

# Configure hosting service to deploy 'production' branch to turbo-town.com
# Configure hosting service to deploy 'main' branch to dev.turbo-town.com
```

---

## 🔧 Development Workflow

### Daily Development

```bash
# Work on dev environment
cd apps/web
npm run dev  # Uses .env.local (dev backend)

# Make changes, test locally
# Push to GitHub main branch → auto-deploys to dev.turbo-town.com
```

### Deploying to Production

```bash
# 1. Test thoroughly in dev
# 2. Merge to production branch
git checkout production
git merge main
git push origin production

# 3. Frontend auto-deploys to turbo-town.com
# 4. Backend changes require manual deployment:
cd infrastructure
npm run deploy:prod
```

---

## 📊 Environment Comparison

| Aspect | DEV | PROD |
|--------|-----|------|
| **Domain** | dev.turbo-town.com | turbo-town.com |
| **Backend** | MemoryGame-*-dev | MemoryGame-*-prod |
| **Database** | memory-game-*-dev | memory-game-*-prod |
| **Cognito** | MemoryGame-UserPool-dev | MemoryGame-UserPool-prod |
| **Stripe** | Test mode (sandbox) | Live mode (real $) |
| **Users** | Test accounts | Real users |
| **Data** | Can be wiped | Protected |
| **Monitoring** | Basic | Full (X-Ray, detailed metrics) |
| **Logs** | 7 days retention | 30 days retention |
| **Throttling** | 500 req/s | 5000 req/s |

---

## 🚨 Important Considerations

### Data Isolation

- **Dev and Prod are COMPLETELY SEPARATE**
- Different databases, different user pools
- Test users in dev won't exist in prod
- No data sharing between environments

### Stripe Considerations

- **Test mode**: Fake credit cards, no real charges
- **Live mode**: Real credit cards, real money
- Test cards: `4242 4242 4242 4242` (works in test mode only)
- Webhook endpoints must be different for dev/prod

### Cost Implications

Running both environments doubles your AWS costs:
- 2x Lambda functions
- 2x DynamoDB tables
- 2x API Gateway
- 2x CloudWatch logs

**Estimated monthly cost**:
- Dev: $10-20/month (low traffic)
- Prod: $20-100/month (depends on users)

### Security

**Production-only requirements**:
- Enable AWS WAF for API Gateway
- Enable CloudWatch detailed monitoring
- Set up CloudWatch alarms for errors
- Enable X-Ray tracing
- Implement backup strategy for DynamoDB
- Use AWS Secrets Manager for sensitive keys

---

## 🎬 Quick Start: Deploy Production NOW

If you want to deploy production right now:

```bash
# 1. Create production environment file
cat > infrastructure/.env.prod << EOF
CDK_DEFAULT_ACCOUNT=848403890404
CDK_DEFAULT_REGION=us-east-1
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXX
FRONTEND_URL=https://turbo-town.com
ALERT_EMAIL=diego.tuleski@example.com
EOF

# 2. Deploy production backend
cd infrastructure
cdk deploy --all --context environment=prod

# 3. Get outputs and update frontend
# (CDK will output Cognito IDs and API URLs)

# 4. Build and deploy frontend
cd ../apps/web
npm run build
# Deploy dist/ to production hosting
```

---

## 📝 Next Steps

1. **Immediate**: Keep using dev environment for development
2. **Before launch**: Deploy production environment
3. **At launch**: Point turbo-town.com to production
4. **After launch**: Use dev.turbo-town.com for testing new features

---

## ❓ Questions to Answer

Before deploying production:

1. **Domain Strategy**: 
   - Keep turbo-town.com for prod?
   - Use dev.turbo-town.com for dev?
   - Or use localhost for dev?

2. **Stripe Strategy**:
   - Deploy prod with test keys first?
   - Or activate live mode immediately?

3. **Deployment Strategy**:
   - Manual deployments to prod?
   - Or auto-deploy from production branch?

4. **User Migration**:
   - Any existing users to migrate?
   - Or start fresh in production?

Let me know your preferences and I'll help you set it up!
