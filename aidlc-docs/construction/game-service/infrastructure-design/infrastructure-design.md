# Infrastructure Design - Game Service

## Overview
Game Service follows serverless microservice architecture using AWS managed services for auto-scaling, high availability, and minimal operational overhead.

---

## Compute Infrastructure

### AWS Lambda Function
**Service**: AWS Lambda
**Runtime**: Node.js 20.x
**Configuration**:
- Memory: 512 MB (optimized for performance/cost)
- Timeout: 30 seconds
- Reserved Concurrent Executions: 100
- Provisioned Concurrency: 10 (production only)
- Environment Variables:
  - `GAMES_TABLE_NAME`
  - `RATE_LIMITS_TABLE_NAME`
  - `ACHIEVEMENTS_TABLE_NAME`
  - `THEMES_TABLE_NAME`
  - `SUBSCRIPTIONS_TABLE_NAME`
  - `EVENT_BUS_NAME`
  - `LOG_LEVEL`
  - `ENVIRONMENT`

**Rationale**: 
- Serverless auto-scaling handles variable load
- Pay-per-use cost model
- Provisioned concurrency eliminates cold starts for active users
- 512 MB provides good balance of performance and cost

---

## API Gateway

### HTTP API (GraphQL)
**Service**: AWS API Gateway HTTP API
**Configuration**:
- Protocol: HTTP/2
- Authorization: JWT (AWS Cognito)
- CORS: Enabled for web frontend domain
- Throttling: 
  - Burst: 500 requests
  - Rate: 200 requests/second
- Custom Domain: `api.memorygame.com/game`
- Stage: `dev`, `staging`, `production`

**Routes**:
- `POST /graphql` → Game Lambda Function

**Rationale**:
- HTTP API is 70% cheaper than REST API
- Native JWT authorization with Cognito
- Built-in throttling protects backend
- Custom domain provides clean API URLs

---

## Storage Infrastructure

### DynamoDB Tables

#### Games Table
**Service**: AWS DynamoDB
**Configuration**:
- Table Name: `Games-{env}`
- Partition Key: `id` (String) - Game ID
- Sort Key: None
- Billing Mode: On-Demand (auto-scaling)
- Point-in-Time Recovery: Enabled
- Encryption: AWS managed keys (SSE)
- TTL: Enabled on `expiresAt` field (abandoned games after 7 days)

**Global Secondary Indexes**:
1. **UserIdIndex**
   - Partition Key: `userId` (String)
   - Sort Key: `completedAt` (String) - ISO timestamp
   - Projection: ALL
   - Purpose: Query user's game history

2. **StatusIndex**
   - Partition Key: `status` (String)
   - Sort Key: `startedAt` (String)
   - Projection: KEYS_ONLY
   - Purpose: Query abandoned games for cleanup

**Attributes**:
```typescript
{
  id: string;              // PK
  userId: string;          // GSI1-PK
  themeId: string;
  difficulty: number;
  status: string;          // GSI2-PK: IN_PROGRESS | COMPLETED | ABANDONED
  startedAt: string;       // GSI2-SK: ISO timestamp
  completedAt?: string;    // GSI1-SK: ISO timestamp
  completionTime?: number; // seconds
  attempts?: number;
  score?: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: number;      // TTL: Unix timestamp
}
```

**Capacity Planning**:
- Expected: 10K games/day = ~7 writes/second
- Peak: 100K games/day = ~70 writes/second
- On-Demand handles bursts automatically

---

#### RateLimits Table
**Service**: AWS DynamoDB
**Configuration**:
- Table Name: `RateLimits-{env}`
- Partition Key: `userId` (String)
- Sort Key: None
- Billing Mode: On-Demand
- Point-in-Time Recovery: Enabled
- Encryption: AWS managed keys
- TTL: Enabled on `expiresAt` field (cleanup after 48 hours)

**Attributes**:
```typescript
{
  userId: string;     // PK
  tier: string;       // FREE | LIGHT | STANDARD | PREMIUM
  count: number;      // games played today
  resetAt: string;    // ISO timestamp (midnight UTC)
  expiresAt: number;  // TTL: Unix timestamp
  updatedAt: string;
}
```

**Access Pattern**: Single-item read/write per game start

---

#### Achievements Table
**Service**: AWS DynamoDB
**Configuration**:
- Table Name: `Achievements-{env}`
- Partition Key: `userId` (String)
- Sort Key: `type` (String) - Achievement type
- Billing Mode: On-Demand
- Point-in-Time Recovery: Enabled
- Encryption: AWS managed keys

**Attributes**:
```typescript
{
  userId: string;        // PK
  type: string;          // SK: FIRST_WIN | GAMES_10 | SPEED_DEMON | etc.
  unlocked: boolean;
  progress: number;      // e.g., 5/10 games
  completedAt?: string;  // ISO timestamp
  createdAt: string;
  updatedAt: string;
}
```

