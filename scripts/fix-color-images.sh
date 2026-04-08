#!/bin/bash
REGION="us-east-1"

# Better color images: obvious solid-color objects
# Red = red rose, Blue = blue ocean, Green = green leaf, Yellow = sunflower, Black = black cat, White = white snow

for ENV in dev prod; do
  TABLE="memory-game-language-words-${ENV}"
  echo "Fixing color images in ${TABLE}..."

  # Red - red rose
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key '{"wordId": {"S": "colors_red_1773513181894"}}' \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values '{
      ":img": {"S": "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300&h=300&fit=crop"},
      ":dist": {"L": [
        {"S": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"},
        {"S": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&h=300&fit=crop"}
      ]}
    }' 2>/dev/null

  # Blue - clear blue sky/ocean
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key '{"wordId": {"S": "colors_blue_1774964116940"}}' \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values '{
      ":img": {"S": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop"},
      ":dist": {"L": [
        {"S": "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300&h=300&fit=crop"},
        {"S": "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=300&h=300&fit=crop"}
      ]}
    }' 2>/dev/null

  # Green - green leaf close-up
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key '{"wordId": {"S": "colors_green_1774964116940"}}' \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values '{
      ":img": {"S": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=300&fit=crop"},
      ":dist": {"L": [
        {"S": "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300&h=300&fit=crop"},
        {"S": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop"}
      ]}
    }' 2>/dev/null

  # Yellow - sunflower
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key '{"wordId": {"S": "colors_yellow_1774964116940"}}' \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values '{
      ":img": {"S": "https://images.unsplash.com/photo-1470509037663-253afd7f0f51?w=300&h=300&fit=crop"},
      ":dist": {"L": [
        {"S": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=300&fit=crop"},
        {"S": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=300&fit=crop"}
      ]}
    }' 2>/dev/null

  # Black - black cat
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key '{"wordId": {"S": "colors_black_1774964116940"}}' \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values '{
      ":img": {"S": "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=300&h=300&fit=crop"},
      ":dist": {"L": [
        {"S": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"},
        {"S": "https://images.unsplash.com/photo-1470509037663-253afd7f0f51?w=300&h=300&fit=crop"}
      ]}
    }' 2>/dev/null

  # White - white snow landscape
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key '{"wordId": {"S": "colors_white_1774964116940"}}' \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values '{
      ":img": {"S": "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=300&h=300&fit=crop"},
      ":dist": {"L": [
        {"S": "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=300&h=300&fit=crop"},
        {"S": "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300&h=300&fit=crop"}
      ]}
    }' 2>/dev/null

  echo "  ✅ Done ${ENV}"
done
echo "🎉 Color images fixed!"
