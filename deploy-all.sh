#!/bin/bash

# One-Command Leaderboard Deployment
# Deploys everything: Backend + Frontend

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; exit 1; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

echo ""
echo "🚀 Leaderboard System - One-Command Deployment"
echo "=============================================="
echo ""

# Check prerequisites
print_info "Checking prerequisites..."
command -v aws >/dev/null 2>&1 || print_error "AWS CLI not installed"
command -v cdk >/dev/null 2>&1 || print_error "AWS CDK not installed"
command -v node >/dev/null 2>&1 || print_error "Node.js not installed"
print_success "Prerequisites OK"

# Check Vercel CLI
if ! command -v vercel >/dev/null 2>&1; then
    print_warning "Vercel CLI not installed globally. Will use local installation."
    VERCEL_CMD="npx vercel"
else
    VERCEL_CMD="vercel"
fi

echo ""
print_info "Starting deployment..."
echo ""

# ============================================
# STEP 1: Deploy Backend Infrastructure
# ============================================
print_info "STEP 1/4: Deploying Backend Infrastructure..."
echo ""

cd infrastructure

# Install dependencies
print_info "Installing infrastructure dependencies..."
npm install --silent || print_error "Failed to install infrastructure dependencies"
print_success "Dependencies installed"

# Deploy Database Stack
print_info "Deploying Database Stack (DynamoDB tables)..."
cdk deploy MemoryGame-Database-dev --require-approval never || print_error "Database deployment failed"
print_success "Database Stack deployed"

# Deploy EventBridge Stack
print_info "Deploying EventBridge Stack..."
cdk deploy MemoryGame-EventBridge-dev --require-approval never || print_error "EventBridge deployment failed"
print_success "EventBridge Stack deployed"

cd ..

# ============================================
# STEP 2: Build and Deploy Leaderboard Service
# ============================================
print_info "STEP 2/4: Building Leaderboard Service..."
echo ""

cd services/leaderboard

print_info "Installing leaderboard service dependencies..."
npm install --silent || print_error "Failed to install leaderboard dependencies"
print_success "Dependencies installed"

print_info "Building leaderboard service..."
npm run build || print_error "Leaderboard build failed"
print_success "Leaderboard service built"

cd ../../infrastructure

print_info "Deploying Leaderboard Lambda Stack..."
cdk deploy MemoryGame-LeaderboardLambda-dev --require-approval never || print_error "Leaderboard Lambda deployment failed"
print_success "Leaderboard Lambda deployed"

# Deploy API Stack
print_info "Deploying API Stack (with leaderboard route)..."
cdk deploy MemoryGame-API-dev --require-approval never || print_error "API Stack deployment failed"
print_success "API Stack deployed"

cd ..

# ============================================
# STEP 3: Get API Endpoint
# ============================================
print_info "STEP 3/4: Getting API Endpoint..."
echo ""

LEADERBOARD_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name MemoryGame-API-dev \
    --query 'Stacks[0].Outputs[?OutputKey==`LeaderboardEndpoint`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$LEADERBOARD_ENDPOINT" ]; then
    print_error "Could not retrieve Leaderboard endpoint from CloudFormation"
fi

print_success "Leaderboard Endpoint: $LEADERBOARD_ENDPOINT"

# ============================================
# STEP 4: Deploy Frontend
# ============================================
print_info "STEP 4/4: Deploying Frontend..."
echo ""

cd apps/web

print_info "Installing frontend dependencies..."
npm install --silent || print_error "Failed to install frontend dependencies"
print_success "Dependencies installed"

print_info "Building frontend..."
npm run build || print_error "Frontend build failed"
print_success "Frontend built"

# Check if Vercel is configured
if [ ! -f ".vercel/project.json" ]; then
    print_warning "Vercel not linked. Please run '$VERCEL_CMD link' first"
    print_info "Linking to Vercel project..."
    $VERCEL_CMD link || print_error "Vercel link failed"
fi

# Set environment variable
print_info "Setting Vercel environment variable..."
echo "$LEADERBOARD_ENDPOINT" | $VERCEL_CMD env add VITE_LEADERBOARD_ENDPOINT production 2>/dev/null || print_warning "Environment variable may already exist"

print_info "Deploying to Vercel..."
$VERCEL_CMD --prod --yes || print_error "Vercel deployment failed"
print_success "Frontend deployed"

cd ../..

# ============================================
# DEPLOYMENT COMPLETE
# ============================================
echo ""
echo "=============================================="
print_success "🎉 DEPLOYMENT COMPLETE!"
echo "=============================================="
echo ""

print_info "Deployment Summary:"
echo ""
echo "  Backend:"
echo "    ✓ DynamoDB tables created"
echo "    ✓ EventBridge event bus configured"
echo "    ✓ Leaderboard Lambda deployed"
echo "    ✓ API Gateway updated"
echo ""
echo "  Frontend:"
echo "    ✓ Built successfully"
echo "    ✓ Deployed to Vercel"
echo "    ✓ Environment variables configured"
echo ""

print_info "API Endpoints:"
aws cloudformation describe-stacks \
    --stack-name MemoryGame-API-dev \
    --query 'Stacks[0].Outputs[?contains(OutputKey, `Endpoint`)].{Key:OutputKey,Value:OutputValue}' \
    --output table 2>/dev/null || echo "Could not retrieve endpoints"

echo ""
print_info "Next Steps:"
echo ""
echo "  1. Visit https://dev.dashden.app"
echo "  2. Log in with your account"
echo "  3. Look for Dashboard and Leaderboard buttons on home page"
echo "  4. Click Leaderboard to view rankings"
echo "  5. Play a game to test score breakdown"
echo ""

print_info "Verification Commands:"
echo ""
echo "  # Check Lambda logs"
echo "  aws logs tail /aws/lambda/MemoryGame-LeaderboardService-dev --follow"
echo ""
echo "  # Check DynamoDB tables"
echo "  aws dynamodb list-tables | grep -E 'Leaderboard|Aggregates'"
echo ""
echo "  # Test API endpoint"
echo "  curl -X POST $LEADERBOARD_ENDPOINT \\"
echo "    -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"query\":\"query{getLeaderboard(gameType:OVERALL,timeframe:ALL_TIME){totalEntries}}\"}'"
echo ""

print_success "Deployment script complete! 🚀"
echo ""
