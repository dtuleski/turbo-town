#!/bin/bash

# Restore authentication to game endpoint

echo "🔧 Restoring authentication to game endpoint..."
echo ""

# Get the route ID and authorizer ID
ROUTE_ID=$(aws apigatewayv2 get-routes \
  --api-id ooihrv63q8 \
  --query 'Items[?RouteKey==`POST /game/graphql`].RouteId' \
  --output text)

AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers \
  --api-id ooihrv63q8 \
  --query 'Items[0].AuthorizerId' \
  --output text)

echo "Route ID: $ROUTE_ID"
echo "Authorizer ID: $AUTHORIZER_ID"
echo ""

# Restore the authorizer
aws apigatewayv2 update-route \
  --api-id ooihrv63q8 \
  --route-id $ROUTE_ID \
  --authorization-type JWT \
  --authorizer-id $AUTHORIZER_ID

echo ""
echo "✅ Authentication restored!"
echo ""
echo "The game endpoint now requires Cognito JWT authentication again."
