# Unit of Work Story Mapping

## Overview
This document maps all 47 user stories to their corresponding units of work. Some stories span multiple units and require coordination.

---

## Story-to-Unit Mapping Summary

| Unit | Story Count | Story IDs |
|------|-------------|-----------|
| Web Frontend | 28 | US-001 to US-029 (user-facing stories) |
| Auth Service | 5 | US-001, US-002, US-003, US-004, US-029 |
| Game Service | 8 | US-006, US-007, US-008, US-009, US-010, US-011, US-012, US-015, US-016 |
| Leaderboard Service | 2 | US-017, US-018 |
| Payment Service | 5 | US-020, US-021, US-022, US-023, US-024 |
| Admin Service | 4 | US-030, US-031, US-032, US-033 |
| CMS Service | 3 | US-034, US-035, US-036 |
| Admin Dashboard | 7 | US-030 to US-036 (admin-facing stories) |
| Infrastructure | 11 | US-037 to US-047 (NFR technical stories) |
| Shared Components | 0 | (Foundational, no direct stories) |

**Note**: Many stories span multiple units (frontend + backend service)

---

## Detailed Story Mapping

### Epic 1: Account Creation and Onboarding Journey

#### US-001: User Registration with Email/Password
**Primary Unit**: Auth Service
**Supporting Units**: Web Frontend
**Implementation**:
- Auth Service: Registration logic, Cognito integration, email verification
- Web Frontend: Registration form UI, validation, error handling

#### US-002: User Registration with Social Login
**Primary Unit**: Auth Service
**Supporting Units**: Web Frontend
**Implementation**:
- Auth Service: Social provider integration (Google, Apple, Facebook)
- Web Frontend: Social login buttons, OAuth flow handling

#### US-003: User Login
**Primary Unit**: Auth Service
**Supporting Units**: Web Frontend
**Implementation**:
- Auth Service: Login validation, token generation, session management
- Web Frontend: Login form UI, token storage, session handling

#### US-004: Password Reset
**Primary Unit**: Auth Service
**Supporting Units**: Web Frontend
**Implementation**:
- Auth Service: Password reset flow, email sending, token validation
- Web Frontend: Password reset request form, reset confirmation form

#### US-005: Free Tier Onboarding
**Primary Unit**: Web Frontend
**Supporting Units**: None
**Implementation**:
- Web Frontend: Onboarding tutorial, feature explanation, skip functionality

---

### Epic 2: Game Discovery and Selection Journey

#### US-006: View Available Themes (Free User)
**Primary Unit**: Game Service
**Supporting Units**: Web Frontend, CMS Service
**Implementation**:
- CMS Service: Theme data retrieval
- Game Service: Theme availability based on user tier
- Web Frontend: Theme display, locked theme indicators

#### US-007: View Available Themes (Paid User)
**Primary Unit**: Game Service
**Supporting Units**: Web Frontend, CMS Service
**Implementation**:
- CMS Service: All themes retrieval
- Game Service: Theme filtering and sorting
- Web Frontend: Theme browsing UI, preview display

#### US-008: Select Game Difficulty
**Primary Unit**: Game Service
**Supporting Units**: Web Frontend
**Implementation**:
- Game Service: Difficulty validation based on tier
- Web Frontend: Difficulty selector UI, tier restrictions display

---

### Epic 3: Gameplay Experience Journey

#### US-009: Start New Game
**Primary Unit**: Game Service
**Supporting Units**: Web Frontend
**Implementation**:
- Game Service: Game initialization, rate limit check
- Web Frontend: Game board rendering, timer start

#### US-010: Flip and Match Cards
**Primary Unit**: Web Frontend
**Supporting Units**: None (client-side logic)
**Implementation**:
- Web Frontend: Card flip animations, match detection, attempt tracking

#### US-011: Complete Game
**Primary Unit**: Game Service
**Supporting Units**: Web Frontend, Leaderboard Service
**Implementation**:
- Web Frontend: Game completion detection, results display
- Game Service: Score calculation, game record saving, validation
- Leaderboard Service: Score update (paid users)

#### US-012: Abandon Game
**Primary Unit**: Web Frontend
**Supporting Units**: None
**Implementation**:
- Web Frontend: Exit confirmation, game state cleanup

#### US-013: Audio Controls During Gameplay
**Primary Unit**: Web Frontend
**Supporting Units**: None
**Implementation**:
- Web Frontend: Audio toggle controls, settings persistence

