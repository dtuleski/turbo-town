# Deployment Rules

## AWS Account Configuration (CRITICAL)
There are TWO AWS accounts. ALWAYS use the correct one:

| Account | Profile | Account ID | Purpose |
|---------|---------|------------|---------|
| `default` | (no profile flag) | `848403890404` | OLD account — dev/migration only |
| `dashden-new` | `--profile dashden-new` | `342278407349` | PRODUCTION account |

- **ALWAYS use `--profile dashden-new`** for any prod AWS CLI commands
- **NEVER use the default profile** for prod operations (DynamoDB, Lambda, Cognito, etc.)
- Prod Lambda functions live in `dashden-new`: `MemoryGame-GameService-prod`, `MemoryGame-LeaderboardService-prod`, `DashDen-EmailSender`, `DashDen-DailyEmail-prod`
- Prod DynamoDB tables live in `dashden-new`: `memory-game-*-prod`, `memory-game-email-prefs-prod`
- Prod Cognito user pool: `us-east-1_FoWLQ5lmI` (in `dashden-new`)

## Game Service Lambda Deployment
- ALWAYS use `./scripts/deploy-game-lambda.sh` to deploy the game service Lambda
- NEVER manually create or patch zip files for Lambda deployment
- NEVER use incremental zip updates — the script rebuilds from scratch every time
- The script handles: building shared package, building game service, assembling clean zip, deploying, backup, and smoke test
- Lambda function name: `MemoryGame-GameService-dev` (or `MemoryGame-GameService-prod` for production)
- Lambda handler: `dist/index.handler`
- Region: `us-east-1`

## Leaderboard Lambda Deployment (prod)
- ALWAYS use `./scripts/deploy-leaderboard-lambda.sh` to deploy `MemoryGame-LeaderboardService-prod` (account `342278407349`, profile `dashden-new`, region `us-east-1`)
- NEVER hand-roll the esbuild bundle or zip for this function
- The script rebuilds from scratch every time: esbuild bundle (node20, cjs, `@aws-sdk/*` external), clean zip with only `dist/index.js`, backup of the deployed code, deploy, smoke test
- `./scripts/deploy-leaderboard-lambda.sh --build-only` builds and verifies the zip without any AWS write calls
- Lambda handler: `dist/index.handler`
- The root `deploy-leaderboard.sh` is an interactive dev CDK script on the default profile. Do not use it for prod.

## Frontend Deployment
- Dev frontend (dev.dashden.app): Vercel project `web`
  - Deploy: `npx vercel link --project web --yes && npx vercel --prod --yes` from `apps/web/`
- Prod frontend (dashden.app): Vercel project `web-prod`
  - Deploy: `npx vercel link --project web-prod --yes && npx vercel --prod --yes` from `apps/web/`
- After deploying to either project, re-link to `web` for local dev: `npx vercel link --project web --yes`
- Restore `.env.local` with dev values after any project switch

## Full Stack Deploy
When both backend and frontend changes are made:
1. Run `./scripts/deploy-game-lambda.sh` first
2. Then deploy frontend: `npx vercel --prod --yes` from `apps/web/`
