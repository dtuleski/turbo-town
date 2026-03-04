# Code Generation Plan - Game Service

## Overview
This plan outlines the complete code generation for the Game Service (Unit 4), implementing game management, rate limiting, score calculation, achievement tracking, and leaderboard integration.

**Unit**: Game Service (Unit 4)
**Stories Implemented**: US-005 (Start Game), US-006 (Complete Game), US-007 (Game History), US-008 (Statistics), US-009 (Achievements)
**Dependencies**: Shared Components (types, validation), Infrastructure (DynamoDB, EventBridge), Auth Service (user validation), CMS Service (themes)
**Code Location**: `services/game/` (workspace root)
**Total Steps**: 40

---

## Unit Context

### User Stories Coverage
- **US-005**: Start Game (theme selection, difficulty, rate limiting)
- **US-006**: Complete Game (score calculation, validation, leaderboard notification)
- **US-007**: Game History (paid users, pagination, filtering)
- **US-008**: User Statistics (aggregated stats, caching)
- **US-009**: Achievement Tracking (unlock achievements, progress tracking)

### Dependencies
- **Shared Components**: Game types, validation schemas, error classes, constants, score calculation
- **Infrastructure**: DynamoDB (Games, RateLimits, Achievements tables), EventBridge (GameCompleted events)
- **Auth Service**: User authentication, subscription tier validation
- **CMS Service**: Theme data (read-only access)
- **Leaderboard Service**: Async event consumer (GameCompleted)

### Service Boundaries
- **Owns**: Game lifecycle, rate limiting, achievements, statistics
- **Interfaces**: GraphQL API (6 operations), EventBridge publisher, DynamoDB access
- **Consumers**: Web Frontend, Leaderboard Service (via events)

---

## Execution Steps

### Phase 1: Project Structure Setup

#### Step 1: Create Directory Structure
- [ ] Create `services/game/` directory
- [ ] Create `services/game/src/` subdirectories: handlers, services, repositories, utils, types
- [ ] Create `services/game/tests/` subdirectories: unit, integration, e2e
- [ ] Create subdirectories: unit/services, unit/repositories, unit/utils

#### Step 2: Generate Package Configuration
- [ ] Create `services/game/package.json` with dependencies:
  - Runtime: @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, @aws-sdk/client-eventbridge, graphql, zod
  - Dev: typescript, @types/node, @types/aws-lambda, jest, ts-jest, @types/jest, eslint, prettier
  - Local: @memory-game/shared (workspace reference)
- [ ] Create `services/game/tsconfig.json` with TypeScript configuration
- [ ] Create `services/game/jest.config.js` with test configuration
- [ ] Create `services/game/.eslintrc.js` with linting rules
- [ ] Create `services/game/.prettierrc.js` with formatting rules

---

### Phase 2: Core Infrastructure

#### Step 3: Generate Lambda Handler Entry Point
- [ ] Create `services/game/src/index.ts`:
  - GraphQL Lambda handler
  - Request/response transformation
  - Error handling middleware
  - Logging setup with correlation IDs
  - Environment variable validation
  - **Story**: Foundation for US-005, US-006, US-007, US-008, US-009

---

### Phase 3: Utilities Layer

#### Step 4: Generate Validation Utilities
- [ ] Create `services/game/src/utils/validation.ts`:
  - StartGameInput validation (themeId UUID, difficulty 1-5)
  - CompleteGameInput validation (gameId, completionTime, attempts)
  - GameHistoryInput validation (pagination, filters)
  - Input sanitization helpers
  - **Story**: US-005, US-006, US-007

#### Step 5: Generate Error Mapping Utilities
- [ ] Create `services/game/src/utils/error-mapper.ts`:
  - Map DynamoDB errors to domain errors
  - Map EventBridge errors to domain errors
  - User-friendly error messages
  - Error code constants (RATE_LIMIT_EXCEEDED, INVALID_COMPLETION, etc.)
  - **Story**: US-005, US-006, US-007, US-008, US-009

#### Step 6: Generate Caching Utilities
- [ ] Create `services/game/src/utils/cache.ts`:
  - Generic Cache<T> class with TTL
  - Theme cache (5-minute TTL)
  - Statistics cache (5-minute TTL)
  - Cache invalidation helpers
  - **Story**: US-005, US-008

