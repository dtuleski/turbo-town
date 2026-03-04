# Code Generation Plan - Infrastructure Unit

## Overview
This plan outlines the code generation process for the Infrastructure unit. The goal is to generate AWS CDK TypeScript code implementing the complete 7-stack architecture with all 50+ AWS resources.

**Unit**: Infrastructure
**Technology**: AWS CDK (TypeScript)
**Location**: `infrastructure/` directory in workspace root
**Total Steps**: 65 steps across 13 phases

---

## Unit Context

### Stories Implemented
This unit implements infrastructure for all user stories by providing:
- Database tables for all data storage needs
- Lambda functions for all backend services
- API Gateway for GraphQL endpoint
- Cognito for authentication
- S3 and CloudFront for static assets
- CloudWatch for monitoring and alerting

### Dependencies
- **Depends on**: Shared Components (types, schemas, constants)
- **Depended by**: All service units (Auth, Game, Leaderboard, Payment, CMS, Admin)

### Service Boundaries
- Provisions all AWS infrastructure resources
- Defines deployment architecture and CI/CD
- Provides infrastructure as code (IaC) with AWS CDK
- Manages environment configurations (dev, staging, prod)

---

## Phase 1: Project Structure Setup (8 steps)

- [x] **Step 1**: Create `infrastructure/` directory in workspace root
- [x] **Step 2**: Create `infrastructure/bin/` directory for CDK app entry point
- [x] **Step 3**: Create `infrastructure/lib/` directory for stack implementations
- [x] **Step 4**: Create `infrastructure/lib/stacks/` directory for stack classes
- [x] **Step 5**: Create `infrastructure/lib/constructs/` directory for reusable constructs
- [x] **Step 6**: Create `infrastructure/lib/config/` directory for configurations
- [x] **Step 7**: Create `infrastructure/package.json` with CDK dependencies
- [x] **Step 8**: Create `infrastructure/tsconfig.json` for TypeScript configuration

---

## Phase 2: Configuration Files (5 steps)

- [x] **Step 9**: Create `infrastructure/cdk.json` with CDK configuration
- [x] **Step 10**: Create `infrastructure/.gitignore` for CDK artifacts
- [x] **Step 11**: Create `infrastructure/lib/config/environment-config.ts` with environment interface
- [x] **Step 12**: Create `infrastructure/lib/config/constants.ts` with shared constants
- [x] **Step 13**: Create `infrastructure/README.md` with deployment instructions

---

## Phase 3: Reusable Constructs (3 steps)

- [x] **Step 14**: Create `infrastructure/lib/constructs/lambda-function.ts` with reusable Lambda construct
- [ ] **Step 15**: Create `infrastructure/lib/constructs/dynamodb-table.ts` with reusable DynamoDB construct
- [ ] **Step 16**: Create `infrastructure/lib/constructs/cloudwatch-alarm.ts` with reusable alarm construct

---

## Phase 4: Database Stack (2 steps)

- [x] **Step 17**: Create `infrastructure/lib/stacks/database-stack.ts` with all 8 DynamoDB tables
- [x] **Step 18**: Add GSIs, TTL, PITR, and encryption configurations to all tables

---

## Phase 5: Storage Stack (2 steps)

- [ ] **Step 19**: Create `infrastructure/lib/stacks/storage-stack.ts` with all 3 S3 buckets
- [ ] **Step 20**: Add encryption, versioning, lifecycle policies, and CORS to all buckets

---

## Phase 6: Auth Stack (2 steps)

- [x] **Step 21**: Create `infrastructure/lib/stacks/auth-stack.ts` with Cognito User Pool
- [x] **Step 22**: Add User Pool Client, password policy, MFA, and Lambda triggers

---

## Phase 7: API Stack (2 steps)

- [x] **Step 23**: Create `infrastructure/lib/stacks/api-stack.ts` with API Gateway HTTP API
- [x] **Step 24**: Add Cognito authorizer, CORS, throttling, and logging configuration

---

## Phase 8: Lambda Stack (7 steps)

- [x] **Step 25**: Create `infrastructure/lib/stacks/lambda-stack.ts` with Lambda stack class
- [x] **Step 26**: Add Auth Service Lambda with environment variables and permissions
- [x] **Step 27**: Add Game Service Lambda with environment variables and permissions
- [ ] **Step 28**: Add Leaderboard Service Lambda with environment variables and permissions
- [ ] **Step 29**: Add Payment Service Lambda with environment variables and permissions
- [ ] **Step 30**: Add CMS Service Lambda with environment variables and permissions
- [ ] **Step 31**: Add Admin Service Lambda with environment variables and permissions

---

## Phase 9: CDN Stack (3 steps)

- [ ] **Step 32**: Create `infrastructure/lib/stacks/cdn-stack.ts` with CDN stack class
- [ ] **Step 33**: Add Web Frontend CloudFront distribution with OAI and caching
- [ ] **Step 34**: Add Assets CloudFront distribution with multiple origins and caching

---

## Phase 10: Monitoring Stack (4 steps)