**Access Pattern**: Query all achievements for user (1 query per game completion)

---

#### Shared Tables (Read-Only)
Game Service reads from these tables owned by other services:

1. **Themes Table** (owned by CMS Service)
   - Access: Read-only via IAM role
   - Caching: 5-minute in-memory cache
   - Purpose: Validate theme exists and get theme details

2. **Subscriptions Table** (owned by Payment Service)
   - Access: Read-only via IAM role
   - Caching: No cache (real-time tier validation)
   - Purpose: Get user's subscription tier for rate limiting

---

## Messaging Infrastructure

### EventBridge Event Bus
**Service**: AWS EventBridge
**Configuration**:
- Event Bus Name: `MemoryGame-{env}`
- Event Pattern: `game-service.*`

**Events Published**:
1. **GameCompleted**
   - Source: `game-service`
   - DetailType: `GameCompleted`
   - Payload:
     ```json
     {
       "gameId": "uuid",
       "userId": "uuid",
       "userName": "string",
       "themeId": "uuid",
       "difficulty": 1-5,
       "score": 1000,
       "completionTime": 45,
       "attempts": 12,
       "completedAt": "2026-03-03T12:00:00Z"
     }
     ```
   - Consumers: Leaderboard Service

**Rationale**:
- Decouples Game Service from Leaderboard Service
- Asynchronous processing doesn't block game completion
- Built-in retry and dead-letter queue

---

## Monitoring Infrastructure

### CloudWatch Logs
**Service**: AWS CloudWatch Logs
**Configuration**:
- Log Group: `/aws/lambda/game-service-{env}`
- Retention: 30 days (dev), 90 days (production)
- Format: JSON structured logs
- Log Level: INFO (production), DEBUG (dev)

**Log Streams**:
- Lambda execution logs
- Application logs (business events)
- Error logs (exceptions, failures)

---

### CloudWatch Metrics
**Service**: AWS CloudWatch Metrics
**Namespace**: `MemoryGame/GameService`

**Custom Metrics**:
1. **GamesStarted** (Count)
   - Dimensions: Difficulty, Tier
   - Purpose: Track game creation rate

2. **GamesCompleted** (Count)
   - Dimensions: Difficulty, Tier
   - Purpose: Track completion rate

3. **GameScore** (None)
   - Dimensions: Difficulty
   - Purpose: Track score distribution

4. **RateLimitExceeded** (Count)
   - Dimensions: Tier
   - Purpose: Monitor rate limit hits

5. **AchievementUnlocked** (Count)
   - Dimensions: Type
   - Purpose: Track achievement unlocks

**Lambda Metrics** (automatic):
- Invocations
- Duration (p50, p95, p99)
- Errors
- Throttles
- ConcurrentExecutions

---

### CloudWatch Alarms
**Service**: AWS CloudWatch Alarms

**Critical Alarms**:
1. **High Error Rate**
   - Metric: Lambda Errors
   - Threshold: > 5% of invocations
   - Period: 5 minutes
   - Action: SNS notification to on-call

2. **High Latency**
   - Metric: Lambda Duration (p95)
   - Threshold: > 500ms
   - Period: 5 minutes
   - Action: SNS notification to team

3. **DynamoDB Throttling**
   - Metric: UserErrors (ProvisionedThroughputExceededException)
   - Threshold: > 10 in 5 minutes
   - Action: SNS notification + auto-scale investigation

4. **Lambda Throttling**
   - Metric: Throttles
   - Threshold: > 0
   - Period: 1 minute
   - Action: SNS notification (indicates capacity issue)

---

### X-Ray Tracing
**Service**: AWS X-Ray
**Configuration**:
- Tracing Mode: Active
- Sampling Rate: 10% (production), 100% (dev)
- Segments:
  - Lambda execution
  - DynamoDB operations
  - EventBridge publish
  - External HTTP calls

**Rationale**:
- Identifies performance bottlenecks
- Traces requests across services
- 10% sampling balances cost and visibility

---

## Security Infrastructure

### IAM Roles

#### Lambda Execution Role
**Service**: AWS IAM Role
**Permissions**:
- **DynamoDB**:
  - `dynamodb:GetItem` on Games, RateLimits, Achievements, Themes, Subscriptions
  - `dynamodb:PutItem` on Games, RateLimits, Achievements
  - `dynamodb:UpdateItem` on Games, RateLimits, Achievements
  - `dynamodb:Query` on Games (UserIdIndex), Achievements
  - `dynamodb:DeleteItem` on Games (admin operations)
- **EventBridge**:
  - `events:PutEvents` on MemoryGame event bus
