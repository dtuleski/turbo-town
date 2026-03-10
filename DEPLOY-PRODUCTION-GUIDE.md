# Quick Guide: Deploy Production Environment

## TL;DR - Current State

**You are running EVERYTHING in DEV mode:**
- ✅ Backend: All AWS resources have `-dev` suffix
- ✅ Frontend: turbo-town.com points to dev backend
- ✅ Stripe: Test mode (sandbox) - that's why you see "sandbox"
- ✅ Infrastructure: Already configured for prod, just not deployed yet

**To go to production, you need to:**
1. Deploy production backend (30 min)
2. Activate Stripe live mode (20 min)
3. Update frontend to use prod backend (10 min)
4. Deploy frontend to production (5 min)

---

## Option 1: Keep Dev Setup (Recommended for Now)

**If you're still testing and building features:**

Just keep everything as-is! The "sandbox" label in Stripe is normal for test mode. You can:
- Continue building new games
- Test Stripe with fake credit cards
- Deploy changes to turbo-town.com (still using dev backend)
- No real money involved

**When to go to production:**
- When you're ready for real users
- When you want to accept real payments
- When you need production-grade monitoring

---

## Option 2: Deploy Production (When Ready)

### Prerequisites

Before deploying production:

1. **Stripe Account Ready**
   - Business verification completed
   - Bank account connected
   - Ready to accept real payments

2. **Domain Strategy Decided**
   - Option A: turbo-town.com → prod, dev.turbo-town.com → dev
   - Option B: turbo-town.com → prod, localhost → dev

3. **Backup Strategy**
   - Decide on DynamoDB backup frequency
   - Set up CloudWatch alarms

### Step 1: Deploy Production Backend (30 minutes)

```bash
cd infrastructure

# 1. Create production environment variables
cat > .env.prod << 'EOF'
CDK_DEFAULT_ACCOUNT=848403890404
CDK_DEFAULT_REGION=us-east-1

# Stripe - Start with test keys, switch to live later
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXX
STRIPE_BASIC_PRICE_ID=price_1T8TJYD1222JoXRH79EkciO2
STRIPE_PREMIUM_PRICE_ID=price_1T8TK0D1222JoXRHR0kLMCl5

# Frontend URL
FRONTEND_URL=https://turbo-town.com

# Monitoring
ALERT_EMAIL=diego.tuleski@example.com
EOF

# 2. Build Lambda functions
npm run build:lambdas

# 3. Deploy all production stacks
npm run deploy:prod

# This will deploy:
# - MemoryGame-Database-prod (DynamoDB tables)
# - MemoryGame-Cognito-prod (User pool)
# - MemoryGame-EventBridge-prod (Event bus)
# - MemoryGame-Lambda-prod (Lambda functions)
# - MemoryGame-API-prod (API Gateway)
# - MemoryGame-Monitoring-prod (CloudWatch)
```

**Expected output:**
```
✅ MemoryGame-Database-prod
   - UsersTable: memory-game-users-prod
   - GamesTable: memory-game-games-prod
   - ... (all tables)

✅ MemoryGame-Cognito-prod
   - UserPoolId: us-east-1_XXXXXXX
   - UserPoolClientId: XXXXXXXXXXXXXXXXXX
   - UserPoolDomain: memory-game-prod

✅ MemoryGame-API-prod
   - ApiEndpoint: https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com
   - AuthEndpoint: https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/auth/graphql
   - GameEndpoint: https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/game/graphql
```

**Save these outputs!** You'll need them for the frontend.

### Step 2: Seed Production Data (5 minutes)

```bash
# Update seed scripts to use prod environment
cd ..

# Seed game catalog
./seed-game-catalog.sh prod

# Seed themes
./seed-themes.sh prod

# Verify data
aws dynamodb scan --table-name memory-game-catalog-prod --region us-east-1
```

### Step 3: Configure Production Frontend (10 minutes)

```bash
cd apps/web

# Create production environment file
cat > .env.production << 'EOF'
# AWS Cognito Configuration (from CDK output)
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=<PASTE_FROM_CDK_OUTPUT>
VITE_COGNITO_CLIENT_ID=<PASTE_FROM_CDK_OUTPUT>
VITE_COGNITO_DOMAIN=memory-game-prod

# API Configuration (from CDK output)
VITE_AUTH_ENDPOINT=<PASTE_AUTH_ENDPOINT_FROM_CDK_OUTPUT>
VITE_GAME_ENDPOINT=<PASTE_GAME_ENDPOINT_FROM_CDK_OUTPUT>

# Environment
VITE_ENV=production
EOF

# Test build
npm run build

# Verify it works
npm run preview
```

