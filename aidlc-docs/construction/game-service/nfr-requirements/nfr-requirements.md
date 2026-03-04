# NFR Requirements - Game Service

## Performance Requirements

### Response Time
- **startGame**: < 300ms (p95), < 500ms (p99)
- **completeGame**: < 200ms (p95), < 400ms (p99)
- **getGame**: < 100ms (p95), < 200ms (p99)
- **getGameHistory**: < 500ms (p95), < 1s (p99)
- **getUserStatistics**: < 500ms (p95), < 1s (p99) with caching
- **canStartGame**: < 100ms (p95), < 200ms (p99)

**Rationale**: Game operations must feel instant. Completion is critical path for user satisfaction.

### Throughput
- **Peak Load**: 200 requests/second per Lambda instance
- **Sustained Load**: 100 requests/second
- **Concurrent Games**: 1,000 simultaneous in-progress games
- **Daily Games**: 10,000+ game completions per day

### Latency Targets
- **DynamoDB Operations**: < 50ms (p95)
- **Theme Cache Lookup**: < 5ms
- **Rate Limit Check**: < 20ms
- **Score Calculation**: < 10ms
- **Achievement Check**: < 50ms

### Cold Start
- **Acceptable**: < 2 seconds
- **Mitigation**: Provisioned concurrency for production (10 instances)

---

## Scalability Requirements

### User Growth
- **MVP**: 1,000 concurrent users
- **Year 1**: 10,000 concurrent users
- **Year 2**: 100,000 concurrent users

### Data Growth
- **Games**: 100K games/month → 1.2M games/year
- **Achievements**: 10K users × 9 achievements = 90K records
- **Rate Limits**: 10K active users = 10K records (with TTL cleanup)

### Scaling Strategy
- **Lambda**: Auto-scaling with reserved concurrency (100 instances)
- **DynamoDB**: On-demand capacity mode
- **Caching**: Lambda memory caching (5-minute TTL)
- **Horizontal**: Stateless design allows unlimited horizontal scaling

---

## Availability Requirements

### Uptime
- **Target**: 99.9% availability (43 minutes downtime/month)
- **Dependency**: AWS Lambda (99.95%), DynamoDB (99.99%), EventBridge (99.9%)
- **Composite**: 99.84% (acceptable for MVP)

### Disaster Recovery
- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 5 minutes
- **Backup**: DynamoDB point-in-time recovery enabled
- **Multi-Region**: Not required for MVP (single region)

### Failover
- **Lambda**: Automatic failover across AZs
- **DynamoDB**: Multi-AZ replication (automatic)
- **EventBridge**: Multi-AZ (automatic)

---

## Security Requirements

### Authentication
- **Method**: JWT tokens from Auth Service (Cognito)
- **Validation**: Verify token signature and expiry on every request
- **Authorization**: User can only access their own games

### Data Protection
- **At Rest**: DynamoDB encryption enabled (AWS managed keys)
- **In Transit**: HTTPS only (enforced by API Gateway)
- **PII**: User IDs only (no sensitive data in Game Service)

### Input Validation
- **All Inputs**: Validate with Zod schemas
- **SQL Injection**: N/A (DynamoDB)
- **XSS**: Input sanitization for all user-provided data
- **CSRF**: Token-based auth (stateless)

### Rate Limiting
- **Tier-Based**: Enforced at application level
- **API Gateway**: 100 req/s per user (burst protection)
- **DDoS**: AWS Shield Standard (automatic)

### Secrets Management
- **Environment Variables**: Stored in AWS Systems Manager Parameter Store
- **No Hardcoded Secrets**: All secrets injected at runtime

---

## Reliability Requirements

### Error Handling
- **Graceful Degradation**: Return cached data if DynamoDB unavailable
- **Retry Logic**: 3 retries with exponential backoff for transient errors
- **Circuit Breaker**: Not required (AWS managed services)
- **Fallback**: Game completion succeeds even if leaderboard update fails

