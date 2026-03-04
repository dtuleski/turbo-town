# Backend Deployment Checklist

Use this checklist to track your deployment progress.

## Pre-Deployment Setup

### AWS Account Setup
- [ ] AWS Account created
- [ ] AWS CLI installed (`brew install awscli`)
- [ ] AWS credentials configured (`aws configure`)
  - [ ] Access Key ID entered
  - [ ] Secret Access Key entered
  - [ ] Region set to `us-east-1`
  - [ ] Output format set to `json`
- [ ] Test credentials: `aws sts get-caller-identity`

### Development Tools
- [ ] Node.js installed (already done ✓)
- [ ] AWS CDK installed (`npm install -g aws-cdk`)
- [ ] Verify CDK: `cdk --version`

## Automated Deployment (Recommended)

### Option 1: Use Deployment Script
```bash
# Run the automated deployment script
./deploy-backend.sh dev
```

This script will:
- [ ] Check all prerequisites
- [ ] Build shared package
- [ ] Build auth service
- [ ] Build game service
- [ ] Bootstrap CDK (if needed)
- [ ] Deploy all infrastructure stacks
- [ ] Save outputs to `infrastructure/cdk-outputs.json`

**Estimated time: 15-20 minutes**

### Configure Frontend
```bash
# After deployment completes, configure frontend
./configure-frontend.sh
```

This will:
- [ ] Read deployment outputs
- [ ] Create `apps/web/.env.local` with correct values
- [ ] Display configuration summary

## Manual Deployment (Alternative)

If you prefer step-by-step control:

### Step 1: Build Services
```bash
# Build shared package
cd packages/shared
npm install
npm run build

# Build auth service
cd ../../services/auth
npm install
npm run build

# Build game service
cd ../game
npm install
npm run build
```

- [ ] Shared package built
- [ ] Auth service built
- [ ] Game service built

### Step 2: Deploy Infrastructure
```bash
cd ../../infrastructure
npm install

# Bootstrap CDK (one-time)
cdk bootstrap

# Deploy all stacks
cdk deploy --all --context environment=dev --require-approval never
```

- [ ] CDK bootstrapped
- [ ] Database stack deployed
- [ ] Cognito stack deployed
- [ ] EventBridge stack deployed
- [ ] Lambda stack deployed
- [ ] API stack deployed
- [ ] Monitoring stack deployed

### Step 3: Save Deployment Outputs
After deployment, CDK will display outputs. Save these values:

- [ ] API URL: `_______________________________`
- [ ] Cognito User Pool ID: `_______________________________`
- [ ] Cognito Client ID: `_______________________________`
- [ ] Region: `_______________________________`

### Step 4: Configure Frontend
```bash
cd ../apps/web
cp .env.example .env.local
# Edit .env.local with your values
```

- [ ] `.env.local` created
- [ ] `VITE_API_URL` updated
- [ ] `VITE_COGNITO_USER_POOL_ID` updated
- [ ] `VITE_COGNITO_CLIENT_ID` updated
- [ ] `VITE_COGNITO_REGION` updated

## Post-Deployment Verification

### Verify AWS Resources
```bash
# Check Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `MemoryGame`)].FunctionName'

# Check DynamoDB tables
aws dynamodb list-tables --query 'TableNames[?contains(@, `MemoryGame`)]'

# Check Cognito User Pool
aws cognito-idp list-user-pools --max-results 10
```

- [ ] Lambda functions exist (auth, game)
- [ ] DynamoDB tables exist (8 tables)
- [ ] Cognito User Pool exists

### Test Frontend Integration
```bash
cd apps/web
npm run dev
```

Open http://localhost:3000 and test:

- [ ] Frontend loads without errors
- [ ] Registration page works
- [ ] Can create new account
- [ ] Receive verification email
- [ ] Can verify email
- [ ] Can login with verified account
- [ ] Can start a game
- [ ] Game data saves to backend
- [ ] Can view game history
- [ ] Can logout

### Check Browser Console
- [ ] No CORS errors
- [ ] API requests go to AppSync (not mock)
- [ ] Authentication tokens present in requests
- [ ] No 401/403 errors

### Check AWS CloudWatch Logs
```bash
# View Lambda logs
aws logs tail /aws/lambda/MemoryGame-Auth-dev --follow
aws logs tail /aws/lambda/MemoryGame-Game-dev --follow
```

- [ ] Lambda functions executing
- [ ] No error logs
- [ ] Successful API calls logged

## Troubleshooting

### Issue: AWS CLI not configured
```bash
aws configure
# Enter your credentials
```

### Issue: CDK bootstrap fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Try bootstrap again
cd infrastructure
cdk bootstrap
```

### Issue: Build fails
```bash
# Clean and rebuild
cd packages/shared
rm -rf node_modules dist
npm install
npm run build
```

### Issue: Deployment fails
```bash
# Check CDK diff to see what's changing
cd infrastructure
cdk diff --context environment=dev

# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name MemoryGame-Database-dev
```

### Issue: Frontend can't connect
- [ ] Check `.env.local` values are correct
- [ ] Check API URL ends with `/graphql`
- [ ] Check Cognito IDs match format
- [ ] Restart dev server after changing `.env.local`
- [ ] Clear browser cache and cookies

### Issue: Authentication fails
- [ ] Check Cognito User Pool allows self-registration
- [ ] Check email verification is configured
- [ ] Check User Pool Client auth flows enabled
- [ ] Check user confirmed email

## Cost Monitoring

After deployment, monitor costs:

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=2026-03-01,End=2026-03-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

Expected costs for dev environment:
- DynamoDB: $1-5/month
- Lambda: $0-1/month (free tier)
- AppSync: $0-2/month (free tier)
- Cognito: Free (up to 50k MAU)
- **Total: ~$1-8/month**

## Cleanup (When Done Testing)

To avoid ongoing costs, destroy the dev environment:

```bash
cd infrastructure
cdk destroy --all --context environment=dev
```

⚠️ **Warning**: This will delete all data!

- [ ] Confirmed data backed up (if needed)
- [ ] Destroyed all stacks
- [ ] Verified in AWS Console all resources deleted

## Success Criteria

Deployment is successful when:
- [x] All AWS resources deployed
- [x] Frontend connects to backend
- [x] User registration works
- [x] User login works
- [x] Games can be played and saved
- [x] No errors in browser console
- [x] No errors in CloudWatch logs

## Next Steps

After successful deployment:

1. **Test thoroughly**
   - Create multiple users
   - Play multiple games
   - Test different themes and difficulties
   - Test rate limiting

2. **Build remaining features**
   - Leaderboard Service
   - Payment Service (Stripe)
   - CMS Service
   - Admin Service

3. **Set up CI/CD**
   - GitHub Actions
   - Automated testing
   - Automated deployments

4. **Deploy to production**
   - Use `--context environment=prod`
   - Set up custom domain
   - Configure production settings

## Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **AppSync Documentation**: https://docs.aws.amazon.com/appsync/
- **Cognito Documentation**: https://docs.aws.amazon.com/cognito/

## Notes

Use this space for deployment-specific notes:

```
Date: _______________
Deployed by: _______________
Environment: dev
Region: us-east-1

Issues encountered:


Resolutions:


```
