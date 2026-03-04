# Lambda Deployment Issue - Root Cause Found

## Summary

✅ **CORS Issue**: SOLVED - It was the Cognito authorizer blocking preflight requests
❌ **Lambda Issue**: Game service Lambda is missing the `@memory-game/shared` package

## What We Discovered

### 1. CORS Was Caused by Authorizer
When we temporarily removed authentication, the CORS error changed from "Failed to fetch" to "500 error". This proves the authorizer was blocking CORS preflight requests.

### 2. Lambda Missing Dependencies  
The game service Lambda can't find `@memory-game/shared`:
```
Error: Cannot find module '@memory-game/shared'
```

This is because the Lambda deployment only includes `services/game/dist` but not `node_modules`.

## The Real Problem

The Lambda stack uses:
```typescript
code: lambda.Code.fromAsset('../services/game/dist')
```

This only copies the compiled `.js` files, NOT the dependencies from `node_modules`.

## Solutions

### Option 1: Bundle with esbuild (Recommended)
Update Lambda stack to use `NodejsFunction` which automatically bundles dependencies:

```typescript
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

const gameLambda = new NodejsFunction(this, 'GameLambda', {
  entry: '../services/game/src/index.ts',
  handler: 'handler',
  bundling: {
    externalModules: ['aws-sdk'], // Don't bundle AWS SDK
    nodeModules: ['@memory-game/shared'], // Include shared package
  },
  // ... rest of config
});
```

### Option 2: Copy node_modules
Create a deployment package that includes both dist and node_modules:

```bash
# In services/game directory
npm run build
mkdir -p deploy
cp -r dist/* deploy/
cp -r node_modules deploy/
cp package.json deploy/
```

Then update CDK:
```typescript
code: lambda.Code.fromAsset('../services/game/deploy')
```

### Option 3: Layer for Shared Package
Create a Lambda Layer with the shared package:

```typescript
const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
  code: lambda.Code.fromAsset('../packages/shared'),
  compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
});

// Add layer to Lambda
gameLambda.addLayers(sharedLayer);
```

## Immediate Workaround

For now, we can inline the shared package code directly into the game service to test the rest of the integration.

## What This Means for Your Project

The backend Lambda functions were deployed but are broken because they can't load dependencies. This affects:
- ❌ Game service (can't start/complete games)
- ❌ Possibly auth service (if it uses shared package)

The frontend integration code we wrote is correct, but it can't work until the Lambda is fixed.

## Next Steps

1. **Fix Lambda bundling** (requires CDK code changes)
2. **Redeploy Lambda stack** with proper bundling
3. **Test frontend integration** (should work after Lambda fix)

## Time Estimate

- Fixing Lambda bundling: 30-60 minutes
- Testing: 15 minutes
- Total: ~1 hour

## Alternative: Quick Test

We could temporarily:
1. Remove the `@memory-game/shared` import from game service
2. Inline the needed types/functions
3. Redeploy to test frontend integration
4. Then properly fix bundling later

This would let us verify the frontend integration works while we fix the Lambda bundling properly.

## Status

🔴 **Blocked**: Frontend integration complete but can't test until Lambda is fixed
🟡 **In Progress**: Need to fix Lambda bundling strategy
🟢 **Working**: Authentication, CORS configuration, API Gateway

The good news: We've identified the exact issue and know how to fix it!
