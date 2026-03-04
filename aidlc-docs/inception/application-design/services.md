# Service Layer Design

## Overview
This document defines the service layer architecture, orchestration patterns, and service responsibilities for the memory game application.

---

## Architecture Pattern

**Service Organization**: Service-per-domain with shared utilities (Hybrid approach)

**API Pattern**: GraphQL API with single endpoint

**Authentication**: AWS Cognito for user management

**Data Access**: Repository pattern with ORM (DynamoDB Toolbox) for complex queries

**Rate Limiting**: Hybrid (API Gateway for basic throttling + application-level for tier-specific limits)

---

## GraphQL API Layer

### GraphQL Schema Organization

**Single Endpoint**: `/graphql`

**Schema Structure**:
```graphql
type Query {
  # Authentication
  getCurrentUser: User
  
  # Game
  getGame(id: ID!): Game
  getGameHistory(filters: HistoryFilters): [Game!]!
  getUserStatistics: UserStatistics
  canStartGame: RateLimitStatus!
  
  # Leaderboard
  getLeaderboard(filters: LeaderboardFilters, pagination: PaginationInput): LeaderboardPage!
  getUserRank(filters: LeaderboardFilters): Int
  
  # Subscription
  getSubscription: Subscription
  getSubscriptionTiers: [SubscriptionTier!]!
  getBillingHistory: [Invoice!]!
  
  # Profile
  getProfile: UserProfile!
  getAchievements: [Achievement!]!
  
  # Themes
  getThemes(filters: ThemeFilters): [Theme!]!
  getTheme(id: ID!): Theme
  
  # Admin (requires admin role)
  searchUsers(query: String!, filters: UserFilters): [User!]!
  getUserDetails(userId: ID!): UserDetails!
  getDashboardMetrics(dateRange: DateRange!): DashboardMetrics!
  getRevenueMetrics(dateRange: DateRange!): RevenueMetrics!
}

type Mutation {
  # Authentication
  register(input: RegisterInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  loginWithSocial(input: SocialLoginInput!): AuthPayload!
  logout: Boolean!
  requestPasswordReset(email: String!): Boolean!
  confirmPasswordReset(input: PasswordResetInput!): Boolean!
  
  # Game
  startGame(input: StartGameInput!): Game!
  completeGame(input: CompleteGameInput!): GameResult!
  
  # Profile
  updateProfile(input: ProfileUpdateInput!): UserProfile!
  updateSettings(input: SettingsInput!): UserSettings!
  uploadProfilePicture(file: Upload!): String!
  
  # Subscription
  createSubscription(input: CreateSubscriptionInput!): StripeCheckoutSession!
  upgradeSubscription(input: UpgradeInput!): Subscription!
  downgradeSubscription(input: DowngradeInput!): Subscription!
  cancelSubscription: Boolean!
  
  # Admin (requires admin role)
  suspendUser(userId: ID!, reason: String!): Boolean!
  modifyUserSubscription(input: ModifySubscriptionInput!): Subscription!
  createTheme(input: CreateThemeInput!): Theme!
  publishTheme(themeId: ID!): Theme!
  uploadThemeImage(themeId: ID!, file: Upload!): String!
}
```

---

## Service Definitions

### Authentication Service

**Responsibility**: User authentication, authorization, and session management

**Technology Stack**:
- AWS Cognito for user pools
- Lambda function for GraphQL resolvers
- DynamoDB for user metadata

**Key Operations**:
- User registration (email/password and social)
- User login and token generation
- Session management and token refresh
- Password reset flows
- Email verification

**Integration Points**:
- AWS Cognito User Pools
- Social providers (Google, Apple, Facebook)
- DynamoDB for user records

**Rate Limiting**: API Gateway throttling (100 requests/second)

---

### Game Service

**Responsibility**: Game logic, gameplay management, and rate limiting

**Technology Stack**:
- Lambda function for GraphQL resolvers
- DynamoDB for game records and rate limit counters
- Repository pattern with DynamoDB Toolbox

**Key Operations**:
- Game creation and initialization
- Game completion and validation
- Score calculation
- Rate limit enforcement (tier-based)
- Game history logging (paid users only)

**Business Rules** (high-level, details in Functional Design):
- Client-side gameplay, server validates completion
- Rate limits: Free (3/24h), Light (10/day), Standard (30/day), Premium (100/day)
- Score formula: (Difficulty Multiplier × 10000) / (Time × Attempt Penalty)
- Game state not persisted during play