- **CloudWatch**:
  - `logs:CreateLogGroup`
  - `logs:CreateLogStream`
  - `logs:PutLogEvents`
  - `cloudwatch:PutMetricData`
- **X-Ray**:
  - `xray:PutTraceSegments`
  - `xray:PutTelemetryRecords`

**Principle**: Least privilege - only permissions needed for service operations

---

### Encryption

#### Data at Rest
- **DynamoDB**: AWS managed keys (SSE)
- **CloudWatch Logs**: AWS managed keys

#### Data in Transit
- **API Gateway**: TLS 1.2+
- **Lambda ↔ DynamoDB**: TLS 1.2+ (AWS SDK)
- **Lambda ↔ EventBridge**: TLS 1.2+ (AWS SDK)

---

## Deployment Infrastructure

### AWS CDK Stack
**Service**: AWS CDK (TypeScript)
**Stack Name**: `GameServiceStack-{env}`

**Resources Defined**:
1. Lambda Function
2. API Gateway HTTP API
3. DynamoDB Tables (Games, RateLimits, Achievements)
4. IAM Roles and Policies
5. CloudWatch Log Groups
6. CloudWatch Alarms
7. EventBridge Rules (if needed)

**Deployment**:
```bash
# Build Lambda code
npm run build

# Synthesize CloudFormation
cdk synth

# Deploy to environment
cdk deploy GameServiceStack-dev
cdk deploy GameServiceStack-production
```

---

## Environment Configuration

### Development
- Lambda: 256 MB, no provisioned concurrency
- DynamoDB: On-Demand
- Logs: 30-day retention
- X-Ray: 100% sampling
- Alarms: Disabled

### Staging
- Lambda: 512 MB, no provisioned concurrency
- DynamoDB: On-Demand
- Logs: 60-day retention
- X-Ray: 50% sampling
- Alarms: Enabled (non-critical)

### Production
- Lambda: 512 MB, 10 provisioned concurrency
- DynamoDB: On-Demand with auto-scaling
- Logs: 90-day retention
- X-Ray: 10% sampling
- Alarms: Enabled (all critical)

---

## Cost Estimation

### Monthly Cost (Production - 10K games/day)

**Lambda**:
- Requests: 300K/month (10K games × 30 days)
- Duration: 300ms average × 300K = 90K GB-seconds
- Cost: ~$2/month

**API Gateway**:
- Requests: 300K/month
- Cost: ~$0.30/month

**DynamoDB**:
- Writes: 300K/month (games) + 300K (rate limits) = 600K
- Reads: 600K/month (themes, subscriptions, queries)
- Storage: 1 GB
- Cost: ~$5/month

**EventBridge**:
- Events: 300K/month
- Cost: ~$0.30/month

**CloudWatch**:
- Logs: 10 GB/month
- Metrics: 20 custom metrics
- Cost: ~$5/month

**Total**: ~$13/month (10K games/day)

**Scaling**: Linear scaling with game volume due to serverless architecture

---

## Disaster Recovery

### Backup Strategy
- **DynamoDB**: Point-in-time recovery (35-day retention)
- **Lambda Code**: Versioned in Git + S3 deployment artifacts
- **Infrastructure**: CDK code in Git (infrastructure as code)

### Recovery Objectives
- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 5 minutes

### Recovery Procedures
1. **Data Loss**: Restore DynamoDB from point-in-time backup
2. **Service Failure**: Redeploy Lambda from CDK (5-10 minutes)
3. **Region Failure**: Multi-region deployment (future enhancement)

---

## Scalability

### Current Capacity
- **Lambda**: 100 concurrent executions
- **API Gateway**: 200 requests/second
- **DynamoDB**: On-Demand (unlimited)

### Scaling Triggers
- **Lambda**: Auto-scales based on request volume
- **DynamoDB**: Auto-scales based on consumed capacity
- **API Gateway**: No scaling needed (managed service)

### Scaling Limits
- **Lambda**: AWS account limit (1000 concurrent executions)
- **DynamoDB**: No practical limit with On-Demand
- **API Gateway**: 10K requests/second (soft limit, can increase)

**Capacity**: Current infrastructure supports 1M+ games/day without changes

---

## Summary

Game Service infrastructure leverages AWS serverless services for:
- **Auto-scaling**: Lambda and DynamoDB scale automatically
- **High availability**: Multi-AZ deployment built-in
- **Cost efficiency**: Pay-per-use pricing model
- **Operational simplicity**: Minimal infrastructure management
- **Security**: Encryption, IAM roles, least privilege
- **Observability**: CloudWatch logs, metrics, alarms, X-Ray tracing

All infrastructure is defined as code using AWS CDK for repeatable deployments.
