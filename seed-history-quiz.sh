#!/bin/bash
REGION="us-east-1"
for ENV in dev prod; do
  THEME_TABLE="memory-game-themes-${ENV}"
  CATALOG_TABLE="memory-game-catalog-${ENV}"
  echo "Seeding HISTORY_QUIZ to ${ENV}..."
  aws dynamodb put-item --table-name "$THEME_TABLE" --region "$REGION" --item '{
    "themeId": {"S": "HISTORY_QUIZ"}, "name": {"S": "History Quiz"},
    "description": {"S": "Learn history through famous quotes, events, and people!"},
    "emoji": {"S": "📜"}, "isPublished": {"BOOL": true}, "status": {"S": "PUBLISHED"},
    "category": {"S": "HISTORY"}, "publishedAt": {"S": "2026-03-31T00:00:00.000Z"},
    "createdAt": {"S": "2026-03-31T00:00:00.000Z"}, "updatedAt": {"S": "2026-03-31T00:00:00.000Z"}
  }'
  echo "  ✅ Theme added to ${THEME_TABLE}"
  aws dynamodb put-item --table-name "$CATALOG_TABLE" --region "$REGION" --item '{
    "gameId": {"S": "history-quiz"}, "title": {"S": "History Quiz"},
    "description": {"S": "Famous quotes, events & people through the ages."},
    "icon": {"S": "📜"}, "route": {"S": "/history-quiz/setup"}, "status": {"S": "ACTIVE"},
    "displayOrder": {"N": "11"}, "ageRange": {"S": "10+"}, "category": {"S": "History"}
  }'
  echo "  ✅ Catalog entry added to ${CATALOG_TABLE}"
done
echo "🎉 HISTORY_QUIZ seeded to both dev and prod!"
