# Quest Map Build Instructions

## Prerequisites
- Node.js with npm (per-package installs; there is no root workspace install). Windows, PowerShell 5.1 was used.
- No environment variables are needed to build or run unit tests.
- No AWS, CDK deploy or Vercel command is part of build and test.

## Build Steps
Run from the repository root (or the `quest-map` worktree).

### 1. Install dependencies
```powershell
cd apps/web
npm install        # NOT npm ci
git checkout -- package-lock.json   # revert lockfile churn if npm rewrote it
```
`packages/shared`, `services/game` and `infrastructure` use their existing `node_modules`; run `npm install` there only if missing.

### 2. Build shared first (other packages consume it)
```powershell
cd packages/shared
npx tsc --noEmit
npm run build      # rimraf dist, then tsc
```

### 3. Type-check the rest
```powershell
cd services/game;    npx tsc --noEmit
cd infrastructure;   npx tsc --noEmit
cd apps/web;         npx tsc --noEmit
```

### 4. Build the web app
```powershell
cd apps/web
npm run build
```

### 5. Verify
- All commands exit 0.
- Artifacts: `packages/shared/dist`, `apps/web/dist` (both git-ignored).
- Accepted warning: Vite reports a chunk larger than 500 kB (about 1.76 MB, 510 kB gzip). It is pre-existing and not a failure.

## Troubleshooting
- Dependency errors in `apps/web`: run `npm install`, then revert `package-lock.json` churn.
- Type errors in `services/game` about quest exports: rebuild `packages/shared` (`npm run build`) so `dist` is current.
