#!/bin/bash
REGION="us-east-1"
for ENV in dev prod; do
  THEME_TABLE="memory-game-themes-${ENV}"
  CATALOG_TABLE="memory-game-catalog-${ENV}"
  echo "Seeding CIVICS_QUIZ to ${ENV}..."
  aws dynamodb put-item --table-name "$THEME_TABLE" --region "$REGION" --item '{
    "themeId": {"S": "CIVICS_QUIZ"}, "name": {"S": "Civics Quiz"},
    "description": {"S": "Master the official US Citizenship Test - 100 civics questions!"},
    "emoji": {"S": "🇺🇸"}, "isPublished": {"BOOL": true}, "status": {"S": "PUBLISHED"},
    "category": {"S": "CIVICS"}, "publishedAt": {"S": "2026-03-31T00:00:00.000Z"},
    "createdAt": {"S": "2026-03-31T00:00:00.000Z"}, "updatedAt": {"S": "2026-03-31T00:00:00.000Z"}
  }'
  aws dynamodb put-item --table-name "$CATALOG_TABLE" --region "$REGION" --item '{
    "gameId": {"S": "civics-quiz"}, "title": {"S": "Civics Quiz"},
    "description": {"S": "Master the official US Citizenship Test!"},
    "icon": {"S": "🇺🇸"}, "route": {"S": "/civics-quiz/setup"}, "status": {"S": "ACTIVE"},
    "displayOrder": {"N": "12"}, "ageRange": {"S": "10+"}, "category": {"S": "Civics"}
  }'
  echo "  ✅ Done ${ENV}"
done
echo "🎉 CIVICS_QUIZ seeded!"
