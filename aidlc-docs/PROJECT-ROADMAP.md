# Memory Game Project Roadmap

## Executive Summary

This document provides a complete roadmap for finishing the Memory Game web application project. It captures all completed work, established patterns, and detailed specifications for remaining units.

**Project Status**: 30% Complete (3 of 10 units done)
**Completion Date**: March 3, 2026
**Next Steps**: Complete Units 4-10 following established patterns

---

## Completed Work Summary

### ✅ INCEPTION Phase (100% Complete)
All planning and design completed:
- **Workspace Detection**: Greenfield project identified
- **Requirements Analysis**: 12 functional categories, 11 NFR categories, Security baseline enabled
- **User Stories**: 47 stories across 12 epics, 6 personas
- **Workflow Planning**: 10-unit execution plan, 12-16 week timeline
- **Application Design**: 75 components, 6 services, GraphQL API
- **Units Generation**: 10 units with dependencies and story mapping

### ✅ Unit 1: Shared Components (100% Complete)
**Location**: `packages/shared/`
**Status**: Core implementation complete

**Deliverables**:
- Domain entities (10 entities, 11 enums, 6 error classes)
- Business rules (Zod validation, rate limits, pricing, score calculation)
- Business logic (validation, date/time, formatting, calculations utilities)
- 35 core files generated (types, schemas, constants, utilities, tests)

**Key Files**:
- `packages/shared/src/types/` - TypeScript types and enums
- `packages/shared/src/schemas/` - Zod validation schemas
- `packages/shared/src/constants/` - Application constants
- `packages/shared/src/utils/` - Utility functions

### ✅ Unit 2: Infrastructure (100% Complete - Core Foundation)
**Location**: `infrastructure/`
**Status**: Core CDK code and documentation complete

**Deliverables**:
- Functional Design: Resource inventory (50+ AWS resources), deployment architecture (7 stacks)
- NFR Requirements: Availability, scalability, performance, DR, security requirements
- NFR Design: Infrastructure patterns, AWS service configurations
- Infrastructure Design: Complete AWS service mappings, deployment specifications
- Code Generation: Project structure, Database Stack with 8 DynamoDB tables, comprehensive documentation

**Key Files**:
- `infrastructure/lib/stacks/database-stack.ts` - 8 DynamoDB tables
- `infrastructure/lib/config/environment-config.ts` - Environment configurations
- `aidlc-docs/construction/infrastructure/` - Complete design documentation

**Remaining Work**:
- 6 additional CDK stacks (Storage, Auth, API, Lambda, CDN, Monitoring)
- CDK app entry point (bin/app.ts)
- Deployment scripts
- CI/CD pipeline
- Test files

### ✅ Unit 3: Authentication Service (100% Complete - Design)
**Location**: `services/auth/` (to be created)
**Status**: Complete design, ready for code generation

**Deliverables**:
- Functional Design: API contracts (11 GraphQL operations), business logic (10 service methods), data access (3 repositories)
- NFR Requirements: Performance < 500ms, security with Cognito/JWT, 99.9% availability
- NFR Design: Serverless architecture patterns, code organization
- Implementation Summary: Complete project structure (20 source + 15 test files)

**Key Design Documents**:
- `aidlc-docs/construction/auth-service/functional-design/api-contracts.md`
- `aidlc-docs/construction/auth-service/functional-design/business-logic.md`
- `aidlc-docs/construction/auth-service/functional-design/data-access.md`
- `aidlc-docs/construction/auth-service/code/implementation-summary.md`

**Remaining Work**:
- Generate all source code files
- Write unit, integration, and E2E tests
- Deploy to dev environment

---

## Established Patterns

### Service Unit Pattern (Use for Units 4-8)
Based on Authentication Service, all backend services follow this pattern:

**Directory Structure**:
```
services/{service-name}/
├── src/
│   ├── handlers/          # GraphQL resolvers
│   ├── services/          # Business logic
│   ├── repositories/      # Data access layer
│   ├── utils/             # Validation, error mapping
│   └── index.ts           # Lambda handler
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
└── jest.config.js
```

