#!/bin/bash

echo "🔍 Testing Event Flow..."
echo ""

# Check if EventBridge rule exists and is enabled
echo "1️⃣ Checking EventBridge Rule..."
aws events describe-rule \
  --name "GameCompleted-to-Leaderboard-dev" \
  --event-bus-name "game-events-dev" \
  --query '{Name:Name,State:State,EventPattern:EventPattern}' \
  --output json

echo ""
echo "2️⃣ Checking Rule Targets..."
aws events list-targets-by-rule \
  --rule "GameCompleted-to-Leaderboard-dev" \
  --event-bus-name "game-events-dev" \
  --query 'Targets[0].{Arn:Arn,DeadLetterQueue:DeadLetterConfig.Arn}' \
  --output json

echo ""
echo "3️⃣ Checking Lambda Function..."
aws lambda get-function \
  --function-name MemoryGame-LeaderboardService-dev \
  --query '{Name:Configuration.FunctionName,State:Configuration.State,LastModified:Configuration.LastModified}' \
  --output json

echo ""
echo "4️⃣ Recent Game Service Logs (last 5 minutes)..."
aws logs tail /aws/lambda/MemoryGame-GameService-dev --since 5m --format short | grep -i "event\|completed" | tail -10

echo ""
echo "5️⃣ Recent Leaderboard Service Logs (last 5 minutes)..."
aws logs tail /aws/lambda/MemoryGame-LeaderboardService-dev --since 5m --format short | tail -10

echo ""
echo "6️⃣ Checking DLQ for failed events..."
aws sqs get-queue-attributes \
  --queue-url $(aws sqs get-queue-url --queue-name leaderboard-dlq-dev --query 'QueueUrl' --output text) \
  --attribute-names ApproximateNumberOfMessages \
  --query 'Attributes.ApproximateNumberOfMessages' \
  --output text

echo ""
echo "✅ Event flow check complete!"
