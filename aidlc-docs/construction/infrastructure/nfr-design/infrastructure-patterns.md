# Infrastructure Patterns - Infrastructure

## Overview
This document defines infrastructure patterns to implement the NFR requirements for the memory game application.

**Approach**: Leverage AWS managed services for built-in resilience, scalability, and security
**Philosophy**: Simple, cost-effective patterns appropriate for MVP

---

## Resilience Patterns

### Lambda Retry Pattern
**Pattern**: Automatic retry with exponential backoff
**Implementation**:
```typescript
// CDK Configuration
const lambda = new lambda.Function(this, 'ServiceFunction', {
  // ... other config
  retryAttempts: 2, // AWS default
  onFailure: new destinations.SqsDestination(dlq), // Dead letter queue
});
```

**Behavior**:
- First failure: Immediate retry
- Second failure: Retry after 1 second
- Third failure: Send to DLQ

**Use Cases**: All Lambda functions

### DynamoDB Backup Pattern
**Pattern**: Point-in-time recovery with continuous backups
**Implementation**:
```typescript
// CDK Configuration
const table = new dynamodb.Table(this, 'UsersTable', {
  // ... other config
  pointInTimeRecovery: true, // Enable PITR
});
```

**Behavior**:
- Continuous backups every 5 minutes
- 35-day retention
- Restore to any point in time

**Use Cases**: All DynamoDB tables

### API Gateway Throttling Pattern
**Pattern**: Rate limiting to prevent abuse and control costs
**Implementation**:
```typescript
// CDK Configuration
const api = new apigateway.HttpApi(this, 'GraphQLApi', {
  // ... other config
  defaultThrottle: {
    burstLimit: 1000, // Burst capacity
    rateLimit: 500,   // Steady-state rate
  },
});
```

**Behavior**:
- Allow bursts up to 1,000 requests/second
- Steady state: 500 requests/second
- Return 429 (Too Many Requests) when exceeded

**Use Cases**: API Gateway

### CloudFront Failover Pattern
**Pattern**: Automatic failover to healthy origins
**Implementation**:
```typescript
// CDK Configuration
const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(bucket),
    // CloudFront automatically retries on 5xx errors
  },
});
```

**Behavior**:
- Automatic retry on 5xx errors
- Failover to alternate origin (if configured)
- Cache stale content if origin unavailable

**Use Cases**: CloudFront distributions

### Health Check Pattern
**Pattern**: Continuous health monitoring with automatic recovery
**Implementation**:
```typescript
// CloudWatch Alarms for health checks
new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
  metric: lambda.metricErrors(),
  threshold: 10,
  evaluationPeriods: 1,
  alarmDescription: 'Lambda function errors',
});
```

**Behavior**:
- Monitor Lambda errors, API Gateway errors, DynamoDB throttles
- Alert on threshold breach
- Automatic recovery (AWS managed services self-heal)

**Use Cases**: All services

---

## Scalability Patterns

### Lambda Concurrency Management Pattern
**Pattern**: Reserved concurrency to prevent resource exhaustion
**Implementation**:
```typescript
// CDK Configuration
const lambda = new lambda.Function(this, 'ServiceFunction', {
  // ... other config
  reservedConcurrentExecutions: 100, // Reserve capacity
});
```

**Behavior**:
- Reserve 100 concurrent executions per function
- Prevent one function from consuming all account concurrency
- Automatic scaling within reserved capacity

**Use Cases**: All Lambda functions

### DynamoDB On-Demand Scaling Pattern
**Pattern**: Automatic capacity scaling based on traffic
**Implementation**:
```typescript
// CDK Configuration
const table = new dynamodb.Table(this, 'UsersTable', {
  // ... other config
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand
});
```

**Behavior**:
- Automatic scaling to handle any traffic level
- No capacity planning required
- Pay only for actual requests

**Use Cases**: All DynamoDB tables (MVP)

**Future**: Switch to provisioned capacity with auto-scaling if traffic becomes predictable

### API Gateway Auto-Scaling Pattern
**Pattern**: Automatic scaling to handle traffic spikes
**Implementation**:
```typescript
// API Gateway automatically scales
// No configuration needed
```

