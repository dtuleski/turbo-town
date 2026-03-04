# Code Generation Plan - Authentication Service

## Overview
This plan outlines the complete code generation for the Authentication Service (Unit 3), implementing user authentication, registration, profile management, and AWS Cognito integration.

**Unit**: Authentication Service (Unit 3)
**Stories Implemented**: US-001 (Registration), US-002 (Social Login), US-003 (Login), US-004 (Password Reset)
**Dependencies**: Shared Components (types, validation), Infrastructure (Cognito, DynamoDB)
**Code Location**: `services/auth/` (workspace root)
**Total Steps**: 35

---

## Unit Context

### User Stories Coverage
- **US-001**: User Registration (email/password, email verification)
- **US-002**: Social Login (Google, Facebook OAuth)
- **US-003**: User Login (email/password, JWT tokens)
- **US-004**: Password Reset (request, confirm with code)

### Dependencies
- **Shared Components**: User types, validation schemas, error classes, constants
- **Infrastructure**: Cognito User Pool, DynamoDB Users/UserSettings tables
- **AWS Services**: Cognito, DynamoDB, API Gateway

### Service Boundaries
- **Owns**: User authentication, registration, profile management
- **Interfaces**: GraphQL API (11 operations), Cognito integration, DynamoDB access
- **Consumers**: All other services (for user authentication)

---

## Execution Steps

### Phase 1: Project Structure Setup

#### Step 1: Create Directory Structure
- [x] Create `services/auth/` directory
- [x] Create `services/auth/src/` subdirectories: handlers, services, repositories, utils, types
- [x] Create `services/auth/tests/` subdirectories: unit, integration, e2e
- [x] Create subdirectories: unit/services, unit/repositories, unit/utils

#### Step 2: Generate Package Configuration
- [x] Create `services/auth/package.json` with dependencies:
  - Runtime: @aws-sdk/client-cognito-identity-provider, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, graphql, zod
  - Dev: typescript, @types/node, @types/aws-lambda, jest, ts-jest, @types/jest, eslint, prettier
  - Local: @memory-game/shared (workspace reference)
- [x] Create `services/auth/tsconfig.json` with TypeScript configuration
- [x] Create `services/auth/jest.config.js` with test configuration
- [x] Create `services/auth/.eslintrc.js` with linting rules
- [x] Create `services/auth/.prettierrc.js` with formatting rules

---

### Phase 2: Core Infrastructure

#### Step 3: Generate Lambda Handler Entry Point
- [ ] Create `services/auth/src/index.ts`:
  - GraphQL Lambda handler
  - Request/response transformation
  - Error handling middleware
  - Logging setup with correlation IDs
  - Environment variable validation
  - **Story**: Foundation for US-001, US-002, US-003, US-004

---

### Phase 3: Utilities Layer

#### Step 4: Generate Validation Utilities
- [ ] Create `services/auth/src/utils/validation.ts`:
  - Email validation (Zod schema)
  - Password validation (min 8 chars, uppercase, lowercase, digit)
  - Name validation (2-50 chars, letters only)
  - Input sanitization helpers
  - **Story**: US-001, US-003, US-004

#### Step 5: Generate Error Mapping Utilities
- [ ] Create `services/auth/src/utils/error-mapper.ts`:
  - Map Cognito errors to domain errors
  - Map DynamoDB errors to domain errors
  - User-friendly error messages
  - Error code constants
  - **Story**: US-001, US-002, US-003, US-004

#### Step 6: Generate Token Utilities
- [ ] Create `services/auth/src/utils/token.ts`:
  - JWT parsing and validation
  - Token expiry checking
  - Extract user ID from token
  - Token refresh helpers
  - **Story**: US-003, US-004

#### Step 7: Generate Service Types
- [ ] Create `services/auth/src/types/index.ts`:
  - Service-specific types (LoginInput, RegisterInput, etc.)
  - Cognito response types
  - Repository interfaces
  - **Story**: US-001, US-002, US-003, US-004

---

### Phase 4: Repository Layer

#### Step 8: Generate Cognito Client
- [ ] Create `services/auth/src/repositories/cognito.client.ts`:
  - Initialize Cognito SDK client
  - `signUp()`: Create user in Cognito
  - `confirmSignUp()`: Verify email with code
  - `initiateAuth()`: Email/password login
  - `adminInitiateAuth()`: Social login
  - `forgotPassword()`: Request password reset
  - `confirmForgotPassword()`: Confirm password reset
  - `refreshToken()`: Refresh access token
  - `globalSignOut()`: Logout user
  - `adminGetUser()`: Get user from Cognito
  - Error handling and retry logic
  - **Story**: US-001, US-002, US-003, US-004

