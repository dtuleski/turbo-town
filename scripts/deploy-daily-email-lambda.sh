#!/bin/bash
set -e
# ============================================================
# Deploy Daily Email (digest and push tick) Lambda (PRODUCTION)
#
# Builds from scratch every time — no incremental zip patching.
# Produces a clean zip with the game service build (entry point
# dist/daily-email.js) and deploys it to DashDen-DailyEmail-prod
# in the dashden-new account (342278407349), us-east-1.
#
# Usage:
#   ./scripts/deploy-daily-email-lambda.sh               # build, back up, deploy, handler check
#   ./scripts/deploy-daily-email-lambda.sh --build-only  # build and verify the zip only; no AWS call at all
#
# No smoke invoke: invoking this function sends whatever digests and
# pushes are due. The EventBridge rule DashDen-DailyDigest-Schedule
# triggers it (every 15 minutes after production step P8).
#
# Prerequisites (deploy mode):
#   - AWS profile "dashden-new" configured for account 342278407349
#   - Production steps P5 (IAM) and P6 (env vars, timeout 300 s) done first;
#     P8 (schedule) right after this deploy, in the same session
# ============================================================
BUILD_ONLY=false
case "${1:-}" in
  "") ;;
  --build-only) BUILD_ONLY=true ;;
  *) echo "Usage: $0 [--build-only]"; exit 1 ;;
esac
FUNCTION_NAME="DashDen-DailyEmail-prod"
HANDLER="dist/daily-email.handler"
REGION="us-east-1"
AWS_PROFILE_NAME="dashden-new"
EXPECTED_ACCOUNT="342278407349"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GAME_DIR="${ROOT_DIR}/services/game"
SHARED_DIR="${ROOT_DIR}/packages/shared"
BUILD_DIR="/tmp/daily-email-lambda-build-$$"
ZIP_PATH="/tmp/daily-email-lambda-prod.zip"
BACKUP_DIR="${GAME_DIR}/lambda-backups"
AWS_ARGS=(--region "${REGION}" --profile "${AWS_PROFILE_NAME}")
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
if [ "${BUILD_ONLY}" = true ]; then
  echo "  Daily Email Lambda Build (prod, build-only)"
else
  echo "  Daily Email Lambda Deploy (prod)"
fi
echo "=========================================="
echo ""
# Step 1: Confirm AWS account (prod must be dashden-new)
if [ "${BUILD_ONLY}" = false ]; then
  echo -e "${YELLOW}[1/8]${NC} Checking AWS account..."
  ACCOUNT=$(aws sts get-caller-identity --query Account --output text "${AWS_ARGS[@]}")
  if [ "${ACCOUNT}" != "${EXPECTED_ACCOUNT}" ]; then
    echo -e "${RED}  ✗ Profile ${AWS_PROFILE_NAME} resolved to account ${ACCOUNT}, expected ${EXPECTED_ACCOUNT}${NC}"
    exit 1
  fi
  echo -e "${GREEN}  ✓ Account ${ACCOUNT}${NC}"
else
  echo -e "${YELLOW}[1/8]${NC} Build-only: skipping AWS account check"
fi
# Step 2: Build shared package
echo -e "${YELLOW}[2/8]${NC} Building shared package..."
cd "${SHARED_DIR}"
npm run build --silent 2>&1
echo -e "${GREEN}  ✓ Shared package built${NC}"
# Step 3: Build game service (includes daily-email.ts) from a clean dist
echo -e "${YELLOW}[3/8]${NC} Building game service..."
cd "${GAME_DIR}"
rm -rf "${GAME_DIR}/dist"
npm run build --silent 2>&1
echo -e "${GREEN}  ✓ Game service built${NC}"
# Step 4: Verify build output
echo -e "${YELLOW}[4/8]${NC} Verifying build..."
for f in dist/daily-email.js dist/notifications/push-sender.js dist/services/email-prefs.service.js; do
  if [ ! -f "${GAME_DIR}/${f}" ]; then
    echo -e "${RED}  ✗ ${f} not found — build failed${NC}"
    exit 1
  fi
done
if ! node --check "${GAME_DIR}/dist/daily-email.js"; then
  echo -e "${RED}  ✗ dist/daily-email.js has a syntax error${NC}"
  exit 1
fi
if ! grep -q "exports.handler = handler" "${GAME_DIR}/dist/daily-email.js"; then
  echo -e "${RED}  ✗ No handler export found in dist/daily-email.js${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ dist/daily-email.js exports handler${NC}"
# Step 5: Assemble deployment package
echo -e "${YELLOW}[5/8]${NC} Assembling deployment package..."
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/dist"
cp -r "${GAME_DIR}/dist/"* "${BUILD_DIR}/dist/"
# Runtime dependencies. The AWS SDK (DynamoDB, SNS, Secrets Manager) is provided by the
# Lambda Node.js runtime and is not bundled.
mkdir -p "${BUILD_DIR}/node_modules"
RUNTIME_DEPS=(
  # Used by @memory-game/shared
  uuid zod
)
for dep in "${RUNTIME_DEPS[@]}"; do
  if [ -d "${GAME_DIR}/node_modules/${dep}" ]; then
    cp -r "${GAME_DIR}/node_modules/${dep}" "${BUILD_DIR}/node_modules/"
  else
    echo -e "${YELLOW}  ⚠ ${dep} not found in node_modules (may be optional)${NC}"
  fi