**Integration Points**:
- DynamoDB for game records
- Leaderboard Service for score updates
- Achievement Service for progress tracking

**Rate Limiting**: Application-level with DynamoDB counters

---

### Leaderboard Service

**Responsibility**: Leaderboard management, rankings, and score aggregation

**Technology Stack**:
- Lambda function for GraphQL resolvers
- DynamoDB with GSI for efficient ranking queries
- Repository pattern for data access

**Key Operations**:
- Leaderboard queries with filters (theme, difficulty, time period)
- User rank calculation
- Score aggregation
- Pagination

**Data Model**:
- Separate leaderboards by theme AND difficulty
- Time periods: daily, weekly, monthly, all-time
- Top 100 players per leaderboard

**Integration Points**:
- DynamoDB with GSI for rankings
- Game Service for score updates

**Rate Limiting**: API Gateway throttling

---

### Payment Service

**Responsibility**: Subscription management and payment processing

**Technology Stack**:
- Lambda function for GraphQL resolvers
- Stripe API for payment processing
- DynamoDB for subscription records
- Lambda for webhook handling

**Key Operations**:
- Subscription creation (Stripe Checkout)
- Tier upgrades/downgrades
- Subscription cancellation
- Payment method updates
- Webhook processing (subscription events)

**Subscription Tiers**:
- Light: $1.99/month (or annual with discount)
- Standard: $5.99/month (or annual with discount)
- Premium: $9.99/month (or annual with discount)

**Integration Points**:
- Stripe API for payment processing
- Stripe webhooks for subscription events
- DynamoDB for subscription state
- Game Service for rate limit updates

**Rate Limiting**: API Gateway throttling

---

### Admin Service

**Responsibility**: Administrative operations, user management, and analytics

**Technology Stack**:
- Lambda function for GraphQL resolvers
- DynamoDB for user and system data
- CloudWatch for metrics aggregation

**Key Operations**:
- User search and management
- Subscription modifications
- Refund processing
- Analytics and reporting
- System monitoring

**Security**:
- Requires admin role (verified via Cognito groups)
- MFA required for admin accounts
- All actions audit logged

**Integration Points**:
- DynamoDB for user data
- Stripe for refunds and subscription modifications
- CloudWatch for metrics
- All other services for data aggregation

**Rate Limiting**: API Gateway throttling (stricter limits)

---

### CMS Service

**Responsibility**: Theme content management and publishing

**Technology Stack**:
- Lambda function for GraphQL resolvers
- S3 for image storage
- CloudFront for CDN
- DynamoDB for theme metadata

**Key Operations**:
- Theme CRUD operations
- Image upload and management
- Theme publishing workflow
- Content versioning

**File Storage Organization** (S3):
```
/themes/
  /{theme-id}/
    /cards/
      /card-1.png
      /card-2.png
      ...
    /preview/
      /thumbnail.png
    metadata.json
```

**Integration Points**:
- S3 for image storage
- CloudFront for CDN distribution
- DynamoDB for theme metadata
- Game Service for theme availability

**Rate Limiting**: API Gateway throttling

---

## Shared Services and Utilities

### Authentication Middleware

**Responsibility**: Token validation and authorization

**Operations**:
- JWT token validation
- Cognito token verification
- User permission checks
- Role-based access control

**Usage**: Applied to all GraphQL resolvers requiring authentication

---

### Error Handler

**Responsibility**: Centralized error handling and logging

**Operations**:
- Error catching and formatting
- Error logging to CloudWatch
- Security event logging
- User-friendly error messages

**Usage**: Applied globally to all Lambda functions

---

### Logger

**Responsibility**: Structured logging

**Operations**:
- Info, warn, error, debug logging
- CloudWatch integration
- Request ID correlation
- Security event logging

**Log Format**:
```json
{
  "timestamp": "ISO 8601",
  "level": "INFO|WARN|ERROR|DEBUG",
  "requestId": "correlation-id",
  "userId": "user-id",
  "message": "log message",
  "metadata": {}
}
```

---

### Validator

**Responsibility**: Input validation and sanitization

**Operations**:
- Schema validation
- Type checking
- Length/size validation
- Format validation (email, etc.)
- HTML/script sanitization

**Usage**: Applied to all GraphQL resolver inputs

---

### Repository Base Class

**Responsibility**: Common data access patterns

