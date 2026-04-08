# Phase 3 Task 13 Complete: GraphQL Schema Extensions

## Summary

Successfully extended the GraphQL schema to support leaderboard and scoring functionality across both Game Service and Leaderboard Service.

## Changes Made

### 1. Created Leaderboard Service Schema (`services/leaderboard/schema.graphql`)

Added complete GraphQL schema for the Leaderboard Service with:

#### Queries
- `getLeaderboard(gameType, timeframe, limit)` - Get leaderboard rankings
- `getUserRank(gameType, timeframe)` - Get current user's rank
- `getUserScoreHistory(gameType, limit)` - Get user's score history

#### Types
- `LeaderboardResponse` - Leaderboard data with entries and metadata
- `LeaderboardEntry` - Individual leaderboard entry with rank, score, and user info
- `UserRankResponse` - User's rank with percentile information
- `ScoreBreakdown` - Detailed score calculation breakdown

#### Enums
- `GameType` - MEMORY_MATCH, MATH_CHALLENGE, WORD_PUZZLE, LANGUAGE_LEARNING, OVERALL
- `Timeframe` - DAILY, WEEKLY, MONTHLY, ALL_TIME

### 2. Extended Game Service Schema (`services/game/schema.graphql`)

#### Updated CompleteGameResponse
Added two new fields:
- `scoreBreakdown: ScoreBreakdown` - Detailed score calculation
- `leaderboardRank: Int` - User's rank after game completion

#### Added Leaderboard Queries
Integrated leaderboard queries into the main schema (routed to Leaderboard Service):
- `getLeaderboard(gameType, timeframe, limit)`
- `getUserRank(gameType, timeframe)`
- `getUserScoreHistory(gameType, limit)`

#### Added New Types
- `ScoreBreakdown` - Score calculation details
- `LeaderboardResponse` - Leaderboard data
- `LeaderboardEntry` - Individual entry
- `UserRankResponse` - User rank information
- `GameType` enum
- `Timeframe` enum

### 3. Updated API Gateway Configuration (`infrastructure/lib/stacks/api-stack.ts`)

#### Added Leaderboard Lambda Integration
- Created `leaderboardIntegration` for routing requests
- Added `leaderboardLambda` to `ApiStackProps` interface

#### Added Leaderboard Route
- Path: `/leaderboard/graphql`
- Method: POST
- Authorization: Cognito JWT (required)
- Integration: Leaderboard Lambda

#### Added Output
- `LeaderboardEndpoint` - CloudFormation output for the leaderboard GraphQL endpoint

## API Endpoints

### Game Service Endpoint
```
POST /game/graphql
Authorization: Bearer <JWT_TOKEN>
```

Handles:
- All existing game operations (startGame, completeGame, etc.)
- Returns scoreBreakdown and leaderboardRank in CompleteGameResponse

### Leaderboard Service Endpoint
```
POST /leaderboard/graphql
Authorization: Bearer <JWT_TOKEN>
```

Handles:
- getLeaderboard queries
- getUserRank queries
- getUserScoreHistory queries

## Example Queries

### Get Leaderboard
```graphql
query GetLeaderboard {
  getLeaderboard(
    gameType: MEMORY_MATCH
    timeframe: WEEKLY
    limit: 100
  ) {
    entries {
      rank
      userId
      username
      score
      difficulty
      completionTime
      accuracy
      timestamp
      isCurrentUser
    }
    currentUserEntry {
      rank
      score
    }
    totalEntries
    timeframe
  }
}
```

### Get User Rank
```graphql
query GetUserRank {
  getUserRank(
    gameType: OVERALL
    timeframe: ALL_TIME
  ) {
    rank
    score
    totalPlayers
    percentile
  }
}
```

### Get User Score History
```graphql
query GetUserScoreHistory {
  getUserScoreHistory(
    gameType: MEMORY_MATCH
    limit: 50
  ) {
    rank
    score
    difficulty
    completionTime
    accuracy
    timestamp
  }
}
```

### Complete Game with Score Breakdown
```graphql
mutation CompleteGame {
  completeGame(input: {
    gameId: "game-123"
    completionTime: 45
    attempts: 12
  }) {
    id
    status
    score
    scoreBreakdown {
      baseScore
      difficultyMultiplier
      speedBonus
      accuracyBonus
      finalScore
      difficulty
      completionTime
      accuracy
    }
    leaderboardRank
    achievements {
      type
      unlocked
    }
  }
}
```

## Authentication & Authorization

All leaderboard endpoints require:
- Valid Cognito JWT token in Authorization header
- Token must be from the configured User Pool
- Rate limiting enforced (10 requests/minute per user)

## CORS Configuration

API Gateway configured to allow:
- Origins: Production app, staging app, localhost, Amplify deployment
- Methods: GET, POST, OPTIONS
- Headers: Content-Type, Authorization, X-Amz-*
- Credentials: Enabled

## Next Steps

1. Update frontend GraphQL client to use new queries
2. Implement score breakdown display in game completion UI
3. Create leaderboard page components
4. Add dashboard widgets for user rank
5. Test end-to-end flow from game completion to leaderboard update

## Files Modified

1. `services/leaderboard/schema.graphql` - Created
2. `services/game/schema.graphql` - Extended
3. `infrastructure/lib/stacks/api-stack.ts` - Updated

## Task Checklist

- [x] 13.1 Add LeaderboardEntry type
- [x] 13.2 Add LeaderboardResponse type
- [x] 13.3 Add ScoreBreakdown type
- [x] 13.4 Add UserRankResponse type
- [x] 13.5 Add GameType enum
- [x] 13.6 Add Timeframe enum
- [x] 13.7 Extend CompleteGameResponse with scoreBreakdown and leaderboardRank
- [x] 13.8 Add getLeaderboard query
- [x] 13.9 Add getUserRank query
- [x] 13.10 Add getUserScoreHistory query
- [x] 13.11 Update API Gateway configuration to route new queries to Leaderboard Service

## Status

✅ Task 13 Complete - All GraphQL schema extensions implemented and API Gateway configured
