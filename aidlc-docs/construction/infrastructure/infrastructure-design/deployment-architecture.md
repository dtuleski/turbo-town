# Deployment Architecture - Infrastructure Unit

## Overview
This document defines the detailed deployment architecture specifications for the memory game application infrastructure using AWS CDK.

**IaC Tool**: AWS CDK (TypeScript)
**Deployment Model**: Multi-stack CDK application
**Environment Strategy**: Single account, multiple stacks per environment
**CI/CD**: GitHub Actions (recommended) or AWS CodePipeline

---

## CDK Project Structure

```
infrastructure/
├── bin/
│   └── app.ts                    # CDK app entry point
├── lib/
│   ├── stacks/
│   │   ├── database-stack.ts     # DynamoDB tables
│   │   ├── storage-stack.ts      # S3 buckets
│   │   ├── auth-stack.ts         # Cognito User Pool
│   │   ├── api-stack.ts          # API Gateway
│   │   ├── lambda-stack.ts       # Lambda functions
│   │   ├── cdn-stack.ts          # CloudFront distributions
│   │   └── monitoring-stack.ts   # CloudWatch alarms
│   ├── constructs/
│   │   ├── lambda-function.ts    # Reusable Lambda construct
│   │   ├── dynamodb-table.ts     # Reusable DynamoDB construct
│   │   └── cloudwatch-alarm.ts   # Reusable alarm construct
│   └── config/
│       ├── environment-config.ts # Environment configurations
│       └── constants.ts          # Shared constants
├── cdk.json                      # CDK configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript configuration
```

---

## Stack Architecture

### Stack Dependency Graph

```
Database Stack (no dependencies)
    ↓
Storage Stack (no dependencies)
    ↓
Auth Stack (no dependencies)
    ↓
API Stack (depends on Auth Stack)
    ↓
Lambda Stack (depends on Database, Auth, API)
    ↓
CDN Stack (depends on Storage)
    ↓
Monitoring Stack (depends on Lambda, API)
```

### Stack Definitions

#### 1. Database Stack
**Purpose**: Provision all DynamoDB tables
**Resources**:
- 8 DynamoDB tables with GSIs
- TTL configuration for RateLimits table
- PITR enabled for all tables

**Exports**:
- Table names (for Lambda environment variables)
- Table ARNs (for IAM permissions)

**CDK Code Structure**:
```typescript
export class DatabaseStack extends Stack {
  public readonly usersTable: dynamodb.Table;
  public readonly gamesTable: dynamodb.Table;
  public readonly leaderboardsTable: dynamodb.Table;
  public readonly subscriptionsTable: dynamodb.Table;
  public readonly themesTable: dynamodb.Table;
  public readonly achievementsTable: dynamodb.Table;
  public readonly rateLimitsTable: dynamodb.Table;
  public readonly userSettingsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);
    // Create tables...
  }
}
```


#### 2. Storage Stack
**Purpose**: Provision all S3 buckets
**Resources**:
- Theme Images bucket
- User Assets bucket
- Web Frontend bucket
- Bucket policies and CORS configurations

**Exports**:
- Bucket names (for Lambda environment variables)
- Bucket ARNs (for IAM permissions)

**CDK Code Structure**:
```typescript
export class StorageStack extends Stack {
  public readonly themeImagesBucket: s3.Bucket;
  public readonly userAssetsBucket: s3.Bucket;
  public readonly webFrontendBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);
    // Create buckets...
  }
}
```

#### 3. Auth Stack
**Purpose**: Provision Cognito User Pool
**Resources**:
- Cognito User Pool
- User Pool Client
- Lambda triggers (pre-signup, post-confirmation)

**Exports**:
- User Pool ID (for API Gateway authorizer)
- User Pool ARN (for IAM permissions)
- Client ID (for frontend authentication)

**CDK Code Structure**:
```typescript
export class AuthStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);
    // Create user pool...
  }
}
```

#### 4. API Stack
**Purpose**: Provision API Gateway
**Resources**:
- HTTP API (API Gateway v2)
- Cognito authorizer
- CORS configuration
- Throttling settings

