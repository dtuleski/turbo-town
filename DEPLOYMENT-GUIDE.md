# Memory Game - AWS Deployment Guide

## 🎯 Overview

This guide will walk you through deploying your Memory Game application to AWS from scratch. By the end, you'll have:
- Auth Service running on AWS Lambda
- Game Service running on AWS Lambda
- API Gateway endpoints you can test
- DynamoDB tables for data storage
- Cognito for user authentication
- CloudWatch monitoring

**Estimated Time**: 30-45 minutes

---

## 📋 Prerequisites

### 1. Install Node.js

**macOS**:
```bash
# Using Homebrew (recommended)
brew install node@20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

**Alternative - Download from nodejs.org**:
- Visit: https://nodejs.org/
- Download Node.js 20.x LTS
- Run the installer

### 2. Install AWS CLI

**macOS**:
```bash
# Using Homebrew
brew install awscli

# Verify installation
aws --version  # Should show aws-cli/2.x.x
```

**Alternative - Download installer**:
- Visit: https://aws.amazon.com/cli/
- Download and run the installer

### 3. Install AWS CDK CLI

```bash
npm install -g aws-cdk

# Verify installation
cdk --version  # Should show 2.100.0 or later
```

### 4. AWS Account Setup

You need an AWS account with appropriate permissions:

1. **Create AWS Account** (if you don't have one):
   - Visit: https://aws.amazon.com/
   - Click "Create an AWS Account"
   - Follow the signup process

2. **Create IAM User** (recommended for security):
   ```bash
   # In AWS Console:
   # 1. Go to IAM → Users → Add User
   # 2. User name: memory-game-deployer
   # 3. Access type: Programmatic access
   # 4. Permissions: AdministratorAccess (for initial setup)
   # 5. Download credentials (Access Key ID and Secret Access Key)
   ```

3. **Configure AWS CLI**:
   ```bash
   aws configure
   
   # Enter when prompted:
   AWS Access Key ID: [Your Access Key]
   AWS Secret Access Key: [Your Secret Key]
   Default region name: us-east-1
   Default output format: json
   ```

4. **Verify AWS Configuration**:
   ```bash
   aws sts get-caller-identity
   
   # Should show your account info:
   # {
   #   "UserId": "...",
   #   "Account": "123456789012",
   #   "Arn": "arn:aws:iam::123456789012:user/memory-game-deployer"
   # }
   ```

---

## 🔨 Step 1: Build All Services

### 1.1 Install Dependencies

```bash
# From workspace root
cd ~/path/to/your/project

# Install root dependencies
npm install

# Install Shared Components dependencies
cd packages/shared
npm install
cd ../..

# Install Auth Service dependencies
cd services/auth
npm install
cd ../..

# Install Game Service dependencies
cd services/game
npm install
cd ../..

# Install Infrastructure dependencies
cd infrastructure
npm install
cd ..
```

### 1.2 Build All Units

```bash
# Build Shared Components
cd packages/shared
npm run build
cd ../..

# Build Auth Service
cd services/auth
npm run build
cd ../..

# Build Game Service
cd services/game
npm run build
cd ../..

# Build Infrastructure
cd infrastructure
npm run build
cd ..
```

**Expected Output**:
- `packages/shared/dist/` - Compiled shared library
- `services/auth/dist/` - Auth Lambda handler
- `services/game/dist/` - Game Lambda handler
- `infrastructure/lib/` - Compiled CDK stacks

**Troubleshooting**:
- If build fails with "Module not found": Run `npm install` in that directory
- If TypeScript errors: Check Node.js version is 20.x
- If out of memory: Run `export NODE_OPTIONS="--max-old-space-size=4096"`

---

## ☁️ Step 2: Bootstrap AWS CDK

This is a one-time setup per AWS account/region:

```bash
cd infrastructure

# Bootstrap CDK (creates S3 bucket for CDK assets)
cdk bootstrap aws://ACCOUNT-ID/us-east-1

