#!/bin/bash
set -e

# ============================================================
# Deploy Game Service Lambda
# 
# Builds from scratch every time — no incremental zip patching.
# Produces a clean zip with the correct structure and deploys.
#
# Usage:
#   ./scripts/deploy-game-lambda.sh          # deploy to dev
#   ./scripts/deploy-game-lambda.sh prod     # deploy to prod
# ============================================================

ENV="${1:-dev}"
FUNCTION_NAME="MemoryGame-GameService-${ENV}"
REGION="us-east-1"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GAME_DIR="${ROOT_DIR}/services/game"
SHARED_DIR="${ROOT_DIR}/packages/shared"
BUILD_DIR="/tmp/game-lambda-build-$$"
ZIP_PATH="/tmp/game-lambda-${ENV}.zip"
BACKUP_DIR="${GAME_DIR}/lambda-backups"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
  rm -rf "${BUILD_DIR}"
}
trap cleanup EXIT

echo ""
echo "=========================================="
echo "  Game Service Lambda Deploy (${ENV})"
echo "=========================================="
echo ""

# Step 1: Build shared package
echo -e "${YELLOW}[1/7]${NC} Building shared package..."
cd "${SHARED_DIR}"
npm run build --silent 2>&1
echo -e "${GREEN}  ✓ Shared package built${NC}"

# Step 2: Build game service
echo -e "${YELLOW}[2/7]${NC} Building game service..."
cd "${GAME_DIR}"
npm run build --silent 2>&1
echo -e "${GREEN}  ✓ Game service built${NC}"

# Step 3: Verify build output
echo -e "${YELLOW}[3/7]${NC} Verifying build..."
if [ ! -f "${GAME_DIR}/dist/index.js" ]; then
  echo -e "${RED}  ✗ dist/index.js not found — build failed${NC}"
  exit 1
fi
if [ ! -f "${GAME_DIR}/dist/handlers/game.handler.js" ]; then
  echo -e "${RED}  ✗ dist/handlers/game.handler.js not found${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Build output verified${NC}"

# Step 4: Assemble deployment package
echo -e "${YELLOW}[4/7]${NC} Assembling deployment package..."
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/dist"

# Copy compiled JS into dist/
cp -r "${GAME_DIR}/dist/"* "${BUILD_DIR}/dist/"

# Copy only the runtime dependencies we actually need.
# AWS SDK is provided by Lambda runtime — don't bundle it.
# This explicit list includes all transitive deps (traced manually).
#
# Direct deps: stripe, uuid, zod, graphql
# Stripe -> qs -> side-channel -> (es-errors, object-inspect, side-channel-list,
#   side-channel-map, side-channel-weakmap) -> (call-bound, get-intrinsic) ->
#   (call-bind-apply-helpers, es-define-property, es-object-atoms, function-bind,
#    get-proto, gopd, has-symbols, hasown, math-intrinsics, dunder-proto)
mkdir -p "${BUILD_DIR}/node_modules"

RUNTIME_DEPS=(
  # Direct deps
  stripe uuid zod graphql
  # stripe -> qs
  qs
  # qs -> side-channel tree
  side-channel side-channel-list side-channel-map side-channel-weakmap
  es-errors object-inspect
  call-bound call-bind-apply-helpers
  get-intrinsic es-define-property es-object-atoms
  function-bind get-proto gopd has-symbols hasown math-intrinsics dunder-proto
)

for dep in "${RUNTIME_DEPS[@]}"; do
  if [ -d "${GAME_DIR}/node_modules/${dep}" ]; then
    cp -r "${GAME_DIR}/node_modules/${dep}" "${BUILD_DIR}/node_modules/"
  else
    echo -e "${YELLOW}  ⚠ ${dep} not found in node_modules (may be optional)${NC}"
  fi
done

# Copy @memory-game/shared (built from local source)
mkdir -p "${BUILD_DIR}/node_modules/@memory-game/shared"
cp -r "${SHARED_DIR}/dist" "${BUILD_DIR}/node_modules/@memory-game/shared/"
cp "${SHARED_DIR}/package.json" "${BUILD_DIR}/node_modules/@memory-game/shared/"

