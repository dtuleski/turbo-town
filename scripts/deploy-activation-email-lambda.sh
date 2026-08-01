#!/bin/bash
set -e

# ============================================================
# Deploy Activation Email Lambda
# 
# Builds from scratch every time — no incremental zip patching.
# Produces a clean zip with just the activation-email entry point
# and deploys to the DashDen-ActivationEmail-prod Lambda.
#
# Usage:
#   ./scripts/deploy-activation-email-lambda.sh          # deploy to prod
#
# Prerequisites:
#   - Lambda function must already exist (create manually first time)
#   - AWS profile "dashden-new" configured for account 342278407349
#
# ============================================================
# EventBridge Cron Rule (one-time setup — run these manually):
#
# 1. Create the rule:
#   aws events put-rule \
#     --name "DashDen-ActivationEmail-DailyCron-prod" \
#     --schedule-expression "cron(0 13 * * ? *)" \
#     --state ENABLED \
#     --description "Triggers DashDen activation email Lambda daily at 13:00 UTC (8am EST)" \
#     --region us-east-1 \
#     --profile dashden-new
#
# 2. Add Lambda as target:
#   aws events put-targets \
#     --rule "DashDen-ActivationEmail-DailyCron-prod" \
#     --targets "Id"="activation-email-lambda","Arn"="arn:aws:lambda:us-east-1:342278407349:function:DashDen-ActivationEmail-prod" \
#     --region us-east-1 \
#     --profile dashden-new
#
# 3. Grant EventBridge permission to invoke the Lambda:
#   aws lambda add-permission \
#     --function-name "DashDen-ActivationEmail-prod" \
#     --statement-id "EventBridge-DailyCron" \
#     --action "lambda:InvokeFunction" \
#     --principal "events.amazonaws.com" \
#     --source-arn "arn:aws:events:us-east-1:342278407349:rule/DashDen-ActivationEmail-DailyCron-prod" \
#     --region us-east-1 \
#     --profile dashden-new
#
# ============================================================

FUNCTION_NAME="DashDen-ActivationEmail-prod"
REGION="us-east-1"
AWS_PROFILE_FLAG="--profile dashden-new"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GAME_DIR="${ROOT_DIR}/services/game"
SHARED_DIR="${ROOT_DIR}/packages/shared"
BUILD_DIR="/tmp/activation-email-lambda-build-$$"
ZIP_PATH="/tmp/activation-email-lambda.zip"

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
echo "  Activation Email Lambda Deploy"
echo "=========================================="
echo ""

# Step 1: Build shared package
echo -e "${YELLOW}[1/6]${NC} Building shared package..."
cd "${SHARED_DIR}"
npm run build --silent 2>&1
echo -e "${GREEN}  ✓ Shared package built${NC}"

# Step 2: Build game service (includes activation-email.ts)
echo -e "${YELLOW}[2/6]${NC} Building game service..."
cd "${GAME_DIR}"
npm run build --silent 2>&1
echo -e "${GREEN}  ✓ Game service built${NC}"

# Step 3: Verify build output
echo -e "${YELLOW}[3/6]${NC} Verifying build..."
if [ ! -f "${GAME_DIR}/dist/activation-email.js" ]; then
  echo -e "${RED}  ✗ dist/activation-email.js not found — build failed${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Build output verified${NC}"

# Step 4: Assemble deployment package
echo -e "${YELLOW}[4/6]${NC} Assembling deployment package..."
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/dist"

# Copy compiled JS into dist/
cp -r "${GAME_DIR}/dist/"* "${BUILD_DIR}/dist/"

# Copy only the runtime dependencies we actually need.
# AWS SDK is provided by Lambda runtime — don't bundle it.
mkdir -p "${BUILD_DIR}/node_modules"

RUNTIME_DEPS=(
  # No external deps needed beyond AWS SDK (provided by Lambda runtime)
  # But include any shared utility deps just in case
  uuid zod
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

# Copy package.json
cp "${GAME_DIR}/package.json" "${BUILD_DIR}/"

echo -e "${GREEN}  ✓ Package assembled${NC}"

# Step 5: Create zip
echo -e "${YELLOW}[5/6]${NC} Creating zip..."
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
echo -e "${YELLOW}[6/6]${NC} Deploying to Lambda (${FUNCTION_NAME})..."
aws lambda update-function-code \
  --function-name "${FUNCTION_NAME}" \
  --zip-file "fileb://${ZIP_PATH}" \
  --region "${REGION}" \
  ${AWS_PROFILE_FLAG} \
  --output text \
  --query 'CodeSha256' > /dev/null 2>&1

echo "  Waiting for update to complete..."
aws lambda wait function-updated \
  --function-name "${FUNCTION_NAME}" \
  --region "${REGION}" \
  ${AWS_PROFILE_FLAG}

# Ensure handler is set correctly
CURRENT_HANDLER=$(aws lambda get-function-configuration \
  --function-name "${FUNCTION_NAME}" \
  --region "${REGION}" \
  ${AWS_PROFILE_FLAG} \
  --query 'Handler' --output text 2>/dev/null)
if [ "${CURRENT_HANDLER}" != "dist/activation-email.handler" ]; then
  echo "  Fixing handler: ${CURRENT_HANDLER} → dist/activation-email.handler"
  aws lambda update-function-configuration \
    --function-name "${FUNCTION_NAME}" \
    --region "${REGION}" \
    ${AWS_PROFILE_FLAG} \
    --handler dist/activation-email.handler \
    --output text --query 'Handler' > /dev/null 2>&1
  aws lambda wait function-updated \
    --function-name "${FUNCTION_NAME}" \
    --region "${REGION}" \
    ${AWS_PROFILE_FLAG}
fi

echo -e "${GREEN}  ✓ Lambda updated${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "  Deploy complete!"
echo "==========================================${NC}"
echo ""
