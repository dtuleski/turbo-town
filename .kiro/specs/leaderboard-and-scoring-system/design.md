# Design Document: Leaderboard and Scoring System

## 1. Introduction

This document provides the detailed design for implementing a comprehensive leaderboard and scoring system for a gaming platform with four games: Memory Match, Math Challenge, Word Puzzle, and Language Learning. The design follows an event-driven architecture to ensure backward compatibility with existing systems while adding new scoring and ranking capabilities.

### 1.1 Design Goals

- Implement consistent scoring across all game types
- Provide efficient leaderboard queries with multiple timeframes
- Maintain backward compatibility with existing Game Service
- Ensure security through authentication, validation, and anomaly detection
- Enable scalability through event-driven architecture
- Support privacy controls and user preferences

### 1.2 Design Principles

- **Decoupling**: Use EventBridge to decouple score processing from game completion
- **Single Responsibility**: Separate services for scoring calculation and leaderboard management
- **Fail-Safe**: Existing game functionality continues even if leaderboard service fails
- **Security First**: Validate all inputs, authenticate all requests, detect anomalies
- **Performance**: Optimize DynamoDB queries with appropriate indexes and caching

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────┐
│   Web Client    │
│  (React App)    │
└────────┬────────┘
         │
         │ GraphQL Queries
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              API Gateway + AppSync                       │
│  (GraphQL API with Cognito Authentication)              │
└────────┬────────────────────────────────────────────────┘
         │
         │ Invokes
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│           Existing Game Service Lambda                   │
│  - startGame, completeGame, getGame, etc.               │
│  - Publishes GameCompleted events                       │
└────────┬────────────────────────────────────────────────┘
         │
         │ Publishes Event
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                   EventBridge                            │
│  (Event Bus: game-events)                               │
└────────┬────────────────────────────────────────────────┘
         │
         │ Triggers
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│         Leaderboard Service Lambda                       │
│  - Score Calculation Module                             │
│  - Leaderboard Management Module                        │
│  - Anomaly Detection Module                             │
└────────┬────────────────────────────────────────────────┘
         │
         │ Reads/Writes
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              DynamoDB Tables                             │
│  - LeaderboardEntries                                   │
│  - UserAggregates                                       │
└─────────────────────────────────────────────────────────┘
```


### 2.2 Component Responsibilities

#### 2.2.1 Game Service Lambda (Existing - Modified)
- Continues to handle all existing game operations
- **New**: Publishes `GameCompleted` event to EventBridge after successful game completion
- No changes to existing API contracts or database operations
- Remains the source of truth for game data

#### 2.2.2 EventBridge
- Event bus name: `game-events`
- Routes `GameCompleted` events to Leaderboard Service
- Provides decoupling between game completion and score processing
- Enables future event consumers without modifying Game Service

#### 2.2.3 Leaderboard Service Lambda (New)
- Consumes `GameCompleted` events from EventBridge
- Calculates scores using game-specific formulas
- Stores leaderboard entries and user aggregates
- Handles GraphQL queries for leaderboard data
- Performs score validation and anomaly detection
- Enforces rate limiting and authentication

#### 2.2.4 DynamoDB Tables (New)
- `LeaderboardEntries`: Stores individual game scores with rankings
- `UserAggregates`: Stores aggregated user statistics per game type

#### 2.2.5 GraphQL API (Extended)
- New queries: `getLeaderboard`, `getUserRank`, `getUserScoreHistory`
- Extended type: `CompleteGameResponse` includes `scoreBreakdown` and `leaderboardRank`
- All new queries route to Leaderboard Service Lambda

## 3. Data Model Design

### 3.1 DynamoDB Table: LeaderboardEntries

**Purpose**: Store individual game scores with efficient query patterns for leaderboards

**Table Structure**:
```
Table Name: LeaderboardEntries
Partition Key: gameType (String)
Sort Key: scoreTimestamp (String)
```

**Attributes**:
- `gameType` (String, PK): MEMORY_MATCH | MATH_CHALLENGE | WORD_PUZZLE | LANGUAGE_LEARNING | OVERALL
- `scoreTimestamp` (String, SK): Format: `SCORE#{score}#TIMESTAMP#{isoTimestamp}`
- `userId` (String): Cognito user ID
- `username` (String): Display name
- `score` (Number): Calculated final score
- `gameId` (String): Unique game session ID
- `difficulty` (String): Game difficulty level
- `completionTime` (Number): Time in seconds
- `accuracy` (Number): Accuracy percentage (0-1)
- `timestamp` (String): ISO 8601 timestamp
- `date` (String): YYYY-MM-DD for daily queries
- `week` (String): YYYY-Www for weekly queries (ISO week)
- `month` (String): YYYY-MM for monthly queries
- `metadata` (Map): Additional game-specific data
- `suspicious` (Boolean): Flag for anomaly detection

**Global Secondary Indexes**:

1. **DailyLeaderboardIndex**
   - Partition Key: `gameType#date` (String)
   - Sort Key: `score` (Number, descending)
   - Purpose: Efficient daily leaderboard queries

2. **WeeklyLeaderboardIndex**
   - Partition Key: `gameType#week` (String)
   - Sort Key: `score` (Number, descending)
   - Purpose: Efficient weekly leaderboard queries

3. **MonthlyLeaderboardIndex**
   - Partition Key: `gameType#month` (String)
   - Sort Key: `score` (Number, descending)
   - Purpose: Efficient monthly leaderboard queries

4. **UserScoreHistoryIndex**
   - Partition Key: `userId` (String)
   - Sort Key: `timestamp` (String, descending)
   - Purpose: Retrieve user's score history


### 3.2 DynamoDB Table: UserAggregates

**Purpose**: Store aggregated user statistics for efficient overall rankings and user dashboard

**Table Structure**:
```
Table Name: UserAggregates
Partition Key: userId (String)
Sort Key: gameType (String)
```

**Attributes**:
- `userId` (String, PK): Cognito user ID
- `gameType` (String, SK): MEMORY_MATCH | MATH_CHALLENGE | WORD_PUZZLE | LANGUAGE_LEARNING | OVERALL
- `username` (String): Display name
- `totalScore` (Number): Sum of all scores
- `gamesPlayed` (Number): Total games played
- `averageScore` (Number): totalScore / gamesPlayed
- `bestScore` (Number): Highest score achieved
- `lastPlayed` (String): ISO 8601 timestamp of last game
- `dailyScore` (Number): Score for current day
- `weeklyScore` (Number): Score for current week
- `monthlyScore` (Number): Score for current month
- `dailyGames` (Number): Games played today
- `weeklyGames` (Number): Games played this week
- `monthlyGames` (Number): Games played this month

**Global Secondary Index**:

1. **OverallLeaderboardIndex**
   - Partition Key: `gameType` (String)
   - Sort Key: `totalScore` (Number, descending)
   - Purpose: Overall leaderboard rankings

### 3.3 Event Schema: GameCompleted

**Event Source**: Game Service Lambda
**Event Bus**: game-events
**Detail Type**: GameCompleted

