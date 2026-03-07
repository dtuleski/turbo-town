#!/bin/bash
set -e

echo "🔨 Building Lambda function..."

# Clean previous builds
rm -rf dist
mkdir -p dist

# Use esbuild to bundle everything including shared package
echo "📦 Bundling with esbuild..."
npx esbuild src/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/index.js \
  --format=cjs \
  --external:@aws-sdk/* \
  --external:aws-sdk \
  --packages=bundle

echo "✅ Build complete: $(ls -lh dist/index.js | awk '{print $5}')"

# Create deployment package
echo "📦 Creating deployment package..."
cd dist
rm -f ../function.zip
zip -q ../function.zip index.js
cd ..

echo "✅ Package created: $(ls -lh function.zip | awk '{print $5}')"

# Deploy
echo "🚀 Deploying to Lambda..."
python3 deploy-lambda.py

echo "✅ Deployment complete!"
