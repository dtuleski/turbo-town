# NFR Requirements - Infrastructure

## Overview
This document defines non-functional requirements for the AWS infrastructure supporting the memory game application.

**Target Profile**: MVP with basic requirements
**Infrastructure Approach**: Cost-effective, simple architecture suitable for initial launch

---

## Availability Requirements

### Uptime SLA: 99% (Basic)
**Target**: 99% uptime (7.2 hours downtime/month)
**Rationale**: Appropriate for MVP, allows for maintenance windows and learning

### Multi-AZ Deployment
- **DynamoDB**: Automatically multi-AZ (AWS managed)
- **Lambda**: Automatically multi-AZ (AWS managed)
- **S3**: Automatically multi-AZ (AWS managed)
- **API Gateway**: Automatically multi-AZ (AWS managed)
- **CloudFront**: Global edge network (AWS managed)

**Note**: AWS managed services provide inherent high availability without additional configuration.

### Health Checks and Failover
- **Lambda**: Automatic retry on failure (AWS managed)
- **API Gateway**: Built-in health checks
- **DynamoDB**: Automatic failover to healthy nodes
- **CloudFront**: Automatic failover to healthy origins

### Maintenance Windows
- **Preferred Window**: Sunday 2:00 AM - 6:00 AM UTC
- **Notification**: 48 hours advance notice for planned maintenance
- **Emergency Maintenance**: As needed with immediate notification

---

## Scalability Requirements

### Concurrent Users: Up to 1,000
**Target**: Support 1,000 concurrent users
**Rationale**: Appropriate for MVP launch, can scale up as needed

### Auto-Scaling Configuration

#### Lambda Functions
- **Concurrent Executions**: 100 reserved (per function)
- **Burst Capacity**: 500 (account level)
- **Scaling**: Automatic (AWS managed)

#### DynamoDB Tables
- **Capacity Mode**: On-demand (automatic scaling)
- **Read/Write**: Unlimited (pay per request)
- **Burst Capacity**: Automatic (AWS managed)

#### API Gateway
- **Throttle Burst**: 1,000 requests/second
- **Throttle Rate**: 500 requests/second (steady state)
- **Scaling**: Automatic (AWS managed)

#### CloudFront
- **Requests**: Unlimited (AWS managed)
- **Bandwidth**: Unlimited (AWS managed)
- **Scaling**: Automatic global distribution

### Load Testing Requirements
- **Test Frequency**: Before major releases
- **Test Scenarios**:
  - 500 concurrent users (50% of capacity)
  - 1,000 concurrent users (100% of capacity)
  - 1,500 concurrent users (150% of capacity - stress test)
- **Test Duration**: 30 minutes per scenario
- **Success Criteria**: < 5% error rate, response times within targets

---

## Performance Requirements

### API Response Time: < 2 seconds (Standard)
**Target**: 95th percentile API response time < 2 seconds
**Measurement**: CloudWatch metrics

#### Per-Service Targets
- **Auth Service**: < 1 second (login, token refresh)
- **Game Service**: < 1.5 seconds (game creation, completion)
- **Leaderboard Service**: < 1 second (leaderboard queries)
- **Payment Service**: < 2 seconds (subscription operations)
- **CMS Service**: < 1.5 seconds (theme queries)
- **Admin Service**: < 2 seconds (admin operations)

### Page Load Time: < 5 seconds (Standard)
**Target**: 95th percentile page load time < 5 seconds
**Measurement**: Real User Monitoring (RUM) or synthetic monitoring

#### Page Load Breakdown
- **Initial HTML**: < 500ms (CloudFront cache)
- **JavaScript Bundle**: < 1 second (CloudFront cache + compression)
- **API Calls**: < 2 seconds (see API targets above)
- **Images**: < 1 second (CloudFront cache)
- **Total**: < 5 seconds

### Database Query Performance
- **Single Item Read**: < 10ms (DynamoDB GetItem)
- **Query with GSI**: < 50ms (DynamoDB Query)
- **Scan Operations**: Avoid (use Query with GSI instead)

### CDN Cache Hit Ratio
- **Target**: > 80% cache hit ratio
- **Static Assets**: > 95% cache hit ratio
- **API Responses**: Not cached (dynamic content)

### Lambda Cold Start Mitigation
- **Strategy**: Accept cold starts for MVP (cost-effective)
- **Typical Cold Start**: 1-3 seconds (Node.js 20.x)
- **Warm Execution**: < 100ms
- **Future Optimization**: Provisioned concurrency if needed

### Performance Monitoring
- **CloudWatch Metrics**: API latency, Lambda duration, DynamoDB latency
- **Alarms**: Alert when p95 latency exceeds targets
- **Dashboards**: Real-time performance visualization

---

## Disaster Recovery Requirements

### Recovery Objectives: Basic
- **RTO** (Recovery Time Objective): 24 hours
- **RPO** (Recovery Point Objective): 24 hours
**Rationale**: Acceptable for MVP, manual recovery procedures

### Backup Strategies

#### DynamoDB Tables
- **Point-in-Time Recovery (PITR)**: Enabled
- **Retention**: 35 days (AWS maximum)
- **Recovery**: Manual restore to new table
- **RPO**: Up to 5 minutes (PITR granularity)

#### S3 Buckets
- **Versioning**: Enabled for critical buckets (theme images, user assets)
- **Retention**: Indefinite (until manually deleted)
- **Recovery**: Manual restore from version history
- **RPO**: Near-zero (versioning captures all changes)