**Event Structure**:
```json
{
  "version": "1.0",
  "source": "game-service",
  "detail-type": "GameCompleted",
  "detail": {
    "gameId": "uuid",
    "userId": "cognito-user-id",
    "username": "display-name",
    "gameType": "MEMORY_MATCH | MATH_CHALLENGE | WORD_PUZZLE | LANGUAGE_LEARNING",
    "difficulty": "EASY | MEDIUM | HARD | BEGINNER | INTERMEDIATE | ADVANCED",
    "completionTime": 45.5,
    "accuracy": 0.85,
    "performanceMetrics": {
      "attempts": 12,
      "correctAnswers": 8,
      "totalQuestions": 10,
      "wordsFound": 15,
      "totalWords": 20,
      "correctMatches": 9,
      "totalAttempts": 10,
      "pairs": 6
    },
    "timestamp": "2026-03-11T10:30:00.000Z"
  }
}
```

## 4. Scoring Algorithm Design

### 4.1 Scoring Service Module

**Purpose**: Calculate scores using consistent formulas across all game types

**Core Formula**:
```
Final Score = Base Score × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
```

**Configuration Structure**:
```typescript
interface ScoringConfig {
  memoryMatch: GameScoringConfig;
  mathChallenge: GameScoringConfig;
  wordPuzzle: GameScoringConfig;
  languageLearning: GameScoringConfig;
}

interface GameScoringConfig {
  baseScore: number;
  difficultyMultipliers: {
    [key: string]: number; // e.g., { EASY: 1.0, MEDIUM: 1.5, HARD: 2.0 }
  };
  speedBonusParams: {
    maxTime: number;
    formula: string; // e.g., "max(0, 1 + (maxTime - completionTime) / maxTime)"
  };
  accuracyBonusParams: {
    formula: string; // e.g., "correctAnswers / totalQuestions"
  };
  validationRules: {
    minCompletionTime: number;
    maxCompletionTime: number;
    minScore: number;
    maxScore: number;
  };
}
```


### 4.2 Game-Specific Scoring Formulas

#### 4.2.1 Memory Match Scoring

**Base Score**: 1000 points

**Difficulty Multipliers**:
- EASY (4 pairs): 1.0
- MEDIUM (6 pairs): 1.5
- HARD (8 pairs): 2.0

**Speed Bonus**:
```
speedBonus = max(0, 1 + (60 - completionTime) / 60)
```
- Perfect speed (0 seconds): 2.0x
- Target speed (60 seconds): 1.0x
- Slow (>60 seconds): 0.0x (no bonus)

**Accuracy Bonus**:
```
accuracyBonus = 1 + (1 - attempts / (pairs × 2)) × 0.5
```
- Perfect accuracy (minimum attempts): 1.5x
- Average accuracy: 1.25x
- Poor accuracy: 1.0x

**Final Formula**:
```
score = 1000 × difficultyMultiplier × speedBonus × accuracyBonus
```

**Example**:
- Difficulty: MEDIUM (6 pairs) → 1.5x
- Completion time: 45 seconds → speedBonus = 1 + (60-45)/60 = 1.25x
- Attempts: 15 (perfect = 12) → accuracyBonus = 1 + (1 - 15/12) × 0.5 = 0.875x
- Final score: 1000 × 1.5 × 1.25 × 0.875 = 1640.625 ≈ 1641 points

#### 4.2.2 Math Challenge Scoring

**Base Score**: 100 points per correct answer

**Difficulty Multipliers**:
- EASY: 1.0
- MEDIUM: 1.5
- HARD: 2.0

**Speed Bonus**:
```
avgTimePerQuestion = completionTime / totalQuestions
speedBonus = max(0, 1 + (timeLimit - avgTimePerQuestion) / timeLimit)
```
- Time limit: 10 seconds per question
- Fast response (5 seconds avg): 1.5x
- Target speed (10 seconds avg): 1.0x
- Slow (>10 seconds avg): 0.0x

**Accuracy Bonus**:
```
accuracyBonus = correctAnswers / totalQuestions
```
- All correct: 1.0x
- Half correct: 0.5x
- None correct: 0.0x

**Final Formula**:
```
score = (correctAnswers × 100) × difficultyMultiplier × speedBonus × accuracyBonus
```

**Example**:
- Correct answers: 8 out of 10
- Difficulty: HARD → 2.0x
- Avg time: 7 seconds → speedBonus = 1 + (10-7)/10 = 1.3x
- Accuracy: 8/10 = 0.8x
- Final score: (8 × 100) × 2.0 × 1.3 × 0.8 = 1664 points

#### 4.2.3 Word Puzzle Scoring

**Base Score**: 50 points per word found

**Difficulty Multipliers**:
- EASY: 1.0
- MEDIUM: 1.5
- HARD: 2.0

**Speed Bonus**:
```
speedBonus = max(0, 1 + (180 - completionTime) / 180)
```
- Fast (90 seconds): 1.5x
- Target (180 seconds): 1.0x
- Slow (>180 seconds): 0.0x

**Completion Bonus**:
```
completionBonus = 1 + (wordsFound / totalWords) × 0.5
```
- All words found: 1.5x
- Half words found: 1.25x
- Few words found: 1.0x

**Final Formula**:
```
score = (wordsFound × 50) × difficultyMultiplier × speedBonus × completionBonus
```

**Example**:
- Words found: 15 out of 20
- Difficulty: MEDIUM → 1.5x
- Completion time: 120 seconds → speedBonus = 1 + (180-120)/180 = 1.33x
- Completion: 1 + (15/20) × 0.5 = 1.375x
- Final score: (15 × 50) × 1.5 × 1.33 × 1.375 = 2059.69 ≈ 2060 points

#### 4.2.4 Language Learning Scoring

**Base Score**: 100 points per correct match

**Difficulty Multipliers**:
- BEGINNER: 1.0
- INTERMEDIATE: 1.5
- ADVANCED: 2.0

**Speed Bonus**:
```
avgTimePerMatch = completionTime / totalAttempts
speedBonus = max(0, 1 + (30 - avgTimePerMatch) / 30)
```
- Fast (15 seconds avg): 1.5x
- Target (30 seconds avg): 1.0x
- Slow (>30 seconds avg): 0.0x

**Accuracy Bonus**:
```
accuracyBonus = correctMatches / totalAttempts
```
- All correct: 1.0x
- Half correct: 0.5x
- None correct: 0.0x

**Final Formula**:
```
score = (correctMatches × 100) × difficultyMultiplier × speedBonus × accuracyBonus
```

**Example**:
- Correct matches: 9 out of 10 attempts
- Difficulty: INTERMEDIATE → 1.5x
- Avg time: 20 seconds → speedBonus = 1 + (30-20)/30 = 1.33x
- Accuracy: 9/10 = 0.9x
- Final score: (9 × 100) × 1.5 × 1.33 × 0.9 = 1616.85 ≈ 1617 points


## 5. API Design

### 5.1 GraphQL Schema Extensions

