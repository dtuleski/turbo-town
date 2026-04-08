#!/bin/bash
REGION="us-east-1"

# Use placehold.co for solid color swatches - guaranteed to work, unambiguous
# Format: https://placehold.co/300x300/HEX/HEX.png (bg/text color)

for ENV in dev prod; do
  TABLE="memory-game-language-words-${ENV}"
  echo "Fixing color images in ${TABLE} with solid swatches..."

  # Red
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key '{"wordId": {"S": "colors_red_1773513181894"}}' \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values '{
      ":img": {"S": "https://placehold.co/300x300/FF0000/FF0000.png"},
      ":dist": {"L": [
        {"S": "https://placehold.co/300x300/0000FF/0000FF.png"},
        {"S": "https://placehold.co/300x300/FFFF00/FFFF00.png"}
      ]}
    }' 2>/dev/null

  # Blue
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key '{"wordId": {"S": "colors_blue_1774964116940"}}' \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values '{
      ":img": {"S": "https://placehold.co/300x300/0000FF/0000FF.png"},
      ":dist": {"L": [
        {"S": "https://placehold.co/300x300/FF0000/FF0000.png"},
        {"S": "https://placehold.co/300x300/00AA00/00AA00.png"}
      ]}
    }' 2>/dev/null

  # Green
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key '{"wordId": {"S": "colors_green_1774964116940"}}' \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values '{
      ":img": {"S": "https://placehold.co/300x300/00AA00/00AA00.png"},
      ":dist": {"L": [
        {"S": "https://placehold.co/300x300/FFFF00/FFFF00.png"},
        {"S": "https://placehold.co/300x300/000000/000000.png"}
      ]}
    }' 2>/dev/null

  # Yellow
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key '{"wordId": {"S": "colors_yellow_1774964116940"}}' \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values '{
      ":img": {"S": "https://placehold.co/300x300/FFFF00/FFFF00.png"},
      ":dist": {"L": [
        {"S": "https://placehold.co/300x300/FF0000/FF0000.png"},
        {"S": "https://placehold.co/300x300/FFFFFF/FFFFFF.png"}
      ]}
    }' 2>/dev/null

  # Black
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key '{"wordId": {"S": "colors_black_1774964116940"}}' \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values '{
      ":img": {"S": "https://placehold.co/300x300/000000/000000.png"},
      ":dist": {"L": [
        {"S": "https://placehold.co/300x300/FFFFFF/FFFFFF.png"},
        {"S": "https://placehold.co/300x300/0000FF/0000FF.png"}
      ]}
    }' 2>/dev/null

  # White
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key '{"wordId": {"S": "colors_white_1774964116940"}}' \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values '{
      ":img": {"S": "https://placehold.co/300x300/FFFFFF/FFFFFF.png"},
      ":dist": {"L": [
        {"S": "https://placehold.co/300x300/000000/000000.png"},
        {"S": "https://placehold.co/300x300/00AA00/00AA00.png"}
      ]}
    }' 2>/dev/null

  echo "  ✅ Done ${ENV}"
done
echo "🎉 Color images fixed with solid swatches!"
