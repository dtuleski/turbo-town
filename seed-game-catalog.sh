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

# Math Challenge
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --item '{
    "gameId": {"S": "math-challenge"},
    "title": {"S": "Math Challenge"},
    "description": {"S": "Solve fun math problems as fast as you can!"},
    "icon": {"S": "🔢"},
    "route": {"S": "/math/setup"},
    "status": {"S": "ACTIVE"},
    "displayOrder": {"N": "2"},
    "ageRange": {"S": "6+"},
    "category": {"S": "Math"}
  }'

echo "✅ Math Challenge added to catalog"

# Word Puzzle
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --item '{
    "gameId": {"S": "word-puzzle"},
    "title": {"S": "Word Puzzle"},
    "description": {"S": "Find hidden words in the grid! Test your vocabulary."},
    "icon": {"S": "📝"},
    "route": {"S": "/word-puzzle/setup"},
    "status": {"S": "ACTIVE"},
    "displayOrder": {"N": "3"},
    "ageRange": {"S": "7+"},
    "category": {"S": "Words"}
  }'

echo "✅ Word Puzzle added to catalog"

# Language Learning
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --item '{
    "gameId": {"S": "language-learning"},
    "title": {"S": "Language Learning"},
    "description": {"S": "Learn new languages with fun vocabulary games!"},
    "icon": {"S": "🌍"},
    "route": {"S": "/language"},
    "status": {"S": "ACTIVE"},
    "displayOrder": {"N": "4"},
    "ageRange": {"S": "8+"},
    "category": {"S": "Language"}
  }'

echo "✅ Language Learning added to catalog"

echo ""
echo "🎉 Game catalog seeded successfully!"
echo ""
echo "To verify, run:"
echo "aws dynamodb scan --table-name $TABLE_NAME --region $REGION"
