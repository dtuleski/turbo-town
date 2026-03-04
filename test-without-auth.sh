#!/bin/bash

# Temporarily remove authentication to test CORS
# This will help us confirm if the authorizer is causing the CORS issue

echo "🔧 Temporarily removing authentication from game endpoint..."
echo "⚠️  WARNING: This is for testing only!"
echo ""

# Get the route ID for the game endpoint
ROUTE_ID=$(aws apigatewayv2 get-routes \
  --api-id ooihrv63q8 \
  --query 'Items[?RouteKey==`POST /game/graphql`].RouteId' \
  --output text)

echo "Route ID: $ROUTE_ID"
echo ""

# Remove the authorizer
aws apigatewayv2 update-route \
  --api-id ooihrv63q8 \
  --route-id $ROUTE_ID \
  --authorization-type NONE

echo ""
echo "✅ Authentication temporarily removed!"
echo ""
echo "📋 Next steps:"
echo "  1. Hard refresh your browser (Cmd+Shift+R)"
echo "  2. Check if API Status shows 'connected ✅'"
echo "  3. Try playing a game"
echo ""
echo "⚠️  To restore authentication, run: ./restore-auth.sh"
