#!/bin/bash

# Test Lambda directly with a proper API Gateway event structure
echo "Testing listAvailableGames query..."
aws lambda invoke \
  --function-name MemoryGame-GameService-dev \
  --payload '{
    "body": "{\"query\":\"query { listAvailableGames { id name description difficulty } }\"}",
    "httpMethod": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "requestContext": {
      "requestId": "test-request-123",
      "authorizer": {
        "jwt": {
          "claims": {
            "sub": "test-user-id"
          }
        }
      }
    }
  }' \
  --cli-binary-format raw-in-base64-out \
  response.json

echo ""
echo "Response:"
cat response.json | jq '.'
rm response.json
