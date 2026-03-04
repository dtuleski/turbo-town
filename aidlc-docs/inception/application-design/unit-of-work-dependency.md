# Unit of Work Dependencies

## Overview
This document defines dependencies between units, critical path analysis, and integration points for the memory game application.

---

## Dependency Matrix

| Unit | Depends On | Dependency Type | Blocking? |
|------|-----------|----------------|-----------|
| Shared Components | None | - | No |
| Infrastructure | None | - | No |
| Auth Service | Shared Components, Infrastructure | Build-time, Runtime | Yes (blocks all services) |
| Game Service | Shared Components, Infrastructure, Auth Service | Build-time, Runtime | Yes (blocks Leaderboard, Frontend) |
| Leaderboard Service | Shared Components, Infrastructure, Auth Service, Game Service | Build-time, Runtime | No |
| Payment Service | Shared Components, Infrastructure, Auth Service, Game Service | Build-time, Runtime | No |
| Admin Service | Shared Components, Infrastructure, Auth Service, All Services | Build-time, Runtime | No |
| CMS Service | Shared Components, Infrastructure, Auth Service | Build-time, Runtime | No |
| Web Frontend | Shared Components, All Backend Services | Build-time, Runtime | No |
| Admin Dashboard | Shared Components, Admin Service, CMS Service | Build-time, Runtime | No |

---

## Critical Path Analysis

### Critical Path (Must be completed in sequence)
```
Shared Components → Infrastructure → Auth Service → Game Service → Web Frontend
```

**Estimated Duration**: 9 weeks (1 + 1 + 2 + 2 + 3)

### Parallel Tracks

**Track 1: Core Path**
- Shared Components (Week 1)
- Infrastructure (Week 2)
- Auth Service (Weeks 3-4)
- Game Service (Weeks 5-6)
- Web Frontend (Weeks 11-13)

**Track 2: Supporting Services** (can start after Auth Service)
- Leaderboard Service (Weeks 7-7)
- Payment Service (Weeks 7-8)
- CMS Service (Weeks 9-9)

**Track 3: Admin** (can start after other services)
- Admin Service (Weeks 13-13)
- Admin Dashboard (Weeks 12-13)

---

## Integration Points

### Frontend to Backend Integration

**Web Frontend → All Backend Services**
- Protocol: GraphQL over HTTPS
- Authentication: JWT tokens in Authorization header
- Endpoint: Single `/graphql` endpoint via API Gateway

**Admin Dashboard → Admin Service + CMS Service**
- Protocol: GraphQL over HTTPS
- Authentication: JWT tokens with admin role
- Endpoint: Same `/graphql` endpoint with role-based access

### Backend Service Integration

**Game Service → Leaderboard Service**
- Type: Internal Lambda invocation
- Purpose: Update leaderboard after game completion
- Data: userId, score, themeId, difficulty, timestamp

**Payment Service → Game Service**
- Type: Internal Lambda invocation
- Purpose: Update rate limits after subscription change
- Data: userId, newTier, effectiveDate

**Admin Service → All Services**
- Type: Internal Lambda invocation + Direct DynamoDB access
- Purpose: Data aggregation for analytics
- Data: Various metrics and user data

### External Service Integration

**Auth Service → AWS Cognito**
- Type: AWS SDK
- Purpose: User authentication and management
- Operations: Register, login, token validation, password reset

**Payment Service → Stripe API**
- Type: Stripe SDK + Webhooks
- Purpose: Payment processing and subscription management
- Operations: Create checkout, manage subscriptions, process webhooks

**CMS Service → S3 + CloudFront**
- Type: AWS SDK
- Purpose: Image storage and CDN distribution
- Operations: Upload images, invalidate cache

**All Services → DynamoDB**
- Type: AWS SDK + DynamoDB Toolbox
- Purpose: Data persistence
- Operations: CRUD operations, queries, scans

**All Services → CloudWatch**
- Type: AWS SDK
- Purpose: Logging and monitoring
- Operations: Log events, record metrics, trigger alarms

---

## Dependency Details

### Shared Components (Unit 10)
**Provides to all units**:
- TypeScript types and interfaces
- Data models (User, Game, Leaderboard, Subscription, Theme)
- Utility functions (validation, formatting, calculations)
- Constants and enums
- Error types

**No dependencies**

---

### Infrastructure (Unit 9)
**Provides to all backend services**:
- DynamoDB tables
- Lambda function configurations
- API Gateway setup
- S3 buckets
- CloudFront distributions
- Cognito User Pool
- IAM roles and policies
- CloudWatch log groups

**No dependencies**

---

### Auth Service (Unit 2)
**Depends on**:
- Shared Components (types, models, utilities)
- Infrastructure (DynamoDB Users table, Cognito User Pool, Lambda config)

**Provides to**:
- All services (user authentication and validation)
- Web Frontend (login, registration, session management)
- Admin Dashboard (admin authentication with MFA)

**Integration Points**:
- AWS Cognito (user management)
- DynamoDB Users table (user metadata)

---

### Game Service (Unit 3)
**Depends on**:
- Shared Components (types, models, utilities)
- Infrastructure (DynamoDB Games/RateLimits tables, Lambda config)
- Auth Service (user validation)