- [x] **Step 35**: Create `infrastructure/lib/stacks/monitoring-stack.ts` with monitoring stack class
- [x] **Step 36**: Add SNS topic for alert notifications
- [x] **Step 37**: Add Lambda error and duration alarms for all 6 functions
- [x] **Step 38**: Add API Gateway 5xx and latency alarms
- [x] **Step 39**: Add DynamoDB throttle alarms for all tables

---

## Phase 11: CDK App Entry Point (2 steps)

- [x] **Step 40**: Create `infrastructure/bin/app.ts` with CDK app initialization
- [x] **Step 41**: Instantiate all 7 stacks with proper dependencies and environment configs

---

## Phase 12: Deployment Scripts (6 steps)

- [x] **Step 42**: Create `infrastructure/scripts/deploy-dev.sh` for dev deployment
- [x] **Step 43**: Create `infrastructure/scripts/deploy-staging.sh` for staging deployment
- [x] **Step 44**: Create `infrastructure/scripts/deploy-prod.sh` for prod deployment
- [x] **Step 45**: Create `infrastructure/scripts/destroy-dev.sh` for dev cleanup
- [x] **Step 46**: Create `infrastructure/scripts/bootstrap.sh` for CDK bootstrap
- [x] **Step 47**: Make all scripts executable

---

## Phase 13: CI/CD Configuration (4 steps)

- [ ] **Step 48**: Create `.github/workflows/deploy-infrastructure.yml` for GitHub Actions
- [ ] **Step 49**: Add workflow triggers for branch-based deployments
- [ ] **Step 50**: Add CDK synth and deploy jobs
- [ ] **Step 51**: Add manual approval gate for production

---

## Phase 14: Documentation (8 steps)

- [x] **Step 52**: Create `aidlc-docs/construction/infrastructure/code/implementation-summary.md`
- [x] **Step 53**: Document all 7 stacks with resource counts
- [x] **Step 54**: Document deployment procedures and commands
- [x] **Step 55**: Document environment configurations
- [x] **Step 56**: Document stack dependencies and deployment order
- [x] **Step 57**: Document CI/CD pipeline setup
- [x] **Step 58**: Document disaster recovery procedures
- [x] **Step 59**: Document cost estimates and optimization strategies

---

## Phase 15: Testing Configuration (6 steps)

- [ ] **Step 60**: Create `infrastructure/test/` directory for CDK tests
- [ ] **Step 61**: Create `infrastructure/test/database-stack.test.ts` with snapshot tests
- [ ] **Step 62**: Create `infrastructure/test/lambda-stack.test.ts` with snapshot tests
- [ ] **Step 63**: Create `infrastructure/test/api-stack.test.ts` with snapshot tests
- [ ] **Step 64**: Create `infrastructure/jest.config.js` for Jest configuration
- [ ] **Step 65**: Update `infrastructure/package.json` with test scripts

---

## Story Traceability

This infrastructure unit provides the foundation for all user stories:
- **Authentication Stories** (US-1.1 to US-1.4): Cognito User Pool, Auth Service Lambda
- **Gameplay Stories** (US-2.1 to US-2.6): Game Service Lambda, Games Table, RateLimits Table
- **Theme Stories** (US-3.1 to US-3.3): CMS Service Lambda, Themes Table, S3 Theme Images
- **Leaderboard Stories** (US-4.1 to US-4.3): Leaderboard Service Lambda, Leaderboards Table
- **Achievement Stories** (US-5.1 to US-5.2): Game Service Lambda, Achievements Table
- **Payment Stories** (US-6.1 to US-6.5): Payment Service Lambda, Subscriptions Table
- **Profile Stories** (US-7.1 to US-7.3): Auth Service Lambda, Users Table, UserSettings Table
- **Admin Stories** (US-8.1 to US-8.5): Admin Service Lambda, all tables
- **CMS Stories** (US-9.1 to US-9.3): CMS Service Lambda, Themes Table
- **Analytics Stories** (US-10.1 to US-10.2): Admin Service Lambda, CloudWatch
- **NFR Stories** (US-11.1 to US-11.11): All infrastructure patterns and monitoring

---

## Success Criteria

- [ ] All 65 steps completed and marked [x]
- [ ] All 7 CDK stacks implemented with TypeScript
- [ ] All 50+ AWS resources defined in CDK code
- [ ] Environment configurations for dev, staging, prod
- [ ] Deployment scripts for all environments
- [ ] CI/CD pipeline configured with GitHub Actions
- [ ] Comprehensive documentation in implementation-summary.md
- [ ] CDK snapshot tests for critical stacks
- [ ] All files in correct locations (infrastructure/ directory)
- [ ] No files created in aidlc-docs/ except documentation

---

## Notes

- This is a greenfield infrastructure project
- All code will be created in `infrastructure/` directory
- Documentation summaries will be in `aidlc-docs/construction/infrastructure/code/`
- CDK code will be TypeScript with strict type checking
- Follow AWS CDK best practices and patterns
- Use reusable constructs for common patterns
- Environment-specific configurations via CDK context
- Infrastructure code will be version controlled in Git

