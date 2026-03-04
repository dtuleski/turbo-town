# Units of Work

## Overview
This document defines the units of work for the memory game web application. The system is decomposed into 9 independent units organized as microservices in a monorepo structure.

**Deployment Model**: Independent microservices (each service deployed separately)
**Code Organization**: Monorepo with shared workspace packages
**Development Sequence**: Core services first (Auth, Game), then supporting services

---

## Unit Definitions

### Unit 1: Web Frontend
**Type**: Frontend Application
**Technology**: React, TypeScript, React Query, GraphQL Client
**Deployment**: Static hosting (S3 + CloudFront)

**Purpose**: User-facing web application with responsive design

**Responsibilities**:
- User interface for all user-facing features
- Client-side game logic and rendering
- State management (React Query + Context)
- GraphQL API integration
- Responsive design (desktop, tablet, mobile browsers)

**Components** (from application design):
- Authentication Module (AuthContainer, LoginForm, RegisterForm, PasswordResetForm)
- Game Module (GameContainer, GameBoard, Card, GameControls, GameCompletionModal, ThemeSelector, DifficultySelector)
- Leaderboard Module (LeaderboardContainer, LeaderboardTable, LeaderboardFilters)
- Profile Module (ProfileContainer, ProfileView, ProfileEditForm, SettingsPanel, GameHistoryList, AchievementsList)
- Subscription Module (SubscriptionContainer, TierComparisonTable, SubscriptionManagement, StripeCheckout)
- Home/Dashboard Module (DashboardContainer, DashboardView, RateLimitIndicator)
- Shared Components (Layout, Button, Modal, LoadingSpinner, ErrorBoundary, Toast, Form Components)

**Dependencies**:
- Shared Components unit (types, models, utilities)
- All backend services via GraphQL API
- AWS Cognito for authentication
- Stripe.js for payment forms

**Estimated Complexity**: High (35 components, complex state management, responsive design)

---

### Unit 2: Authentication Service
**Type**: Backend Microservice
**Technology**: Node.js, TypeScript, GraphQL, AWS Lambda, DynamoDB
**Deployment**: Independent Lambda function with API Gateway

**Purpose**: User authentication, authorization, and session management

**Responsibilities**:
- User registration (email/password and social)
- User login and token generation
- Session management and token refresh
- Password reset flows
- Email verification
- User profile management
- Integration with AWS Cognito

**Components** (from application design):
- AuthHandler (GraphQL resolvers)
- UserRepository (data access layer)
- SessionManager (session validation)

**GraphQL Operations**:
- Mutations: register, login, loginWithSocial, logout, requestPasswordReset, confirmPasswordReset, refreshToken
- Queries: getCurrentUser, verifyEmail

**Dependencies**:
- Shared Components unit (types, models, utilities)
- AWS Cognito User Pools
- DynamoDB (Users table)

**Estimated Complexity**: Medium (core service, well-defined patterns)

---

### Unit 3: Game Service
**Type**: Backend Microservice
**Technology**: Node.js, TypeScript, GraphQL, AWS Lambda, DynamoDB
**Deployment**: Independent Lambda function with API Gateway

**Purpose**: Game logic, gameplay management, and rate limiting

**Responsibilities**:
- Game creation and initialization
- Game completion and validation
- Score calculation
- Rate limit enforcement (tier-based)
- Game history logging (paid users only)
- Integration with Leaderboard Service for score updates

**Components** (from application design):
- GameHandler (GraphQL resolvers)
- GameRepository (data access layer)
- RateLimiter (rate limiting logic)

**GraphQL Operations**:
- Mutations: startGame, completeGame
- Queries: getGame, getGameHistory, getUserStatistics, canStartGame

**Dependencies**:
- Shared Components unit (types, models, utilities)
- Authentication Service (user validation)
- Leaderboard Service (score updates)
- DynamoDB (Games, RateLimits tables)

**Estimated Complexity**: High (complex business logic, rate limiting, score calculation)

---

### Unit 4: Leaderboard Service
**Type**: Backend Microservice
**Technology**: Node.js, TypeScript, GraphQL, AWS Lambda, DynamoDB
**Deployment**: Independent Lambda function with API Gateway

**Purpose**: Leaderboard management, rankings, and score aggregation