#### US-014: Automatic Difficulty Progression
**Primary Unit**: Game Service
**Supporting Units**: Web Frontend
**Implementation**:
- Game Service: Performance analysis, difficulty suggestion logic
- Web Frontend: Suggestion prompt display

---

### Epic 4: Rate Limiting and Access Control Journey

#### US-015: Free Tier Rate Limiting
**Primary Unit**: Game Service
**Supporting Units**: Web Frontend
**Implementation**:
- Game Service: Rate limit enforcement, counter management
- Web Frontend: Games remaining display, upgrade prompts

#### US-016: Paid Tier Rate Limiting
**Primary Unit**: Game Service
**Supporting Units**: Web Frontend, Payment Service
**Implementation**:
- Game Service: Tier-based rate limiting
- Payment Service: Tier information
- Web Frontend: Usage display

---

### Epic 5: Leaderboard and Competition Journey

#### US-017: View Leaderboards (Paid Users Only)
**Primary Unit**: Leaderboard Service
**Supporting Units**: Web Frontend
**Implementation**:
- Leaderboard Service: Leaderboard queries, filtering, pagination
- Web Frontend: Leaderboard display, filters, user rank highlighting

#### US-018: Leaderboard Score Calculation
**Primary Unit**: Leaderboard Service
**Supporting Units**: Game Service
**Implementation**:
- Game Service: Score calculation on game completion
- Leaderboard Service: Score storage, ranking updates

---

### Epic 6: Achievement and Rewards Journey

#### US-019: Earn Achievements (Paid Users Only)
**Primary Unit**: Game Service
**Supporting Units**: Web Frontend
**Implementation**:
- Game Service: Achievement tracking, progress calculation
- Web Frontend: Achievement notifications, badge display

---

### Epic 7: Subscription and Payment Journey

#### US-020: View Subscription Tiers
**Primary Unit**: Payment Service
**Supporting Units**: Web Frontend
**Implementation**:
- Payment Service: Tier definitions, pricing information
- Web Frontend: Tier comparison display

#### US-021: Purchase Subscription
**Primary Unit**: Payment Service
**Supporting Units**: Web Frontend
**Implementation**:
- Payment Service: Stripe Checkout session creation, webhook handling
- Web Frontend: Stripe integration, payment flow

#### US-022: Upgrade/Downgrade Subscription
**Primary Unit**: Payment Service
**Supporting Units**: Web Frontend, Game Service
**Implementation**:
- Payment Service: Subscription modification, prorated billing
- Game Service: Rate limit updates
- Web Frontend: Upgrade/downgrade UI

#### US-023: Cancel Subscription
**Primary Unit**: Payment Service
**Supporting Units**: Web Frontend
**Implementation**:
- Payment Service: Subscription cancellation, grace period handling
- Web Frontend: Cancellation confirmation, effective date display

#### US-024: Subscription Management UI
**Primary Unit**: Payment Service
**Supporting Units**: Web Frontend
**Implementation**:
- Payment Service: Subscription data, billing history
- Web Frontend: Subscription management interface

---

### Epic 8: Game History and Statistics Journey

#### US-025: View Game History (Paid Users Only)
**Primary Unit**: Game Service
**Supporting Units**: Web Frontend
**Implementation**:
- Game Service: Game history retrieval, filtering, sorting
- Web Frontend: History display, filters

#### US-026: View Performance Statistics (Paid Users Only)
**Primary Unit**: Game Service
**Supporting Units**: Web Frontend
**Implementation**:
- Game Service: Statistics calculation, aggregation
- Web Frontend: Statistics display, charts

---

### Epic 9: Profile and Settings Journey

#### US-027: View and Edit Profile
**Primary Unit**: Auth Service
**Supporting Units**: Web Frontend
**Implementation**:
- Auth Service: Profile data management, updates
- Web Frontend: Profile display, edit forms

#### US-028: Manage Settings
**Primary Unit**: Web Frontend
**Supporting Units**: Auth Service
**Implementation**:
- Web Frontend: Settings UI, persistence
- Auth Service: Settings storage

#### US-029: Account Deletion (GDPR)
**Primary Unit**: Auth Service
**Supporting Units**: Web Frontend, All Services
**Implementation**:
- Auth Service: Account deletion orchestration
- All Services: Data deletion from respective tables
- Web Frontend: Deletion confirmation UI

---

### Epic 10: Admin Dashboard Journey