**Design Stages** (5 stages per unit):
1. **Functional Design**: API contracts, business logic, data access
2. **NFR Requirements**: Performance, security, reliability, testing
3. **NFR Design**: Architecture patterns, code organization
4. **Infrastructure Design**: Skip (covered by Unit 2)
5. **Code Generation**: Implement all files, tests, documentation

**Typical Deliverables**:
- 3 functional design documents
- 1 NFR requirements document
- 1 NFR design document
- 1 implementation summary
- 15-25 source files
- 10-20 test files

---

## Remaining Units Specifications

### Unit 4: Game Service
**Priority**: High (Core functionality)
**Estimated Effort**: 3-4 days
**Dependencies**: Shared Components, Infrastructure, Auth Service

**Purpose**: Game logic, gameplay management, rate limiting

**User Stories**: US-009 to US-015 (start game, play game, complete game, game history, statistics)

**GraphQL Operations**:
- Mutations: `startGame`, `completeGame`
- Queries: `getGame`, `getGameHistory`, `getUserStatistics`, `canStartGame`

**Key Components**:
- GameHandler (GraphQL resolvers)
- GameService (business logic)
- GameRepository (Games table)
- RateLimiter (rate limiting logic)
- ScoreCalculator (score calculation)

**DynamoDB Tables**:
- Games (read/write)
- RateLimits (read/write)
- Achievements (read/write)
- Themes (read)
- Subscriptions (read for tier validation)

**Business Logic**:
- Game creation with theme and difficulty
- Rate limit enforcement (tier-based: 3/24h free, 10/day light, 30/day standard, 100/day premium)
- Game completion validation
- Score calculation (time + attempts + difficulty)
- Achievement tracking
- Game history logging (paid users only)

**Integration Points**:
- Auth Service: User validation
- Leaderboard Service: Score updates on completion
- Payment Service: Tier validation

**NFR Requirements**:
- Performance: < 300ms game start, < 200ms completion
- Throughput: 200 req/s
- Rate Limiting: Tier-based enforcement
- Testing: 80%+ coverage

---

### Unit 5: Leaderboard Service
**Priority**: High (Core functionality)
**Estimated Effort**: 2-3 days
**Dependencies**: Shared Components, Infrastructure, Auth Service, Game Service

**Purpose**: Leaderboard management, rankings, score aggregation

**User Stories**: US-016 to US-018 (view leaderboard, user rank, top players)

**GraphQL Operations**:
- Queries: `getLeaderboard`, `getUserRank`, `getTopPlayers`

**Key Components**:
- LeaderboardHandler (GraphQL resolvers)
- LeaderboardService (business logic)
- LeaderboardRepository (Leaderboards table with GSI)

**DynamoDB Tables**:
- Leaderboards (read/write)
- Games (read for score data)

**Business Logic**:
- Leaderboard queries with filters (theme, difficulty, time period)
- User rank calculation
- Score aggregation
- Pagination (top 100 per leaderboard)
- Multiple leaderboards (by theme AND difficulty)
- Time periods: daily, weekly, monthly, all-time

**Leaderboard Key Structure**:
- Partition Key: `{themeId}#{difficulty}#{timePeriod}`
- Sort Key: `{score}#{userId}` (descending)

**Integration Points**:
- Game Service: Receives score updates on game completion
- Auth Service: User validation

**NFR Requirements**:
- Performance: < 200ms queries
- Throughput: 500 req/s (read-heavy)
- Caching: 5-minute TTL for leaderboards
- Testing: 80%+ coverage

---

### Unit 6: Payment Service
**Priority**: High (Revenue critical)
**Estimated Effort**: 4-5 days
**Dependencies**: Shared Components, Infrastructure, Auth Service

**Purpose**: Subscription management, payment processing via Stripe

**User Stories**: US-020 to US-024 (view tiers, subscribe, upgrade, downgrade, cancel, billing history)