**Exports**:
- API endpoint URL (for frontend configuration)
- API ID (for Lambda integrations)

**Dependencies**:
- Auth Stack (for Cognito authorizer)

**CDK Code Structure**:
```typescript
export class APIStack extends Stack {
  public readonly api: apigateway.HttpApi;
  public readonly authorizer: apigateway.HttpUserPoolAuthorizer;

  constructor(scope: Construct, id: string, props: APIStackProps) {
    super(scope, id, props);
    // Create API Gateway...
  }
}
```

#### 5. Lambda Stack
**Purpose**: Provision all Lambda functions
**Resources**:
- 6 Lambda functions (Auth, Game, Leaderboard, Payment, CMS, Admin)
- IAM execution roles
- Environment variables
- API Gateway integrations
- Dead letter queues

**Dependencies**:
- Database Stack (for table references)
- Auth Stack (for Cognito references)
- API Stack (for API integrations)

**CDK Code Structure**:
```typescript
export class LambdaStack extends Stack {
  public readonly authServiceLambda: lambda.Function;
  public readonly gameServiceLambda: lambda.Function;
  public readonly leaderboardServiceLambda: lambda.Function;
  public readonly paymentServiceLambda: lambda.Function;
  public readonly cmsServiceLambda: lambda.Function;
  public readonly adminServiceLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);
    // Create Lambda functions...
    // Grant permissions...
    // Add API integrations...
  }
}
```


#### 6. CDN Stack
**Purpose**: Provision CloudFront distributions
**Resources**:
- Web Frontend distribution
- Assets distribution
- Origin Access Identities
- Cache policies
- SSL certificates (ACM)

**Dependencies**:
- Storage Stack (for S3 origins)

**CDK Code Structure**:
```typescript
export class CDNStack extends Stack {
  public readonly webDistribution: cloudfront.Distribution;
  public readonly assetsDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CDNStackProps) {
    super(scope, id, props);
    // Create distributions...
  }
}
```

#### 7. Monitoring Stack
**Purpose**: Provision CloudWatch alarms and SNS topics
**Resources**:
- CloudWatch alarms (15+ alarms)
- SNS topics for notifications
- CloudWatch dashboards (optional)

**Dependencies**:
- Lambda Stack (for Lambda metrics)
- API Stack (for API Gateway metrics)

**CDK Code Structure**:
```typescript
export class MonitoringStack extends Stack {
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);
    // Create alarms...
  }
}
```

---

## Environment Configuration

### Environment Config Interface
```typescript
export interface EnvironmentConfig {
  environment: 'dev' | 'staging' | 'prod';
  
  // AWS Account
  account: string;
  region: string;
  
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
  customDomain?: {
    webApp: string;
    assets: string;
    certificateArn: string;
  };
  
  // Feature flags
  enableXRayTracing: boolean;
  enableDetailedMetrics: boolean;
}
```

### Dev Environment Config
```typescript
export const devConfig: EnvironmentConfig = {
  environment: 'dev',
  account: process.env.CDK_DEFAULT_ACCOUNT!,
  region: 'us-east-1',
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
  enableXRayTracing: false,
  enableDetailedMetrics: false,
};
```

### Staging Environment Config
```typescript
export const stagingConfig: EnvironmentConfig = {
  environment: 'staging',
  account: process.env.CDK_DEFAULT_ACCOUNT!,
  region: 'us-east-1',
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
  enableXRayTracing: true,
  enableDetailedMetrics: false,
};
```

### Prod Environment Config
```typescript
export const prodConfig: EnvironmentConfig = {
  environment: 'prod',
  account: process.env.CDK_DEFAULT_ACCOUNT!,
  region: 'us-east-1',
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
  customDomain: {
    webApp: 'app.memorygame.com',
    assets: 'assets.memorygame.com',
    certificateArn: 'arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID',
  },
  enableXRayTracing: true,
  enableDetailedMetrics: true,
};
```

---

## CDK App Entry Point

