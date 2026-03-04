# Application Components

## Overview
This document defines the high-level components for the memory game web application, organized by layer and functional domain.

---

## Frontend Components (React Web Application)

### Feature Module: Authentication
**Purpose**: Handle user registration, login, and session management

**Components**:
- **AuthContainer** (Container)
  - Manages authentication state and logic
  - Handles Cognito integration
  - Manages session tokens
  
- **LoginForm** (Presentational)
  - Email/password login UI
  - Social login buttons (Google, Apple, Facebook)
  - Form validation and error display
  
- **RegisterForm** (Presentational)
  - User registration UI
  - Email verification flow
  - Password strength indicator
  
- **PasswordResetForm** (Presentational)
  - Password reset request UI
  - Reset confirmation flow

**Responsibilities**:
- User authentication flows
- Session management
- Token refresh handling
- Social provider integration

---

### Feature Module: Game
**Purpose**: Core gameplay experience and game mechanics

**Components**:
- **GameContainer** (Container)
  - Manages game state (cards, matches, timer, attempts)
  - Handles game logic and validation
  - Communicates with backend for game completion
  
- **GameBoard** (Presentational)
  - Renders game grid
  - Displays cards in layout
  - Handles card flip animations
  
- **Card** (Presentational)
  - Individual card component
  - Flip animation
  - Match/no-match states
  
- **GameControls** (Presentational)
  - Start/pause/exit buttons
  - Audio controls
  - Timer display
  - Attempt counter
  
- **GameCompletionModal** (Presentational)
  - Completion screen
  - Score display
  - Next action buttons (play again, view leaderboard, etc.)
  
- **ThemeSelector** (Presentational)
  - Theme browsing and selection
  - Theme preview
  - Locked theme indicators
  
- **DifficultySelector** (Presentational)
  - Difficulty level selection
  - Tier-based restrictions display

**Responsibilities**:
- Game state management
- Card matching logic
- Timer and attempt tracking
- Game completion handling
- Theme and difficulty selection

---

### Feature Module: Leaderboard
**Purpose**: Display rankings and competitive features

**Components**:
- **LeaderboardContainer** (Container)
  - Fetches leaderboard data via GraphQL
  - Manages filters (theme, difficulty, time period)
  - Handles pagination
  
- **LeaderboardTable** (Presentational)
  - Displays rankings
  - Highlights user's rank
  - Shows player stats
  
- **LeaderboardFilters** (Presentational)
  - Theme filter dropdown
  - Difficulty filter dropdown
  - Time period selector (daily/weekly/monthly/all-time)

**Responsibilities**:
- Leaderboard data fetching and display
- Filter management
- User rank highlighting

---

### Feature Module: Profile
**Purpose**: User profile and settings management

**Components**:
- **ProfileContainer** (Container)
  - Manages user profile data
  - Handles profile updates
  - Manages settings
  
- **ProfileView** (Presentational)
  - Displays user information
  - Shows subscription tier
  - Displays achievements and badges
  
- **ProfileEditForm** (Presentational)
  - Edit name and profile picture
  - Email change flow
  
- **SettingsPanel** (Presentational)
  - Audio settings
  - Notification preferences
  - Theme (light/dark mode)
  - Language selection
  
- **GameHistoryList** (Presentational)
  - Past games display
  - Filters and sorting
  - Performance statistics
  
- **AchievementsList** (Presentational)
  - Earned badges display
  - Achievement progress
  - Locked achievements

**Responsibilities**:
- Profile data management
- Settings persistence
- Game history display
- Achievement tracking

---

### Feature Module: Subscription
**Purpose**: Subscription management and payment processing

**Components**:
- **SubscriptionContainer** (Container)
  - Manages subscription state
  - Handles Stripe integration
  - Processes tier changes
  
- **TierComparisonTable** (Presentational)
  - Displays all subscription tiers
  - Feature comparison
  - Pricing display (monthly/annual)
  
- **SubscriptionManagement** (Presentational)
  - Current subscription display
  - Upgrade/downgrade options
  - Cancellation flow
  - Billing history
  
