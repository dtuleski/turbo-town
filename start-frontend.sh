#!/bin/bash

# Frontend Startup Script
# This script starts the frontend development server with proper environment configuration

echo "🚀 Starting Memory Game Frontend..."
echo ""

# Check if .env.local exists
if [ ! -f "apps/web/.env.local" ]; then
    echo "❌ Error: apps/web/.env.local not found!"
    echo "Please create it with the following content:"
    echo ""
    echo "VITE_COGNITO_REGION=us-east-1"
    echo "VITE_COGNITO_USER_POOL_ID=us-east-1_jPkMWmBup"
    echo "VITE_COGNITO_CLIENT_ID=282nlnkslo1ttfsg1qfj5r2a54"
    echo "VITE_COGNITO_DOMAIN=memory-game-dev"
    echo "VITE_API_URL=https://ooihrv63q8.execute-api.us-east-1.amazonaws.com/auth/graphql"
    echo "VITE_AUTH_ENDPOINT=https://ooihrv63q8.execute-api.us-east-1.amazonaws.com/auth/graphql"
    echo "VITE_GAME_ENDPOINT=https://ooihrv63q8.execute-api.us-east-1.amazonaws.com/game/graphql"
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Check if node_modules exists
if [ ! -d "apps/web/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Clear Vite cache if it exists (prevents clsx import errors)
if [ -d "apps/web/node_modules/.vite" ]; then
    echo "🧹 Clearing Vite cache..."
    rm -rf apps/web/node_modules/.vite
    echo ""
fi

echo "🌐 Starting development server..."
echo "Frontend will be available at: http://localhost:3000"
echo ""
echo "📋 What to check:"
echo "  1. Look for environment debug panel in bottom-right corner"
echo "  2. Verify Cognito configuration is loaded"
echo "  3. Try registering a new user with a real email"
echo "  4. Check your email for confirmation code"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd apps/web && npm run dev