# Note: date-fns is listed in shared's package.json but not actually imported
# by any code, so we skip it to keep the zip small (~35MB savings)

# Copy package.json
cp "${GAME_DIR}/package.json" "${BUILD_DIR}/"

echo -e "${GREEN}  ✓ Package assembled${NC}"

# Step 5: Create zip
echo -e "${YELLOW}[5/7]${NC} Creating zip..."
rm -f "${ZIP_PATH}"
cd "${BUILD_DIR}"
zip -q -r "${ZIP_PATH}" .
ZIP_SIZE=$(du -h "${ZIP_PATH}" | cut -f1)
echo -e "${GREEN}  ✓ Zip created: ${ZIP_PATH} (${ZIP_SIZE})${NC}"

# Verify zip size is under 50MB (Lambda direct upload limit)
ZIP_BYTES=$(wc -c < "${ZIP_PATH}" | tr -d ' ')
if [ "${ZIP_BYTES}" -gt 52428800 ]; then
  echo -e "${RED}  ✗ Zip is over 50MB — too large for direct upload${NC}"
  exit 1
fi

# Step 6: Deploy to Lambda
echo -e "${YELLOW}[6/7]${NC} Deploying to Lambda (${FUNCTION_NAME})..."
aws lambda update-function-code \
  --function-name "${FUNCTION_NAME}" \
  --zip-file "fileb://${ZIP_PATH}" \
  --region "${REGION}" \
  --output text \
  --query 'CodeSha256' > /dev/null 2>&1

echo "  Waiting for update to complete..."
aws lambda wait function-updated \
  --function-name "${FUNCTION_NAME}" \
  --region "${REGION}"

# Ensure handler is set correctly (our zip uses dist/ prefix)
CURRENT_HANDLER=$(aws lambda get-function-configuration \
  --function-name "${FUNCTION_NAME}" \
  --region "${REGION}" \
  --query 'Handler' --output text 2>/dev/null)
if [ "${CURRENT_HANDLER}" != "dist/index.handler" ]; then
  echo "  Fixing handler: ${CURRENT_HANDLER} → dist/index.handler"
  aws lambda update-function-configuration \
    --function-name "${FUNCTION_NAME}" \
    --region "${REGION}" \
    --handler dist/index.handler \
    --output text --query 'Handler' > /dev/null 2>&1
  aws lambda wait function-updated \
    --function-name "${FUNCTION_NAME}" \
    --region "${REGION}"
fi

echo -e "${GREEN}  ✓ Lambda updated${NC}"

# Step 7: Save backup of working zip
echo -e "${YELLOW}[7/7]${NC} Saving backup..."
mkdir -p "${BACKUP_DIR}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
cp "${ZIP_PATH}" "${BACKUP_DIR}/game-service-${ENV}-${TIMESTAMP}.zip"
# Keep only last 5 backups
ls -t "${BACKUP_DIR}"/game-service-${ENV}-*.zip 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
echo -e "${GREEN}  ✓ Backup saved to lambda-backups/${NC}"

# Quick smoke test
echo ""
echo -e "${YELLOW}Smoke test...${NC}"
INVOKE_RESULT=$(aws lambda invoke \
  --function-name "${FUNCTION_NAME}" \
  --payload '{}' \
  --region "${REGION}" \
  /tmp/game-lambda-test-response.json 2>&1)

if echo "${INVOKE_RESULT}" | grep -q "FunctionError"; then
  ERROR_MSG=$(cat /tmp/game-lambda-test-response.json 2>/dev/null | head -1)
  if echo "${ERROR_MSG}" | grep -q "ImportModuleError"; then
    echo -e "${RED}  ✗ FAILED — ImportModuleError (missing dependency)${NC}"
    echo "  ${ERROR_MSG}"
    exit 1
  else
    echo -e "${GREEN}  ✓ Lambda starts OK (error is expected with empty payload)${NC}"
  fi
else
  echo -e "${GREEN}  ✓ Lambda invoked successfully${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  Deploy complete!"
echo "==========================================${NC}"
echo ""