### Data Consistency
- **Game Records**: Strong consistency (DynamoDB consistent reads)
- **Rate Limits**: Strong consistency (critical for enforcement)
- **Statistics**: Eventual consistency (5-minute cache acceptable)
- **Leaderboard**: Eventual consistency (asynchronous updates)

### Fault Tolerance
- **Lambda**: Automatic retry on failure
- **DynamoDB**: Multi-AZ replication
- **EventBridge**: At-least-once delivery with retries

---

## Testing Requirements

### Unit Testing
- **Coverage**: 80%+ code coverage
- **Framework**: Jest + ts-jest
- **Mocking**: Mock all external dependencies (DynamoDB, EventBridge)
- **Pattern**: AAA (Arrange, Act, Assert)

### Integration Testing
- **Environment**: LocalStack for DynamoDB
- **Scope**: Full service flows with mocked AWS services
- **Coverage**: All GraphQL operations end-to-end

### E2E Testing
- **Environment**: Dev environment with real AWS services
- **Scope**: Critical user flows (start game, complete game, check rate limit)
- **Frequency**: Before each deployment

### Load Testing
- **Tool**: Artillery or k6
- **Target**: 100 req/s sustained for 10 minutes
- **Metrics**: Response time, error rate, throughput
- **Pass Criteria**: p95 < 500ms, error rate < 1%

### Performance Testing
- **Cold Start**: Measure and optimize
- **Cache Hit Rate**: Monitor theme cache effectiveness
- **DynamoDB Latency**: Monitor query performance

---

## Monitoring Requirements

### Metrics (CloudWatch)
- **Request Count**: Total requests per operation
- **Error Count**: Errors by type and operation
- **Latency**: p50, p95, p99 per operation
- **Game Metrics**: Games started, completed, abandoned
- **Rate Limit Metrics**: Limits hit, tier distribution
- **Achievement Metrics**: Achievements unlocked by type
- **Cache Metrics**: Hit rate, miss rate

### Alarms (CloudWatch)
- **Error Rate**: > 5% for 5 minutes
- **Latency**: p99 > 1s for 5 minutes
- **Lambda Errors**: > 10 errors in 5 minutes
- **Lambda Duration**: > 25s (approaching timeout)
- **DynamoDB Throttling**: Any throttled requests

### Logging (CloudWatch Logs)
- **All Requests**: With correlation ID
- **All Errors**: With stack traces
- **Security Events**: Failed validations, suspicious activity
- **Business Events**: Game completions, achievements unlocked

### Tracing (X-Ray)
- **Enabled**: Staging and production only
- **Sampling**: 10% of requests
- **Purpose**: Performance bottleneck identification

---

## Operational Requirements

### Deployment
- **Strategy**: Blue/green deployment via Lambda aliases
- **Rollback**: Instant rollback to previous version
- **Canary**: 10% traffic to new version for 10 minutes
- **Automation**: CI/CD pipeline (GitHub Actions or similar)

### Maintenance
- **Zero Downtime**: Required for deployments
- **Database Migrations**: Not applicable (DynamoDB schema-less)
- **Backward Compatibility**: API versioning not required for MVP

### Documentation
- **API Docs**: GraphQL schema with examples
- **Runbook**: Common issues and resolutions
- **Architecture Docs**: System design and data flow
- **Deployment Guide**: Step-by-step deployment instructions

---

## Tech Stack Decisions

### Runtime
- **Language**: TypeScript
- **Runtime**: Node.js 20.x
- **Framework**: AWS Lambda (serverless)

### API
- **Protocol**: GraphQL over HTTP
- **Gateway**: AWS API Gateway (HTTP API)
- **Schema**: Code-first with TypeScript types

### Database
- **Primary**: DynamoDB (NoSQL)
- **Caching**: Lambda memory (in-process)
- **Backup**: Point-in-time recovery enabled

### Messaging
- **Event Bus**: AWS EventBridge
- **Pattern**: Event-driven for leaderboard updates
- **Delivery**: At-least-once with retries