**Behavior**:
- Automatic scaling to handle traffic
- No capacity planning required
- Throttling prevents overload

**Use Cases**: API Gateway (automatic)

### CloudFront Caching Pattern
**Pattern**: Edge caching to reduce origin load
**Implementation**:
```typescript
// CDK Configuration
const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(bucket),
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    compress: true, // Enable compression
  },
});
```

**Behavior**:
- Cache static assets at edge locations
- Reduce origin requests by 80%+
- Automatic cache invalidation on updates

**Use Cases**: Web frontend, theme images, user assets

### Load Distribution Pattern
**Pattern**: Distribute load across multiple availability zones
**Implementation**:
```typescript
// AWS managed services automatically distribute across AZs
// No configuration needed
```

**Behavior**:
- Lambda: Executes in multiple AZs
- DynamoDB: Replicates across 3 AZs
- S3: Replicates across 3 AZs
- API Gateway: Deployed in multiple AZs

**Use Cases**: All AWS managed services (automatic)

---

## Performance Optimization Patterns

### Lambda Optimization Pattern
**Pattern**: Right-size memory and timeout for optimal performance
**Implementation**:
```typescript
// CDK Configuration - Per-service optimization
const authLambda = new lambda.Function(this, 'AuthService', {
  memorySize: 512,  // MB (also affects CPU)
  timeout: Duration.seconds(30),
  environment: {
    NODE_OPTIONS: '--enable-source-maps', // Better error traces
  },
});
```

**Optimization Guidelines**:
- **Memory**: Start with 512 MB, adjust based on monitoring
- **Timeout**: Set to expected duration + buffer (avoid max 30s)
- **Cold Starts**: Accept for MVP (1-3 seconds), optimize later if needed

**Use Cases**: All Lambda functions

### DynamoDB Query Optimization Pattern
**Pattern**: Use GSIs and Query operations (avoid Scan)
**Implementation**:
```typescript
// CDK Configuration - Add GSI for common queries
const table = new dynamodb.Table(this, 'GamesTable', {
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
});

// Add GSI for theme-based queries
table.addGlobalSecondaryIndex({
  indexName: 'ThemeIndex',
  partitionKey: { name: 'themeId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'completedAt', type: dynamodb.AttributeType.STRING },
});
```

**Query Guidelines**:
- **Use Query**: When you know partition key (< 10ms)
- **Use GSI**: For alternate access patterns (< 50ms)
- **Avoid Scan**: Full table scan (slow, expensive)

**Use Cases**: All DynamoDB tables

### API Gateway Caching Pattern
**Pattern**: Cache API responses to reduce backend load
**Implementation**:
```typescript
// Not implemented for MVP (adds cost and complexity)
// Future: Enable for read-heavy endpoints
```

**Decision**: Skip for MVP
**Rationale**: Adds cost ($0.02/hour per GB), complexity, and cache invalidation challenges

### CloudFront Caching and Compression Pattern
**Pattern**: Aggressive caching with compression for static assets
**Implementation**:
```typescript
// CDK Configuration
const distribution = new cloudfront.Distribution(this, 'AssetsDistribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(themeImagesBucket),
    cachePolicy: new cloudfront.CachePolicy(this, 'AssetsCachePolicy', {
      defaultTtl: Duration.days(30),  // Cache for 30 days
      maxTtl: Duration.days(365),     // Max 1 year
      minTtl: Duration.days(1),       // Min 1 day
    }),
    compress: true, // Gzip/Brotli compression
  },
});
```

**Behavior**:
- Cache static assets for 30 days
- Compress responses (reduce bandwidth by 70%+)
- Invalidate cache on updates

**Use Cases**: Theme images, user assets, web frontend

### S3 Optimization Pattern
**Pattern**: Optimize S3 for performance and cost
**Implementation**:
```typescript
// CDK Configuration
const bucket = new s3.Bucket(this, 'ThemeImagesBucket', {
  // ... other config
  intelligentTieringConfigurations: [{
    name: 'IntelligentTiering',
    archiveAccessTierTime: Duration.days(90),
    deepArchiveAccessTierTime: Duration.days(180),
  }],
});
```

