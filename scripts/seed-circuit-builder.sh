#!/bin/bash

# Seed Circuit Builder into the Themes table and Game Catalog.
#
# Usage:
#   bash scripts/seed-circuit-builder.sh           # DEV (default, safe)
#   bash scripts/seed-circuit-builder.sh --prod    # PRODUCTION (profile dashden-new, account 342278407349)
#
# =====================================================================================
# !!! ORDERING WARNING - READ BEFORE SEEDING PRODUCTION !!!
# Deploy the Leaderboard service with GameType.CIRCUIT_BUILDER to
# MemoryGame-LeaderboardService-prod BEFORE seeding the production theme row.
# If you seed first, players can complete Circuit Builder levels but the Leaderboard
# rejects the GameCompleted event ("Invalid gameType"), so they SILENTLY get no
# leaderboard entry.
# Prod order: 1) Leaderboard  2) Game Service (already carries the game)
#             3) web registries + routes (U7b) DEPLOYED AND VERIFIED LIVE
#             4) this seed, LAST (the "go live" switch)
# WHY THE SEED IS LAST: the catalog row below is what makes the hub tile appear, and its
# route is /circuit-builder/setup. If you seed before the frontend that serves that route is
# live, every player sees a tile that leads to a missing page.
#
# THERE IS NO REACHABLE DEV ENVIRONMENT FROM THE MAINTAINER'S MACHINE. The default AWS
# credentials resolve to the production account (342278407349), which contains only the
# -prod tables (verified read-only: memory-game-themes-prod, memory-game-catalog-prod, and
# no -dev tables). Running this script WITHOUT --prod will therefore fail with
# ResourceNotFoundException. That failure is harmless, but it means there is no staging
# step: --prod is the only way to seed, so treat it as the real go-live action.
#
# Rollback: delete BOTH rows. Deleting only the themes row stops sessions from starting but
# leaves the tile visible, so players would click into a game that refuses to start.
#   themes  table key: themeId = CIRCUIT_BUILDER
#   catalog table key: gameId  = circuit-builder
# =====================================================================================
#
# Safety:
#   - Default is DEV. Only the exact flag --prod selects production. Any other argument exits 2.
#   - --prod asks you to type SEED-PROD before anything is written.
#   - Idempotent: put-item with the same content overwrites the identical item, so re-runs are safe
#     (deliberately no condition expression).
#   - Writes exactly two items: one themes row, one catalog row. Nothing else is touched.

set -eu

REGION="us-east-1"
THEMES_TABLE="memory-game-themes-dev"
CATALOG_TABLE="memory-game-catalog-dev"
PROFILE_ARGS=()
ENV_NAME="DEV"

usage() {
  echo "Usage: bash scripts/seed-circuit-builder.sh [--prod]" >&2
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
  exit 1
fi

echo "Environment : $ENV_NAME"
echo "Region      : $REGION"
echo "Themes table: $THEMES_TABLE"
echo "Catalog tbl : $CATALOG_TABLE"

if [ "$ENV_NAME" = "PRODUCTION" ]; then
  echo "AWS profile : dashden-new (account 342278407349)"
  echo ""
  echo "!!! ORDERING WARNING !!!"
  echo "The Leaderboard with GameType.CIRCUIT_BUILDER MUST already be deployed to"
  echo "MemoryGame-LeaderboardService-prod. Otherwise players complete levels and"
  echo "silently get no leaderboard entry."
  echo ""
  printf "Type SEED-PROD to continue: "
  CONFIRM=""
  read -r CONFIRM || true
  if [ "$CONFIRM" != "SEED-PROD" ]; then
    echo "Aborted. Nothing was written."
    exit 1
  fi
fi

# 1. Seed the themes table (same shape as Mini Golf; the Game Service only needs status PUBLISHED)
echo "Adding CIRCUIT_BUILDER to themes table..."
aws dynamodb put-item \
  --table-name "$THEMES_TABLE" \
  --region "$REGION" \
  ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
  --item '{
    "themeId": {"S": "CIRCUIT_BUILDER"},
    "name": {"S": "Circuit Builder"},
    "status": {"S": "PUBLISHED"}
  }'

echo "CIRCUIT_BUILDER added to themes table"

# 2. Seed the game catalog
echo "Adding circuit-builder to game catalog..."
aws dynamodb put-item \
  --table-name "$CATALOG_TABLE" \
  --region "$REGION" \
  ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
  --item '{
    "gameId": {"S": "circuit-builder"},
    "title": {"S": "Circuit Builder"},
    "description": {"S": "Build circuits, diagnose faults and learn how electronics work by wiring up real components."},
    "icon": {"S": "⚡"},
    "route": {"S": "/circuit-builder/setup"},
    "status": {"S": "ACTIVE"},
    "displayOrder": {"N": "23"},
    "ageRange": {"S": "8-16"},
    "category": {"S": "Science & Math"}
  }'

echo "Circuit Builder added to game catalog"
echo ""
echo "To verify (read-only):"
if [ "$ENV_NAME" = "PRODUCTION" ]; then
  echo "bash scripts/verify-circuit-builder-seed.sh --prod"
else
  echo "bash scripts/verify-circuit-builder-seed.sh"
fi
