# Deployment Architecture - Game Service

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Web Browser  │  │ Web Browser  │  │ Web Browser  │                  │
│  │  (Desktop)   │  │   (Tablet)   │  │   (Mobile)   │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                  │                  │                          │
│         └──────────────────┴──────────────────┘                          │
│                            │                                             │
│                     HTTPS (TLS 1.2+)                                     │
└────────────────────────────┼────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY LAYER                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              AWS API Gateway (HTTP API)                           │  │
│  │  • Custom Domain: api.memorygame.com/game                         │  │
│  │  • JWT Authorization (AWS Cognito)                                │  │
│  │  • Throttling: 200 req/s, 500 burst                               │  │
│  │  • CORS: Enabled                                                  │  │
│  │  • Route: POST /graphql → Game Lambda                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         COMPUTE LAYER                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   AWS Lambda Function                             │  │
│  │  • Runtime: Node.js 20.x                                          │  │
│  │  • Memory: 512 MB                                                 │  │
│  │  • Timeout: 30 seconds                                            │  │
│  │  • Concurrency: 100 reserved, 10 provisioned (prod)               │  │
│  │  • Handler: GraphQL resolver                                      │  │
│  │                                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │  Application Code                                            │ │  │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │  │
│  │  │  │   Handlers   │→ │   Services   │→ │ Repositories │      │ │  │
│  │  │  │  (GraphQL)   │  │  (Business)  │  │  (Data)      │      │ │  │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘      │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└──────────┬──────────────────────┬──────────────────────┬────────────────┘
           │                      │                      │
           ▼                      ▼                      ▼
┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│   STORAGE LAYER      │ │  MESSAGING LAYER │ │   MONITORING LAYER       │
│                      │ │                  │ │                          │
│ ┌──────────────────┐ │ │ ┌──────────────┐ │ │ ┌──────────────────────┐ │
│ │ DynamoDB Tables  │ │ │ │ EventBridge  │ │ │ │  CloudWatch Logs     │ │
│ │                  │ │ │ │  Event Bus   │ │ │ │  • JSON logs         │ │
│ │ • Games          │ │ │ │              │ │ │ │  • 90-day retention  │ │
│ │ • RateLimits     │ │ │ │ Event:       │ │ │ └──────────────────────┘ │
│ │ • Achievements   │ │ │ │ GameCompleted│ │ │                          │
│ │                  │ │ │ │      │       │ │ │ ┌──────────────────────┐ │
│ │ Read-Only:       │ │ │ │      ▼       │ │ │ │ CloudWatch Metrics   │ │
│ │ • Themes         │ │ │ │ Leaderboard  │ │ │ │  • GamesStarted      │ │
│ │ • Subscriptions  │ │ │ │   Service    │ │ │ │  • GamesCompleted    │ │
│ └──────────────────┘ │ │ └──────────────┘ │ │ │  • GameScore         │ │
│                      │ │                  │ │ │  • RateLimitExceeded │ │
│ On-Demand Billing    │ │ Async Delivery   │ │ └──────────────────────┘ │
│ Multi-AZ             │ │ Built-in Retry   │ │                          │
│ Point-in-Time Backup │ │                  │ │ ┌──────────────────────┐ │
└──────────────────────┘ └──────────────────┘ │ │  CloudWatch Alarms   │ │
                                              │ │  • Error Rate        │ │
                                              │ │  • High Latency      │ │
                                              │ │  • Throttling        │ │
                                              │ └──────────────────────┘ │
                                              │                          │
                                              │ ┌──────────────────────┐ │
                                              │ │      X-Ray Tracing   │ │
                                              │ │  • 10% sampling      │ │
                                              │ │  • Performance trace │ │
                                              │ └──────────────────────┘ │
                                              └──────────────────────────┘
