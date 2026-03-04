# Functional Design Plan - Authentication Service

## Overview
This plan outlines the functional design for the Authentication Service unit, which handles user authentication, registration, profile management, and AWS Cognito integration.

**Unit**: Authentication Service (Unit 3)
**Stories Implemented**: US-001, US-002, US-003, US-004 (registration, social login, login, password reset)
**Dependencies**: Shared Components, Infrastructure (Cognito, DynamoDB)

---

## Design Decisions (No Questions Needed)

All design decisions are clear from requirements and application design:

1. **Authentication Provider**: AWS Cognito (already decided in application design)
2. **Token Strategy**: JWT tokens (Cognito standard - 1h access, 30d refresh)
3. **Social Providers**: Google, Facebook (Apple for future iOS app)
4. **Session Management**: Cognito-managed sessions with refresh tokens
5. **Password Policy**: Min 8 chars, uppercase, lowercase, digits (from Cognito config)
6. **Email Verification**: Required for email/password registration
7. **Rate Limiting**: Cognito built-in (5 failed attempts = account lock)

---

## Execution Steps

### Phase 1: Analyze Requirements
- [x] Review Authentication Service unit definition
- [x] Review user stories US-001 through US-004
- [x] Identify GraphQL operations needed
- [x] Identify data models and repositories

### Phase 2: Define Data Models
- [x] User entity (already defined in Shared Components)
- [x] UserSettings entity (already defined in Shared Components)
- [x] Session/token models (Cognito-managed)

### Phase 3: Define Business Logic
- [x] Registration flow (email/password)
- [x] Social registration flow (OAuth)
- [x] Login flow with token generation
- [x] Password reset flow
- [x] Email verification flow
- [x] Profile management operations

### Phase 4: Define API Contracts
- [x] GraphQL schema for Auth Service
- [x] Mutations: register, login, loginWithSocial, logout, requestPasswordReset, confirmPasswordReset, refreshToken, updateProfile
- [x] Queries: getCurrentUser, verifyEmail

### Phase 5: Define Integration Points
- [x] AWS Cognito integration (user pool operations)
- [x] DynamoDB integration (Users, UserSettings tables)
- [x] Shared Components integration (types, validation, errors)

### Phase 6: Generate Artifacts
- [x] Create api-contracts.md with GraphQL schema
- [x] Create business-logic.md with service methods
- [x] Create data-access.md with repository patterns

---

## Artifacts to Generate

1. **api-contracts.md** - GraphQL schema, mutations, queries, types
2. **business-logic.md** - Service layer methods, business rules, validation
3. **data-access.md** - Repository patterns, DynamoDB operations, Cognito integration

---

## Success Criteria
- [x] All authentication user stories covered (US-001 to US-004)
- [x] Complete GraphQL API contract defined
- [x] Business logic flows documented
- [x] Data access patterns specified
- [x] Cognito integration patterns defined
- [x] All artifacts generated

