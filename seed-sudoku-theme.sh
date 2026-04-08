#!/bin/bash

# Seed Sudoku Theme to both dev and prod
REGION="us-east-1"

for ENV in dev prod; do
  TABLE_NAME="memory-game-themes-${ENV}"
  echo "Seeding Sudoku theme to ${TABLE_NAME}..."

  aws dynamodb put-item \
    --table-name "$TABLE_NAME" \
    --region "$REGION" \
    --item '{
      "themeId": {"S": "SUDOKU"},
      "name": {"S": "Sudoku"},
      "description": {"S": "Classic number puzzle - fill the 9x9 grid so every row, column, and 3x3 box contains 1-9!"},
      "emoji": {"S": "🔢"},
      "isPublished": {"BOOL": true},
      "status": {"S": "PUBLISHED"},
      "category": {"S": "Logic"},
      "publishedAt": {"S": "2025-03-15T00:00:00.000Z"},
      "createdAt": {"S": "2025-03-15T00:00:00.000Z"},
      "updatedAt": {"S": "2025-03-15T00:00:00.000Z"}
    }'

  echo "✅ Sudoku theme added to ${ENV}"
done

echo ""
echo "Verifying dev..."
aws dynamodb get-item --table-name memory-game-themes-dev --region $REGION --key '{"themeId": {"S": "SUDOKU"}}' --query 'Item.themeId.S' --output text
echo "Verifying prod..."
aws dynamodb get-item --table-name memory-game-themes-prod --region $REGION --key '{"themeId": {"S": "SUDOKU"}}' --query 'Item.themeId.S' --output text
echo "Done!"
