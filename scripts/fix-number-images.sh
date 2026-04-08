#!/bin/bash
REGION="us-east-1"

# Use placehold.co to show the actual digit - big number on colored background
# Format: https://placehold.co/300x300/BG/TEXT.png?text=NUMBER&font=roboto

declare -A NUMS
NUMS[zero]="0"
NUMS[one]="1"
NUMS[two]="2"
NUMS[three]="3"
NUMS[four]="4"
NUMS[five]="5"
NUMS[six]="6"
NUMS[seven]="7"
NUMS[eight]="8"
NUMS[nine]="9"

declare -A IDS
IDS[zero]="numbers_zero_1773513586819"
IDS[one]="numbers_one_1773513182031"
IDS[two]="numbers_two_1773513587078"
IDS[three]="numbers_three_1773513587142"
IDS[four]="numbers_four_1773513587282"
IDS[five]="numbers_five_1773513587378"
IDS[six]="numbers_six_1773513587442"
IDS[seven]="numbers_seven_1773513587509"
IDS[eight]="numbers_eight_1773513587658"
IDS[nine]="numbers_nine_1773513587784"

# Colors for each number (bg color)
declare -A COLORS
COLORS[zero]="6366f1"
COLORS[one]="ef4444"
COLORS[two]="3b82f6"
COLORS[three]="10b981"
COLORS[four]="f59e0b"
COLORS[five]="8b5cf6"
COLORS[six]="ec4899"
COLORS[seven]="14b8a6"
COLORS[eight]="f97316"
COLORS[nine]="06b6d4"

for ENV in dev prod; do
  TABLE="memory-game-language-words-${ENV}"
  echo "Fixing number images in ${TABLE}..."

  for WORD in zero one two three four five six seven eight nine; do
    NUM="${NUMS[$WORD]}"
    WID="${IDS[$WORD]}"
    COL="${COLORS[$WORD]}"
    IMG="https://placehold.co/300x300/${COL}/ffffff.png?text=${NUM}&font=roboto"
    
    # Pick 2 different numbers as distractors
    case $WORD in
      zero)  D1="1" D1C="ef4444" D2="5" D2C="8b5cf6" ;;
      one)   D1="7" D1C="14b8a6" D2="4" D2C="f59e0b" ;;
      two)   D1="5" D1C="8b5cf6" D2="8" D2C="f97316" ;;
      three) D1="8" D1C="f97316" D2="6" D2C="ec4899" ;;
      four)  D1="9" D1C="06b6d4" D2="1" D2C="ef4444" ;;
      five)  D1="2" D1C="3b82f6" D2="9" D2C="06b6d4" ;;
      six)   D1="3" D1C="10b981" D2="0" D2C="6366f1" ;;
      seven) D1="4" D1C="f59e0b" D2="2" D2C="3b82f6" ;;
      eight) D1="6" D1C="ec4899" D2="3" D2C="10b981" ;;
      nine)  D1="7" D1C="14b8a6" D2="1" D2C="ef4444" ;;
    esac

    DIST1="https://placehold.co/300x300/${D1C}/ffffff.png?text=${D1}&font=roboto"
    DIST2="https://placehold.co/300x300/${D2C}/ffffff.png?text=${D2}&font=roboto"

    aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
      --key "{\"wordId\": {\"S\": \"${WID}\"}}" \
      --update-expression "SET imageUrl = :img, distractorImages = :dist" \
      --expression-attribute-values "{
        \":img\": {\"S\": \"${IMG}\"},
        \":dist\": {\"L\": [
          {\"S\": \"${DIST1}\"},
          {\"S\": \"${DIST2}\"}
        ]}
      }" 2>/dev/null
    
    echo "  ${NUM} (${WORD}) ✓"
  done

  echo "  ✅ Done ${ENV}"
done
echo "🎉 Number images fixed!"
