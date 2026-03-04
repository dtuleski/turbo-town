# Backend Deployment Quick Start Guide

This guide will help you deploy the backend services and connect your frontend in ~4-5 hours.

## Current Status
- ✅ Frontend: Running at http://localhost:3000 with mock data
- ✅ Backend Code: Auth + Game services implemented
- ✅ Infrastructure: CDK stacks ready
- ❌ Not Deployed: Backend needs to be deployed to AWS

## Prerequisites Check

### 1. AWS Account Setup
You'll need:
- AWS Account with admin access
- AWS CLI installed and configured
- AWS CDK installed

### 2. Node.js & npm
Already installed ✅ (you're running the frontend)

## Step-by-Step Deployment

### Phase 1: AWS Setup (30-45 minutes)

#### Step 1.1: Install AWS CLI
```bash
# Check if AWS CLI is installed
aws --version

# If not installed, install it:
brew install awscli
```

#### Step 1.2: Configure AWS Credentials
```bash
# Configure AWS CLI with your credentials
aws configure

# You'll be prompted for:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (use: us-east-1)
# - Default output format (use: json)
```

**Where to get AWS credentials:**
1. Log into AWS Console: https://console.aws.amazon.com
2. Go to IAM → Users → Your User → Security Credentials
3. Create Access Key → CLI
4. Copy the Access Key ID and Secret Access Key

#### Step 1.3: Install AWS CDK
```bash
# Install CDK globally
npm install -g aws-cdk

# Verify installation
cdk --version
```

#### Step 1.4: Bootstrap CDK (One-time setup)
```bash
# Navigate to infrastructure directory
cd infrastructure

# Install dependencies
npm install

# Bootstrap CDK in your AWS account
cdk bootstrap

# This creates necessary resources in your AWS account
```

### Phase 2: Build Backend Services (15-20 minutes)

#### Step 2.1: Build Shared Package
```bash
# From project root
cd packages/shared
npm install
npm run build
```

#### Step 2.2: Build Auth Service
```bash
cd ../../services/auth
npm install
npm run build
```

#### Step 2.3: Build Game Service
```bash
cd ../game
npm install
npm run build
```

### Phase 3: Deploy Infrastructure (45-60 minutes)

#### Step 3.1: Deploy Database Stack
```bash
cd ../../infrastructure

# Deploy database tables
cdk deploy MemoryGameDatabaseStack-dev --context environment=dev

# This creates 8 DynamoDB tables
```

#### Step 3.2: Deploy Cognito Stack
```bash
# Deploy authentication infrastructure
cdk deploy MemoryGameCognitoStack-dev --context environment=dev

# This creates:
# - Cognito User Pool
# - User Pool Client
# - Identity Pool
```

#### Step 3.3: Deploy Lambda Stack
```bash
# Deploy Lambda functions
cdk deploy MemoryGameLambdaStack-dev --context environment=dev

# This deploys:
# - Auth service Lambda
# - Game service Lambda
```

#### Step 3.4: Deploy API Stack
```bash
# Deploy AppSync GraphQL API
cdk deploy MemoryGameApiStack-dev --context environment=dev

# This creates:
# - AppSync GraphQL API
# - Data sources
# - Resolvers
```

#### Step 3.5: Deploy Monitoring Stack (Optional)
```bash
# Deploy monitoring and alarms
cdk deploy MemoryGameMonitoringStack-dev --context environment=dev
```

#### Step 3.6: Get Deployment Outputs
```bash
# After deployment, CDK will output important values:
# - GraphQL API URL
# - Cognito User Pool ID
# - Cognito Client ID
# - Region

# Save these values - you'll need them for the frontend!
```

### Phase 4: Connect Frontend (30-45 minutes)

#### Step 4.1: Update Environment Variables
```bash
cd ../../apps/web

# Copy example env file
cp .env.example .env.local

# Edit .env.local with your deployment values
```

Edit `apps/web/.env.local`:
```env
# Replace with your actual values from CDK output
VITE_API_URL=https://YOUR-API-ID.appsync-api.us-east-1.amazonaws.com/graphql
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_REGION=us-east-1
VITE_ENV=development
```

#### Step 4.2: Install AWS Amplify (for Cognito integration)
```bash
npm install aws-amplify @aws-amplify/ui-react
```

#### Step 4.3: Update AuthContext to use Cognito
We'll need to replace the mock authentication with real Cognito calls.

#### Step 4.4: Test the Integration
```bash
# Restart the dev server
npm run dev

# Test:
# 1. Register a new user
# 2. Verify email (check your email)
# 3. Login
# 4. Play a game
# 5. Check if game data is saved
```

### Phase 5: Verification (15-20 minutes)

#### Verify Backend
```bash
# Check Lambda functions are deployed
aws lambda list-functions --query 'Functions[?contains(FunctionName, `memory-game`)].FunctionName'

# Check DynamoDB tables exist
aws dynamodb list-tables --query 'TableNames[?contains(@, `MemoryGame`)]'

# Check Cognito User Pool
aws cognito-idp list-user-pools --max-results 10
```

#### Verify Frontend Connection
1. Open browser to http://localhost:3000
2. Open DevTools → Network tab
3. Try to register/login
4. Check network requests go to your AppSync API (not mock data)
5. Play a game and verify it saves to DynamoDB

## Troubleshooting

### Issue: CDK Bootstrap Fails
```bash
# Make sure AWS credentials are configured
aws sts get-caller-identity

# If this fails, reconfigure AWS CLI
aws configure
```

### Issue: Lambda Deployment Fails
```bash
# Make sure services are built
cd services/auth && npm run build
cd ../game && npm run build

# Check for TypeScript errors
npm run typecheck
```

### Issue: Frontend Can't Connect
- Check .env.local has correct values
- Check browser console for CORS errors
- Verify API URL is correct (should end with /graphql)
- Check Cognito User Pool ID format (us-east-1_XXXXXXXXX)

### Issue: Authentication Fails
- Check Cognito User Pool allows self-registration
- Check email verification is configured
- Check User Pool Client has correct auth flows enabled

## Cost Estimate

**Development Environment (per month):**
- DynamoDB: ~$1-5 (on-demand pricing, low usage)
- Lambda: ~$0-1 (free tier covers most dev usage)
- AppSync: ~$0-2 (free tier: 250k queries/month)
- Cognito: Free (up to 50k MAU)
- **Total: ~$1-8/month for development**

## Next Steps After Deployment

Once everything is working:

1. **Test Core Functionality**
   - User registration and login
   - Playing games
   - Viewing game history
   - Checking leaderboards (when implemented)

2. **Deploy to Production**
   - Use `--context environment=prod`
   - Set up custom domain
   - Configure production Cognito settings

3. **Build Remaining Services**
   - Leaderboard Service
   - Payment Service (Stripe)
   - CMS Service
   - Admin Service

4. **Set Up CI/CD**
   - GitHub Actions or AWS CodePipeline
   - Automated testing
   - Automated deployments

## Quick Reference Commands

```bash
# Deploy everything at once (after building services)
cd infrastructure
cdk deploy --all --context environment=dev

# Check deployment status
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Get API URL
aws appsync list-graphql-apis --query 'graphqlApis[?name==`MemoryGameApi-dev`].uris.GRAPHQL'

# Destroy everything (careful!)
cdk destroy --all --context environment=dev
```

## Support

If you run into issues:
1. Check CloudWatch Logs for Lambda errors
2. Check AppSync logs for GraphQL errors
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

---

**Estimated Total Time: 4-5 hours**
- AWS Setup: 30-45 min
- Build Services: 15-20 min
- Deploy Infrastructure: 45-60 min
- Connect Frontend: 30-45 min
- Verification: 15-20 min
- Buffer for troubleshooting: 30-60 min
