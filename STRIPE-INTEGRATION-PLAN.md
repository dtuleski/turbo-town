# Stripe Integration Plan - Safe Approach

## Current Status

✅ **Already Done:**
- Stripe account configured with test keys
- Products created: Basic ($1.99/month), Premium ($5.99/month)
- Price IDs saved in Lambda environment variables
- Stripe service code written (`services/game/src/services/stripe.service.ts`)
- GraphQL schema updated with mutations
- Webhook handler code written (`services/game/src/webhook.ts`)

❌ **Not Done Yet:**
- Mutations not wired to handler
- Webhook Lambda not deployed
- Frontend integration not complete
- Stripe webhook endpoint not configured

## Safe Integration Strategy

### Phase 1: Backend Mutations (Low Risk)
Add Stripe mutations to existing Lambda without breaking current functionality.

**Steps:**
1. Create backup first
2. Add Stripe mutations to handler (createCheckoutSession, createPortalSession)
3. Update subscription repository if needed
4. Build and validate
5. Deploy with smoke tests
6. Test mutations manually

**Risk:** Low - Just adding new endpoints, existing features unaffected

### Phase 2: Webhook Lambda (Separate Function)
Deploy webhook handler as a separate Lambda to avoid affecting main app.

**Steps:**
1. Create separate Lambda function for webhooks
2. Deploy webhook handler
3. Configure API Gateway endpoint
4. Register webhook in Stripe dashboard
5. Test with Stripe CLI

**Risk:** Very Low - Completely separate from main app

### Phase 3: Frontend Integration
Add Stripe.js to frontend for checkout flow.

**Steps:**
1. Install @stripe/stripe-js
2. Add checkout button to subscription page
3. Handle success/cancel redirects
4. Test checkout flow end-to-end

**Risk:** Low - Frontend only, backend already working

## Detailed Implementation

### Phase 1: Backend Mutations

**1. Update handler to include Stripe mutations:**

```typescript
// In game.handler.ts

import { StripeService } from '../services/stripe.service';

// In constructor
private stripeService: StripeService;

constructor() {
  // ... existing code ...
  this.stripeService = new StripeService();
}

// In routeOperation
case 'createCheckoutSession':
  return this.createCheckoutSession(userId, username, email, variables.input);

case 'createPortalSession':
  return this.createPortalSession(userId);

// New methods
private async createCheckoutSession(
  userId: string, 
  username?: string, 
  email?: string, 
  input: any
): Promise<any> {
  if (!email) {
    throw new Error('Email required for checkout');
  }

  const result = await this.stripeService.createCheckoutSession({
    userId,
    email,
    priceId: input.priceId,
    tier: input.tier,
  });

  return {
    createCheckoutSession: result,
  };
}

private async createPortalSession(userId: string): Promise<any> {
  // Get customer ID from subscription
  const subscription = await this.subscriptionRepository.getByUserId(userId);
  
  if (!subscription?.stripeCustomerId) {
    throw new Error('No active subscription found');
  }

  const result = await this.stripeService.createPortalSession({
    customerId: subscription.stripeCustomerId,
  });

  return {
    createPortalSession: result,
  };
}
```

**2. Update subscription repository to store Stripe IDs:**

Check if `subscription.repository.ts` has fields for:
- `stripeCustomerId`
- `stripeSubscriptionId`
- `currentPeriodStart`
- `currentPeriodEnd`

**3. Deploy:**
```bash
cd services/game
./build-and-deploy.sh  # Includes backup, validation, smoke tests
```

**4. Test:**
```bash
# Test createCheckoutSession
aws lambda invoke \
  --function-name MemoryGame-GameService-dev \
  --payload '{
    "body": "{\"query\":\"mutation { createCheckoutSession(input: {priceId: \\\"price_1T8TJYD1222JoXRH79EkciO2\\\", tier: BASIC}) { sessionId url } }\"}",
    "httpMethod": "POST",
    "requestContext": {
      "requestId": "test",
      "authorizer": {
        "jwt": {
          "claims": {
            "sub": "c4c804d8-6071-70c6-d9e3-a2286ef3f13a",
            "preferred_username": "dtuleski",
            "email": "diegotuleski@gmail.com"
          }
        }
      }
    }
  }' \
  --cli-binary-format raw-in-base64-out \
  response.json

cat response.json | jq '.body' -r | jq '.'
```

### Phase 2: Webhook Lambda

**1. Create webhook Lambda function:**

```bash
# Create new directory
mkdir -p services/stripe-webhook

# Create handler
cat > services/stripe-webhook/index.ts << 'EOF'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StripeService } from '../game/src/services/stripe.service';

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const signature = event.headers['stripe-signature'] || '';
    const body = event.body || '';

    // Verify webhook signature
    const stripeEvent = StripeService.verifyWebhookSignature(body, signature);

    // Process webhook
    const stripeService = new StripeService();
    await stripeService.handleWebhook(stripeEvent);

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Webhook processing failed' }),
    };
  }
}
EOF
```

