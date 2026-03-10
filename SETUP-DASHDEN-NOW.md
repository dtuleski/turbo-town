# Setup dashden.app - Simple Action Plan

## What We Know

- Your site uses **CloudFront + S3** (Amazon infrastructure)
- No GitHub Actions or visible CI/CD
- Likely manual deployment or a service you set up before

## Simplest Path Forward

Since we don't know the exact hosting setup, let's create a NEW, clean deployment for dashden.app using a simple hosting service.

---

## Option 1: Use Vercel (Recommended - Easiest)

### Step 1: Deploy to Vercel (10 minutes)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from your project
cd /Users/diego.tuleski/Documents/projects/turbo-town/apps/web
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: dashden
# - Directory: ./ (current)
# - Override settings? No

# This will give you a URL like: dashden-xyz.vercel.app
```

### Step 2: Add Custom Domains in Vercel

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

### Step 3: Add DNS Records in Squarespace

Go to Squarespace DNS Settings and add:

```
┌──────────┬────────┬──────────┬─────────────────────────┐
│ HOST     │ TYPE   │ PRIORITY │ DATA                    │
├──────────┼────────┼──────────┼─────────────────────────┤
│ @        │ A      │ 0        │ 76.76.21.21             │
│ www      │ CNAME  │ 0        │ cname.vercel-dns.com    │
│ dev      │ CNAME  │ 0        │ cname.vercel-dns.com    │
└──────────┴────────┴──────────┴─────────────────────────┘
```

(Use the exact values Vercel gives you)

### Step 4: Configure Environment Variables in Vercel

In Vercel Dashboard → Settings → Environment Variables:

**For Production (dashden.app):**
```
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_jPkMWmBup
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_DOMAIN=memory-game-dev
VITE_AUTH_ENDPOINT=https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/auth/graphql
VITE_GAME_ENDPOINT=https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/game/graphql
VITE_APP_NAME=DashDen
VITE_APP_URL=https://dashden.app
VITE_ENV=production
```

### Step 5: Configure Git Integration

In Vercel:
- Connect to GitHub repository
- Set `main` branch → `dev.dashden.app`
- Set `production` branch → `dashden.app` (create this branch)

---

## Option 2: Keep Current Setup, Just Update DNS

If you want to keep using whatever is hosting turbo-town.com:

### Step 1: Find the CloudFront Distribution ID

```bash
# Check CloudFront distributions
aws cloudfront list-distributions --output json > cloudfront.json

# Open cloudfront.json and look for turbo-town.com
# Find the distribution ID (starts with E...)
```

### Step 2: Add dashden.app to CloudFront

```bash
# Update CloudFront distribution to accept dashden.app
# (This requires the distribution ID)

aws cloudfront update-distribution \
  --id <DISTRIBUTION_ID> \
  --if-match <ETAG> \
  --distribution-config file://distribution-config.json
```

### Step 3: Add DNS Records in Squarespace

```
┌──────────┬────────┬──────────┬─────────────────────────────────────┐
│ HOST     │ TYPE   │ PRIORITY │ DATA                                │
├──────────┼────────┼──────────┼─────────────────────────────────────┤
│ @        │ CNAME  │ 0        │ <cloudfront-id>.cloudfront.net      │
│ www      │ CNAME  │ 0        │ <cloudfront-id>.cloudfront.net      │
│ dev      │ CNAME  │ 0        │ <cloudfront-id>.cloudfront.net      │
└──────────┴────────┴──────────┴─────────────────────────────────────┘
```

---

## My Recommendation: Use Vercel

**Why Vercel:**
- ✅ Easiest setup (5 commands)
- ✅ Auto-deploys from GitHub
- ✅ Free SSL certificates
- ✅ Great performance
- ✅ Easy domain management
- ✅ Free for your use case

**Steps:**
1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel` in `apps/web` directory
3. Add custom domains in Vercel dashboard
4. Copy DNS records to Squarespace
5. Done!

---

## Quick Start Commands

```bash
# 1. Install Vercel
npm install -g vercel

# 2. Go to frontend directory
cd apps/web

# 3. Deploy
vercel

# 4. Follow the prompts
# 5. Go to Vercel dashboard to add custom domains
# 6. Copy DNS records to Squarespace
```

---

## Update Code for New Domain

While Vercel is deploying, update your code:

```bash
# Update app name
cd apps/web/src/config
```

Edit `constants.ts`:
```typescript
export const APP_NAME = 'DashDen'  // Change from 'DashDen' (already correct!)
```

```bash
# Update backend CORS
cd ../../../services/auth/src
```

Edit `index.ts` - find `allowedOrigins`:
```typescript
const allowedOrigins = [
  'https://dashden.app',
  'https://www.dashden.app',
  'https://dev.dashden.app',
  'http://localhost:5173',
];
```

Do the same for `services/game/src/index.ts`

```bash
# Deploy backend changes
cd ../../../infrastructure
npm run deploy:dev
```

```bash
# Commit frontend changes
cd ../apps/web
git add .
git commit -m "Update domain to dashden.app and app name to DashDen"
git push origin main
```

---

## DNS Propagation

After adding DNS records in Squarespace:
- **Minimum**: 5-10 minutes
- **Typical**: 30-60 minutes
- **Maximum**: 24-48 hours

Check propagation:
```bash
dig dashden.app
dig dev.dashden.app
```

---

## Need Help?

Try Vercel first - it's the simplest option. If you run into issues, let me know and I'll help troubleshoot!

**Next message, tell me:**
1. Did you install Vercel CLI?
2. Did you run `vercel` command?
3. What URL did Vercel give you?

Then I'll help you add the custom domains!
