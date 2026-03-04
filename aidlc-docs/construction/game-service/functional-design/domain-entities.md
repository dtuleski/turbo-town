# Domain Entities - Game Service

## Game

**Purpose**: Represents a single gameplay session from start to completion.

**Attributes**:
```typescript
interface Game {
  // Identity
  id: string; // UUID, primary key
  userId: string; // Foreign key to Users table
  
  // Game Configuration
  themeId: string; // Foreign key to Themes table
  difficulty: number; // 1-5 (Easy to Master)
  
  // Game State
  status: GameStatus; // IN_PROGRESS, COMPLETED, ABANDONED
  
  // Timing
  startedAt: Date; // When game was created
  completedAt?: Date; // When game was completed (null if in-progress/abandoned)
  completionTime?: number; // Duration in seconds (null if not completed)
  
  // Performance
  attempts?: number; // Number of card flip attempts (null if not completed)
  score?: number; // Calculated score (null if not completed)
  
  // Metadata
  createdAt: Date; // Record creation timestamp
  updatedAt: Date; // Record last update timestamp
}

enum GameStatus {
  IN_PROGRESS = 'IN_PROGRESS', // Game started, not yet completed
  COMPLETED = 'COMPLETED', // Game successfully completed
  ABANDONED = 'ABANDONED' // Game expired (> 1 hour without completion)
}
```

**DynamoDB Schema**:
- **Table**: Games
- **Partition Key**: id (string)
- **GSI**: UserIdIndex
  - Partition Key: userId
  - Sort Key: startedAt (for chronological ordering)
- **TTL**: None (games retained indefinitely)

**Lifecycle**:
1. Created with status = IN_PROGRESS
2. Either:
   - Completed → status = COMPLETED, score calculated
   - Expired → status = ABANDONED (after 1 hour)

**Business Rules**:
- Cannot be completed twice
- Score only calculated on completion
- Abandoned games don't count toward statistics
- All games count toward rate limit

---

## RateLimit

**Purpose**: Tracks daily game usage per user for rate limiting.

**Attributes**:
```typescript
interface RateLimit {
  // Identity
  userId: string; // Primary key, foreign key to Users table
  
  // Rate Limit Data
  tier: SubscriptionTier; // User's current tier
  count: number; // Games played today
  resetAt: Date; // When count resets (midnight UTC)
  
  // Metadata
  updatedAt: Date; // Last update timestamp
}

enum SubscriptionTier {
  FREE = 'FREE', // 3 games per day
  LIGHT = 'LIGHT', // 10 games per day
  STANDARD = 'STANDARD', // 30 games per day
  PREMIUM = 'PREMIUM' // 100 games per day
}
```

**DynamoDB Schema**:
- **Table**: RateLimits
- **Partition Key**: userId (string)
- **TTL**: resetAt (auto-delete expired records)

**Lifecycle**:
1. Created on first game start
2. Incremented on each game start
3. Reset at midnight UTC (count = 0)
4. Deleted by DynamoDB TTL after reset

**Business Rules**:
- Count increments on game start (not completion)
- Resets daily at midnight UTC
- Immediate reset on tier upgrade
- Abandoned games count toward limit

---

## Achievement

**Purpose**: Tracks user progress toward and completion of gameplay achievements.

**Attributes**:
```typescript
interface Achievement {
  // Identity
  id: string; // UUID, primary key
  userId: string; // Foreign key to Users table
  
  // Achievement Data
  achievementType: AchievementType; // Type of achievement
  progress: number; // Current progress (e.g., 5 for 5/10 games)
  completed: boolean; // Whether achievement is unlocked
  completedAt?: Date; // When achievement was unlocked (null if not completed)
  
  // Metadata
  createdAt: Date; // Record creation timestamp
  updatedAt: Date; // Record last update timestamp
}

enum AchievementType {
  FIRST_WIN = 'FIRST_WIN', // Complete first game
  GAMES_10 = 'GAMES_10', // Complete 10 games
  GAMES_50 = 'GAMES_50', // Complete 50 games
  GAMES_100 = 'GAMES_100', // Complete 100 games
  SPEED_DEMON = 'SPEED_DEMON', // Complete game in < 30 seconds
  PERFECT_GAME = 'PERFECT_GAME', // Complete with minimum attempts
  DIFFICULTY_MASTER = 'DIFFICULTY_MASTER', // Complete all 5 difficulties
  THEME_EXPLORER = 'THEME_EXPLORER', // Play 10 different themes
  STREAK_7 = 'STREAK_7' // Play 7 consecutive days
}
```

**DynamoDB Schema**:
- **Table**: Achievements
- **Partition Key**: id (string)
- **GSI**: UserIdIndex
  - Partition Key: userId
  - Sort Key: achievementType

**Lifecycle**:
1. Created on first relevant game completion
2. Progress updated on subsequent games
3. Marked completed when condition met
4. Never deleted (permanent record)

**Business Rules**:
- Progress tracked incrementally
- Multiple achievements can unlock in one game
- Once completed, cannot be uncompleted
- Checked synchronously on game completion

---

## GameStatistics (Calculated Entity)

**Purpose**: Aggregated statistics about a user's gameplay performance.

