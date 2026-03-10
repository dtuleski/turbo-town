# Domain Setup Guide: dashden.app

## Overview

**New Domain Strategy:**
- **Production**: `dashden.app` → Production backend
- **Development**: `dev.dashden.app` → Development backend
- **Old Domain**: `turbo-town.com` → Will be deprecated

---

## Step 1: Configure DNS in Squarespace (5 minutes)

You need to find out where your frontend is hosted first. Based on your current setup, it's likely S3 + CloudFront or a hosting service.

### Option A: If Using CloudFront (Most Likely)

**1.1 Find Your CloudFront Distribution**

```bash
# Check if you have CloudFront distributions
aws cloudfront list-distributions --query "DistributionList.Items[*].[Id,DomainName,Origins.Items[0].DomainName]" --output table
```

**1.2 Get CloudFront Domain Name**

You'll see something like: `d1234567890abc.cloudfront.net`

**1.3 Configure DNS in Squarespace**

Go to Squarespace DNS Settings and add these records:

```
Production (dashden.app):
┌──────────┬────────┬──────────┬─────────────────────────────────────┐
│ HOST     │ TYPE   │ PRIORITY │ DATA                                │
├──────────┼────────┼──────────┼─────────────────────────────────────┤
│ @        │ CNAME  │ 0        │ <cloudfront-domain>.cloudfront.net  │
│ www      │ CNAME  │ 0        │ <cloudfront-domain>.cloudfront.net  │
└──────────┴────────┴──────────┴─────────────────────────────────────┘

Development (dev.dashden.app):
┌──────────┬────────┬──────────┬─────────────────────────────────────┐
│ HOST     │ TYPE   │ PRIORITY │ DATA                                │
├──────────┼────────┼──────────┼─────────────────────────────────────┤
│ dev      │ CNAME  │ 0        │ <cloudfront-domain>.cloudfront.net  │
└──────────┴────────┴──────────┴─────────────────────────────────────┘
```

**Note**: If you have separate CloudFront distributions for dev/prod, use different domain names.

### Option B: If Using Vercel/Netlify

**Check your hosting service:**

1. Go to your hosting dashboard (Vercel/Netlify)
2. Find the project
3. Go to Domain settings
4. Add custom domains:
   - `dashden.app`
   - `dev.dashden.app`
5. The service will give you DNS records to add in Squarespace

---

## Step 2: Find Your Current Hosting Setup (IMPORTANT)

Let's identify where turbo-town.com is currently hosted:

```bash
# Check DNS records for turbo-town.com
dig turbo-town.com
dig www.turbo-town.com

# Check for CloudFront
aws cloudfront list-distributions --region us-east-1 | grep -i turbo

# Check for S3 buckets
aws s3 ls | grep -i turbo

# Check for Amplify apps
aws amplify list-apps --region us-east-1

# Check GitHub repository settings
# Go to: https://github.com/dtuleski/turbo-town/settings
# Look for: Pages, Environments, or Webhooks
```

**Run these commands and tell me the results so I can give you exact instructions!**

---

## Step 3: Update Frontend Configuration

### 3.1 Update Environment Files

**For Development (`apps/web/.env.local`):**
```bash
# AWS Cognito Configuration
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_jPkMWmBup
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_DOMAIN=memory-game-dev

# API Configuration - DEV BACKEND
VITE_AUTH_ENDPOINT=https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/auth/graphql
VITE_GAME_ENDPOINT=https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/game/graphql

# App Configuration
VITE_APP_NAME=DashDen
VITE_APP_URL=https://dev.dashden.app
VITE_ENV=development
```

**For Production (`apps/web/.env.production`):**
```bash
# AWS Cognito Configuration (will be different after prod deployment)
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=<PROD_USER_POOL_ID>
VITE_COGNITO_CLIENT_ID=<PROD_CLIENT_ID>
VITE_COGNITO_DOMAIN=memory-game-prod

# API Configuration - PROD BACKEND (to be deployed)
VITE_AUTH_ENDPOINT=<PROD_API_GATEWAY_URL>/auth/graphql
VITE_GAME_ENDPOINT=<PROD_API_GATEWAY_URL>/game/graphql

# App Configuration
VITE_APP_NAME=DashDen
VITE_APP_URL=https://dashden.app
VITE_ENV=production
```

### 3.2 Update App Name in Code

