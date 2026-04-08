#!/bin/bash

# Leaderboard System Quick Test Script
# This script helps you quickly test the leaderboard system

set -e

echo "🏆 Leaderboard System Test Script"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
print_success "Node.js installed"

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm installed"

if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed"
    exit 1
fi
print_success "AWS CLI installed"

echo ""
echo "Select test type:"
echo "1) Backend Unit Tests"
echo "2) Frontend Development Server"
echo "3) Infrastructure Verification"
echo "4) End-to-End API Test"
echo "5) Full Test Suite"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo ""
        print_info "Running Backend Unit Tests..."
        echo ""
        
        # Test Leaderboard Service
        echo "Testing Leaderboard Service..."
        cd services/leaderboard
        npm install --silent
        npm test
        cd ../..
        print_success "Leaderboard Service tests passed"
        
        echo ""
        echo "Testing Game Service..."
        cd services/game
        npm install --silent
        npm test
        cd ../..
        print_success "Game Service tests passed"
        ;;
        
    2)
        echo ""
        print_info "Starting Frontend Development Server..."
        echo ""
        
        cd apps/web
        
        # Check if .env.local exists
        if [ ! -f .env.local ]; then
            print_error ".env.local not found!"
            echo ""
            echo "Please create .env.local with the following variables:"
            echo "VITE_API_URL=your-api-gateway-url"
            echo "VITE_GAME_ENDPOINT=your-game-endpoint"
            echo "VITE_LEADERBOARD_ENDPOINT=your-leaderboard-endpoint"
            echo "VITE_COGNITO_USER_POOL_ID=your-user-pool-id"
            echo "VITE_COGNITO_CLIENT_ID=your-client-id"
            echo "VITE_COGNITO_REGION=us-east-1"
            exit 1
        fi
        
        print_success ".env.local found"
        
        # Install dependencies if needed
        if [ ! -d "node_modules" ]; then
            print_info "Installing dependencies..."
            npm install
        fi
        
        print_success "Starting dev server at http://localhost:3000"
        echo ""
        echo "Test the following:"
        echo "1. Navigate to /leaderboard"
        echo "2. Check dashboard widgets"
        echo "3. Complete a game and see score breakdown"
        echo ""
        npm run dev
        ;;
        
    3)
        echo ""
        print_info "Verifying Infrastructure..."
        echo ""
        
        # Check DynamoDB tables
        echo "Checking DynamoDB tables..."
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
        
        if echo "$TABLES" | grep -q "RateLimitBuckets"; then
            print_success "RateLimitBuckets table exists"
        else
            print_error "RateLimitBuckets table not found"
        fi
        
        # Check EventBridge
        echo ""
        echo "Checking EventBridge..."
        EVENT_BUSES=$(aws events list-event-buses --query 'EventBuses[*].Name' --output text)
        
        if echo "$EVENT_BUSES" | grep -q "game-events"; then
            print_success "game-events event bus exists"
        else
            print_error "game-events event bus not found"
        fi
        
        # Check Lambda functions
        echo ""
        echo "Checking Lambda functions..."
        FUNCTIONS=$(aws lambda list-functions --query 'Functions[*].FunctionName' --output text)
        
        if echo "$FUNCTIONS" | grep -q "LeaderboardService"; then
            print_success "Leaderboard Service Lambda exists"
        else
            print_error "Leaderboard Service Lambda not found"
        fi
        
        echo ""
        print_success "Infrastructure verification complete"
        ;;
        
    4)
        echo ""
        print_info "Running End-to-End API Test..."
        echo ""
        
        # Get API URL from CloudFormation
        API_URL=$(aws cloudformation describe-stacks \
            --stack-name ApiStack \
            --query 'Stacks[0].Outputs[?OutputKey==`LeaderboardEndpoint`].OutputValue' \
            --output text 2>/dev/null || echo "")
        
        if [ -z "$API_URL" ]; then
            print_error "Could not find API Gateway URL"
            echo "Please deploy the ApiStack first"
            exit 1
        fi
        
        print_success "Found API URL: $API_URL"
        
        echo ""
        read -p "Enter your JWT token: " JWT_TOKEN
        
        if [ -z "$JWT_TOKEN" ]; then
            print_error "JWT token is required"
            exit 1
        fi
        
        echo ""
        print_info "Testing getLeaderboard query..."
        
        RESPONSE=$(curl -s -X POST "$API_URL" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -d '{
                "query": "query { getLeaderboard(gameType: OVERALL, timeframe: ALL_TIME, limit: 10) { entries { rank username score } totalEntries } }"
            }')
        
        if echo "$RESPONSE" | grep -q "errors"; then
            print_error "API returned errors:"
            echo "$RESPONSE" | jq '.errors'
        elif echo "$RESPONSE" | grep -q "entries"; then
            print_success "API test successful!"
            echo ""
            echo "Response:"
            echo "$RESPONSE" | jq '.'
        else
            print_error "Unexpected response:"
            echo "$RESPONSE"
        fi
        ;;
        
    5)
        echo ""
        print_info "Running Full Test Suite..."
        echo ""
        
        # Run all tests
        echo "1/4 Backend Unit Tests..."
        cd services/leaderboard && npm install --silent && npm test --silent && cd ../..
        cd services/game && npm install --silent && npm test --silent && cd ../..
        print_success "Backend tests passed"
        
        echo ""
        echo "2/4 Infrastructure Verification..."
        bash "$0" <<< "3"
        
        echo ""
        echo "3/4 Checking frontend build..."
        cd apps/web
        npm install --silent
        npm run build
        cd ../..
        print_success "Frontend builds successfully"
        
        echo ""
        print_success "Full test suite complete!"
        echo ""
        echo "Next steps:"
        echo "1. Start frontend dev server: bash test-leaderboard.sh (choose option 2)"
        echo "2. Test API endpoints: bash test-leaderboard.sh (choose option 4)"
        echo "3. Play a game and verify leaderboard updates"
        ;;
        
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
print_success "Test complete!"
