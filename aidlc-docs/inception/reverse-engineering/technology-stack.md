# Technology Stack

## Verified against

- `package.json` (`devDependencies`)
- `apps/web/package.json`, `apps/web/tsconfig.json`, and `apps/web/vite.config.ts`
- `apps/mobile/pubspec.yaml` and `apps/mobile/analysis_options.yaml`
- `packages/shared/package.json` and `packages/shared/tsconfig.json`
- `services/game/package.json`, `services/auth/package.json`, and `services/leaderboard/package.json`
- `services/email-sender/package.json` and `services/email-sender/index.js`
- `infrastructure/package.json`, `infrastructure/cdk.json`, and `infrastructure/bin/memory-game.ts`
- `.github/workflows/deploy-lambdas.yml` and `apps/web/vercel.json`

**Repository snapshot:** branch `main`, commit `a328c74d99acdb561961ea36fcaa11426840a530`. Versions below are the ranges declared in manifests unless a runtime is explicitly fixed in infrastructure or CI.

## Project Model

DashDen is a repository of independently managed npm and Flutter projects. The root `package.json` has no `workspaces` field and no scripts. Each npm project owns its own manifest and build commands. `services/game/package.json` and `services/auth/package.json` refer to `@memory-game/shared` through `file:../../packages/shared`; the web and Leaderboard projects do not consume that package.

| Area | Project type | Primary role |
|---|---|---|
| `apps/web` | Browser application | Authenticated DashDen game hub, games, dashboards, subscriptions, and admin screens |
| `apps/mobile` | Flutter application | iOS/Android Memory Match MVP with its own API and authentication models |
| `services/game` | AWS Lambda service | Game sessions, catalog, scoring, subscriptions, language data, reviews, email preferences, contact, and events |
| `services/leaderboard` | AWS Lambda service | Game-completion event handling, score history, aggregates, and leaderboard queries |
| `services/auth` | AWS Lambda service | Older authentication/profile GraphQL-shaped API; the web client primarily uses Cognito through Amplify directly |
| `services/email-sender` | AWS Lambda handler | Cognito custom-email sender using the AWS Encryption SDK and Resend |
| `packages/shared` | TypeScript library | Backend entities, enums, schemas, errors/results, constants, and calculations |
| `infrastructure` | AWS CDK application | DynamoDB, Cognito, Lambda, API Gateway, EventBridge/SQS, and monitoring resources |
| Root `scripts` | Operational utilities | Data seeding, maintenance, packaging, deployment, and smoke-test tasks |

## Languages and Runtime Targets

| Language or format | Declared version/target | Usage and evidence |
|---|---|---|
| TypeScript | Web `^5.3.0`; Game/Auth `^5.3.3`; Shared `^5.3.0`; Leaderboard/Infrastructure `^5.0.0` | Primary language for the browser, backend services, shared library, and CDK. Versions come from each `package.json`. |
| JavaScript | ECMAScript modules in `apps/web`; CommonJS in `services/email-sender` and compiled backend output | `apps/web/package.json` sets `type: module`; service tsconfigs emit CommonJS. `services/email-sender/index.js` is hand-written CommonJS. |
| Browser JavaScript target | ES2020 | `apps/web/tsconfig.json` targets ES2020 with DOM libraries and React JSX. |
| Lambda JavaScript target | ES2020 for Game/Leaderboard; ES2022 for Auth source | `services/game/tsconfig.json`, `services/leaderboard/tsconfig.json`, and `services/auth/tsconfig.json`. Active CDK `NodejsFunction` resources use Node.js 20 in `LambdaStack` and `LeaderboardLambdaStack`. |
| Node.js | 20 for CDK-defined Lambdas and deployment jobs; Shared declares `>=18.0.0` | `lambda.Runtime.NODEJS_20_X` is set in `infrastructure/lib/stacks/lambda-stack.ts` and `infrastructure/lib/stacks/leaderboard-lambda-stack.ts`; GitHub Actions uses `node-version: '20'`. |
| Dart | `>=3.3.0 <4.0.0` | Mobile application, declared in `apps/mobile/pubspec.yaml`. |
| Flutter | `>=3.19.0` | Mobile UI/runtime, declared in `apps/mobile/pubspec.yaml`. |
| GraphQL SDL | No language version declared | Documentation schemas are in `services/game/schema.graphql` and `services/leaderboard/schema.graphql`. Runtime handlers route GraphQL-shaped HTTP requests manually rather than constructing a schema executor. |
| HTML, CSS, JSON, YAML, shell | Tool-defined | Web shell/assets, localization/configuration, GitHub Actions/CDK configuration, and operational scripts. |

