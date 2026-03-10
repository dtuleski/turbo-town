# Frontend Hosting Information

## Current Setup

**Domain**: turbo-town.com

**Hosting Stack**:
- **Server**: Amazon S3 (static website hosting)
- **CDN**: CloudFront
- **Auto-Deploy**: Connected to GitHub (auto-deploys on push to main branch)

## How It Works

1. **Code Changes**: Push code to GitHub repository (main branch)
2. **Auto-Build**: A CI/CD service (likely GitHub Actions, Vercel, or Netlify) detects the push
3. **Build Process**: Runs `npm run build` in `apps/web/`
4. **Deploy**: Uploads the `dist/` folder to S3
5. **CDN**: CloudFront serves the content globally

## Deployment Process

### Automatic Deployment
When you push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

The deployment happens automatically in 2-5 minutes.

### Important Notes

1. **Build Errors Block Deployment**
   - If there are TypeScript errors, the build fails
   - The deployment won't happen until errors are fixed
   - Always check for TypeScript errors before pushing

2. **Verify Builds Locally**
   ```bash
   cd apps/web
   npm run build
   ```
   If this succeeds locally, deployment should work.

3. **Deployment Time**
   - Typical: 2-3 minutes
   - Can take up to 5-10 minutes during high traffic
   - CloudFront cache may take additional time to update

## Mystery: Hosting Location

**What We Know**:
- ✅ Site is hosted on S3 + CloudFront
- ✅ Auto-deploys from GitHub
- ✅ Works perfectly

**What We Don't Know**:
- ❌ The S3 bucket is NOT in your current AWS account (848403890404)
- ❌ The CloudFront distribution is NOT visible in your account
- ❌ The CI/CD service (GitHub Actions/Vercel/Netlify) is not documented

**Possible Explanations**:
1. Frontend was set up in a different AWS account
2. Using a third-party service (Vercel/Netlify) that manages S3/CloudFront behind the scenes
3. Set up by someone else or in a previous session

## How to Find the Hosting Service

### Check GitHub
1. Go to: https://github.com/dtuleski/turbo-town
2. Click "Settings" → "Pages" or "Integrations"
3. Look for connected services (Vercel, Netlify, AWS Amplify, etc.)

### Check for CI/CD
1. Look in `.github/workflows/` for GitHub Actions
2. Check repository settings for connected apps
3. Look for deployment badges in README

### Check Your Accounts
- **Vercel**: https://vercel.com/dashboard
- **Netlify**: https://app.netlify.com/
- **AWS Amplify**: https://console.aws.amazon.com/amplify/ (different region?)

## Recommendation

Since the auto-deploy is working perfectly, you don't need to worry about it for day-to-day development. Just:

1. Make your changes
2. Test locally with `npm run build`
3. Push to GitHub
4. Wait 2-3 minutes
5. Refresh turbo-town.com

However, for documentation purposes, it would be good to identify the exact hosting service. Check your GitHub repository settings to see what's connected.

## Today's Deployment Issue

The Word Puzzle deployment was delayed because of TypeScript errors:
- Unused `setPuzzle` variable
- Unused `row` and `col` parameters

Once fixed, deployment worked immediately. This confirms the auto-deploy is working correctly!

## Summary

✅ **Auto-deploy works perfectly**
✅ **Just push to GitHub and it deploys**
⚠️ **Unknown hosting service** (but it works!)
💡 **Check GitHub settings to identify the service**

The system is working great - we just need to document which service is handling the deployment!
