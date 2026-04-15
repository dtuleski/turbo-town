#!/bin/bash

# Seed Math Maze into the Game Catalog
# Run with: bash scripts/seed-math-maze.sh
# For production: bash scripts/seed-math-maze.sh --prod

TABLE_NAME="memory-game-catalog-dev"
REGION="us-east-1"
PROFILE=""

if [ "$1" = "--prod" ]; then
  TABLE_NAME="memory-game-catalog-prod"
  PROFILE="--profile dashden-new"
  echo "🚀 Seeding PRODUCTION catalog..."
else
  echo "🧪 Seeding DEV catalog..."
fi

aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  $PROFILE \
  --item '{
    "gameId": {"S": "math-maze"},
    "title": {"S": "Math Maze"},
    "description": {"S": "Navigate a maze by solving math equations at gates!"},
    "icon": {"S": "🧮"},
    "route": {"S": "/math-maze/setup"},
    "status": {"S": "ACTIVE"},
    "displayOrder": {"N": "16"},
    "ageRange": {"S": "6-14"},
    "category": {"S": "Science & Math"}
  }'

echo "✅ Math Maze added to catalog"
echo ""
echo "To verify:"
echo "aws dynamodb get-item --table-name $TABLE_NAME --region $REGION $PROFILE --key '{\"gameId\": {\"S\": \"math-maze\"}}'"
