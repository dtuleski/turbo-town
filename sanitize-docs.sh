#!/bin/bash

echo "🔒 Starting documentation sanitization..."

# Replace exposed Stripe secret keys
echo "Sanitizing Stripe secret keys..."
find . -name "*.md" -type f -exec sed -i '' 's/sk_test_51T8TGYD1222JoXRH[A-Za-z0-9]*/sk_test_XXXXXXXXXXXXXXXXXXXXXXX/g' {} \;

# Replace exposed Stripe publishable keys  
echo "Sanitizing Stripe publishable keys..."
find . -name "*.md" -type f -exec sed -i '' 's/pk_test_51T8TGYD1222JoXRH[A-Za-z0-9]*/pk_test_XXXXXXXXXXXXXXXXXXXXXXX/g' {} \;

# Replace exposed Cognito client IDs
echo "Sanitizing Cognito client IDs..."
find . -name "*.md" -type f -exec sed -i '' 's/282nlnkslo1ttfsg1qfj5r2a54/XXXXXXXXXXXXXXXXXXXXXXX/g' {} \;

# Replace exposed API endpoints
echo "Sanitizing API endpoints..."
find . -name "*.md" -type f -exec sed -i '' 's/ooihrv63q8\.execute-api\.us-east-1\.amazonaws\.com/XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/g' {} \;

echo "✅ Documentation sanitized!"
echo ""
echo "🚨 CRITICAL: You still need to:"
echo "1. Rotate your Stripe keys in the Stripe Dashboard"
echo "2. Update Lambda environment variables with new keys"
echo "3. Update Vercel environment variables with new keys"
echo "4. Remove the .stripe.env file"
echo "5. Test your payment functionality"
echo ""
echo "See SECURITY-AUDIT-REPORT.md for detailed instructions."