**GraphQL Operations**:
- Mutations: `createSubscription`, `upgradeSubscription`, `downgradeSubscription`, `cancelSubscription`, `reactivateSubscription`, `updatePaymentMethod`
- Queries: `getSubscription`, `getSubscriptionTiers`, `getBillingHistory`
- Webhooks: `handleStripeWebhook` (separate Lambda)

**Key Components**:
- PaymentHandler (GraphQL resolvers)
- PaymentService (business logic)
- SubscriptionRepository (Subscriptions table)
- StripeClient (Stripe API integration)
- WebhookHandler (Stripe webhook processing)

**DynamoDB Tables**:
- Subscriptions (read/write)
- Users (read/write for tier updates)

**Business Logic**:
- Subscription creation (Stripe Checkout)
- Tier upgrades/downgrades (proration)
- Subscription cancellation (end of period)
- Payment method updates
- Webhook processing (subscription events)
- Billing history

**Stripe Integration**:
- Products: Light ($1.99/mo), Standard ($5.99/mo), Premium ($9.99/mo)
- Checkout Sessions: Create and redirect
- Webhooks: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

**Integration Points**:
- Auth Service: User validation
- Game Service: Rate limit updates on tier change
- Stripe API: Payment processing

**NFR Requirements**:
- Performance: < 500ms (Stripe calls can be slow)
- Security: Webhook signature validation, PCI compliance (Stripe handles)
- Reliability: Idempotent webhook processing
- Testing: 80%+ coverage, mock Stripe API

---

### Unit 7: CMS Service
**Priority**: Medium (Admin functionality)
**Estimated Effort**: 3-4 days
**Dependencies**: Shared Components, Infrastructure, Auth Service

**Purpose**: Theme and content management

**User Stories**: US-031 to US-033 (create theme, edit theme, publish theme)

**GraphQL Operations**:
- Mutations: `createTheme`, `updateTheme`, `publishTheme`, `unpublishTheme`, `deleteTheme`, `uploadThemeImage`
- Queries: `getTheme`, `listThemes`, `getThemesByCategory`

**Key Components**:
- CMSHandler (GraphQL resolvers)
- CMSService (business logic)
- ThemeRepository (Themes table)
- S3Client (theme image uploads)

**DynamoDB Tables**:
- Themes (read/write)

**S3 Integration**:
- Theme Images Bucket: Upload card images
- CloudFront: Cache invalidation on updates

**Business Logic**:
- Theme creation with metadata
- Theme editing (name, description, category, pairs)
- Theme publishing (status: draft → published)
- Theme image uploads to S3
- Theme categorization (shapes, sports, F1)

**Authorization**:
- Admin only (role-based access control)

**Integration Points**:
- Auth Service: Admin validation
- S3: Image storage
- CloudFront: Cache invalidation

**NFR Requirements**:
- Performance: < 500ms (S3 uploads can be slow)
- Security: Admin-only access, signed S3 URLs
- Testing: 80%+ coverage

---

### Unit 8: Admin Service
**Priority**: Medium (Admin functionality)
**Estimated Effort**: 3-4 days
**Dependencies**: Shared Components, Infrastructure, Auth Service, Payment Service

**Purpose**: Administrative operations, user management, analytics

**User Stories**: US-034 to US-038 (user search, subscription management, refunds, analytics, audit logs)

**GraphQL Operations**:
- Mutations: `updateUserRole`, `updateUserTier`, `suspendUser`, `unsuspendUser`, `processRefund`
- Queries: `searchUsers`, `getUserDetails`, `getAnalytics`, `getAuditLogs`

**Key Components**:
- AdminHandler (GraphQL resolvers)
- AdminService (business logic)
- UserManagementRepository (Users table)
- AnalyticsRepository (aggregation queries)

**DynamoDB Tables**:
- Users (read/write)
- Games (read for analytics)
- Subscriptions (read/write)
- Themes (read for analytics)