### bin/app.ts
```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { StorageStack } from '../lib/stacks/storage-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { APIStack } from '../lib/stacks/api-stack';
import { LambdaStack } from '../lib/stacks/lambda-stack';
import { CDNStack } from '../lib/stacks/cdn-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';
import { devConfig, stagingConfig, prodConfig } from '../lib/config/environment-config';

const app = new cdk.App();

// Get environment from context
const environmentName = app.node.tryGetContext('environment') || 'dev';
const config = {
  dev: devConfig,
  staging: stagingConfig,
  prod: prodConfig,
}[environmentName];

if (!config) {
  throw new Error(`Invalid environment: ${environmentName}`);
}

// Stack naming convention: MemoryGame{StackName}{Environment}
const stackPrefix = `MemoryGame${config.environment.charAt(0).toUpperCase() + config.environment.slice(1)}`;

// 1. Database Stack
const databaseStack = new DatabaseStack(app, `${stackPrefix}Database`, {
  env: { account: config.account, region: config.region },
  config,
});

// 2. Storage Stack
const storageStack = new StorageStack(app, `${stackPrefix}Storage`, {
  env: { account: config.account, region: config.region },
  config,
});

// 3. Auth Stack
const authStack = new AuthStack(app, `${stackPrefix}Auth`, {
  env: { account: config.account, region: config.region },
  config,
});

// 4. API Stack
const apiStack = new APIStack(app, `${stackPrefix}API`, {
  env: { account: config.account, region: config.region },
  config,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});

// 5. Lambda Stack
const lambdaStack = new LambdaStack(app, `${stackPrefix}Lambda`, {
  env: { account: config.account, region: config.region },
  config,
  tables: {
    users: databaseStack.usersTable,
    games: databaseStack.gamesTable,
    leaderboards: databaseStack.leaderboardsTable,
    subscriptions: databaseStack.subscriptionsTable,
    themes: databaseStack.themesTable,
    achievements: databaseStack.achievementsTable,
    rateLimits: databaseStack.rateLimitsTable,
    userSettings: databaseStack.userSettingsTable,
  },
  userPool: authStack.userPool,
  api: apiStack.api,
  buckets: {
    themeImages: storageStack.themeImagesBucket,
    userAssets: storageStack.userAssetsBucket,
  },
});

// 6. CDN Stack
const cdnStack = new CDNStack(app, `${stackPrefix}CDN`, {
  env: { account: config.account, region: config.region },
  config,
  buckets: {
    webFrontend: storageStack.webFrontendBucket,
    themeImages: storageStack.themeImagesBucket,
    userAssets: storageStack.userAssetsBucket,
  },
});

// 7. Monitoring Stack
const monitoringStack = new MonitoringStack(app, `${stackPrefix}Monitoring`, {
  env: { account: config.account, region: config.region },
  config,
  lambdaFunctions: {
    auth: lambdaStack.authServiceLambda,
    game: lambdaStack.gameServiceLambda,
    leaderboard: lambdaStack.leaderboardServiceLambda,
    payment: lambdaStack.paymentServiceLambda,
    cms: lambdaStack.cmsServiceLambda,
    admin: lambdaStack.adminServiceLambda,
  },
  api: apiStack.api,
  tables: {
    users: databaseStack.usersTable,
    games: databaseStack.gamesTable,
    leaderboards: databaseStack.leaderboardsTable,
    subscriptions: databaseStack.subscriptionsTable,
    themes: databaseStack.themesTable,
  },
});

app.synth();
```

---

## Deployment Procedures

### Initial Deployment (First Time)

#### Prerequisites
1. AWS CLI configured with appropriate credentials
2. Node.js 20.x installed
3. AWS CDK CLI installed (`npm install -g aws-cdk`)
4. Stripe API keys stored in Secrets Manager

#### Bootstrap CDK (One-Time)
```bash
# Bootstrap CDK in target account/region
cdk bootstrap aws://ACCOUNT-NUMBER/us-east-1
```

#### Deploy All Stacks
```bash
# Navigate to infrastructure directory
cd infrastructure

# Install dependencies
npm install

# Deploy to dev environment
cdk deploy --all --context environment=dev

# Deploy to staging environment
cdk deploy --all --context environment=staging

# Deploy to prod environment (requires approval)
cdk deploy --all --context environment=prod --require-approval broadening
```