# Replace ACCOUNT-ID with your AWS account ID from:
aws sts get-caller-identity --query Account --output text
```

**Expected Output**:
```
✅ Environment aws://123456789012/us-east-1 bootstrapped.
```

---

## 🚀 Step 3: Deploy Infrastructure to AWS

### 3.1 Review What Will Be Deployed

```bash
cd infrastructure

# See what will be created (optional)
cdk synth --context environment=dev
```

This shows you the CloudFormation templates that will be deployed.

### 3.2 Deploy All Stacks

```bash
# Deploy to development environment
npm run deploy:dev

# Or use CDK directly
cdk deploy --all --context environment=dev --require-approval never
```

**What Gets Deployed**:
1. **Database Stack** - 8 DynamoDB tables
2. **Cognito Stack** - User Pool for authentication
3. **EventBridge Stack** - Event bus for async messaging
4. **Lambda Stack** - Auth and Game Lambda functions
5. **API Stack** - API Gateway with routes
6. **Monitoring Stack** - CloudWatch alarms and dashboard

**Deployment Time**: ~10-15 minutes

**Expected Output**:
```
✅ MemoryGame-Database-dev
✅ MemoryGame-Cognito-dev
✅ MemoryGame-EventBridge-dev
✅ MemoryGame-Lambda-dev
✅ MemoryGame-API-dev
✅ MemoryGame-Monitoring-dev

Outputs:
MemoryGame-API-dev.ApiUrl = https://abc123.execute-api.us-east-1.amazonaws.com
MemoryGame-API-dev.AuthEndpoint = https://abc123.execute-api.us-east-1.amazonaws.com/auth/graphql
MemoryGame-API-dev.GameEndpoint = https://abc123.execute-api.us-east-1.amazonaws.com/game/graphql
MemoryGame-Cognito-dev.UserPoolId = us-east-1_xxxxxxxxx
MemoryGame-Cognito-dev.UserPoolClientId = xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Save these outputs!** You'll need them for testing.

### 3.3 Troubleshooting Deployment

**Error: "User is not authorized to perform: cloudformation:CreateStack"**
- Solution: Your IAM user needs CloudFormation permissions
- Add `AdministratorAccess` policy (or specific CloudFormation permissions)

**Error: "Resource limit exceeded"**
- Solution: AWS has service limits (e.g., max Lambda functions)
- Request limit increase in AWS Console → Service Quotas

**Error: "Stack already exists"**
- Solution: Previous deployment failed partially
- Run: `cdk destroy --all --context environment=dev` then redeploy

---

## 🧪 Step 4: Test Your Deployed API

### 4.1 Get Your API Endpoints

```bash
# Get API URL
aws cloudformation describe-stacks \
  --stack-name MemoryGame-API-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text

# Get Cognito details
aws cloudformation describe-stacks \
  --stack-name MemoryGame-Cognito-dev \
  --query 'Stacks[0].Outputs' \
  --output table
```

### 4.2 Test Auth Service - Register User

```bash
# Set your API URL (replace with your actual URL)
export API_URL="https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com"

# Register a new user
curl -X POST "$API_URL/auth/graphql" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { register(input: { email: \"test@example.com\", password: \"Test123!\", name: \"Test User\" }) { user { id email name } accessToken } }"
  }' | jq '.'
```

**Expected Response**:
```json
{
  "data": {
    "register": {
      "user": {
        "id": "uuid-here",
        "email": "test@example.com",
        "name": "Test User"
      },
      "accessToken": "eyJraWQiOiJ..."
    }
  }
}
```

**Save the accessToken!** You'll need it for authenticated requests.

### 4.3 Test Auth Service - Login

```bash
# Login with the user you just created
curl -X POST "$API_URL/auth/graphql" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(input: { email: \"test@example.com\", password: \"Test123!\" }) { user { id email } accessToken } }"
  }' | jq '.'
```

