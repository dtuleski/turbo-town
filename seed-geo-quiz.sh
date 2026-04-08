#!/bin/bash

# Seed GEO_QUIZ theme + catalog entry to both dev and prod
REGION="us-east-1"

for ENV in dev prod; do
  THEME_TABLE="memory-game-themes-${ENV}"
  CATALOG_TABLE="memory-game-catalog-${ENV}"

  echo "Seeding GEO_QUIZ to ${ENV}..."

  # Theme entry
  aws dynamodb put-item \
    --table-name "$THEME_TABLE" \
    --region "$REGION" \
    --item '{
      "themeId": {"S": "GEO_QUIZ"},
      "name": {"S": "Geo Quiz"},
      "description": {"S": "Test your geography knowledge with capitals, flags, states, silhouettes, and continents!"},
      "emoji": {"S": "🌍"},
      "isPublished": {"BOOL": true},
      "status": {"S": "PUBLISHED"},
      "category": {"S": "GEOGRAPHY"},
      "publishedAt": {"S": "2026-03-31T00:00:00.000Z"},
      "createdAt": {"S": "2026-03-31T00:00:00.000Z"},
      "updatedAt": {"S": "2026-03-31T00:00:00.000Z"}
    }'

  echo "  ✅ Theme added to ${THEME_TABLE}"

  # Catalog entry
  aws dynamodb put-item \
    --table-name "$CATALOG_TABLE" \
    --region "$REGION" \
    --item '{
      "gameId": {"S": "geo-quiz"},
      "title": {"S": "Geo Quiz"},
      "description": {"S": "Test your geography knowledge! Capitals, flags, states & more."},
      "icon": {"S": "🌍"},
      "route": {"S": "/geo-quiz/setup"},
      "status": {"S": "ACTIVE"},
      "displayOrder": {"N": "10"},
      "ageRange": {"S": "7+"},
      "category": {"S": "Geography"}
    }'

  echo "  ✅ Catalog entry added to ${CATALOG_TABLE}"
done

echo ""
echo "🎉 GEO_QUIZ seeded to both dev and prod!"
