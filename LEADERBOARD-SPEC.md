# Leaderboard & Scoring System Specification

## Overview
Implement a comprehensive scoring and leaderboard system for all 4 games (Memory Match, Math Challenge, Word Puzzle, Language Learning) with time-based rankings.

## 1. Scoring System

### Universal Scoring Formula
All games will use a consistent scoring formula to ensure fairness:

```
Final Score = Base Score × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
```

### Game-Specific Scoring

#### 1.1 Memory Match
**Base Score Calculation:**
- Base Points: 1000
- Difficulty Multiplier:
  - Easy (4 pairs): 1.0x
  - Medium (6 pairs): 1.5x
  - Hard (8 pairs): 2.0x
- Speed Bonus: `max(0, 1 + (60 - completionTime) / 60)` (bonus for completing under 60s)
- Accuracy Bonus: `1 + (1 - attempts / (pairs * 2)) * 0.5` (fewer attempts = higher bonus)

**Formula:**
```
Score = 1000 × difficultyMultiplier × speedBonus × accuracyBonus
```

**Example:**
- Hard difficulty (8 pairs), 45 seconds, 20 attempts
- Score = 1000 × 2.0 × 1.25 × 1.125 = 2,812 points

#### 1.2 Math Challenge
**Base Score Calculation:**
- Base Points: 100 per correct answer
- Difficulty Multiplier:
  - Easy: 1.0x
  - Medium: 1.5x
  - Hard: 2.0x
- Speed Bonus: `max(0, 1 + (timeLimit - avgTimePerQuestion) / timeLimit)`
- Accuracy Bonus: `correctAnswers / totalQuestions`

**Formula:**
```
Score = (correctAnswers × 100) × difficultyMultiplier × speedBonus × accuracyBonus
```

#### 1.3 Word Puzzle
**Base Score Calculation:**
- Base Points: 50 per word found
- Difficulty Multiplier:
  - Easy: 1.0x
  - Medium: 1.5x
  - Hard: 2.0x
- Speed Bonus: `max(0, 1 + (180 - completionTime) / 180)` (bonus for completing under 3 min)
- Completion Bonus: `1 + (wordsFound / totalWords) * 0.5`

**Formula:**
```
Score = (wordsFound × 50) × difficultyMultiplier × speedBonus × completionBonus
```

#### 1.4 Language Learning
**Base Score Calculation:**
- Base Points: 100 per correct match
- Difficulty Multiplier:
  - Beginner: 1.0x
  - Intermediate: 1.5x
  - Advanced: 2.0x
- Speed Bonus: `max(0, 1 + (30 - avgTimePerMatch) / 30)`
- Accuracy Bonus: `correctMatches / totalAttempts`

**Formula:**
```
Score = (correctMatches × 100) × difficultyMultiplier × speedBonus × accuracyBonus
```

## 2. Database Schema

### 2.1 Leaderboard Entries Table
```
Table: memory-game-leaderboard-dev
Partition Key: gameType (String) - "MEMORY_MATCH" | "MATH_CHALLENGE" | "WORD_PUZZLE" | "LANGUAGE_LEARNING" | "OVERALL"
Sort Key: scoreTimestamp (String) - ISO timestamp with score prefix for sorting: "SCORE#{score}#TIMESTAMP#{timestamp}"

Attributes:
- userId (String)
- username (String)
- score (Number)
- gameId (String) - Reference to the game played
- difficulty (String)
- completionTime (Number) - seconds
- accuracy (Number) - percentage
- timestamp (String) - ISO format
- metadata (Map) - Game-specific data

GSI1: UserScores
- Partition Key: userId
- Sort Key: timestamp
- Purpose: Get user's score history

GSI2: DailyLeaderboard
- Partition Key: gameType#date (String) - e.g., "MEMORY_MATCH#2026-03-10"
- Sort Key: score (Number, descending)
- Purpose: Daily rankings

GSI3: WeeklyLeaderboard
- Partition Key: gameType#week (String) - e.g., "MEMORY_MATCH#2026-W10"
- Sort Key: score (Number, descending)
- Purpose: Weekly rankings

GSI4: MonthlyLeaderboard
- Partition Key: gameType#month (String) - e.g., "MEMORY_MATCH#2026-03"
- Sort Key: score (Number, descending)
- Purpose: Monthly rankings
```

### 2.2 User Aggregate Scores Table
```
Table: memory-game-user-scores-dev
Partition Key: userId (String)
Sort Key: gameType (String)

Attributes:
- totalScore (Number)
- gamesPlayed (Number)
- averageScore (Number)
- bestScore (Number)
- lastPlayed (String)
- dailyScore (Number) - Today's total
- weeklyScore (Number) - This week's total
- monthlyScore (Number) - This month's total
```

## 3. API Design

### 3.1 GraphQL Schema Extensions