```

---

## Request Flow

### 1. Start Game Flow

```
User → API Gateway → Lambda → [Rate Limit Check] → DynamoDB (RateLimits)
                                      │
                                      ▼
                              [Theme Validation] → DynamoDB (Themes) [cached]
                                      │
                                      ▼
                              [Subscription Check] → DynamoDB (Subscriptions)
                                      │
                                      ▼
                              [Create Game] → DynamoDB (Games)
                                      │
                                      ▼
                              [Update Rate Limit] → DynamoDB (RateLimits)
                                      │
                                      ▼
                              [Publish Metrics] → CloudWatch
                                      │
                                      ▼
                              Response → User
```

**Latency Target**: < 300ms (p95)

**Operations**:
1. Rate limit check: 1 DynamoDB read
2. Theme validation: 1 DynamoDB read (cached)
3. Subscription check: 1 DynamoDB read
4. Create game: 1 DynamoDB write
5. Update rate limit: 1 DynamoDB write
6. Publish metrics: 1 CloudWatch API call (async)

**Total DynamoDB Operations**: 3 reads + 2 writes

---

### 2. Complete Game Flow

```
User → API Gateway → Lambda → [Get Game] → DynamoDB (Games)
                                      │
                                      ▼
                              [Validate Ownership]
                                      │
                                      ▼
                              [Calculate Score]
                                      │
                                      ▼
                              [Update Game] → DynamoDB (Games)
                                      │
                                      ▼
                              [Track Achievements] → DynamoDB (Achievements)
                                      │
                                      ▼
                              [Publish Event] → EventBridge (GameCompleted)
                                      │
                                      ▼
                              [Publish Metrics] → CloudWatch
                                      │
                                      ▼
                              Response → User
```

**Latency Target**: < 200ms (p95)

**Operations**:
1. Get game: 1 DynamoDB read
2. Update game: 1 DynamoDB write
3. Track achievements: 1 DynamoDB query + N writes (N = unlocked achievements)
4. Publish event: 1 EventBridge API call (async)
5. Publish metrics: 1 CloudWatch API call (async)

**Total DynamoDB Operations**: 2 reads + 1-5 writes

---

### 3. Get Game History Flow

```
User → API Gateway → Lambda → [Check Subscription] → DynamoDB (Subscriptions)
                                      │
                                      ▼
                              [Query Games] → DynamoDB (Games.UserIdIndex)
                                      │
                                      ▼
                              [Paginate Results]
                                      │
                                      ▼
                              Response → User
```

**Latency Target**: < 500ms (p95)

**Operations**:
1. Check subscription: 1 DynamoDB read
2. Query games: 1 DynamoDB query (up to 100 items)

**Total DynamoDB Operations**: 1 read + 1 query

---

### 4. Get User Statistics Flow

```
User → API Gateway → Lambda → [Check Cache] → In-Memory Cache
                                      │
                                      ▼ (cache miss)
                              [Query Games] → DynamoDB (Games.UserIdIndex)
                                      │
                                      ▼
                              [Calculate Stats]
                                      │
                                      ▼
                              [Cache Result] → In-Memory Cache (5 min TTL)
                                      │
                                      ▼
                              Response → User