### Step 4: Deploy Production Frontend (5 minutes)

**Option A: Create production branch (recommended)**
```bash
# Create production branch
git checkout -b production
git add apps/web/.env.production
git commit -m "Add production environment configuration"
git push origin production

# Configure your hosting service:
# - 'main' branch → dev.turbo-town.com (or keep as-is)
# - 'production' branch → turbo-town.com
```

**Option B: Manual deployment**
```bash
# Build production bundle
cd apps/web
npm run build

# Deploy to hosting (depends on your setup)
# If using S3:
aws s3 sync dist/ s3://turbo-town-prod --delete
aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/*"
```

### Step 5: Activate Stripe Live Mode (20 minutes)

**Only do this when ready for real payments!**

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com
2. **Toggle to Live Mode** (top right corner)
3. **Complete business verification** (if not done)
4. **Create live products**:
   ```bash
   # In Stripe Dashboard:
   # Products → Create product
   # - Name: "DashDen Basic"
   # - Price: $1.99/month
   # - Copy the price ID (starts with price_)
   
   # - Name: "DashDen Premium"  
   # - Price: $4.99/month
   # - Copy the price ID
   ```

5. **Get live API keys**:
   - Dashboard → Developers → API keys
   - Copy "Publishable key" (pk_live_...)
   - Copy "Secret key" (sk_live_...)

6. **Update production backend**:
   ```bash
   cd infrastructure
   
   # Update .env.prod with live keys
   nano .env.prod
   # Replace STRIPE_SECRET_KEY with sk_live_...
   # Replace price IDs with live price IDs
   
   # Redeploy Lambda with new keys
   npm run deploy:prod
   ```

7. **Setup webhook**:
   - Dashboard → Developers → Webhooks
   - Add endpoint: `<prod-api-gateway-url>/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.*`
   - Copy webhook secret (whsec_...)
   - Add to `.env.prod` and redeploy

---

## Verification Checklist

After deploying production:

### Backend Verification
```bash
# Check Lambda functions exist
aws lambda list-functions --region us-east-1 | grep prod

# Check DynamoDB tables exist
aws dynamodb list-tables --region us-east-1 | grep prod

# Check Cognito user pool
aws cognito-idp list-user-pools --max-results 10 --region us-east-1 | grep prod

# Test API endpoint
curl <prod-api-gateway-url>/health
```

### Frontend Verification
- [ ] Can access turbo-town.com
- [ ] Can register new account
- [ ] Can login
- [ ] Can play games
- [ ] Can see game catalog
- [ ] Stripe checkout works (test mode first!)

### Stripe Verification
- [ ] Checkout redirects to Stripe
- [ ] Can complete test payment (use 4242 4242 4242 4242)
- [ ] Subscription appears in DynamoDB
- [ ] User gets upgraded tier
- [ ] Webhook events are received

---

## Cost Estimate

**Monthly AWS costs for production:**

| Service | Dev | Prod | Notes |
|---------|-----|------|-------|
| Lambda | $5 | $10-30 | Depends on traffic |
| DynamoDB | $5 | $10-50 | Depends on data size |
| API Gateway | $3 | $5-20 | Depends on requests |
| CloudWatch | $2 | $5-10 | More detailed monitoring |
| Cognito | Free | Free | First 50k MAU free |
| **Total** | **$15** | **$30-110** | Scales with usage |

**Stripe fees:**
- 2.9% + $0.30 per transaction
- No monthly fee

---

## Rollback Plan

If something goes wrong:

```bash
# 1. Point domain back to dev
# Update DNS or hosting config

# 2. Destroy production stack (if needed)
cd infrastructure
npm run destroy:prod

# 3. Keep using dev environment
# No data loss, dev is untouched
```

---

## My Recommendation

**For now: Stay in dev mode**

Reasons:
1. You're still building features (car game, etc.)
2. No real users yet
3. Stripe test mode is perfect for development
4. Save production deployment for when you're ready to launch

**When to deploy production:**
1. All features are complete and tested
2. You're ready to market the app
3. You want to accept real payments
4. You have a support plan for users

**The "sandbox" label is normal** - it just means you're using Stripe test mode, which is exactly what you want during development!

---

## Questions?

Let me know:
1. Do you want to deploy production now?
2. Or keep developing in dev mode?
3. Any specific concerns about the architecture?

I can help with either path!
