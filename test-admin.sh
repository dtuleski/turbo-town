#!/bin/bash

# Test admin analytics query
echo "Testing getAdminAnalytics query..."
aws lambda invoke \
  --function-name MemoryGame-GameService-dev \
  --payload '{
    "body": "{\"query\":\"query { getAdminAnalytics { dau mau conversionRate usersByTier { tier count } gamesPlayed } }\"}",
    "httpMethod": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "requestContext": {
      "requestId": "test-request-456",
      "authorizer": {
        "jwt": {
          "claims": {
            "sub": "c4c804d8-6071-70c6-d9e3-a2286ef3f13a",
            "preferred_username": "dtuleski"
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