- **StripeCheckout** (Presentational)
  - Stripe payment form integration
  - Payment confirmation

**Responsibilities**:
- Subscription tier management
- Payment processing
- Billing history display
- Tier upgrade/downgrade flows

---

### Feature Module: Home/Dashboard
**Purpose**: Main landing page and navigation hub

**Components**:
- **DashboardContainer** (Container)
  - Aggregates user data
  - Manages navigation state
  
- **DashboardView** (Presentational)
  - Welcome message
  - Quick stats (games remaining, recent scores)
  - Quick action buttons (play game, view leaderboard)
  
- **RateLimitIndicator** (Presentational)
  - Games remaining display
  - Reset timer
  - Upgrade prompt for free users

**Responsibilities**:
- User dashboard display
- Quick navigation
- Rate limit visibility

---

### Shared/Common Components
**Purpose**: Reusable UI components across features

**Components**:
- **Layout**
  - Header with navigation
  - Footer
  - Sidebar (if applicable)
  
- **Button**
  - Primary, secondary, tertiary variants
  - Loading states
  - Disabled states
  
- **Modal**
  - Generic modal wrapper
  - Confirmation dialogs
  
- **LoadingSpinner**
  - Loading indicator
  
- **ErrorBoundary**
  - Error handling and display
  
- **Toast/Notification**
  - Success/error/info notifications
  
- **Form Components**
  - Input fields
  - Dropdowns
  - Checkboxes
  - Radio buttons

**Responsibilities**:
- Consistent UI patterns
- Reusable components
- Error handling
- Loading states

---

## Backend Components (AWS Lambda Services)

### Service: Authentication Service
**Purpose**: User authentication and authorization

**Components**:
- **AuthHandler**
  - GraphQL resolvers for auth operations
  - Cognito integration
  - Token management
  
- **UserRepository**
  - User data access layer
  - DynamoDB operations for user records
  
- **SessionManager**
  - Session validation
  - Token refresh logic

**Responsibilities**:
- User registration and login
- Social provider integration
- Session management
- Password reset flows

---

### Service: Game Service
**Purpose**: Game logic and gameplay management

**Components**:
- **GameHandler**
  - GraphQL resolvers for game operations
  - Game validation
  - Score calculation
  
- **GameRepository**
  - Game data access layer
  - DynamoDB operations for game records
  
- **RateLimiter**
  - Tier-based rate limiting
  - Usage tracking
  - Limit enforcement

**Responsibilities**:
- Game creation and completion
- Score calculation and validation
- Rate limiting enforcement
- Game history logging (paid users)

---

### Service: Leaderboard Service
**Purpose**: Leaderboard management and rankings

**Components**:
- **LeaderboardHandler**
  - GraphQL resolvers for leaderboard queries
  - Ranking calculations
  - Filter processing
  
- **LeaderboardRepository**
  - Leaderboard data access layer
  - DynamoDB GSI queries for rankings
  - Pagination handling

**Responsibilities**:
- Leaderboard queries and rankings
- Score aggregation
- Time period filtering
- User rank calculation

---

### Service: Payment Service
**Purpose**: Subscription and payment management

**Components**:
- **PaymentHandler**
  - GraphQL resolvers for subscription operations
  - Stripe webhook handling
  - Subscription state management
  
- **SubscriptionRepository**
  - Subscription data access layer
  - DynamoDB operations for subscription records
  
- **StripeClient**
  - Stripe API integration
  - Payment processing
  - Webhook verification

**Responsibilities**:
- Subscription creation and management
- Payment processing
- Tier upgrades/downgrades
- Subscription cancellation
- Webhook handling

---

### Service: Admin Service
**Purpose**: Administrative operations and system management

**Components**:
- **AdminHandler**
  - GraphQL resolvers for admin operations
  - User management
  - Analytics queries
  
- **UserManagementRepository**
  - Admin user data access
  - User search and filtering
  
- **AnalyticsRepository**
  - Analytics data aggregation
  - Metrics calculation