**Optimizations**:
- **Intelligent-Tiering**: Automatic cost optimization
- **Lifecycle Policies**: Move old objects to cheaper storage
- **Transfer Acceleration**: Not needed for MVP

**Use Cases**: Theme images, user assets

---

## Security Patterns

### Encryption at Rest Pattern
**Pattern**: Encrypt all data at rest using AWS managed keys
**Implementation**:
```typescript
// DynamoDB
const table = new dynamodb.Table(this, 'UsersTable', {
  encryption: dynamodb.TableEncryption.AWS_MANAGED, // Default
});

// S3
const bucket = new s3.Bucket(this, 'ThemeImagesBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED, // AES-256
});
```

**Behavior**:
- Automatic encryption/decryption
- No performance impact
- No additional cost

**Use Cases**: All DynamoDB tables, all S3 buckets

### Encryption in Transit Pattern
**Pattern**: Enforce HTTPS for all traffic
**Implementation**:
```typescript
// API Gateway
const api = new apigateway.HttpApi(this, 'GraphQLApi', {
  // HTTPS only (default)
});

// CloudFront
const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
  defaultBehavior: {
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
});

// S3
const bucket = new s3.Bucket(this, 'ThemeImagesBucket', {
  enforceSSL: true, // Require HTTPS
});
```

**Behavior**:
- Reject HTTP requests
- Redirect HTTP to HTTPS (CloudFront)
- TLS 1.2+ only

**Use Cases**: All services

### IAM Least Privilege Pattern
**Pattern**: Grant minimal permissions required for each function
**Implementation**:
```typescript
// CDK Configuration
const gameServiceLambda = new lambda.Function(this, 'GameService', {
  // ... other config
});

// Grant specific permissions
gamesTable.grantReadWriteData(gameServiceLambda);
rateLimitsTable.grantReadWriteData(gameServiceLambda);
achievementsTable.grantReadWriteData(gameServiceLambda);

// Do NOT grant:
// - usersTable access (not needed)
// - subscriptionsTable access (not needed)
// - wildcard permissions
```

**Guidelines**:
- Grant only required tables
- Use `grantReadData` for read-only access
- Use `grantReadWriteData` for read-write access
- Never use `grant*` with wildcards

**Use Cases**: All Lambda functions

### Network Security Pattern
**Pattern**: Restrict access using security groups and policies
**Implementation**:
```typescript
// S3 Bucket Policy - CloudFront only
const bucket = new s3.Bucket(this, 'ThemeImagesBucket', {
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
});

const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
bucket.grantRead(oai);

// API Gateway - Cognito authorizer
const api = new apigateway.HttpApi(this, 'GraphQLApi', {
  defaultAuthorizer: new apigateway.HttpUserPoolAuthorizer({
    userPool: userPool,
  }),
});
```

**Behavior**:
- S3: Block public access, allow CloudFront only
- API Gateway: Require Cognito authentication
- Lambda: No VPC (uses AWS PrivateLink)

**Use Cases**: S3 buckets, API Gateway

### Logging and Monitoring Pattern
**Pattern**: Comprehensive logging for security auditing
**Implementation**:
```typescript
// CloudWatch Logs
const logGroup = new logs.LogGroup(this, 'LambdaLogs', {
  retention: logs.RetentionDays.ONE_MONTH,
});

// CloudTrail (optional for MVP)
// Logs all AWS API calls
```

**Logs Captured**:
- Lambda: All invocations, errors, custom logs
- API Gateway: All requests, responses, errors
- DynamoDB: Not logged (use CloudTrail for API calls)
- S3: Access logs (optional)

**Use Cases**: All services

### Secret Management Pattern
**Pattern**: Store secrets in AWS Secrets Manager or Parameter Store
**Implementation**:
```typescript
// CDK Configuration
const stripeSecret = secretsmanager.Secret.fromSecretNameV2(
  this,
  'StripeSecret',
  'prod/stripe/secret-key'
);

const paymentLambda = new lambda.Function(this, 'PaymentService', {
  environment: {
    STRIPE_SECRET_ARN: stripeSecret.secretArn,
  },
});

stripeSecret.grantRead(paymentLambda);
```