### 4.4 Test Game Service - Start Game

```bash
# Set your access token (replace with actual token from register/login)
export ACCESS_TOKEN="eyJraWQiOiJ..."

# Start a game
curl -X POST "$API_URL/game/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "query": "mutation { startGame(input: { themeId: \"basic-shapes\", difficulty: \"MEDIUM\" }) { id status canPlay rateLimit { remaining resetAt } } }"
  }' | jq '.'
```

**Expected Response**:
```json
{
  "data": {
    "startGame": {
      "id": "game-uuid",
      "status": "IN_PROGRESS",
      "canPlay": true,
      "rateLimit": {
        "remaining": 2,
        "resetAt": "2026-03-04T00:00:00Z"
      }
    }
  }
}
```

### 4.5 Test Game Service - Complete Game

```bash
# Complete the game (replace GAME_ID with actual game ID from startGame)
export GAME_ID="game-uuid-from-previous-step"

curl -X POST "$API_URL/game/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"query\": \"mutation { completeGame(input: { gameId: \\\"$GAME_ID\\\", completionTime: 60, attempts: 5 }) { id score achievements { type unlocked progress } } }\"
  }" | jq '.'
```

**Expected Response**:
```json
{
  "data": {
    "completeGame": {
      "id": "game-uuid",
      "score": 850,
      "achievements": [
        {
          "type": "FIRST_WIN",
          "unlocked": true,
          "progress": 1
        }
      ]
    }
  }
}
```

### 4.6 Test Game Service - Get Statistics

```bash
curl -X POST "$API_URL/game/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "query": "query { getUserStatistics { totalGames totalCompletedGames averageScore bestScore averageCompletionTime bestCompletionTime } }"
  }' | jq '.'
```

---

## 📊 Step 5: Monitor Your Application

### 5.1 View CloudWatch Logs

```bash
# Auth Service logs
aws logs tail /aws/lambda/MemoryGame-AuthService-dev --follow

# Game Service logs
aws logs tail /aws/lambda/MemoryGame-GameService-dev --follow

# API Gateway logs
aws logs tail /aws/apigateway/memory-game-dev --follow
```

### 5.2 View CloudWatch Dashboard

1. Open AWS Console: https://console.aws.amazon.com/cloudwatch/
2. Navigate to: Dashboards → `MemoryGame-dev`
3. View metrics for:
   - Lambda invocations, errors, duration
   - DynamoDB read/write capacity
   - API Gateway requests, latency

### 5.3 Check CloudWatch Alarms

```bash
# List all alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix "MemoryGame" \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table
```

### 5.4 Subscribe to Alarm Notifications

```bash
# Get SNS topic ARN
aws sns list-topics --query 'Topics[?contains(TopicArn, `MemoryGame-Alarms`)]'

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT-ID:MemoryGame-Alarms-dev \
  --protocol email \
  --notification-endpoint your-email@example.com

# Confirm subscription in your email
```

---

## 💰 Step 6: Understand Costs

### Development Environment (Low Traffic)

**Monthly Costs** (~$20-30):
- Lambda: $5-10 (1M requests, 512MB-1GB)
- DynamoDB: $5-10 (on-demand, low usage)
- API Gateway: $3.50 (1M requests)
- Cognito: Free (< 50K MAUs)
- CloudWatch: $5 (logs, metrics)

### Cost Optimization Tips

1. **Use Free Tier**:
   - Lambda: 1M requests/month free
   - DynamoDB: 25 GB storage free
   - Cognito: 50K MAUs free

2. **Monitor Usage**:
   ```bash
   # Check Lambda invocations
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Invocations \
     --dimensions Name=FunctionName,Value=MemoryGame-GameService-dev \
     --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 86400 \
     --statistics Sum
   ```

3. **Set Budget Alerts**:
   - AWS Console → Billing → Budgets
   - Create budget: $50/month
   - Alert at 80% threshold

---