```graphql
# New Types
type LeaderboardEntry {
  rank: Int!
  userId: ID!
  username: String!
  score: Int!
  gameType: GameType!
  difficulty: String!
  completionTime: Int!
  accuracy: Float!
  timestamp: String!
  isCurrentUser: Boolean!
}

type LeaderboardResponse {
  entries: [LeaderboardEntry!]!
  currentUserEntry: LeaderboardEntry
  totalEntries: Int!
  timeframe: LeaderboardTimeframe!
}

enum GameType {
  MEMORY_MATCH
  MATH_CHALLENGE
  WORD_PUZZLE
  LANGUAGE_LEARNING
  OVERALL
}

enum LeaderboardTimeframe {
  DAILY
  WEEKLY
  MONTHLY
  ALL_TIME
}

# New Queries
type Query {
  getLeaderboard(
    gameType: GameType!
    timeframe: LeaderboardTimeframe!
    limit: Int
  ): LeaderboardResponse!
  
  getUserRank(
    gameType: GameType!
    timeframe: LeaderboardTimeframe!
  ): LeaderboardEntry
  
  getUserScoreHistory(
    gameType: GameType
    limit: Int
  ): [LeaderboardEntry!]!
}

# Extend existing CompleteGameResponse
type CompleteGameResponse {
  # ... existing fields
  scoreBreakdown: ScoreBreakdown!
  leaderboardRank: Int
}

type ScoreBreakdown {
  baseScore: Int!
  difficultyMultiplier: Float!
  speedBonus: Float!
  accuracyBonus: Float!
  finalScore: Int!
}
```

## 4. Architecture

### 4.1 New Lambda Function: Leaderboard Service
**Purpose:** Isolate leaderboard logic to avoid breaking existing game service

**Responsibilities:**
- Calculate scores using standardized formulas
- Update leaderboard entries
- Query leaderboard rankings
- Aggregate user scores

**Triggers:**
- API Gateway (GraphQL queries)
- EventBridge (from game completion events)

### 4.2 Event-Driven Updates
```
Game Service → EventBridge → Leaderboard Service
```

When a game is completed:
1. Game service publishes `GameCompleted` event
2. Leaderboard service consumes event
3. Calculates score using game-specific formula
4. Updates leaderboard tables
5. Updates user aggregate scores

### 4.3 Security Measures

**Authentication:**
- All leaderboard queries require valid JWT token
- User can only see their own detailed score history
- Public leaderboard shows limited user info (username only)

**Authorization:**
- Rate limiting on leaderboard queries (10 requests/minute per user)
- Pagination enforced (max 100 entries per request)
- No direct DynamoDB access from frontend

**Data Validation:**
- All scores validated against expected ranges
- Anomaly detection for suspicious scores
- Game completion time must be realistic (min/max bounds)

**Privacy:**
- Users can opt-out of public leaderboards
- Email addresses never exposed
- User IDs hashed in public APIs

## 5. Frontend Components

### 5.1 Leaderboard Page (`/leaderboard`)
**Features:**
- Tab navigation: Daily | Weekly | Monthly | All-Time
- Game filter: All Games | Memory Match | Math | Word | Language
- Top 100 rankings
- Current user's rank highlighted
- Responsive design

### 5.2 Dashboard Integration
**Updates to existing dashboard:**
- Add "Leaderboard Rank" widget
- Show score trends (chart)
- Display recent score improvements
- Link to full leaderboard

## 6. Implementation Phases

### Phase 1: Backend Infrastructure (Priority)
1. Create DynamoDB tables with GSIs
2. Implement scoring service (separate module)
3. Create leaderboard Lambda function
4. Set up EventBridge integration
5. Add GraphQL schema extensions
6. Write comprehensive tests

### Phase 2: Score Calculation Integration
1. Update game completion handlers to publish events
2. Implement score calculation for each game type
3. Add score breakdown to game responses
4. Backfill existing game data with calculated scores

### Phase 3: Frontend Development
1. Create leaderboard page component
2. Add leaderboard API client functions
3. Update dashboard with rank widgets
4. Add score breakdown display to game results

### Phase 4: Testing & Optimization
1. Load testing for leaderboard queries
2. Optimize GSI queries
3. Add caching layer (ElastiCache optional)
4. Monitor performance metrics

## 7. Migration Strategy

### Backward Compatibility
- Existing game APIs remain unchanged
- Score calculation is additive (doesn't modify existing data)
- Leaderboard is a new feature (no breaking changes)

### Data Backfill
```typescript
// Script to calculate scores for existing games
async function backfillScores() {
  const games = await getAllCompletedGames();
  
  for (const game of games) {
    const score = calculateScore(game);
    await createLeaderboardEntry({
      gameType: game.themeId,
      userId: game.userId,
      score,
      gameId: game.id,
      timestamp: game.completedAt
    });
  }
}
```

## 8. Monitoring & Alerts

**CloudWatch Metrics:**
- Leaderboard query latency
- Score calculation errors
- Event processing lag
- DynamoDB throttling

**Alarms:**
- High error rate (> 1%)
- Slow queries (> 500ms p99)
- Failed event processing

## 9. Cost Estimation

**DynamoDB:**
- Leaderboard table: ~$5/month (on-demand)
- User scores table: ~$2/month
- GSI costs: ~$3/month

**Lambda:**
- Leaderboard service: ~$2/month (estimated 100K invocations)

**Total:** ~$12/month additional cost

## 10. Success Metrics

**User Engagement:**
- % of users viewing leaderboard
- Average time on leaderboard page
- Return visits to check rankings

**Technical:**
- API response time < 200ms (p95)
- 99.9% uptime
- Zero data inconsistencies

## Next Steps

1. Review and approve specification
2. Create CDK infrastructure code
3. Implement scoring service
4. Deploy leaderboard Lambda
5. Build frontend components
6. Test end-to-end
7. Deploy to production
