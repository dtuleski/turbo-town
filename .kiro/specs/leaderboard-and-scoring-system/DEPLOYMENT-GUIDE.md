# Leaderboard System Deployment Guide

## Overview

This guide walks you through deploying the leaderboard system to dev.dashden.app for testing.

## Prerequisites

- AWS CLI configured with appropriate credentials
- AWS CDK installed (`npm install -g aws-cdk`)
- Node.js 18+ and npm installed
- Access to the DashDen AWS account
- Vercel CLI installed (for frontend deployment)

## Deployment Steps

### Step 1: Deploy Backend Infrastructure

#### 1.1 Deploy DynamoDB Tables

```bash
cd infrastructure

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy Database Stack
cdk deploy DatabaseStack --require-approval never

# Verify tables created
aws dynamodb list-tables | grep -E "LeaderboardEntries|UserAggregates|RateLimitBuckets"
```

**Expected Output**:
- LeaderboardEntries-dev
- UserAggregates-dev
- RateLimitBuckets-dev

#### 1.2 Deploy EventBridge

```bash
# Deploy EventBridge Stack
cdk deploy EventBridgeStack --require-approval never

# Verify event bus created
aws events list-event-buses | grep game-events
```

**Expected Output**:
- game-events event bus
- LeaderboardDLQ queue

#### 1.3 Deploy Leaderboard Lambda

```bash
# Build Leaderboard Service
cd ../services/leaderboard
npm install
npm run build

# Return to infrastructure
cd ../../infrastructure

# Deploy Leaderboard Lambda Stack
cdk deploy LeaderboardLambdaStack --require-approval never

# Verify Lambda created
aws lambda get-function --function-name MemoryGame-LeaderboardService-dev
```

**Expected Output**:
- Lambda function created
- EventBridge rule created (GameCompleted-to-Leaderboard)
- CloudWatch log group created

#### 1.4 Update API Gateway

The API Gateway needs to be updated to include the leaderboard route.

```bash
# Check if ApiStack needs leaderboard lambda reference
# You may need to update the main CDK app to pass leaderboard lambda to ApiStack

# Deploy API Stack
cdk deploy ApiStack --require-approval never

# Get API endpoints
aws cloudformation describe-stacks \
  --stack-name ApiStack \
  --query 'Stacks[0].Outputs' \
  --output table
```

**Expected Outputs**:
- ApiUrl
- AuthEndpoint
- GameEndpoint
- LeaderboardEndpoint (NEW)

**Note**: If ApiStack doesn't have leaderboard integration yet, you'll need to update the main CDK app:

```typescript
// infrastructure/bin/infrastructure.ts or similar
const leaderboardLambdaStack = new LeaderboardLambdaStack(app, 'LeaderboardLambdaStack', {
  // ... props
});

const apiStack = new ApiStack(app, 'ApiStack', {
  authLambda: authLambdaStack.authFunction,
  gameLambda: gameLambdaStack.gameFunction,
  leaderboardLambda: leaderboardLambdaStack.leaderboardFunction, // ADD THIS
  userPool: cognitoStack.userPool,
  userPoolClient: cognitoStack.userPoolClient,
});
```

### Step 2: Update Game Service

The Game Service needs to publish events to EventBridge.

```bash
cd services/game

# Ensure event publishing code is present
# (Already implemented in Phase 3)

# Build and deploy
npm install
npm run build

# Deploy to Lambda (if using CDK)
cd ../../infrastructure
cdk deploy GameLambdaStack --require-approval never

# OR if using manual deployment
cd ../services/game
./deploy-lambda.sh
```

**Verify Event Publishing**:
```bash
# Check Game Service has EVENT_BUS_NAME environment variable
aws lambda get-function-configuration \
  --function-name MemoryGame-GameService-dev \
  --query 'Environment.Variables.EVENT_BUS_NAME'

# Should return: "game-events"
```

### Step 3: Deploy Frontend to Vercel

#### 3.1 Update Environment Variables

