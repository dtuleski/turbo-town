#!/bin/bash

echo "🔑 Stripe Key Rotation Helper"
echo "=============================="
echo ""
echo "⚠️  IMPORTANT: Before running this script:"
echo "1. Go to https://dashboard.stripe.com"
echo "2. Navigate to Developers → API keys"
echo "3. Generate new test keys"
echo "4. Have them ready to paste below"
echo ""

read -p "Enter your NEW Stripe secret key (sk_test_...): " NEW_SECRET_KEY
read -p "Enter your NEW Stripe publishable key (pk_test_...): " NEW_PUBLISHABLE_KEY

if [[ ! $NEW_SECRET_KEY =~ ^sk_test_ ]]; then
    echo "❌ Error: Secret key must start with 'sk_test_'"
    exit 1
fi

if [[ ! $NEW_PUBLISHABLE_KEY =~ ^pk_test_ ]]; then
    echo "❌ Error: Publishable key must start with 'pk_test_'"
    exit 1
fi

echo ""
echo "🚀 Updating Lambda environment variables..."

aws lambda update-function-configuration \
  --function-name MemoryGame-GameService-dev \
  --environment Variables="{
    STRIPE_SECRET_KEY=$NEW_SECRET_KEY,
    STRIPE_BASIC_PRICE_ID=price_1T8TJYD1222JoXRH79EkciO2,
    STRIPE_PREMIUM_PRICE_ID=price_1T8TK0D1222JoXRHR0kLMCl5,
    LANGUAGE_RESULTS_TABLE_NAME=memory-game-language-results-dev,
    RATE_LIMITS_TABLE_NAME=memory-game-rate-limits-dev,
    COGNITO_USER_POOL_ID=us-east-1_jPkMWmBup,
    SUBSCRIPTIONS_TABLE_NAME=memory-game-subscriptions-dev,
    FRONTEND_URL=https://dashden.app,
    LANGUAGE_PROGRESS_TABLE_NAME=memory-game-language-progress-dev,
    THEMES_TABLE_NAME=memory-game-themes-dev,
    ACHIEVEMENTS_TABLE_NAME=memory-game-achievements-dev,
    GAME_CATALOG_TABLE_NAME=memory-game-catalog-dev,
    EVENT_BUS_NAME=MemoryGame-dev,
    NODE_ENV=dev,
    LANGUAGE_WORDS_TABLE_NAME=memory-game-language-words-dev,
    LOG_LEVEL=DEBUG,
    GAMES_TABLE_NAME=memory-game-games-dev
  }"

if [ $? -eq 0 ]; then
    echo "✅ Lambda environment variables updated successfully!"
else
    echo "❌ Failed to update Lambda environment variables"
    exit 1
fi

echo ""
echo "🌐 Updating Vercel environment variables..."

echo "$NEW_PUBLISHABLE_KEY" | npx vercel env add VITE_STRIPE_PUBLISHABLE_KEY production --yes

if [ $? -eq 0 ]; then
    echo "✅ Vercel environment variables updated successfully!"
else
    echo "❌ Failed to update Vercel environment variables"
    exit 1
fi

echo ""
echo "🧹 Removing local .stripe.env file..."
if [ -f ".stripe.env" ]; then
    rm .stripe.env
    echo "✅ .stripe.env file removed"
else
    echo "ℹ️  .stripe.env file not found (already removed)"
fi

echo ""
echo "✅ Key rotation completed successfully!"
echo ""
echo "🧪 Next steps:"
echo "1. Test your payment functionality at https://dev.dashden.app"
echo "2. Try upgrading to a paid plan to verify Stripe integration"
echo "3. Check the admin dashboard for any errors"
echo "4. Run the sanitize-docs.sh script to clean up documentation"
echo ""
echo "🔒 Your old keys are now invalid and cannot be used."