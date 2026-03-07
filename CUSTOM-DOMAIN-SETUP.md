# Custom Domain Setup for Amplify

## Step 1: Purchase a Domain

If you don't own `turbo-town.com` yet, purchase it from:
- **Route 53** (AWS): https://console.aws.amazon.com/route53/
- **Namecheap**: https://www.namecheap.com
- **GoDaddy**: https://www.godaddy.com
- **Google Domains**: https://domains.google

Cost: ~$10-15/year

## Step 2: Add Domain to Amplify

### Option A: Domain Registered in Route 53 (Easiest)

1. Go to your Amplify app: https://console.aws.amazon.com/amplify/
2. Click **"Domain management"** in the left sidebar
3. Click **"Add domain"**
4. Select your domain from the dropdown (if in Route 53)
5. Configure subdomains:
   - `turbo-town.com` → main branch
   - `www.turbo-town.com` → main branch (optional)
6. Click **"Save"**
7. Amplify automatically configures DNS and SSL certificate

### Option B: Domain Registered Elsewhere

1. Go to your Amplify app: https://console.aws.amazon.com/amplify/
2. Click **"Domain management"** in the left sidebar
3. Click **"Add domain"**
4. Enter your domain: `turbo-town.com`
5. Amplify will provide DNS records to add to your domain registrar

**DNS Records to Add** (Amplify will show these):
```
Type: CNAME
Name: www
Value: [Amplify provides this - looks like: main.d20rx51iesg0zh.amplifyapp.com]

Type: ANAME/ALIAS (or A record)
Name: @
Value: [Amplify provides this]
```

6. Go to your domain registrar's DNS settings
7. Add the DNS records Amplify provided
8. Wait for DNS propagation (5 minutes - 48 hours, usually ~1 hour)

## Step 3: SSL Certificate

Amplify automatically provisions a free SSL certificate from AWS Certificate Manager. This takes about 5-10 minutes.

## Step 4: Update Cognito and API Gateway

Once your domain is active, update the callback URLs:

```bash
# Update Cognito
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_jPkMWmBup \
  --client-id 282nlnkslo1ttfsg1qfj5r2a54 \
  --callback-urls "http://localhost:3000" "https://turbo-town.com" "https://www.turbo-town.com" \
  --logout-urls "http://localhost:3000" "https://turbo-town.com" "https://www.turbo-town.com" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "email" "openid" "profile" \
  --allowed-o-auth-flows-user-pool-client

# Update API Gateway CORS
aws apigatewayv2 update-api \
  --api-id ooihrv63q8 \
  --cors-configuration "AllowOrigins=http://localhost:3000,https://turbo-town.com,https://www.turbo-town.com,AllowMethods=GET,POST,OPTIONS,AllowHeaders=Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,AllowCredentials=true,MaxAge=3600"
```

## Quick Setup with Route 53

If you want to buy and configure everything in AWS:

1. **Buy domain in Route 53**:
   - Go to: https://console.aws.amazon.com/route53/
   - Click **"Register domain"**
   - Search for `turbo-town.com` (or alternatives if taken)
   - Complete purchase (~$12/year)

2. **Add to Amplify** (automatic):
   - Go to Amplify → Domain management → Add domain
   - Select `turbo-town.com` from dropdown
   - Click Save
   - Done! DNS and SSL configured automatically

3. **Update Cognito/API** (run commands above)

## Verification

After setup, verify:
- ✅ `https://turbo-town.com` loads your app
- ✅ `https://www.turbo-town.com` redirects to main domain
- ✅ SSL certificate shows as valid (green padlock)
- ✅ Login/authentication works

## Cost

- Domain registration: $10-15/year
- Amplify hosting: Free tier (1000 build minutes, 15GB served/month)
- SSL certificate: Free (AWS Certificate Manager)
- Route 53 hosted zone: $0.50/month (if using Route 53)

Total: ~$12-20/year

## Troubleshooting

**DNS not propagating?**
- Check DNS with: `nslookup turbo-town.com`
- Wait up to 48 hours (usually much faster)
- Clear browser cache

**SSL certificate pending?**
- Amplify automatically provisions it
- Takes 5-10 minutes
- Check status in Amplify Console → Domain management

**Authentication not working?**
- Make sure you updated Cognito callback URLs
- Make sure you updated API Gateway CORS
- Clear browser cookies and try again

## Alternative Domain Ideas

If `turbo-town.com` is taken:
- `turbotown.app`
- `play-turbo-town.com`
- `turbo-town.games`
- `turbotown.io`
- `turbo-town.fun`