All TypeScript projects enable `strict`. `packages/shared/tsconfig.json` adds `noUncheckedIndexedAccess`, `noImplicitReturns`, unused checks, and the other individual strict flags. The browser uses bundler module resolution; backend services emit CommonJS declarations and source maps.

## Frontend Frameworks and Libraries

| Technology | Declared version | Purpose and verified location |
|---|---:|---|
| React / React DOM | `^18.2.0` | Browser component model and root rendering in `apps/web/src/main.tsx`. |
| React Router DOM | `^6.22.0` | SPA routing in `apps/web/src/App.tsx`; Vercel rewrites all routes to `index.html`. |
| Vite | `^5.1.0` | Development server and production bundler; `apps/web/vite.config.ts` configures React, the `@` alias, port 3000, `dist`, and production source maps. |
| `@vitejs/plugin-react` | `^4.2.0` | React transform plugin used by `apps/web/vite.config.ts`. |
| Tailwind CSS | `^3.4.0` | Utility styling configured in `apps/web/tailwind.config.js`. |
| PostCSS / Autoprefixer | `^8.4.0` / `^10.4.0` | Tailwind processing and browser prefixing in `apps/web/postcss.config.js`. |
| Framer Motion | `^11.0.0` | Card, modal, confetti, and language-game animations, including `Confetti` and `PronunciationGamePage`. |
| Apollo Client / GraphQL | `^3.9.0` / `^16.8.0` | GraphQL document parsing, HTTP links, caching, and mutations in `apps/web/src/api`. |
| AWS Amplify / Amplify Auth | `^6.16.2` / `^6.19.1` | Cognito configuration and browser authentication. Source imports use `aws-amplify` and `aws-amplify/auth`; no direct `@aws-amplify/auth` import was found. |
| TanStack React Query | `^5.24.0` | `QueryClientProvider` and cache defaults in `apps/web/src/main.tsx` and `apps/web/src/api/queryClient.ts`; no TanStack query hook consumer was found. |
| React Hook Form / Hookform resolvers / Zod | `^7.50.0` / `^3.3.0` / `^3.22.0` | Login, registration, and reset-password form state and schema validation. |
| i18next / React i18next / browser detector | `^26.0.4` / `^17.0.2` / `^8.2.1` | English, Spanish, and Portuguese localization initialized by `apps/web/src/i18n.ts`. |
| dnd-kit core/sortable/utilities | `^6.3.1` / `^10.0.0` / `^3.2.2` | Intended drag-and-drop support. Only `@dnd-kit/core` appears in `apps/web/src/pages/scratch-coding/BlockRenderer.tsx`, which has no active importer; sortable and utilities have no first-party source import. |
| Stripe.js | `^8.9.0` | Declared by the web app, but no first-party import was found. Subscription UI currently redirects to URLs returned by Game Service. |
| Vercel Analytics / Speed Insights | `^2.0.1` / `^2.0.0` | Browser telemetry components mounted in `apps/web/src/main.tsx`. |
| clsx | `^2.1.0` | Conditional class construction in leaderboard components. |

## Mobile Frameworks and Libraries

| Technology | Declared version | Purpose and verified location |
|---|---:|---|
| Flutter Riverpod | `^2.5.1` | State management in authentication, game, routing, and screen modules. |
| `graphql_flutter` | `^5.1.2` | Game GraphQL client and Hive-backed cache initialization in `apps/mobile/lib/main.dart`. |
| `amazon_cognito_identity_dart_2` | `^3.6.3` | Native Dart Cognito sign-in and session handling in `auth/cognito_service.dart`. |
| `flutter_secure_storage` | `^9.2.2` | Keychain/Keystore token storage in `auth/token_storage.dart`. |
| `go_router` | `^14.2.0` | Mobile route definitions and navigation. |
| `flutter_web_auth_2` | `^3.1.2` | Hosted OAuth flow. |
| `crypto` / `http` | `^3.0.3` / `^1.2.0` | PKCE hashing and OAuth token HTTP exchange. |
| `cupertino_icons` | `^1.0.8` | Declared icon package; no first-party source reference was found. |