### Incremental Deployment (Updates)

#### Deploy Specific Stack
```bash
# Deploy only Database stack
cdk deploy MemoryGameDevDatabase --context environment=dev

# Deploy only Lambda stack
cdk deploy MemoryGameDevLambda --context environment=dev
```

#### Deploy Multiple Stacks
```bash
# Deploy Database and Lambda stacks
cdk deploy MemoryGameDevDatabase MemoryGameDevLambda --context environment=dev
```

### Rollback Procedures

#### CloudFormation Automatic Rollback
- CloudFormation automatically rolls back on deployment failure
- Stack returns to previous stable state
- No manual intervention required for infrastructure

#### Manual Rollback (Code Changes)
```bash
# Checkout previous commit
git checkout <previous-commit-hash>

# Redeploy stacks
cdk deploy --all --context environment=prod
```

#### Lambda Function Rollback
```bash
# Use Lambda versions and aliases for blue/green deployment
# Rollback by updating alias to previous version
aws lambda update-alias \
  --function-name memory-game-auth-prod \
  --name prod \
  --function-version <previous-version>
```

---

## CI/CD Pipeline Architecture

### GitHub Actions Pipeline (Recommended)

#### Workflow Structure
```yaml
# .github/workflows/deploy-infrastructure.yml
name: Deploy Infrastructure

on:
  push:
    branches:
      - main
      - staging
      - develop
    paths:
      - 'infrastructure/**'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - dev
          - staging
          - prod

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd infrastructure
          npm ci
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: CDK Synth
        run: |
          cd infrastructure
          npx cdk synth --context environment=${{ inputs.environment || 'dev' }}
      
      - name: CDK Deploy
        run: |
          cd infrastructure
          npx cdk deploy --all \
            --context environment=${{ inputs.environment || 'dev' }} \
            --require-approval never
```

#### Environment-Specific Workflows
- **develop branch** → Auto-deploy to dev
- **staging branch** → Auto-deploy to staging
- **main branch** → Manual approval → Deploy to prod

### AWS CodePipeline (Alternative)

#### Pipeline Stages
1. **Source Stage**: CodeCommit or GitHub
2. **Build Stage**: CodeBuild (CDK synth)
3. **Deploy to Dev**: CDK deploy (automatic)
4. **Deploy to Staging**: CDK deploy (automatic)
5. **Manual Approval**: Human approval gate
6. **Deploy to Prod**: CDK deploy (after approval)

---

## Stack Outputs

### Database Stack Outputs
```typescript
new cdk.CfnOutput(this, 'UsersTableName', {
  value: this.usersTable.tableName,
  exportName: `${stackPrefix}-UsersTableName`,
});

new cdk.CfnOutput(this, 'GamesTableName', {
  value: this.gamesTable.tableName,
  exportName: `${stackPrefix}-GamesTableName`,
});

// ... outputs for all tables
```

### API Stack Outputs
```typescript
new cdk.CfnOutput(this, 'ApiEndpoint', {
  value: this.api.apiEndpoint,
  exportName: `${stackPrefix}-ApiEndpoint`,
});

new cdk.CfnOutput(this, 'ApiId', {
  value: this.api.apiId,
  exportName: `${stackPrefix}-ApiId`,
});
```

### Auth Stack Outputs
```typescript
new cdk.CfnOutput(this, 'UserPoolId', {
  value: this.userPool.userPoolId,
  exportName: `${stackPrefix}-UserPoolId`,
});

new cdk.CfnOutput(this, 'UserPoolClientId', {
  value: this.userPoolClient.userPoolClientId,
  exportName: `${stackPrefix}-UserPoolClientId`,
});
```

### CDN Stack Outputs
```typescript
new cdk.CfnOutput(this, 'WebDistributionDomain', {
  value: this.webDistribution.distributionDomainName,
  exportName: `${stackPrefix}-WebDistributionDomain`,
});

new cdk.CfnOutput(this, 'AssetsDistributionDomain', {
  value: this.assetsDistribution.distributionDomainName,
  exportName: `${stackPrefix}-AssetsDistributionDomain`,
});
```