```

**Latency Target**: < 500ms (p95) uncached, < 50ms cached

**Operations** (cache miss):
1. Query games: 1 DynamoDB query (all user games)
2. Calculate statistics: In-memory aggregation

**Total DynamoDB Operations**: 1 query

---

## Data Flow

### Write Operations

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WRITE PATH                                   │
│                                                                      │
│  Lambda Function                                                     │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ DynamoDB Tables (Primary Data Store)                        │   │
│  │                                                              │   │
│  │  Games Table                                                 │   │
│  │  • PK: id                                                    │   │
│  │  • GSI: userId + completedAt (for history queries)          │   │
│  │  • GSI: status + startedAt (for cleanup)                    │   │
│  │  • TTL: expiresAt (abandoned games)                          │   │
│  │                                                              │   │
│  │  RateLimits Table                                            │   │
│  │  • PK: userId                                                │   │
│  │  • TTL: expiresAt (cleanup after 48 hours)                  │   │
│  │                                                              │   │
│  │  Achievements Table                                          │   │
│  │  • PK: userId, SK: type                                     │   │
│  │  • No TTL (permanent records)                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ DynamoDB Streams (Change Data Capture)                      │   │
│  │  • Disabled (not needed for current use cases)              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Read Operations

```
┌─────────────────────────────────────────────────────────────────────┐
│                         READ PATH                                    │
│                                                                      │
│  Lambda Function                                                     │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ In-Memory Cache (Lambda Container)                          │   │
│  │  • Themes: 5-minute TTL                                      │   │
│  │  • User Statistics: 5-minute TTL                             │   │
│  │  • Singleton instances (persist across invocations)          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │ (cache miss)                                                 │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ DynamoDB Tables                                              │   │
│  │                                                              │   │
│  │  Games Table                                                 │   │
│  │  • GetItem: By game ID                                       │   │
│  │  • Query: By userId (game history)                           │   │
│  │  • Query: By status (cleanup jobs)                           │   │
│  │                                                              │   │
│  │  RateLimits Table                                            │   │
│  │  • GetItem: By userId                                        │   │
│  │                                                              │   │
│  │  Achievements Table                                          │   │
│  │  • Query: By userId (all achievements)                       │   │
│  │                                                              │   │
│  │  Themes Table (Read-Only, owned by CMS Service)             │   │
│  │  • GetItem: By themeId (cached)                              │   │
│  │                                                              │   │
│  │  Subscriptions Table (Read-Only, owned by Payment Service)  │   │
│  │  • GetItem: By userId (no cache - real-time)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Event Flow

### Asynchronous Event Publishing

