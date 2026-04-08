#!/bin/bash
REGION="us-east-1"
for ENV in dev prod; do
  T="memory-game-themes-${ENV}"
  C="memory-game-catalog-${ENV}"
  echo "Seeding COLOR_BY_NUMBER to ${ENV}..."
  aws dynamodb put-item --table-name "$T" --region "$REGION" --item '{
    "themeId":{"S":"COLOR_BY_NUMBER"},"name":{"S":"Color by Number"},
    "description":{"S":"Paint pixel art masterpieces by number!"},
    "emoji":{"S":"🎨"},"isPublished":{"BOOL":true},"status":{"S":"PUBLISHED"},
    "category":{"S":"ART"},"publishedAt":{"S":"2026-04-06T00:00:00.000Z"},
    "createdAt":{"S":"2026-04-06T00:00:00.000Z"},"updatedAt":{"S":"2026-04-06T00:00:00.000Z"}}'
  aws dynamodb put-item --table-name "$C" --region "$REGION" --item '{
    "gameId":{"S":"color-by-number"},"title":{"S":"Color by Number"},
    "description":{"S":"Paint pixel art masterpieces by number!"},
    "icon":{"S":"🎨"},"route":{"S":"/color-by-number/setup"},"status":{"S":"ACTIVE"},
    "displayOrder":{"N":"13"},"ageRange":{"S":"4+"},"category":{"S":"Art"}}'
  echo "  ✅ Done ${ENV}"
done
echo "🎉 COLOR_BY_NUMBER seeded!"
