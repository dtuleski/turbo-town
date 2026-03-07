#!/bin/bash
set -e

echo "🔨 Building Lambda function..."

# Create backup before deployment
if [ -f "backup-before-deploy.sh" ]; then
  ./backup-before-deploy.sh
fi

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

# Validate build
echo "🔍 Validating build..."
SIZE=$(stat -f%z dist/index.js 2>/dev/null || stat -c%s dist/index.js)
if [ $SIZE -lt 300000 ]; then
  echo "❌ ERROR: Build too small ($SIZE bytes). Expected >300KB"
  exit 1
fi

# Check for critical functions
if ! grep -q "listAvailableGames" dist/index.js; then
  echo "❌ ERROR: Missing listAvailableGames function"
  exit 1
fi

if ! grep -q "getAdminAnalytics" dist/index.js; then
  echo "❌ ERROR: Missing getAdminAnalytics function"
  exit 1
fi

echo "✅ Build validation passed"

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

# Run smoke tests
echo ""
if [ -f "smoke-test.sh" ]; then
  ./smoke-test.sh
else
  echo "⚠️  Smoke tests not found. Please test manually."
fi
