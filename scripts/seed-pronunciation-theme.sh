#!/bin/bash

# Seed LANGUAGE_PRONUNCIATION theme into DynamoDB
# Run this once to register the new pronunciation mode as a valid game theme.

TABLE_NAME="${1:-memory-game-themes-dev}"
PROFILE_FLAG="${2:+--profile $2}"

echo "Seeding LANGUAGE_PRONUNCIATION theme into $TABLE_NAME..."

aws dynamodb put-item --table-name "$TABLE_NAME" $PROFILE_FLAG --item '{
  "themeId": {"S": "LANGUAGE_PRONUNCIATION"},
  "name": {"S": "Language Pronunciation"},
  "category": {"S": "Language Learning"},
  "description": {"S": "Practice pronunciation by speaking words aloud. See an image, say the word, and get scored on accuracy."},
  "pairs": {"N": "0"},
  "status": {"S": "PUBLISHED"},
  "createdAt": {"S": "2026-08-21T00:00:00.000Z"},
  "updatedAt": {"S": "2026-08-21T00:00:00.000Z"}
}'

echo "Done! LANGUAGE_PRONUNCIATION theme seeded."
echo ""
echo "For production, run:"
echo "  ./scripts/seed-pronunciation-theme.sh memory-game-themes-prod dashden-new"