#### Step 9: Generate User Repository
- [ ] Create `services/auth/src/repositories/user.repository.ts`:
  - Initialize DynamoDB Document Client
  - `create()`: Create user in Users table
  - `getById()`: Get user by userId
  - `getByEmail()`: Get user by email (EmailIndex GSI)
  - `getByCognitoId()`: Get user by cognitoId (CognitoIdIndex GSI)
  - `update()`: Update user profile
  - `updateTier()`: Update subscription tier
  - `delete()`: Soft delete user
  - Error handling
  - **Story**: US-001, US-002, US-003, US-004

#### Step 10: Generate UserSettings Repository
- [ ] Create `services/auth/src/repositories/user-settings.repository.ts`:
  - Initialize DynamoDB Document Client
  - `create()`: Create default settings
  - `getByUserId()`: Get user settings
  - `update()`: Update user settings
  - Error handling
  - **Story**: US-001, US-002

---

### Phase 5: Business Logic Layer

#### Step 11: Generate Auth Service
- [ ] Create `services/auth/src/services/auth.service.ts`:
  - Constructor with repository dependencies
  - `register()`: Email/password registration flow
    - Validate input
    - Create Cognito user
    - Create DynamoDB user record
    - Create default settings
    - Return user and tokens
  - `verifyEmail()`: Verify email with code
    - Confirm Cognito signup
    - Update user status
  - `loginWithSocial()`: OAuth login/registration
    - Authenticate with Cognito
    - Check if user exists
    - Create user if new
    - Return user and tokens
  - `login()`: Email/password login
    - Validate credentials
    - Authenticate with Cognito
    - Get user from DynamoDB
    - Return user and tokens
  - `logout()`: Invalidate tokens
    - Global sign out from Cognito
  - `requestPasswordReset()`: Send reset email
    - Validate email
    - Trigger Cognito forgot password
  - `confirmPasswordReset()`: Reset password
    - Validate code and new password
    - Confirm with Cognito
  - `refreshToken()`: Refresh access token
    - Validate refresh token
    - Get new access token from Cognito
  - `getCurrentUser()`: Get authenticated user
    - Parse token
    - Get user from DynamoDB
  - `updateProfile()`: Update user profile
    - Validate input
    - Update DynamoDB
  - Error handling and logging
  - **Story**: US-001, US-002, US-003, US-004

---

### Phase 6: API Layer (GraphQL Resolvers)

#### Step 12: Generate Auth Handler
- [ ] Create `services/auth/src/handlers/auth.handler.ts`:
  - Initialize AuthService
  - **Mutation Resolvers**:
    - `register`: Call authService.register()
    - `loginWithSocial`: Call authService.loginWithSocial()
    - `login`: Call authService.login()
    - `logout`: Call authService.logout()
    - `requestPasswordReset`: Call authService.requestPasswordReset()
    - `confirmPasswordReset`: Call authService.confirmPasswordReset()
    - `refreshToken`: Call authService.refreshToken()
    - `updateProfile`: Call authService.updateProfile()
  - **Query Resolvers**:
    - `getCurrentUser`: Call authService.getCurrentUser()
    - `verifyEmail`: Call authService.verifyEmail()
  - Input validation with Zod
  - Authorization checks (token validation)
  - Error handling and mapping
  - **Story**: US-001, US-002, US-003, US-004

---

### Phase 7: Unit Tests

#### Step 13: Generate Validation Tests
- [ ] Create `services/auth/tests/unit/utils/validation.test.ts`:
  - Test email validation (valid, invalid formats)
  - Test password validation (length, complexity)
  - Test name validation (length, characters)
  - Test input sanitization
  - **Coverage**: 80%+ for validation.ts

#### Step 14: Generate Error Mapper Tests
- [ ] Create `services/auth/tests/unit/utils/error-mapper.test.ts`:
  - Test Cognito error mapping (UserNotFoundException, InvalidPasswordException, etc.)
  - Test DynamoDB error mapping
  - Test user-friendly messages
  - **Coverage**: 80%+ for error-mapper.ts

#### Step 15: Generate Token Utilities Tests
- [ ] Create `services/auth/tests/unit/utils/token.test.ts`:
  - Test JWT parsing
  - Test token validation
  - Test expiry checking
  - Test user ID extraction
  - **Coverage**: 80%+ for token.ts

#### Step 16: Generate Cognito Client Tests
- [ ] Create `services/auth/tests/unit/repositories/cognito.client.test.ts`:
  - Mock Cognito SDK
  - Test signUp (success, duplicate email)
  - Test confirmSignUp (success, invalid code)
  - Test initiateAuth (success, invalid credentials)
  - Test forgotPassword (success, user not found)
  - Test confirmForgotPassword (success, invalid code)
  - Test refreshToken (success, invalid token)
  - Test globalSignOut (success)
  - **Coverage**: 80%+ for cognito.client.ts

