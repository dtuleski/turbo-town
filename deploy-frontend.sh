#!/bin/bash

# Frontend Deployment Script for AWS Amplify

set -e

echo "🚀 Deploying Memory Game Frontend to AWS Amplify"
echo ""

# Check if Amplify CLI is installed
if ! command -v amplify &> /dev/null; then
    echo "❌ Amplify CLI not found. Installing..."
    npm install -g @aws-amplify/cli
fi

# Navigate to frontend directory
cd apps/web

# Build the frontend
echo "📦 Building frontend..."
npm run build

# Check if Amplify is initialized
if [ ! -d "amplify" ]; then
    echo ""
    echo "⚠️  Amplify not initialized yet."
    echo "Please run the following commands manually:"
    echo ""
    echo "  cd apps/web"
    echo "  amplify init"
    echo "  amplify add hosting"
    echo "  amplify publish"
    echo ""
    exit 1
fi

# Publish to Amplify
echo "🌐 Publishing to Amplify..."
amplify publish --yes

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your app is now live and accessible from any device!"
echo "Check the Amplify Console for your public URL:"
echo "https://console.aws.amazon.com/amplify/"