#### CloudFormation Stacks
- **Version Control**: All CDK code in Git repository
- **Backup**: Git commits and tags
- **Recovery**: Redeploy from Git
- **RPO**: Last committed version

### Recovery Procedures

#### DynamoDB Table Recovery
1. Identify backup point (PITR timestamp)
2. Restore table to new table name
3. Update Lambda environment variables
4. Redeploy Lambda functions
5. Verify data integrity
6. Switch traffic to new table
**Estimated Time**: 4-8 hours

#### S3 Bucket Recovery
1. Identify deleted/corrupted objects
2. Restore from version history
3. Verify object integrity
4. Invalidate CloudFront cache
**Estimated Time**: 1-2 hours

#### Complete Infrastructure Recovery
1. Clone Git repository
2. Install dependencies
3. Deploy all CDK stacks
4. Restore DynamoDB tables from PITR
5. Restore S3 objects from versions
6. Verify all services
**Estimated Time**: 12-24 hours

### Multi-Region Strategy
**Decision**: Single region for MVP
**Rationale**: Cost-effective, simpler operations
**Future**: Multi-region can be added if needed

### Disaster Recovery Testing
- **Frequency**: Quarterly
- **Scope**: Restore one DynamoDB table, restore S3 objects
- **Documentation**: Update recovery procedures based on test results

---

## Security and Compliance Requirements

### Security Level: Basic
**Approach**: Essential security controls for MVP
**Rationale**: Cost-effective, meets basic security standards

### Encryption Standards

#### Encryption at Rest
- **DynamoDB**: AWS managed keys (SSE-DynamoDB)
- **S3**: Server-side encryption (SSE-S3, AES-256)
- **CloudWatch Logs**: Encrypted by default
- **Lambda Environment Variables**: Encrypted with AWS managed keys

#### Encryption in Transit
- **API Gateway**: HTTPS only (TLS 1.2+)
- **CloudFront**: HTTPS only (TLS 1.2+)
- **Lambda to DynamoDB**: AWS PrivateLink (encrypted)
- **Lambda to S3**: AWS PrivateLink (encrypted)

### IAM Policy Standards

#### Least Privilege Principle
Each Lambda function has minimal permissions:
```typescript
// Example: Game Service Lambda
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:UpdateItem",
    "dynamodb:Query"
  ],
  "Resource": [
    "arn:aws:dynamodb:region:account:table/Games",
    "arn:aws:dynamodb:region:account:table/RateLimits",
    "arn:aws:dynamodb:region:account:table/Achievements"
  ]
}
```

#### No Wildcard Permissions
- Avoid `"Resource": "*"` in IAM policies
- Specify exact resource ARNs
- Use conditions to further restrict access

### Network Security Controls

#### API Gateway
- **Throttling**: 1,000 burst, 500 steady (per account)
- **CORS**: Restricted to web frontend domain
- **Authorization**: AWS Cognito User Pool

#### S3 Buckets
- **Public Access**: Blocked (access via CloudFront only)
- **Bucket Policies**: Restrict to CloudFront OAI
- **CORS**: Restricted to web frontend domain

#### CloudFront
- **Viewer Protocol**: Redirect HTTP to HTTPS
- **Origin Protocol**: HTTPS only
- **AWS Shield Standard**: Enabled (DDoS protection)

### Security Monitoring and Logging

#### CloudWatch Logs
- **Lambda Logs**: All invocations, errors, warnings
- **API Gateway Logs**: All requests, responses, errors
- **Retention**: 30 days

#### CloudTrail
- **API Calls**: All AWS API calls logged
- **Retention**: 90 days
- **S3 Storage**: Long-term retention (optional)

#### CloudWatch Alarms
- **Lambda Errors**: Alert on > 10 errors in 5 minutes
- **API 5xx Errors**: Alert on > 50 errors in 5 minutes
- **Unauthorized Access**: Alert on 403 errors

### Compliance Requirements

#### GDPR Compliance
- **Data Residency**: Single AWS region (user choice)
- **Data Deletion**: Manual process (delete user data on request)
- **Data Export**: Manual process (export user data on request)
- **Privacy Policy**: Required (not part of infrastructure)

#### Basic Security Standards
- **HTTPS**: All traffic encrypted in transit
- **Encryption at Rest**: All data encrypted
- **Access Control**: IAM policies, Cognito authentication
- **Audit Logging**: CloudWatch Logs, CloudTrail

### Vulnerability Scanning and Patching

#### Lambda Functions
- **Runtime**: Node.js 20.x (latest LTS)
- **Dependencies**: npm audit on every build
- **Patching**: Update dependencies monthly

#### AWS Managed Services
- **Patching**: Automatic (AWS managed)
- **Vulnerabilities**: AWS responsibility

---

## NFR Summary

| Category | Requirement | Target | Rationale |
|----------|-------------|--------|-----------|
| Availability | Uptime SLA | 99% | MVP-appropriate, allows maintenance |
| Scalability | Concurrent Users | 1,000 | Initial launch capacity |
| Performance | API Response | < 2s | Standard user experience |
| Performance | Page Load | < 5s | Acceptable for web app |
| DR | RTO | 24 hours | Manual recovery acceptable |
| DR | RPO | 24 hours | PITR provides better RPO |
| Security | Encryption | At rest & transit | Basic security standard |
| Security | IAM | Least privilege | Security best practice |
| Compliance | GDPR | Basic | Manual processes for MVP |

**Overall Approach**: Cost-effective MVP infrastructure with essential quality attributes. Can scale up as application grows.