```bash
# Update constants
cat > apps/web/src/config/constants.ts << 'EOF'
export const APP_NAME = 'DashDen'

export const ROUTES = {
  HOME: '/',
  HUB: '/hub',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  GAME: '/game',
  GAME_SETUP: '/game/setup',
  MATH_SETUP: '/math/setup',
  MATH_GAME: '/math/game',
  WORD_PUZZLE_SETUP: '/word-puzzle/setup',
  WORD_PUZZLE_GAME: '/word-puzzle/game',
  RATE_LIMIT: '/rate-limit',
  SUBSCRIPTION: '/subscription',
  DASHBOARD: '/dashboard',
  STATISTICS: '/dashboard/statistics',
  HISTORY: '/dashboard/history',
  ACHIEVEMENTS: '/dashboard/achievements',
  PROFILE: '/profile',
  ADMIN: '/admin',
} as const

export const GAME_THEMES = [
  { id: 'ANIMALS', name: 'Animals', emoji: '🐶' },
  { id: 'FRUITS', name: 'Fruits', emoji: '🍎' },
  { id: 'VEHICLES', name: 'Vehicles', emoji: '🚗' },
  { id: 'SPACE', name: 'Space', emoji: '🚀' },
  { id: 'OCEAN', name: 'Ocean', emoji: '🐠' },
  { id: 'FORMULA1', name: 'Formula 1', emoji: '🏎️' },
] as const

export const DIFFICULTY_LEVELS = [
  { id: 'EASY', name: 'Easy', pairs: 6, description: '6 pairs - Perfect for beginners' },
  { id: 'MEDIUM', name: 'Medium', pairs: 8, description: '8 pairs - A good challenge' },
  { id: 'HARD', name: 'Hard', pairs: 10, description: '10 pairs - For memory masters' },
] as const

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  GAME_SETTINGS: 'game_settings',
} as const

export const QUERY_KEYS = {
  USER: 'user',
  GAME: 'game',
  GAME_HISTORY: 'game_history',
  STATISTICS: 'statistics',
  ACHIEVEMENTS: 'achievements',
} as const
EOF
```

---

## Step 4: Deploy Production Backend (30 minutes)

Now let's deploy the production backend with the new domain:

### 4.1 Update Infrastructure Configuration

```bash
cd infrastructure

# Create production environment file
cat > .env.prod << 'EOF'
CDK_DEFAULT_ACCOUNT=848403890404
CDK_DEFAULT_REGION=us-east-1

# Stripe - Start with test keys, switch to live later
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXX
STRIPE_BASIC_PRICE_ID=price_1T8TJYD1222JoXRH79EkciO2
STRIPE_PREMIUM_PRICE_ID=price_1T8TK0D1222JoXRHR0kLMCl5

# Frontend URLs
FRONTEND_URL=https://dashden.app
DEV_FRONTEND_URL=https://dev.dashden.app

# Monitoring
ALERT_EMAIL=diego.tuleski@example.com
EOF
```

### 4.2 Deploy Production Stack

```bash
# Build Lambda functions
npm run build:lambdas

# Deploy production
npm run deploy:prod

# Save the outputs! You'll need:
# - UserPoolId
# - UserPoolClientId
# - ApiEndpoint
# - AuthEndpoint
# - GameEndpoint
```

### 4.3 Seed Production Data

```bash
cd ..

# Update seed scripts to use prod
# Seed game catalog
aws dynamodb put-item \
  --table-name memory-game-catalog-prod \
  --item file://seed-data/game-catalog.json \
  --region us-east-1

# Seed themes
aws dynamodb batch-write-item \
  --request-items file://seed-data/themes.json \
  --region us-east-1
```

---

## Step 5: Update Backend CORS Settings

Your Lambda functions need to allow requests from the new domains:

### 5.1 Update Auth Service CORS

Edit `services/auth/src/index.ts`:

```typescript
const allowedOrigins = [
  'https://dashden.app',
  'https://www.dashden.app',
  'https://dev.dashden.app',
  'http://localhost:5173',
  'http://localhost:3000',
];
```

### 5.2 Update Game Service CORS

Edit `services/game/src/index.ts`:

```typescript
const allowedOrigins = [
  'https://dashden.app',
  'https://www.dashden.app',
  'https://dev.dashden.app',
  'http://localhost:5173',
  'http://localhost:3000',
];
```

### 5.3 Redeploy Lambda Functions

```bash
cd infrastructure
npm run deploy:prod
npm run deploy:dev  # Update dev too
```

---

## Step 6: Update Stripe Configuration

### 6.1 Update Stripe Success/Cancel URLs

