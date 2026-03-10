# Vercel Domain Setup - Next Steps

## ✅ What We Just Did

Your app is now deployed to Vercel!

**Deployment URLs:**
- Production: https://web-kappa-taupe-84.vercel.app
- Dashboard: https://vercel.com/diegotuleski-9028s-projects/web

---

## Step 1: Add Custom Domains in Vercel (5 minutes)

### 1.1 Go to Vercel Dashboard

Open: https://vercel.com/diegotuleski-9028s-projects/web/settings/domains

### 1.2 Add Your Domains

Click "Add Domain" and add these three domains:

1. `dashden.app`
2. `www.dashden.app`
3. `dev.dashden.app`

For each domain, Vercel will show you DNS records to add.

---

## Step 2: Get DNS Records from Vercel

After adding each domain, Vercel will show something like:

### For dashden.app:
```
Type: A
Name: @
Value: 76.76.21.21
```

### For www.dashden.app:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### For dev.dashden.app:
```
Type: CNAME
Name: dev
Value: cname.vercel-dns.com
```

**Write down these values!** (They might be slightly different)

---

## Step 3: Add DNS Records in Squarespace

### 3.1 Go to Squarespace DNS Settings

1. Go to: https://account.squarespace.com/domains
2. Click on `dashden.app`
3. Click "DNS Settings"

### 3.2 Remove Squarespace Defaults (if any)

Remove any existing A or CNAME records for:
- `@` (root domain)
- `www`
- `dev`

### 3.3 Add Vercel DNS Records

Click "Add Record" for each:

**Record 1: Root Domain**
```
Type: A
Host: @
Priority: 0
Data: 76.76.21.21  (use the value Vercel gave you)
TTL: 3600
```

**Record 2: WWW Subdomain**
```
Type: CNAME
Host: www
Priority: 0
Data: cname.vercel-dns.com  (use the value Vercel gave you)
TTL: 3600
```

**Record 3: Dev Subdomain**
```
Type: CNAME
Host: dev
Priority: 0
Data: cname.vercel-dns.com  (use the value Vercel gave you)
TTL: 3600
```

### 3.4 Save Changes

Click "Save" in Squarespace.

---

## Step 4: Wait for DNS Propagation (5-60 minutes)

DNS changes take time to propagate:
- Minimum: 5 minutes
- Typical: 30 minutes
- Maximum: 24 hours

### Check DNS Propagation

```bash
# Check if DNS is updated
dig dashden.app
dig www.dashden.app
dig dev.dashden.app

# Or use online tool:
# https://dnschecker.org
```

---

## Step 5: Configure Environment Variables in Vercel

### 5.1 Go to Environment Variables

Open: https://vercel.com/diegotuleski-9028s-projects/web/settings/environment-variables

### 5.2 Add Variables for Production

Click "Add New" and add these variables (one at a time):

**Environment: Production**

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

### 5.3 Redeploy

After adding environment variables, click "Redeploy" in Vercel dashboard.

---

## Step 6: Update Backend CORS

Your Lambda functions need to allow requests from the new domains.

### 6.1 Update Auth Service

```bash
cd services/auth/src
```

Edit `index.ts` - find `allowedOrigins` array and update:

```typescript
const allowedOrigins = [
  'https://dashden.app',
  'https://www.dashden.app',
  'https://dev.dashden.app',
  'http://localhost:5173',
  'http://localhost:3000',
];
```

### 6.2 Update Game Service

```bash
cd ../../game/src
```

Edit `index.ts` - same change to `allowedOrigins`.

### 6.3 Deploy Backend Changes

```bash
cd ../../../infrastructure
npm run deploy:dev
```

---

## Step 7: Connect GitHub for Auto-Deploy

### 7.1 Go to Git Settings

Open: https://vercel.com/diegotuleski-9028s-projects/web/settings/git

### 7.2 Connect GitHub Repository

1. Click "Connect Git Repository"
2. Select `dtuleski/turbo-town`
3. Configure:
   - Production Branch: `main`
   - Install Vercel GitHub App if prompted

