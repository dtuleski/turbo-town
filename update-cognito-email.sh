#!/bin/bash

# Update Cognito Email Template
# This script redeploys the Cognito stack with the updated email template

echo "🔄 Updating Cognito Email Template..."
echo ""

cd infrastructure

echo "📦 Building CDK app..."
npm run build

echo ""
echo "🚀 Deploying Cognito stack..."
npx cdk deploy MemoryGameCognitoStack-dev --require-approval never

echo ""
echo "✅ Cognito email template updated!"
echo ""
echo "📧 New email template:"
echo "   Subject: Verify your email for Memory Game"
echo "   Body: Hello! Thanks for signing up for Memory Game. Your verification code is {####}."
echo ""
echo "Note: The {username} placeholder has been removed because Cognito uses the UUID as username."
echo "      The frontend now displays the preferred_username attribute instead."
