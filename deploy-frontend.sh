#!/bin/bash

# Manual Frontend Deployment Script
# Use this if Amplify auto-deploy isn't working

echo "🚀 Deploying frontend to Amplify..."

# Build the frontend
echo "📦 Building frontend..."
cd apps/web
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo "✅ Build complete!"
echo ""
echo "📤 To deploy to Amplify, you have two options:"
echo ""
echo "Option 1: Use Amplify Console (Recommended)"
echo "  1. Go to: https://console.aws.amazon.com/amplify/"
echo "  2. Find your app"
echo "  3. Click 'Run build' or connect to GitHub for auto-deploy"
echo ""
echo "Option 2: Manual Upload"
echo "  1. Zip the dist folder: cd dist && zip -r ../deploy.zip ."
echo "  2. Upload via Amplify Console"
echo ""
echo "Build output is in: apps/web/dist/"
