#!/bin/bash
set -e
# ============================================================
# Deploy Leaderboard Service Lambda (PRODUCTION)
#
# Rebuilds from scratch every time: esbuild bundle -> clean zip ->
# backup of the deployed code -> update-function-code -> smoke test.
# Always targets MemoryGame-LeaderboardService-prod in the
# dashden-new account (342278407349), us-east-1.
#
# Usage:
#   ./scripts/deploy-leaderboard-lambda.sh               # build, back up, deploy, smoke test
#   ./scripts/deploy-leaderboard-lambda.sh --build-only  # build and verify the zip only; no AWS write calls
# ============================================================
BUILD_ONLY=false
case "${1:-}" in
  "") ;;
  --build-only) BUILD_ONLY=true ;;
  *) echo "Usage: $0 [--build-only]"; exit 1 ;;
esac
FUNCTION_NAME="MemoryGame-LeaderboardService-prod"
REGION="us-east-1"
AWS_PROFILE_NAME="dashden-new"
EXPECTED_ACCOUNT="342278407349"
ESBUILD_VERSION="0.21.5"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LB_DIR="${ROOT_DIR}/services/leaderboard"
BUILD_DIR="/tmp/leaderboard-lambda-build-$$"
ZIP_PATH="/tmp/leaderboard-lambda-prod.zip"
BACKUP_DIR="${LB_DIR}/lambda-backups"
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
  echo "  Leaderboard Lambda Build (prod, build-only)"
else
  echo "  Leaderboard Lambda Deploy (prod)"
fi
echo "=========================================="
echo ""
# Step 1: Confirm AWS account (prod must be dashden-new)
if [ "${BUILD_ONLY}" = false ]; then
  echo -e "${YELLOW}[1/7]${NC} Checking AWS account..."
  ACCOUNT=$(aws sts get-caller-identity --query Account --output text "${AWS_ARGS[@]}")
  if [ "${ACCOUNT}" != "${EXPECTED_ACCOUNT}" ]; then
    echo -e "${RED}  ✗ Profile ${AWS_PROFILE_NAME} resolved to account ${ACCOUNT}, expected ${EXPECTED_ACCOUNT}${NC}"
    exit 1
  fi
  echo -e "${GREEN}  ✓ Account ${ACCOUNT}${NC}"
else
  echo -e "${YELLOW}[1/7]${NC} Build-only: skipping AWS account check"