**Responsibilities**:
- Leaderboard queries with filters (theme, difficulty, time period)
- User rank calculation
- Score aggregation
- Pagination
- Multiple leaderboards (by theme AND difficulty)
- Time period support (daily, weekly, monthly, all-time)

**Components** (from application design):
- LeaderboardHandler (GraphQL resolvers)
- LeaderboardRepository (data access layer with GSI queries)

**GraphQL Operations**:
- Queries: getLeaderboard, getUserRank, getTopPlayers

**Dependencies**:
- Shared Components unit (types, models, utilities)
- Authentication Service (user validation)
- DynamoDB (Leaderboards table with GSI)

**Estimated Complexity**: Medium (complex queries, GSI optimization)

---

### Unit 5: Payment Service
**Type**: Backend Microservice
**Technology**: Node.js, TypeScript, GraphQL, AWS Lambda, DynamoDB
**Deployment**: Independent Lambda function with API Gateway + Webhook Lambda

**Purpose**: Subscription management and payment processing

**Responsibilities**:
- Subscription creation (Stripe Checkout)
- Tier upgrades/downgrades
- Subscription cancellation
- Payment method updates
- Webhook processing (subscription events)
- Integration with Stripe API

**Components** (from application design):
- PaymentHandler (GraphQL resolvers)
- SubscriptionRepository (data access layer)
- StripeClient (Stripe API integration)

**GraphQL Operations**:
- Mutations: createSubscription, upgradeSubscription, downgradeSubscription, cancelSubscription, reactivateSubscription, updatePaymentMethod
- Queries: getSubscription, getSubscriptionTiers, getBillingHistory
- Webhooks: handleStripeWebhook

**Dependencies**:
- Shared Components unit (types, models, utilities)
- Authentication Service (user validation)
- Game Service (rate limit updates)
- Stripe API
- DynamoDB (Subscriptions table)

**Estimated Complexity**: High (Stripe integration, webhook handling, subscription state management)

---

### Unit 6: Admin Service
**Type**: Backend Microservice
**Technology**: Node.js, TypeScript, GraphQL, AWS Lambda, DynamoDB
**Deployment**: Independent Lambda function with API Gateway

**Purpose**: Administrative operations, user management, and analytics

**Responsibilities**:
- User search and management
- Subscription modifications
- Refund processing
- Analytics and reporting
- System monitoring
- Audit logging

**Components** (from application design):
- AdminHandler (GraphQL resolvers)
- UserManagementRepository (data access layer)
- AnalyticsRepository (metrics aggregation)

**GraphQL Operations**:
- Mutations: suspendUser, unsuspendUser, resetUserPassword, modifyUserSubscription, issueRefund
- Queries: searchUsers, getUserDetails, getUserGameHistory, getUserPaymentHistory, getDashboardMetrics, getUserMetrics, getRevenueMetrics, getEngagementMetrics

**Dependencies**:
- Shared Components unit (types, models, utilities)
- Authentication Service (admin role validation)
- All other services (data aggregation)
- Stripe API (refunds, subscription modifications)
- DynamoDB (all tables)
- CloudWatch (metrics)

**Estimated Complexity**: Medium (aggregation logic, admin operations)

---

### Unit 7: CMS Service
**Type**: Backend Microservice
**Technology**: Node.js, TypeScript, GraphQL, AWS Lambda, DynamoDB, S3
**Deployment**: Independent Lambda function with API Gateway

**Purpose**: Theme content management and publishing

**Responsibilities**:
- Theme CRUD operations
- Image upload and management
- Theme publishing workflow
- Content versioning
- S3 storage management
- CloudFront cache invalidation

**Components** (from application design):
- CMSHandler (GraphQL resolvers)
- ThemeRepository (data access layer)
- S3Manager (S3 operations)

**GraphQL Operations**:
- Mutations: createTheme, updateTheme, deleteTheme, publishTheme, unpublishTheme, uploadThemeImage
- Queries: getTheme, listThemes, getPublishedThemes

**Dependencies**:
- Shared Components unit (types, models, utilities)
- Authentication Service (content manager role validation)
- S3 (image storage)
- CloudFront (CDN)
- DynamoDB (Themes table)

**Estimated Complexity**: Medium (S3 integration, image handling)

---

### Unit 8: Admin Dashboard
**Type**: Frontend Application
**Technology**: React, TypeScript, GraphQL Client
**Deployment**: Static hosting (S3 + CloudFront) - separate from main web app

