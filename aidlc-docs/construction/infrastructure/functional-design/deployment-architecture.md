# Deployment Architecture - Infrastructure

## Overview
This document defines the deployment architecture for the memory game application infrastructure using AWS CDK (TypeScript).

**IaC Tool**: AWS CDK (TypeScript)
**Environment Strategy**: Single account, multiple stacks
**Deployment Model**: Independent microservices with shared infrastructure

---

## Stack Organization

### Multi-Stack Architecture
The infrastructure is organized into multiple CDK stacks for better modularity and deployment control:

1. **Database Stack** (`MemoryGameDatabaseStack`)
   - All DynamoDB tables
   - Table configurations and indexes
   - Outputs: Table names and ARNs

2. **Storage Stack** (`MemoryGameStorageStack`)
   - S3 buckets (theme images, user assets, web frontend)
   - Bucket policies and CORS configurations
   - Outputs: Bucket names and ARNs

3. **Auth Stack** (`MemoryGameAuthStack`)
   - Cognito User Pool
   - User Pool Client
   - Lambda triggers
   - Outputs: User Pool ID, Client ID

4. **API Stack** (`MemoryGameAPIStack`)
   - API Gateway (HTTP API)
   - Authorizer configuration
   - CORS and throttling settings
   - Outputs: API endpoint URL

5. **Lambda Stack** (`MemoryGameLambdaStack`)
   - All Lambda functions (6 services)
   - IAM roles and policies
   - Environment variables
   - API Gateway integrations
   - Depends on: Database, Auth, API stacks

6. **CDN Stack** (`MemoryGameCDNStack`)
   - CloudFront distributions (web frontend, assets)
   - Origin Access Identity
   - SSL certificates
   - Depends on: Storage stack

7. **Monitoring Stack** (`MemoryGameMonitoringStack`)
   - CloudWatch Log Groups
   - CloudWatch Alarms
   - SNS topics for notifications
   - Depends on: Lambda, API stacks

---

## Environment Configuration

### Environment-Specific Parameters
Each environment (dev, staging, prod) has its own configuration:

```typescript
interface EnvironmentConfig {
  environment: 'dev' | 'staging' | 'prod';
  
  // API Gateway
  apiThrottleBurst: number;
  apiThrottleRate: number;
  
  // Lambda
  lambdaMemorySizes: {
    auth: number;
    game: number;
    leaderboard: number;
    payment: number;
    cms: number;
    admin: number;
  };
  
  // CloudWatch
  logRetentionDays: number;
  alarmEmailRecipients: string[];
  
  // Domain (optional)
  customDomain?: string;
  certificateArn?: string;
}
```

### Dev Environment
```typescript
{
  environment: 'dev',
  apiThrottleBurst: 1000,
  apiThrottleRate: 500,
  lambdaMemorySizes: {
    auth: 512,
    game: 512,
    leaderboard: 256,
    payment: 512,
    cms: 512,
    admin: 512,
  },
  logRetentionDays: 7,
  alarmEmailRecipients: ['dev-team@example.com'],
}
```

### Staging Environment
```typescript
{
  environment: 'staging',
  apiThrottleBurst: 5000,
  apiThrottleRate: 2500,
  lambdaMemorySizes: {
    auth: 512,
    game: 512,
    leaderboard: 256,
    payment: 512,
    cms: 512,
    admin: 512,
  },
  logRetentionDays: 14,
  alarmEmailRecipients: ['staging-team@example.com'],
}
```

### Prod Environment
```typescript
{
  environment: 'prod',
  apiThrottleBurst: 10000,
  apiThrottleRate: 5000,
  lambdaMemorySizes: {
    auth: 512,
    game: 512,
    leaderboard: 256,
    payment: 512,
    cms: 512,
    admin: 512,
  },
  logRetentionDays: 30,
  alarmEmailRecipients: ['ops-team@example.com', 'alerts@example.com'],
  customDomain: 'app.memorygame.com',
  certificateArn: 'arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID',
}
```

---

## Resource Dependencies

### Deployment Order
1. **Database Stack** (no dependencies)
2. **Storage Stack** (no dependencies)
3. **Auth Stack** (no dependencies)
4. **API Stack** (depends on Auth Stack for authorizer)
5. **Lambda Stack** (depends on Database, Auth, API stacks)
6. **CDN Stack** (depends on Storage Stack)
7. **Monitoring Stack** (depends on Lambda, API stacks)

### Cross-Stack References
CDK automatically handles cross-stack references using CloudFormation exports:

```typescript
// Database Stack exports
export const usersTableName = usersTable.tableName;
export const usersTableArn = usersTable.tableArn;

// Lambda Stack imports
import { usersTableName, usersTableArn } from './database-stack';
```

