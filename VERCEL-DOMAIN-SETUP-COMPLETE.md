# Complete Vercel Domain Setup for DashDen.app

## Current Status ✅

**Backend Configuration Updated:**
- Environment configs updated with new domains
- CORS settings updated to allow new domains  
- Production environment configuration created
- Hosting service identified: **Vercel**

## Step-by-Step Domain Setup

### Step 1: Access Your Vercel Dashboard (2 minutes)

1. Go to: https://vercel.com/dashboard
2. Find your `turbo-town` project
3. Click on the project to open it

### Step 2: Add New Domains in Vercel (5 minutes)

1. In your project dashboard, click **"Settings"** tab
2. Click **"Domains"** in the left sidebar
3. Add these domains one by one:

#### Add Development Domain:
- Click **"Add Domain"**
- Enter: `dev.dashden.app`
- Click **"Add"**

#### Add Production Domain:
- Click **"Add Domain"**  
- Enter: `dashden.app`
- Click **"Add"**

#### Add WWW Redirect:
- Click **"Add Domain"**
- Enter: `www.dashden.app`
- Click **"Add"**
- Set it to redirect to `dashden.app`

### Step 3: Get DNS Records from Vercel (1 minute)

After adding each domain, Vercel will show you DNS records. They'll look like:

**For dashden.app:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For dev.dashden.app:**
```
Type: CNAME
Name: dev
Value: cname.vercel-dns.com
```

**For www.dashden.app:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Step 4: Add DNS Records in Squarespace (10 minutes)

1. Go to your Squarespace account
2. Navigate to **Settings** → **Domains** → **dashden.app**
3. Click **"DNS Settings"** or **"Advanced DNS"**
4. Add the DNS records from Vercel:

#### Add A Record for Root Domain:
- **Type**: A
- **Host**: @ (or leave blank)
- **Points to**: `76.76.21.21` (from Vercel)
- **TTL**: 3600 (or default)

#### Add CNAME for Dev Subdomain:
- **Type**: CNAME
- **Host**: dev
- **Points to**: `cname.vercel-dns.com` (from Vercel)
- **TTL**: 3600 (or default)

#### Add CNAME for WWW:
- **Type**: CNAME
- **Host**: www
- **Points to**: `cname.vercel-dns.com` (from Vercel)
- **TTL**: 3600 (or default)

### Step 5: Configure Environment-Specific Deployments (5 minutes)

In your Vercel project settings:

#### Set up Branch Deployments:
1. Go to **Settings** → **Git**
2. Configure branches:
   - **Production Branch**: `main` → deploys to `dashden.app`
   - **Preview Branch**: `dev` → deploys to `dev.dashden.app`

#### Set Environment Variables:
1. Go to **Settings** → **Environment Variables**
2. Add variables for each environment:

**For Production (dashden.app):**
```
VITE_APP_URL=https://dashden.app
VITE_ENV=production
VITE_AUTH_ENDPOINT=https://PROD_API_URL/auth/graphql
VITE_GAME_ENDPOINT=https://PROD_API_URL/game/graphql
```

**For Development (dev.dashden.app):**
```
VITE_APP_URL=https://dev.dashden.app
VITE_ENV=development
VITE_AUTH_ENDPOINT=https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/auth/graphql
VITE_GAME_ENDPOINT=https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/game/graphql
```

### Step 6: Test DNS Propagation (5-60 minutes)

DNS changes can take 5-60 minutes to propagate. Test with:

```bash
# Check if DNS is working
dig dashden.app
dig dev.dashden.app

# Should return the Vercel IP addresses
nslookup dashden.app
nslookup dev.dashden.app
```

### Step 7: Deploy and Test (5 minutes)

Once DNS propagates:

1. **Trigger a deployment** in Vercel (or push to your repo)
2. **Test the domains**:
   - Visit `https://dev.dashden.app`
   - Visit `https://dashden.app`
3. **Verify SSL certificates** are automatically provisioned by Vercel

## Environment Architecture

```
Development Flow:
GitHub (dev branch) → Vercel → dev.dashden.app → Dev AWS Backend

Production Flow:  
GitHub (main branch) → Vercel → dashden.app → Prod AWS Backend
```

## Vercel Configuration Summary

### Domain Mapping:
- `dashden.app` → Production (main branch)
- `dev.dashden.app` → Development (dev branch or preview)
- `www.dashden.app` → Redirects to `dashden.app`

### Automatic Features:
- ✅ SSL certificates (Let's Encrypt)
- ✅ CDN and edge caching
- ✅ Automatic deployments on git push
- ✅ Preview deployments for PRs

## Next Steps After Domain Setup

### 1. Deploy Production Backend (15 minutes)

Once domains are working, deploy production AWS infrastructure:

```bash
cd infrastructure
npm run deploy:prod
```

### 2. Update Production Environment Variables

Get the production API URLs and update Vercel environment variables:

```bash
# Get production API Gateway URL
aws cloudformation describe-stacks \
  --stack-name MemoryGame-API-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

### 3. Test Full Integration

- ✅ Dev environment: `dev.dashden.app` → Dev backend
- ✅ Prod environment: `dashden.app` → Prod backend

## Troubleshooting

### DNS Not Propagating:
```bash
# Check current DNS
dig dashden.app +short

# Check from different DNS servers
dig @8.8.8.8 dashden.app
dig @1.1.1.1 dashden.app
```

### SSL Certificate Issues:
- Vercel automatically provisions SSL certificates
- Can take 5-10 minutes after DNS propagation
- Check in Vercel dashboard under Domains section

### Domain Not Working:
1. Verify DNS records in Squarespace match Vercel exactly
2. Check domain status in Vercel dashboard
3. Ensure domain is verified in Vercel

## Quick Commands

```bash
# Check DNS resolution
dig dashden.app
dig dev.dashden.app

# Test HTTPS
curl -I https://dashden.app
curl -I https://dev.dashden.app

# Check Vercel deployment status
npx vercel ls

# Deploy to Vercel manually
npx vercel --prod
```

## What You Need to Do Now

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Add the three domains** as described in Step 2
3. **Copy the DNS records** Vercel provides
4. **Add DNS records in Squarespace** as described in Step 4
5. **Wait for DNS propagation** (5-60 minutes)
6. **Test the domains** work

Let me know when you've completed the Vercel domain setup, and I'll help you deploy the production backend and complete the transition!