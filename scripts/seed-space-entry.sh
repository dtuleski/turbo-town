#!/bin/bash

# Seed Space Entry into the Themes table and Game Catalog
# Run with: bash scripts/seed-space-entry.sh
# For production: bash scripts/seed-space-entry.sh --prod

THEMES_TABLE="memory-game-themes-dev"
CATALOG_TABLE="memory-game-catalog-dev"
REGION="us-east-1"
PROFILE=""

if [ "$1" = "--prod" ]; then
  THEMES_TABLE="memory-game-themes-prod"
  CATALOG_TABLE="memory-game-catalog-prod"
  PROFILE="--profile dashden-new"
  echo "🚀 Seeding PRODUCTION tables..."
else
  echo "🧪 Seeding DEV tables..."
fi

# 1. Seed the themes table
echo "📝 Adding SPACE_ENTRY to themes table..."
aws dynamodb put-item \
  --table-name "$THEMES_TABLE" \
  --region "$REGION" \
  $PROFILE \
  --item '{
    "themeId": {"S": "SPACE_ENTRY"},
    "name": {"S": "Space Entry"},
    "status": {"S": "PUBLISHED"}
  }'

echo "✅ SPACE_ENTRY added to themes table"

# 2. Seed the game catalog
echo "📝 Adding space-entry to game catalog..."
aws dynamodb put-item \
  --table-name "$CATALOG_TABLE" \
  --region "$REGION" \
  $PROFILE \
  --item '{
    "gameId": {"S": "space-entry"},
    "title": {"S": "Space Entry"},
    "description": {"S": "Calculate your reentry angle and land safely on Earth! Learn real-world geography while mastering orbital physics."},
    "icon": {"S": "🚀"},
    "route": {"S": "/space-entry/setup"},
    "status": {"S": "ACTIVE"},
    "displayOrder": {"N": "18"},
    "ageRange": {"S": "8+"},
    "category": {"S": "Science & Math"}
  }'

echo "✅ Space Entry added to game catalog"
echo ""
echo "To verify:"
echo "aws dynamodb get-item --table-name $THEMES_TABLE --region $REGION $PROFILE --key '{\"themeId\": {\"S\": \"SPACE_ENTRY\"}}'"
echo "aws dynamodb get-item --table-name $CATALOG_TABLE --region $REGION $PROFILE --key '{\"gameId\": {\"S\": \"space-entry\"}}'"
