#!/bin/bash

# Deployment Script for Memory Game Infrastructure
# Builds Lambda functions and deploys all CDK stacks

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-dev}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
  echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'${NC}"
  echo "Usage: $0 [dev|staging|prod]"
  exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Memory Game Infrastructure Deployment   ║${NC}"
echo -e "${BLUE}║          Environment: ${ENVIRONMENT}                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Get the root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INFRA_DIR="$ROOT_DIR/infrastructure"

# Step 1: Build Lambda functions
echo -e "${YELLOW}Step 1/5: Building Lambda functions...${NC}"
bash "$INFRA_DIR/scripts/build-lambdas.sh"
echo ""

# Step 2: Install CDK dependencies
echo -e "${YELLOW}Step 2/5: Installing CDK dependencies...${NC}"
cd "$INFRA_DIR"
if [ ! -d "node_modules" ]; then
  npm ci
else
  echo "  Dependencies already installed"
fi
echo ""

# Step 3: Synthesize CloudFormation templates
echo -e "${YELLOW}Step 3/5: Synthesizing CloudFormation templates...${NC}"
npm run cdk synth -- -c environment="$ENVIRONMENT"
echo ""

# Step 4: Deploy stacks
echo -e "${YELLOW}Step 4/5: Deploying CDK stacks...${NC}"
echo -e "${BLUE}This will deploy the following stacks:${NC}"
echo "  1. MemoryGame-Database-$ENVIRONMENT"
echo "  2. MemoryGame-Cognito-$ENVIRONMENT"
echo "  3. MemoryGame-EventBridge-$ENVIRONMENT"
echo "  4. MemoryGame-Lambda-$ENVIRONMENT"
echo "  5. MemoryGame-API-$ENVIRONMENT"
echo "  6. MemoryGame-Monitoring-$ENVIRONMENT"
echo ""

# Confirmation for production
if [ "$ENVIRONMENT" = "prod" ]; then
  echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION!${NC}"
  read -p "Are you sure you want to continue? (yes/no): " -r
  echo
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Deployment cancelled."
    exit 0
  fi
fi

# Deploy all stacks
npm run cdk deploy -- --all -c environment="$ENVIRONMENT" --require-approval never
echo ""

# Step 5: Display outputs
echo -e "${YELLOW}Step 5/5: Retrieving stack outputs...${NC}"
echo ""
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}Stack Outputs:${NC}"
aws cloudformation describe-stacks \
  --stack-name "MemoryGame-API-$ENVIRONMENT" \
  --query 'Stacks[0].Outputs' \
  --output table 2>/dev/null || echo "  (Run 'aws cloudformation describe-stacks' to view outputs)"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Deployment Complete! 🎉            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "  1. Test the API endpoints"
echo "  2. Configure frontend with API URL and Cognito details"
echo "  3. Monitor CloudWatch dashboards and alarms"
echo ""
echo "Useful commands:"
echo "  - View logs: aws logs tail /aws/lambda/MemoryGame-AuthService-$ENVIRONMENT --follow"
echo "  - View API: aws apigatewayv2 get-apis"
echo "  - View stacks: aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE"