```
┌─────────────────────────────────────────────────────────────────────┐
│                      EVENT PUBLISHING                                │
│                                                                      │
│  Lambda Function (completeGame)                                      │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ EventBridge Event Bus                                        │   │
│  │  • Event: GameCompleted                                      │   │
│  │  • Source: game-service                                      │   │
│  │  • Async: Fire-and-forget (doesn't block response)           │   │
│  │  • Retry: Automatic with exponential backoff                 │   │
│  │  • DLQ: Dead-letter queue for failed events                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Event Rules (Pattern Matching)                               │   │
│  │  • Rule: GameCompleted → Leaderboard Service                 │   │
│  │  • Filter: Only completed games with valid scores            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Target Services                                              │   │
│  │  • Leaderboard Service Lambda                                │   │
│  │  • Invoked asynchronously                                    │   │
│  │  • Independent failure handling                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

**Rationale**:
- Game completion doesn't wait for leaderboard update
- Leaderboard Service can be down without affecting Game Service
- Events are retried automatically on failure
- Failed events go to DLQ for investigation

---

## Deployment Topology

### Multi-Environment Deployment

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AWS ACCOUNT                                     │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Development Environment (us-east-1)                           │ │
│  │  • Lambda: 256 MB, no provisioned concurrency                 │ │
│  │  • DynamoDB: On-Demand                                        │ │
│  │  • Logs: 30-day retention                                     │ │
│  │  • X-Ray: 100% sampling                                       │ │
│  │  • Alarms: Disabled                                           │ │
│  │  • Domain: api-dev.memorygame.com/game                        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Staging Environment (us-east-1)                               │ │
│  │  • Lambda: 512 MB, no provisioned concurrency                 │ │
│  │  • DynamoDB: On-Demand                                        │ │
│  │  • Logs: 60-day retention                                     │ │
│  │  • X-Ray: 50% sampling                                        │ │
│  │  • Alarms: Enabled (non-critical)                             │ │
│  │  • Domain: api-staging.memorygame.com/game                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Production Environment (us-east-1)                            │ │
│  │  • Lambda: 512 MB, 10 provisioned concurrency                 │ │
│  │  • DynamoDB: On-Demand with auto-scaling                      │ │
│  │  • Logs: 90-day retention                                     │ │
│  │  • X-Ray: 10% sampling                                        │ │
│  │  • Alarms: Enabled (all critical)                             │ │
│  │  • Domain: api.memorygame.com/game                            │ │
│  └───────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CI/CD PIPELINE                                  │
│                                                                      │
│  Developer                                                           │
│       │                                                              │
│       ▼                                                              │
│  Git Push (main branch)                                              │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ GitHub Actions / AWS CodePipeline                           │   │
│  │                                                              │   │
│  │  1. Checkout code                                            │   │
│  │  2. Install dependencies (npm ci)                            │   │
│  │  3. Run linter (npm run lint)                                │   │
│  │  4. Run unit tests (npm run test:unit)                       │   │
│  │  5. Build Lambda code (npm run build)                        │   │
│  │  6. Run integration tests (npm run test:integration)         │   │
│  │  7. Synthesize CDK (cdk synth)                               │   │
│  │  8. Deploy to Dev (cdk deploy GameServiceStack-dev)          │   │
│  │  9. Run E2E tests against Dev                                │   │
│  │ 10. Deploy to Staging (cdk deploy GameServiceStack-staging)  │   │
│  │ 11. Run smoke tests against Staging                          │   │
│  │ 12. Manual approval gate                                     │   │
│  │ 13. Deploy to Production (cdk deploy GameServiceStack-prod)  │   │
│  │ 14. Run smoke tests against Production                       │   │
│  │ 15. Monitor for errors (5-minute window)                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

**Rollback Strategy**:
- CloudFormation automatic rollback on deployment failure
- Manual rollback: `cdk deploy --rollback` to previous version
- Lambda versioning: Keep last 3 versions for instant rollback

---

## High Availability

### Multi-AZ Deployment
- **Lambda**: Automatically deployed across multiple AZs
- **DynamoDB**: Multi-AZ replication built-in
- **API Gateway**: Multi-AZ by default

### Failure Scenarios

#### Lambda Failure
- **Detection**: CloudWatch alarm on error rate
- **Recovery**: Lambda auto-retries failed invocations
- **Fallback**: API Gateway returns 5xx error to client

#### DynamoDB Failure
- **Detection**: CloudWatch alarm on throttling
- **Recovery**: On-Demand auto-scales capacity
- **Fallback**: Lambda retries with exponential backoff

#### API Gateway Failure
- **Detection**: CloudWatch alarm on 5xx errors
- **Recovery**: AWS manages API Gateway availability
- **Fallback**: Client retries with exponential backoff

---

## Security Architecture

### Network Security
- **API Gateway**: Public endpoint with JWT authorization
- **Lambda**: Runs in AWS-managed VPC (no custom VPC needed)
- **DynamoDB**: VPC endpoints (private connectivity)

### Authentication Flow
```
User → API Gateway → [JWT Validation] → AWS Cognito
                            │
                            ▼ (valid token)
                     Lambda Execution
                            │
                            ▼
                     Extract userId from JWT claims
                            │
                            ▼
                     Use userId for authorization
```

### Authorization Checks
1. **Resource Ownership**: User can only access their own games
2. **Subscription Tier**: Validate tier for rate limits and features
3. **Rate Limiting**: Enforce tier-based game limits

---

## Summary

Game Service deployment architecture provides:
- **Serverless**: Auto-scaling Lambda + DynamoDB
- **High Availability**: Multi-AZ deployment
- **Low Latency**: < 300ms for game operations
- **Cost Efficient**: Pay-per-use pricing
- **Observable**: CloudWatch logs, metrics, alarms, X-Ray
- **Secure**: JWT auth, encryption, least privilege IAM
- **Resilient**: Automatic retries, error handling, DLQ

All infrastructure is defined as code using AWS CDK for repeatable, version-controlled deployments.