In `services/game/src/services/stripe.service.ts`, the URLs are already using `process.env.FRONTEND_URL`, so they'll automatically use the new domain after redeployment.

### 6.2 Update Stripe Webhook Endpoint

1. Go to Stripe Dashboard: https://dashboard.stripe.com
2. Developers → Webhooks
3. Update webhook endpoint URL to use new API Gateway URL
4. Or add new webhook for production

---

## Step 7: Deploy Frontend to New Domains

### Option A: Using GitHub Branches (Recommended)

**7.1 Create separate branches:**

```bash
# Create production branch
git checkout -b production
git push origin production

# Keep main for development
git checkout main
```

**7.2 Configure your hosting service:**

If using Vercel/Netlify:
- `main` branch → `dev.dashden.app`
- `production` branch → `dashden.app`

**7.3 Set environment variables in hosting service:**

For `main` branch (dev):
- Use `.env.local` values
- Set `VITE_APP_URL=https://dev.dashden.app`

For `production` branch (prod):
- Use `.env.production` values
- Set `VITE_APP_URL=https://dashden.app`

### Option B: Using CloudFront + S3

**7.1 Create two CloudFront distributions:**

```bash
# This requires AWS CDK or manual setup
# I can help you create a CDK stack for this
```

---

## Step 8: SSL Certificates

### 8.1 Request SSL Certificates in AWS Certificate Manager

```bash
# Request certificate for production
aws acm request-certificate \
  --domain-name dashden.app \
  --subject-alternative-names www.dashden.app \
  --validation-method DNS \
  --region us-east-1

# Request certificate for development
aws acm request-certificate \
  --domain-name dev.dashden.app \
  --validation-method DNS \
  --region us-east-1
```

### 8.2 Validate Certificates

1. AWS will provide CNAME records
2. Add these records to Squarespace DNS
3. Wait for validation (5-30 minutes)

### 8.3 Attach Certificates to CloudFront

Once validated, attach the certificates to your CloudFront distributions.

---

## Step 9: Testing Checklist

### Test Development Environment (dev.dashden.app)

- [ ] Can access dev.dashden.app
- [ ] Can register new account
- [ ] Can login
- [ ] Can play memory game
- [ ] Can play math challenge
- [ ] Can play word puzzle
- [ ] Stripe checkout works (test mode)
- [ ] Admin dashboard accessible

### Test Production Environment (dashden.app)

- [ ] Can access dashden.app
- [ ] Can register new account
- [ ] Can login
- [ ] Can play all games
- [ ] Stripe checkout works
- [ ] All features working

---

## Step 10: Update Documentation

Update all references from turbo-town.com to dashden.app:

```bash
# Find all references
grep -r "turbo-town" . --exclude-dir=node_modules --exclude-dir=.git

# Update README
# Update deployment guides
# Update environment files
```

---

## Quick Start: Immediate Next Steps

**Right now, do this:**

1. **Find your hosting setup:**
   ```bash
   dig turbo-town.com
   aws cloudfront list-distributions --region us-east-1
   ```

2. **Tell me the results** so I can give you exact DNS records to add in Squarespace

3. **Once we know the hosting:**
   - I'll give you exact DNS records
   - We'll deploy production backend
   - We'll configure the domains
   - We'll test everything

---

## Architecture After Setup

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT                               │
├─────────────────────────────────────────────────────────────┤
│  Domain: dev.dashden.app                                    │
│  Backend: MemoryGame-*-dev (current)                        │
│  Cognito: MemoryGame-UserPool-dev                           │
│  DynamoDB: memory-game-*-dev                                │
│  Stripe: Test mode                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION                                │
├─────────────────────────────────────────────────────────────┤
│  Domain: dashden.app                                        │
│  Backend: MemoryGame-*-prod (to be deployed)                │
│  Cognito: MemoryGame-UserPool-prod (to be created)         │
│  DynamoDB: memory-game-*-prod (to be created)               │
│  Stripe: Test mode → Live mode (later)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Need Help?

Run these commands and share the output:

```bash
# 1. Check current DNS
dig turbo-town.com

# 2. Check CloudFront
aws cloudfront list-distributions --query "DistributionList.Items[*].[Id,DomainName,Aliases.Items]" --output table

# 3. Check S3 buckets
aws s3 ls | grep -i turbo

# 4. Check GitHub settings
# Go to: https://github.com/dtuleski/turbo-town/settings
# Screenshot the Pages/Environments section
```

Once I know your hosting setup, I'll give you exact step-by-step instructions!
