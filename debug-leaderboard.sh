#!/bin/bash

echo "=== Debugging Leaderboard System ==="
echo ""

# Check if AWS CLI is configured
echo "1. Checking AWS CLI configuration..."
aws sts get-caller-identity 2>&1 | head -5
echo ""

# Check EventBridge event bus
echo "2. Checking EventBridge event bus..."
aws events describe-event-bus --name game-events-dev 2>&1 | head -10
echo ""

# Check EventBridge rules
echo "3. Checking EventBridge rules..."
aws events list-rules --event-bus-name game-events-dev --query 'Rules[*].[Name,State]' --output table 2>&1
echo ""

# Check Lambda functions
echo "4. Checking Lambda functions..."
aws lambda list-functions --query 'Functions[?contains(FunctionName, `leaderboard`)].{Name:FunctionName,Runtime:Runtime,LastModified:LastModified}' --output table 2>&1
echo ""

# Check DynamoDB tables
echo "5. Checking DynamoDB tables..."
aws dynamodb list-tables --query 'TableNames[?contains(@, `leaderboard`) || contains(@, `aggregate`)]' --output table 2>&1
echo ""

# Check recent Lambda logs (if function exists)
echo "6. Checking recent Lambda logs..."
FUNCTION_NAME=$(aws lambda list-functions --query 'Functions[?contains(FunctionName, `leaderboard`)].FunctionName' --output text 2>&1 | head -1)
if [ -n "$FUNCTION_NAME" ]; then
    echo "Found function: $FUNCTION_NAME"
    aws logs tail "/aws/lambda/$FUNCTION_NAME" --since 30m --format short 2>&1 | head -50
else
    echo "No leaderboard Lambda function found"
fi
echo ""

# Check DynamoDB table contents
echo "7. Checking LeaderboardEntries table..."
TABLE_NAME=$(aws dynamodb list-tables --query 'TableNames[?contains(@, `LeaderboardEntries`)]' --output text 2>&1 | head -1)
if [ -n "$TABLE_NAME" ]; then
    echo "Found table: $TABLE_NAME"
    aws dynamodb scan --table-name "$TABLE_NAME" --limit 5 --query 'Items[*]' 2>&1 | head -30
else
    echo "No LeaderboardEntries table found"
fi
echo ""

echo "=== Debug Complete ==="