**2. Deploy webhook Lambda:**
```bash
# Build
cd services/stripe-webhook
npm install
npx esbuild index.ts --bundle --platform=node --outfile=dist/index.js

# Deploy
aws lambda create-function \
  --function-name MemoryGame-StripeWebhook-dev \
  --runtime nodejs20.x \
  --role arn:aws:iam::848403890404:role/MemoryGame-Lambda-dev-GameLambdaFunctionServiceRole-sSBthprXcR0a \
  --handler index.handler \
  --zip-file fileb://dist/function.zip \
  --environment Variables="{
    STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET,
    SUBSCRIPTIONS_TABLE_NAME=memory-game-subscriptions-dev
  }"
```

**3. Create API Gateway endpoint:**
```bash
# Add POST /stripe/webhook endpoint
# Point to MemoryGame-StripeWebhook-dev Lambda
```

**4. Register webhook in Stripe:**
```bash
stripe listen --forward-to https://your-api-gateway-url/stripe/webhook
```

### Phase 3: Frontend Integration

**1. Install Stripe.js:**
```bash
cd apps/web
npm install @stripe/stripe-js
```

**2. Create checkout component:**
```typescript
// apps/web/src/components/StripeCheckout.tsx
import { loadStripe } from '@stripe/stripe-js';
import { useMutation } from '@apollo/client';
import { CREATE_CHECKOUT_SESSION } from '../api/stripe';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY!);

export function StripeCheckout({ tier, priceId }: Props) {
  const [createCheckout] = useMutation(CREATE_CHECKOUT_SESSION);

  const handleCheckout = async () => {
    const { data } = await createCheckout({
      variables: { input: { tier, priceId } }
    });

    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({
      sessionId: data.createCheckoutSession.sessionId
    });
  };

  return <button onClick={handleCheckout}>Subscribe to {tier}</button>;
}
```

**3. Add to subscription page:**
```typescript
// apps/web/src/pages/SubscriptionPage.tsx
<StripeCheckout 
  tier="BASIC" 
  priceId="price_1T8TJYD1222JoXRH79EkciO2" 
/>
<StripeCheckout 
  tier="PREMIUM" 
  priceId="price_1T8TK0D1222JoXRHR0kLMCl5" 
/>
```

## Testing Checklist

### Phase 1 Testing
- [ ] Backup created before deployment
- [ ] Build validation passes
- [ ] Smoke tests pass
- [ ] createCheckoutSession returns valid session
- [ ] createPortalSession returns valid URL
- [ ] Existing features still work (games, admin)

### Phase 2 Testing
- [ ] Webhook Lambda deploys successfully
- [ ] Webhook endpoint accessible
- [ ] Stripe CLI can forward events
- [ ] Test events process correctly
- [ ] Subscription updates in DynamoDB

### Phase 3 Testing
- [ ] Checkout button redirects to Stripe
- [ ] Test payment completes successfully
- [ ] User redirected back to app
- [ ] Subscription tier updated
- [ ] Rate limits reflect new tier

## Rollback Plan

### If Phase 1 Fails
```bash
# Restore from backup
ls -lt backups/ | head -1
aws lambda update-function-code \
  --function-name MemoryGame-GameService-dev \
  --zip-file "fileb://backups/[timestamp]/lambda-backup.zip"
```

### If Phase 2 Fails
```bash
# Delete webhook Lambda
aws lambda delete-function \
  --function-name MemoryGame-StripeWebhook-dev
```

### If Phase 3 Fails
- Just revert frontend code (git reset)
- Backend unaffected

## Environment Variables Needed

**Lambda (already set):**
- ✅ STRIPE_SECRET_KEY
- ✅ STRIPE_BASIC_PRICE_ID
- ✅ STRIPE_PREMIUM_PRICE_ID
- ❌ STRIPE_WEBHOOK_SECRET (need to generate)

**Frontend (.env):**
- ❌ VITE_STRIPE_PUBLISHABLE_KEY

## Next Steps

**Ready to start?**

1. **Phase 1 (Safest):** Add mutations to existing Lambda
   - Low risk, easy rollback
   - Can test immediately
   - No frontend changes needed

2. **Phase 2:** Deploy webhook Lambda
   - Completely separate
   - Won't affect main app

3. **Phase 3:** Frontend integration
   - User-facing feature
   - Backend already working

**Recommendation:** Start with Phase 1 today. It's safe, incremental, and we have backups + smoke tests in place.

Want me to implement Phase 1 now?