**Secrets to Store**:
- Stripe API keys
- JWT secrets
- Third-party API keys

**Use Cases**: Payment Service, Auth Service

---

## Operational Patterns

### Deployment Pattern
**Pattern**: Infrastructure as Code with CDK
**Implementation**:
```bash
# Deploy all stacks
cdk deploy --all --context environment=prod

# Deploy specific stack
cdk deploy MemoryGameDatabaseStack --context environment=prod

# Rollback (redeploy previous version)
git checkout <previous-commit>
cdk deploy --all --context environment=prod
```

**Behavior**:
- CloudFormation manages deployment
- Automatic rollback on failure
- Stack dependencies handled automatically

**Use Cases**: All infrastructure

### Monitoring and Alerting Pattern
**Pattern**: CloudWatch metrics and alarms with SNS notifications
**Implementation**:
```typescript
// CDK Configuration
const topic = new sns.Topic(this, 'AlertTopic');
topic.addSubscription(new subscriptions.EmailSubscription('ops@example.com'));

new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
  metric: lambda.metricErrors(),
  threshold: 10,
  evaluationPeriods: 1,
  actionsEnabled: true,
}).addAlarmAction(new actions.SnsAction(topic));
```

**Alarms**:
- Lambda errors (> 10 in 5 minutes)
- API Gateway 5xx errors (> 50 in 5 minutes)
- DynamoDB throttles (> 10 in 5 minutes)
- Lambda duration (> 25 seconds)

**Use Cases**: All services

### Cost Optimization Pattern
**Pattern**: Right-size resources and use cost-effective services
**Implementation**:
- **DynamoDB**: On-demand (no idle costs)
- **Lambda**: Right-size memory (monitor and adjust)
- **S3**: Intelligent-Tiering (automatic optimization)
- **CloudFront**: Optimize cache hit ratio

**Monitoring**:
- AWS Cost Explorer (weekly review)
- Budget alerts (80%, 100%, 120%)
- Cost allocation tags

**Use Cases**: All services

### Disaster Recovery Pattern
**Pattern**: Automated backups with manual recovery
**Implementation**:
```typescript
// DynamoDB PITR
const table = new dynamodb.Table(this, 'UsersTable', {
  pointInTimeRecovery: true,
});

// S3 Versioning
const bucket = new s3.Bucket(this, 'ThemeImagesBucket', {
  versioned: true,
});

// CloudFormation in Git
// All infrastructure code version controlled
```

**Recovery Procedures**:
1. Restore DynamoDB from PITR
2. Restore S3 objects from versions
3. Redeploy CloudFormation stacks from Git

**Use Cases**: All data stores

---

## Pattern Summary

| Category | Pattern | Implementation | Use Cases |
|----------|---------|----------------|-----------|
| Resilience | Lambda Retry | Automatic retry + DLQ | All Lambdas |
| Resilience | DynamoDB Backup | PITR enabled | All tables |
| Resilience | API Throttling | Rate limiting | API Gateway |
| Scalability | Lambda Concurrency | Reserved capacity | All Lambdas |
| Scalability | DynamoDB On-Demand | Auto-scaling | All tables |
| Scalability | CloudFront Caching | Edge caching | Static assets |
| Performance | Lambda Optimization | Right-size memory | All Lambdas |
| Performance | DynamoDB GSIs | Query optimization | All tables |
| Performance | CloudFront Compression | Gzip/Brotli | Static assets |
| Security | Encryption at Rest | AWS managed keys | All data |
| Security | Encryption in Transit | HTTPS only | All traffic |
| Security | IAM Least Privilege | Minimal permissions | All Lambdas |
| Security | Secret Management | Secrets Manager | API keys |
| Operational | IaC Deployment | CDK | All infrastructure |
| Operational | Monitoring | CloudWatch + SNS | All services |
| Operational | Cost Optimization | Right-sizing | All services |

**Philosophy**: Leverage AWS managed services for built-in patterns, keep it simple for MVP, optimize later based on actual usage.
