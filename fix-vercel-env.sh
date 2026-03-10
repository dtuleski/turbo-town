#!/bin/bash

set -e

cd apps/web

echo "🧹 Removing old environment variables..."

# Remove all existing variables
npx vercel env rm VITE_COGNITO_REGION production --yes 2>/dev/null || true
npx vercel env rm VITE_COGNITO_USER_POOL_ID production --yes 2>/dev/null || true
npx vercel env rm VITE_COGNITO_CLIENT_ID production --yes 2>/dev/null || true
npx vercel env rm VITE_COGNITO_DOMAIN production --yes 2>/dev/null || true
npx vercel env rm VITE_AUTH_ENDPOINT production --yes 2>/dev/null || true
npx vercel env rm VITE_GAME_ENDPOINT production --yes 2>/dev/null || true
npx vercel env rm VITE_APP_NAME production --yes 2>/dev/null || true
npx vercel env rm VITE_APP_URL production --yes 2>/dev/null || true
npx vercel env rm VITE_ENV production --yes 2>/dev/null || true

echo ""
echo "✅ Old variables removed"
echo ""
echo "📝 Adding new environment variables..."

# Add variables with proper escaping
printf "us-east-1" | npx vercel env add VITE_COGNITO_REGION production --yes
printf "us-east-1_jPkMWmBup" | npx vercel env add VITE_COGNITO_USER_POOL_ID production --yes
printf "282nlnkslo1ttfsg1qfj5r2a54" | npx vercel env add VITE_COGNITO_CLIENT_ID production --yes
printf "memory-game-dev" | npx vercel env add VITE_COGNITO_DOMAIN production --yes
printf "https://ooihrv63q8.execute-api.us-east-1.amazonaws.com/auth/graphql" | npx vercel env add VITE_AUTH_ENDPOINT production --yes
printf "https://ooihrv63q8.execute-api.us-east-1.amazonaws.com/game/graphql" | npx vercel env add VITE_GAME_ENDPOINT production --yes
printf "DashDen" | npx vercel env add VITE_APP_NAME production --yes
printf "https://dashden.app" | npx vercel env add VITE_APP_URL production --yes
printf "production" | npx vercel env add VITE_ENV production --yes

echo ""
echo "✅ All environment variables added!"
echo ""
echo "🚀 Triggering production deployment..."
npx vercel --prod

echo ""
echo "🎉 Done! Site will be live in 2-3 minutes"
