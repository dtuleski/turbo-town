# API Contracts - Game Service

## GraphQL Schema

### Mutations

#### startGame
Start a new game with selected theme and difficulty.

```graphql
mutation StartGame($input: StartGameInput!) {
  startGame(input: $input) {
    id
    userId
    themeId
    difficulty
    status
    startedAt
    canPlay
    rateLimit {
      remaining
      resetAt
    }
  }
}
```

**Input**:
```typescript
interface StartGameInput {
  themeId: string;
  difficulty: number; // 1-5
}
```

**Validation**:
- Theme must exist and be published
- Difficulty must be 1-5
- User must not exceed rate limit
- User subscription must be active

**Rate Limit Check**: Enforced before game creation

---

#### completeGame
Complete a game and calculate score.

```graphql
mutation CompleteGame($input: CompleteGameInput!) {
  completeGame(input: $input) {
    id
    status
    completedAt
    completionTime
    attempts
    score
    achievements {
      type
      unlocked
      progress
    }
  }
}
```

**Input**:
```typescript
interface CompleteGameInput {
  gameId: string;
  completionTime: number; // seconds
  attempts: number;
}
```

**Validation**:
- Game must exist and belong to user
- Game status must be "in-progress"
- Completion time >= minimum (difficulty * 2 seconds)
- Completion time <= maximum (1 hour)
- Attempts >= difficulty pairs
- Game started before completed

**Side Effects**:
- Calculate and store score
- Update achievements (synchronous)
- Notify Leaderboard Service (asynchronous)
- Log to game history (paid users only)

---

### Queries

#### getGame
Get a specific game by ID.

```graphql
query GetGame($gameId: ID!) {
  getGame(gameId: $gameId) {
    id
    userId
    themeId
    theme {
      name
      category
      pairs
    }
    difficulty
    status
    startedAt
    completedAt
    completionTime
    attempts
    score
  }
}
```

**Authorization**: User can only view their own games

---

#### getGameHistory
Get user's game history (paid users only).

```graphql
query GetGameHistory($input: GameHistoryInput!) {
  getGameHistory(input: $input) {
    games {
      id
      themeId
      themeName
      difficulty
      completedAt
      completionTime
      attempts
      score
    }
    pagination {
      total
      page
      pageSize
      hasMore
    }
  }
}
```

**Input**:
```typescript
interface GameHistoryInput {
  page?: number; // default: 1
  pageSize?: number; // default: 20, max: 100
  sortBy?: 'date' | 'score' | 'time'; // default: 'date'
  sortOrder?: 'asc' | 'desc'; // default: 'desc'
  themeId?: string; // filter by theme
  difficulty?: number; // filter by difficulty
  startDate?: string; // filter by date range
  endDate?: string;
}
```

**Authorization**: Paid users only (Light, Standard, Premium)
**Free Users**: Return upgrade prompt error

---

#### getUserStatistics
Get user's gameplay statistics.

```graphql
query GetUserStatistics {
  getUserStatistics {
    totalGames
    totalCompletedGames
    averageScore
    bestScore
    averageCompletionTime
    fastestCompletionTime
    totalAttempts
    averageAttempts
    favoriteTheme {
      id
      name
    }
    favoriteDifficulty
    currentStreak
    longestStreak
  }
}
```

**Calculation**: On-demand from Games table with 5-minute cache
**Authorization**: All users (including free tier)

---

#### canStartGame
Check if user can start a new game (rate limit check).

```graphql
query CanStartGame {
  canStartGame {
    canPlay
    rateLimit {
      tier
      limit
      used
      remaining
      resetAt
    }
    message
  }
}
```

**Purpose**: Allow frontend to disable "Start Game" button proactively
**Rate Limit**: Check current usage against tier limits

---

## Types

### Game
```typescript
interface Game {
  id: string;
  userId: string;
  themeId: string;
  theme?: Theme; // populated from Themes table
  difficulty: number; // 1-5
  status: GameStatus;
  startedAt: Date;
  completedAt?: Date;
  completionTime?: number; // seconds
  attempts?: number;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}

enum GameStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED'
}
```

### RateLimit
```typescript
interface RateLimit {
  tier: SubscriptionTier;
  limit: number; // games per day
  used: number; // games played today
  remaining: number; // games left today
  resetAt: Date; // midnight UTC
}
```

### Achievement
```typescript
interface Achievement {
  type: AchievementType;
  unlocked: boolean;
  progress: number; // e.g., 5/10 games
  completedAt?: Date;
}

enum AchievementType {
  FIRST_WIN = 'FIRST_WIN',
  GAMES_10 = 'GAMES_10',
  GAMES_50 = 'GAMES_50',
  GAMES_100 = 'GAMES_100',
  SPEED_DEMON = 'SPEED_DEMON', // < 30 seconds
  PERFECT_GAME = 'PERFECT_GAME', // minimum attempts
  DIFFICULTY_MASTER = 'DIFFICULTY_MASTER', // all difficulties
  THEME_EXPLORER = 'THEME_EXPLORER', // 10 themes
  STREAK_7 = 'STREAK_7' // 7 days in a row
}
```

### GameStatistics
```typescript
interface GameStatistics {
  totalGames: number;
  totalCompletedGames: number;
  averageScore: number;
  bestScore: number;
  averageCompletionTime: number; // seconds
  fastestCompletionTime: number; // seconds
  totalAttempts: number;
  averageAttempts: number;
  favoriteTheme?: {
    id: string;
    name: string;
  };
  favoriteDifficulty: number;
  currentStreak: number; // consecutive days
  longestStreak: number; // best streak
}
```

---

## Error Responses

### Rate Limit Exceeded
```json
{
  "errors": [{
    "message": "Rate limit exceeded. You can play again at 2026-03-04T00:00:00Z",
    "extensions": {
      "code": "RATE_LIMIT_EXCEEDED",
      "resetAt": "2026-03-04T00:00:00Z",
      "tier": "FREE",
      "limit": 3,
      "used": 3
    }
  }]
}
```

### Game History - Paid Feature
```json
{
  "errors": [{
    "message": "Game history is available with Light, Standard, or Premium subscription",
    "extensions": {
      "code": "PAID_FEATURE_REQUIRED",
      "feature": "GAME_HISTORY",
      "requiredTiers": ["LIGHT", "STANDARD", "PREMIUM"]
    }
  }]
}
```

### Invalid Completion
```json
{
  "errors": [{
    "message": "Invalid game completion: completion time too fast",
    "extensions": {
      "code": "INVALID_COMPLETION",
      "reason": "COMPLETION_TIME_TOO_FAST",
      "minimumTime": 12,
      "providedTime": 5
    }
  }]
}
```

---

## Performance Requirements

- **startGame**: < 300ms (p95)
- **completeGame**: < 200ms (p95)
- **getGameHistory**: < 500ms (p95)
- **getUserStatistics**: < 500ms (p95) with caching
- **canStartGame**: < 100ms (p95)

---

## Integration Points

### Leaderboard Service
**Event**: GameCompleted
**Payload**:
```typescript
{
  gameId: string;
  userId: string;
  userName: string;
  themeId: string;
  difficulty: number;
  score: number;
  completionTime: number;
  attempts: number;
  completedAt: Date;
}
```
**Delivery**: Asynchronous via EventBridge/SNS
**Retry**: Exponential backoff, max 3 attempts

### Authentication Service
**Dependency**: User validation and tier checking
**Method**: Direct DynamoDB read from Users/Subscriptions tables

### CMS Service
**Dependency**: Theme data (read-only)
**Method**: DynamoDB read from Themes table with 5-minute cache
