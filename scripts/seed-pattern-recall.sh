#!/bin/bash

# Seed Pattern Recall into the Themes table and Game Catalog
# Run with: bash scripts/seed-pattern-recall.sh
# For production: bash scripts/seed-pattern-recall.sh --prod

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
echo "📝 Adding PATTERN_RECALL to themes table..."
aws dynamodb put-item \
  --table-name "$THEMES_TABLE" \
  --region "$REGION" \
  $PROFILE \
  --item '{
    "themeId": {"S": "PATTERN_RECALL"},
    "name": {"S": "Pattern Recall"},
    "status": {"S": "PUBLISHED"}
  }'

echo "✅ PATTERN_RECALL added to themes table"

# 2. Seed the game catalog
echo "📝 Adding pattern-recall to game catalog..."
aws dynamodb put-item \
  --table-name "$CATALOG_TABLE" \
  --region "$REGION" \
  $PROFILE \
  --item '{
    "gameId": {"S": "pattern-recall"},
    "title": {"S": "Pattern Recall"},
    "description": {"S": "Memorize and repeat patterns in this Simon Says-style memory game!"},
    "icon": {"S": "🧩"},
    "route": {"S": "/pattern-recall/setup"},
    "status": {"S": "ACTIVE"},
    "displayOrder": {"N": "17"},
    "ageRange": {"S": "5-14"},
    "category": {"S": "Puzzles & Logic"}
  }'

echo "✅ Pattern Recall added to game catalog"
echo ""
echo "To verify:"
echo "aws dynamodb get-item --table-name $THEMES_TABLE --region $REGION $PROFILE --key '{\"themeId\": {\"S\": \"PATTERN_RECALL\"}}'"
echo "aws dynamodb get-item --table-name $CATALOG_TABLE --region $REGION $PROFILE --key '{\"gameId\": {\"S\": \"pattern-recall\"}}'"
