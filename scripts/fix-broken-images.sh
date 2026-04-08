#!/bin/bash
# Fix broken Unsplash image URLs in language words table
TABLE="memory-game-language-words-dev"
REGION="us-east-1"

update_image() {
  local WORD_ID="$1"
  local NEW_URL="$2"
  echo "Updating $WORD_ID..."
  aws dynamodb update-item \
    --table-name "$TABLE" \
    --key "{\"wordId\":{\"S\":\"$WORD_ID\"}}" \
    --update-expression "SET imageUrl = :url" \
    --expression-attribute-values "{\":url\":{\"S\":\"$NEW_URL\"}}" \
    --region "$REGION" 2>&1
}

# nature_tree - tree
update_image "nature_tree_1773513383334" "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300&h=300&fit=crop"

# nature_island - island
update_image "nature_island_1773513728699" "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=300&h=300&fit=crop"

# numbers_five - number 5
update_image "numbers_five_1773513587378" "https://images.unsplash.com/photo-1501621667575-af81f1f0bacc?w=300&h=300&fit=crop"

# objects_keyboard - keyboard
update_image "objects_keyboard_1773513728761" "https://images.unsplash.com/photo-1541140532154-b024d1c0c78e?w=300&h=300&fit=crop"

# animals_hedgehog (two entries) - hedgehog
update_image "animals_hedgehog_1773507479091" "https://images.unsplash.com/photo-1472491235688-bdc81a63246e?w=300&h=300&fit=crop"
update_image "animals_hedgehog_1773507479685" "https://images.unsplash.com/photo-1472491235688-bdc81a63246e?w=300&h=300&fit=crop"

# numbers_three - number 3
update_image "numbers_three_1773513587142" "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=300&h=300&fit=crop"

# objects_candle - candle
update_image "objects_candle_1773513298905" "https://images.unsplash.com/photo-1602523961358-f9f03dd557db?w=300&h=300&fit=crop"

# food_drinks_banana - banana
update_image "food_drinks_banana_1773513727876" "https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=300&h=300&fit=crop"

# nature_cloud - cloud
update_image "nature_cloud_1773513728262" "https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=300&h=300&fit=crop"

# numbers_eight - number 8
update_image "numbers_eight_1773513587658" "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=300&h=300&fit=crop"

# nature_sun - sun
update_image "nature_sun_1773513383266" "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop"

# food_drinks_avocado - avocado
update_image "food_drinks_avocado_1773513728885" "https://images.unsplash.com/photo-1519162808019-7de1683fa2ad?w=300&h=300&fit=crop"

# numbers_zero and numbers_one (same broken URL) - numbers
update_image "numbers_zero_1773513586819" "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=300&h=300&fit=crop"
update_image "numbers_one_1773513182031" "https://images.unsplash.com/photo-1529101091764-c3526daf38b8?w=300&h=300&fit=crop"

# nature_river - river
update_image "nature_river_1773513383758" "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=300&fit=crop"

# nature_waterfall - waterfall
update_image "nature_waterfall_1773513384088" "https://images.unsplash.com/photo-1432405972618-c6b0cfba8b43?w=300&h=300&fit=crop"

# numbers_four - number 4
update_image "numbers_four_1773513587282" "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=300&h=300&fit=crop"

# numbers_six - number 6
update_image "numbers_six_1773513587442" "https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=300&h=300&fit=crop"

# food_drinks_cheese - cheese
update_image "food_drinks_cheese_1773513182180" "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=300&h=300&fit=crop"

echo "Done! All broken images updated."