**Purpose**: Administrative interface for system management

**Responsibilities**:
- Admin authentication with MFA
- User management interface
- Content management interface (CMS)
- Analytics dashboards
- System monitoring

**Components** (from application design):
- Admin Auth Module (AdminAuthContainer, AdminLoginForm)
- User Management Module (UserManagementContainer, UserSearchPanel, UserDetailsView)
- Content Management Module (ThemeManagementContainer, ThemeListView, ThemeEditorForm, ThemePreview)
- Analytics Module (AnalyticsDashboardContainer, MetricsOverview, RevenueAnalytics, EngagementAnalytics)

**Dependencies**:
- Shared Components unit (types, models, utilities)
- Admin Service via GraphQL API
- CMS Service via GraphQL API
- AWS Cognito for admin authentication

**Estimated Complexity**: Medium (15 components, admin-specific features)

---

### Unit 9: Infrastructure
**Type**: Infrastructure as Code
**Technology**: AWS CDK (TypeScript) or Terraform
**Deployment**: CloudFormation stacks

**Purpose**: AWS infrastructure provisioning and configuration

**Responsibilities**:
- DynamoDB table definitions
- Lambda function configurations
- API Gateway setup
- S3 bucket configurations
- CloudFront distributions
- VPC and networking
- IAM roles and policies
- CloudWatch alarms and dashboards
- Cognito User Pool configuration

**Resources**:
- DynamoDB Tables: Users, Games, Leaderboards, Subscriptions, Themes, Achievements, RateLimits
- Lambda Functions: One per backend service
- API Gateway: Single GraphQL endpoint
- S3 Buckets: Theme images, user assets
- CloudFront: CDN distributions
- Cognito: User Pool with social providers
- CloudWatch: Log groups, alarms, dashboards
- IAM: Roles and policies for all services

**Dependencies**:
- None (foundational unit)

**Estimated Complexity**: High (comprehensive AWS infrastructure)

---

### Unit 10: Shared Components
**Type**: Shared Library
**Technology**: TypeScript
**Deployment**: Workspace package in monorepo

**Purpose**: Common code shared across all units

**Responsibilities**:
- TypeScript type definitions
- GraphQL schema types
- Data models (User, Game, Leaderboard, Subscription, Theme, etc.)
- Utility functions
- Constants and enums
- Validation schemas
- Error types

**Contents**:
- `/types` - TypeScript interfaces and types
- `/models` - Data models
- `/utils` - Utility functions
- `/constants` - Application constants
- `/validators` - Validation schemas
- `/errors` - Error classes

**Dependencies**:
- None (foundational unit)

**Estimated Complexity**: Low (shared code, no business logic)

---

## Code Organization Strategy

### Monorepo Structure

```
memory-game/
├── packages/
│   ├── web-frontend/              # Unit 1: Web Frontend
│   │   ├── src/
│   │   │   ├── features/          # Feature modules
│   │   │   │   ├── auth/
│   │   │   │   ├── game/
│   │   │   │   ├── leaderboard/
│   │   │   │   ├── profile/
│   │   │   │   ├── subscription/
│   │   │   │   └── home/
│   │   │   ├── components/        # Shared UI components
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── graphql/           # GraphQL queries/mutations
│   │   │   └── App.tsx
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── auth-service/              # Unit 2: Authentication Service
│   │   ├── src/
│   │   │   ├── handlers/          # GraphQL resolvers
│   │   │   ├── repositories/      # Data access layer
│   │   │   ├── services/          # Business logic
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── game-service/              # Unit 3: Game Service
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── leaderboard-service/       # Unit 4: Leaderboard Service
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   ├── repositories/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── payment-service/           # Unit 5: Payment Service
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   ├── webhooks/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── admin-service/             # Unit 6: Admin Service
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   ├── repositories/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cms-service/               # Unit 7: CMS Service
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── admin-dashboard/           # Unit 8: Admin Dashboard
│   │   ├── src/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── content/
│   │   │   │   └── analytics/
│   │   │   ├── components/
│   │   │   └── App.tsx
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── infrastructure/            # Unit 9: Infrastructure
│   │   ├── lib/
│   │   │   ├── database-stack.ts
│   │   │   ├── api-stack.ts
│   │   │   ├── storage-stack.ts
│   │   │   ├── auth-stack.ts
│   │   │   └── monitoring-stack.ts
│   │   ├── bin/
│   │   │   └── app.ts
│   │   ├── package.json
│   │   └── cdk.json
│   │
│   └── shared/                    # Unit 10: Shared Components
│       ├── src/
│       │   ├── types/
│       │   ├── models/
│       │   ├── utils/
│       │   ├── constants/
│       │   ├── validators/
│       │   └── errors/
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                   # Root package.json (workspace config)
├── tsconfig.json                  # Root TypeScript config
├── .gitignore
└── README.md
```