## Backend Frameworks and Service Libraries

The services use direct Lambda handlers rather than Express, Fastify, NestJS, or an AppSync runtime. `GameHandler.extractOperationName`, Auth `parseOperation`, and Leaderboard `handleHttpGraphQLRequest` use regular expressions to route GraphQL-shaped requests.

| Technology | Declared version | Purpose |
|---|---:|---|
| AWS SDK for JavaScript v3 | Auth starts at `^3.450.0`; Game/Leaderboard mostly `^3.750.0`; newer Game S3/SES packages range through `^3.1086.0` | DynamoDB, CloudWatch, Cognito, EventBridge, Lambda invocation, S3 presigning, SES, and Secrets Manager integrations. Exact package ranges are detailed in `aidlc-docs/inception/reverse-engineering/dependencies.md`. |
| Zod | Game/Auth `^3.22.4`; Shared `^3.22.4` | Selected API input validation and shared domain schemas. |
| Stripe Node SDK | `^12.18.0` | Checkout, portal, subscription, and webhook behavior in `StripeService` (`services/game/src/services/stripe.service.ts`). |
| UUID | Runtime `^8.3.2`; types `^10.0.0` | Game/session and language identifiers. |
| GraphQL | Game/Auth `^16.8.1` | Declared and packaged, but no first-party server import was found; the handlers do not instantiate a GraphQL executor. |
| AWS Encryption SDK client | `^4.0.1` | Cognito custom-email ciphertext decryption in `services/email-sender/index.js`. |
| date-fns | `^3.0.0` | Declared by Shared; no first-party Shared source import was found. |

## Build and Package Tooling

| Project | Commands and tools |
|---|---|
| Web | `npm run build` runs `tsc && vite build`; `npm run type-check` uses `tsc --noEmit`; Vite outputs `apps/web/dist`. There is no npm workspace/root orchestration. |
| Shared | `tsc` builds CommonJS declarations to `dist`; `packages/shared/tsconfig.lambda.json` can target ES2020 and `dist-lambda`; `rimraf` is invoked by `clean` but is not declared directly in `packages/shared/package.json`. |
| Game/Auth/Leaderboard | `tsc` compiles each service independently. CDK `NodejsFunction` also bundles Auth, Game, and Leaderboard entry source with esbuild. |
| Infrastructure | AWS CDK CLI `^2.1108.0`, `aws-cdk-lib ^2.100.0`, Constructs `^10.0.0`, esbuild `^0.27.3`, ts-node `^10.9.0`, and TypeScript `^5.0.0`. `infrastructure/cdk.json` runs compiled `dist/bin/memory-game.js`. |
| Mobile | Flutter and Dart standard build commands are implied by `pubspec.yaml`; generated native platform material is excluded by `apps/mobile/.gitignore`. |
| Lambda packages | GitHub Actions and `scripts/deploy-game-lambda.sh` assemble ZIP archives. The sanctioned Game script builds Shared and Game, constructs a clean archive, verifies its handler/size, and smoke-tests after deployment. |

## Test, Lint, and Format Tooling

| Area | Tool and declared version | Configuration |
|---|---|---|
| Web | Vitest `^4.1.4`; fast-check `^4.6.0` | Utility tests are under `apps/web/src/utils/__tests__`. No `test` or coverage script is declared in `apps/web/package.json`. |
| Game/Auth/Shared | Jest `^29.7.0`; ts-jest `^29.1.x`; AWS SDK client mocks `^3.x` where used | `services/game/jest.config.js`, `services/auth/jest.config.js`, and `packages/shared/jest.config.js` use the Node environment and set 80% global thresholds for branches, functions, lines, and statements. |
| Leaderboard | Jest `^29.7.0`; ts-jest `^29.1.0`; fast-check `^3.15.0`; AWS SDK client mocks `^4.1.0` | `services/leaderboard/jest.config.js` also sets 80% global thresholds. |
| Infrastructure | Jest `^29.5.0` and ts-jest `^29.1.0` are declared | `npm test` exists, but no first-party infrastructure test file or project Jest config was found. |
| Mobile | `flutter_test` SDK and `flutter_lints ^4.0.0` | `analysis_options.yaml` adds const-constructor, final-local, and explicit-return-type rules; no mobile test file was found. |
| Web lint/format | ESLint `^8.56.0`, TypeScript ESLint `^7.0.0`, Prettier config | `npm run lint` exists. `.prettierrc` exists, but no format script is declared. |
| Game/Auth/Shared lint/format | ESLint `8.55-8.56`, TypeScript ESLint `6.x-8.x`, Prettier `3.1.x` | Each project has lint and format scripts plus local configuration. |
| Leaderboard lint | `npm run lint` is declared | No first-party ESLint dependency or ESLint configuration was found in the Leaderboard project. |

