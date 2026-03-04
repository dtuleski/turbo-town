# Operational Requirements - Infrastructure

## Overview
This document defines operational requirements for managing and maintaining the AWS infrastructure.

**Operations Model**: DevOps with infrastructure as code
**Team Size**: Small team (1-3 developers)

---

## Monitoring and Observability

### CloudWatch Metrics

#### Lambda Metrics (per function)
- **Invocations**: Total invocations
- **Errors**: Error count and rate
- **Duration**: Execution time (avg, p50, p95, p99, max)
- **Throttles**: Throttled invocations
- **Concurrent Executions**: Active executions
- **Cold Starts**: Cold start count (custom metric)

#### API Gateway Metrics
- **Count**: Total requests
- **4XXError**: Client errors
- **5XXError**: Server errors
- **Latency**: Request latency (avg, p50, p95, p99, max)
- **IntegrationLatency**: Backend latency

#### DynamoDB Metrics (per table)
- **ConsumedReadCapacityUnits**: Read consumption
- **ConsumedWriteCapacityUnits**: Write consumption
- **UserErrors**: Throttling and validation errors
- **SystemErrors**: Service errors
- **SuccessfulRequestLatency**: Request latency

#### S3 Metrics (per bucket)
- **NumberOfObjects**: Object count
- **BucketSizeBytes**: Storage size
- **AllRequests**: Total requests
- **4xxErrors**: Client errors
- **5xxErrors**: Server errors

#### CloudFront Metrics (per distribution)
- **Requests**: Total requests
- **BytesDownloaded**: Data transfer
- **4xxErrorRate**: Client error rate
- **5xxErrorRate**: Server error rate
- **CacheHitRate**: Cache effectiveness

### CloudWatch Dashboards

#### Main Dashboard
- API Gateway request rate and latency
- Lambda invocations and errors (all functions)
- DynamoDB read/write capacity (all tables)
- CloudFront requests and cache hit rate

#### Per-Service Dashboards
- Service-specific Lambda metrics
- Service-specific DynamoDB tables
- Service-specific error rates

### CloudWatch Logs

#### Log Groups
- `/aws/lambda/auth-service` - Auth service logs
- `/aws/lambda/game-service` - Game service logs
- `/aws/lambda/leaderboard-service` - Leaderboard service logs
- `/aws/lambda/payment-service` - Payment service logs
- `/aws/lambda/cms-service` - CMS service logs
- `/aws/lambda/admin-service` - Admin service logs
- `/aws/apigateway/graphql-api` - API Gateway logs

#### Log Retention
- **Development**: 7 days
- **Staging**: 14 days
- **Production**: 30 days

#### Log Insights Queries
- Error analysis: `fields @timestamp, @message | filter @message like /ERROR/`
- Slow requests: `fields @timestamp, @duration | filter @duration > 2000`
- User activity: `fields @timestamp, userId, action | stats count() by action`

---

## Alerting and Notifications

### SNS Topics
- **Critical Alerts**: ops-critical@example.com
- **Warning Alerts**: ops-warnings@example.com
- **Info Notifications**: ops-info@example.com

### CloudWatch Alarms

#### Critical Alarms (SNS: Critical)

**Lambda Errors** (per service)
- **Metric**: Errors
- **Threshold**: > 10 errors in 5 minutes
- **Action**: Send SNS notification
- **Response**: Investigate immediately

**API Gateway 5xx Errors**
- **Metric**: 5XXError
- **Threshold**: > 50 errors in 5 minutes
- **Action**: Send SNS notification
- **Response**: Investigate immediately

**DynamoDB Throttles** (per table)
- **Metric**: UserErrors (throttling)
- **Threshold**: > 10 throttles in 5 minutes
- **Action**: Send SNS notification
- **Response**: Review capacity, consider provisioned mode

#### Warning Alarms (SNS: Warning)

**Lambda Duration** (per service)
- **Metric**: Duration
- **Threshold**: > 25 seconds (approaching 30s timeout)
- **Action**: Send SNS notification
- **Response**: Optimize function or increase timeout

**API Gateway Latency**
- **Metric**: Latency (p99)
- **Threshold**: > 2000ms
- **Action**: Send SNS notification
- **Response**: Investigate slow backends

**Lambda Throttles** (per service)
- **Metric**: Throttles
- **Threshold**: > 5 throttles in 5 minutes
- **Action**: Send SNS notification
- **Response**: Review concurrency limits

#### Info Notifications (SNS: Info)

**Deployment Notifications**
- **Trigger**: CDK deployment complete
- **Action**: Send SNS notification
- **Response**: Verify deployment success

**Backup Notifications**
- **Trigger**: DynamoDB PITR enabled/disabled
- **Action**: Send SNS notification
- **Response**: Verify backup configuration

---

## Deployment Automation

### CI/CD Pipeline

#### Development Environment
- **Trigger**: Push to `develop` branch
- **Steps**:
  1. Run tests (if any)
  2. CDK synth
  3. CDK deploy to dev
  4. Run smoke tests
- **Approval**: Automatic

#### Staging Environment
- **Trigger**: Push to `staging` branch
- **Steps**:
  1. Run tests
  2. CDK synth
  3. CDK deploy to staging
  4. Run integration tests
  5. Run load tests
- **Approval**: Automatic