### Naming Conventions

**Packages**: kebab-case (e.g., `auth-service`, `web-frontend`)
**Directories**: kebab-case (e.g., `user-management`, `game-logic`)
**Files**: kebab-case (e.g., `auth-handler.ts`, `user-repository.ts`)
**Classes**: PascalCase (e.g., `AuthHandler`, `UserRepository`)
**Functions**: camelCase (e.g., `validateToken`, `calculateScore`)
**Constants**: UPPER_SNAKE_CASE (e.g., `MAX_GAMES_PER_DAY`, `API_VERSION`)

---

## Development Sequence

### Phase 1: Foundation (Weeks 1-2)
**Priority**: Critical path - must be completed first

1. **Shared Components** (Unit 10)
   - Establish types, models, and utilities
   - All other units depend on this
   - Estimated: 1 week

2. **Infrastructure** (Unit 9)
   - Provision AWS resources
   - Set up development environment
   - Estimated: 1 week

### Phase 2: Core Services (Weeks 3-6)
**Priority**: High - establishes foundation for all features

3. **Authentication Service** (Unit 2)
   - User registration and login
   - Session management
   - Prerequisite for all other services
   - Estimated: 2 weeks

4. **Game Service** (Unit 3)
   - Game logic and validation
   - Rate limiting
   - Core business logic
   - Estimated: 2 weeks

### Phase 3: Supporting Services (Weeks 7-10)
**Priority**: Medium - can be developed in parallel

5. **Leaderboard Service** (Unit 4)
   - Depends on Game Service
   - Can be developed in parallel with Payment Service
   - Estimated: 1 week

6. **Payment Service** (Unit 5)
   - Stripe integration
   - Subscription management
   - Can be developed in parallel with Leaderboard Service
   - Estimated: 2 weeks

7. **CMS Service** (Unit 7)
   - Theme management
   - Can be developed in parallel with other services
   - Estimated: 1 week

### Phase 4: Frontend Applications (Weeks 11-14)
**Priority**: High - user-facing applications

8. **Web Frontend** (Unit 1)
   - Depends on all backend services
   - Main user-facing application
   - Estimated: 3 weeks

9. **Admin Dashboard** (Unit 8)
   - Depends on Admin Service and CMS Service
   - Can be developed in parallel with Web Frontend
   - Estimated: 2 weeks

### Phase 5: Admin Service (Weeks 13-14)
**Priority**: Medium - can be developed late

10. **Admin Service** (Unit 6)
    - Aggregates data from all services
    - Can be developed after other services are stable
    - Estimated: 1 week

### Parallel Development Opportunities

**Can be developed simultaneously**:
- Leaderboard Service + Payment Service + CMS Service (Phase 3)
- Web Frontend + Admin Dashboard (Phase 4)

**Critical Path**:
Shared Components → Infrastructure → Auth Service → Game Service → Web Frontend

**Total Estimated Duration**: 14 weeks (with parallel development)

---

## Unit Summary

**Total Units**: 10 units

**By Type**:
- Frontend Applications: 2 (Web Frontend, Admin Dashboard)
- Backend Microservices: 6 (Auth, Game, Leaderboard, Payment, Admin, CMS)
- Infrastructure: 1 (AWS CDK/Terraform)
- Shared Library: 1 (Shared Components)

**By Complexity**:
- High: 4 units (Web Frontend, Game Service, Payment Service, Infrastructure)
- Medium: 5 units (Auth Service, Leaderboard Service, Admin Service, CMS Service, Admin Dashboard)
- Low: 1 unit (Shared Components)

**Deployment Model**: Independent microservices with monorepo organization

**Development Approach**: Core-first with parallel development opportunities
