# 🚀 One-Command Deployment

## Quick Start

Deploy the entire leaderboard system with one command:

```bash
./deploy-all.sh
```

That's it! The script will:
1. ✅ Deploy all backend infrastructure (DynamoDB, EventBridge, Lambda, API Gateway)
2. ✅ Build and deploy the Leaderboard Service
3. ✅ Configure environment variables
4. ✅ Deploy frontend to dev.dashden.app

**Time**: ~15 minutes for first deployment, ~5 minutes for updates

## What Gets Deployed

### Backend (AWS)
- **DynamoDB Tables**: LeaderboardEntries, UserAggregates, RateLimitBuckets
- **EventBridge**: game-events event bus with routing rules
- **Lambda**: Leaderboard Service (Node.js 20.x, 512MB)
- **API Gateway**: /leaderboard/graphql endpoint with Cognito auth

### Frontend (Vercel)
- **React App**: Built and deployed to dev.dashden.app
- **Environment Variables**: VITE_LEADERBOARD_ENDPOINT configured
- **Features**: Leaderboard page, dashboard widgets, score breakdown modal

## Prerequisites

Before running, ensure you have:
- ✅ AWS CLI configured (`aws configure`)
- ✅ AWS CDK installed (`npm install -g aws-cdk`)
- ✅ Node.js 18+ installed
- ✅ Vercel account (script will prompt for login if needed)

## First Time Setup

If this is your first deployment:

```bash
# 1. Bootstrap CDK (one-time only)
cd infrastructure
cdk bootstrap
cd ..

# 2. Link Vercel project (one-time only)
cd apps/web
vercel link
cd ../..

# 3. Run deployment
./deploy-all.sh
```

## Subsequent Deployments

For updates after the first deployment:

```bash
./deploy-all.sh
```

The script is idempotent - safe to run multiple times.

## Verify Deployment

After deployment completes:

### 1. Check Backend
```bash
# Verify DynamoDB tables
aws dynamodb list-tables | grep -E "Leaderboard|Aggregates"

# Check Lambda function
aws lambda get-function --function-name MemoryGame-LeaderboardService-dev

# View logs
aws logs tail /aws/lambda/MemoryGame-LeaderboardService-dev --follow
```

### 2. Check Frontend
1. Visit https://dev.dashden.app
2. Log in
3. Look for 📊 Dashboard and 🏆 Leaderboard buttons on home page
4. Click Leaderboard - page should load (may be empty initially)

### 3. Test End-to-End
1. Play a Memory Match game
2. Complete the game
3. Score Breakdown Modal should appear
4. Click "View Leaderboard"
5. You should see yourself in the rankings

## Troubleshooting

### Deployment fails at CDK step
```bash
# Check AWS credentials
aws sts get-caller-identity

# Try deploying stacks individually
cd infrastructure
cdk deploy MemoryGame-Database-dev
cdk deploy MemoryGame-EventBridge-dev
cdk deploy MemoryGame-LeaderboardLambda-dev
cdk deploy MemoryGame-API-dev
```

### Vercel deployment fails
```bash
# Re-link project
cd apps/web
vercel link

# Deploy manually
vercel --prod
```

### Frontend shows errors
```bash
# Check environment variables
cd apps/web
vercel env ls

# Verify VITE_LEADERBOARD_ENDPOINT is set
```

### Leaderboard page doesn't load
```bash
# Check Lambda logs
aws logs tail /aws/lambda/MemoryGame-LeaderboardService-dev --follow

# Test API endpoint directly
ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name MemoryGame-API-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`LeaderboardEndpoint`].OutputValue' \
  --output text)

curl -X POST $ENDPOINT \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"query{getLeaderboard(gameType:OVERALL,timeframe:ALL_TIME){totalEntries}}"}'
```

## Rollback

If something goes wrong:

```bash
# Rollback backend
cd infrastructure
cdk destroy MemoryGame-LeaderboardLambda-dev
cdk destroy MemoryGame-EventBridge-dev
cdk destroy MemoryGame-Database-dev

# Rollback frontend
cd apps/web
vercel rollback
```

## Manual Deployment

If you prefer to deploy step-by-step:

```bash
# Backend
cd infrastructure
npm install
cdk deploy MemoryGame-Database-dev --require-approval never
cdk deploy MemoryGame-EventBridge-dev --require-approval never
cd ../services/leaderboard && npm install && npm run build && cd ../../infrastructure
cdk deploy MemoryGame-LeaderboardLambda-dev --require-approval never
cdk deploy MemoryGame-API-dev --require-approval never

# Frontend
cd ../apps/web
npm install
npm run build
vercel --prod
```

## Cost Estimate

Development environment (~$12/month):
- DynamoDB: ~$5/month (on-demand)
- Lambda: ~$2/month (1M requests)
- API Gateway: ~$3.50/month (1M requests)
- CloudWatch: ~$1/month
- Vercel: Free tier

## Support

- **Full Guide**: See `.kiro/specs/leaderboard-and-scoring-system/DEPLOYMENT-GUIDE.md`
- **Testing**: See `.kiro/specs/leaderboard-and-scoring-system/TESTING-GUIDE.md`
- **Quick Test**: See `.kiro/specs/leaderboard-and-scoring-system/QUICK-TEST.md`

## What's Next

After successful deployment:
1. ✅ Test the leaderboard page
2. ✅ Play games to populate data
3. ✅ Check dashboard widgets
4. ✅ Monitor CloudWatch logs
5. ✅ Gather user feedback

Ready to deploy? Run:
```bash
./deploy-all.sh
```

🎉 Happy deploying!