```graphql
# New Types

type LeaderboardEntry {
  rank: Int!
  userId: ID!
  username: String!
  score: Float!
  gameType: GameType!
  difficulty: String!
  completionTime: Float!
  accuracy: Float!
  timestamp: AWSDateTime!
  isCurrentUser: Boolean!
}

type LeaderboardResponse {
  entries: [LeaderboardEntry!]!
  currentUserEntry: LeaderboardEntry
  totalEntries: Int!
  timeframe: Timeframe!
}

type ScoreBreakdown {
  baseScore: Float!
  difficultyMultiplier: Float!
  speedBonus: Float!
  accuracyBonus: Float!
  finalScore: Float!
  difficulty: String!
  completionTime: Float!
  accuracy: Float!
}

type UserRankResponse {
  rank: Int!
  score: Float!
  gameType: GameType!
  timeframe: Timeframe!
  totalPlayers: Int!
  percentile: Float!
}

enum GameType {
  MEMORY_MATCH
  MATH_CHALLENGE
  WORD_PUZZLE
  LANGUAGE_LEARNING
  OVERALL
}

enum Timeframe {
  DAILY
  WEEKLY
  MONTHLY
  ALL_TIME
}

# Extended Types

type CompleteGameResponse {
  success: Boolean!
  message: String
  game: Game
  scoreBreakdown: ScoreBreakdown  # NEW
  leaderboardRank: Int            # NEW
}

# New Queries

type Query {
  getLeaderboard(
    gameType: GameType!
    timeframe: Timeframe!
    limit: Int = 100
  ): LeaderboardResponse!

  getUserRank(
    gameType: GameType!
    timeframe: Timeframe!
  ): UserRankResponse

  getUserScoreHistory(
    gameType: GameType
    limit: Int = 50
  ): [LeaderboardEntry!]!
}
```

### 5.2 API Endpoints

#### 5.2.1 getLeaderboard

**Purpose**: Retrieve leaderboard rankings for a specific game and timeframe

**Input**:
```graphql
{
  gameType: GameType!
  timeframe: Timeframe!
  limit: Int = 100
}
```

**Output**:
```graphql
{
  entries: [LeaderboardEntry!]!
  currentUserEntry: LeaderboardEntry
  totalEntries: Int!
  timeframe: Timeframe!
}
```

**Authentication**: Required (JWT token)

**Rate Limit**: 10 requests per minute per user

**Query Pattern**:
- Daily: Query DailyLeaderboardIndex with `gameType#date` partition key
- Weekly: Query WeeklyLeaderboardIndex with `gameType#week` partition key
- Monthly: Query MonthlyLeaderboardIndex with `gameType#month` partition key
- All-Time: Query LeaderboardEntries table with `gameType` partition key, sort by score descending

**Response Time Target**: p95 < 200ms, p99 < 500ms

#### 5.2.2 getUserRank

**Purpose**: Get current user's rank for a specific game and timeframe

**Input**:
```graphql
{
  gameType: GameType!
  timeframe: Timeframe!
}
```

**Output**:
```graphql
{
  rank: Int!
  score: Float!
  gameType: GameType!
  timeframe: Timeframe!
  totalPlayers: Int!
  percentile: Float!
}
```

**Authentication**: Required (JWT token)

**Rate Limit**: 10 requests per minute per user

**Query Pattern**:
1. Get user's best score for the timeframe from UserAggregates
2. Count entries with higher scores in the appropriate index
3. Calculate rank = count + 1
4. Calculate percentile = (totalPlayers - rank) / totalPlayers × 100

#### 5.2.3 getUserScoreHistory

**Purpose**: Retrieve user's score history across games

**Input**:
```graphql
{
  gameType: GameType  # Optional filter
  limit: Int = 50
}
```

**Output**:
```graphql
[LeaderboardEntry!]!
```

**Authentication**: Required (JWT token)

**Rate Limit**: 10 requests per minute per user

**Query Pattern**:
- Query UserScoreHistoryIndex with userId partition key
- Filter by gameType if provided
- Sort by timestamp descending
- Limit results to specified limit


## 6. Security Design

### 6.1 Authentication

**Mechanism**: AWS Cognito JWT tokens

**Flow**:
1. Client includes JWT token in Authorization header
2. API Gateway validates token with Cognito
3. Lambda receives validated user claims
4. Lambda extracts userId from token claims

**Token Validation**:
- Verify token signature using Cognito public keys
- Check token expiration
- Validate token issuer matches Cognito User Pool
- Extract userId from `sub` claim

### 6.2 Authorization

**Rules**:
- All leaderboard queries require authentication
- Users can only view public leaderboard data
- Users can only view their own detailed score history
- Admin queries (if added) require admin role in Cognito groups

**Privacy Controls**:
- Users can opt-out of public leaderboards via user settings
- Opted-out users are excluded from public queries but can still view their own data
- Email addresses are never exposed in leaderboard responses
- Only username and userId are included in public entries

### 6.3 Rate Limiting

**Implementation**: Token bucket algorithm using DynamoDB

**Limits**:
- 10 requests per minute per userId
- Separate buckets for different query types
- Rate limit state stored in DynamoDB with TTL

