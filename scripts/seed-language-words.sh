#!/bin/bash
# Bulk seed language words into DynamoDB
# Usage: bash scripts/seed-language-words.sh

TABLE_NAME="memory-game-language-words-dev"
REGION="us-east-1"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
COUNT=0

echo "🌍 Seeding language words into $TABLE_NAME..."

put_word() {
  local WORD_ID="$1"
  local CATEGORY="$2"
  local DIFFICULTY="$3"
  local IMAGE_URL="$4"
  local D1="$5"
  local D2="$6"
  # Translations: en_w en_p es_w es_p fr_w fr_p de_w de_p it_w it_p pt_w pt_p
  local EN_W="$7" EN_P="$8"
  local ES_W="$9" ES_P="${10}"
  local FR_W="${11}" FR_P="${12}"
  local DE_W="${13}" DE_P="${14}"
  local IT_W="${15}" IT_P="${16}"
  local PT_W="${17}" PT_P="${18}"

  aws dynamodb put-item --table-name "$TABLE_NAME" --region "$REGION" --item "{
    \"wordId\": {\"S\": \"${CATEGORY}_${WORD_ID}_seed\"},
    \"category\": {\"S\": \"$CATEGORY\"},
    \"difficulty\": {\"S\": \"$DIFFICULTY\"},
    \"languageCode\": {\"S\": \"multi\"},
    \"imageUrl\": {\"S\": \"$IMAGE_URL\"},
    \"distractorImages\": {\"L\": [{\"S\": \"$D1\"}, {\"S\": \"$D2\"}]},
    \"translations\": {\"M\": {
      \"en\": {\"M\": {\"word\": {\"S\": \"$EN_W\"}, \"pronunciation\": {\"S\": \"$EN_P\"}}},
      \"es\": {\"M\": {\"word\": {\"S\": \"$ES_W\"}, \"pronunciation\": {\"S\": \"$ES_P\"}}},
      \"fr\": {\"M\": {\"word\": {\"S\": \"$FR_W\"}, \"pronunciation\": {\"S\": \"$FR_P\"}}},
      \"de\": {\"M\": {\"word\": {\"S\": \"$DE_W\"}, \"pronunciation\": {\"S\": \"$DE_P\"}}},
      \"it\": {\"M\": {\"word\": {\"S\": \"$IT_W\"}, \"pronunciation\": {\"S\": \"$IT_P\"}}},
      \"pt\": {\"M\": {\"word\": {\"S\": \"$PT_W\"}, \"pronunciation\": {\"S\": \"$PT_P\"}}}
    }},
    \"createdAt\": {\"S\": \"$NOW\"},
    \"updatedAt\": {\"S\": \"$NOW\"}
  }" 2>/dev/null

  COUNT=$((COUNT + 1))
  echo "  [$COUNT] $EN_W ($CATEGORY/$DIFFICULTY)"
}

# Unsplash base
U="https://images.unsplash.com"

echo ""
echo "=== ANIMALS ==="
