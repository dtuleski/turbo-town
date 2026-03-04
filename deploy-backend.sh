#!/bin/bash

# Memory Game Backend Deployment Script
# This script automates the deployment of backend services to AWS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment (default to dev)
ENV=${1:-dev}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Memory Game Backend Deployment${NC}"
echo -e "${BLUE}Environment: ${ENV}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print step headers
print_step() {
    echo -e "\n${GREEN}>>> $1${NC}\n"
}

# Function to print errors
print_error() {
    echo -e "\n${RED}ERROR: $1${NC}\n"
}

# Function to print warnings
print_warning() {
    echo -e "\n${YELLOW}WARNING: $1${NC}\n"
}

# Check prerequisites
print_step "Step 1: Checking Prerequisites"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Install it with: brew install awscli"
    exit 1
fi
echo "✓ AWS CLI installed"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Run: aws configure"
    exit 1
fi
echo "✓ AWS credentials configured"

# Check CDK (will install locally if needed)
if ! command -v cdk &> /dev/null; then
    print_warning "AWS CDK not installed globally, will use local installation"
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
echo "✓ Node.js installed ($(node --version))"

# Build shared package
print_step "Step 2: Building Shared Package"
cd packages/shared
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
echo "Building shared package..."
npm run build
echo "✓ Shared package built"

# Build auth service
print_step "Step 3: Building Auth Service"
cd ../../services/auth
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
echo "Building auth service..."
npm run build
echo "✓ Auth service built"

# Build game service
print_step "Step 4: Building Game Service"
cd ../game
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
echo "Building game service..."
npm run build
echo "✓ Game service built"

# Deploy infrastructure
print_step "Step 5: Deploying Infrastructure to AWS"
cd ../../infrastructure

if [ ! -d "node_modules" ]; then
    echo "Installing CDK dependencies..."
    npm install
fi

# Install CDK locally if not available
if [ ! -d "node_modules/aws-cdk" ]; then
    echo "Installing AWS CDK locally..."
    npm install aws-cdk
fi

# Check if CDK is bootstrapped
print_warning "Checking if CDK is bootstrapped..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit &> /dev/null; then
    echo "CDK not bootstrapped. Bootstrapping now..."
    npx cdk bootstrap
    echo "✓ CDK bootstrapped"
else
    echo "✓ CDK already bootstrapped"
fi

# Deploy all stacks
echo ""
echo "Deploying all stacks to ${ENV} environment..."
echo "This will take 10-15 minutes..."
echo ""

npx cdk deploy --all \
    --context environment=${ENV} \
    --require-approval never \
    --outputs-file cdk-outputs.json

echo ""
echo "✓ All stacks deployed successfully"

# Extract outputs
print_step "Step 6: Extracting Deployment Outputs"

if [ -f "cdk-outputs.json" ]; then
    echo "Deployment outputs saved to: infrastructure/cdk-outputs.json"
    echo ""
    echo "Important values for frontend configuration:"
    echo "============================================="
    
    # Try to extract key values (this will vary based on your stack outputs)
    if command -v jq &> /dev/null; then
        echo ""
        echo "API URL:"
        jq -r '.[].ApiUrl // empty' cdk-outputs.json 2>/dev/null || echo "(Check cdk-outputs.json)"
        
        echo ""
        echo "Cognito User Pool ID:"
        jq -r '.[].UserPoolId // empty' cdk-outputs.json 2>/dev/null || echo "(Check cdk-outputs.json)"
        
        echo ""
        echo "Cognito Client ID:"
        jq -r '.[].UserPoolClientId // empty' cdk-outputs.json 2>/dev/null || echo "(Check cdk-outputs.json)"
    else
        echo ""
        print_warning "Install 'jq' to see formatted outputs: brew install jq"
        echo "For now, check the file: infrastructure/cdk-outputs.json"
    fi
    
    echo ""
    echo "============================================="
fi

# Success message
print_step "Deployment Complete! 🎉"

echo "Next steps:"
echo "1. Copy the values from cdk-outputs.json"
echo "2. Update apps/web/.env.local with these values"
echo "3. Restart your frontend dev server"
echo "4. Test registration and login"
echo ""
echo "For detailed instructions, see: BACKEND-DEPLOYMENT-QUICKSTART.md"
echo ""

cd ..
