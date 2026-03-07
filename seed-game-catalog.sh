#!/bin/bash

# Seed Game Catalog with Memory Game
# This script adds the Memory Game to the game catalog table

TABLE_NAME="memory-game-catalog-dev"
REGION="us-east-1"

echo "Seeding Game Catalog..."

# Memory Game
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --item '{
    "gameId": {"S": "memory-match"},
    "title": {"S": "Memory Match"},
    "description": {"S": "Find matching pairs! Test your memory with fun themes."},
    "icon": {"S": "🎮"},
    "route": {"S": "/game/setup"},
    "status": {"S": "ACTIVE"},
    "displayOrder": {"N": "1"},
    "ageRange": {"S": "4+"},
    "category": {"S": "Memory"}
  }'

echo "✅ Memory Game added to catalog"

# Coming Soon - Math Challenge (example)
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --item '{
    "gameId": {"S": "math-challenge"},
    "title": {"S": "Math Challenge"},
    "description": {"S": "Solve fun math problems! Coming soon."},
    "icon": {"S": "🔢"},
    "route": {"S": "/games/math"},
    "status": {"S": "COMING_SOON"},
    "displayOrder": {"N": "2"},
    "ageRange": {"S": "6+"},
    "category": {"S": "Math"}
  }'

echo "✅ Math Challenge added to catalog (coming soon)"

# Coming Soon - Word Puzzle (example)
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --item '{
    "gameId": {"S": "word-puzzle"},
    "title": {"S": "Word Puzzle"},
    "description": {"S": "Find hidden words! Coming soon."},
    "icon": {"S": "📝"},
    "route": {"S": "/games/words"},
    "status": {"S": "COMING_SOON"},
    "displayOrder": {"N": "3"},
    "ageRange": {"S": "5+"},
    "category": {"S": "Words"}
  }'

echo "✅ Word Puzzle added to catalog (coming soon)"

echo ""
echo "🎉 Game catalog seeded successfully!"
echo ""
echo "To verify, run:"
echo "aws dynamodb scan --table-name $TABLE_NAME --region $REGION"
