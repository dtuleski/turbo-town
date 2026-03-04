#!/bin/bash

# Deploy Infrastructure Only
# This deploys just the infrastructure without building services first

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV=${1:-dev}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Infrastructure-Only Deployment${NC}"
echo -e "${BLUE}Environment: ${ENV}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

print_step() {
    echo -e "\n${GREEN}>>> $1${NC}\n"
}

print_error() {
    echo -e "\n${RED}ERROR: $1${NC}\n"
}

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not installed"
    exit 1
fi
echo "✓ AWS CLI installed"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured"
    exit 1
fi
echo "✓ AWS credentials configured"

# Deploy infrastructure
print_step "Deploying Infrastructure"
cd infrastructure

if [ ! -d "node_modules" ]; then
    echo "Installing CDK dependencies..."
    npm install
fi

# Install CDK locally if needed
if [ ! -d "node_modules/aws-cdk" ]; then
    echo "Installing AWS CDK locally..."
    npm install aws-cdk
fi

# Bootstrap CDK
print_step "Bootstrapping CDK (if needed)"
if ! aws cloudformation describe-stacks --stack-name CDKToolkit &> /dev/null; then
    echo "Bootstrapping CDK..."
    npx cdk bootstrap
    echo "✓ CDK bootstrapped"
else
    echo "✓ CDK already bootstrapped"
fi

# Deploy stacks
print_step "Deploying Infrastructure Stacks"
echo "This will take 10-15 minutes..."
echo ""

# Deploy only infrastructure stacks (no Lambda functions yet)
echo "Deploying Database Stack..."
npx cdk deploy MemoryGame-Database-${ENV} \
    --context environment=${ENV} \
    --require-approval never

echo ""
echo "Deploying Cognito Stack..."
npx cdk deploy MemoryGame-Cognito-${ENV} \
    --context environment=${ENV} \
    --require-approval never

echo ""
echo "Deploying EventBridge Stack..."
npx cdk deploy MemoryGame-EventBridge-${ENV} \
    --context environment=${ENV} \
    --require-approval never

echo ""
echo -e "${GREEN}✓ Infrastructure deployed successfully${NC}"
echo ""
echo "Deployed:"
echo "  - DynamoDB tables (8 tables)"
echo "  - Cognito User Pool"
echo "  - EventBridge Event Bus"
echo ""
echo "Next steps:"
echo "1. Fix TypeScript errors in services"
echo "2. Build services"
echo "3. Deploy Lambda and API stacks"
echo ""

cd ..