fi
# Step 2: Bundle with esbuild (node20, cjs, AWS SDK external — provided by the runtime)
echo -e "${YELLOW}[2/7]${NC} Bundling leaderboard service..."
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/dist"
cd "${LB_DIR}"
npx --yes "esbuild@${ESBUILD_VERSION}" src/index.ts \
  --bundle --platform=node --target=node20 --format=cjs \
  --external:@aws-sdk/* \
  --outfile="${BUILD_DIR}/dist/index.js" --log-level=warning
echo -e "${GREEN}  ✓ Bundled${NC}"
# Step 3: Verify bundle
echo -e "${YELLOW}[3/7]${NC} Verifying bundle..."
if [ ! -s "${BUILD_DIR}/dist/index.js" ]; then
  echo -e "${RED}  ✗ dist/index.js missing or empty${NC}"
  exit 1
fi
# @aws-sdk/* is external (runtime-provided), so the bundle cannot be require()d locally. Check syntax and the export instead.
if ! node --check "${BUILD_DIR}/dist/index.js"; then
  echo -e "${RED}  ✗ dist/index.js has a syntax error${NC}"
  exit 1
fi
if ! grep -q "^  handler: () =>" "${BUILD_DIR}/dist/index.js"; then
  echo -e "${RED}  ✗ No handler export found in bundle${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ dist/index.js exports handler${NC}"
# Step 4: Create zip (dist/index.js only, same layout as the deployed function)
echo -e "${YELLOW}[4/7]${NC} Creating zip..."
rm -f "${ZIP_PATH}"
cd "${BUILD_DIR}"
if command -v zip >/dev/null 2>&1; then
  zip -q -r "${ZIP_PATH}" dist
else
  echo -e "${YELLOW}  ⚠ 'zip' not found — using .NET ZipFile fallback (forward-slash entries)${NC}"
  WIN_BUILD_DIR=$(cygpath -w "${BUILD_DIR}")
  WIN_ZIP_PATH=$(cygpath -w "${ZIP_PATH}")
  ZIP_PS1="${ROOT_DIR}/scripts/_zip-dir.ps1"
  powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass \
    -File "$(cygpath -w "${ZIP_PS1}")" -SourceDir "${WIN_BUILD_DIR}" -ZipPath "${WIN_ZIP_PATH}"
fi
ZIP_SIZE=$(du -h "${ZIP_PATH}" | cut -f1)
echo -e "${GREEN}  ✓ Zip created: ${ZIP_PATH} (${ZIP_SIZE})${NC}"
ZIP_BYTES=$(wc -c < "${ZIP_PATH}" | tr -d ' ')
if [ "${ZIP_BYTES}" -gt 52428800 ]; then
  echo -e "${RED}  ✗ Zip is over 50MB — too large for direct upload${NC}"
  exit 1
fi
if [ "${BUILD_ONLY}" = true ]; then
  echo ""
  echo -e "${GREEN}Build-only complete. Nothing was deployed. Zip: ${ZIP_PATH}${NC}"
  echo ""
  exit 0
fi
# Step 5: Back up the currently deployed code
echo -e "${YELLOW}[5/7]${NC} Backing up deployed code..."
mkdir -p "${BACKUP_DIR}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CODE_URL=$(aws lambda get-function --function-name "${FUNCTION_NAME}" "${AWS_ARGS[@]}" --query 'Code.Location' --output text)
curl -sSf -o "${BACKUP_DIR}/leaderboard-service-prod-${TIMESTAMP}.zip" "${CODE_URL}"
# Keep only last 5 backups
ls -t "${BACKUP_DIR}"/leaderboard-service-prod-*.zip 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
echo -e "${GREEN}  ✓ Previous code saved to lambda-backups/leaderboard-service-prod-${TIMESTAMP}.zip${NC}"
# Step 6: Deploy
echo -e "${YELLOW}[6/7]${NC} Deploying to Lambda (${FUNCTION_NAME})..."
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
if [ "${CURRENT_HANDLER}" != "dist/index.handler" ]; then
  echo "  Fixing handler: ${CURRENT_HANDLER} → dist/index.handler"
  aws lambda update-function-configuration \
    --function-name "${FUNCTION_NAME}" "${AWS_ARGS[@]}" \
    --handler dist/index.handler --output text --query 'Handler' > /dev/null
  aws lambda wait function-updated --function-name "${FUNCTION_NAME}" "${AWS_ARGS[@]}"
fi
echo -e "${GREEN}  ✓ Lambda updated${NC}"
# Step 7: Smoke test (AppSync-style getUserRank with no auth header: loads the bundle, routes, writes nothing)
echo -e "${YELLOW}[7/7]${NC} Smoke test..."
PAYLOAD='{"info":{"fieldName":"getUserRank"},"arguments":{"input":{"gameType":"OVERALL","period":"ALL_TIME"}},"request":{"headers":{}}}'
RESPONSE_FILE="/tmp/leaderboard-lambda-test-response.json"
INVOKE_RESULT=$(aws lambda invoke \
  --function-name "${FUNCTION_NAME}" \
  --cli-binary-format raw-in-base64-out \
  --payload "${PAYLOAD}" \
  "${AWS_ARGS[@]}" \
  "${RESPONSE_FILE}" 2>&1)
if echo "${INVOKE_RESULT}" | grep -q "FunctionError"; then
  ERROR_MSG=$(head -c 500 "${RESPONSE_FILE}" 2>/dev/null)
  if echo "${ERROR_MSG}" | grep -q "ImportModuleError\|Cannot find module"; then
    echo -e "${RED}  ✗ FAILED — module load error${NC}"
    echo "  ${ERROR_MSG}"
    echo "  Roll back with: aws lambda update-function-code --function-name ${FUNCTION_NAME} --zip-file fileb://<backup zip> --profile ${AWS_PROFILE_NAME} --region ${REGION}"
    exit 1
  fi
  echo -e "${GREEN}  ✓ Lambda starts OK (handler error is expected without a JWT)${NC}"
else
  echo -e "${GREEN}  ✓ Lambda invoked successfully${NC}"
fi
echo ""
echo -e "${GREEN}=========================================="
echo "  Deploy complete!"
echo "==========================================${NC}"
echo ""