### 7.3 Configure Branch Deployments

In Vercel settings:
- `main` branch → Auto-deploy to production
- All branches → Preview deployments

---

## Step 8: Test Everything

Once DNS propagates (check with `dig dashden.app`):

### Test Production (dashden.app)

```bash
# Open in browser
open https://dashden.app
```

**Checklist:**
- [ ] Site loads
- [ ] Can register new account
- [ ] Can login
- [ ] Can play memory game
- [ ] Can play math challenge
- [ ] Can play word puzzle
- [ ] No CORS errors in console (F12)
- [ ] Stripe checkout works

### Test Dev (dev.dashden.app)

Same tests as above.

---

## Step 9: Update Code References

Update any hardcoded references to turbo-town.com:

```bash
# Search for references
grep -r "turbo-town" . --exclude-dir=node_modules --exclude-dir=.git

# Update README
# Update documentation
# Update any config files
```

---

## Architecture After Setup

```
┌─────────────────────────────────────────────────────────┐
│                    VERCEL HOSTING                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  dashden.app (Production)                               │
│  ├─ Auto-deploys from 'main' branch                     │
│  ├─ Environment: Production                             │
│  └─ Backend: Dev (for now)                              │
│                                                          │
│  dev.dashden.app (Development)                          │
│  ├─ Same deployment as production (for now)             │
│  ├─ Environment: Production                             │
│  └─ Backend: Dev                                        │
│                                                          │
│  www.dashden.app                                        │
│  └─ Redirects to dashden.app                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          │
                          │ GraphQL API
                          ▼
┌─────────────────────────────────────────────────────────┐
│              AWS BACKEND (Dev Environment)               │
├─────────────────────────────────────────────────────────┤
│  API Gateway: ooihrv63q8.execute-api...                │
│  Lambda: MemoryGame-*-dev                               │
│  DynamoDB: memory-game-*-dev                            │
│  Cognito: MemoryGame-UserPool-dev                       │
└─────────────────────────────────────────────────────────┘
```

---

## Future: Separate Dev and Prod

Later, you can:

1. Deploy production backend (`npm run deploy:prod`)
2. Create separate Vercel projects for dev and prod
3. Configure different environment variables
4. Have true dev/prod separation

For now, both domains use the same dev backend, which is fine for testing!

---

## Troubleshooting

### DNS Not Propagating

```bash
# Check DNS
dig dashden.app

# If still showing old values, wait longer
# Or flush DNS cache:
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

### CORS Errors

Make sure you:
1. Updated `allowedOrigins` in both Lambda functions
2. Deployed the changes: `npm run deploy:dev`
3. Hard refresh browser (Cmd+Shift+R)

### Site Not Loading

1. Check Vercel deployment status
2. Check DNS records in Squarespace
3. Check browser console for errors
4. Try incognito mode

---

## Quick Reference

**Vercel Dashboard:**
- Project: https://vercel.com/diegotuleski-9028s-projects/web
- Domains: https://vercel.com/diegotuleski-9028s-projects/web/settings/domains
- Environment Variables: https://vercel.com/diegotuleski-9028s-projects/web/settings/environment-variables

**Squarespace:**
- Domains: https://account.squarespace.com/domains
- DNS Settings: Click on dashden.app → DNS Settings

**Your Sites:**
- Production: https://dashden.app (after DNS propagates)
- Dev: https://dev.dashden.app (after DNS propagates)
- Vercel Preview: https://web-kappa-taupe-84.vercel.app (works now)

---

## Next Steps

1. **Now**: Add custom domains in Vercel dashboard
2. **Now**: Copy DNS records to Squarespace
3. **Wait**: 30-60 minutes for DNS propagation
4. **Then**: Test dashden.app
5. **Then**: Update backend CORS
6. **Then**: Connect GitHub for auto-deploy

Let me know when you've added the domains in Vercel and I'll help with the next steps!
