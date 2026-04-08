# Deploy to dev.dashden.app - Quick Guide

## 🚀 Quick Deploy (Recommended)

```bash
# Use the deployment script
./deploy-leaderboard.sh

# Choose option 3 (Deploy Everything)
```

## 📋 Manual Deployment Steps

### Step 1: Deploy Backend (10 minutes)

```bash
cd infrastructure

# Install and deploy
npm install
cdk deploy DatabaseStack --require-approval never
cdk deploy EventBridgeStack --require-approval never
cdk deploy LeaderboardLambdaStack --require-approval never
cdk deploy ApiStack --require-approval never
```

### Step 2: Get API Endpoints

```bash
# Get the leaderboard endpoint
aws cloudformation describe-stacks \
  --stack-name ApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`LeaderboardEndpoint`].OutputValue' \
  --output text

# Copy this URL - you'll need it for Vercel
```

### Step 3: Configure Vercel Environment Variables

Go to [Vercel Dashboard](https://vercel.com) → Your Project → Settings → Environment Variables

Add:
```
VITE_LEADERBOARD_ENDPOINT = <paste-leaderboard-endpoint-here>
```

### Step 4: Deploy Frontend (5 minutes)

```bash
cd apps/web

# Install and build
npm install
npm run build

# Deploy to Vercel
vercel --prod
```

### Step 5: Test (2 minutes)

1. Visit https://dev.dashden.app
2. Log in
3. Click "🏆 Leaderboard" button on home page
4. Verify leaderboard loads
5. Play a game and check score breakdown

## ✅ Verification Checklist

After deployment, verify:

- [ ] Backend stacks deployed successfully
- [ ] DynamoDB tables exist (LeaderboardEntries, UserAggregates, RateLimitBuckets)
- [ ] Lambda function deployed (MemoryGame-LeaderboardService-dev)
- [ ] EventBridge event bus exists (game-events)
- [ ] API Gateway has leaderboard endpoint
- [ ] Frontend deployed to dev.dashden.app
- [ ] Leaderboard page loads without errors
- [ ] Dashboard and Leaderboard buttons appear on home page
- [ ] Dashboard widgets display
- [ ] Game completion shows score breakdown

## 🐛 Quick Troubleshooting

### "Leaderboard page shows error"

```bash
# Check Lambda logs
aws logs tail /aws/lambda/MemoryGame-LeaderboardService-dev --follow

# Check API Gateway endpoint
curl -X POST <LEADERBOARD_ENDPOINT> \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query":"query{getLeaderboard(gameType:OVERALL,timeframe:ALL_TIME){totalEntries}}"}'
```

### "Score breakdown not showing"

```bash
# Check if Game Service has EVENT_BUS_NAME
aws lambda get-function-configuration \
  --function-name MemoryGame-GameService-dev \
  --query 'Environment.Variables.EVENT_BUS_NAME'

# Should return: "game-events"
# If not, update Game Service Lambda environment variables
```

### "Frontend build fails"

```bash
cd apps/web

# Clear cache and rebuild
rm -rf node_modules .next dist
npm install
npm run build
```

## 🔄 Update Deployment

To update after making changes:

```bash
# Backend changes
cd infrastructure
cdk deploy LeaderboardLambdaStack --require-approval never

# Frontend changes
cd apps/web
vercel --prod
```

## 📊 Monitor Deployment

```bash
# Watch Lambda logs
aws logs tail /aws/lambda/MemoryGame-LeaderboardService-dev --follow

# Check DynamoDB items
aws dynamodb scan --table-name LeaderboardEntries-dev --limit 5

# View CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=MemoryGame-LeaderboardService-dev \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

## 🎯 Test Scenarios

### Test 1: Leaderboard Page
1. Go to https://dev.dashden.app
2. Click "🏆 Leaderboard" button
3. Change timeframe and game type
4. Verify data loads

### Test 2: Dashboard Widgets
1. Go to Dashboard
2. Scroll to "Your Performance"
3. Verify 3 widgets display

### Test 3: Game Completion
1. Play Memory Match
2. Complete game
3. Verify score breakdown modal
4. Check leaderboard rank badge

## 💡 Tips

- **First deployment**: Takes ~15 minutes
- **Updates**: Take ~5 minutes
- **Rollback**: Use `./deploy-leaderboard.sh` option 5
- **Logs**: Always check CloudWatch logs first
- **Cache**: Clear browser cache if frontend doesn't update

## 📞 Need Help?

1. Check [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) for detailed steps
2. Review [TESTING-GUIDE.md](./TESTING-GUIDE.md) for testing procedures
3. Check CloudWatch logs for errors
4. Verify environment variables in Vercel
5. Ensure AWS credentials are configured

## 🎉 Success!

When everything works:
- ✅ Leaderboard page loads
- ✅ Dashboard widgets show data
- ✅ Score breakdown appears after games
- ✅ No errors in console or logs
- ✅ Users can compete on leaderboard

Ready to test on dev.dashden.app! 🚀
