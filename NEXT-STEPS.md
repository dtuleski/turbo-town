# Next Steps - Backend Deployment

**Date**: March 3, 2026  
**Status**: Infrastructure Complete ✅ | Services Need Fixes ⚠️

## 🎉 What's Working

### Infrastructure Deployed Successfully
All AWS infrastructure is live and ready:

- ✅ **8 DynamoDB Tables** created
- ✅ **Cognito User Pool** configured
  - User Pool ID: `us-east-1_jPkMWmBup`
  - Client ID: `XXXXXXXXXXXXXXXXXXXXXXX`
  - Domain: `memory-game-dev`
- ✅ **EventBridge Event Bus** deployed
- ✅ **Frontend environment** configured (`apps/web/.env.local`)

### Auth Service Built Successfully
- ✅ All TypeScript errors fixed
- ✅ Dependencies installed
- ✅ Build completed successfully
- ✅ Ready for Lambda deployment

## ⚠️ What Needs Fixing

### Game Service Has 54 TypeScript Errors

The game service needs the same types of fixes we applied to the auth service:

#### 1. Enum Casing Issues (Most Common)
**Problem**: Using UPPERCASE enum values instead of PascalCase

**Examples**:
```typescript
// Wrong:
GameStatus.IN_PROGRESS
GameStatus.COMPLETED
SubscriptionTier.FREE
SubscriptionTier.LIGHT
AchievementType.FIRST_WIN
AchievementType.SPEED_DEMON

// Correct:
GameStatus.InProgress
GameStatus.Completed
SubscriptionTier.Free
SubscriptionTier.Light
AchievementType.FirstWin
AchievementType.SpeedDemon
```

**Files affected**:
- `src/services/game.service.ts` (9 errors)
- `src/services/achievement-tracker.service.ts` (28 errors)
- `src/services/rate-limiter.service.ts` (4 errors)
- `src/repositories/subscription.repository.ts` (1 error)

#### 2. Date vs String Type Mismatches
**Problem**: Using `new Date().toISOString()` (string) where `Date` type is expected

**Examples**:
```typescript
// Wrong:
startedAt: new Date().toISOString(),  // Returns string
completedAt: new Date().toISOString(), // Returns string

// Correct:
startedAt: new Date(),  // Returns Date object
completedAt: new Date(), // Returns Date object
```

**Files affected**:
- `src/repositories/achievement.repository.ts` (2 errors)
- `src/repositories/game.repository.ts` (2 errors)
- `src/services/game.service.ts` (2 errors)
- `src/services/achievement-tracker.service.ts` (1 error)

#### 3. Missing Error Classes
**Problem**: Importing error classes that don't exist in shared package

**Missing classes**:
- `ForbiddenError` (use `AuthorizationError` instead)
- `InternalError` (use `AppError` with code 'INTERNAL_ERROR')
- `ConflictError` (use `AppError` with code 'CONFLICT')

**Files affected**:
- `src/utils/error-mapper.ts` (3 errors)
- `src/services/game.service.ts` (1 error)

#### 4. Missing Dependencies
**Problem**: Missing npm packages

**Missing**:
- `uuid` - For generating unique IDs
- `@aws-sdk/client-cloudwatch` - For metrics

**Fix**:
```bash
cd services/game
npm install uuid @types/uuid @aws-sdk/client-cloudwatch
```

#### 5. Achievement Entity Structure Issues
**Problem**: Code expects `type` and `unlocked` properties that don't exist on Achievement entity

**Files affected**:
- `src/handlers/game.handler.ts` (2 errors)
- `src/services/achievement-tracker.service.ts` (multiple errors)

**Need to check**: Achievement entity definition in shared package

## 🚀 Recommended Approach

### Option 1: Quick Fix (Recommended)
Fix the most common issues first to get a working build:

1. **Fix enum casing** (bulk find/replace)
2. **Fix date types** (remove `.toISOString()`)
3. **Add missing dependencies**
4. **Fix error imports** (same as auth service)
5. **Fix Achievement entity issues** (may need to update entity definition)

**Estimated time**: 30-45 minutes

### Option 2: Test Infrastructure First
You can test the deployed infrastructure without fixing game service:

1. **Start frontend**:
   ```bash
   cd apps/web
   npm run dev
   ```

2. **Test Cognito authentication**:
   - Go to http://localhost:3000
   - Try signing up with a real email
   - Verify email with code
   - Log in

This proves your AWS infrastructure is working!

**Estimated time**: 5 minutes

### Option 3: Deploy Auth Service Only
Deploy just the auth service Lambda functions:

1. **Uncomment only auth-related stacks** in `infrastructure/bin/memory-game.ts`
2. **Deploy**:
   ```bash
   cd infrastructure
   npx cdk deploy --all --require-approval never
   ```

This gives you working authentication APIs while you fix the game service.

**Estimated time**: 15 minutes

## 📋 Detailed Fix Checklist

### Step 1: Add Missing Dependencies
```bash
cd services/game
npm install uuid @types/uuid @aws-sdk/client-cloudwatch
```

### Step 2: Fix Enum Casing (Bulk Replace)

