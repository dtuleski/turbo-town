#!/bin/bash

# Seed Math Challenge Theme
# This script adds the MATH_CHALLENGE theme to the themes table

TABLE_NAME="memory-game-themes-dev"
REGION="us-east-1"

echo "Seeding Math Challenge Theme..."

aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --item '{
    "themeId": {"S": "MATH_CHALLENGE"},
    "name": {"S": "Math Challenge"},
    "description": {"S": "Test your math skills with addition, subtraction, multiplication, division, powers, and roots!"},
    "emoji": {"S": "🔢"},
    "isPublished": {"BOOL": true},
    "status": {"S": "PUBLISHED"},
    "category": {"S": "MATH"},
    "publishedAt": {"S": "2024-03-07T00:00:00.000Z"},
    "createdAt": {"S": "2024-03-07T00:00:00.000Z"},
    "updatedAt": {"S": "2024-03-07T00:00:00.000Z"}
  }'

echo "✅ Math Challenge theme added"
echo ""
echo "To verify, run:"
echo "aws dynamodb get-item --table-name $TABLE_NAME --region $REGION --key '{\"themeId\": {\"S\": \"MATH_CHALLENGE\"}}'"