#### Step 17: Generate User Repository Tests
- [ ] Create `services/auth/tests/unit/repositories/user.repository.test.ts`:
  - Mock DynamoDB Document Client
  - Test create (success, duplicate email)
  - Test getById (found, not found)
  - Test getByEmail (found, not found)
  - Test getByCognitoId (found, not found)
  - Test update (success, not found)
  - Test updateTier (success)
  - Test delete (success)
  - **Coverage**: 80%+ for user.repository.ts

#### Step 18: Generate UserSettings Repository Tests
- [ ] Create `services/auth/tests/unit/repositories/user-settings.repository.test.ts`:
  - Mock DynamoDB Document Client
  - Test create (success)
  - Test getByUserId (found, not found)
  - Test update (success)
  - **Coverage**: 80%+ for user-settings.repository.ts

#### Step 19: Generate Auth Service Tests
- [ ] Create `services/auth/tests/unit/services/auth.service.test.ts`:
  - Mock all repositories
  - Test register (success, duplicate email, Cognito error)
  - Test verifyEmail (success, invalid code)
  - Test loginWithSocial (existing user, new user)
  - Test login (success, invalid credentials, unverified email)
  - Test logout (success)
  - Test requestPasswordReset (success, user not found)
  - Test confirmPasswordReset (success, invalid code)
  - Test refreshToken (success, invalid token)
  - Test getCurrentUser (success, user not found)
  - Test updateProfile (success, validation error)
  - **Coverage**: 80%+ for auth.service.ts

#### Step 20: Generate Auth Handler Tests
- [ ] Create `services/auth/tests/unit/handlers/auth.handler.test.ts`:
  - Mock AuthService
  - Test all mutation resolvers (8 mutations)
  - Test all query resolvers (2 queries)
  - Test input validation
  - Test authorization checks
  - Test error handling
  - **Coverage**: 80%+ for auth.handler.ts

---

### Phase 8: Integration Tests

#### Step 21: Generate Integration Tests
- [ ] Create `services/auth/tests/integration/auth.integration.test.ts`:
  - Setup: LocalStack for DynamoDB, mocked Cognito
  - Test full registration flow (register → verify email → login)
  - Test social login flow (new user, existing user)
  - Test password reset flow (request → confirm)
  - Test token refresh flow
  - Test profile update flow
  - Teardown: Clean up test data
  - **Coverage**: Critical user flows

---

### Phase 9: E2E Tests

#### Step 22: Generate E2E Tests
- [ ] Create `services/auth/tests/e2e/auth.e2e.test.ts`:
  - Setup: Real Cognito dev environment, real DynamoDB dev tables
  - Test registration flow (US-001)
  - Test social login flow (US-002)
  - Test login flow (US-003)
  - Test password reset flow (US-004)
  - Teardown: Clean up test users
  - **Coverage**: All user stories

---

### Phase 10: Configuration and Documentation

#### Step 23: Generate Environment Configuration
- [ ] Create `services/auth/.env.example`:
  - COGNITO_USER_POOL_ID
  - COGNITO_CLIENT_ID
  - DYNAMODB_USERS_TABLE
  - DYNAMODB_USER_SETTINGS_TABLE
  - NODE_ENV
  - AWS_REGION

#### Step 24: Generate README
- [ ] Create `services/auth/README.md`:
  - Service overview
  - Architecture diagram (text-based)
  - Setup instructions
  - Environment variables
  - Running tests
  - Deployment instructions
  - API documentation (GraphQL operations)
  - Integration guide
  - Troubleshooting

#### Step 25: Generate GraphQL Schema File
- [ ] Create `services/auth/schema.graphql`:
  - Complete GraphQL schema
  - Type definitions
  - Mutation definitions
  - Query definitions
  - Input types
  - Comments and documentation

---

### Phase 11: Deployment Artifacts

#### Step 26: Generate Lambda Deployment Config
- [ ] Create `services/auth/lambda-config.json`:
  - Runtime: nodejs20.x
  - Handler: dist/index.handler
  - Memory: 512 MB
  - Timeout: 30 seconds
  - Environment variables
  - IAM role ARN (placeholder)

#### Step 27: Generate Build Script
- [ ] Create `services/auth/scripts/build.sh`:
  - Clean dist directory
  - Compile TypeScript
  - Copy package.json
  - Install production dependencies
  - Create deployment package

#### Step 28: Generate Deploy Script
- [ ] Create `services/auth/scripts/deploy.sh`:
  - Build service
  - Upload to S3
  - Update Lambda function
  - Run smoke tests

---

### Phase 12: Monitoring and Observability