**Responsibilities**:
- User account management
- Subscription modifications
- Analytics and reporting
- System monitoring

---

### Service: CMS Service
**Purpose**: Content management for themes

**Components**:
- **CMSHandler**
  - GraphQL resolvers for CMS operations
  - Theme CRUD operations
  - Image upload handling
  
- **ThemeRepository**
  - Theme data access layer
  - DynamoDB operations for theme metadata
  
- **S3Manager**
  - S3 upload/download operations
  - Image processing
  - CloudFront invalidation

**Responsibilities**:
- Theme creation and management
- Image upload and storage
- Theme publishing workflow
- Content versioning

---

### Shared/Common Backend Components
**Purpose**: Reusable backend utilities and services

**Components**:
- **GraphQLSchema**
  - GraphQL type definitions
  - Query and mutation definitions
  - Subscription definitions (if needed)
  
- **AuthMiddleware**
  - JWT validation
  - Cognito token verification
  - Authorization checks
  
- **ErrorHandler**
  - Centralized error handling
  - Error logging
  - Error response formatting
  
- **Logger**
  - Structured logging
  - CloudWatch integration
  - Security event logging
  
- **Validator**
  - Input validation
  - Schema validation
  - Sanitization
  
- **DynamoDBClient**
  - DynamoDB connection management
  - Query/scan utilities
  - Transaction helpers

**Responsibilities**:
- Cross-cutting concerns
- Shared utilities
- Common patterns
- Error handling and logging

---

## Admin Dashboard Components (Separate React Application)

### Feature Module: Admin Authentication
**Purpose**: Admin-specific authentication with MFA

**Components**:
- **AdminAuthContainer** (Container)
  - Admin login with MFA
  - Session management
  
- **AdminLoginForm** (Presentational)
  - Admin credentials input
  - MFA code input

**Responsibilities**:
- Admin authentication
- MFA enforcement
- Admin session management

---

### Feature Module: User Management
**Purpose**: User account administration

**Components**:
- **UserManagementContainer** (Container)
  - User search and filtering
  - User actions (suspend, reset password, etc.)
  
- **UserSearchPanel** (Presentational)
  - Search interface
  - Filter options
  
- **UserDetailsView** (Presentational)
  - User information display
  - Subscription details
  - Game history
  - Action buttons

**Responsibilities**:
- User search and management
- Account modifications
- User support actions

---

### Feature Module: Content Management
**Purpose**: Theme and content administration

**Components**:
- **ThemeManagementContainer** (Container)
  - Theme CRUD operations
  - Image upload handling
  
- **ThemeListView** (Presentational)
  - All themes display
  - Status indicators
  
- **ThemeEditorForm** (Presentational)
  - Theme creation/editing
  - Image upload
  - Pair definition
  
- **ThemePreview** (Presentational)
  - Theme preview before publishing

**Responsibilities**:
- Theme content management
- Image uploads
- Theme publishing

---

### Feature Module: Analytics Dashboard
**Purpose**: System analytics and metrics

**Components**:
- **AnalyticsDashboardContainer** (Container)
  - Metrics data fetching
  - Date range management
  
- **MetricsOverview** (Presentational)
  - Key metrics display (DAU, MAU, revenue, etc.)
  - Charts and graphs
  
- **RevenueAnalytics** (Presentational)
  - Revenue metrics
  - Subscription breakdown
  
- **EngagementAnalytics** (Presentational)
  - User engagement metrics
  - Theme popularity
  - Retention cohorts

**Responsibilities**:
- Analytics data display
- Metrics visualization
- Report generation

---

## Component Summary

**Frontend (Main Web App)**:
- 7 feature modules (Auth, Game, Leaderboard, Profile, Subscription, Home, Shared)
- ~35 components total

**Backend Services**:
- 6 domain services (Auth, Game, Leaderboard, Payment, Admin, CMS)
- Shared utilities and middleware
- ~25 components total

**Admin Dashboard (Separate App)**:
- 4 feature modules (Admin Auth, User Management, Content Management, Analytics)
- ~15 components total

**Total Components**: ~75 components across all layers
