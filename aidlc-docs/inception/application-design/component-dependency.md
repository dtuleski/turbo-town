# Component Dependencies and Architecture

## Overview
This document defines component dependencies, communication patterns, data flow, and system architecture for the memory game application.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────┐│
│  │   Main Web App (React)           │  │  Admin Dashboard (React)     ││
│  │                                  │  │                              ││
│  │  - Authentication Module         │  │  - Admin Auth Module         ││
│  │  - Game Module                   │  │  - User Management Module    ││
│  │  - Leaderboard Module            │  │  - Content Management Module ││
│  │  - Profile Module                │  │  - Analytics Module          ││
│  │  - Subscription Module           │  │                              ││
│  │  - Home/Dashboard Module         │  │                              ││
│  └──────────────────────────────────┘  └──────────────────────────────┘│
│           │                                        │                     │
│           │ HTTPS/GraphQL                          │ HTTPS/GraphQL      │
│           ▼                                        ▼                     │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           CDN LAYER                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    CloudFront CDN                                 │  │
│  │  - Static assets (JS, CSS, images)                               │  │
│  │  - Theme images from S3                                           │  │
│  │  - Cache invalidation support                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY LAYER                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    API Gateway                                    │  │
│  │  - Single GraphQL endpoint: /graphql                             │  │
│  │  - Request throttling (1000 req/sec)                             │  │
│  │  - CORS configuration                                             │  │
│  │  - Request/response logging                                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│           │                                                               │
│           │ Routes to Lambda services                                    │
│           ▼                                                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER (Lambda)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Auth       │  │    Game      │  │  Leaderboard │                  │
│  │   Service    │  │   Service    │  │   Service    │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│         │                 │                  │                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Payment    │  │    Admin     │  │     CMS      │                  │
│  │   Service    │  │   Service    │  │   Service    │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│         │                 │                  │                           │
│         │                 │                  │                           │
│         ▼                 ▼                  ▼                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    DynamoDB Tables                                │  │
│  │  - Users                                                          │  │
│  │  - Games                                                          │  │
│  │  - Leaderboards (with GSI for rankings)                          │  │
│  │  - Subscriptions                                                  │  │
│  │  - Themes                                                         │  │
│  │  - Achievements                                                   │  │
│  │  - RateLimits                                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    S3 Buckets                                     │  │
│  │  - Theme images (hierarchical structure)                         │  │
│  │  - User profile pictures                                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   AWS        │  │    Stripe    │  │  CloudWatch  │                  │
│  │   Cognito    │  │    API       │  │   Logs       │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Dependency Matrix

### Frontend Dependencies

| Component | Depends On | Communication |
|-----------|-----------|---------------|
| AuthContainer | GraphQL API (Auth Service) | GraphQL mutations/queries |
| AuthContainer | AWS Cognito | OAuth flows |
| GameContainer | GraphQL API (Game Service) | GraphQL mutations/queries |
| GameContainer | Local Storage | Game preferences |
| LeaderboardContainer | GraphQL API (Leaderboard Service) | GraphQL queries |
| ProfileContainer | GraphQL API (Auth Service, Game Service) | GraphQL queries/mutations |
| SubscriptionContainer | GraphQL API (Payment Service) | GraphQL mutations/queries |
| SubscriptionContainer | Stripe Checkout | Redirect to Stripe |
| DashboardContainer | GraphQL API (Multiple Services) | GraphQL queries |
| All Containers | React Query | Server state management |
| All Containers | React Context | Local state management |

### Backend Service Dependencies

| Service | Depends On | Communication |
|---------|-----------|---------------|
| Auth Service | AWS Cognito | AWS SDK |
| Auth Service | DynamoDB (Users table) | AWS SDK |
| Game Service | DynamoDB (Games, RateLimits tables) | AWS SDK |
| Game Service | Leaderboard Service | Internal API call |
| Leaderboard Service | DynamoDB (Leaderboards table with GSI) | AWS SDK |
| Payment Service | Stripe API | Stripe SDK |
| Payment Service | DynamoDB (Subscriptions table) | AWS SDK |
| Payment Service | Game Service | Internal API call (rate limit updates) |
| Admin Service | DynamoDB (All tables) | AWS SDK |
| Admin Service | Stripe API | Stripe SDK |
| Admin Service | CloudWatch | AWS SDK |
| CMS Service | S3 | AWS SDK |
| CMS Service | CloudFront | AWS SDK |
| CMS Service | DynamoDB (Themes table) | AWS SDK |
| All Services | CloudWatch Logs | AWS SDK |
| All Services | Auth Middleware | Internal |

---

## Data Flow Diagrams

### User Registration Flow

```
User → Web App → API Gateway → Auth Service → AWS Cognito
                                     ↓
                                DynamoDB (Users)
                                     ↓
                            Email Verification
                                     ↓
                            User ← Tokens
```

### Game Completion Flow

```
User → Web App → API Gateway → Game Service
                                     ↓
                            Validate Game Data
                                     ↓
                            Check Rate Limits (DynamoDB)
                                     ↓
                            Calculate Score
                                     ↓
                            Save Game (DynamoDB)
                                     ↓
                            Update Leaderboard Service
                                     ↓
                            Check Achievements
                                     ↓
                            User ← Game Result
```

### Subscription Purchase Flow

```
User → Web App → API Gateway → Payment Service
                                     ↓
                            Create Stripe Checkout Session
                                     ↓
                            User → Stripe Checkout
                                     ↓
                            Payment Complete
                                     ↓
                            Stripe → Webhook → Payment Service
                                                     ↓
                                            Update Subscription (DynamoDB)
                                                     ↓
                                            Update User Tier
                                                     ↓
                                            Update Rate Limits
                                                     ↓
                                            User ← Confirmation
```