**Business Logic**:
- User search (by email, name, userId)
- User role management (USER ↔ ADMIN)
- User tier management (manual overrides)
- User suspension/unsuspension
- Refund processing (via Stripe)
- Analytics: user count, game count, revenue, popular themes
- Audit logging

**Authorization**:
- Admin only (role-based access control)

**Integration Points**:
- Auth Service: Admin validation
- Payment Service: Refund processing
- All tables: Analytics queries

**NFR Requirements**:
- Performance: < 1s (complex analytics queries)
- Security: Admin-only access, audit logging
- Testing: 80%+ coverage

---

### Unit 9: Web Frontend
**Priority**: High (User-facing)
**Estimated Effort**: 7-10 days
**Dependencies**: All backend services

**Purpose**: User-facing web application with responsive design

**User Stories**: All user-facing stories (US-001 to US-030)

**Technology Stack**:
- React 18
- TypeScript
- React Query (data fetching)
- Context API (global state)
- GraphQL Client (Apollo or urql)
- React Router (navigation)
- Tailwind CSS (styling)
- Vite (build tool)

**Module Structure**:
```
apps/web/
├── src/
│   ├── modules/
│   │   ├── auth/              # Authentication (login, register, password reset)
│   │   ├── game/              # Gameplay (game board, cards, controls)
│   │   ├── leaderboard/       # Leaderboards
│   │   ├── profile/           # User profile and settings
│   │   ├── subscription/      # Subscription management
│   │   └── dashboard/         # Home/dashboard
│   ├── shared/
│   │   ├── components/        # Shared UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Utility functions
│   │   └── graphql/           # GraphQL queries/mutations
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
└── vite.config.ts
```

**Key Features**:
- Responsive design (desktop, tablet, mobile)
- Authentication flows (login, register, social login, password reset)
- Game selection (theme, difficulty)
- Gameplay (card flipping, matching, timer, attempts)
- Leaderboards (filters, pagination)
- Profile management (settings, game history, achievements)
- Subscription management (view tiers, subscribe, manage)
- Rate limit indicators
- Error handling and loading states

**GraphQL Integration**:
- Apollo Client or urql
- Query caching with React Query
- Optimistic updates
- Error handling
- Authentication headers (JWT tokens)

**State Management**:
- React Query: Server state (API data)
- Context API: Global state (user, theme, settings)
- Local state: Component state

**Routing**:
- `/` - Home/Dashboard
- `/login` - Login
- `/register` - Register
- `/game` - Game selection
- `/game/play` - Gameplay
- `/leaderboard` - Leaderboards
- `/profile` - User profile
- `/subscription` - Subscription management
- `/settings` - User settings

**NFR Requirements**:
- Performance: < 3s initial load, < 1s navigation
- Accessibility: WCAG 2.1 AA compliance
- Responsive: Desktop, tablet, mobile browsers
- Testing: 70%+ coverage (unit + integration)
- SEO: Meta tags, sitemap

---

### Unit 10: Admin Dashboard
**Priority**: Low (Admin functionality)
**Estimated Effort**: 5-7 days
**Dependencies**: Admin Service, CMS Service

**Purpose**: Administrative dashboard for user and content management

**User Stories**: US-034 to US-038 (admin stories)

**Technology Stack**:
- React 18
- TypeScript
- React Query
- GraphQL Client
- React Router
- Tailwind CSS or Material-UI
- Recharts (analytics charts)

