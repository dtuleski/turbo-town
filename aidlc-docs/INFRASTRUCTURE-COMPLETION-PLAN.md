# Infrastructure Completion Plan

## Current Status

**Completed** (15%):
- ✅ Project structure (infrastructure/ directory)
- ✅ Configuration files (package.json, tsconfig.json, cdk.json)
- ✅ Database Stack (8 DynamoDB tables with GSIs, TTL, encryption)
- ✅ Lambda Function construct (reusable)

**Remaining** (85%):
- ⏳ 6 more CDK stacks
- ⏳ 2 more reusable constructs
- ⏳ CDK app entry point
- ⏳ Deployment scripts

---

## What You Need to Deploy Auth & Game Services

To deploy the Auth Service and Game Service we just built, you need these AWS resources:

### 1. Cognito Stack (Auth Service)
```typescript
// infrastructure/lib/stacks/cognito-stack.ts
- Cognito User Pool
- User Pool Client
- Password policy (min 8 chars, uppercase, lowercase, number)
- Email verification
- MFA optional
```

### 2. API Gateway Stack (Both Services)
```typescript
// infrastructure/lib/stacks/api-stack.ts
- HTTP API Gateway
- Cognito JWT authorizer
- Routes:
  - POST /auth/graphql → Auth Lambda
  - POST /game/graphql → Game Lambda
- CORS configuration
- Throttling (200 req/s, 500 burst)
```

### 3. Lambda Stack (Both Services)
```typescript
// infrastructure/lib/stacks/lambda-stack.ts
- Auth Service Lambda
  - Code from services/auth/dist
  - Environment variables (Cognito, DynamoDB tables)
  - IAM permissions (Cognito, DynamoDB)
  
- Game Service Lambda
  - Code from services/game/dist
  - Environment variables (DynamoDB tables, EventBridge)
  - IAM permissions (DynamoDB, EventBridge, CloudWatch)
```

### 4. EventBridge Stack (Game Service)
```typescript
// infrastructure/lib/stacks/eventbridge-stack.ts
- Event Bus: MemoryGame-{env}
- Event rules for GameCompleted events
```

### 5. Monitoring Stack (Both Services)
```typescript
// infrastructure/lib/stacks/monitoring-stack.ts
- CloudWatch Alarms:
  - Lambda errors > 5%
  - Lambda duration > 500ms
  - DynamoDB throttling
- SNS topic for alerts
```

### 6. Main CDK App
```typescript
// infrastructure/bin/memory-game.ts
- Instantiate all stacks
- Pass dependencies between stacks
- Deploy to dev/staging/prod environments
```

---

## Quick Start: Manual Deployment (Alternative)

If you want to deploy immediately without waiting for all CDK stacks, you can:

### Option 1: AWS Console (Fastest)
1. **Create Cognito User Pool** manually
2. **Create DynamoDB tables** (already have CDK for this)
3. **Create Lambda functions** (upload zip files)
4. **Create API Gateway** manually
5. **Connect everything**

### Option 2: AWS CLI Scripts
I can generate shell scripts that use AWS CLI to create all resources.

### Option 3: Complete CDK (Recommended)
Continue generating all CDK stacks for proper infrastructure-as-code.

---

## Recommended Next Steps

**For Production-Ready Deployment**:
1. Complete remaining CDK stacks (6 stacks, ~2-3 hours)
2. Build services (`npm run build` in services/auth and services/game)
3. Deploy with CDK (`cdk deploy --all`)
4. Test endpoints

**For Quick Testing**:
1. I can generate AWS CLI deployment scripts now (~30 minutes)
2. You run the scripts to create resources
3. Test immediately
4. Later, migrate to CDK for proper IaC

---

## Files Needed for Complete CDK Deployment

### Stacks (6 files):
1. `infrastructure/lib/stacks/cognito-stack.ts` - User Pool
2. `infrastructure/lib/stacks/api-stack.ts` - API Gateway
3. `infrastructure/lib/stacks/lambda-stack.ts` - Lambda functions
4. `infrastructure/lib/stacks/eventbridge-stack.ts` - Event bus
5. `infrastructure/lib/stacks/monitoring-stack.ts` - CloudWatch alarms
6. `infrastructure/lib/stacks/storage-stack.ts` - S3 buckets (for future)

### App Entry Point (1 file):
7. `infrastructure/bin/memory-game.ts` - CDK app

### Constructs (2 files):
8. `infrastructure/lib/constructs/dynamodb-table.ts` - Reusable table construct
9. `infrastructure/lib/constructs/cloudwatch-alarm.ts` - Reusable alarm construct

### Deployment (2 files):
10. `infrastructure/scripts/deploy.sh` - Deployment script
11. `infrastructure/scripts/build-lambdas.sh` - Build Lambda packages

---

## Estimated Time

- **Complete CDK approach**: 2-3 hours to generate all files
- **AWS CLI scripts approach**: 30 minutes to generate scripts
- **Manual Console approach**: 1-2 hours of manual work

---

## What Would You Like to Do?

**A**: Continue generating all CDK stacks now (complete infrastructure-as-code)
**B**: Generate AWS CLI deployment scripts for quick testing
**C**: I'll deploy manually via Console, just give me the resource specifications

Choose your approach and I'll proceed accordingly!
