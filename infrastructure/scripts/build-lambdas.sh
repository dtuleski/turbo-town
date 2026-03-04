#!/bin/bash

# Build Lambda Functions Script
# Builds all Lambda functions and prepares them for deployment

set -e

echo "🔨 Building Lambda Functions..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to build a service
build_service() {
  local service_name=$1
  local service_path=$2
  
  echo -e "${BLUE}Building ${service_name}...${NC}"
  
  cd "$service_path"
  
  # Install dependencies
  if [ ! -d "node_modules" ]; then
    echo "  Installing dependencies..."
    npm ci --production=false
  fi
  
  # Run TypeScript build
  echo "  Compiling TypeScript..."
  npm run build
  
  # Create dist directory if it doesn't exist
  mkdir -p dist
  
  # Copy package.json and install production dependencies
  echo "  Installing production dependencies..."
  cp package.json dist/
  cd dist
  npm ci --production
  cd ..
  
  echo -e "${GREEN}✓ ${service_name} built successfully${NC}"
  cd - > /dev/null
}

# Get the root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Root directory: $ROOT_DIR"

# Build Auth Service
if [ -d "$ROOT_DIR/services/auth" ]; then
  build_service "Auth Service" "$ROOT_DIR/services/auth"
else
  echo -e "${RED}✗ Auth Service not found at $ROOT_DIR/services/auth${NC}"
  exit 1
fi

# Build Game Service
if [ -d "$ROOT_DIR/services/game" ]; then
  build_service "Game Service" "$ROOT_DIR/services/game"
else
  echo -e "${RED}✗ Game Service not found at $ROOT_DIR/services/game${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ All Lambda functions built successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run cdk synth' to synthesize CloudFormation templates"
echo "  2. Run 'npm run cdk deploy --all' to deploy all stacks"
