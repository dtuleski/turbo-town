# Disaster Recovery Guide

## What Happened (March 7, 2026)

The Lambda function broke due to:
1. Zod version mismatch between `packages/shared` (3.22.0) and `services/game` (3.22.4)
2. ESM/CJS compatibility issues when bundling with esbuild
3. Minification breaking Zod's runtime code
4. Attempted rollback to old backup that was missing recent features

## Prevention Strategies

### 1. Automated Backups Before Deployment

**Create a pre-deployment backup script:**

```bash
#!/bin/bash
# services/game/backup-before-deploy.sh

BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup current Lambda code
aws lambda get-function --function-name MemoryGame-GameService-dev \
  --query 'Code.Location' --output text | \
  xargs curl -o "$BACKUP_DIR/lambda-backup.zip"

# Save metadata
aws lambda get-function-configuration --function-name MemoryGame-GameService-dev \
  > "$BACKUP_DIR/lambda-config.json"

echo "✅ Backup saved to $BACKUP_DIR"
echo "Lambda size: $(ls -lh $BACKUP_DIR/lambda-backup.zip | awk '{print $5}')"
```

**Add to build-and-deploy.sh:**
```bash
# Before deploying, create backup
./backup-before-deploy.sh
```

### 2. Dependency Version Locking

**Keep dependencies in sync across packages:**

```json
// Root package.json - define versions once
{
  "devDependencies": {
    "zod": "3.22.4",
    "typescript": "5.3.3"
  }
}
```

**Use workspace references:**
```bash
# In packages/shared and services/game
npm install zod@$(node -p "require('../../package.json').devDependencies.zod")
```

### 3. Build Validation

**Add validation to build script:**

```bash
# services/game/build-and-deploy.sh

# After build, validate size
SIZE=$(stat -f%z dist/index.js)
if [ $SIZE -lt 300000 ]; then
  echo "❌ ERROR: Build too small ($SIZE bytes). Expected >300KB"
  exit 1
fi

# Check for critical functions
if ! grep -q "listAvailableGames" dist/index.js; then
  echo "❌ ERROR: Missing listAvailableGames function"
  exit 1
fi

if ! grep -q "getAdminAnalytics" dist/index.js; then
  echo "❌ ERROR: Missing getAdminAnalytics function"
  exit 1
fi

echo "✅ Build validation passed"
```

### 4. Smoke Tests After Deployment

**Create automated smoke tests:**

```bash
#!/bin/bash
# services/game/smoke-test.sh

echo "Running smoke tests..."

# Test listAvailableGames
RESULT=$(aws lambda invoke \
  --function-name MemoryGame-GameService-dev \
  --payload '{"body":"{\"query\":\"query { listAvailableGames { id } }\"}","httpMethod":"POST","requestContext":{"requestId":"test","authorizer":{"jwt":{"claims":{"sub":"test"}}}}}' \
  --cli-binary-format raw-in-base64-out \
  /dev/stdout 2>/dev/null | jq -r '.body' | jq -r '.data.listAvailableGames')

if [ "$RESULT" == "null" ] || [ -z "$RESULT" ]; then
  echo "❌ Smoke test FAILED: listAvailableGames not working"
  exit 1
fi

echo "✅ Smoke tests passed"
```

### 5. Git Commit Hooks

**Create pre-push hook to ensure code is committed:**

```bash
#!/bin/bash
# .git/hooks/pre-push

if [ -n "$(git status --porcelain services/game/src)" ]; then
  echo "❌ ERROR: Uncommitted changes in services/game/src"
  echo "Commit your changes before pushing"
  exit 1
fi

echo "✅ All Lambda code is committed"
```

### 6. CloudWatch Alarms

**Set up alarms for Lambda errors:**

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "MemoryGame-Lambda-Errors" \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=MemoryGame-GameService-dev \
  --alarm-actions arn:aws:sns:us-east-1:848403890404:lambda-alerts
```

## Recovery Procedures

### Quick Rollback

If deployment breaks:

```bash
# 1. Find latest backup
ls -lt backups/ | head -5

# 2. Restore from backup
BACKUP_DIR="backups/20260307-183000"  # Use actual backup dir
aws lambda update-function-code \
  --function-name MemoryGame-GameService-dev \
  --zip-file "fileb://$BACKUP_DIR/lambda-backup.zip"

# 3. Verify
./smoke-test.sh
```

### Restore from GitHub

If backups are lost:

```bash
# 1. Clone fresh copy
git clone https://github.com/dtuleski/turbo-town.git /tmp/turbo-town-restore
cd /tmp/turbo-town-restore

# 2. Install dependencies
cd packages/shared && npm install && cd ../..
cd services/game && npm install && cd ../..

# 3. Build and deploy
cd services/game
./build-and-deploy.sh
```

## Current Working Configuration

**Critical settings that must not change:**

1. **Zod version:** 3.22.4 (both packages/shared and services/game)
2. **esbuild config:** NO minification, bundle with `--packages=bundle`
3. **Shared package:** Point to source files (`src/index.ts`) not dist
4. **Admin auth:** Check username/email, not userId

**Build command:**
```bash
npx esbuild src/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/index.js \
  --format=cjs \
  --external:@aws-sdk/* \
  --external:aws-sdk \
  --packages=bundle
```

## Monitoring Checklist

After any deployment:

- [ ] Check Lambda size (should be ~56KB compressed, ~320KB uncompressed)
- [ ] Test listAvailableGames query
- [ ] Test admin dashboard (with proper JWT)
- [ ] Check CloudWatch logs for errors
- [ ] Verify frontend loads at https://turbo-town.com
- [ ] Test game functionality (start/complete game)

## Emergency Contacts

- **AWS Account:** 848403890404
- **Region:** us-east-1
- **Lambda:** MemoryGame-GameService-dev
- **GitHub:** https://github.com/dtuleski/turbo-town

## Lessons Learned

1. **Always backup before deploying** - Automated backups prevent panic
2. **Version lock dependencies** - Mismatched versions cause subtle bugs
3. **Validate builds** - Check size and critical functions
4. **Test after deploy** - Smoke tests catch issues immediately
5. **Commit frequently** - GitHub is your safety net
6. **Don't minify complex libraries** - Zod breaks with minification
7. **Keep CloudWatch logs** - Essential for debugging production issues