**Provides to**:
- Web Frontend (game creation, completion, history)
- Leaderboard Service (score updates)
- Admin Service (game data for analytics)

**Integration Points**:
- DynamoDB Games table (game records)
- DynamoDB RateLimits table (usage tracking)
- Leaderboard Service (internal invocation for score updates)

---

### Leaderboard Service (Unit 4)
**Depends on**:
- Shared Components (types, models, utilities)
- Infrastructure (DynamoDB Leaderboards table with GSI, Lambda config)
- Auth Service (user validation)
- Game Service (score updates)

**Provides to**:
- Web Frontend (leaderboard queries, user rank)
- Admin Service (leaderboard data for analytics)

**Integration Points**:
- DynamoDB Leaderboards table with GSI (rankings)

---

### Payment Service (Unit 5)
**Depends on**:
- Shared Components (types, models, utilities)
- Infrastructure (DynamoDB Subscriptions table, Lambda config)
- Auth Service (user validation)
- Game Service (rate limit updates)

**Provides to**:
- Web Frontend (subscription management, payment processing)
- Admin Service (subscription data, refunds)

**Integration Points**:
- Stripe API (payment processing)
- Stripe Webhooks (subscription events)
- DynamoDB Subscriptions table (subscription state)
- Game Service (internal invocation for rate limit updates)

---

### Admin Service (Unit 6)
**Depends on**:
- Shared Components (types, models, utilities)
- Infrastructure (All DynamoDB tables, Lambda config, CloudWatch)
- Auth Service (admin role validation)
- All other services (data aggregation)

**Provides to**:
- Admin Dashboard (user management, analytics, system monitoring)

**Integration Points**:
- All DynamoDB tables (data access)
- Stripe API (refunds, subscription modifications)
- CloudWatch (metrics aggregation)
- All services (internal invocations for data)

---

### CMS Service (Unit 7)
**Depends on**:
- Shared Components (types, models, utilities)
- Infrastructure (DynamoDB Themes table, S3 buckets, CloudFront, Lambda config)
- Auth Service (content manager role validation)

**Provides to**:
- Admin Dashboard (theme management interface)
- Game Service (theme data for gameplay)
- Web Frontend (theme browsing)

**Integration Points**:
- S3 (image storage)
- CloudFront (CDN, cache invalidation)
- DynamoDB Themes table (theme metadata)

---

### Web Frontend (Unit 1)
**Depends on**:
- Shared Components (types, models, utilities)
- All backend services (via GraphQL API)

**Provides to**:
- End users (game interface)

**Integration Points**:
- GraphQL API (all backend services)
- AWS Cognito (authentication flows)
- Stripe.js (payment forms)

---

### Admin Dashboard (Unit 8)
**Depends on**:
- Shared Components (types, models, utilities)
- Admin Service (user management, analytics)
- CMS Service (theme management)

**Provides to**:
- Admin users (system management interface)

**Integration Points**:
- GraphQL API (Admin Service, CMS Service)
- AWS Cognito (admin authentication with MFA)

---

## Development Coordination

### Phase 1: Foundation (Weeks 1-2)
**Units**: Shared Components, Infrastructure
**Coordination**: None required (independent)
**Deliverables**: Types/models available, AWS resources provisioned

### Phase 2: Core Services (Weeks 3-6)
**Units**: Auth Service, Game Service
**Coordination**: Sequential (Auth must complete before Game)
**Deliverables**: Authentication working, game logic implemented

### Phase 3: Supporting Services (Weeks 7-10)
**Units**: Leaderboard Service, Payment Service, CMS Service
**Coordination**: Can develop in parallel
**Deliverables**: All backend services operational

### Phase 4: Frontend Applications (Weeks 11-14)
**Units**: Web Frontend, Admin Dashboard, Admin Service
**Coordination**: Can develop in parallel
**Deliverables**: User-facing applications complete

---

## Risk Mitigation

### Dependency Risks

**Risk**: Auth Service delays block all other services
**Mitigation**: Prioritize Auth Service, use mock authentication for parallel development

**Risk**: Game Service delays block Leaderboard and Frontend
**Mitigation**: Define clear API contracts early, use mocks for parallel development

**Risk**: Stripe integration complexity delays Payment Service
**Mitigation**: Start Stripe integration early, use Stripe test mode extensively

**Risk**: Infrastructure provisioning delays all services
**Mitigation**: Provision infrastructure early, use local development environment

### Integration Risks

**Risk**: GraphQL schema changes break frontend
**Mitigation**: Version GraphQL schema, use schema-first development

**Risk**: Service-to-service communication failures
**Mitigation**: Implement retry logic, circuit breakers, comprehensive error handling

**Risk**: DynamoDB table design issues discovered late
**Mitigation**: Design tables early, validate with access patterns, use DynamoDB local for testing

---

## Summary

**Total Dependencies**: 45 dependency relationships

**Critical Path Units**: 5 (Shared Components, Infrastructure, Auth Service, Game Service, Web Frontend)

**Parallel Development Opportunities**: 3 tracks can run simultaneously after Auth Service

**External Dependencies**: 5 (AWS Cognito, Stripe, DynamoDB, S3, CloudWatch)

**Estimated Timeline**: 14 weeks with parallel development, 20+ weeks if sequential
