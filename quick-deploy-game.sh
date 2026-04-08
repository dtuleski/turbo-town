#!/bin/bash
set -e

echo "Building game service..."
cd services/game
npm run build

echo "Creating deployment package..."
zip -q -r function.zip dist node_modules package.json

echo "Updating Lambda function..."
aws lambda update-function-code \
  --function-name MemoryGame-GameService-dev \
  --zip-file fileb://function.zip

echo "Waiting for update to complete..."
aws lambda wait function-updated --function-name MemoryGame-GameService-dev

echo "Deployment complete!"
rm function.zip
