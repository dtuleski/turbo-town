# Lambda Recovery Needed - URGENT

## Current Status: APP DOWN ⚠️

The Lambda function is broken due to corrupted source files during Stripe integration attempts.

## What Happened

1. Attempted to add Stripe integration to Lambda
2. Hit TypeScript build errors
3. Deployed incomplete/broken code (20KB package)
4. Rolled back to March 4 backup (54KB)
5. March 4 backup is missing recent features (game catalog, admin dashboard)
6. Source files in `services/game/src/` appear corrupted (no exports)

## Current Lambda State

- **Deployed**: March 4, 2026 backup (lambda.zip - 54KB)
- **Missing Features**:
  - `listAvailableGames` query (game hub)
  - Admin dashboard queries
  - Game catalog functionality
  - Recent bug fixes

## Frontend Errors

```
Error: Unknown operation: ListAvailableGames
```

The frontend expects features that don't exist in the old Lambda.

## Recovery Options

### Option 1: Restore Source Files (Recommended)
The source files need to be restored from a backup or rewritten:

**Files that need fixing**:
- `services/game/src/handlers/game.handler.ts` - No exports
- `services/game/src/utils/logger.ts` - No exports  
- `services/game/src/utils/error-mapper.ts` - No exports
- Possibly others

**What was working before**:
- Game hub with multiple games
- Admin dashboard with analytics
- Rate limiting
- All game functionality

### Option 2: Redeploy from GitHub
If the code was pushed to GitHub before corruption:
```bash
git checkout services/game/src/
npm run build
# Deploy
```

### Option 3: Start Fresh
Rebuild the Lambda service from scratch using the working features as reference.

## What We Know Works

### Database (DynamoDB)
- ✅ All tables exist and have data
- ✅ Game catalog seeded
- ✅ Themes seeded
- ✅ User subscriptions configured

### Frontend
- ✅ Code is fine and deployed
- ✅ Expects these queries:
  - `listAvailableGames`
  - `getAdminAnalytics`
  - `listAllUsers`
  - `startGame`, `completeGame`
  - `canStartGame`

### Stripe
- ✅ Account configured
- ✅ Products created ($1.99 Basic, $5.99 Premium)
- ✅ Environment variables set in Lambda
- ⏳ Code written but not deployed

## Immediate Action Needed

1. **Restore source files** from backup or GitHub
2. **Rebuild Lambda** with all features
3. **Test** that game hub loads
4. **Verify** admin dashboard works
5. **Then** add Stripe integration properly

## Files to Check/Restore

Priority files that were working:
```
services/game/src/
├── index.ts (Lambda handler)
├── handlers/
│   └── game.handler.ts (GraphQL routing)
├── services/
│   ├── game.service.ts
│   ├── admin.service.ts
│   └── (others)
├── repositories/
│   ├── game-catalog.repository.ts
│   └── (others)
└── utils/
    ├── logger.ts
    └── error-mapper.ts
```

## Last Known Good State

**Date**: March 7, 2026 ~14:00 (before Stripe integration)
**Features Working**:
- Game hub
- Admin dashboard  
- All games (Memory, Math Challenge, F1)
- Rate limiting
- Analytics

## Contact Info

If you have a backup of the working Lambda code from earlier today, that would be the fastest recovery path.

## Next Steps

1. Check if code exists in GitHub: `git status`, `git log`
2. If yes: `git checkout` the working version
3. If no: Manually restore the source files
4. Rebuild and deploy
5. Test thoroughly before attempting Stripe again

---

**Created**: March 7, 2026 23:05 UTC
**Priority**: CRITICAL - App is down
