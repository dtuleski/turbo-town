# Quick Setup: dashden.app Domain

## What We Found

Your `turbo-town.com` is hosted on **CloudFront + S3**, but the infrastructure is NOT in your AWS account (848403890404). This means it's managed by a third-party service like:
- Vercel
- Netlify  
- AWS Amplify (different account)
- Or another hosting platform

## Immediate Action Plan

### Step 1: Find Your Hosting Service (5 minutes)

**Check GitHub Repository Settings:**

1. Go to: https://github.com/dtuleski/turbo-town
2. Click "Settings" tab
3. Check these sections:
   - **Pages**: Look for GitHub Pages configuration
   - **Environments**: Look for deployment environments
   - **Webhooks**: Look for deployment webhooks (Vercel/Netlify)
   - **Integrations**: Look for installed apps

**Or check these dashboards:**
- Vercel: https://vercel.com/dashboard
- Netlify: https://app.netlify.com/
- AWS Amplify Console: https://console.aws.amazon.com/amplify/

**Tell me which service you find!**

---

### Step 2: Configure DNS in Squarespace (10 minutes)

Once we know the hosting service, you'll add DNS records. Here's what you'll likely need:

#### If Using Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add domains:
   - `dashden.app`
   - `www.dashden.app`
   - `dev.dashden.app`
3. Vercel will show you DNS records like:

```
For dashden.app:
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME  
Name: www
Value: cname.vercel-dns.com
```

4. Add these records in Squarespace DNS Settings

#### If Using Netlify:

1. Go to Netlify Dashboard → Your Site → Domain Settings
2. Add custom domains:
   - `dashden.app`
   - `dev.dashden.app`
3. Netlify will show DNS records
4. Add them in Squarespace

#### If Using AWS Amplify:

1. Find the Amplify app (might be in a different AWS account)
2. Add custom domains in Amplify Console
3. Follow Amplify's DNS instructions

---

### Step 3: Update Frontend Code (15 minutes)

While DNS propagates, let's update the code:

```bash
cd apps/web

# Update .env.local for development
cat > .env.local << 'EOF'
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
EOF

# Test build
npm run build
```

---

### Step 4: Update Backend CORS (10 minutes)

Your Lambda functions need to allow the new domains:

```bash
# Update Auth Service
cd services/auth/src

# Edit index.ts - find allowedOrigins and update:
```

```typescript
const allowedOrigins = [
  'https://dashden.app',
  'https://www.dashden.app',
  'https://dev.dashden.app',
  'http://localhost:5173',
];
```

```bash
# Update Game Service
cd ../../game/src

# Edit index.ts - same change
```

**Deploy the changes:**

```bash
cd ../../../infrastructure
npm run deploy:dev
```

---

### Step 5: Deploy Frontend (5 minutes)

```bash
cd apps/web

# Commit changes
git add .
git commit -m "Update domain to dashden.app"
git push origin main

# Your hosting service will auto-deploy
# Wait 2-3 minutes
```

---

### Step 6: Test (5 minutes)

Once DNS propagates (can take 5-60 minutes):

```bash
# Check DNS
dig dev.dashden.app
dig dashden.app

# Test in browser
open https://dev.dashden.app
```

**Test checklist:**
- [ ] Can access dev.dashden.app
- [ ] Can login
- [ ] Can play games
- [ ] No CORS errors in console

---

## For Production Environment

After dev is working, we'll:

1. Deploy production backend (`npm run deploy:prod`)
2. Create `.env.production` with prod backend URLs
3. Configure `dashden.app` to use production backend
4. Test production

---

## Simplified Architecture

```
Current State (turbo-town.com):
┌──────────────────┐
│ turbo-town.com   │ → CloudFront → S3 → Dev Backend
└──────────────────┘

Target State:
┌──────────────────┐
│ dev.dashden.app  │ → CloudFront → S3 → Dev Backend
└──────────────────┘

┌──────────────────┐
│ dashden.app      │ → CloudFront → S3 → Prod Backend (to be deployed)
└──────────────────┘
```

---

## What You Need to Tell Me

1. **Which hosting service is turbo-town.com using?**
   - Check GitHub settings
   - Check Vercel/Netlify dashboards
   - Or tell me if you don't know

2. **Do you want to:**
   - A) Just update dev to use dev.dashden.app (keep using dev backend)
   - B) Deploy production backend AND set up dashden.app
   - C) Both (recommended)

Once you tell me the hosting service, I'll give you exact DNS records to add in Squarespace!

---

## Quick Commands to Run Now

```bash
# 1. Check GitHub for deployment info
# Go to: https://github.com/dtuleski/turbo-town/settings

# 2. Check if you have Vercel CLI
vercel whoami

# 3. Check if you have Netlify CLI
netlify status

# 4. Update app name in code
cd apps/web/src/config
# Edit constants.ts - change APP_NAME to 'DashDen'
```

Let me know what you find and I'll guide you through the exact steps!