#### Production Environment
- **Trigger**: Push to `main` branch or Git tag
- **Steps**:
  1. Run tests
  2. CDK synth
  3. Manual approval gate
  4. CDK deploy to prod
  5. Run smoke tests
  6. Monitor for 30 minutes
- **Approval**: Manual (required)

### Deployment Rollback

#### Automatic Rollback
- CloudFormation automatically rolls back on deployment failure
- Previous stack state is restored

#### Manual Rollback
```bash
# Rollback to previous version
git revert HEAD
git push origin main

# Or redeploy previous version
git checkout <previous-commit>
cdk deploy --all --context environment=prod
```

### Blue/Green Deployment (Future)
- Use Lambda aliases and versions
- Gradual traffic shifting with CodeDeploy
- Automatic rollback on errors

---

## Cost Optimization

### Cost Monitoring

#### AWS Cost Explorer
- **Frequency**: Weekly review
- **Breakdown**: By service, by environment, by tag
- **Alerts**: Budget alerts at 80%, 100%, 120%

#### Cost Allocation Tags
- `Environment`: dev, staging, prod
- `Service`: auth, game, leaderboard, payment, cms, admin
- `ManagedBy`: cdk

### Cost Optimization Strategies

#### DynamoDB
- **On-Demand**: Pay per request (no idle costs)
- **Future**: Switch to provisioned capacity if traffic is predictable
- **Savings**: Up to 50% with provisioned capacity

#### Lambda
- **Right-Sizing**: Monitor memory usage, adjust as needed
- **Timeout**: Set appropriate timeouts (avoid max 30s)
- **Future**: Savings Plans for consistent usage

#### S3
- **Lifecycle Policies**: Move old objects to Glacier
- **Intelligent-Tiering**: Automatic cost optimization
- **Delete Incomplete Uploads**: After 7 days

#### CloudFront
- **Cache Optimization**: Increase cache hit ratio
- **Compression**: Enable Gzip/Brotli
- **Future**: Reserved capacity for consistent traffic

### Monthly Cost Estimates

#### Development Environment
- DynamoDB: $5-10
- Lambda: $2-5
- API Gateway: $1-2
- S3: $1
- CloudFront: $1-2
- **Total**: ~$10-20/month

#### Staging Environment
- DynamoDB: $10-20
- Lambda: $5-10
- API Gateway: $2-5
- S3: $1-2
- CloudFront: $2-5
- **Total**: ~$20-40/month

#### Production Environment (1,000 users)
- DynamoDB: $20-50
- Lambda: $10-20
- API Gateway: $5-10
- S3: $2-5
- CloudFront: $10-20
- Cognito: Free (< 50,000 MAUs)
- CloudWatch: $5-10
- **Total**: ~$50-115/month

---

## Documentation Standards

### Infrastructure Documentation

#### README.md
- Project overview
- Prerequisites
- Installation instructions
- Deployment instructions
- Environment variables
- Troubleshooting

#### Architecture Diagrams
- High-level architecture
- Network diagram
- Data flow diagram
- Deployment pipeline

#### Runbooks
- Deployment procedures
- Rollback procedures
- Disaster recovery procedures
- Common troubleshooting steps

### Code Documentation

#### CDK Stacks
- JSDoc comments for all constructs
- Inline comments for complex logic
- README per stack

#### Configuration Files
- Comments explaining each setting
- Examples for common scenarios

---

## Operational Procedures

### Daily Operations
- Review CloudWatch dashboards
- Check alarm status
- Review cost reports

### Weekly Operations
- Review CloudWatch Logs for errors
- Review performance metrics
- Review cost trends
- Update dependencies (npm audit)

### Monthly Operations
- Review and update documentation
- Review and optimize costs
- Test disaster recovery procedures (quarterly)
- Update Lambda runtimes and dependencies

### Incident Response

#### Severity Levels
- **P0 (Critical)**: Service down, data loss
- **P1 (High)**: Degraded performance, errors
- **P2 (Medium)**: Minor issues, warnings
- **P3 (Low)**: Cosmetic issues, enhancements

#### Response Times
- **P0**: Immediate response, 1-hour resolution target
- **P1**: 1-hour response, 4-hour resolution target
- **P2**: 4-hour response, 24-hour resolution target
- **P3**: Best effort

#### Incident Workflow
1. Detect (alarms, monitoring, user reports)
2. Acknowledge (update status page)
3. Investigate (logs, metrics, traces)
4. Mitigate (rollback, hotfix, scale up)
5. Resolve (verify fix, monitor)
6. Post-Mortem (document, improve)

---

## Operational Requirements Summary

**Monitoring**: CloudWatch metrics, logs, dashboards for all services
**Alerting**: SNS notifications for critical, warning, and info events
**Deployment**: Automated CI/CD with manual approval for production
**Cost**: Monthly budget ~$50-115 for production, cost monitoring and optimization
**Documentation**: Comprehensive runbooks, architecture diagrams, code comments
**Operations**: Daily monitoring, weekly reviews, monthly maintenance
**Incident Response**: Defined severity levels and response times

**Team Requirements**: 1-3 developers with AWS and DevOps experience
**Tools**: AWS Console, AWS CLI, CDK CLI, Git, monitoring dashboards
**Skills**: AWS services, TypeScript, Infrastructure as Code, DevOps practices
