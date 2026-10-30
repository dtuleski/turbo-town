#!/bin/bash

# Verify the Circuit Builder seed (themes row + catalog row). READ-ONLY.
#
# Usage:
#   bash scripts/verify-circuit-builder-seed.sh           # DEV (default)
#   bash scripts/verify-circuit-builder-seed.sh --prod    # PRODUCTION (profile dashden-new, account 342278407349)
#
# =====================================================================================
# !!! ORDERING WARNING !!!
# In production the Leaderboard with GameType.CIRCUIT_BUILDER must be deployed BEFORE the
# theme row is seeded. If the row is live without it, players complete levels and silently
# get no leaderboard entry. A PASS here does NOT prove the Leaderboard is deployed.
# =====================================================================================
#
# Exit codes: 0 = all checks pass, 1 = one or more checks failed, 2 = usage error,
#             3 = AWS CLI error (credentials, access denied, network) - not the same as "missing".
#
# AWS verbs used (only these): dynamodb get-item (x2) and dynamodb query (x1, optional displayOrder
# collision WARN on the catalog StatusIndex). Nothing in this script modifies any data.

set -u

REGION="us-east-1"
THEMES_TABLE="memory-game-themes-dev"
CATALOG_TABLE="memory-game-catalog-dev"
PROFILE_ARGS=()
ENV_NAME="DEV"
EXPECTED_ORDER="23"
FAILS=0

usage() {
  echo "Usage: bash scripts/verify-circuit-builder-seed.sh [--prod]" >&2
}

if [ "$#" -gt 1 ]; then
  usage
  exit 2
fi

if [ "$#" -eq 1 ]; then
  if [ "$1" = "--prod" ]; then
    THEMES_TABLE="memory-game-themes-prod"
    CATALOG_TABLE="memory-game-catalog-prod"
    PROFILE_ARGS=(--profile dashden-new)
    ENV_NAME="PRODUCTION"
  else
    usage
    exit 2
  fi
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI not found on PATH." >&2
  exit 3
fi

echo "Environment : $ENV_NAME (read-only)"
echo "Region      : $REGION"
echo "Themes table: $THEMES_TABLE"
echo "Catalog tbl : $CATALOG_TABLE"
if [ "$ENV_NAME" = "PRODUCTION" ]; then
  echo "AWS profile : dashden-new (account 342278407349)"
fi
echo ""

fail() {
  echo "FAIL: $1"
  FAILS=$((FAILS + 1))
}

# Read one attribute of one item. Usage: read_field <table> <keyName> <keyValue> <query>
# Prints the value (empty when the item or attribute is missing). Exits 3 on an AWS CLI error.
read_field() {
  local table="$1" key_name="$2" key_value="$3" query="$4" out
  if ! out=$(aws dynamodb get-item \
      --table-name "$table" \
      --region "$REGION" \
      ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
      --key "{\"$key_name\": {\"S\": \"$key_value\"}}" \
      --query "$query" \
      --output text 2>&1); then
    echo "ERROR: AWS CLI failed reading $table ($key_name=$key_value):" >&2
    echo "$out" >&2
    exit 3
  fi
  if [ "$out" = "None" ]; then
    out=""
  fi
  printf '%s' "$out"
}

# check_equals <table> <keyName> <keyValue> <field path, e.g. status.S> <expected>
check_equals() {
  local got
  got=$(read_field "$1" "$2" "$3" "Item.$4") || exit $?
  if [ -z "$got" ]; then
    fail "$1 [$2=$3] field $4 missing (expected '$5')"
  elif [ "$got" != "$5" ]; then
    fail "$1 [$2=$3] field $4 is '$got' (expected '$5')"
  else
    echo "ok   : $1 [$2=$3] $4 = $got"
  fi
}

# check_nonempty <table> <keyName> <keyValue> <field path>
check_nonempty() {
  local got
  got=$(read_field "$1" "$2" "$3" "Item.$4") || exit $?
  if [ -z "$got" ]; then
    fail "$1 [$2=$3] field $4 missing or empty (expected non-empty)"
  else
    echo "ok   : $1 [$2=$3] $4 is set"
  fi
}

# Themes row
check_equals   "$THEMES_TABLE" themeId CIRCUIT_BUILDER status.S PUBLISHED
check_nonempty "$THEMES_TABLE" themeId CIRCUIT_BUILDER name.S

# Catalog row
check_equals   "$CATALOG_TABLE" gameId circuit-builder status.S ACTIVE
check_equals   "$CATALOG_TABLE" gameId circuit-builder route.S /circuit-builder/setup
check_equals   "$CATALOG_TABLE" gameId circuit-builder category.S "Science & Math"
check_equals   "$CATALOG_TABLE" gameId circuit-builder ageRange.S 8-16
check_nonempty "$CATALOG_TABLE" gameId circuit-builder title.S
check_nonempty "$CATALOG_TABLE" gameId circuit-builder description.S
check_nonempty "$CATALOG_TABLE" gameId circuit-builder icon.S

ORDER=$(read_field "$CATALOG_TABLE" gameId circuit-builder "Item.displayOrder.N") || exit $?
case "$ORDER" in
  ''|*[!0-9]*) fail "$CATALOG_TABLE [gameId=circuit-builder] field displayOrder.N is '$ORDER' (expected an integer)" ;;
  *) echo "ok   : $CATALOG_TABLE [gameId=circuit-builder] displayOrder.N = $ORDER" ;;
esac

# Best-effort, read-only displayOrder collision check (WARN only, never changes the exit code)
if CLASHES=$(aws dynamodb query \
    --table-name "$CATALOG_TABLE" \
    --index-name StatusIndex \
    --region "$REGION" \
    ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
    --key-condition-expression "#s = :a" \
    --expression-attribute-names '{"#s": "status"}' \
    --expression-attribute-values '{":a": {"S": "ACTIVE"}}' \
    --query "Items[?displayOrder.N=='$EXPECTED_ORDER' && gameId.S!='circuit-builder'].gameId.S" \
    --output text 2>/dev/null); then
  if [ -n "$CLASHES" ] && [ "$CLASHES" != "None" ]; then
    echo "WARN : another ACTIVE game also has displayOrder $EXPECTED_ORDER: $CLASHES"
  else
    echo "ok   : no other ACTIVE game uses displayOrder $EXPECTED_ORDER"
  fi
else
  echo "WARN : collision check skipped"
fi

echo ""
if [ "$FAILS" -gt 0 ]; then
  echo "RESULT: $FAILS check(s) failed."
  exit 1
fi

echo "PASS: Circuit Builder seed rows are present and correct in $ENV_NAME."
echo "Reminder: confirm the Leaderboard with GameType CIRCUIT_BUILDER is deployed before this row is live in production."
exit 0
