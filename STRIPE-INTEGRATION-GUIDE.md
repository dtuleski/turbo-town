# Stripe Integration Setup Guide

## Overview
DashDen now supports Stripe subscriptions for Basic ($1.99/month) and Premium ($9.99/month) tiers.

## What's Been Implemented

### Backend
✅ Stripe service for checkout and customer portal
✅ Webhook handler for subscription lifecycle events
✅ GraphQL mutations: `createCheckoutSession`, `createPortalSession`
✅ GraphQL query: `getSubscription`
✅ Subscription repository updates for Stripe fields
✅ Automatic tier updates when payments succeed/fail

### Frontend (To Be Implemented)
⏳ Update RateLimitPage to call `createCheckoutSession` mutation
⏳ Add subscription management page with portal access
⏳ Display current subscription status

## Setup Steps

### 1. Create Stripe Account
1. Go to https://stripe.com and create an account
2. Get your API keys from Dashboard → Developers → API keys
   - Publishable key (starts with `pk_`)
   - Secret key (starts with `sk_`)

### 2. Create Stripe Products and Prices
```bash
# Create Basic product ($1.99/month)
stripe products create \
  --name="DashDen Basic" \
  --description="20 games per day"

# Create price for Basic
stripe prices create \
  --product=<BASIC_PRODUCT_ID> \
  --unit-amount=199 \
  --currency=usd \
  --recurring[interval]=month

# Create Premium product ($9.99/month)
stripe products create \
  --name="DashDen Premium" \
  --description="Unlimited games"

# Create price for Premium
stripe prices create \
  --product=<PREMIUM_PRODUCT_ID> \
  --unit-amount=999 \
  --currency=usd \
  --recurring[interval]=month
```

Save the price IDs (start with `price_`).

### 3. Update Lambda Environment Variables
```bash
# Update Game Service Lambda
aws lambda update-function-configuration \
  --function-name MemoryGame-GameService-dev \
  --environment "Variables={
    STRIPE_SECRET_KEY=sk_test_...,
    STRIPE_BASIC_PRICE_ID=price_...,
    STRIPE_PREMIUM_PRICE_ID=price_...,
    FRONTEND_URL=https://turbo-town.com,
    ...existing vars...
  }"
```

### 4. Deploy Webhook Lambda Function
```bash
# Build webhook handler
cd services/game
npx esbuild src/webhook.ts --bundle --platform=node --target=node20 \
  --outfile=dist/webhook.js --format=cjs \
  --external:@aws-sdk/client-dynamodb \
  --external:@aws-sdk/lib-dynamodb \
  --external:@aws-sdk/client-cognito-identity-provider

# Create deployment package
cd dist && zip -r ../webhook.zip . && cd ..

# Create Lambda function
aws lambda create-function \
  --function-name MemoryGame-StripeWebhook-dev \
  --runtime nodejs20.x \
  --role arn:aws:iam::848403890404:role/MemoryGame-Lambda-dev-GameLambdaFunctionServiceRole-sSBthprXcR0a \
  --handler webhook.handler \
  --zip-file fileb://webhook.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment "Variables={
    STRIPE_SECRET_KEY=sk_test_...,
    STRIPE_WEBHOOK_SECRET=whsec_...,
    SUBSCRIPTIONS_TABLE_NAME=memory-game-subscriptions-dev,
    NODE_ENV=dev,
    LOG_LEVEL=DEBUG,
    AWS_REGION=us-east-1
  }"
```

### 5. Create API Gateway Endpoint for Webhooks
```bash
# Get API Gateway ID
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='MemoryGame-API-dev'].ApiId" --output text)

# Create webhook route
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "POST /webhook/stripe" \
  --target "integrations/<INTEGRATION_ID>"

# Create integration
aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:848403890404:function:MemoryGame-StripeWebhook-dev \
  --payload-format-version 2.0

# Add Lambda permission
aws lambda add-permission \
  --function-name MemoryGame-StripeWebhook-dev \
  --statement-id apigateway-webhook \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:848403890404:$API_ID/*/*/webhook/stripe"
```

### 6. Configure Stripe Webhook
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/webhook/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret (starts with `whsec_`)
6. Update Lambda environment variable `STRIPE_WEBHOOK_SECRET`

### 7. Update DynamoDB Subscriptions Table
Add Stripe fields to existing subscriptions:
```bash
# Add stripeCustomerId and stripeSubscriptionId attributes
# These will be populated automatically when users subscribe
```

### 8. Update Frontend