#### Step 7: Generate Logging Utilities
- [ ] Create `services/game/src/utils/logger.ts`:
  - Structured JSON logging
  - Correlation ID tracking
  - Log levels (debug, info, warn, error)
  - Context enrichment
  - Business event logging (game started, completed)
  - **Story**: US-005, US-006, US-007, US-008, US-009

#### Step 8: Generate Metrics Utilities
- [ ] Create `services/game/src/utils/metrics.ts`:
  - CloudWatch metrics publisher
  - GamesStarted metric (by difficulty, tier)
  - GamesCompleted metric (by difficulty, tier)
  - GameScore metric (by difficulty)
  - RateLimitExceeded metric (by tier)
  - AchievementUnlocked metric (by type)
  - **Story**: US-005, US-006, US-009

#### Step 9: Generate Service Types
- [ ] Create `services/game/src/types/index.ts`:
  - Service-specific types (StartGameInput, CompleteGameInput, GameHistoryInput)
  - Repository interfaces
  - Event payload types
  - **Story**: US-005, US-006, US-007, US-008, US-009

---

### Phase 4: Repository Layer

#### Step 10: Generate Game Repository
- [ ] Create `services/game/src/repositories/game.repository.ts`:
  - Initialize DynamoDB Document Client
  - `create()`: Create game in Games table
  - `getById()`: Get game by gameId
  - `update()`: Update game (completion, status)
  - `queryByUser()`: Query user's games (UserIdIndex GSI, pagination)
  - `queryByStatus()`: Query games by status (StatusIndex GSI, for cleanup)
  - `delete()`: Delete game (admin only)
  - Error handling and retry logic
  - **Story**: US-005, US-006, US-007

#### Step 11: Generate RateLimit Repository
- [ ] Create `services/game/src/repositories/rate-limit.repository.ts`:
  - Initialize DynamoDB Document Client
  - `get()`: Get rate limit by userId
  - `upsert()`: Create or update rate limit
  - `increment()`: Increment usage count
  - `reset()`: Reset count (midnight UTC)
  - Error handling
  - **Story**: US-005

#### Step 12: Generate Achievement Repository
- [ ] Create `services/game/src/repositories/achievement.repository.ts`:
  - Initialize DynamoDB Document Client
  - `create()`: Create achievement record
  - `getByUser()`: Query all achievements for user
  - `getByUserAndType()`: Get specific achievement
  - `update()`: Update achievement progress
  - `unlock()`: Mark achievement as unlocked
  - Error handling
  - **Story**: US-009

#### Step 13: Generate Theme Repository (Read-Only)
- [ ] Create `services/game/src/repositories/theme.repository.ts`:
  - Initialize DynamoDB Document Client
  - `getById()`: Get theme by themeId (with caching)
  - `validateTheme()`: Check theme exists and is published
  - Cache integration (5-minute TTL)
  - Error handling
  - **Story**: US-005

#### Step 14: Generate Subscription Repository (Read-Only)
- [ ] Create `services/game/src/repositories/subscription.repository.ts`:
  - Initialize DynamoDB Document Client
  - `getByUserId()`: Get user's subscription (no cache - real-time)
  - `getTier()`: Get subscription tier (FREE, LIGHT, STANDARD, PREMIUM)
  - Error handling
  - **Story**: US-005

---

### Phase 5: Business Logic Layer

#### Step 15: Generate Score Calculator Service
- [ ] Create `services/game/src/services/score-calculator.service.ts`:
  - `calculateScore()`: Deterministic score formula
    - Base score: 1000 points
    - Time bonus: (maxTime - actualTime) / maxTime * 500
    - Attempts penalty: (minAttempts / actualAttempts) * 300
    - Difficulty multiplier: difficulty * 1.5
  - `getMaxTime()`: Get max time for difficulty
  - `getMinAttempts()`: Get min attempts for difficulty
  - **Story**: US-006

#### Step 16: Generate Rate Limiter Service
- [ ] Create `services/game/src/services/rate-limiter.service.ts`:
  - Constructor with RateLimitRepository
  - `checkLimit()`: Check if user can start game
    - Get rate limit from repository
    - Check if reset needed (midnight UTC)
    - Compare count vs tier limit
    - Throw RateLimitError if exceeded
  - `incrementUsage()`: Increment game count
  - `getTierLimit()`: Get limit for tier (FREE: 3, LIGHT: 10, STANDARD: 30, PREMIUM: 100)
  - `getNextMidnightUTC()`: Calculate next reset time
  - **Story**: US-005