**Module Structure**:
```
apps/admin/
├── src/
│   ├── modules/
│   │   ├── users/             # User management
│   │   ├── themes/            # Theme management (CMS)
│   │   ├── subscriptions/     # Subscription management
│   │   ├── analytics/         # Analytics and reporting
│   │   └── audit/             # Audit logs
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── graphql/
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

**Key Features**:
- User search and management
- Theme creation and editing (CMS)
- Subscription management and refunds
- Analytics dashboard (charts, metrics)
- Audit log viewer
- Admin authentication (same as web app)

**Authorization**:
- Admin role required for all operations
- Role check on every page

**NFR Requirements**:
- Performance: < 3s initial load
- Security: Admin-only access
- Testing: 70%+ coverage

---

## Implementation Sequence

### Recommended Order
1. ✅ **Shared Components** (Complete)
2. ✅ **Infrastructure** (Core complete, remaining work can be done in parallel)
3. ✅ **Authentication Service** (Design complete)
4. **Game Service** (Core gameplay)
5. **Leaderboard Service** (Depends on Game Service)
6. **Payment Service** (Revenue critical)
7. **CMS Service** (Content management)
8. **Admin Service** (Admin operations)
9. **Web Frontend** (User-facing, depends on all backend services)
10. **Admin Dashboard** (Admin-facing, depends on Admin and CMS services)

### Parallel Work Opportunities
- **Infrastructure remaining work** can be done anytime
- **CMS Service** and **Admin Service** can be done in parallel
- **Web Frontend** and **Admin Dashboard** can be done in parallel (after backend services complete)

---

## Code Generation Templates

### Service Unit Template
Use this template for Units 4-8 (backend services):

**Step 1: Create Directory Structure**
```bash
mkdir -p services/{service-name}/src/{handlers,services,repositories,utils,types}
mkdir -p services/{service-name}/tests/{unit,integration,e2e}
```

**Step 2: Generate Package Files**
- `package.json`: Dependencies (aws-sdk, graphql, @memory-game/shared)
- `tsconfig.json`: TypeScript configuration
- `jest.config.js`: Test configuration

**Step 3: Implement Core Files**
- `src/index.ts`: Lambda handler
- `src/handlers/{service}.handler.ts`: GraphQL resolvers
- `src/services/{service}.service.ts`: Business logic
- `src/repositories/{entity}.repository.ts`: Data access
- `src/utils/validation.ts`: Input validation
- `src/utils/error-mapper.ts`: Error mapping

**Step 4: Write Tests**
- `tests/unit/`: Unit tests for all methods
- `tests/integration/`: Integration tests with mocked AWS
- `tests/e2e/`: End-to-end tests

**Step 5: Documentation**
- `README.md`: Service overview and setup
- `aidlc-docs/construction/{service}/code/implementation-summary.md`

### Frontend Unit Template
Use this template for Units 9-10 (frontend apps):

**Step 1: Create Vite Project**
```bash
npm create vite@latest apps/{app-name} -- --template react-ts
```

**Step 2: Install Dependencies**
```bash
cd apps/{app-name}
npm install @apollo/client graphql react-router-dom @tanstack/react-query
npm install -D tailwindcss postcss autoprefixer
```

**Step 3: Setup Project Structure**
```bash
mkdir -p src/{modules,shared/{components,hooks,utils,graphql}}
```

**Step 4: Implement Modules**
- Each module: components, hooks, GraphQL operations
- Shared: reusable components and utilities

**Step 5: Configure Routing**
- React Router setup
- Protected routes (authentication required)
- Admin routes (admin role required)

**Step 6: Write Tests**
- Unit tests: Components with React Testing Library
- Integration tests: User flows with MSW (Mock Service Worker)

---

## Testing Strategy

### Unit Tests
- **Coverage**: 80%+ for backend, 70%+ for frontend
- **Framework**: Jest + ts-jest
- **Mocking**: Mock all external dependencies
- **Pattern**: AAA (Arrange, Act, Assert)

### Integration Tests
- **Backend**: LocalStack for DynamoDB, mocked Cognito
- **Frontend**: MSW for API mocking
- **Focus**: Service integration, data flow

### E2E Tests
- **Backend**: Test against dev environment
- **Frontend**: Playwright or Cypress
- **Focus**: Critical user flows

### Load Tests
- **Tool**: Artillery or k6
- **Target**: 100 req/s sustained
- **Metrics**: Response time, error rate, throughput

---

## Deployment Strategy

### Backend Services (Lambda)
1. Build TypeScript to JavaScript
2. Package with dependencies
3. Deploy via CDK (Lambda Stack)
4. Configure environment variables
5. Set up CloudWatch alarms

### Frontend Apps (S3 + CloudFront)
1. Build production bundle (Vite)
2. Upload to S3 bucket
3. Invalidate CloudFront cache
4. Verify deployment

### Infrastructure (CDK)
1. Complete remaining stacks (Storage, Auth, API, Lambda, CDN, Monitoring)
2. Deploy to dev environment
3. Test all integrations
4. Deploy to staging
5. Load test
6. Deploy to production

---

## Estimated Timeline

### Remaining Work
- **Unit 4: Game Service**: 3-4 days
- **Unit 5: Leaderboard Service**: 2-3 days
- **Unit 6: Payment Service**: 4-5 days
- **Unit 7: CMS Service**: 3-4 days
- **Unit 8: Admin Service**: 3-4 days
- **Unit 9: Web Frontend**: 7-10 days
- **Unit 10: Admin Dashboard**: 5-7 days
- **Infrastructure Completion**: 2-3 days
- **Integration Testing**: 3-5 days
- **Deployment & DevOps**: 2-3 days

**Total Estimated Time**: 34-48 days (7-10 weeks)

### With Parallel Work
- Backend services (Units 4-8): 10-15 days (some parallel work)
- Frontend apps (Units 9-10): 10-15 days (parallel with backend)
- Infrastructure & DevOps: 5-8 days (parallel)

**Optimized Timeline**: 25-38 days (5-8 weeks)

---

## Next Steps

### Immediate Actions
1. **Review this roadmap** and adjust priorities if needed
2. **Complete Infrastructure Unit 2** (remaining CDK stacks)
3. **Generate code for Authentication Service** (Unit 3)
4. **Start Game Service** (Unit 4) following the established pattern

### Session Continuation
When continuing in a new session:
1. Reference this roadmap document
2. Start with the next unit in sequence
3. Follow the established patterns
4. Use the code generation templates
5. Maintain the same quality standards

### Quality Gates
Before marking a unit complete:
- [ ] All design documents generated
- [ ] All code files implemented
- [ ] 80%+ test coverage achieved
- [ ] Integration tests passing
- [ ] Documentation complete
- [ ] Deployed to dev environment
- [ ] Manual testing completed

---

## Success Criteria

### Project Complete When:
- [ ] All 10 units implemented and tested
- [ ] All 47 user stories covered
- [ ] Infrastructure deployed to all environments (dev, staging, prod)
- [ ] All services integrated and working
- [ ] Load testing passed (100 req/s)
- [ ] Security audit completed
- [ ] Documentation complete
- [ ] Production deployment successful

---

## Resources

### Documentation Locations
- **Requirements**: `aidlc-docs/inception/requirements/`
- **User Stories**: `aidlc-docs/inception/user-stories/`
- **Application Design**: `aidlc-docs/inception/application-design/`
- **Unit Designs**: `aidlc-docs/construction/{unit-name}/`
- **Code**: `packages/`, `services/`, `apps/`, `infrastructure/`

### Key Reference Documents
- `aidlc-docs/inception/requirements/requirements.md` - Complete requirements
- `aidlc-docs/inception/user-stories/stories.md` - All 47 user stories
- `aidlc-docs/inception/application-design/unit-of-work.md` - Unit definitions
- `aidlc-docs/construction/auth-service/` - Service pattern reference
- `aidlc-docs/construction/infrastructure/` - Infrastructure reference

---

## Conclusion

This roadmap provides a complete blueprint for finishing the Memory Game project. All patterns are established, all designs are documented, and the path forward is clear. Follow the established patterns, maintain quality standards, and the project will be successfully completed.

**Current Progress**: 30% complete (3 of 10 units)
**Remaining Work**: 7 units + infrastructure completion + integration
**Estimated Time**: 5-10 weeks with focused effort
**Success Probability**: High (clear patterns, complete documentation)

Good luck with the remaining implementation! 🚀