```bash
cd apps/web

# Get API endpoints from CloudFormation
export API_URL=$(aws cloudformation describe-stacks \
  --stack-name ApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

export LEADERBOARD_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name ApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`LeaderboardEndpoint`].OutputValue' \
  --output text)

echo "API URL: $API_URL"
echo "Leaderboard Endpoint: $LEADERBOARD_ENDPOINT"
```

#### 3.2 Set Vercel Environment Variables

```bash
# Install Vercel CLI if not installed
npm install -g vercel

# Login to Vercel
vercel login

# Link to project
vercel link

# Set environment variables
vercel env add VITE_LEADERBOARD_ENDPOINT production
# Paste the leaderboard endpoint when prompted

# Or use the Vercel dashboard:
# 1. Go to https://vercel.com/your-team/dashden
# 2. Settings → Environment Variables
# 3. Add: VITE_LEADERBOARD_ENDPOINT = your-leaderboard-endpoint
```

#### 3.3 Deploy to Vercel

```bash
# Build locally to test
npm install
npm run build

# Deploy to production (dev.dashden.app)
vercel --prod

# Or push to main branch (if auto-deploy is configured)
git add .
git commit -m "feat: add leaderboard system"
git push origin main
```

**Verify Deployment**:
- Visit https://dev.dashden.app
- Check that the site loads
- Open browser console for any errors

### Step 4: Verify End-to-End Flow

#### 4.1 Test Event Flow

```bash
# Create test event
cat > test-event.json << 'EOF'
{
  "gameId": "test-123",
  "userId": "test-user-456",
  "userName": "TestUser",
  "themeId": "ANIMALS",
  "difficulty": 3,
  "score": 850,
  "completionTime": 45,
  "attempts": 12,
  "completedAt": "2024-03-11T12:00:00Z"
}
EOF

# Publish to EventBridge
aws events put-events \
  --entries '[{
    "Source": "game-service",
    "DetailType": "GameCompleted",
    "Detail": "'"$(cat test-event.json)"'",
    "EventBusName": "game-events"
  }]'

# Check Leaderboard Service logs
aws logs tail /aws/lambda/MemoryGame-LeaderboardService-dev --follow
```

#### 4.2 Test API Endpoints

```bash
# Get a JWT token by logging in to dev.dashden.app
# Open browser console and run: localStorage.getItem('auth_token')

export JWT_TOKEN="your-jwt-token-here"

# Test getLeaderboard
curl -X POST "$LEADERBOARD_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "query": "query { getLeaderboard(gameType: OVERALL, timeframe: ALL_TIME, limit: 10) { entries { rank username score } totalEntries } }"
  }' | jq
```

#### 4.3 Test Frontend

1. **Navigate to dev.dashden.app**
2. **Log in** with test credentials
3. **Go to Game Hub** - Verify Dashboard and Leaderboard buttons appear
4. **Click Leaderboard** button
5. **Verify**:
   - [ ] Leaderboard page loads
   - [ ] Timeframe selector works
   - [ ] Game type filter works
   - [ ] Table displays (may be empty initially)
6. **Play a game**:
   - [ ] Complete Memory Match game
   - [ ] Score breakdown modal appears
   - [ ] Leaderboard rank shows (if ranked)
7. **Check Dashboard**:
   - [ ] Navigate to Dashboard
   - [ ] Verify "Your Performance" widgets display
   - [ ] Check rank widget shows data

### Step 5: Monitoring Setup

#### 5.1 Create CloudWatch Dashboard

```bash
# Create dashboard configuration
cat > cloudwatch-dashboard.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum", "label": "Leaderboard Invocations"}],
          [".", "Errors", {"stat": "Sum", "label": "Leaderboard Errors"}],
          [".", "Duration", {"stat": "Average", "label": "Leaderboard Duration"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Leaderboard Service Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", {"stat": "Sum"}],
          [".", "ConsumedWriteCapacityUnits", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "DynamoDB Capacity"
      }
    }
  ]
}
EOF

# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name LeaderboardMetrics \
  --dashboard-body file://cloudwatch-dashboard.json
```

#### 5.2 Set Up Alarms

