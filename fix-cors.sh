#!/bin/bash

# Fix CORS Issue for Game Service
# This script redeploys the API Gateway with proper CORS configuration

echo "🔧 Fixing CORS for Game Service..."
echo ""

cd infrastructure

echo "📦 Building CDK app..."
npm run build

echo ""
echo "🚀 Redeploying API Gateway stack..."
npx cdk deploy MemoryGameAPIStack-dev --require-approval never

echo ""
echo "✅ CORS configuration updated!"
echo ""
echo "📋 Next steps:"
echo "  1. Refresh your browser (Ctrl+Shift+R)"
echo "  2. Try playing a game again"
echo "  3. Check Network tab - CORS error should be gone"
echo ""
echo "If CORS error persists, check:"
echo "  - API Gateway CORS settings in AWS Console"
echo "  - Lambda function CORS headers"
echo "  - Browser cache (try incognito mode)"
