# Circuit Builder - Build Instructions

**Created**: 2026-10-30
**Stage**: CONSTRUCTION - Build and Test
**Verified against**: working tree at HEAD `a328c74`, uncommitted

**Note on file naming**: `build-instructions.md` already exists in this directory from the original Memory Game project. This file is kept separate to preserve it.

This repository is **not an npm workspace**. Each package installs and builds on its own. The order below matters, because `services/game` and `apps/web` consume `packages/shared`.

## Prerequisites

| Item | Version used for verification |
|---|---|
| Node.js | v24.16.0 (CI uses Node 20; see "Known differences") |
| npm | 11.13.0 |
| Shell | PowerShell on Windows; bash for the `scripts/*.sh` files (Git Bash works) |
| AWS CLI | Only for the seed and verify scripts; **not needed to build** |

No environment variables are required to build or test. `apps/web/.env.local` is only needed to run the dev server against a backend.

## Build order

### 1. `packages/shared` (build first)

```bash
cd packages/shared
npm install          # npm ci in CI
npm run build        # rimraf dist && tsc
```
- **Output**: `dist/` (git-ignored). Contains the circuit engine, level model, and all 9 levels.
- **Why first**: the Game Lambda bundles `packages/shared/dist` in CI. If `dist` is stale, the Lambda ships without new levels.
- **Verified**: `npm run build` exits 0; loading `dist` in node reports 9 levels (`cb-01` to `cb-08` plus `sandbox`) covering difficulties 1 to 4, and exposes `evaluate` and `evaluateSuccess`.

### 2. `services/game`

```bash
cd services/game
npm install
npx tsc --noEmit     # type-check only
npm run build        # tsc
```
- **Verified**: `tsc --noEmit` exits 0.
- Production packaging is done by `scripts/deploy-game-lambda.sh` or by CI. Do not hand-build zips (see `.kiro/steering/deployment.md`).

### 3. `services/leaderboard`

```bash
cd services/leaderboard
npm install
npx tsc --noEmit
```
- **Verified**: `tsc --noEmit` exits 0 (it exited 1 with 30 errors before unit U1).

### 4. `apps/web`

```bash
cd apps/web
npm install
npx tsc --noEmit
npm run build        # tsc && vite build
```
- **Verified**: `tsc --noEmit` exits 0; `npm run build` exits 0 with **1548 modules transformed**.
- **Bundle growth**: 1504 modules before Circuit Builder; the main JS bundle grew by roughly 45 kB gzip (448.89 kB to 493.77 kB measured when the game was first routed).
- The `caniuse-lite is N months old` warning and the large-chunk warning are pre-existing and harmless.

## Known differences from CI

- CI builds with **Node 20**; verification here used Node 24. The engine also type-checks against the Lambda's ES2020 target (`tsconfig.lambda.json`), which is the closer proxy.
- CI runs `npm ci`, which requires committed lockfiles. `packages/shared/package-lock.json` changed (+24 lines, adding `fast-check`) and must be committed with the feature or CI will fail.

## 🚨 Frontend deployment block (standing)

`apps/web` imports the engine through a **relative source import** (`apps/web/src/utils/circuitEngine.ts`). That resolves on any machine holding the whole repo and will almost certainly **fail on Vercel**, which currently uploads only `apps/web/`. A local `npm run build` passing does **not** prove the Vercel build works.

**Do not deploy the frontend** until the decision in `aidlc-docs/construction/game-surface/SHARED-ENGINE-IMPORT-DECISION.md` is applied (Vercel Root Directory plus "Include source files outside of the Root Directory"), verified on the dev project, and the import is collapsed to a package import. The backend is unaffected.

## Troubleshooting

### `Cannot find module '@memory-game/shared'` in `services/game`
- **Cause**: `packages/shared/dist` is missing or stale.
- **Fix**: rebuild step 1, then reinstall `services/game` if its `node_modules/@memory-game/shared` is a copy rather than a link.

### `rm` is not recognized when building `packages/shared`
- **Cause**: the old `clean` script used `rm -rf`. Fixed earlier in this project by switching to `rimraf`. If it reappears, check `packages/shared/package.json`.

### `services/game` tests fail to compile in two suites
- **Cause**: 25 TypeScript errors that **predate** Circuit Builder. They are documented and unrelated.
- **Fix**: none required for this feature. Run suites individually (see the unit test instructions).

### Output looks truncated in the Kiro terminal
- **Cause**: long PowerShell commands sometimes render only their echo. Redirect output to a file and read it back.
