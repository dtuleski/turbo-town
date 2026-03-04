# Quick Deploy Reference

## TL;DR - Deploy in 3 Commands

```bash
# 1. Deploy backend (15-20 minutes)
./deploy-backend.sh dev

# 2. Configure frontend (30 seconds)
./configure-frontend.sh

# 3. Start frontend (already running, just restart)
cd apps/web && npm run dev
```

## Prerequisites (One-Time Setup)

```bash
# Install AWS CLI
brew install awscli

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Format (json)

# Install AWS CDK
npm install -g aws-cdk

# Verify everything
aws sts get-caller-identity  # Should show your AWS account
cdk --version                # Should show CDK version
```

## Common Commands

### Deploy Everything
```bash
./deploy-backend.sh dev
```

### Deploy Specific Stack
```bash
cd infrastructure
cdk deploy MemoryGame-Database-dev --context environment=dev
cdk deploy MemoryGame-Cognito-dev --context environment=dev
cdk deploy MemoryGame-Lambda-dev --context environment=dev
cdk deploy MemoryGame-API-dev --context environment=dev
```

### Check What Will Change
```bash
cd infrastructure
cdk diff --context environment=dev
```

### View Deployment Outputs
```bash
cat infrastructure/cdk-outputs.json
```

### Destroy Everything (Careful!)
```bash
cd infrastructure
cdk destroy --all --context environment=dev
```

## Troubleshooting Quick Fixes

### "AWS credentials not configured"
```bash
aws configure
```

### "CDK not bootstrapped"
```bash
cd infrastructure
cdk bootstrap
```

### "Build failed"
```bash
# Rebuild everything
cd packages/shared && npm run build
cd ../../services/auth && npm run build
cd ../game && npm run build
```

### "Frontend can't connect"
```bash
# Reconfigure frontend
./configure-frontend.sh

# Restart dev server
cd apps/web
npm run dev
```

### "Check if deployment worked"
```bash
# List Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `MemoryGame`)].FunctionName'

# List DynamoDB tables
aws dynamodb list-tables --query 'TableNames[?contains(@, `MemoryGame`)]'

# List Cognito pools
aws cognito-idp list-user-pools --max-results 10
```

### "View Lambda logs"
```bash
aws logs tail /aws/lambda/MemoryGame-Auth-dev --follow
aws logs tail /aws/lambda/MemoryGame-Game-dev --follow
```

## File Locations

- **Deployment outputs**: `infrastructure/cdk-outputs.json`
- **Frontend config**: `apps/web/.env.local`
- **Backend code**: `services/auth/`, `services/game/`
- **Infrastructure**: `infrastructure/lib/stacks/`

## What Gets Deployed

1. **Database Stack**: 8 DynamoDB tables
2. **Cognito Stack**: User Pool + Client
3. **EventBridge Stack**: Event bus for async events
4. **Lambda Stack**: Auth + Game functions
5. **API Stack**: AppSync GraphQL API
6. **Monitoring Stack**: CloudWatch alarms

## Expected Timeline

- AWS setup (first time): 30-45 min
- Deployment: 15-20 min
- Frontend config: 2-3 min
- Testing: 10-15 min
- **Total: ~60-90 min first time, ~20 min subsequent deploys**

## Cost Estimate

**Dev environment**: ~$1-8/month
- Most services covered by AWS free tier
- DynamoDB on-demand pricing
- Lambda free tier (1M requests/month)

## Success Check

After deployment, you should be able to:
1. ✅ Register a new user
2. ✅ Verify email
3. ✅ Login
4. ✅ Play a game
5. ✅ See game saved in history

## Get Help

If stuck:
1. Check `DEPLOYMENT-CHECKLIST.md` for detailed steps
2. Check `BACKEND-DEPLOYMENT-QUICKSTART.md` for full guide
3. Check CloudWatch logs for errors
4. Check browser console for frontend errors

## Emergency Rollback

If something goes wrong:
```bash
cd infrastructure
cdk destroy --all --context environment=dev
# Then redeploy from scratch
./deploy-backend.sh dev
```