---

## Cross-Stack References

### Automatic Cross-Stack References
CDK automatically handles cross-stack references using CloudFormation exports:

```typescript
// In Lambda Stack
constructor(scope: Construct, id: string, props: LambdaStackProps) {
  super(scope, id, props);
  
  // Reference table from Database Stack
  const usersTable = props.tables.users;
  
  // CDK automatically creates CloudFormation export/import
  const lambda = new lambda.Function(this, 'AuthService', {
    environment: {
      USERS_TABLE_NAME: usersTable.tableName, // Cross-stack reference
    },
  });
  
  // Grant permissions (cross-stack)
  usersTable.grantReadWriteData(lambda);
}
```

### Manual Cross-Stack References (If Needed)
```typescript
// Import from CloudFormation export
const usersTableName = cdk.Fn.importValue('MemoryGameDev-UsersTableName');
```

---

## Deployment Order and Dependencies

### Deployment Sequence
1. **Database Stack** (5-10 minutes)
   - Creates 8 DynamoDB tables
   - No dependencies

2. **Storage Stack** (2-5 minutes)
   - Creates 3 S3 buckets
   - No dependencies

3. **Auth Stack** (3-5 minutes)
   - Creates Cognito User Pool
   - No dependencies

4. **API Stack** (2-3 minutes)
   - Creates API Gateway
   - Depends on Auth Stack

5. **Lambda Stack** (10-15 minutes)
   - Creates 6 Lambda functions
   - Depends on Database, Auth, API stacks

6. **CDN Stack** (15-20 minutes)
   - Creates 2 CloudFront distributions
   - Depends on Storage Stack
   - Longest deployment time

7. **Monitoring Stack** (5-10 minutes)
   - Creates CloudWatch alarms
   - Depends on Lambda, API stacks

**Total Deployment Time**: 40-70 minutes (first deployment)
**Incremental Updates**: 5-20 minutes (depending on stack)

### Parallel Deployment
Some stacks can be deployed in parallel:
- Database, Storage, Auth stacks (no dependencies)
- API and CDN stacks (different dependencies)

```bash
# Deploy independent stacks in parallel
cdk deploy MemoryGameDevDatabase MemoryGameDevStorage MemoryGameDevAuth --concurrency 3
```

---

## Stack Deletion and Cleanup

### Delete All Stacks
```bash
# Delete all stacks (reverse order)
cdk destroy --all --context environment=dev

# Force delete without confirmation
cdk destroy --all --context environment=dev --force
```

### Delete Specific Stack
```bash
# Delete only Monitoring stack
cdk destroy MemoryGameDevMonitoring --context environment=dev
```

### Deletion Order (Reverse of Deployment)
1. Monitoring Stack
2. CDN Stack
3. Lambda Stack
4. API Stack
5. Auth Stack
6. Storage Stack
7. Database Stack

### Retained Resources
Some resources are retained after stack deletion (RemovalPolicy.RETAIN):
- DynamoDB tables (data preservation)
- S3 buckets (data preservation)
- Cognito User Pool (user data preservation)

**Manual Cleanup Required**:
```bash
# Delete DynamoDB tables
aws dynamodb delete-table --table-name memory-game-users-dev

# Empty and delete S3 buckets
aws s3 rm s3://memory-game-theme-images-dev --recursive
aws s3 rb s3://memory-game-theme-images-dev

# Delete Cognito User Pool
aws cognito-idp delete-user-pool --user-pool-id <pool-id>
```

---

## Disaster Recovery Procedures

### Backup Strategy
- **DynamoDB**: Point-in-time recovery (PITR) enabled
  - Continuous backups every 5 minutes
  - 35-day retention
  - Restore to any point in time

- **S3**: Versioning enabled
  - All object versions retained
  - Restore previous versions manually

- **Infrastructure**: Version controlled in Git
  - All CDK code in Git repository
  - Redeploy from any commit

### Recovery Procedures

#### Scenario 1: DynamoDB Table Corruption
```bash
# Restore table from PITR
aws dynamodb restore-table-to-point-in-time \
  --source-table-name memory-game-users-prod \
  --target-table-name memory-game-users-prod-restored \
  --restore-date-time 2026-03-03T12:00:00Z

# Update Lambda environment variables to use restored table
# Or rename restored table to original name
```