#### Install Stripe.js
```bash
cd apps/web
npm install @stripe/stripe-js
```

#### Update RateLimitPage.tsx
Replace placeholder buttons with real Stripe checkout:

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { useMutation } from '@apollo/client';
import { CREATE_CHECKOUT_SESSION } from '../api/subscription';

const stripePromise = loadStripe('pk_test_...');

const [createCheckoutSession] = useMutation(CREATE_CHECKOUT_SESSION);

const handleUpgrade = async (tier: 'BASIC' | 'STANDARD') => {
  try {
    const { data } = await createCheckoutSession({
      variables: { input: { tier } },
    });
    
    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({
      sessionId: data.createCheckoutSession.sessionId,
    });
  } catch (error) {
    console.error('Checkout failed:', error);
  }
};
```

#### Create Subscription API Client
```typescript
// apps/web/src/api/subscription.ts
import { gql } from '@apollo/client';

export const CREATE_CHECKOUT_SESSION = gql`
  mutation CreateCheckoutSession($input: CreateCheckoutSessionInput!) {
    createCheckoutSession(input: $input) {
      sessionId
      url
    }
  }
`;

export const CREATE_PORTAL_SESSION = gql`
  mutation CreatePortalSession {
    createPortalSession {
      url
    }
  }
`;

export const GET_SUBSCRIPTION = gql`
  query GetSubscription {
    getSubscription {
      userId
      tier
      status
      stripeCustomerId
      currentPeriodEnd
    }
  }
`;
```

## Testing

### Test Mode
Use Stripe test mode with test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

### Test Webhook Locally
```bash
# Install Stripe CLI
brew install stripe/stripe-brew/stripe

# Login
stripe login

# Forward webhooks to local endpoint
stripe listen --forward-to https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/webhook/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

## Subscription Flow

### Purchase Flow
1. User clicks "Upgrade to Basic" or "Upgrade to Premium"
2. Frontend calls `createCheckoutSession` mutation
3. Backend creates Stripe Checkout session
4. User redirected to Stripe Checkout page
5. User enters payment details
6. Stripe processes payment
7. Stripe sends `checkout.session.completed` webhook
8. Backend updates subscription tier in DynamoDB
9. User redirected back to app with success message

### Management Flow
1. User clicks "Manage Subscription"
2. Frontend calls `createPortalSession` mutation
3. Backend creates Stripe Customer Portal session
4. User redirected to Stripe portal
5. User can update payment method, cancel subscription, etc.
6. Stripe sends webhook events for any changes
7. Backend updates subscription in DynamoDB

### Cancellation Flow
1. User cancels subscription in Stripe portal
2. Stripe sends `customer.subscription.deleted` webhook
3. Backend downgrades user to FREE tier
4. User rate limited to 3 plays/day

## Security Notes

- Webhook signature verification prevents unauthorized requests
- Stripe secret keys stored in Lambda environment variables
- Never expose secret keys in frontend code
- Use Stripe test mode for development
- Enable Stripe Radar for fraud prevention in production

## Production Checklist

- [ ] Switch from test mode to live mode in Stripe
- [ ] Update API keys to live keys
- [ ] Configure live webhook endpoint
- [ ] Test complete purchase flow
- [ ] Test subscription cancellation
- [ ] Test payment failure handling
- [ ] Enable Stripe Radar
- [ ] Set up email receipts in Stripe
- [ ] Configure tax collection if needed
- [ ] Add terms of service and privacy policy links

## Troubleshooting

### Webhook not receiving events
- Check webhook URL is correct
- Verify Lambda has API Gateway trigger
- Check CloudWatch logs for errors
- Test with Stripe CLI

### Checkout session creation fails
- Verify price IDs are correct
- Check Stripe secret key is valid
- Ensure products are active in Stripe

### Subscription not updating
- Check webhook signature verification
- Verify DynamoDB permissions
- Check CloudWatch logs for webhook handler

## Cost Estimate

Stripe fees:
- 2.9% + $0.30 per successful transaction
- Basic ($1.99): $0.36 fee = $1.63 net
- Premium ($9.99): $0.59 fee = $9.40 net

AWS costs:
- Lambda invocations: ~$0.20/month for 1000 webhooks
- API Gateway: ~$3.50/million requests
- DynamoDB: Included in existing costs

## Next Steps

1. Complete Stripe account setup
2. Create products and prices
3. Deploy webhook Lambda
4. Update frontend with Stripe integration
5. Test in Stripe test mode
6. Go live!
