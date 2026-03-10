#!/bin/bash

echo "Testing Stripe createCheckoutSession..."
aws lambda invoke \
  --function-name MemoryGame-GameService-dev \
  --payload '{
    "body": "{\"query\":\"mutation { createCheckoutSession(input: {priceId: \\\"price_1T8TJYD1222JoXRH79EkciO2\\\", tier: \\\"BASIC\\\"}) { sessionId url } }\"}",
    "httpMethod": "POST",
    "requestContext": {
      "requestId": "test-stripe-1",
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

echo ""
echo "Response:"
cat response.json | jq '.body' -r | jq '.'
rm response.json