In all game service files, replace:
- `GameStatus.IN_PROGRESS` → `GameStatus.InProgress`
- `GameStatus.COMPLETED` → `GameStatus.Completed`
- `SubscriptionTier.FREE` → `SubscriptionTier.Free`
- `SubscriptionTier.LIGHT` → `SubscriptionTier.Light`
- `SubscriptionTier.STANDARD` → `SubscriptionTier.Standard`
- `SubscriptionTier.PREMIUM` → `SubscriptionTier.Premium`
- `AchievementType.FIRST_WIN` → `AchievementType.FirstWin`
- `AchievementType.SPEED_DEMON` → `AchievementType.SpeedDemon`
- `AchievementType.PERFECT_GAME` → `AchievementType.PerfectGame`
- `AchievementType.DIFFICULTY_MASTER` → `AchievementType.DifficultyMaster`
- `AchievementType.THEME_EXPLORER` → `AchievementType.ThemeExplorer`
- `AchievementType.STREAK_7` → `AchievementType.Streak7`
- `AchievementType.GAMES_10` → `AchievementType.Games10`
- `AchievementType.GAMES_50` → `AchievementType.Games50`
- `AchievementType.GAMES_100` → `AchievementType.Games100`

### Step 3: Fix Date Types

Remove `.toISOString()` from all date assignments:
- `startedAt: new Date().toISOString()` → `startedAt: new Date()`
- `completedAt: new Date().toISOString()` → `completedAt: new Date()`
- `createdAt: now` → `createdAt: new Date(now)` (if now is string)
- `updatedAt: now` → `updatedAt: new Date(now)` (if now is string)

### Step 4: Fix Error Imports

In `src/utils/error-mapper.ts`:
```typescript
// Remove these imports:
import { ForbiddenError, InternalError, ConflictError } from '@memory-game/shared';

// Use these instead:
import { AppError, AuthorizationError } from '@memory-game/shared';

// Replace usage:
// ForbiddenError → AuthorizationError
// InternalError → new AppError('INTERNAL_ERROR', message, 500)
// ConflictError → new AppError('CONFLICT', message, 409)
```

In `src/services/game.service.ts`:
```typescript
// Replace:
import { ForbiddenError } from '@memory-game/shared';

// With:
import { AuthorizationError } from '@memory-game/shared';

// Replace usage:
throw new ForbiddenError(...) → throw new AuthorizationError(...)
```

### Step 5: Fix Achievement Entity Issues

Check the Achievement entity definition in `packages/shared/src/types/entities.ts` and ensure it has:
- `type` property (or use correct property name)
- `unlocked` property (or use correct property name)

Or update the code to use the correct property names.

### Step 6: Verify Build
```bash
cd services/game
npx tsc --noEmit
npm run build
```

## 🎯 After Game Service is Fixed

### 1. Uncomment Lambda Stacks

Edit `infrastructure/bin/memory-game.ts` and uncomment:
```typescript
// Uncomment these lines:
const lambdaStack = new LambdaStack(app, `MemoryGame-Lambda-${environment}`, {
  env: awsEnv,
  environment,
  databaseStack,
  cognitoStack,
  eventBridgeStack,
});

const apiStack = new APIStack(app, `MemoryGame-API-${environment}`, {
  env: awsEnv,
  environment,
  lambdaStack,
  cognitoStack,
});

const monitoringStack = new MonitoringStack(app, `MemoryGame-Monitoring-${environment}`, {
  env: awsEnv,
  environment,
  lambdaStack,
  apiStack,
});
```

### 2. Deploy Lambda and API
```bash
cd infrastructure
npx cdk deploy --all --require-approval never
```

### 3. Get API URL
```bash
aws cloudformation describe-stacks \
  --stack-name MemoryGame-API-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

### 4. Update Frontend Environment
Add to `apps/web/.env.local`:
```
VITE_API_ENDPOINT=<your-api-url>
```

### 5. Test Full Integration
```bash
cd apps/web
npm run dev
```

Visit http://localhost:3000 and test:
- Sign up / Log in
- Play a game
- Check leaderboard
- Verify data in DynamoDB

## 📊 Progress Summary

### Completed (70%)
- ✅ AWS CLI installed
- ✅ AWS credentials configured
- ✅ Infrastructure deployed (Database, Cognito, EventBridge)
- ✅ Auth service built successfully
- ✅ Frontend environment configured
- ✅ Deployment scripts created
- ✅ Documentation created

### In Progress (20%)
- ⚠️ Game service TypeScript errors (54 errors)
- ⚠️ Need to add missing dependencies
- ⚠️ Need to fix enum casing
- ⚠️ Need to fix date types
- ⚠️ Need to fix error imports

### Remaining (10%)
- ❌ Deploy Lambda functions
- ❌ Deploy API Gateway
- ❌ Configure frontend with API URL
- ❌ Test full integration

## 🕐 Time Estimates

- **Fix game service errors**: 30-45 minutes
- **Deploy Lambda/API**: 10-15 minutes
- **Configure & test**: 10 minutes

**Total remaining**: 50-70 minutes

## 💡 Tips

1. **Use find/replace** for enum casing fixes (fastest approach)
2. **Test infrastructure first** to verify AWS setup works
3. **Fix one file at a time** and check progress with `npx tsc --noEmit`
4. **Reference auth service** for examples of correct patterns
5. **Check shared package** for available error classes and entity definitions

## 📞 Quick Commands

### Check game service errors:
```bash
cd services/game
npx tsc --noEmit
```

### Add missing dependencies:
```bash
cd services/game
npm install uuid @types/uuid @aws-sdk/client-cloudwatch
```

### Build game service:
```bash
cd services/game
npm run build
```

### Deploy Lambda/API (after fixes):
```bash
cd infrastructure
npx cdk deploy --all --require-approval never
```

### Test frontend:
```bash
cd apps/web
npm run dev
```

---

**You're 70% done! Infrastructure is deployed and working. Just need to fix the game service TypeScript errors and deploy the Lambda functions. 🚀**
