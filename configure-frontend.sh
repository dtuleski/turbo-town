#!/bin/bash

# Frontend Configuration Script
# Updates frontend environment variables with deployed backend values

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Frontend Configuration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if cdk-outputs.json exists
if [ ! -f "infrastructure/cdk-outputs.json" ]; then
    echo -e "${YELLOW}ERROR: infrastructure/cdk-outputs.json not found${NC}"
    echo "Please run ./deploy-backend.sh first"
    exit 1
fi

echo "Reading deployment outputs..."

# Create .env.local file
ENV_FILE="apps/web/.env.local"

echo "Creating ${ENV_FILE}..."

# Extract values from CDK outputs
# Note: Adjust these jq queries based on your actual CDK output structure
if command -v jq &> /dev/null; then
    API_URL=$(jq -r '.[].ApiUrl // empty' infrastructure/cdk-outputs.json | head -1)
    USER_POOL_ID=$(jq -r '.[].UserPoolId // empty' infrastructure/cdk-outputs.json | head -1)
    CLIENT_ID=$(jq -r '.[].UserPoolClientId // empty' infrastructure/cdk-outputs.json | head -1)
    REGION=$(jq -r '.[].Region // "us-east-1"' infrastructure/cdk-outputs.json | head -1)
    
    # Create .env.local
    cat > ${ENV_FILE} << EOF
# API Configuration
VITE_API_URL=${API_URL}

# AWS Cognito Configuration
VITE_COGNITO_USER_POOL_ID=${USER_POOL_ID}
VITE_COGNITO_CLIENT_ID=${CLIENT_ID}
VITE_COGNITO_REGION=${REGION}

# Feature Flags
VITE_ENABLE_SOCIAL_LOGIN=false
VITE_ENABLE_SOUND_EFFECTS=true

# Environment
VITE_ENV=development
EOF

    echo -e "${GREEN}✓ Configuration file created: ${ENV_FILE}${NC}"
    echo ""
    echo "Configuration values:"
    echo "  API URL: ${API_URL}"
    echo "  User Pool ID: ${USER_POOL_ID}"
    echo "  Client ID: ${CLIENT_ID}"
    echo "  Region: ${REGION}"
    
else
    echo -e "${YELLOW}jq not installed. Creating template file...${NC}"
    echo "Install jq with: brew install jq"
    echo ""
    
    # Create template
    cat > ${ENV_FILE} << EOF
# API Configuration
VITE_API_URL=YOUR_API_URL_HERE

# AWS Cognito Configuration
VITE_COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID_HERE
VITE_COGNITO_CLIENT_ID=YOUR_CLIENT_ID_HERE
VITE_COGNITO_REGION=us-east-1

# Feature Flags
VITE_ENABLE_SOCIAL_LOGIN=false
VITE_ENABLE_SOUND_EFFECTS=true

# Environment
VITE_ENV=development
EOF

    echo "Template created. Please manually update ${ENV_FILE} with values from:"
    echo "  infrastructure/cdk-outputs.json"
fi

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Review ${ENV_FILE}"
echo "2. Restart your frontend dev server:"
echo "   cd apps/web && npm run dev"
echo "3. Test authentication with real backend"
echo ""
