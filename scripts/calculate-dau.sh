#!/bin/bash

# Calculate Daily Active Users (DAU) for DashDen
# This script provides multiple methods to calculate DAU

set -e

REGION="us-east-1"
ENV="dev"
GAMES_TABLE="memory-game-games-${ENV}"
RATE_LIMITS_TABLE="memory-game-rate-limits-${ENV}"

echo "=========================================="
echo "DashDen - Daily Active Users Calculator"
echo "=========================================="
echo ""

# Get today's date in ISO format
TODAY=$(date -u +"%Y-%m-%d")
echo "📅 Calculating DAU for: $TODAY"
echo ""

# ==========================================
# METHOD 1: Count from Games Table
# ==========================================
echo "METHOD 1: Games Table (Most Accurate)"
echo "--------------------------------------"
echo "Counting unique users who played games today..."
echo ""

# Query games started today
aws dynamodb scan \
  --table-name "$GAMES_TABLE" \
  --filter-expression "begins_with(startedAt, :today)" \
  --expression-attribute-values "{\":today\":{\"S\":\"$TODAY\"}}" \
  --projection-expression "userId" \
  --region "$REGION" \
  --output json > /tmp/games_today.json

# Count unique users
UNIQUE_USERS_GAMES=$(cat /tmp/games_today.json | jq -r '.Items[].userId.S' | sort -u | wc -l | tr -d ' ')
TOTAL_GAMES=$(cat /tmp/games_today.json | jq '.Items | length')

echo "✅ Unique users who played today: $UNIQUE_USERS_GAMES"
echo "   Total games played: $TOTAL_GAMES"
echo "   Average games per user: $(echo "scale=2; $TOTAL_GAMES / $UNIQUE_USERS_GAMES" | bc 2>/dev/null || echo "N/A")"
echo ""

# ==========================================
# METHOD 2: Count from Rate Limits Table
# ==========================================
echo "METHOD 2: Rate Limits Table (Faster)"
echo "--------------------------------------"
echo "Counting users with rate limit records updated today..."
echo ""

# Query rate limits updated today
aws dynamodb scan \
  --table-name "$RATE_LIMITS_TABLE" \
  --filter-expression "begins_with(updatedAt, :today)" \
  --expression-attribute-values "{\":today\":{\"S\":\"$TODAY\"}}" \
  --projection-expression "userId,#count,tier" \
  --expression-attribute-names '{"#count":"count"}' \
  --region "$REGION" \
  --output json > /tmp/rate_limits_today.json

UNIQUE_USERS_RATE=$(cat /tmp/rate_limits_today.json | jq -r '.Items[].userId.S' | sort -u | wc -l | tr -d ' ')

echo "✅ Unique users active today: $UNIQUE_USERS_RATE"
echo ""

# Show breakdown by tier
echo "   Breakdown by subscription tier:"
FREE_USERS=$(cat /tmp/rate_limits_today.json | jq -r '.Items[] | select(.tier.S=="FREE") | .userId.S' | wc -l | tr -d ' ')
BASIC_USERS=$(cat /tmp/rate_limits_today.json | jq -r '.Items[] | select(.tier.S=="BASIC" or .tier.S=="LIGHT") | .userId.S' | wc -l | tr -d ' ')
PREMIUM_USERS=$(cat /tmp/rate_limits_today.json | jq -r '.Items[] | select(.tier.S=="PREMIUM" or .tier.S=="STANDARD") | .userId.S' | wc -l | tr -d ' ')

echo "   - FREE: $FREE_USERS users"
echo "   - BASIC: $BASIC_USERS users"
echo "   - PREMIUM: $PREMIUM_USERS users"
echo ""

# ==========================================
# METHOD 3: CloudWatch Logs Insights
# ==========================================
echo "METHOD 3: CloudWatch Logs (API Activity)"
echo "--------------------------------------"
echo "Querying API Gateway logs for unique users..."
echo ""

# Get start and end timestamps for today (Unix milliseconds)
START_TIME=$(date -u -d "$TODAY 00:00:00" +%s)000
END_TIME=$(date -u -d "$TODAY 23:59:59" +%s)999

# CloudWatch Insights query
QUERY_ID=$(aws logs start-query \
  --log-group-name "/aws/apigateway/memory-game-${ENV}" \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --query-string 'fields @timestamp, @message | filter @message like /userId/ | stats count_distinct(@message) as uniqueUsers' \
  --region "$REGION" \
  --output text --query 'queryId')

echo "   Query ID: $QUERY_ID"
echo "   Waiting for results..."

# Wait for query to complete
sleep 5

# Get results
aws logs get-query-results \
  --query-id "$QUERY_ID" \
  --region "$REGION" \
  --output json > /tmp/cloudwatch_dau.json

STATUS=$(cat /tmp/cloudwatch_dau.json | jq -r '.status')
if [ "$STATUS" = "Complete" ]; then
  echo "✅ CloudWatch query completed"
  cat /tmp/cloudwatch_dau.json | jq -r '.results'
else
  echo "⏳ Query still running. Check later with:"
  echo "   aws logs get-query-results --query-id $QUERY_ID --region $REGION"
fi
echo ""

# ==========================================
# SUMMARY
# ==========================================
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "📊 Daily Active Users (DAU): $UNIQUE_USERS_GAMES"
echo ""
echo "Breakdown:"
echo "  - Free tier users: $FREE_USERS ($(echo "scale=1; $FREE_USERS * 100 / $UNIQUE_USERS_RATE" | bc 2>/dev/null || echo "0")%)"
echo "  - Paid users: $((BASIC_USERS + PREMIUM_USERS)) ($(echo "scale=1; ($BASIC_USERS + $PREMIUM_USERS) * 100 / $UNIQUE_USERS_RATE" | bc 2>/dev/null || echo "0")%)"
echo ""
echo "Engagement:"
echo "  - Total games played: $TOTAL_GAMES"
echo "  - Games per user: $(echo "scale=2; $TOTAL_GAMES / $UNIQUE_USERS_GAMES" | bc 2>/dev/null || echo "N/A")"
echo ""
echo "=========================================="

# Cleanup
rm -f /tmp/games_today.json /tmp/rate_limits_today.json /tmp/cloudwatch_dau.json

echo ""
echo "✅ DAU calculation complete!"
