#!/bin/bash

# Seed themes into DynamoDB

TABLE_NAME="memory-game-themes-dev"

echo "Seeding themes into $TABLE_NAME..."

# Animals theme
aws dynamodb put-item --table-name $TABLE_NAME --item '{
  "themeId": {"S": "ANIMALS"},
  "name": {"S": "Animals"},
  "category": {"S": "Nature"},
  "description": {"S": "Cute animals from around the world"},
  "pairs": {"N": "8"},
  "status": {"S": "PUBLISHED"},
  "createdAt": {"S": "2026-03-04T00:00:00.000Z"},
  "updatedAt": {"S": "2026-03-04T00:00:00.000Z"}
}'

# Fruits theme
aws dynamodb put-item --table-name $TABLE_NAME --item '{
  "themeId": {"S": "FRUITS"},
  "name": {"S": "Fruits"},
  "category": {"S": "Food"},
  "description": {"S": "Delicious fruits and berries"},
  "pairs": {"N": "8"},
  "status": {"S": "PUBLISHED"},
  "createdAt": {"S": "2026-03-04T00:00:00.000Z"},
  "updatedAt": {"S": "2026-03-04T00:00:00.000Z"}
}'

# Vehicles theme
aws dynamodb put-item --table-name $TABLE_NAME --item '{
  "themeId": {"S": "VEHICLES"},
  "name": {"S": "Vehicles"},
  "category": {"S": "Transportation"},
  "description": {"S": "Cars, planes, and more"},
  "pairs": {"N": "8"},
  "status": {"S": "PUBLISHED"},
  "createdAt": {"S": "2026-03-04T00:00:00.000Z"},
  "updatedAt": {"S": "2026-03-04T00:00:00.000Z"}
}'

# Space theme
aws dynamodb put-item --table-name $TABLE_NAME --item '{
  "themeId": {"S": "SPACE"},
  "name": {"S": "Space"},
  "category": {"S": "Science"},
  "description": {"S": "Planets, stars, and galaxies"},
  "pairs": {"N": "8"},
  "status": {"S": "PUBLISHED"},
  "createdAt": {"S": "2026-03-04T00:00:00.000Z"},
  "updatedAt": {"S": "2026-03-04T00:00:00.000Z"}
}'

# Sports theme
aws dynamodb put-item --table-name $TABLE_NAME --item '{
  "themeId": {"S": "SPORTS"},
  "name": {"S": "Sports"},
  "category": {"S": "Activities"},
  "description": {"S": "Popular sports and games"},
  "pairs": {"N": "8"},
  "status": {"S": "PUBLISHED"},
  "createdAt": {"S": "2026-03-04T00:00:00.000Z"},
  "updatedAt": {"S": "2026-03-04T00:00:00.000Z"}
}'

echo "✅ Themes seeded successfully!"