#### Scenario 2: S3 Bucket Data Loss
```bash
# List object versions
aws s3api list-object-versions \
  --bucket memory-game-theme-images-prod

# Restore specific object version
aws s3api copy-object \
  --copy-source memory-game-theme-images-prod/theme1.jpg?versionId=VERSION_ID \
  --bucket memory-game-theme-images-prod \
  --key theme1.jpg
```

#### Scenario 3: Complete Infrastructure Loss
```bash
# Checkout last known good commit
git checkout <last-good-commit>

# Redeploy all stacks
cdk deploy --all --context environment=prod

# Restore DynamoDB tables from PITR
# Restore S3 objects from versions
```

### Recovery Time Objectives (RTO)
- **Database Restore**: 1-2 hours (PITR restore time)
- **S3 Restore**: 30 minutes (manual object restoration)
- **Infrastructure Redeploy**: 1-2 hours (full stack deployment)
- **Total RTO**: 4 hours (worst case)

### Recovery Point Objectives (RPO)
- **DynamoDB**: 5 minutes (PITR granularity)
- **S3**: 0 minutes (versioning captures all changes)
- **Infrastructure**: 0 minutes (Git version control)
- **Total RPO**: 1 hour (conservative estimate)

---

## Cost Optimization Strategies

### Development Environment
- Use smaller Lambda memory sizes (256 MB)
- Reduce log retention (3 days)
- Disable X-Ray tracing
- Use lower API Gateway throttle limits

### Staging Environment
- Match production configuration
- Use for load testing and validation
- Keep costs similar to production

### Production Environment
- Right-size Lambda memory based on monitoring
- Enable Reserved Capacity if traffic is predictable
- Use S3 Intelligent-Tiering
- Optimize CloudFront cache hit ratio

### Cost Monitoring
```typescript
// Add budget alarms
const budget = new budgets.CfnBudget(this, 'MonthlyBudget', {
  budget: {
    budgetName: `memory-game-${environment}-budget`,
    budgetLimit: {
      amount: 200, // $200/month
      unit: 'USD',
    },
    timeUnit: 'MONTHLY',
    budgetType: 'COST',
  },
  notificationsWithSubscribers: [
    {
      notification: {
        notificationType: 'ACTUAL',
        comparisonOperator: 'GREATER_THAN',
        threshold: 80, // Alert at 80%
      },
      subscribers: [
        {
          subscriptionType: 'EMAIL',
          address: 'ops@example.com',
        },
      ],
    },
  ],
});
```

---

## Security Best Practices

### Secrets Management
- Store all API keys in Secrets Manager
- Never commit secrets to Git
- Rotate secrets regularly
- Use IAM roles for Lambda access

### IAM Policies
- Follow least privilege principle
- Use resource-specific permissions
- Avoid wildcard permissions
- Regular IAM policy audits

### Network Security
- HTTPS only for all traffic
- Block public S3 access
- Use CloudFront for S3 access
- Enable AWS Shield Standard (automatic)

### Monitoring and Auditing
- Enable CloudTrail for API auditing
- Monitor CloudWatch alarms
- Regular security reviews
- Automated vulnerability scanning

---

## Deployment Architecture Summary

**CDK Project Structure**: 7 independent stacks with clear dependencies
**Deployment Order**: Database → Storage → Auth → API → Lambda → CDN → Monitoring
**Deployment Time**: 40-70 minutes (initial), 5-20 minutes (updates)
**Environment Strategy**: Single account, multiple stacks per environment
**CI/CD**: GitHub Actions or AWS CodePipeline
**Rollback**: Automatic CloudFormation rollback + manual Git revert
**Disaster Recovery**: PITR for DynamoDB, versioning for S3, Git for infrastructure
**Cost Optimization**: Environment-specific configurations, monitoring, budgets
**Security**: Secrets Manager, least privilege IAM, HTTPS only, CloudTrail

**Next Step**: Generate AWS CDK TypeScript code implementing this architecture.