```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name LeaderboardHighErrorRate \
  --alarm-description "Alert when leaderboard error rate > 1%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# High latency alarm
aws cloudwatch put-metric-alarm \
  --alarm-name LeaderboardHighLatency \
  --alarm-description "Alert when p99 latency > 500ms" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic p99 \
  --period 300 \
  --threshold 500 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### Step 6: Post-Deployment Verification

#### Checklist

- [ ] All CDK stacks deployed successfully
- [ ] DynamoDB tables exist and are active
- [ ] EventBridge event bus and rules configured
- [ ] Lambda functions deployed and running
- [ ] API Gateway endpoints responding
- [ ] Frontend deployed to dev.dashden.app
- [ ] Environment variables configured
- [ ] Leaderboard page loads without errors
- [ ] Dashboard widgets display
- [ ] Game completion triggers events
- [ ] Events processed by Leaderboard Service
- [ ] Data stored in DynamoDB
- [ ] CloudWatch dashboard created
- [ ] Alarms configured

#### Smoke Test

```bash
# Run automated smoke test
./test-leaderboard.sh
# Choose option 4 (End-to-End API Test)
```

## Rollback Procedure

If something goes wrong:

### Rollback Backend

```bash
cd infrastructure

# Rollback specific stack
cdk destroy LeaderboardLambdaStack

# Or rollback all leaderboard-related stacks
cdk destroy LeaderboardLambdaStack EventBridgeStack DatabaseStack
```

### Rollback Frontend

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy previous commit
git revert HEAD
git push origin main
```

## Troubleshooting

### Issue: Lambda function not receiving events

**Check**:
```bash
# Verify EventBridge rule
aws events list-rules --event-bus-name game-events

# Check rule targets
aws events list-targets-by-rule \
  --rule GameCompleted-to-Leaderboard-dev \
  --event-bus-name game-events

# Test rule manually
aws events put-events --entries file://test-event.json
```

### Issue: API Gateway returns 403

**Check**:
```bash
# Verify Cognito authorizer
aws apigatewayv2 get-authorizers --api-id YOUR_API_ID

# Check JWT token is valid
# Decode token at jwt.io
```

### Issue: Frontend can't connect to API

**Check**:
```bash
# Verify environment variables
vercel env ls

# Check CORS configuration
curl -I -X OPTIONS "$LEADERBOARD_ENDPOINT" \
  -H "Origin: https://dev.dashden.app"
```

### Issue: DynamoDB throttling

**Check**:
```bash
# Check table metrics
aws dynamodb describe-table --table-name LeaderboardEntries-dev

# Increase capacity if needed
aws dynamodb update-table \
  --table-name LeaderboardEntries-dev \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10
```

## Environment-Specific Configuration

### Development (dev.dashden.app)

- **Environment**: dev
- **AWS Region**: us-east-1
- **DynamoDB**: On-demand billing
- **Lambda**: 512MB memory, 30s timeout
- **API Gateway**: Throttling 200 req/s

### Production (dashden.app)

- **Environment**: prod
- **AWS Region**: us-east-1
- **DynamoDB**: Provisioned capacity with auto-scaling
- **Lambda**: 1024MB memory, 30s timeout
- **API Gateway**: Throttling 500 req/s
- **CloudFront**: CDN enabled

## Cost Estimation

### Development Environment

- **DynamoDB**: ~$5/month (on-demand)
- **Lambda**: ~$2/month (1M requests)
- **API Gateway**: ~$3.50/month (1M requests)
- **CloudWatch**: ~$1/month (logs + metrics)
- **Total**: ~$11.50/month

### Production Environment

- **DynamoDB**: ~$25/month (provisioned + auto-scaling)
- **Lambda**: ~$10/month (5M requests)
- **API Gateway**: ~$17.50/month (5M requests)
- **CloudWatch**: ~$5/month (logs + metrics + alarms)
- **Total**: ~$57.50/month

## Next Steps

After successful deployment:

1. **Monitor metrics** in CloudWatch dashboard
2. **Test with real users** on dev.dashden.app
3. **Gather feedback** on leaderboard features
4. **Optimize performance** based on metrics
5. **Plan production deployment** when ready

## Support

For deployment issues:
1. Check CloudWatch logs
2. Review this deployment guide
3. Consult the troubleshooting section
4. Check AWS service health dashboard
5. Contact DevOps team if needed
