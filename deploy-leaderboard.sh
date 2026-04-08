#!/bin/bash

# Leaderboard System Deployment Script
# Deploys backend infrastructure and frontend to dev.dashden.app

set -e

echo "🚀 Leaderboard System Deployment"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed"
    exit 1
fi
print_success "AWS CLI installed"

if ! command -v cdk &> /dev/null; then
    print_error "AWS CDK is not installed. Install with: npm install -g aws-cdk"
    exit 1
fi
print_success "AWS CDK installed"

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
print_success "Node.js installed"

echo ""
echo "Select deployment option:"
echo "1) Deploy Backend Only (Infrastructure + Lambda)"
echo "2) Deploy Frontend Only (Vercel)"
echo "3) Deploy Everything (Backend + Frontend)"
echo "4) Verify Deployment"
echo "5) Rollback"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo ""
        print_info "Deploying Backend Infrastructure..."
        echo ""
        
        cd infrastructure
        
        # Install dependencies
        print_info "Installing dependencies..."
        npm install --silent
        
        # Deploy stacks
        print_info "Deploying Database Stack..."
        cdk deploy DatabaseStack --require-approval never
        print_success "Database Stack deployed"
        
        echo ""
        print_info "Deploying EventBridge Stack..."
        cdk deploy EventBridgeStack --require-approval never
        print_success "EventBridge Stack deployed"
        
        echo ""
        print_info "Building Leaderboard Service..."
        cd ../services/leaderboard
        npm install --silent
        npm run build
        cd ../../infrastructure
        print_success "Leaderboard Service built"
        
        echo ""
        print_info "Deploying Leaderboard Lambda Stack..."
        cdk deploy LeaderboardLambdaStack --require-approval never
        print_success "Leaderboard Lambda Stack deployed"
        
        echo ""
        print_info "Deploying API Stack..."
        cdk deploy ApiStack --require-approval never
        print_success "API Stack deployed"
        
        echo ""
        print_success "Backend deployment complete!"
        echo ""
        
        # Get API endpoints
        print_info "API Endpoints:"
        aws cloudformation describe-stacks \
            --stack-name ApiStack \
            --query 'Stacks[0].Outputs' \
            --output table
        
        cd ..
        ;;
        
    2)
        echo ""
        print_info "Deploying Frontend to Vercel..."
        echo ""
        
        cd apps/web
        
        # Check if vercel is installed
        if ! command -v vercel &> /dev/null; then
            print_error "Vercel CLI is not installed. Install with: npm install -g vercel"
            exit 1
        fi
        
        # Install dependencies
        print_info "Installing dependencies..."
        npm install --silent
        
        # Build
        print_info "Building frontend..."
        npm run build
        print_success "Frontend built successfully"
        
        echo ""
        print_warning "Make sure environment variables are set in Vercel:"
        echo "  - VITE_LEADERBOARD_ENDPOINT"
        echo "  - VITE_API_URL"
        echo "  - VITE_GAME_ENDPOINT"
        echo ""
        read -p "Press Enter to continue with deployment..."
        
        # Deploy
        print_info "Deploying to Vercel..."
        vercel --prod
        
        print_success "Frontend deployed to dev.dashden.app"
        
        cd ../..
        ;;
        
    3)
        echo ""
        print_info "Deploying Everything..."
        echo ""
        
        # Deploy backend
        print_info "Step 1/2: Deploying Backend..."
        bash "$0" <<< "1"
        
        echo ""
        echo ""
        
        # Deploy frontend
        print_info "Step 2/2: Deploying Frontend..."
        bash "$0" <<< "2"
        
        echo ""
        print_success "Full deployment complete!"
        ;;
        
    4)
        echo ""
        print_info "Verifying Deployment..."
        echo ""
        
        # Check DynamoDB tables
        print_info "Checking DynamoDB tables..."
        TABLES=$(aws dynamodb list-tables --query 'TableNames' --output text)
        
        if echo "$TABLES" | grep -q "LeaderboardEntries"; then
            print_success "LeaderboardEntries table exists"
        else
            print_error "LeaderboardEntries table not found"
        fi
        
        if echo "$TABLES" | grep -q "UserAggregates"; then
            print_success "UserAggregates table exists"
        else
            print_error "UserAggregates table not found"
        fi
        
        # Check Lambda
        echo ""
        print_info "Checking Lambda functions..."
        if aws lambda get-function --function-name MemoryGame-LeaderboardService-dev &> /dev/null; then
            print_success "Leaderboard Service Lambda exists"
        else
            print_error "Leaderboard Service Lambda not found"
        fi
        
        # Check EventBridge
        echo ""
        print_info "Checking EventBridge..."
        EVENT_BUSES=$(aws events list-event-buses --query 'EventBuses[*].Name' --output text)
        if echo "$EVENT_BUSES" | grep -q "game-events"; then
            print_success "game-events event bus exists"
        else
            print_error "game-events event bus not found"
        fi
        
        # Check API Gateway
        echo ""
        print_info "Checking API Gateway..."
        API_URL=$(aws cloudformation describe-stacks \
            --stack-name ApiStack \
            --query 'Stacks[0].Outputs[?OutputKey==`LeaderboardEndpoint`].OutputValue' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$API_URL" ]; then
            print_success "Leaderboard API endpoint: $API_URL"
        else
            print_error "Leaderboard API endpoint not found"
        fi
        
        # Test frontend
        echo ""
        print_info "Testing frontend..."
        if curl -s -o /dev/null -w "%{http_code}" https://dev.dashden.app | grep -q "200"; then
            print_success "Frontend is accessible at https://dev.dashden.app"
        else
            print_warning "Frontend may not be accessible"
        fi
        
        echo ""
        print_success "Verification complete!"
        ;;
        
    5)
        echo ""
        print_warning "Rolling back deployment..."
        echo ""
        
        read -p "Are you sure you want to rollback? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Rollback cancelled"
            exit 0
        fi
        
        cd infrastructure
        
        print_info "Destroying Leaderboard Lambda Stack..."
        cdk destroy LeaderboardLambdaStack --force
        
        print_info "Destroying EventBridge Stack..."
        cdk destroy EventBridgeStack --force
        
        print_info "Destroying Database Stack..."
        cdk destroy DatabaseStack --force
        
        print_success "Backend rollback complete"
        
        echo ""
        print_warning "To rollback frontend, run: vercel rollback"
        
        cd ..
        ;;
        
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📚 Next Steps:"
echo "1. Visit https://dev.dashden.app"
echo "2. Log in and navigate to /leaderboard"
echo "3. Play a game to test score breakdown"
echo "4. Check dashboard widgets"
echo "5. Monitor CloudWatch logs for any errors"
echo ""
print_success "Deployment script complete!"