---

## Deployment Pipeline

### Manual Deployment (Development)
```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy all stacks to dev
cdk deploy --all --context environment=dev

# Deploy specific stack
cdk deploy MemoryGameDatabaseStack --context environment=dev

# Destroy all stacks
cdk destroy --all --context environment=dev
```

### CI/CD Pipeline (Staging/Production)
Recommended pipeline using GitHub Actions or AWS CodePipeline:

1. **Build Stage**
   - Install dependencies
   - Run CDK synth
   - Run tests (if any)

2. **Deploy to Staging**
   - Deploy all stacks to staging environment
   - Run smoke tests
   - Manual approval gate

3. **Deploy to Production**
   - Deploy all stacks to production environment
   - Run smoke tests
   - Monitor for errors

---

## Rollback Strategy

### Stack-Level Rollback
CDK/CloudFormation automatically rolls back on deployment failure:
- Failed stack returns to previous stable state
- Dependent stacks are not affected
- Manual intervention may be required for data migrations

### Application-Level Rollback
For Lambda function updates:
- Use Lambda versions and aliases
- Implement blue/green deployment
- Gradual traffic shifting with CodeDeploy

---

## Security Considerations

### Least Privilege IAM Policies
Each Lambda function has minimal permissions:
```typescript
// Example: Game Service Lambda
gameServiceLambda.addToRolePolicy(new PolicyStatement({
  actions: [
    'dynamodb:GetItem',
    'dynamodb:PutItem',
    'dynamodb:UpdateItem',
    'dynamodb:Query',
  ],
  resources: [
    gamesTable.tableArn,
    rateLimitsTable.tableArn,
    achievementsTable.tableArn,
  ],
}));
```

### Encryption
- **DynamoDB**: Encryption at rest (AWS managed keys)
- **S3**: Server-side encryption (AES-256)
- **CloudFront**: HTTPS only (TLS 1.2+)
- **API Gateway**: HTTPS only
- **Cognito**: Encrypted user data

### Network Security
- **API Gateway**: Throttling and rate limiting
- **CloudFront**: AWS Shield Standard (DDoS protection)
- **S3**: Bucket policies restrict access to CloudFront only
- **Lambda**: No VPC (uses AWS PrivateLink for service access)

---

## Monitoring and Observability

### CloudWatch Dashboards
Create custom dashboards for each environment:
- API Gateway metrics (requests, latency, errors)
- Lambda metrics (invocations, duration, errors)
- DynamoDB metrics (read/write capacity, throttles)
- Custom business metrics (games played, user registrations)

### Alarms and Notifications
SNS topics for alarm notifications:
- **Critical**: Lambda errors, API 5xx errors, DynamoDB throttles
- **Warning**: High latency, approaching Lambda timeout
- **Info**: Deployment notifications, scaling events

### Distributed Tracing
Enable AWS X-Ray for Lambda functions:
- Trace requests across services
- Identify performance bottlenecks
- Debug errors in production

---

## Cost Optimization

### On-Demand Pricing
- DynamoDB on-demand: Pay per request (no idle costs)
- Lambda: Pay per invocation and duration
- API Gateway: Pay per request

### Reserved Capacity (Future)
If traffic becomes predictable:
- DynamoDB provisioned capacity with auto-scaling
- CloudFront reserved capacity
- Savings Plans for Lambda

### Cost Monitoring
- Enable AWS Cost Explorer
- Set up billing alarms
- Tag resources by environment and service

---

## Disaster Recovery

### Backup Strategy
- **DynamoDB**: Point-in-time recovery (PITR) enabled
- **S3**: Versioning enabled for critical buckets
- **CloudFormation**: Stack templates stored in version control

### Recovery Objectives
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 1 hour (DynamoDB PITR)

### Recovery Procedures
1. Restore DynamoDB tables from PITR
2. Redeploy CloudFormation stacks from version control
3. Restore S3 objects from versioning
4. Update DNS records (if needed)

---

## Deployment Architecture Summary

**Stack Organization**: 7 independent CDK stacks
**Environment Strategy**: Single account, multiple stacks (dev, staging, prod)
**Deployment Order**: Database → Storage → Auth → API → Lambda → CDN → Monitoring
**Security**: Least privilege IAM, encryption at rest and in transit, HTTPS only
**Monitoring**: CloudWatch Logs, Alarms, Dashboards, X-Ray tracing
**Cost**: On-demand pricing, ~$30-110/month for low traffic
**DR**: PITR for DynamoDB, S3 versioning, 4-hour RTO, 1-hour RPO
