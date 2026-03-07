#!/bin/bash

# Deploy Game Service Lambda
# This script bundles and deploys the game service to AWS Lambda

set -e

echo "🚀 Deploying Game Service..."

# Build the service
echo "📦 Building service..."
cd services/game
npm run build

# Bundle with esbuild
echo "📦 Bundling with esbuild..."
npx esbuild src/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=cjs \
  --outfile=dist/index.js \
  --external:@aws-sdk/* \
  --sourcemap

# Create deployment package
echo "📦 Creating deployment package..."
cd dist
zip -r ../game-service.zip .
cd ..

# Deploy to Lambda
echo "🚀 Deploying to Lambda..."
aws lambda update-function-code \
  --function-name MemoryGame-GameService-dev \
  --zip-file fileb://game-service.zip \
  --region us-east-1

echo "✅ Game Service deployed successfully!"
echo ""
echo "To test, run:"
echo "aws lambda invoke --function-name MemoryGame-GameService-dev --payload '{}' response.json --region us-east-1"