### Theme Publishing Flow

```
Admin → Admin App → API Gateway → CMS Service
                                        ↓
                                Upload Images to S3
                                        ↓
                                Update Theme Metadata (DynamoDB)
                                        ↓
                                Invalidate CloudFront Cache
                                        ↓
                                Theme Available to Users
```

---

## Integration Points

### AWS Cognito Integration

**Purpose**: User authentication and management

**Integration Type**: AWS SDK

**Services Using**:
- Auth Service (primary)
- Admin Service (user management)

**Operations**:
- User registration
- User login
- Token generation and validation
- Password reset
- Social provider integration (Google, Apple, Facebook)
- User pool management

---

### Stripe Integration

**Purpose**: Payment processing and subscription management

**Integration Type**: Stripe SDK + Webhooks

**Services Using**:
- Payment Service (primary)
- Admin Service (refunds, subscription modifications)

**Operations**:
- Create Checkout Session
- Create/update/cancel subscriptions
- Process payments
- Handle webhooks (subscription events)
- Retrieve invoices
- Issue refunds

**Webhook Events**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

### DynamoDB Integration

**Purpose**: Primary data store

**Integration Type**: AWS SDK + DynamoDB Toolbox (ORM)

**Tables**:

1. **Users Table**
   - Primary Key: userId
   - Attributes: email, name, profilePicture, tier, createdAt, etc.
   - Used by: Auth Service, Admin Service

2. **Games Table**
   - Primary Key: gameId
   - GSI: userId-timestamp-index
   - Attributes: userId, themeId, difficulty, completionTime, attempts, score, etc.
   - Used by: Game Service, Admin Service

3. **Leaderboards Table**
   - Primary Key: leaderboardId (composite: theme-difficulty-period)
   - GSI: score-index (for rankings)
   - Attributes: userId, score, rank, timestamp, etc.
   - Used by: Leaderboard Service

4. **Subscriptions Table**
   - Primary Key: subscriptionId
   - GSI: userId-index
   - Attributes: userId, tierId, status, stripeSubscriptionId, etc.
   - Used by: Payment Service, Admin Service

5. **Themes Table**
   - Primary Key: themeId
   - Attributes: name, category, status, imageUrls, pairs, etc.
   - Used by: CMS Service, Game Service

6. **Achievements Table**
   - Primary Key: userId-achievementId
   - Attributes: userId, achievementId, progress, earnedAt, etc.
   - Used by: Game Service, Profile Service

7. **RateLimits Table**
   - Primary Key: userId
   - Attributes: userId, count, resetAt, tier, etc.
   - Used by: Game Service

---

### S3 Integration

**Purpose**: File storage for images

**Integration Type**: AWS SDK

**Buckets**:

1. **Theme Images Bucket**
   - Structure: `/themes/{theme-id}/cards/{card-id}.png`
   - Used by: CMS Service
   - CloudFront distribution enabled

2. **User Assets Bucket**
   - Structure: `/profiles/{user-id}/picture.png`
   - Used by: Profile Service
   - CloudFront distribution enabled

---

### CloudFront Integration

**Purpose**: CDN for static assets and images

**Integration Type**: AWS SDK

**Distributions**:
- Static assets (JS, CSS)
- Theme images from S3
- User profile pictures from S3

**Operations**:
- Cache invalidation after theme updates
- Signed URLs for private content (if needed)

---

### CloudWatch Integration

**Purpose**: Logging and monitoring

**Integration Type**: AWS SDK

**Services Using**: All services

**Operations**:
- Application logging
- Error logging
- Security event logging
- Metrics collection
- Alarms and notifications

---

## Communication Patterns

### Frontend to Backend

**Pattern**: GraphQL over HTTPS

**Authentication**: JWT tokens in Authorization header

**Request Flow**:
1. Client sends GraphQL query/mutation to `/graphql`
2. API Gateway receives request
3. API Gateway routes to appropriate Lambda service
4. Lambda validates token via Auth Middleware
5. Lambda executes business logic
6. Lambda returns GraphQL response
7. Client receives response

---

### Service to Service

**Pattern**: Direct function invocation (internal)

**Use Cases**:
- Game Service → Leaderboard Service (update rankings)
- Payment Service → Game Service (update rate limits)
- Admin Service → All Services (data aggregation)

**Implementation**: Lambda function invocation via AWS SDK

---

### External Service Integration

**Pattern**: REST API calls over HTTPS

**Services**:
- Stripe API (payment processing)
- AWS Cognito (authentication)

**Authentication**:
- Stripe: API keys
- Cognito: AWS credentials

---

## Security Patterns

### Authentication Flow

```
Client → API Gateway → Auth Middleware → Service
                            ↓
                    Validate JWT Token
                            ↓
                    Check User Permissions
                            ↓
                    Attach User Context
                            ↓
                    Continue to Service
```

### Authorization Checks

**Role-Based Access Control (RBAC)**:
- User role: Default, access to user features
- Admin role: Access to admin features
- Content Manager role: Access to CMS features

**Implementation**:
- Cognito groups for role management
- Auth Middleware checks user groups
- GraphQL resolvers enforce permissions

---

## Dependency Summary

**Frontend Dependencies**:
- React Query for server state
- React Context for local state
- GraphQL client (Apollo or similar)
- Stripe.js for payment forms

**Backend Dependencies**:
- AWS SDK for AWS services
- Stripe SDK for payment processing
- DynamoDB Toolbox for ORM
- GraphQL server (Apollo Server or similar)

**External Dependencies**:
- AWS Cognito for authentication
- Stripe for payment processing
- CloudWatch for logging and monitoring
- CloudFront for CDN

**Total Integration Points**: 7 major integrations (Cognito, Stripe, DynamoDB, S3, CloudFront, CloudWatch, API Gateway)
