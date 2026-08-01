#!/bin/bash

# Seed Bond & Burn into the Themes table and Game Catalog
# Run with: bash scripts/seed-bond-and-burn.sh
# For production: bash scripts/seed-bond-and-burn.sh --prod

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
echo "📝 Adding BOND_AND_BURN to themes table..."
aws dynamodb put-item \
  --table-name "$THEMES_TABLE" \
  --region "$REGION" \
  $PROFILE \
  --item '{
    "themeId": {"S": "BOND_AND_BURN"},
    "name": {"S": "Bond & Burn"},
    "status": {"S": "PUBLISHED"}
  }'

echo "✅ BOND_AND_BURN added to themes table"

# 2. Seed the game catalog
echo "📝 Adding bond-and-burn to game catalog..."
aws dynamodb put-item \
  --table-name "$CATALOG_TABLE" \
  --region "$REGION" \
  $PROFILE \
  --item '{
    "gameId": {"S": "bond-and-burn"},
    "title": {"S": "Bond & Burn"},
    "description": {"S": "Combine molecules in the reaction lab! Grab elements from the conveyor belt and synthesize compounds before the lab overheats."},
    "icon": {"S": "🧪"},
    "route": {"S": "/bond-and-burn/setup"},
    "status": {"S": "ACTIVE"},
    "displayOrder": {"N": "20"},
    "ageRange": {"S": "8+"},
    "category": {"S": "Science & Math"}
  }'

echo "✅ Bond & Burn added to game catalog"
echo ""
echo "To verify:"
echo "aws dynamodb get-item --table-name $THEMES_TABLE --region $REGION $PROFILE --key '{\"themeId\": {\"S\": \"BOND_AND_BURN\"}}'"
echo "aws dynamodb get-item --table-name $CATALOG_TABLE --region $REGION $PROFILE --key '{\"gameId\": {\"S\": \"bond-and-burn\"}}'"