### Development Tools
- **Testing**: Jest, ts-jest
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Build**: TypeScript compiler

### Infrastructure
- **IaC**: AWS CDK (TypeScript)
- **CI/CD**: GitHub Actions
- **Monitoring**: CloudWatch + X-Ray

---

## Compliance Requirements

### Data Privacy
- **GDPR**: Not storing PII (user IDs only)
- **Data Retention**: Games retained indefinitely (user can request deletion)
- **Right to Erasure**: Supported via Admin Service

### Accessibility
- **API**: N/A (backend service)
- **Documentation**: Clear and accessible

### Audit
- **Logging**: All operations logged with user ID
- **Retention**: Logs retained for 90 days
- **Compliance**: SOC 2 Type II (future)

---

## Cost Optimization

### Lambda
- **Memory**: 512 MB (balance between cost and performance)
- **Timeout**: 30 seconds
- **Reserved Concurrency**: 100 instances (production only)

### DynamoDB
- **Capacity Mode**: On-demand (pay per request)
- **Optimization**: Use GSIs efficiently, avoid scans
- **TTL**: Enabled for RateLimits table (auto-cleanup)

### Data Transfer
- **Minimize**: Keep responses small, use pagination
- **Compression**: API Gateway compression enabled

### Caching
- **Lambda Memory**: Free caching for theme data
- **TTL**: 5 minutes (balance freshness vs cost)

---

## Performance Optimization Strategies

### Lambda Optimization
- **Connection Pooling**: Reuse DynamoDB client connections
- **Warm-up**: Provisioned concurrency for production
- **Memory Caching**: Cache theme data and statistics
- **Code Splitting**: Minimize bundle size

### DynamoDB Optimization
- **GSI Design**: Efficient query patterns (UserIdIndex)
- **Consistent Reads**: Only when necessary
- **Batch Operations**: Use batch get/write where possible
- **Projection**: Only fetch required attributes

### Caching Strategy
- **Theme Data**: 5-minute TTL (changes infrequently)
- **Statistics**: 5-minute TTL (eventual consistency OK)
- **No Cache**: Rate limits, subscription tier (must be current)

### Async Operations
- **Leaderboard Updates**: Fire-and-forget (don't block user)
- **Achievement Checks**: Synchronous but optimized
- **Background Jobs**: Hourly cleanup of abandoned games

---

## Risk Mitigation

### High-Risk Areas
1. **Rate Limiting**: Critical for monetization
   - Mitigation: Strong consistency, comprehensive testing
2. **Score Calculation**: Must be fair and deterministic
   - Mitigation: Unit tests, validation, audit logging
3. **Achievement Tracking**: Must be accurate
   - Mitigation: Idempotent operations, progress tracking

### Failure Scenarios
1. **DynamoDB Unavailable**: Return cached statistics, fail gracefully
2. **EventBridge Failure**: Log and retry, don't block game completion
3. **Lambda Timeout**: Increase timeout, optimize code
4. **Rate Limit Bypass**: Multiple validation points, audit logging

---

## Success Metrics

### Performance
- p95 latency < 300ms for startGame
- p95 latency < 200ms for completeGame
- 99.9% availability

### Quality
- 80%+ test coverage
- Zero critical bugs in production
- < 1% error rate

### Business
- 10,000+ games/day
- < 5% rate limit hit rate (users not frustrated)
- > 90% game completion rate (started → completed)

---

## Summary

The Game Service is designed as a high-performance, scalable serverless microservice with:
- **Performance**: Sub-300ms response times for critical operations
- **Scalability**: Auto-scaling to 100K+ concurrent users
- **Reliability**: 99.9% availability with automatic failover
- **Security**: JWT authentication, input validation, encryption
- **Testing**: 80%+ coverage with unit, integration, E2E, and load tests
- **Monitoring**: Comprehensive metrics, alarms, and logging
- **Cost**: Optimized with on-demand pricing and efficient caching

All requirements are achievable with AWS serverless architecture and established patterns from Auth Service.