**Attributes**:
```typescript
interface GameStatistics {
  // Game Counts
  totalGames: number; // All games (any status)
  totalCompletedGames: number; // Only completed games
  
  // Score Statistics
  averageScore: number; // Mean score of completed games
  bestScore: number; // Highest score achieved
  
  // Time Statistics
  averageCompletionTime: number; // Mean completion time (seconds)
  fastestCompletionTime: number; // Shortest completion time (seconds)
  
  // Attempt Statistics
  totalAttempts: number; // Sum of all attempts
  averageAttempts: number; // Mean attempts per game
  
  // Preferences
  favoriteTheme?: {
    id: string;
    name: string;
  }; // Most played theme
  favoriteDifficulty: number; // Most played difficulty
  
  // Streaks
  currentStreak: number; // Consecutive days with games
  longestStreak: number; // Best streak ever
}
```

**Storage**: Not stored, calculated on-demand from Games table

**Caching**: 5-minute TTL in Lambda memory

**Calculation Source**: Games table (status = COMPLETED only)

**Business Rules**:
- Only completed games included
- Abandoned games excluded
- Available to all users (including FREE tier)
- Cached for performance

---

## Theme (Read-Only Reference)

**Purpose**: Theme data used for game creation validation.

**Attributes** (subset used by Game Service):
```typescript
interface Theme {
  // Identity
  id: string; // UUID
  
  // Theme Data
  name: string; // Display name
  category: ThemeCategory; // SHAPES, SPORTS, F1, etc.
  status: ThemeStatus; // DRAFT, PUBLISHED, UNPUBLISHED
  
  // Card Data
  pairs: ThemePair[]; // Array of card pairs
  difficulty: number; // Recommended difficulty
  
  // Metadata
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ThemePair {
  card1ImageUrl: string;
  card2ImageUrl: string;
  card1AltText: string;
  card2AltText: string;
}

enum ThemeStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED'
}
```

**DynamoDB Schema**:
- **Table**: Themes (managed by CMS Service)
- **Access**: Read-only
- **Caching**: 5-minute TTL in Lambda memory

**Usage**:
- Validate theme exists and is published
- Validate theme has sufficient pairs for difficulty
- Display theme name in game history

---

## Subscription (Read-Only Reference)

**Purpose**: User subscription data for tier validation.

**Attributes** (subset used by Game Service):
```typescript
interface Subscription {
  // Identity
  id: string; // UUID
  userId: string; // Foreign key to Users table
  
  // Subscription Data
  tier: SubscriptionTier; // FREE, LIGHT, STANDARD, PREMIUM
  status: SubscriptionStatus; // ACTIVE, CANCELLED, EXPIRED
  
  // Billing
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}
```

**DynamoDB Schema**:
- **Table**: Subscriptions (managed by Payment Service)
- **Access**: Read-only
- **Caching**: None (must be current)

**Usage**:
- Determine rate limit tier
- Check game history access
- Validate subscription is active

---

## Entity Relationships

```
User (Auth Service)
  ├─ 1:N → Game
  ├─ 1:1 → RateLimit
  ├─ 1:N → Achievement
  ├─ 1:1 → Subscription (Payment Service)
  └─ 1:1 → GameStatistics (calculated)

Game
  ├─ N:1 → User
  └─ N:1 → Theme (CMS Service)

RateLimit
  └─ 1:1 → User

Achievement
  └─ N:1 → User

Theme (CMS Service)
  └─ 1:N → Game

Subscription (Payment Service)
  └─ 1:1 → User
```

---

## Data Access Patterns

### By User
- Get all games for user: Query Games.UserIdIndex
- Get rate limit for user: Get RateLimits by userId
- Get achievements for user: Query Achievements.UserIdIndex
- Get subscription for user: Get Subscriptions by userId

### By Game
- Get specific game: Get Games by id
- Update game status: Update Games by id

### By Theme
- Validate theme: Get Themes by id (with cache)
- Get theme details: Get Themes by id

### Statistics
- Calculate stats: Scan/Query Games by userId, filter by status

---

## Data Consistency

### Strong Consistency Required
- Game creation (must not duplicate)
- Rate limit checks (must be accurate)
- Game completion (must not complete twice)

### Eventual Consistency Acceptable
- Statistics calculation (5-minute lag OK)
- Theme data (5-minute lag OK)
- Achievement progress (updated synchronously but can lag in UI)

### Asynchronous Updates
- Leaderboard notifications (fire-and-forget)
- Achievement unlocks (synchronous but non-blocking)

---

## Data Validation Rules

### Game Entity
- id: Valid UUID
- userId: Valid UUID, user exists
- themeId: Valid UUID, theme exists and published
- difficulty: Integer 1-5
- status: Valid enum value
- startedAt: Valid timestamp, <= current time
- completedAt: Valid timestamp, >= startedAt (if present)
- completionTime: Positive number, <= 3600 (if present)
- attempts: Positive integer, >= difficulty pairs (if present)
- score: Non-negative integer (if present)

### RateLimit Entity
- userId: Valid UUID, user exists
- tier: Valid enum value
- count: Non-negative integer
- resetAt: Valid timestamp, > current time

### Achievement Entity
- id: Valid UUID
- userId: Valid UUID, user exists
- achievementType: Valid enum value
- progress: Non-negative integer
- completed: Boolean
- completedAt: Valid timestamp (if completed = true)
