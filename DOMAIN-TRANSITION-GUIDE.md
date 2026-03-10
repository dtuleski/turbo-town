# Domain Transition Guide: DashDen.app

## Overview

This guide will help you transition from your current domain setup to:
- **Development**: `dev.dashden.app` 
- **Production**: `dashden.app`

## Current Status

✅ **Backend Configuration Updated**
- Environment configs updated with new domains
- CORS settings updated to allow new domains
- Production environment configuration created

## Next Steps

### Step 1: Deploy Updated Backend (5 minutes)

The backend services have been updated with CORS settings for the new domains. Deploy these changes:

```bash
cd infrastructure

# Build the updated services
npm run build:lambdas

# Deploy to dev environment
npm run deploy:dev
```

### Step 2: Configure DNS in Squarespace (10 minutes)

You'll need to add DNS records in your Squarespace domain settings for `dashden.app`:

#### For Development (dev.dashden.app)
```
Type: CNAME
Name: dev
Value: <your-hosting-service-domain>
```

#### For Production (dashden.app)
```
Type: A
Name: @
Value: <your-hosting-service-ip>

Type: CNAME
Name: www
Value: <your-hosting-service-domain>
```

**Note**: The exact values depend on your hosting service (Vercel, Netlify, etc.). We need to identify your current hosting service first.

### Step 3: Identify Your Current Hosting Service

Check these locations to find where `turbo-town.com` is currently hosted:

1. **GitHub Repository Settings**:
   - Go to: https://github.com/dtuleski/turbo-town/settings
   - Check "Pages" section
   - Check "Environments" section
   - Check "Webhooks" for deployment services

2. **Check Common Hosting Dashboards**:
   - Vercel: https://vercel.com/dashboard
   - Netlify: https://app.netlify.com/
   - AWS Amplify: https://console.aws.amazon.com/amplify/

3. **Command Line Check**:
   ```bash
   # Check if you have Vercel CLI
   vercel whoami
   
   # Check if you have Netlify CLI  
   netlify status
   ```

### Step 4: Update Hosting Service Configuration

Once you identify your hosting service, you'll need to:

#### If Using Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add domains:
   - `dashden.app`
   - `www.dashden.app` 
   - `dev.dashden.app`
3. Vercel will provide DNS records to add in Squarespace

#### If Using Netlify:
1. Go to Netlify Dashboard → Your Site → Domain Settings
2. Add custom domains:
   - `dashden.app`
   - `dev.dashden.app`
3. Netlify will provide DNS records to add in Squarespace

#### If Using AWS Amplify:
1. Find the Amplify app in AWS Console
2. Add custom domains in Amplify Console
3. Follow Amplify's DNS instructions

### Step 5: Deploy Production Backend (15 minutes)

Once dev is working, deploy production infrastructure:

```bash
cd infrastructure

# Deploy production environment
npm run deploy:prod
```

This will create:
- Production Cognito User Pool
- Production DynamoDB tables
- Production Lambda functions
- Production API Gateway

### Step 6: Update Production Environment Variables

After production deployment, update the production environment file with real values:

```bash
# Get production API Gateway URL
aws cloudformation describe-stacks \
  --stack-name MemoryGame-API-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text

# Get production Cognito details
aws cloudformation describe-stacks \
  --stack-name MemoryGame-Cognito-prod \
  --query 'Stacks[0].Outputs'
```

Then update `apps/web/.env.production` with the real values.

### Step 7: Test Both Environments

#### Test Development:
```bash
cd apps/web
npm run dev
# Test at http://localhost:5173 (should connect to dev backend)
```

#### Test Production:
```bash
cd apps/web
npm run build
npm run preview
# Test production build locally
```

## Environment Architecture

```
Development Flow:
dev.dashden.app → CloudFront/CDN → Dev Backend (AWS Lambda + DynamoDB)

Production Flow:
dashden.app → CloudFront/CDN → Prod Backend (AWS Lambda + DynamoDB)
```

## Configuration Summary

### Frontend Environment Variables

**Development (.env.local)**:
- `VITE_APP_URL=https://dev.dashden.app`
- `VITE_ENV=development`
- Points to dev backend APIs

**Production (.env.production)**:
- `VITE_APP_URL=https://dashden.app`
- `VITE_ENV=production`
- Points to prod backend APIs

### Backend CORS Configuration

Both auth and game services now allow:
- `https://dashden.app`
- `https://www.dashden.app`
- `https://dev.dashden.app`
- `https://turbo-town.com` (transition period)
- Local development URLs

## Rollback Plan

If you need to rollback:

1. **Keep current turbo-town.com working** (no changes needed)
2. **Revert CORS settings** if needed:
   ```bash
   git checkout HEAD~1 -- services/auth/src/index.ts services/game/src/index.ts
   npm run deploy:dev
   ```

## What You Need to Tell Me

1. **Which hosting service is turbo-town.com using?**
   - Check GitHub settings or hosting dashboards
   
2. **Do you want to:**
   - A) Set up dev.dashden.app first (recommended)
   - B) Set up both dev and production simultaneously
   - C) Just production dashden.app

Once you identify the hosting service, I'll provide exact DNS records and deployment steps!

## Quick Commands

```bash
# Deploy updated backend
cd infrastructure && npm run deploy:dev

# Check current hosting
vercel whoami
netlify status

# Test DNS resolution (after DNS changes)
dig dev.dashden.app
dig dashden.app

# Check deployed stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE
```

Let me know what hosting service you find, and I'll guide you through the exact DNS configuration steps!