#!/bin/bash

echo "🌐 Updating Vercel environment variable..."

# Set the new publishable key (replace with your actual key)
NEW_PUBLISHABLE_KEY="pk_test_XXXXXXXXXXXXXXXXXXXXXXX"

# Update Vercel environment variable
npx vercel env add VITE_STRIPE_PUBLISHABLE_KEY production --yes <<< "$NEW_PUBLISHABLE_KEY"

if [ $? -eq 0 ]; then
    echo "✅ Vercel environment variable updated successfully!"
else
    echo "❌ Failed to update Vercel environment variable"
    echo "Manual steps:"
    echo "1. Go to https://vercel.com/dashboard"
    echo "2. Select your project"
    echo "3. Go to Settings → Environment Variables"
    echo "4. Update VITE_STRIPE_PUBLISHABLE_KEY with: pk_test_XXXXXXXXXXXXXXXXXXXXXXX"
fi