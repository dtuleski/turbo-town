#!/bin/bash

# Seed Mini Golf into the Themes table and Game Catalog
# Run with: bash scripts/seed-mini-golf.sh
# For production: bash scripts/seed-mini-golf.sh --prod

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
echo "📝 Adding MINI_GOLF to themes table..."
aws dynamodb put-item \
  --table-name "$THEMES_TABLE" \
  --region "$REGION" \
  $PROFILE \
  --item '{
    "themeId": {"S": "MINI_GOLF"},
    "name": {"S": "Mini Golf"},
    "status": {"S": "PUBLISHED"}
  }'

echo "✅ MINI_GOLF added to themes table"

# 2. Seed the game catalog
echo "📝 Adding mini-golf to game catalog..."
aws dynamodb put-item \
  --table-name "$CATALOG_TABLE" \
  --region "$REGION" \
  $PROFILE \
  --item '{
    "gameId": {"S": "mini-golf"},
    "title": {"S": "Mini Golf"},
    "description": {"S": "Physics-based putting! Aim, set power, and navigate obstacles to sink the ball in as few strokes as possible."},
    "icon": {"S": "⛳"},
    "route": {"S": "/mini-golf/setup"},
    "status": {"S": "ACTIVE"},
    "displayOrder": {"N": "22"},
    "ageRange": {"S": "6+"},
    "category": {"S": "Physics & Strategy"}
  }'

echo "✅ Mini Golf added to game catalog"
echo ""
echo "To verify:"
echo "aws dynamodb get-item --table-name $THEMES_TABLE --region $REGION $PROFILE --key '{\"themeId\": {\"S\": \"MINI_GOLF\"}}'"
echo "aws dynamodb get-item --table-name $CATALOG_TABLE --region $REGION $PROFILE --key '{\"gameId\": {\"S\": \"mini-golf\"}}'"