## Cloud and Hosted Services

| Service | Source-defined use |
|---|---|
| Amazon DynamoDB | `DatabaseStack` defines 15 on-demand tables for users, games, catalog, themes, subscriptions, achievements, limits, language data, and leaderboard data. Runtime code also references review, email-preference, and statistics stores not defined by that stack. |
| Amazon Cognito | `CognitoStack` defines the user pool, public clients, OAuth callbacks, password policy, and optional MFA. Web and mobile clients authenticate directly; the older Auth Lambda also calls Cognito. |
| AWS Lambda | Node.js 20 functions for Auth, Game, and Leaderboard in active CDK. Additional email and trigger handlers exist in service source/manual deployment paths. |
| Amazon API Gateway v2 | HTTP API routes for Auth, Game, Game public lookup, and Leaderboard in `ApiStack`, with Cognito authorizers on Game and Leaderboard routes. |
| Amazon EventBridge and SQS | Two event buses, event archives/log routes, encrypted dead-letter queues, and a `GameCompleted` rule to Leaderboard. |
| Amazon CloudWatch and X-Ray | Structured/application logs, metrics, Lambda tracing, alarms, dashboards, and API access logs. |
| Amazon SNS | Alarm notification topic in `MonitoringStack`. |
| AWS Secrets Manager | Stripe and Resend credential retrieval by key/ARN configuration names; no credential values are documented here. |
| Amazon SES and S3 | Contact email and presigned language-image upload calls exist in Game source; the active CDK app does not define their backing resources. |
| Vercel | Current SPA configuration in `apps/web/vercel.json`; Vercel CLI is declared as `^56.4.0`. |
| Stripe | Subscription checkout, customer portal, plan changes, and webhook handling. |
| Resend | HTTPS email delivery for email handlers. |

No VPC, subnet, security group, load balancer, CloudFront distribution, or active S3 resource is created by `infrastructure/bin/memory-game.ts`, despite older documentation describing some of those resources.

## Deployment and Release Tooling

- `.github/workflows/deploy-lambdas.yml` is the only tracked GitHub Actions workflow. It references `actions/checkout@v4`, `actions/setup-node@v4`, and `aws-actions/configure-aws-credentials@v4`, fixes Node to 20, then uses `npm ci`, TypeScript builds or `npx esbuild`, ZIP, and AWS CLI Lambda updates for Game, Leaderboard, and Email Sender. The action references are moving major tags; AWS CLI, ZIP, and the Leaderboard `npx esbuild` version are not pinned in that workflow.
- Game and Auth CDK bundling uses `NodejsFunction` and esbuild from `infrastructure/lib/stacks/lambda-stack.ts`; Leaderboard uses the equivalent construct in `infrastructure/lib/stacks/leaderboard-lambda-stack.ts`.
- `scripts/deploy-game-lambda.sh` is the repository's complete manual Game packaging path. It supports dev/prod selection, builds from source, and selects the production AWS profile only for prod.
- `apps/web/vercel.json` defines the Vite build and SPA rewrite. Frontend deployment uses the Vercel CLI declared by the web project; no frontend GitHub Action is tracked.
- `amplify.yml` remains as an AWS Amplify-hosting build definition, but current repository deployment configuration and rules identify Vercel as the frontend host.
- Catalog/theme registration is handled by operational scripts such as `scripts/seed-mini-golf.sh`, outside CDK and the Lambda deployment workflow.