**Operations**:
- CRUD operations
- Query/scan utilities
- Transaction helpers
- Pagination support

**Technology**: DynamoDB Toolbox for ORM capabilities

---

## Service Orchestration Patterns

### Authentication Flow

1. User submits credentials to GraphQL API
2. Authentication Service validates with Cognito
3. Cognito returns tokens (access + refresh)
4. Authentication Service creates/updates user record in DynamoDB
5. Returns tokens to client
6. Client stores tokens and includes in subsequent requests
7. Authentication Middleware validates tokens on each request

### Game Completion Flow

1. Client submits game completion to GraphQL API
2. Authentication Middleware validates user token
3. Game Service validates game data (time, attempts, difficulty)
4. Game Service checks rate limits
5. Game Service calculates score
6. Game Service saves game record (paid users only)
7. Leaderboard Service updates rankings (paid users only)
8. Achievement Service checks for new achievements (paid users only)
9. Returns game result to client

### Subscription Purchase Flow

1. User selects tier and billing period
2. Client requests Stripe Checkout session from GraphQL API
3. Payment Service creates Stripe Checkout session
4. Client redirects to Stripe Checkout
5. User completes payment on Stripe
6. Stripe sends webhook to Payment Service
7. Payment Service validates webhook signature
8. Payment Service creates/updates subscription in DynamoDB
9. Payment Service updates user tier
10. Game Service updates rate limits for user

### Theme Publishing Flow (Admin)

1. Content manager uploads images via GraphQL API
2. CMS Service uploads to S3 (hierarchical structure)
3. CMS Service updates theme metadata in DynamoDB
4. Content manager previews theme
5. Content manager publishes theme
6. CMS Service marks theme as published
7. CMS Service invalidates CloudFront cache
8. Theme immediately available to users

---

## Data Access Patterns

### Repository Pattern with ORM

**Pattern**: Each service has dedicated repository classes for data access

**Benefits**:
- Abstraction of database operations
- Testability (mock repositories)
- Consistent data access patterns
- ORM for complex queries

**Example**:
```typescript
class GameRepository {
  private table: DynamoDBTable;
  
  async createGame(game: CreateGameInput): Promise<Game> {
    // DynamoDB Toolbox ORM operations
  }
  
  async getGamesByUser(userId: string, filters: HistoryFilters): Promise<Game[]> {
    // Complex query with ORM
  }
}
```

---

## Rate Limiting Strategy

### Two-Tier Approach

**Tier 1: API Gateway Throttling**
- Global rate limit: 1000 requests/second
- Per-user burst: 100 requests/second
- Protects against DDoS and abuse

**Tier 2: Application-Level Limits**
- Tier-specific game limits (3/24h, 10/day, 30/day, 100/day)
- DynamoDB counters for tracking
- Reset logic based on tier and time window

**Implementation**:
```typescript
class RateLimiter {
  async checkLimit(userId: string, tier: SubscriptionTier): Promise<RateLimitStatus> {
    const count = await this.getUsageCount(userId);
    const limit = this.getLimitForTier(tier);
    return {
      allowed: count < limit,
      remaining: Math.max(0, limit - count),
      resetAt: this.getResetTime(tier)
    };
  }
}
```

---

## Security Patterns

### Authentication & Authorization

**Authentication**: AWS Cognito tokens (JWT)
**Authorization**: Role-based access control (RBAC)

**Roles**:
- User (default)
- Admin (requires Cognito group membership)
- Content Manager (requires Cognito group membership)

**Token Validation**:
- Every GraphQL request validates token
- Token expiration checked
- User permissions verified for protected operations

### Input Validation

**All inputs validated**:
- Type checking
- Length/size limits
- Format validation
- Sanitization (HTML/script removal)

**Validation applied at**:
- GraphQL schema level (type system)
- Resolver level (business rules)
- Repository level (data integrity)

### Secure Communication

**All communications encrypted**:
- TLS 1.2+ for all API calls
- HTTPS only (no HTTP)
- Secure cookie attributes (HttpOnly, Secure, SameSite)

---

## Service Summary

**Total Services**: 6 domain services + shared utilities

**Service Organization**: Service-per-domain with shared utilities

**API Pattern**: GraphQL with single endpoint

**Authentication**: AWS Cognito

**Data Access**: Repository pattern with DynamoDB Toolbox ORM

**Rate Limiting**: Hybrid (API Gateway + application-level)

**Security**: Token-based auth, RBAC, input validation, TLS encryption