#### Step 17: Generate Achievement Tracker Service
- [ ] Create `services/game/src/services/achievement-tracker.service.ts`:
  - Constructor with AchievementRepository, GameRepository
  - `trackCompletion()`: Check and unlock achievements after game completion
    - FIRST_WIN: First completed game
    - GAMES_10/50/100: Game count milestones
    - SPEED_DEMON: Completion time < 30 seconds
    - PERFECT_GAME: Minimum attempts for difficulty
    - DIFFICULTY_MASTER: Completed all 5 difficulties
    - THEME_EXPLORER: Played 10 different themes
    - STREAK_7: 7 consecutive days
  - `updateProgress()`: Update achievement progress
  - `unlockAchievement()`: Mark achievement as unlocked
  - `getAchievements()`: Get all user achievements
  - **Story**: US-009

#### Step 18: Generate Game Service
- [ ] Create `services/game/src/services/game.service.ts`:
  - Constructor with all repository and service dependencies
  - `startGame()`: Start new game flow
    - Validate input (theme, difficulty)
    - Get user subscription tier
    - Check rate limit
    - Validate theme exists and is published
    - Create game record
    - Increment rate limit usage
    - Publish metrics
    - Return game with rate limit info
  - `completeGame()`: Complete game flow
    - Validate input (gameId, completionTime, attempts)
    - Get game and verify ownership
    - Validate game status (must be IN_PROGRESS)
    - Validate completion data (min/max time, min attempts)
    - Calculate score
    - Update game record
    - Track achievements (synchronous)
    - Publish GameCompleted event (async)
    - Publish metrics
    - Return completed game with achievements
  - `getGame()`: Get game by ID
    - Verify ownership
    - Return game with theme details
  - `getGameHistory()`: Get user's game history (paid users only)
    - Check subscription tier (must be paid)
    - Query games with pagination
    - Apply filters (theme, difficulty, date range)
    - Sort by date/score/time
    - Return paginated results
  - `getUserStatistics()`: Get aggregated statistics
    - Check cache first
    - Query all user games
    - Calculate stats (total, average, best, favorite, streak)
    - Cache results (5-minute TTL)
    - Return statistics
  - `canStartGame()`: Check if user can start game
    - Get subscription tier
    - Check rate limit
    - Return canPlay status with rate limit info
  - Error handling and logging
  - **Story**: US-005, US-006, US-007, US-008

---

### Phase 6: Event Publishing