done
# @memory-game/shared (built from local source)
mkdir -p "${BUILD_DIR}/node_modules/@memory-game/shared"
cp -r "${SHARED_DIR}/dist" "${BUILD_DIR}/node_modules/@memory-game/shared/"
cp "${SHARED_DIR}/package.json" "${BUILD_DIR}/node_modules/@memory-game/shared/"
cp "${GAME_DIR}/package.json" "${BUILD_DIR}/"
echo -e "${GREEN}  ✓ Package assembled${NC}"
# Step 6: Create zip
echo -e "${YELLOW}[6/8]${NC} Creating zip..."
rm -f "${ZIP_PATH}"
cd "${BUILD_DIR}"
if command -v zip >/dev/null 2>&1; then
  zip -q -r "${ZIP_PATH}" .
else
  echo -e "${YELLOW}  ⚠ 'zip' not found — using .NET ZipFile fallback (forward-slash entries)${NC}"
  WIN_BUILD_DIR=$(cygpath -w "${BUILD_DIR}")
  WIN_ZIP_PATH=$(cygpath -w "${ZIP_PATH}")
  ZIP_PS1="${ROOT_DIR}/scripts/_zip-dir.ps1"
  powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass \
    -File "$(cygpath -w "${ZIP_PS1}")" -SourceDir "${WIN_BUILD_DIR}" -ZipPath "${WIN_ZIP_PATH}"
fi
ZIP_SIZE=$(du -h "${ZIP_PATH}" | cut -f1)
ZIP_BYTES=$(wc -c < "${ZIP_PATH}" | tr -d ' ')
if [ "${ZIP_BYTES}" -gt 52428800 ]; then
  echo -e "${RED}  ✗ Zip is over 50MB — too large for direct upload${NC}"
  exit 1
fi
if command -v unzip >/dev/null 2>&1; then
  for entry in dist/daily-email.js node_modules/@memory-game/shared/dist/index.js; do
    if ! unzip -l "${ZIP_PATH}" "${entry}" >/dev/null 2>&1; then
      echo -e "${RED}  ✗ ${entry} missing from the zip${NC}"
      exit 1
    fi
  done
fi
echo -e "${GREEN}  ✓ Zip created: ${ZIP_PATH} (${ZIP_SIZE})${NC}"
if [ "${BUILD_ONLY}" = true ]; then
  echo ""
  echo -e "${GREEN}Build-only complete. Nothing was deployed. Zip: ${ZIP_PATH}${NC}"
  echo ""
  exit 0
fi
# Step 7: Back up the currently deployed code
echo -e "${YELLOW}[7/8]${NC} Backing up deployed code..."
mkdir -p "${BACKUP_DIR}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/daily-email-prod-${TIMESTAMP}.zip"
CODE_URL=$(aws lambda get-function --function-name "${FUNCTION_NAME}" "${AWS_ARGS[@]}" --query 'Code.Location' --output text)
curl -sSf -o "${BACKUP_FILE}" "${CODE_URL}"
# Keep only last 5 backups
ls -t "${BACKUP_DIR}"/daily-email-prod-*.zip 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
echo -e "${GREEN}  ✓ Previous code saved to lambda-backups/daily-email-prod-${TIMESTAMP}.zip${NC}"
# Step 8: Deploy and check the handler
echo -e "${YELLOW}[8/8]${NC} Deploying to Lambda (${FUNCTION_NAME})..."
aws lambda update-function-code \
  --function-name "${FUNCTION_NAME}" \
  --zip-file "fileb://${ZIP_PATH}" \
  "${AWS_ARGS[@]}" \
  --output text --query 'CodeSha256' > /dev/null
echo "  Waiting for update to complete..."
aws lambda wait function-updated --function-name "${FUNCTION_NAME}" "${AWS_ARGS[@]}"
CURRENT_HANDLER=$(aws lambda get-function-configuration \
  --function-name "${FUNCTION_NAME}" "${AWS_ARGS[@]}" \
  --query 'Handler' --output text)
if [ "${CURRENT_HANDLER}" != "${HANDLER}" ]; then
  echo "  Fixing handler: ${CURRENT_HANDLER} → ${HANDLER}"
  aws lambda update-function-configuration \
    --function-name "${FUNCTION_NAME}" "${AWS_ARGS[@]}" \
    --handler "${HANDLER}" --output text --query 'Handler' > /dev/null
  aws lambda wait function-updated --function-name "${FUNCTION_NAME}" "${AWS_ARGS[@]}"
fi
echo -e "${GREEN}  ✓ Lambda updated${NC}"
echo ""
echo "  Roll back with: aws lambda update-function-code --function-name ${FUNCTION_NAME} --zip-file fileb://${BACKUP_FILE} --profile ${AWS_PROFILE_NAME} --region ${REGION}"
echo ""
echo -e "${GREEN}=========================================="
echo "  Deploy complete!"
echo "==========================================${NC}"
echo ""
