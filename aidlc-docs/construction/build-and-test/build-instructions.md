# Build Instructions

## Overview
This document provides step-by-step instructions for building all components of the Memory Game application.

## Prerequisites

### Required Tools
- **Node.js**: 20.x or later
- **npm**: 10.x or later (comes with Node.js)
- **AWS CLI**: 2.x (for infrastructure deployment)
- **AWS CDK CLI**: 2.100.0 or later (`npm install -g aws-cdk`)
- **TypeScript**: 5.x (installed per project)

### System Requirements
- **OS**: macOS, Linux, or Windows with WSL2
- **Memory**: 8 GB RAM minimum (16 GB recommended)
- **Disk Space**: 5 GB free space
- **Network**: Internet connection for dependency downloads

### AWS Requirements (for infrastructure deployment)
- AWS account with appropriate permissions
- AWS CLI configured with credentials
- CDK bootstrapped in target region

---

## Build Steps

### 1. Install Root Dependencies

```bash
# From workspace root
npm install
```

This installs dependencies for the monorepo workspace.

### 2. Build Shared Components Library

```bash
cd packages/shared
npm install
npm run build
```

**Expected Output**:
- Compiled JavaScript in `dist/` directory
- Type definitions in `dist/types/`
- No compilation errors

**Build Artifacts**:
- `dist/index.js` - Main entry point
- `dist/types/` - TypeScript type definitions
- `dist/schemas/` - Zod validation schemas
- `dist/utils/` - Utility functions
- `dist/constants/` - Application constants

### 3. Build Auth Service

```bash
cd services/auth
npm install
npm run build
```

**Expected Output**:
- Compiled Lambda handler in `dist/` directory
- All dependencies bundled
- No TypeScript errors

**Build Artifacts**:
- `dist/index.js` - Lambda handler entry point
- `dist/handlers/` - GraphQL resolvers
- `dist/services/` - Business logic
- `dist/repositories/` - Data access layer
- `dist/utils/` - Service utilities
- `dist/node_modules/` - Production dependencies

### 4. Build Game Service

```bash
cd services/game
npm install
npm run build
```

**Expected Output**:
- Compiled Lambda handler in `dist/` directory
- All dependencies bundled
- No TypeScript errors

**Build Artifacts**:
- `dist/index.js` - Lambda handler entry point
- `dist/handlers/` - GraphQL resolvers
- `dist/services/` - Business logic (game, score, achievements)
- `dist/repositories/` - Data access layer
- `dist/utils/` - Service utilities
- `dist/node_modules/` - Production dependencies

### 5. Build Infrastructure (CDK)

```bash
cd infrastructure
npm install
npm run build
```

**Expected Output**:
- Compiled CDK stacks in `lib/` directory
- CloudFormation templates synthesized
- No TypeScript errors

**Build Artifacts**:
- `lib/stacks/*.js` - Compiled CDK stacks
- `lib/constructs/*.js` - Reusable constructs
- `cdk.out/` - Synthesized CloudFormation templates (after synth)

### 6. Build All Units (Automated)

From workspace root, you can build all units at once:

```bash
# Build all services
npm run build:all

# Or use the infrastructure build script
cd infrastructure
npm run build:lambdas
```

This script:
1. Builds Shared Components
2. Builds Auth Service
3. Builds Game Service
4. Installs production dependencies in each `dist/` folder

---

## Verify Build Success

### Check Build Artifacts

```bash
# Verify Shared Components
ls -la packages/shared/dist/

# Verify Auth Service
ls -la services/auth/dist/

# Verify Game Service
ls -la services/game/dist/

# Verify Infrastructure
ls -la infrastructure/lib/stacks/
```

### Run Type Checking

```bash
# Check Shared Components
cd packages/shared
npm run typecheck

# Check Auth Service
cd services/auth
npm run typecheck

# Check Game Service
cd services/game
npm run typecheck

# Check Infrastructure
cd infrastructure
npm run build
```

### Run Linting

```bash
# Lint Shared Components
cd packages/shared
npm run lint

# Lint Auth Service
cd services/auth
npm run lint

# Lint Game Service
cd services/game
npm run lint
```

---

## Common Warnings (Acceptable)

The following warnings are expected and can be ignored:

1. **Peer dependency warnings**: Some packages may have peer dependency warnings - these are safe to ignore if the build succeeds
2. **Deprecated package warnings**: Some transitive dependencies may be deprecated - safe to ignore unless security vulnerabilities are reported
3. **Optional dependency warnings**: Some packages have optional dependencies that may fail to install on certain platforms - safe to ignore

---

## Troubleshooting

### Build Fails with "Module not found" Error

**Cause**: Dependencies not installed or incorrect Node.js version

**Solution**:
```bash
# Check Node.js version
node --version  # Should be 20.x

# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Build Fails with TypeScript Compilation Errors

**Cause**: Type errors in code or outdated type definitions

**Solution**:
```bash
# Check for type errors
npm run typecheck

# Update type definitions
npm update @types/node

# Fix reported type errors in code
```

### Build Fails with "Out of Memory" Error

**Cause**: Insufficient memory for TypeScript compilation

**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Rebuild
npm run build
```

### Shared Components Not Found in Services

**Cause**: Shared components not built or not linked properly

**Solution**:
```bash
# Build shared components first
cd packages/shared
npm run build

# Verify it's accessible
cd ../../services/auth
npm install
npm run build
```

### Infrastructure Build Fails

**Cause**: CDK dependencies not installed or AWS credentials not configured

**Solution**:
```bash
# Install CDK dependencies
cd infrastructure
npm install

# Verify AWS credentials
aws sts get-caller-identity

# Rebuild
npm run build
```

---

## Build Time Estimates

- **Shared Components**: ~30 seconds
- **Auth Service**: ~45 seconds
- **Game Service**: ~60 seconds
- **Infrastructure**: ~30 seconds
- **Total (all units)**: ~3-4 minutes

---

## Next Steps

After successful build:
1. Run unit tests (see `unit-test-instructions.md`)
2. Run integration tests (see `integration-test-instructions.md`)
3. Deploy infrastructure (see `infrastructure/README.md`)
4. Deploy services to AWS Lambda

---

## Build Automation

For CI/CD pipelines, use this single command:

```bash
# From workspace root
npm run build:all && npm run test:all
```

This builds all units and runs all tests in sequence.