#### US-030: Admin Login and Dashboard Access
**Primary Unit**: Admin Service
**Supporting Units**: Admin Dashboard, Auth Service
**Implementation**:
- Auth Service: Admin authentication with MFA
- Admin Service: Dashboard metrics aggregation
- Admin Dashboard: Login UI, dashboard display

#### US-031: User Management
**Primary Unit**: Admin Service
**Supporting Units**: Admin Dashboard
**Implementation**:
- Admin Service: User search, management operations
- Admin Dashboard: User management UI

#### US-032: Subscription Management (Admin)
**Primary Unit**: Admin Service
**Supporting Units**: Admin Dashboard, Payment Service
**Implementation**:
- Admin Service: Subscription modification, refunds
- Payment Service: Stripe operations
- Admin Dashboard: Subscription management UI

#### US-033: Analytics Dashboard
**Primary Unit**: Admin Service
**Supporting Units**: Admin Dashboard
**Implementation**:
- Admin Service: Metrics aggregation, report generation
- Admin Dashboard: Analytics visualization

---

### Epic 11: Content Management Journey

#### US-034: Theme Content Management
**Primary Unit**: CMS Service
**Supporting Units**: Admin Dashboard
**Implementation**:
- CMS Service: Theme CRUD operations, publishing workflow
- Admin Dashboard: Theme management UI

#### US-035: Theme Image Upload
**Primary Unit**: CMS Service
**Supporting Units**: Admin Dashboard
**Implementation**:
- CMS Service: S3 upload, image processing
- Admin Dashboard: Image upload UI

#### US-036: Theme Preview and Testing
**Primary Unit**: CMS Service
**Supporting Units**: Admin Dashboard
**Implementation**:
- CMS Service: Preview generation, validation
- Admin Dashboard: Preview display, test gameplay

---

### Epic 12: Non-Functional Requirements (Technical Stories)

#### US-037: Security - Encryption at Rest and in Transit
**Primary Unit**: Infrastructure
**Supporting Units**: All Services
**Implementation**:
- Infrastructure: DynamoDB encryption, S3 encryption, TLS configuration
- All Services: Enforce TLS connections

#### US-038: Security - Access Logging
**Primary Unit**: Infrastructure
**Supporting Units**: All Services
**Implementation**:
- Infrastructure: CloudWatch log groups, API Gateway logging
- All Services: Structured logging implementation

#### US-039: Security - Input Validation and Injection Prevention
**Primary Unit**: Shared Components
**Supporting Units**: All Services
**Implementation**:
- Shared Components: Validation utilities, sanitization functions
- All Services: Input validation on all endpoints

#### US-040: Security - Least Privilege IAM Policies
**Primary Unit**: Infrastructure
**Supporting Units**: All Services
**Implementation**:
- Infrastructure: IAM role definitions, policy attachments
- All Services: Use assigned roles

#### US-041: Security - Application-Level Authorization
**Primary Unit**: Auth Service
**Supporting Units**: All Services
**Implementation**:
- Auth Service: Authorization middleware, role checks
- All Services: Apply authorization to all endpoints

#### US-042: Accessibility - WCAG 2.1 AA Compliance
**Primary Unit**: Web Frontend
**Supporting Units**: Admin Dashboard
**Implementation**:
- Web Frontend: ARIA labels, keyboard navigation, color contrast
- Admin Dashboard: Same accessibility standards

#### US-043: Performance - Page Load and API Response Times
**Primary Unit**: Infrastructure
**Supporting Units**: Web Frontend, All Services
**Implementation**:
- Infrastructure: CloudFront CDN, API Gateway caching
- Web Frontend: Code splitting, lazy loading
- All Services: Query optimization

#### US-044: Performance - Scalability and Concurrent Users
**Primary Unit**: Infrastructure
**Supporting Units**: All Services
**Implementation**:
- Infrastructure: Lambda auto-scaling, DynamoDB on-demand capacity
- All Services: Stateless design

#### US-045: Reliability - High Availability and Disaster Recovery
**Primary Unit**: Infrastructure
**Supporting Units**: All Services
**Implementation**:
- Infrastructure: Multi-AZ deployment, automated backups
- All Services: Health checks, graceful degradation

#### US-046: GDPR - Data Subject Rights Implementation
**Primary Unit**: Auth Service
**Supporting Units**: All Services, Web Frontend
**Implementation**:
- Auth Service: Data export, deletion orchestration
- All Services: Data deletion from respective tables
- Web Frontend: GDPR controls UI

