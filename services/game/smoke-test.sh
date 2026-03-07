#!/bin/bash
set -e

echo "🧪 Running smoke tests..."

FUNCTION_NAME="MemoryGame-GameService-dev"
FAILED=0

# Test 1: listAvailableGames
echo -n "Testing listAvailableGames... "
RESULT=$(aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --payload '{
    "body": "{\"query\":\"query { listAvailableGames { id name } }\"}",
    "httpMethod": "POST",
    "requestContext": {
      "requestId": "smoke-test-1",
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
  /tmp/smoke-test-1.json 2>&1)

BODY=$(cat /tmp/smoke-test-1.json | jq -r '.body' 2>/dev/null || echo "{}")
GAMES=$(echo "$BODY" | jq -r '.data.listAvailableGames' 2>/dev/null || echo "null")

if [ "$GAMES" == "null" ] || [ -z "$GAMES" ]; then
  echo "❌ FAILED"
  echo "Response: $BODY"
  FAILED=1
else
  GAME_COUNT=$(echo "$GAMES" | jq 'length')
  echo "✅ PASSED ($GAME_COUNT games)"
fi

# Test 2: canStartGame
echo -n "Testing canStartGame... "
RESULT=$(aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --payload '{
    "body": "{\"query\":\"query { canStartGame { canPlay } }\"}",
    "httpMethod": "POST",
    "requestContext": {
      "requestId": "smoke-test-2",
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
  /tmp/smoke-test-2.json 2>&1)

BODY=$(cat /tmp/smoke-test-2.json | jq -r '.body' 2>/dev/null || echo "{}")
CAN_PLAY=$(echo "$BODY" | jq -r '.data.canStartGame.canPlay' 2>/dev/null || echo "null")

if [ "$CAN_PLAY" == "null" ]; then
  echo "❌ FAILED"
  echo "Response: $BODY"
  FAILED=1
else
  echo "✅ PASSED (canPlay: $CAN_PLAY)"
fi

# Test 3: Check Lambda size
echo -n "Checking Lambda size... "
CODE_SIZE=$(aws lambda get-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --query 'CodeSize' --output text)

if [ "$CODE_SIZE" -lt 50000 ]; then
  echo "❌ FAILED (size too small: $CODE_SIZE bytes)"
  FAILED=1
elif [ "$CODE_SIZE" -gt 100000 ]; then
  echo "⚠️  WARNING (size larger than expected: $CODE_SIZE bytes)"
else
  echo "✅ PASSED ($CODE_SIZE bytes)"
fi

# Test 4: Check for errors in recent logs
echo -n "Checking CloudWatch logs... "
ERROR_COUNT=$(aws logs filter-log-events \
  --log-group-name "/aws/lambda/$FUNCTION_NAME" \
  --start-time $(($(date +%s) - 300))000 \
  --filter-pattern "ERROR" \
  --query 'events' --output json | jq 'length')

if [ "$ERROR_COUNT" -gt 5 ]; then
  echo "⚠️  WARNING ($ERROR_COUNT errors in last 5 minutes)"
else
  echo "✅ PASSED ($ERROR_COUNT errors)"
fi

# Cleanup
rm -f /tmp/smoke-test-*.json

echo ""
if [ $FAILED -eq 0 ]; then
  echo "✅ All smoke tests passed!"
  exit 0
else
  echo "❌ Some smoke tests failed!"
  exit 1
fi