#### Step 19: Generate Event Publisher
- [ ] Create `services/game/src/services/event-publisher.service.ts`:
  - Initialize EventBridge client
  - `publishGameCompleted()`: Publish GameCompleted event
    - Event payload: gameId, userId, userName, themeId, difficulty, score, completionTime, attempts, completedAt
    - Source: game-service
    - DetailType: GameCompleted
    - Fire-and-forget (don't block response)
    - Error logging (don't fail request)
  - **Story**: US-006

---

### Phase 7: API Layer (GraphQL Resolvers)

#### Step 20: Generate Game Handler
- [ ] Create `services/game/src/handlers/game.handler.ts`:
  - Initialize GameService, AchievementTrackerService
  - **Mutation Resolvers**:
    - `startGame`: Call gameService.startGame()
    - `completeGame`: Call gameService.completeGame()
  - **Query Resolvers**:
    - `getGame`: Call gameService.getGame()
    - `getGameHistory`: Call gameService.getGameHistory()
    - `getUserStatistics`: Call gameService.getUserStatistics()
    - `canStartGame`: Call gameService.canStartGame()
  - Input validation with Zod
  - Authorization checks (JWT token validation, extract userId)
  - Error handling and mapping
  - **Story**: US-005, US-006, US-007, US-008, US-009

---

### Phase 8: Unit Tests - Utilities

#### Step 21: Generate Validation Tests
- [ ] Create `services/game/tests/unit/utils/validation.test.ts`:
  - Test StartGameInput validation (valid, invalid themeId, invalid difficulty)
  - Test CompleteGameInput validation (valid, invalid gameId, invalid times/attempts)
  - Test GameHistoryInput validation (valid, invalid pagination, invalid filters)
  - Test input sanitization
  - **Coverage**: 80%+ for validation.ts

#### Step 22: Generate Error Mapper Tests
- [ ] Create `services/game/tests/unit/utils/error-mapper.test.ts`:
  - Test DynamoDB error mapping (ConditionalCheckFailed, ResourceNotFound, etc.)
  - Test EventBridge error mapping
  - Test user-friendly messages
  - **Coverage**: 80%+ for error-mapper.ts

#### Step 23: Generate Cache Tests
- [ ] Create `services/game/tests/unit/utils/cache.test.ts`:
  - Test cache get (hit, miss, expired)
  - Test cache set
  - Test TTL expiration
  - Test cache invalidation
  - **Coverage**: 80%+ for cache.ts

---

### Phase 9: Unit Tests - Repositories

#### Step 24: Generate Game Repository Tests
- [ ] Create `services/game/tests/unit/repositories/game.repository.test.ts`:
  - Mock DynamoDB Document Client
  - Test create (success)
  - Test getById (found, not found)
  - Test update (success, not found)
  - Test queryByUser (with pagination, with filters)
  - Test queryByStatus (for cleanup)
  - Test delete (success)
  - **Coverage**: 80%+ for game.repository.ts

#### Step 25: Generate RateLimit Repository Tests
- [ ] Create `services/game/tests/unit/repositories/rate-limit.repository.test.ts`:
  - Mock DynamoDB Document Client
  - Test get (found, not found)
  - Test upsert (create, update)
  - Test increment (success)
  - Test reset (success)
  - **Coverage**: 80%+ for rate-limit.repository.ts

#### Step 26: Generate Achievement Repository Tests
- [ ] Create `services/game/tests/unit/repositories/achievement.repository.test.ts`:
  - Mock DynamoDB Document Client
  - Test create (success)
  - Test getByUser (found, empty)
  - Test getByUserAndType (found, not found)
  - Test update (success)
  - Test unlock (success)
  - **Coverage**: 80%+ for achievement.repository.ts

#### Step 27: Generate Theme Repository Tests
- [ ] Create `services/game/tests/unit/repositories/theme.repository.test.ts`:
  - Mock DynamoDB Document Client and Cache
  - Test getById (cache hit, cache miss, not found)
  - Test validateTheme (valid, not found, not published)
  - **Coverage**: 80%+ for theme.repository.ts

#### Step 28: Generate Subscription Repository Tests
- [ ] Create `services/game/tests/unit/repositories/subscription.repository.test.ts`:
  - Mock DynamoDB Document Client
  - Test getByUserId (found, not found)
  - Test getTier (FREE, LIGHT, STANDARD, PREMIUM)
  - **Coverage**: 80%+ for subscription.repository.ts

---

### Phase 10: Unit Tests - Services

#### Step 29: Generate Score Calculator Tests
- [ ] Create `services/game/tests/unit/services/score-calculator.service.test.ts`:
  - Test calculateScore (various difficulty levels, times, attempts)
  - Test score formula components (base, time bonus, attempts penalty, multiplier)
  - Test edge cases (min time, max time, min attempts, max attempts)
  - **Coverage**: 80%+ for score-calculator.service.ts

#### Step 30: Generate Rate Limiter Tests
- [ ] Create `services/game/tests/unit/services/rate-limiter.service.test.ts`:
  - Mock RateLimitRepository
  - Test checkLimit (under limit, at limit, exceeded, reset needed)
  - Test incrementUsage (success)
  - Test getTierLimit (all tiers)
  - Test getNextMidnightUTC (various times)
  - **Coverage**: 80%+ for rate-limiter.service.ts

#### Step 31: Generate Achievement Tracker Tests
- [ ] Create `services/game/tests/unit/services/achievement-tracker.service.test.ts`:
  - Mock AchievementRepository, GameRepository
  - Test trackCompletion (unlock FIRST_WIN, GAMES_10, SPEED_DEMON, PERFECT_GAME, etc.)
  - Test updateProgress (increment progress)
  - Test unlockAchievement (mark as unlocked)
  - Test getAchievements (return all)
  - **Coverage**: 80%+ for achievement-tracker.service.ts

#### Step 32: Generate Game Service Tests
- [ ] Create `services/game/tests/unit/services/game.service.test.ts`:
  - Mock all repositories and services
  - Test startGame (success, rate limit exceeded, invalid theme, theme not published)
  - Test completeGame (success, invalid game, not owner, invalid status, invalid completion data)
  - Test getGame (success, not found, not owner)
  - Test getGameHistory (success, not paid user, with filters, with pagination)
  - Test getUserStatistics (cache hit, cache miss, no games)
  - Test canStartGame (can play, rate limit exceeded)
  - **Coverage**: 80%+ for game.service.ts

#### Step 33: Generate Event Publisher Tests
- [ ] Create `services/game/tests/unit/services/event-publisher.service.test.ts`:
  - Mock EventBridge client
  - Test publishGameCompleted (success, failure logged but not thrown)
  - Test event payload structure
  - **Coverage**: 80%+ for event-publisher.service.ts

---

### Phase 11: Unit Tests - Handlers

#### Step 34: Generate Game Handler Tests
- [ ] Create `services/game/tests/unit/handlers/game.handler.test.ts`:
  - Mock GameService, AchievementTrackerService
  - Test startGame mutation (success, validation error, rate limit error)
  - Test completeGame mutation (success, validation error, invalid completion)
  - Test getGame query (success, not found, not owner)
  - Test getGameHistory query (success, not paid user)
  - Test getUserStatistics query (success)
  - Test canStartGame query (success, rate limit exceeded)
  - Test authorization checks (missing token, invalid token)
  - Test error handling and mapping
  - **Coverage**: 80%+ for game.handler.ts

---

### Phase 12: Integration Tests

#### Step 35: Generate Integration Tests
- [ ] Create `services/game/tests/integration/game.integration.test.ts`:
  - Setup: LocalStack for DynamoDB, mocked EventBridge
  - Test full game flow (start → complete → get → history → statistics)
  - Test rate limiting flow (start games until limit, verify error)
  - Test achievement tracking flow (complete games, verify unlocks)
  - Test pagination flow (create many games, paginate history)
  - Teardown: Clean up test data
  - **Coverage**: Critical user flows

---

### Phase 13: E2E Tests

#### Step 36: Generate E2E Tests
- [ ] Create `services/game/tests/e2e/game.e2e.test.ts`:
  - Setup: Real DynamoDB dev tables, real EventBridge dev bus
  - Test start game flow (US-005)
  - Test complete game flow (US-006)
  - Test game history flow (US-007)
  - Test statistics flow (US-008)
  - Test achievement flow (US-009)
  - Test rate limiting (free tier, paid tiers)
  - Teardown: Clean up test data
  - **Coverage**: All user stories

---

### Phase 14: Configuration and Documentation

#### Step 37: Generate Environment Configuration
- [ ] Create `services/game/.env.example`:
  - GAMES_TABLE_NAME
  - RATE_LIMITS_TABLE_NAME
  - ACHIEVEMENTS_TABLE_NAME
  - THEMES_TABLE_NAME
  - SUBSCRIPTIONS_TABLE_NAME
  - EVENT_BUS_NAME
  - NODE_ENV
  - AWS_REGION
  - LOG_LEVEL

#### Step 38: Generate README
- [ ] Create `services/game/README.md`:
  - Service overview
  - Architecture diagram (text-based)
  - Setup instructions
  - Environment variables
  - Running tests
  - Deployment instructions
  - API documentation (GraphQL operations)
  - Integration guide (EventBridge events)
  - Rate limiting rules
  - Achievement types
  - Troubleshooting

#### Step 39: Generate GraphQL Schema File
- [ ] Create `services/game/schema.graphql`:
  - Complete GraphQL schema
  - Type definitions (Game, RateLimit, Achievement, GameStatistics)
  - Mutation definitions (startGame, completeGame)
  - Query definitions (getGame, getGameHistory, getUserStatistics, canStartGame)
  - Input types (StartGameInput, CompleteGameInput, GameHistoryInput)
  - Comments and documentation

---

### Phase 15: Deployment Artifacts

#### Step 40: Generate Build and Deploy Scripts
- [ ] Create `services/game/scripts/build.sh`:
  - Clean dist directory
  - Compile TypeScript
  - Copy package.json
  - Install production dependencies
  - Create deployment package
- [ ] Create `services/game/scripts/deploy.sh`:
  - Build service
  - Upload to S3
  - Update Lambda function
  - Run smoke tests

---

### Phase 16: Documentation Summary

#### Step 41: Generate Implementation Summary
- [ ] Create `aidlc-docs/construction/game-service/code/implementation-summary.md`:
  - List all generated files (source, tests, config, docs)
  - Add file count summary
  - Add test coverage summary
  - Add deployment status
  - Add integration points (EventBridge, DynamoDB tables)
  - Add next steps (Build & Test phase)

---

## Story Traceability

### US-005: Start Game
- **Files**: game.service.ts (startGame, canStartGame), game.handler.ts (startGame, canStartGame), rate-limiter.service.ts (checkLimit, incrementUsage), theme.repository.ts (validateTheme), subscription.repository.ts (getTier), rate-limit.repository.ts (get, upsert, increment)
- **Tests**: game.service.test.ts, game.handler.test.ts, rate-limiter.service.test.ts, game.integration.test.ts, game.e2e.test.ts

### US-006: Complete Game
- **Files**: game.service.ts (completeGame), game.handler.ts (completeGame), score-calculator.service.ts (calculateScore), achievement-tracker.service.ts (trackCompletion), event-publisher.service.ts (publishGameCompleted), game.repository.ts (update)
- **Tests**: game.service.test.ts, game.handler.test.ts, score-calculator.service.test.ts, achievement-tracker.service.test.ts, game.integration.test.ts, game.e2e.test.ts

### US-007: Game History
- **Files**: game.service.ts (getGameHistory), game.handler.ts (getGameHistory), game.repository.ts (queryByUser), subscription.repository.ts (getTier)
- **Tests**: game.service.test.ts, game.handler.test.ts, game.repository.test.ts, game.integration.test.ts, game.e2e.test.ts

### US-008: User Statistics
- **Files**: game.service.ts (getUserStatistics), game.handler.ts (getUserStatistics), game.repository.ts (queryByUser), cache.ts (Cache class)
- **Tests**: game.service.test.ts, game.handler.test.ts, cache.test.ts, game.integration.test.ts, game.e2e.test.ts

### US-009: Achievement Tracking
- **Files**: achievement-tracker.service.ts (trackCompletion, updateProgress, unlockAchievement, getAchievements), achievement.repository.ts (create, getByUser, getByUserAndType, update, unlock), game.repository.ts (queryByUser for streak calculation)
- **Tests**: achievement-tracker.service.test.ts, achievement.repository.test.ts, game.integration.test.ts, game.e2e.test.ts

---

## Success Criteria
- [ ] All 41 steps completed and marked [x]
- [ ] All user stories (US-005 to US-009) implemented
- [ ] 25+ source files generated
- [ ] 20+ test files generated
- [ ] 80%+ test coverage achieved
- [ ] All tests passing (unit, integration, E2E)
- [ ] Documentation complete (README, API docs, schema)
- [ ] Deployment artifacts generated
- [ ] Code quality checks passing (linting, formatting)
- [ ] EventBridge integration tested

---

## Estimated Effort
- **Project Setup**: 30 minutes (Steps 1-2)
- **Core Infrastructure**: 30 minutes (Step 3)
- **Utilities Layer**: 2-3 hours (Steps 4-9)
- **Repository Layer**: 3-4 hours (Steps 10-14)
- **Business Logic Layer**: 5-6 hours (Steps 15-18)
- **Event Publishing**: 1 hour (Step 19)
- **API Layer**: 2 hours (Step 20)
- **Unit Tests - Utilities**: 2 hours (Steps 21-23)
- **Unit Tests - Repositories**: 3-4 hours (Steps 24-28)
- **Unit Tests - Services**: 4-5 hours (Steps 29-33)
- **Unit Tests - Handlers**: 2 hours (Step 34)
- **Integration Tests**: 2-3 hours (Step 35)
- **E2E Tests**: 2-3 hours (Step 36)
- **Configuration/Documentation**: 2 hours (Steps 37-39)
- **Deployment Artifacts**: 1 hour (Step 40)
- **Summary**: 30 minutes (Step 41)

**Total**: 30-37 hours (4-5 days)

---

## Notes
- This plan is the single source of truth for Game Service code generation
- Each step must be marked [x] immediately after completion
- All code goes to `services/game/` (workspace root), never `aidlc-docs/`
- Follow TypeScript best practices and established patterns from Auth Service
- Maintain 80%+ test coverage throughout
- Use Result<T, Error> pattern from Shared Components for error handling
- All GraphQL operations must match the API contracts from functional design
- EventBridge events must match the integration specification
- Rate limiting must enforce tier-based limits (FREE: 3, LIGHT: 10, STANDARD: 30, PREMIUM: 100)
- Score calculation must be deterministic and match the formula in business rules
- Achievement tracking must be synchronous (don't block on leaderboard updates)
- Theme and subscription data are read-only from other services' tables

