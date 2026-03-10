# Stripe Checkout Fix - Status & Testing Guide

## What Was Fixed

### Issue
Stripe checkout was failing with 500 error because:
1. Frontend was using wrong Apollo client (`authClient` instead of `gameClient`)
2. Backend expected tier type `'STANDARD'` but frontend sent `'PREMIUM'`

### Changes Made

#### Backend (Lambda) ✅ DEPLOYED
**File**: `services/game/src/services/stripe.service.ts`
- Changed `CreateCheckoutSessionInput` type from `'BASIC' | 'STANDARD'` to `'BASIC' | 'PREMIUM'`
- Updated webhook handler to accept `'PREMIUM'` tier
- Deployed to Lambda: `MemoryGame-GameService-dev` (92KB)
- Backup created: `backups/20260307-193155/`

#### Frontend ⏳ DEPLOYING
**File**: `apps/web/src/pages/subscription/RateLimitPage.tsx`
- Added import: `import { gameClient } from '@/api/client'`
- Updated mutation: `useMutation(CREATE_CHECKOUT_SESSION, { client: gameClient })`
- Committed and pushed to GitHub: commit `b2d9a30`
- Amplify auto-deploy in progress (2-3 minutes)

## Testing Instructions

### Step 1: Wait for Amplify Deployment
Amplify is currently deploying the frontend changes. Wait 2-3 minutes, then check:
- https://turbo-town.com
- https://main.d20rx51iesg0zh.amplifyapp.com

### Step 2: Clear Browser Cache
**CRITICAL**: Your browser has cached the old JavaScript code.

**Option A - Hard Refresh** (Recommended):
- Mac: `Cmd + Shift + R`
- Windows/Linux: `Ctrl + Shift + R`

**Option B - Clear Cache**:
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Clear storage" in left sidebar
4. Click "Clear site data" button
5. Refresh the page

### Step 3: Test Checkout Flow

1. **Navigate to subscription page**:
   - Go to https://turbo-town.com/subscription
   - Or click "Upgrade" from any rate limit message

2. **Click "Upgrade to Basic" or "Upgrade to Premium"**

3. **Expected behavior**:
   - Button shows "Loading..." state
   - Browser redirects to Stripe checkout page
   - Stripe checkout shows correct plan and price:
     - Basic: $1.99/month
     - Premium: $5.99/month

4. **Test with Stripe test card**:
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)

5. **After successful payment**:
   - Redirects to: `https://turbo-town.com/subscription/success?session_id=...`
   - Subscription should be active in DynamoDB
   - Rate limits should update to new tier

## Troubleshooting

### Still Getting 500 Error?

**Check 1**: Is the request going to the right endpoint?
- Open DevTools → Network tab
- Click "Upgrade to Basic"
- Look for the GraphQL request
- Should go to: `https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/game/graphql`
- If it goes to `/auth/graphql` → Browser cache issue, clear cache again

**Check 2**: Check CloudWatch logs
```bash
aws logs tail /aws/lambda/MemoryGame-GameService-dev --since 2m --format short
```

**Check 3**: Verify Amplify deployment completed
- Check GitHub Actions or Amplify Console
- Ensure latest commit `b2d9a30` is deployed

### Error: "Email required for checkout"
- Make sure you're logged in
- Check that Cognito user has email attribute set

### Stripe Checkout Not Loading?
- Check Stripe API keys in Lambda environment variables
- Verify `FRONTEND_URL` is set to `https://turbo-town.com`

## Current Configuration

### Stripe Products (Test Mode)
- **Basic**: $1.99/month - `price_1T8TJYD1222JoXRH79EkciO2`
- **Premium**: $5.99/month - `price_1T8TK0D1222JoXRHR0kLMCl5`

### Lambda Environment Variables
```
STRIPE_SECRET_KEY: sk_test_XXXXXXXXXXXXXXXXXXXXXXX... (configured)
STRIPE_BASIC_PRICE_ID: price_1T8TJYD1222JoXRH79EkciO2
STRIPE_PREMIUM_PRICE_ID: price_1T8TK0D1222JoXRHR0kLMCl5
FRONTEND_URL: https://turbo-town.com
```

### Frontend Environment Variables
```
VITE_STRIPE_PUBLISHABLE_KEY: pk_test_XXXXXXXXXXXXXXXXXXXXXXX... (configured)
VITE_GAME_ENDPOINT: https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/game/graphql
```

## What Happens After Checkout?

### Immediate (Checkout Session)
1. User completes payment on Stripe
2. Stripe redirects to success page
3. Frontend shows success message

### Background (Webhook - Not Yet Implemented)
Currently, subscription updates are NOT automatic. You need to manually update DynamoDB or implement the webhook Lambda (Phase 3).

**To manually activate subscription**:
```bash
aws dynamodb update-item \
  --table-name memory-game-subscriptions-dev \
  --key '{"userId": {"S": "YOUR_USER_ID"}}' \
  --update-expression "SET tier = :tier, #status = :status" \
  --expression-attribute-names '{"#status": "status"}' \
  --expression-attribute-values '{
    ":tier": {"S": "BASIC"},
    ":status": {"S": "ACTIVE"}
  }'
```

## Next Steps (Optional - Phase 3)

If you want automatic subscription updates, you'll need to:
1. Create webhook Lambda function
2. Configure Stripe webhook endpoint
3. Handle webhook events (checkout.session.completed, subscription.updated, etc.)

For now, you can test the checkout flow and manually update subscriptions in DynamoDB.

## Files Changed

### Backend
- `services/game/src/services/stripe.service.ts` - Updated tier types

### Frontend
- `apps/web/src/pages/subscription/RateLimitPage.tsx` - Fixed Apollo client routing

### Deployment
- Lambda deployed: ✅ Complete
- Frontend deployed: ⏳ In progress (Amplify auto-deploy)
- Git commit: `b2d9a30`

---

**Status**: Backend deployed, frontend deploying. Test in 2-3 minutes after clearing browser cache.
