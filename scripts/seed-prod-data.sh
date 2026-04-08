#!/bin/bash
# Seed production DynamoDB tables by copying data from dev tables
# Usage: bash scripts/seed-prod-data.sh

set -e
REGION="us-east-1"

copy_table() {
  local SRC_TABLE="$1"
  local DST_TABLE="$2"
  
  echo "📋 Copying $SRC_TABLE → $DST_TABLE..."
  
  # Scan source table
  ITEMS=$(aws dynamodb scan --table-name "$SRC_TABLE" --region "$REGION" --output json 2>/dev/null)
  COUNT=$(echo "$ITEMS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['Items']))")
  
  if [ "$COUNT" -eq 0 ]; then
    echo "  ⚠️  No items found in $SRC_TABLE"
    return
  fi
  
  # Write items one by one
  echo "$ITEMS" | python3 -c "
import sys, json, subprocess

data = json.load(sys.stdin)
for i, item in enumerate(data['Items']):
    item_json = json.dumps(item)
    subprocess.run([
        'aws', 'dynamodb', 'put-item',
        '--table-name', '$DST_TABLE',
        '--region', '$REGION',
        '--item', item_json
    ], check=True, capture_output=True)
    print(f'  [{i+1}/{len(data[\"Items\"])}] written')
"
  
  echo "  ✅ $COUNT items copied to $DST_TABLE"
}

echo "🚀 Seeding production DynamoDB tables..."
echo ""

# 1. Game Catalog
copy_table "memory-game-catalog-dev" "memory-game-catalog-prod"
echo ""

# 2. Themes
copy_table "memory-game-themes-dev" "memory-game-themes-prod"
echo ""

# 3. Language Words
copy_table "memory-game-language-words-dev" "memory-game-language-words-prod"
echo ""

echo "🎉 Production data seeding complete!"
echo ""
echo "Verification:"
aws dynamodb scan --table-name memory-game-catalog-prod --region $REGION --select COUNT --output text 2>/dev/null
aws dynamodb scan --table-name memory-game-themes-prod --region $REGION --select COUNT --output text 2>/dev/null
aws dynamodb scan --table-name memory-game-language-words-prod --region $REGION --select COUNT --output text 2>/dev/null
