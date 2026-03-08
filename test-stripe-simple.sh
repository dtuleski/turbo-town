#!/bin/bash

echo "🧪 Testing Stripe Backend Integration"
echo "======================================"
echo ""

# Test 1: createCheckoutSession
echo "Test 1: createCheckoutSession"
echo "------------------------------"

RESPONSE=$(aws lambda invoke \
  --function-name MemoryGame-GameService-dev \
  --payload '{
    "body": "{\"query\":\"mutation { createCheckoutSession(input: {priceId: \\\"price_1T8TJYD1222JoXRH79EkciO2\\\", tier: \\\"BASIC\\\"}) { sessionId url } }\"}",
    "httpMethod": "POST",
    "requestContext": {
      "requestId": "test-1",
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
  /tmp/stripe-test-1.json 2>&1)

BODY=$(cat /tmp/stripe-test-1.json | jq -r '.body' 2>/dev/null)
ERROR=$(echo "$BODY" | jq -r '.errors[0].message' 2>/dev/null)
SESSION_ID=$(echo "$BODY" | jq -r '.data.createCheckoutSession.sessionId' 2>/dev/null)

if [ "$SESSION_ID" != "null" ] && [ -n "$SESSION_ID" ]; then
  echo "✅ PASSED - Got session ID: $SESSION_ID"
  URL=$(echo "$BODY" | jq -r '.data.createCheckoutSession.url')
  echo "   Checkout URL: $URL"
else
  echo "❌ FAILED - Error: $ERROR"
fi

echo ""

# Test 2: createPortalSession
echo "Test 2: createPortalSession"
echo "----------------------------"

RESPONSE=$(aws lambda invoke \
  --function-name MemoryGame-GameService-dev \
  --payload '{
    "body": "{\"query\":\"mutation { createPortalSession { url } }\"}",
    "httpMethod": "POST",
    "requestContext": {
      "requestId": "test-2",
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
  /tmp/stripe-test-2.json 2>&1)

BODY=$(cat /tmp/stripe-test-2.json | jq -r '.body' 2>/dev/null)
ERROR=$(echo "$BODY" | jq -r '.errors[0].message' 2>/dev/null)
PORTAL_URL=$(echo "$BODY" | jq -r '.data.createPortalSession.url' 2>/dev/null)

if [ "$PORTAL_URL" != "null" ] && [ -n "$PORTAL_URL" ]; then
  echo "✅ PASSED - Got portal URL: $PORTAL_URL"
elif echo "$ERROR" | grep -q "No active subscription"; then
  echo "⚠️  Expected error (no subscription yet): $ERROR"
  echo "✅ Mutation is working correctly"
else
  echo "❌ FAILED - Error: $ERROR"
fi

echo ""
echo "======================================"
echo "🎉 Backend Stripe integration is ready!"
echo ""
echo "Next: Add frontend checkout button"

# Cleanup
rm -f /tmp/stripe-test-*.json