#### Step 29: Generate CloudWatch Metrics Helper
- [ ] Create `services/auth/src/utils/metrics.ts`:
  - Publish custom metrics
  - Request count
  - Error count
  - Latency tracking
  - Token generation time
  - Cognito operation time
  - DynamoDB operation time

#### Step 30: Generate Logging Helper
- [ ] Create `services/auth/src/utils/logger.ts`:
  - Structured JSON logging
  - Correlation ID tracking
  - Log levels (debug, info, warn, error)
  - Context enrichment
  - Security event logging

---

### Phase 13: Additional Utilities

#### Step 31: Generate Test Helpers
- [ ] Create `services/auth/tests/helpers/test-data.ts`:
  - User factory
  - Token factory
  - Mock data generators
  - Test fixtures

#### Step 32: Generate Test Setup
- [ ] Create `services/auth/tests/setup.ts`:
  - Jest global setup
  - Environment variable mocking
  - AWS SDK mocking
  - Test database setup

---

### Phase 14: Code Quality

#### Step 33: Generate Linting Configuration
- [ ] Verify `services/auth/.eslintrc.js`:
  - TypeScript rules
  - Code style rules
  - Import rules
  - Naming conventions

#### Step 34: Generate Formatting Configuration
- [ ] Verify `services/auth/.prettierrc.js`:
  - Code formatting rules
  - Line length
  - Semicolons
  - Quotes

---

### Phase 15: Documentation Summary

#### Step 35: Generate Implementation Summary
- [ ] Update `aidlc-docs/construction/auth-service/code/implementation-summary.md`:
  - Mark all files as generated
  - Add file count summary
  - Add test coverage summary
  - Add deployment status
  - Add next steps

---

## Story Traceability

### US-001: User Registration
- **Files**: auth.service.ts (register, verifyEmail), auth.handler.ts (register, verifyEmail), cognito.client.ts (signUp, confirmSignUp), user.repository.ts (create), user-settings.repository.ts (create)
- **Tests**: auth.service.test.ts, auth.handler.test.ts, auth.integration.test.ts, auth.e2e.test.ts

### US-002: Social Login
- **Files**: auth.service.ts (loginWithSocial), auth.handler.ts (loginWithSocial), cognito.client.ts (adminInitiateAuth), user.repository.ts (create, getByCognitoId)
- **Tests**: auth.service.test.ts, auth.handler.test.ts, auth.integration.test.ts, auth.e2e.test.ts

### US-003: User Login
- **Files**: auth.service.ts (login, getCurrentUser, logout), auth.handler.ts (login, getCurrentUser, logout), cognito.client.ts (initiateAuth, globalSignOut), user.repository.ts (getByEmail)
- **Tests**: auth.service.test.ts, auth.handler.test.ts, auth.integration.test.ts, auth.e2e.test.ts

### US-004: Password Reset
- **Files**: auth.service.ts (requestPasswordReset, confirmPasswordReset), auth.handler.ts (requestPasswordReset, confirmPasswordReset), cognito.client.ts (forgotPassword, confirmForgotPassword)
- **Tests**: auth.service.test.ts, auth.handler.test.ts, auth.integration.test.ts, auth.e2e.test.ts

---

## Success Criteria
- [ ] All 35 steps completed and marked [x]
- [ ] All user stories (US-001 to US-004) implemented
- [ ] 20+ source files generated
- [ ] 15+ test files generated
- [ ] 80%+ test coverage achieved
- [ ] All tests passing (unit, integration, E2E)
- [ ] Documentation complete (README, API docs)
- [ ] Deployment artifacts generated
- [ ] Code quality checks passing (linting, formatting)

---

## Estimated Effort
- **Project Setup**: 30 minutes (Steps 1-2)
- **Core Implementation**: 4-6 hours (Steps 3-12)
- **Unit Tests**: 3-4 hours (Steps 13-20)
- **Integration/E2E Tests**: 2-3 hours (Steps 21-22)
- **Configuration/Documentation**: 1-2 hours (Steps 23-25)
- **Deployment/Monitoring**: 1-2 hours (Steps 26-30)
- **Additional Utilities**: 1 hour (Steps 31-32)
- **Code Quality**: 30 minutes (Steps 33-34)
- **Summary**: 30 minutes (Step 35)

**Total**: 13-19 hours (2-3 days)

---

## Notes
- This plan is the single source of truth for Auth Service code generation
- Each step must be marked [x] immediately after completion
- All code goes to `services/auth/` (workspace root), never `aidlc-docs/`
- Follow TypeScript best practices and established patterns from Shared Components
- Maintain 80%+ test coverage throughout
- Use Result<T, Error> pattern from Shared Components for error handling
- All GraphQL operations must match the API contracts from functional design
