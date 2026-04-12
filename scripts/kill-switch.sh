#!/bin/bash
# DashDen Kill Switch
# Usage: ./scripts/kill-switch.sh [on|off] [--profile PROFILE]
#
# on  = DISABLE all services (emergency shutdown)
# off = RE-ENABLE all services (restore normal operation)

set -e

ACTION=${1:-""}
PROFILE=${3:-"dashden-new"}
REGION="us-east-1"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ "$ACTION" != "on" ] && [ "$ACTION" != "off" ]; then
  echo "Usage: $0 [on|off] [--profile PROFILE]"
  echo ""
  echo "  on   = KILL SWITCH ON  - Disable all services (emergency shutdown)"
  echo "  off  = KILL SWITCH OFF - Re-enable all services (restore)"
  echo ""
  echo "  --profile  AWS CLI profile (default: dashden-new)"
  exit 1
fi

ACCOUNT=$(aws sts get-caller-identity --profile $PROFILE --query Account --output text 2>/dev/null)
echo "Account: $ACCOUNT | Profile: $PROFILE | Region: $REGION"
echo ""

if [ "$ACTION" == "on" ]; then
  echo -e "${RED}╔══════════════════════════════════════╗${NC}"
  echo -e "${RED}║     KILL SWITCH: ACTIVATING          ║${NC}"
  echo -e "${RED}║     Disabling all services...        ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════╝${NC}"
  echo ""

  echo "1. Disabling Lambda functions..."
  for FN in $(aws lambda list-functions --profile $PROFILE --region $REGION --query 'Functions[*].FunctionName' --output text 2>/dev/null); do
    aws lambda put-function-concurrency --function-name $FN --reserved-concurrent-executions 0 --profile $PROFILE --region $REGION 2>/dev/null
    echo -e "   ${RED}✗${NC} Disabled: $FN"
  done

  echo ""
  echo "2. Disabling EventBridge rules..."
  for RULE in $(aws events list-rules --profile $PROFILE --region $REGION --query 'Rules[*].Name' --output text 2>/dev/null); do
    aws events disable-rule --name "$RULE" --profile $PROFILE --region $REGION 2>/dev/null
    echo -e "   ${RED}✗${NC} Disabled: $RULE"
  done

  echo ""
  echo -e "${RED}All services DISABLED. Site is down.${NC}"

elif [ "$ACTION" == "off" ]; then
  echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║     KILL SWITCH: DEACTIVATING        ║${NC}"
  echo -e "${GREEN}║     Re-enabling all services...      ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
  echo ""

  echo "1. Re-enabling Lambda functions..."
  for FN in $(aws lambda list-functions --profile $PROFILE --region $REGION --query 'Functions[*].FunctionName' --output text 2>/dev/null); do
    aws lambda delete-function-concurrency --function-name $FN --profile $PROFILE --region $REGION 2>/dev/null
    echo -e "   ${GREEN}✓${NC} Enabled: $FN"
  done

  echo ""
  echo "2. Re-enabling EventBridge rules..."
  for RULE in $(aws events list-rules --profile $PROFILE --region $REGION --query 'Rules[*].Name' --output text 2>/dev/null); do
    aws events enable-rule --name "$RULE" --profile $PROFILE --region $REGION 2>/dev/null
    echo -e "   ${GREEN}✓${NC} Enabled: $RULE"
  done

  echo ""
  echo -e "${GREEN}All services RE-ENABLED. Site is live.${NC}"
fi
