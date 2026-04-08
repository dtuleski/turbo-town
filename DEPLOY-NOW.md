# Deploy Leaderboard System - Step by Step Guide

## ✅ Prerequisites Check

Your system has:
- ✅ AWS CLI installed
- ✅ AWS CDK installed  
- ✅ AWS credentials configured (Account: 848403890404)
- ⚠️ Vercel CLI not installed (we'll handle this)

## 🚀 Deployment Steps

### Step 1: Install Vercel CLI (1 minute)

```bash
npm install -g vercel
```

### Step 2: Deploy Backend Infrastructure (10 minutes)

Run these commands one by one:

```bash
# Navigate to infrastructure
cd infrastructure

# Install dependencies
npm install

# Deploy Database Stack (DynamoDB tables)
cdk deploy DatabaseStack --require-approval never

# Deploy EventBridge Stack (Event bus)
cdk deploy EventBridgeStack --require-approval never

# Build Leaderboard Service
cd ../services/leaderboard
npm install
npm run build
cd ../../infrastructure

# Deploy Leaderboard Lambda
cdk deploy LeaderboardLambdaStack --require-approval never

# Deploy API Gateway (with leaderboard route)
cdk deploy ApiStack --require-approval never
```

### Step 3: Get API Endpoint (30 seconds)

```bash
# Get the leaderboard endpoint URL
aws cloudformation describe-stacks \
  --stack-name ApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`LeaderboardEndpoint`].OutputValue' \
  --output text

# Copy this URL - you'll need it for Vercel
```

### Step 4: Configure Vercel (2 minutes)

**Option A: Via Vercel Dashboard (Recommended)**
1. Go to https://vercel.com
2. Find your DashDen project
3. Go to Settings → Environment Variables
4. Add new variable:
   - Name: `VITE_LEADERBOARD_ENDPOINT`
   - Value: (paste the URL from Step 3)
   - Environment: Production
5. Click Save

**Option B: Via CLI**
```bash
cd apps/web
vercel env add VITE_LEADERBOARD_ENDPOINT production
# Paste the URL when prompted
```

### Step 5: Deploy Frontend (5 minutes)

```bash
cd apps/web

# Install dependencies
npm install

# Build to verify everything works
npm run build

# Deploy to production
vercel --prod
```

### Step 6: Verify Deployment (2 minutes)

1. Visit https://dev.dashden.app
2. Log in with your account
3. You should see two new buttons on the home page:
   - 📊 Dashboard
   - 🏆 Leaderboard
4. Click the Leaderboard button
5. The leaderboard page should load (may be empty initially)

### Step 7: Test End-to-End (5 minutes)

1. Play a Memory Match game
2. Complete the game
3. You should see a Score Breakdown Modal with:
   - Your final score
   - Score breakdown details
   - Leaderboard rank badge (if ranked)
4. Click "View Leaderboard"
5. You should see yourself in the leaderboard

## 🐛 Troubleshooting

### If backend deployment fails:

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check CDK bootstrap
cdk bootstrap

# Try deploying stacks individually
cdk deploy DatabaseStack
```

### If frontend deployment fails:

```bash
# Clear cache and retry
cd apps/web
rm -rf node_modules .next dist
npm install
npm run build
vercel --prod
```

### If leaderboard page shows error:

```bash
# Check Lambda logs
aws logs tail /aws/lambda/MemoryGame-LeaderboardService-dev --follow

# Verify environment variable in Vercel
vercel env ls
```

## 📞 Need Help?

If you get stuck at any step:
1. Copy the error message
2. Check which step failed
3. Let me know and I'll help troubleshoot

## ⚡ Quick Deploy (All at Once)

If you want to run everything at once:

```bash
# Backend
cd infrastructure && \
npm install && \
cdk deploy DatabaseStack EventBridgeStack --require-approval never && \
cd ../services/leaderboard && npm install && npm run build && \
cd ../../infrastructure && \
cdk deploy LeaderboardLambdaStack ApiStack --require-approval never

# Get endpoint
aws cloudformation describe-stacks \
  --stack-name ApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`LeaderboardEndpoint`].OutputValue' \
  --output text

# Then manually add to Vercel and deploy frontend
```

## 🎉 Success Indicators

You'll know it worked when:
- ✅ All CDK stacks show "CREATE_COMPLETE" or "UPDATE_COMPLETE"
- ✅ Vercel deployment succeeds
- ✅ Home page shows Dashboard and Leaderboard buttons
- ✅ Leaderboard page loads without errors
- ✅ Score breakdown modal appears after completing a game
- ✅ Dashboard widgets show your performance data

Ready to deploy? Start with Step 1! 🚀
