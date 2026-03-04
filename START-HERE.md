# 🚀 Start Here: Deploy Your Backend

Welcome! You're about to connect your working frontend to the real backend services.

## What You Have Now

✅ **Frontend**: Fully functional memory game running at http://localhost:3000  
✅ **Backend Code**: Auth and Game services implemented  
❌ **Not Connected**: Frontend uses mock data, backend not deployed  

## What You'll Get

After following this guide:
- Real user authentication with AWS Cognito
- Games saved to DynamoDB
- GraphQL API for all operations
- Production-ready infrastructure

## Time Required

- **First time**: 60-90 minutes
- **Subsequent deploys**: 15-20 minutes

## Choose Your Path

### 🎯 Path 1: Quick Deploy (Recommended)
**Best for**: Getting it working fast

1. Read: `QUICK-DEPLOY.md`
2. Run: `./deploy-backend.sh dev`
3. Run: `./configure-frontend.sh`
4. Test your app!

**Time**: ~20 minutes (after AWS setup)

### 📚 Path 2: Detailed Guide
**Best for**: Understanding each step

1. Read: `BACKEND-DEPLOYMENT-QUICKSTART.md`
2. Follow step-by-step instructions
3. Use: `DEPLOYMENT-CHECKLIST.md` to track progress

**Time**: ~60-90 minutes (includes learning)

## Prerequisites

Before you start, you need:

1. **AWS Account** (free tier is fine)
   - Sign up at: https://aws.amazon.com
   - You'll need a credit card (but won't be charged much)

2. **AWS Access Keys**
   - Log into AWS Console
   - Go to: IAM → Users → Your User → Security Credentials
   - Create Access Key → CLI
   - Save the Access Key ID and Secret Access Key

3. **Install Tools** (one-time setup)
   ```bash
   # Install AWS CLI
   brew install awscli
   
   # Install AWS CDK
   npm install -g aws-cdk
   
   # Configure AWS credentials
   aws configure
   ```

## Quick Start (3 Commands)

Once prerequisites are done:

```bash
# 1. Deploy backend to AWS (15-20 min)
./deploy-backend.sh dev

# 2. Configure frontend with deployed values (30 sec)
./configure-frontend.sh

# 3. Restart your frontend (already running)
cd apps/web && npm run dev
```

Then test at http://localhost:3000:
- Register a new user
- Verify email
- Login
- Play a game
- Check it saves!

## What Gets Deployed

Your deployment creates:

1. **8 DynamoDB Tables**
   - Users, Games, Leaderboards, Subscriptions, Themes, Achievements, RateLimits, UserSettings

2. **AWS Cognito**
   - User Pool for authentication
   - Email verification
   - Password reset

3. **2 Lambda Functions**
   - Auth Service (login, register, profile)
   - Game Service (start game, complete game, history)

4. **AppSync GraphQL API**
   - Single endpoint for all operations
   - Automatic scaling
   - Built-in monitoring

5. **CloudWatch Monitoring**
   - Logs for debugging
   - Alarms for errors
   - Metrics for performance

## Cost Estimate

**Development environment**: ~$1-8/month

Most services are covered by AWS free tier:
- Lambda: 1M requests/month free
- DynamoDB: 25GB storage free
- Cognito: 50k users free
- AppSync: 250k queries/month free

You'll only pay for usage beyond free tier (minimal for dev).

## Troubleshooting

### "I don't have AWS credentials"
1. Go to: https://console.aws.amazon.com
2. Sign in or create account
3. Go to: IAM → Users → Your User → Security Credentials
4. Create Access Key → CLI
5. Run: `aws configure` and enter the keys

### "Command not found: aws"
```bash
brew install awscli
```

### "Command not found: cdk"
```bash
npm install -g aws-cdk
```

### "Deployment failed"
Check the detailed error in terminal, then:
1. Read: `DEPLOYMENT-CHECKLIST.md` → Troubleshooting section
2. Check: CloudWatch logs for Lambda errors
3. Verify: AWS credentials are correct

### "Frontend can't connect"
```bash
# Reconfigure frontend
./configure-frontend.sh

# Check the file was created
cat apps/web/.env.local

# Restart dev server
cd apps/web && npm run dev
```

## Documents Reference

| Document | Purpose | When to Use |
|----------|---------|-------------|
| `START-HERE.md` | Overview and getting started | **Start here!** |
| `QUICK-DEPLOY.md` | Fast deployment reference | Quick commands |
| `BACKEND-DEPLOYMENT-QUICKSTART.md` | Detailed step-by-step guide | First deployment |
| `DEPLOYMENT-CHECKLIST.md` | Track your progress | During deployment |
| `deploy-backend.sh` | Automated deployment script | Run this to deploy |
| `configure-frontend.sh` | Frontend configuration script | After deployment |

## Next Steps After Deployment

Once your backend is deployed and working:

1. **Test Thoroughly**
   - Create multiple users
   - Play games with different themes
   - Test rate limiting
   - Check game history

2. **Build More Features** (optional)
   - Leaderboard Service
   - Payment Service (Stripe subscriptions)
   - CMS Service (theme management)
   - Admin Dashboard

3. **Deploy to Production**
   - Use `./deploy-backend.sh prod`
   - Set up custom domain
   - Configure production settings

## Support

If you get stuck:

1. **Check the docs**
   - `DEPLOYMENT-CHECKLIST.md` has detailed troubleshooting
   - `BACKEND-DEPLOYMENT-QUICKSTART.md` has step-by-step help

2. **Check AWS Console**
   - CloudFormation: See deployment status
   - CloudWatch: See logs and errors
   - Lambda: Test functions directly

3. **Check your terminal**
   - Deployment script shows detailed progress
   - Error messages usually indicate the problem

## Ready to Start?

1. ✅ Have AWS account? → Yes
2. ✅ Have AWS credentials? → Yes
3. ✅ Installed AWS CLI and CDK? → Yes

**Then run:**
```bash
./deploy-backend.sh dev
```

**Don't have prerequisites?** → Read `BACKEND-DEPLOYMENT-QUICKSTART.md` Phase 1

---

**Good luck! You're about to have a fully working backend! 🎉**
