#!/bin/bash
REGION="us-east-1"

fix_number() {
  local TABLE=$1 WID=$2 NUM=$3 COL=$4 D1=$5 D1C=$6 D2=$7 D2C=$8
  local IMG="https://placehold.co/300x300/${COL}/ffffff.png?text=${NUM}&font=roboto"
  local DIST1="https://placehold.co/300x300/${D1C}/ffffff.png?text=${D1}&font=roboto"
  local DIST2="https://placehold.co/300x300/${D2C}/ffffff.png?text=${D2}&font=roboto"
  aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
    --key "{\"wordId\": {\"S\": \"${WID}\"}}" \
    --update-expression "SET imageUrl = :img, distractorImages = :dist" \
    --expression-attribute-values "{\":img\": {\"S\": \"${IMG}\"}, \":dist\": {\"L\": [{\"S\": \"${DIST1}\"}, {\"S\": \"${DIST2}\"}]}}" 2>/dev/null
}

for ENV in dev prod; do
  TABLE="memory-game-language-words-${ENV}"
  echo "Fixing numbers in ${TABLE}..."
  fix_number "$TABLE" "numbers_zero_1773513586819"  "0" "6366f1" "1" "ef4444" "5" "8b5cf6"
  fix_number "$TABLE" "numbers_one_1773513182031"   "1" "ef4444" "7" "14b8a6" "4" "f59e0b"
  fix_number "$TABLE" "numbers_two_1773513587078"   "2" "3b82f6" "5" "8b5cf6" "8" "f97316"
  fix_number "$TABLE" "numbers_three_1773513587142" "3" "10b981" "8" "f97316" "6" "ec4899"
  fix_number "$TABLE" "numbers_four_1773513587282"  "4" "f59e0b" "9" "06b6d4" "1" "ef4444"
  fix_number "$TABLE" "numbers_five_1773513587378"  "5" "8b5cf6" "2" "3b82f6" "9" "06b6d4"
  fix_number "$TABLE" "numbers_six_1773513587442"   "6" "ec4899" "3" "10b981" "0" "6366f1"
  fix_number "$TABLE" "numbers_seven_1773513587509" "7" "14b8a6" "4" "f59e0b" "2" "3b82f6"
  fix_number "$TABLE" "numbers_eight_1773513587658" "8" "f97316" "6" "ec4899" "3" "10b981"
  fix_number "$TABLE" "numbers_nine_1773513587784"  "9" "06b6d4" "7" "14b8a6" "1" "ef4444"
  echo "  ✅ Done ${ENV}"
done
echo "🎉 Number images fixed!"
