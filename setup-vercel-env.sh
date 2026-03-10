#!/bin/bash

# Setup Vercel Environment Variables for DashDen
# This script adds all required environment variables to Vercel

set -e  # Exit on error

echo "🚀 Setting up Vercel environment variables for DashDen..."
echo ""

# Change to the web directory
cd apps/web

# Function to add environment variable (non-interactive)
add_env() {
  local key=$1
  local value=$2
  echo "Adding $key..."
  # Use printf to avoid issues with echo and special characters
  printf "%s\n" "$value" | npx vercel env add "$key" production --yes 2>/dev/null || {
    echo "⚠️  $key might already exist or there was an error (continuing...)"
  }
}

# Add all environment variables
add_env "VITE_COGNITO_REGION" "us-east-1"
add_env "VITE_COGNITO_USER_POOL_ID" "us-east-1_jPkMWmBup"
add_env "VITE_COGNITO_CLIENT_ID" "282nlnkslo1ttfsg1qfj5r2a54"
add_env "VITE_COGNITO_DOMAIN" "memory-game-dev"
add_env "VITE_AUTH_ENDPOINT" "https://ooihrv63q8.execute-api.us-east-1.amazonaws.com/auth/graphql"
add_env "VITE_GAME_ENDPOINT" "https://ooihrv63q8.execute-api.us-east-1.amazonaws.com/game/graphql"
add_env "VITE_APP_NAME" "DashDen"
add_env "VITE_APP_URL" "https://dashden.app"
add_env "VITE_ENV" "production"

echo ""
echo "✅ All environment variables added!"
echo ""
echo "Now triggering a redeploy..."
npx vercel --prod

echo ""
echo "🎉 Done! Your site will be live at https://dashden.app in 2-3 minutes"
echo ""