**Response Headers**:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1678550400
```

**Error Response** (429 Too Many Requests):
```json
{
  "error": "RateLimitExceeded",
  "message": "Rate limit exceeded. Try again in 30 seconds.",
  "retryAfter": 30
}
```

### 6.4 Score Validation

**Validation Rules**:

1. **Completion Time Validation**:
   - Memory Match: 5 seconds ≤ time ≤ 300 seconds
   - Math Challenge: 10 seconds ≤ time ≤ 600 seconds
   - Word Puzzle: 15 seconds ≤ time ≤ 600 seconds
   - Language Learning: 10 seconds ≤ time ≤ 300 seconds

2. **Accuracy Validation**:
   - 0 ≤ accuracy ≤ 1
   - Accuracy must match calculated value from performance metrics

3. **Score Range Validation**:
   - Memory Match: 0 ≤ score ≤ 6000
   - Math Challenge: 0 ≤ score ≤ 10000
   - Word Puzzle: 0 ≤ score ≤ 6000
   - Language Learning: 0 ≤ score ≤ 8000

4. **Performance Metrics Validation**:
   - Attempts ≥ minimum possible attempts
   - Correct answers ≤ total questions
   - Words found ≤ total words
   - Correct matches ≤ total attempts

**Validation Failure Handling**:
- Log validation error with full context
- Reject score submission
- Return error to Game Service
- Do not create leaderboard entry

### 6.5 Anomaly Detection

**Detection Rules**:

1. **Statistical Outlier Detection**:
   - Calculate mean and standard deviation for each game type and difficulty
   - Flag scores > mean + 3 × standard deviation
   - Update statistics daily using batch job

2. **Velocity Detection**:
   - Flag users submitting > 10 games per minute
   - Flag users with > 100 games per day

3. **Pattern Detection**:
   - Flag identical scores submitted multiple times
   - Flag suspiciously consistent completion times

**Anomaly Handling**:
- Mark entry with `suspicious: true` flag
- Store entry in database for audit
- Exclude from public leaderboards
- Log to CloudWatch for review
- Send alert to admin dashboard

**Review Process**:
- Admin can review flagged entries
- Admin can approve or reject suspicious scores
- Approved scores are included in leaderboards
- Rejected scores remain in database but never appear in rankings


## 7. Leaderboard Service Lambda Design

### 7.1 Module Structure

```
leaderboard-service/
├── src/
│   ├── handlers/
│   │   ├── event.handler.ts          # EventBridge event consumer
│   │   └── graphql.handler.ts        # GraphQL query handler
│   ├── services/
│   │   ├── scoring.service.ts        # Score calculation logic
│   │   ├── leaderboard.service.ts    # Leaderboard management
│   │   └── anomaly.service.ts        # Anomaly detection
│   ├── repositories/
│   │   ├── leaderboard.repository.ts # DynamoDB operations for LeaderboardEntries
│   │   └── aggregate.repository.ts   # DynamoDB operations for UserAggregates
│   ├── utils/
│   │   ├── auth.util.ts              # JWT validation
│   │   ├── ratelimit.util.ts         # Rate limiting logic
│   │   └── time.util.ts              # Date/time calculations
│   ├── config/
│   │   └── scoring.config.json       # Scoring formulas configuration
│   └── types/
│       └── index.ts                  # TypeScript interfaces
├── package.json
└── tsconfig.json
```

### 7.2 Event Handler Design

**Purpose**: Process GameCompleted events from EventBridge

**Flow**:
1. Receive GameCompleted event
2. Validate event structure
3. Calculate score using ScoringService
4. Validate score using validation rules
5. Check for anomalies using AnomalyService
6. Store leaderboard entry using LeaderboardRepository
7. Update user aggregates using AggregateRepository
8. Handle errors with retry logic

**Error Handling**:
- Validation errors: Log and skip (do not retry)
- DynamoDB throttling: Retry with exponential backoff (3 attempts)
- Service errors: Retry with exponential backoff (3 attempts)
- Fatal errors: Send to dead-letter queue

**Retry Configuration**:
```typescript
{
  maxAttempts: 3,
  backoffMultiplier: 2,
  initialDelay: 1000, // 1 second
  maxDelay: 10000     // 10 seconds
}
```

### 7.3 GraphQL Handler Design

**Purpose**: Handle leaderboard queries from GraphQL API

**Supported Operations**:
- `getLeaderboard`: Query leaderboard rankings
- `getUserRank`: Get user's current rank
- `getUserScoreHistory`: Get user's score history

**Request Flow**:
1. Receive GraphQL request
2. Validate JWT token
3. Check rate limit
4. Execute query using LeaderboardService
5. Format response
6. Return result

**Response Format**:
```typescript
{
  data: {
    getLeaderboard: LeaderboardResponse
  }
}
```

**Error Response Format**:
```typescript
{
  errors: [{
    message: string,
    extensions: {
      code: string,
      statusCode: number
    }
  }]
}
```


## 8. Frontend Design

### 8.1 Leaderboard Page Component

**Location**: `apps/web/src/pages/leaderboard/LeaderboardPage.tsx`

**Component Structure**:
```
LeaderboardPage
├── TimeframeSelector (tabs: Daily, Weekly, Monthly, All-Time)
├── GameTypeFilter (dropdown: All Games, Memory Match, Math Challenge, Word Puzzle, Language Learning)
├── LeaderboardTable
│   ├── LeaderboardHeader (Rank, Username, Score, Performance)
│   └── LeaderboardRow[] (with current user highlight)
└── LoadingSpinner / ErrorMessage
```

**State Management**:
```typescript
interface LeaderboardState {
  timeframe: Timeframe;
  gameType: GameType;
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  totalEntries: number;
  loading: boolean;
  error: string | null;
}
```

**GraphQL Query**:
```graphql
query GetLeaderboard($gameType: GameType!, $timeframe: Timeframe!, $limit: Int) {
  getLeaderboard(gameType: $gameType, timeframe: $timeframe, limit: $limit) {
    entries {
      rank
      userId
      username
      score
      gameType
      difficulty
      completionTime
      accuracy
      timestamp
      isCurrentUser
    }
    currentUserEntry {
      rank
      userId
      username
      score
      gameType
      difficulty
      completionTime
      accuracy
      timestamp
      isCurrentUser
    }
    totalEntries
    timeframe
  }
}
```

**Responsive Design**:
- Desktop: Full table with all columns
- Tablet: Condensed table with essential columns
- Mobile: Card-based layout with stacked information

### 8.2 Dashboard Integration

**Location**: `apps/web/src/pages/dashboard/UserDashboard.tsx`

**New Components**:
1. **LeaderboardRankWidget**: Display user's current rank for each game
2. **ScoreTrendsChart**: Line chart showing score history over time
3. **RecentImprovements**: List of recent score improvements with percentage change

**LeaderboardRankWidget Structure**:
```typescript
interface RankWidgetProps {
  gameType: GameType;
  rank: number;
  totalPlayers: number;
  percentile: number;
  bestScore: number;
}
```

**GraphQL Query**:
```graphql
query GetUserRanks {
  memoryMatchRank: getUserRank(gameType: MEMORY_MATCH, timeframe: ALL_TIME) {
    rank
    score
    totalPlayers
    percentile
  }
  mathChallengeRank: getUserRank(gameType: MATH_CHALLENGE, timeframe: ALL_TIME) {
    rank
    score
    totalPlayers
    percentile
  }
  wordPuzzleRank: getUserRank(gameType: WORD_PUZZLE, timeframe: ALL_TIME) {
    rank
    score
    totalPlayers
    percentile
  }
  languageLearningRank: getUserRank(gameType: LANGUAGE_LEARNING, timeframe: ALL_TIME) {
    rank
    score
    totalPlayers
    percentile
  }
}
```

### 8.3 Score Breakdown Modal

**Location**: `apps/web/src/components/game/ScoreBreakdownModal.tsx`

**Purpose**: Display score calculation details after game completion

**Component Structure**:
```
ScoreBreakdownModal
├── ModalHeader (Game Type, Final Score)
├── ScoreBreakdownTable
│   ├── Base Score row
│   ├── Difficulty Multiplier row
│   ├── Speed Bonus row
│   ├── Accuracy Bonus row
│   └── Final Score row (highlighted)
├── LeaderboardRankBadge (Your new rank: #42)
└── ActionButtons (View Leaderboard, Play Again, Close)
```

**Props**:
```typescript
interface ScoreBreakdownProps {
  scoreBreakdown: {
    baseScore: number;
    difficultyMultiplier: number;
    speedBonus: number;
    accuracyBonus: number;
    finalScore: number;
    difficulty: string;
    completionTime: number;
    accuracy: number;
  };
  leaderboardRank: number;
  gameType: GameType;
  onClose: () => void;
}
```


## 9. Infrastructure Design

### 9.1 AWS Resources

**New Resources**:

1. **EventBridge Event Bus**
   - Name: `game-events`
   - Purpose: Route GameCompleted events to Leaderboard Service
   - Event pattern: Match `detail-type: "GameCompleted"`

2. **Leaderboard Service Lambda**
   - Runtime: Node.js 20.x
   - Memory: 512 MB
   - Timeout: 30 seconds
   - Environment variables:
     - `LEADERBOARD_TABLE_NAME`
     - `USER_AGGREGATES_TABLE_NAME`
     - `COGNITO_USER_POOL_ID`
     - `RATE_LIMIT_TABLE_NAME`
   - IAM permissions:
     - DynamoDB: Read/Write on LeaderboardEntries and UserAggregates
     - CloudWatch: PutMetricData
     - EventBridge: Receive events

3. **DynamoDB Table: LeaderboardEntries**
   - Billing mode: PAY_PER_REQUEST (on-demand)
   - Partition key: `gameType` (String)
   - Sort key: `scoreTimestamp` (String)
   - GSI: DailyLeaderboardIndex, WeeklyLeaderboardIndex, MonthlyLeaderboardIndex, UserScoreHistoryIndex
   - Point-in-time recovery: Enabled
   - Encryption: AWS managed keys

4. **DynamoDB Table: UserAggregates**
   - Billing mode: PAY_PER_REQUEST (on-demand)
   - Partition key: `userId` (String)
   - Sort key: `gameType` (String)
   - GSI: OverallLeaderboardIndex
   - Point-in-time recovery: Enabled
   - Encryption: AWS managed keys

5. **DynamoDB Table: RateLimitBuckets**
   - Billing mode: PAY_PER_REQUEST (on-demand)
   - Partition key: `userId` (String)
   - TTL attribute: `expiresAt`
   - Purpose: Track rate limit state per user

6. **CloudWatch Alarms**
   - High error rate alarm (>1%)
   - High latency alarm (p99 >500ms)
   - EventBridge processing lag alarm
   - DynamoDB throttling alarm

7. **Dead Letter Queue (SQS)**
   - Name: `leaderboard-dlq`
   - Purpose: Store failed event processing attempts
   - Message retention: 14 days

### 9.2 EventBridge Rule Configuration

**Rule Name**: `game-completed-to-leaderboard`

**Event Pattern**:
```json
{
  "source": ["game-service"],
  "detail-type": ["GameCompleted"]
}
```

**Target**: Leaderboard Service Lambda

**Retry Policy**:
- Maximum retry attempts: 3
- Maximum event age: 1 hour
- Dead-letter queue: leaderboard-dlq

### 9.3 CDK Stack Structure

**Stack Name**: `LeaderboardStack`

**Dependencies**:
- Existing GameStack (for event bus integration)
- Existing CognitoStack (for authentication)

**Exports**:
- Leaderboard Service Lambda ARN
- LeaderboardEntries table name
- UserAggregates table name
- Event bus ARN


## 10. Implementation Details

### 10.1 Scoring Service Implementation

**Class**: `ScoringService`

**Methods**:

1. **calculateScore(gameType, performanceMetrics, difficulty, completionTime)**
   - Input: Game type, performance metrics, difficulty, completion time
   - Output: ScoreBreakdown object
   - Logic:
     - Load configuration for game type
     - Calculate base score
     - Apply difficulty multiplier
     - Calculate speed bonus
     - Calculate accuracy bonus
     - Return breakdown with final score

2. **validateScore(gameType, score, completionTime, accuracy)**
   - Input: Game type, score, completion time, accuracy
   - Output: ValidationResult (valid: boolean, errors: string[])
   - Logic:
     - Check completion time bounds
     - Check accuracy bounds
     - Check score range
     - Return validation result

3. **loadConfiguration()**
   - Input: None
   - Output: ScoringConfig object
   - Logic:
     - Read scoring.config.json
     - Parse JSON
     - Validate structure
     - Return configuration

**Configuration File**: `scoring.config.json`

```json
{
  "memoryMatch": {
    "baseScore": 1000,
    "difficultyMultipliers": {
      "EASY": 1.0,
      "MEDIUM": 1.5,
      "HARD": 2.0
    },
    "speedBonusParams": {
      "maxTime": 60,
      "formula": "max(0, 1 + (maxTime - completionTime) / maxTime)"
    },
    "accuracyBonusParams": {
      "formula": "1 + (1 - attempts / (pairs * 2)) * 0.5"
    },
    "validationRules": {
      "minCompletionTime": 5,
      "maxCompletionTime": 300,
      "minScore": 0,
      "maxScore": 6000
    }
  },
  "mathChallenge": {
    "baseScore": 100,
    "difficultyMultipliers": {
      "EASY": 1.0,
      "MEDIUM": 1.5,
      "HARD": 2.0
    },
    "speedBonusParams": {
      "maxTime": 10,
      "formula": "max(0, 1 + (timeLimit - avgTimePerQuestion) / timeLimit)"
    },
    "accuracyBonusParams": {
      "formula": "correctAnswers / totalQuestions"
    },
    "validationRules": {
      "minCompletionTime": 10,
      "maxCompletionTime": 600,
      "minScore": 0,
      "maxScore": 10000
    }
  },
  "wordPuzzle": {
    "baseScore": 50,
    "difficultyMultipliers": {
      "EASY": 1.0,
      "MEDIUM": 1.5,
      "HARD": 2.0
    },
    "speedBonusParams": {
      "maxTime": 180,
      "formula": "max(0, 1 + (maxTime - completionTime) / maxTime)"
    },
    "accuracyBonusParams": {
      "formula": "1 + (wordsFound / totalWords) * 0.5"
    },
    "validationRules": {
      "minCompletionTime": 15,
      "maxCompletionTime": 600,
      "minScore": 0,
      "maxScore": 6000
    }
  },
  "languageLearning": {
    "baseScore": 100,
    "difficultyMultipliers": {
      "BEGINNER": 1.0,
      "INTERMEDIATE": 1.5,
      "ADVANCED": 2.0
    },
    "speedBonusParams": {
      "maxTime": 30,
      "formula": "max(0, 1 + (maxTime - avgTimePerMatch) / maxTime)"
    },
    "accuracyBonusParams": {
      "formula": "correctMatches / totalAttempts"
    },
    "validationRules": {
      "minCompletionTime": 10,
      "maxCompletionTime": 300,
      "minScore": 0,
      "maxScore": 8000
    }
  }
}
```

### 10.2 Leaderboard Service Implementation

**Class**: `LeaderboardService`

**Methods**:

1. **getLeaderboard(gameType, timeframe, limit, userId)**
   - Query appropriate index based on timeframe
   - Retrieve top N entries
   - Find current user's entry
   - Calculate ranks
   - Return LeaderboardResponse

2. **getUserRank(gameType, timeframe, userId)**
   - Get user's best score for timeframe
   - Count entries with higher scores
   - Calculate rank and percentile
   - Return UserRankResponse

3. **getUserScoreHistory(userId, gameType, limit)**
   - Query UserScoreHistoryIndex
   - Filter by gameType if provided
   - Sort by timestamp descending
   - Return LeaderboardEntry[]

4. **createLeaderboardEntry(scoreData)**
   - Create entry in LeaderboardEntries table
   - Update UserAggregates
   - Return created entry

5. **updateUserAggregate(userId, gameType, score, timestamp)**
   - Get existing aggregate or create new
   - Update totalScore, gamesPlayed, averageScore
   - Update bestScore if applicable
   - Update timeframe-specific scores (daily, weekly, monthly)
   - Save updated aggregate

### 10.3 Anomaly Detection Implementation

**Class**: `AnomalyService`

**Methods**:

1. **detectAnomalies(userId, gameType, score, completionTime)**
   - Check statistical outliers
   - Check velocity patterns
   - Check pattern anomalies
   - Return AnomalyResult

2. **isStatisticalOutlier(gameType, difficulty, score)**
   - Get mean and standard deviation from cache
   - Calculate z-score: (score - mean) / stdDev
   - Flag if z-score > 3
   - Return boolean

3. **checkVelocity(userId)**
   - Count games in last minute
   - Count games in last day
   - Flag if exceeds thresholds
   - Return boolean

4. **updateStatistics()**
   - Batch job runs daily
   - Calculate mean and standard deviation for each game type and difficulty
   - Store in DynamoDB cache table
   - Used by isStatisticalOutlier


## 11. Game Service Modifications

### 11.1 Minimal Changes to Existing Code

**File**: `services/game/src/handlers/game.handler.ts`

**Change**: Add EventBridge event publishing after successful game completion

**Modified Method**: `completeGame`

**Pseudocode**:
```typescript
async completeGame(input: CompleteGameInput): Promise<CompleteGameResponse> {
  // Existing logic (unchanged)
  const game = await this.gameService.completeGame(input);
  
  // NEW: Publish event to EventBridge
  try {
    await this.eventBridge.putEvents({
      Entries: [{
        Source: 'game-service',
        DetailType: 'GameCompleted',
        Detail: JSON.stringify({
          gameId: game.id,
          userId: game.userId,
          username: game.username,
          gameType: game.gameType,
          difficulty: game.difficulty,
          completionTime: game.completionTime,
          accuracy: game.accuracy,
          performanceMetrics: game.performanceMetrics,
          timestamp: game.completedAt
        }),
        EventBusName: 'game-events'
      }]
    });
  } catch (error) {
    // Log error but don't fail game completion
    console.error('Failed to publish GameCompleted event:', error);
  }
  
  // Existing return (unchanged)
  return {
    success: true,
    message: 'Game completed successfully',
    game
  };
}
```

**Key Design Decision**: Event publishing failure does not fail game completion. This ensures backward compatibility and resilience.

### 11.2 EventBridge Client Setup

**File**: `services/game/src/clients/eventbridge.client.ts`

**Purpose**: Wrapper for AWS EventBridge SDK

**Implementation**:
```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

export class EventBridgeClientWrapper {
  private client: EventBridgeClient;
  
  constructor() {
    this.client = new EventBridgeClient({ region: process.env.AWS_REGION });
  }
  
  async publishGameCompleted(event: GameCompletedEvent): Promise<void> {
    const command = new PutEventsCommand({
      Entries: [{
        Source: 'game-service',
        DetailType: 'GameCompleted',
        Detail: JSON.stringify(event),
        EventBusName: process.env.EVENT_BUS_NAME || 'game-events'
      }]
    });
    
    await this.client.send(command);
  }
}
```

## 12. Data Migration and Backfill

### 12.1 Backfill Strategy

**Purpose**: Calculate scores for existing game records and populate leaderboard tables

**Approach**: Batch processing with checkpointing

**Steps**:
1. Query all completed games from Games table
2. Process in batches of 100 games
3. For each game:
   - Calculate score using ScoringService
   - Create LeaderboardEntry with original timestamp
   - Update UserAggregate
4. Store checkpoint after each batch
5. Resume from checkpoint on failure

**Script Location**: `scripts/backfill-leaderboard.ts`

**Execution**: One-time manual execution after deployment

**Monitoring**: CloudWatch logs for progress tracking

### 12.2 Backfill Implementation

**Pseudocode**:
```typescript
async function backfillLeaderboard() {
  let lastEvaluatedKey = null;
  let processedCount = 0;
  
  do {
    // Query batch of completed games
    const result = await gamesTable.scan({
      FilterExpression: 'attribute_exists(completedAt)',
      Limit: 100,
      ExclusiveStartKey: lastEvaluatedKey
    });
    
    // Process each game
    for (const game of result.Items) {
      try {
        // Calculate score
        const scoreBreakdown = scoringService.calculateScore(
          game.gameType,
          game.performanceMetrics,
          game.difficulty,
          game.completionTime
        );
        
        // Create leaderboard entry
        await leaderboardService.createLeaderboardEntry({
          gameId: game.id,
          userId: game.userId,
          username: game.username,
          gameType: game.gameType,
          score: scoreBreakdown.finalScore,
          difficulty: game.difficulty,
          completionTime: game.completionTime,
          accuracy: game.accuracy,
          timestamp: game.completedAt,
          metadata: game.performanceMetrics
        });
        
        processedCount++;
      } catch (error) {
        console.error(`Failed to backfill game ${game.id}:`, error);
      }
    }
    
    // Save checkpoint
    await saveCheckpoint({ lastEvaluatedKey: result.LastEvaluatedKey, processedCount });
    
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  console.log(`Backfill complete. Processed ${processedCount} games.`);
}
```


## 13. Performance Optimization

### 13.1 Caching Strategy

**CloudFront Caching**:
- Cache leaderboard queries at edge locations
- TTL: 60 seconds for leaderboards
- Cache key includes: gameType, timeframe, limit
- Invalidate on new high scores

**Application-Level Caching**:
- Cache user rank in memory for 30 seconds
- Cache leaderboard statistics (mean, stdDev) for 24 hours
- Use Redis/ElastiCache if query volume increases

### 13.2 Query Optimization

**DynamoDB Best Practices**:
- Use GSI for all leaderboard queries (avoid scans)
- Limit query results to 100 entries
- Use consistent reads only when necessary
- Batch write operations when possible

**Index Selection**:
- Daily queries: Use DailyLeaderboardIndex
- Weekly queries: Use WeeklyLeaderboardIndex
- Monthly queries: Use MonthlyLeaderboardIndex
- All-time queries: Use main table with gameType partition
- User history: Use UserScoreHistoryIndex

### 13.3 Scalability Considerations

**Current Design Capacity**:
- Supports up to 10,000 concurrent users
- Handles 100 game completions per second
- Leaderboard queries: 1,000 requests per second

**Scaling Triggers**:
- If query latency > 500ms: Add read replicas or caching
- If write throughput insufficient: Increase DynamoDB capacity
- If Lambda concurrency limits reached: Request limit increase

## 14. Monitoring and Observability

### 14.1 CloudWatch Metrics

**Custom Metrics**:
- `LeaderboardQueryLatency`: Time to execute leaderboard queries
- `ScoreCalculationErrors`: Count of score calculation failures
- `EventProcessingLag`: Time between event publish and processing
- `AnomalyDetectionRate`: Percentage of scores flagged as suspicious
- `RateLimitExceeded`: Count of rate limit violations

**Dimensions**:
- GameType: MEMORY_MATCH, MATH_CHALLENGE, WORD_PUZZLE, LANGUAGE_LEARNING
- Timeframe: DAILY, WEEKLY, MONTHLY, ALL_TIME
- Operation: getLeaderboard, getUserRank, getUserScoreHistory

### 14.2 CloudWatch Alarms

**Critical Alarms**:
1. **High Error Rate**
   - Metric: Error count
   - Threshold: > 1% of requests
   - Action: SNS notification to ops team

2. **High Latency**
   - Metric: p99 query latency
   - Threshold: > 500ms
   - Action: SNS notification to ops team

3. **Event Processing Lag**
   - Metric: Time between event publish and processing
   - Threshold: > 5 seconds
   - Action: SNS notification to ops team

4. **DynamoDB Throttling**
   - Metric: ThrottledRequests
   - Threshold: > 10 per minute
   - Action: Auto-scale DynamoDB capacity

### 14.3 Logging Strategy

**Log Levels**:
- ERROR: Validation failures, service errors, anomalies
- WARN: Rate limit exceeded, suspicious scores
- INFO: Event processing, query execution
- DEBUG: Detailed calculation steps (disabled in production)

**Structured Logging Format**:
```json
{
  "timestamp": "2026-03-11T10:30:00.000Z",
  "level": "INFO",
  "service": "leaderboard-service",
  "operation": "calculateScore",
  "userId": "user-id",
  "gameType": "MEMORY_MATCH",
  "score": 1641,
  "duration": 45,
  "message": "Score calculated successfully"
}
```


## 15. Testing Strategy

### 15.1 Unit Tests

**Scoring Service Tests**:
- Test each game-specific scoring formula
- Test boundary conditions (min/max values)
- Test configuration loading and validation
- Test score validation rules
- Test configuration round-trip (parse → format → parse)

**Leaderboard Service Tests**:
- Test leaderboard query logic
- Test rank calculation
- Test user aggregate updates
- Test timeframe filtering

**Anomaly Detection Tests**:
- Test statistical outlier detection
- Test velocity detection
- Test pattern detection

### 15.2 Integration Tests

**Event Flow Tests**:
- Test GameCompleted event publishing from Game Service
- Test event consumption by Leaderboard Service
- Test end-to-end score calculation and storage

**GraphQL API Tests**:
- Test getLeaderboard query with various parameters
- Test getUserRank query
- Test getUserScoreHistory query
- Test authentication and authorization
- Test rate limiting

**Database Tests**:
- Test LeaderboardEntries CRUD operations
- Test UserAggregates CRUD operations
- Test GSI queries
- Test concurrent writes

### 15.3 Property-Based Tests

**Correctness Properties**:

1. **Score Monotonicity**: Better performance always yields higher or equal score
   - Property: If accuracy2 ≥ accuracy1 AND completionTime2 ≤ completionTime1, then score2 ≥ score1

2. **Score Bounds**: All scores are within valid ranges
   - Property: For all games, minScore ≤ calculatedScore ≤ maxScore

3. **Rank Consistency**: Higher scores always have better (lower) ranks
   - Property: If score1 > score2, then rank1 < rank2

4. **Aggregate Consistency**: User aggregates match sum of individual entries
   - Property: UserAggregate.totalScore = sum(LeaderboardEntries.score) for userId

5. **Configuration Round-Trip**: Configuration parsing is idempotent
   - Property: parse(format(parse(config))) = parse(config)

6. **Timeframe Isolation**: Entries in different timeframes don't overlap
   - Property: Daily entries ⊆ Weekly entries ⊆ Monthly entries ⊆ All-time entries

**Test Framework**: fast-check (property-based testing library for TypeScript)

**Example Property Test**:
```typescript
import fc from 'fast-check';

test('Score monotonicity property', () => {
  fc.assert(
    fc.property(
      fc.record({
        accuracy1: fc.float({ min: 0, max: 1 }),
        accuracy2: fc.float({ min: 0, max: 1 }),
        time1: fc.float({ min: 5, max: 300 }),
        time2: fc.float({ min: 5, max: 300 })
      }),
      ({ accuracy1, accuracy2, time1, time2 }) => {
        if (accuracy2 >= accuracy1 && time2 <= time1) {
          const score1 = calculateScore({ accuracy: accuracy1, time: time1 });
          const score2 = calculateScore({ accuracy: accuracy2, time: time2 });
          return score2 >= score1;
        }
        return true; // Skip cases that don't meet precondition
      }
    )
  );
});
```

### 15.4 Load Testing

**Scenarios**:
1. 100 concurrent users querying leaderboards
2. 50 game completions per second
3. 1000 leaderboard queries per minute
4. Spike test: 500 concurrent users for 1 minute

**Tools**: Artillery or k6 for load testing

**Success Criteria**:
- p95 latency < 200ms
- p99 latency < 500ms
- Error rate < 0.1%
- No DynamoDB throttling


## 16. Deployment Strategy

### 16.1 Phased Rollout

**Phase 1: Infrastructure Setup**
- Deploy DynamoDB tables (LeaderboardEntries, UserAggregates, RateLimitBuckets)
- Deploy EventBridge event bus
- Deploy Leaderboard Service Lambda
- Configure EventBridge rule
- Verify event flow with test events

**Phase 2: Backend Integration**
- Modify Game Service to publish GameCompleted events
- Deploy updated Game Service
- Monitor event publishing and processing
- Verify no impact on existing game functionality

**Phase 3: Data Backfill**
- Run backfill script to process existing games
- Monitor progress and error rates
- Verify leaderboard data accuracy

**Phase 4: GraphQL API Extension**
- Add new GraphQL schema types and queries
- Deploy updated API Gateway configuration
- Test new queries with Postman/GraphQL Playground

**Phase 5: Frontend Deployment**
- Deploy Leaderboard Page
- Deploy Dashboard widgets
- Deploy Score Breakdown modal
- Enable feature flag for leaderboard visibility

**Phase 6: Monitoring and Optimization**
- Monitor CloudWatch metrics
- Tune DynamoDB capacity if needed
- Optimize query performance
- Address any issues reported by users

### 16.2 Rollback Plan

**If issues occur**:
1. Disable EventBridge rule (stops event processing)
2. Revert Game Service to previous version (stops event publishing)
3. Hide leaderboard UI components via feature flag
4. Investigate and fix issues
5. Re-enable when ready

**Data Preservation**:
- All leaderboard data remains in DynamoDB
- No data loss during rollback
- Can resume from last checkpoint

### 16.3 Feature Flags

**Flags**:
- `LEADERBOARD_ENABLED`: Master switch for entire feature
- `LEADERBOARD_PAGE_VISIBLE`: Show/hide leaderboard page
- `DASHBOARD_WIDGETS_VISIBLE`: Show/hide dashboard widgets
- `SCORE_BREAKDOWN_VISIBLE`: Show/hide score breakdown modal

**Implementation**: Environment variables or AWS AppConfig


## 17. Security Considerations

### 17.1 Input Validation

**Event Validation**:
- Validate event structure matches schema
- Validate all required fields are present
- Validate data types (numbers, strings, timestamps)
- Reject malformed events

**Query Parameter Validation**:
- Validate gameType is valid enum value
- Validate timeframe is valid enum value
- Validate limit is within bounds (1-100)
- Sanitize all string inputs

### 17.2 SQL Injection Prevention

**Not Applicable**: DynamoDB is NoSQL, no SQL injection risk

**Mitigation**: Use parameterized queries for all DynamoDB operations

### 17.3 Data Privacy

**PII Protection**:
- Never expose email addresses in leaderboard responses
- Only expose username and userId
- Respect user opt-out preferences
- Implement data retention policies

**GDPR Compliance**:
- Support user data deletion requests
- Provide data export functionality
- Document data processing purposes
- Obtain consent for leaderboard participation

### 17.4 Rate Limiting Implementation

**Token Bucket Algorithm**:
```typescript
interface RateLimitBucket {
  userId: string;
  tokens: number;
  lastRefill: number;
  expiresAt: number; // TTL for DynamoDB
}

async function checkRateLimit(userId: string): Promise<boolean> {
  const bucket = await getRateLimitBucket(userId);
  const now = Date.now();
  
  // Refill tokens based on time elapsed
  const elapsedSeconds = (now - bucket.lastRefill) / 1000;
  const tokensToAdd = Math.floor(elapsedSeconds / 6); // 10 tokens per minute = 1 token per 6 seconds
  bucket.tokens = Math.min(10, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
  
  // Check if tokens available
  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    await updateRateLimitBucket(bucket);
    return true; // Request allowed
  }
  
  return false; // Rate limit exceeded
}
```

### 17.5 Anomaly Detection Security

**Purpose**: Prevent cheating and score manipulation

**Detection Mechanisms**:
1. Statistical analysis (z-score > 3)
2. Velocity checks (games per minute/day)
3. Pattern analysis (identical scores, consistent times)

**Response Actions**:
- Flag suspicious entries
- Exclude from public leaderboards
- Log for admin review
- Alert security team for severe cases

## 18. Error Handling

### 18.1 Error Categories

**Validation Errors** (4xx):
- Invalid input parameters
- Authentication failures
- Rate limit exceeded
- Malformed requests

**Service Errors** (5xx):
- DynamoDB unavailable
- EventBridge failures
- Lambda timeouts
- Configuration errors

### 18.2 Error Response Format

**GraphQL Error Response**:
```json
{
  "errors": [{
    "message": "Rate limit exceeded",
    "extensions": {
      "code": "RATE_LIMIT_EXCEEDED",
      "statusCode": 429,
      "retryAfter": 30
    }
  }]
}
```

**Event Processing Error**:
- Log error with full context
- Retry with exponential backoff
- Send to DLQ after max retries
- Alert ops team

### 18.3 Graceful Degradation

**If Leaderboard Service is unavailable**:
- Game completion continues to work
- Events are queued in EventBridge
- Frontend shows "Leaderboard temporarily unavailable"
- Users can still play games

**If DynamoDB is throttled**:
- Return cached results if available
- Show stale data with timestamp
- Retry writes in background


## 19. Traceability Matrix

This section maps requirements to design components, ensuring all requirements are addressed.

| Requirement | Design Component | Implementation Location |
|-------------|------------------|-------------------------|
| Req 1: Consistent Scoring Formula | Scoring Service Module | `scoring.service.ts` |
| Req 2: Memory Match Scoring | Memory Match formula in config | `scoring.config.json` |
| Req 3: Math Challenge Scoring | Math Challenge formula in config | `scoring.config.json` |
| Req 4: Word Puzzle Scoring | Word Puzzle formula in config | `scoring.config.json` |
| Req 5: Language Learning Scoring | Language Learning formula in config | `scoring.config.json` |
| Req 6: Leaderboard Entry Storage | LeaderboardEntries table | `leaderboard.repository.ts` |
| Req 7: User Score Aggregation | UserAggregates table | `aggregate.repository.ts` |
| Req 8: Daily Leaderboard Query | DailyLeaderboardIndex | `leaderboard.service.ts` |
| Req 9: Weekly Leaderboard Query | WeeklyLeaderboardIndex | `leaderboard.service.ts` |
| Req 10: Monthly Leaderboard Query | MonthlyLeaderboardIndex | `leaderboard.service.ts` |
| Req 11: All-Time Leaderboard Query | Main table query | `leaderboard.service.ts` |
| Req 12: Overall Leaderboard | UserAggregates OVERALL type | `leaderboard.service.ts` |
| Req 13: User Rank Query | getUserRank method | `leaderboard.service.ts` |
| Req 14: User Score History | UserScoreHistoryIndex | `leaderboard.service.ts` |
| Req 15: Event-Driven Score Processing | EventBridge integration | `event.handler.ts`, `game.handler.ts` |
| Req 16: GraphQL Schema Extension | GraphQL schema types | `schema.graphql` |
| Req 17: Authentication | JWT validation | `auth.util.ts` |
| Req 18: Rate Limiting | Token bucket algorithm | `ratelimit.util.ts` |
| Req 19: Score Validation | Validation rules | `scoring.service.ts` |
| Req 20: Anomaly Detection | Anomaly detection module | `anomaly.service.ts` |
| Req 21: Privacy Controls | Opt-out filtering | `leaderboard.service.ts` |
| Req 22: Dashboard Integration | Dashboard widgets | `UserDashboard.tsx` |
| Req 23: Leaderboard Page | Leaderboard page component | `LeaderboardPage.tsx` |
| Req 24: Score Breakdown Display | Score breakdown modal | `ScoreBreakdownModal.tsx` |
| Req 25: Backward Compatibility | Event-driven architecture | EventBridge decoupling |
| Req 26: Data Backfill | Backfill script | `scripts/backfill-leaderboard.ts` |
| Req 27: Performance Monitoring | CloudWatch metrics | All service methods |
| Req 28: Error Handling and Alerts | CloudWatch alarms | Infrastructure config |
| Req 29: Configuration Parser | Config loading | `scoring.service.ts` |
| Req 30: Configuration Pretty Printer | Format function | `scoring.service.ts` |
| Req 31: Configuration Round-Trip | Round-trip tests | Unit tests |

## 20. Open Questions and Risks

### 20.1 Open Questions

1. **User Opt-Out Storage**: Where should user privacy preferences be stored?
   - Option A: Add `leaderboardOptOut` field to Users table
   - Option B: Create separate UserPreferences table
   - **Recommendation**: Option A for simplicity

2. **Overall Leaderboard Calculation**: Should overall scores be sum or weighted average?
   - Option A: Sum of all game scores
   - Option B: Weighted average based on games played
   - **Recommendation**: Option A (sum) for simplicity and fairness

3. **Tie Breaking**: How should ties be handled in rankings?
   - Option A: Same rank for tied scores
   - Option B: Earlier timestamp gets better rank
   - **Recommendation**: Option B (timestamp-based)

### 20.2 Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| EventBridge event loss | Scores not recorded | Low | Use DLQ, monitor event delivery |
| DynamoDB throttling | Query failures | Medium | Use on-demand billing, implement caching |
| Score manipulation | Unfair leaderboards | Medium | Implement anomaly detection, validation |
| High query costs | Budget overrun | Low | Implement caching, set query limits |
| Privacy violations | Legal issues | Low | Implement opt-out, never expose PII |
| Game Service regression | Existing features break | Low | Minimal changes, comprehensive testing |

## 21. Future Enhancements

### 21.1 Potential Improvements

1. **Real-Time Updates**: Use WebSockets to push leaderboard updates to connected clients
2. **Social Features**: Add friend leaderboards, challenges, achievements
3. **Historical Analysis**: Provide detailed analytics on score trends and patterns
4. **Machine Learning**: Use ML to detect sophisticated cheating patterns
5. **Global Leaderboards**: Support multi-region leaderboards with eventual consistency
6. **Seasonal Leaderboards**: Add time-limited competitive seasons with rewards

### 21.2 Scalability Roadmap

**Current Design**: Supports 10,000 concurrent users

**Next Tier** (100,000 users):
- Add ElastiCache for caching
- Use DynamoDB Global Tables for multi-region
- Implement read replicas

**Enterprise Tier** (1,000,000+ users):
- Migrate to time-series database for score history
- Implement sharding strategy
- Use CDN for leaderboard caching
- Add dedicated analytics pipeline

## 22. Summary

This design document provides a comprehensive blueprint for implementing a leaderboard and scoring system that:

- Uses consistent, fair scoring formulas across all four games
- Provides efficient leaderboard queries with multiple timeframes (daily, weekly, monthly, all-time)
- Maintains backward compatibility through event-driven architecture
- Ensures security through authentication, validation, and anomaly detection
- Supports scalability with optimized DynamoDB indexes and caching
- Enables monitoring and observability with CloudWatch metrics and alarms
- Respects user privacy with opt-out controls and PII protection

The design addresses all 31 requirements from the requirements document and provides clear implementation guidance for developers. The event-driven architecture ensures that existing game functionality remains stable while adding powerful new leaderboard capabilities.