#### US-047: Analytics - Comprehensive Tracking
**Primary Unit**: Admin Service
**Supporting Units**: All Services
**Implementation**:
- All Services: Event tracking, metrics emission
- Admin Service: Metrics aggregation, reporting

---

## Cross-Unit Stories

### Stories Requiring Coordination Across Multiple Units

**US-011: Complete Game** (3 units)
- Web Frontend: Completion detection
- Game Service: Score calculation, validation
- Leaderboard Service: Ranking update
- **Coordination**: Game Service must invoke Leaderboard Service after saving game

**US-021: Purchase Subscription** (3 units)
- Web Frontend: Payment UI
- Payment Service: Stripe integration
- Game Service: Rate limit update
- **Coordination**: Payment Service must invoke Game Service after subscription creation

**US-029: Account Deletion** (All units)
- Web Frontend: Deletion UI
- Auth Service: Orchestration
- All Services: Data deletion
- **Coordination**: Auth Service orchestrates deletion across all services

**US-032: Subscription Management (Admin)** (3 units)
- Admin Dashboard: Management UI
- Admin Service: Admin operations
- Payment Service: Stripe operations
- **Coordination**: Admin Service invokes Payment Service for Stripe operations

---

## Story Coverage Validation

### All Stories Mapped: ✓

**Epic 1**: 5 stories (US-001 to US-005) - All mapped
**Epic 2**: 3 stories (US-006 to US-008) - All mapped
**Epic 3**: 6 stories (US-009 to US-014) - All mapped
**Epic 4**: 2 stories (US-015 to US-016) - All mapped
**Epic 5**: 2 stories (US-017 to US-018) - All mapped
**Epic 6**: 1 story (US-019) - All mapped
**Epic 7**: 5 stories (US-020 to US-024) - All mapped
**Epic 8**: 2 stories (US-025 to US-026) - All mapped
**Epic 9**: 3 stories (US-027 to US-029) - All mapped
**Epic 10**: 4 stories (US-030 to US-033) - All mapped
**Epic 11**: 3 stories (US-034 to US-036) - All mapped
**Epic 12**: 11 stories (US-037 to US-047) - All mapped

**Total**: 47 stories - 100% coverage

---

## Unit Story Summary

### Web Frontend (28 stories)
All user-facing stories from Epics 1-9, plus US-042 (Accessibility)

### Auth Service (5 stories)
US-001, US-002, US-003, US-004, US-027, US-029, US-041, US-046

### Game Service (8 stories)
US-006, US-007, US-008, US-009, US-011, US-014, US-015, US-016, US-019, US-025, US-026

### Leaderboard Service (2 stories)
US-017, US-018

### Payment Service (5 stories)
US-020, US-021, US-022, US-023, US-024

### Admin Service (4 stories)
US-030, US-031, US-032, US-033, US-047

### CMS Service (3 stories)
US-034, US-035, US-036

### Admin Dashboard (7 stories)
US-030, US-031, US-032, US-033, US-034, US-035, US-036, US-042

### Infrastructure (11 stories)
US-037, US-038, US-040, US-043, US-044, US-045 (all NFR technical stories)

### Shared Components (0 direct stories)
Supports US-039 (validation utilities) but no direct user stories

---

## Implementation Notes

### Story Implementation Order

**Phase 1: Foundation**
- US-037 to US-045 (Infrastructure and security setup)

**Phase 2: Core Authentication**
- US-001, US-002, US-003, US-004 (User registration and login)

**Phase 3: Core Gameplay**
- US-006, US-007, US-008, US-009, US-010, US-011, US-012 (Game mechanics)

**Phase 4: Monetization**
- US-015, US-016 (Rate limiting)
- US-020, US-021, US-022, US-023, US-024 (Subscriptions)

**Phase 5: Engagement**
- US-017, US-018 (Leaderboards)
- US-019 (Achievements)
- US-025, US-026 (History and statistics)

**Phase 6: User Management**
- US-027, US-028, US-029 (Profile and settings)
- US-005 (Onboarding)

**Phase 7: Admin Features**
- US-030, US-031, US-032, US-033 (Admin dashboard)
- US-034, US-035, US-036 (Content management)

**Phase 8: Polish**
- US-013, US-014 (Audio and difficulty progression)
- US-042 (Accessibility)
- US-046, US-047 (GDPR and analytics)