## 🧹 Step 7: Clean Up (When Done Testing)

### Destroy All Resources

```bash
cd infrastructure

# Destroy all stacks
npm run destroy:dev

# Or use CDK directly
cdk destroy --all --context environment=dev
```

**Warning**: This will delete:
- All Lambda functions
- API Gateway
- Cognito User Pool (users will be deleted)
- EventBridge event bus
- CloudWatch alarms

**DynamoDB tables are RETAINED** by default (data preserved). To delete them:

```bash
# List tables
aws dynamodb list-tables --query 'TableNames[?contains(@, `memory-game`)]'

# Delete each table
aws dynamodb delete-table --table-name memory-game-users-dev
aws dynamodb delete-table --table-name memory-game-games-dev
# ... repeat for all tables
```

---

## 🎉 Success! What's Next?

You now have a working Memory Game API on AWS! Here's what you can do:

### Immediate Next Steps

1. **Test More Endpoints**:
   - Try all GraphQL mutations and queries
   - Test rate limiting (play 3+ games as FREE user)
   - Test achievements (complete multiple games)

2. **Add Test Data**:
   - Create multiple users
   - Play games with different themes
   - Test leaderboard functionality (when implemented)

3. **Monitor Performance**:
   - Watch CloudWatch metrics
   - Check Lambda duration
   - Monitor DynamoDB usage

### Future Enhancements

1. **Add More Services**:
   - Leaderboard Service (global rankings)
   - Payment Service (Stripe subscriptions)
   - CMS Service (theme management)
   - Admin Service (admin dashboard)

2. **Build Web Frontend**:
   - React application
   - Connect to your API
   - User interface for gameplay

3. **Add More Infrastructure**:
   - S3 + CloudFront for theme images
   - Custom domain name
   - WAF for API protection

4. **Implement Tests**:
   - Unit tests for services
   - Integration tests
   - Performance tests

---

## 🆘 Troubleshooting

### Common Issues

**1. "Cannot find module" errors during build**
```bash
# Solution: Clean and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**2. "Access Denied" errors during deployment**
```bash
# Solution: Check AWS credentials
aws sts get-caller-identity

# Ensure IAM user has required permissions
```

**3. "Rate exceeded" errors from API**
```bash
# Solution: This is expected for FREE tier users (3 games/day)
# Wait 24 hours or upgrade to paid tier
```

**4. "Invalid token" errors**
```bash
# Solution: Token expired (1 hour validity)
# Login again to get new token
```

**5. Lambda timeout errors**
```bash
# Solution: Increase timeout in lambda-stack.ts
# Default is 30 seconds, can increase to 900 seconds
```

### Get Help

- **AWS Documentation**: https://docs.aws.amazon.com/
- **CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **CloudWatch Logs**: Check for detailed error messages
- **AWS Support**: https://console.aws.amazon.com/support/

---

## 📚 Additional Resources

- **Build Instructions**: `aidlc-docs/construction/build-and-test/build-instructions.md`
- **Integration Tests**: `aidlc-docs/construction/build-and-test/integration-test-instructions.md`
- **Performance Tests**: `aidlc-docs/construction/build-and-test/performance-test-instructions.md`
- **Infrastructure README**: `infrastructure/README.md`
- **Auth Service README**: `services/auth/README.md`
- **Game Service README**: `services/game/README.md`

---

## ✅ Deployment Checklist

- [ ] Node.js 20.x installed
- [ ] AWS CLI installed and configured
- [ ] AWS CDK CLI installed
- [ ] AWS account created
- [ ] IAM user created with credentials
- [ ] AWS CLI configured with credentials
- [ ] All dependencies installed
- [ ] All services built successfully
- [ ] CDK bootstrapped
- [ ] Infrastructure deployed to AWS
- [ ] API endpoints tested
- [ ] CloudWatch monitoring configured
- [ ] Budget alerts set up

---

**Congratulations!** 🎉 Your Memory Game is now running on AWS!
