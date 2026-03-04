# Business Logic - Game Service

## Core Workflows

### 1. Start Game Workflow

```
User Request → Validate Input → Check Rate Limit → Validate Theme → Create Game → Return Game
```

**Steps**:
1. **Validate Input**
   - Theme ID is provided and valid UUID
   - Difficulty is 1-5
   - User is authenticated

2. **Check Rate Limit**
   - Get user's subscription tier from Subscriptions table
   - Get rate limit record from RateLimits table
   - Calculate: used games today vs tier limit
   - If exceeded: Return error with resetAt timestamp
   - If within limit: Continue

3. **Validate Theme**
   - Check theme exists in Themes table (with cache)
   - Check theme status is "PUBLISHED"
   - Check theme has sufficient pairs for difficulty
   - If invalid: Return error

4. **Create Game**
   - Generate game ID (UUID)
   - Set status = "IN_PROGRESS"
   - Set startedAt = current timestamp
   - Store in Games table
   - Increment rate limit counter

5. **Return Game**
   - Return game object with rate limit info

**Business Rules Applied**:
- BR-001: Rate limit enforcement
- BR-002: Theme validation
- BR-003: Difficulty validation

---

### 2. Complete Game Workflow

```
User Request → Validate Game → Validate Completion → Calculate Score → Update Achievements → Notify Leaderboard → Return Result
```

**Steps**:
1. **Validate Game**
   - Game exists in Games table
   - Game belongs to requesting user
   - Game status is "IN_PROGRESS"
   - If invalid: Return error

2. **Validate Completion**
   - Completion time >= minimum (difficulty * 2 seconds)
   - Completion time <= maximum (1 hour)
   - Attempts >= difficulty pairs
   - Game startedAt < current time
   - If invalid: Return error with reason

3. **Calculate Score**
   - Base score = 1000 * difficulty
   - Subtract completion time (seconds)
   - Subtract attempts * 10
   - Ensure score >= 0
   - Store score in game record

4. **Update Game**
   - Set status = "COMPLETED"
   - Set completedAt = current timestamp
   - Set completionTime, attempts, score
   - Update Games table

5. **Update Achievements** (Synchronous)
   - Check all achievement conditions
   - Update progress for incremental achievements
   - Mark newly unlocked achievements
   - Store in Achievements table
   - Return unlocked achievements

6. **Notify Leaderboard** (Asynchronous)
   - Publish GameCompleted event to EventBridge
   - Include: gameId, userId, userName, themeId, difficulty, score, time, attempts
   - Don't wait for response

7. **Log to History** (Paid Users Only)
   - If user tier is Light/Standard/Premium
   - Game record already in Games table (no additional action)

8. **Return Result**
   - Return updated game with score and achievements

**Business Rules Applied**:
- BR-004: Completion validation
- BR-005: Score calculation
- BR-006: Achievement tracking
- BR-007: Game history access

---

### 3. Get Game History Workflow

```
User Request → Check Authorization → Query Games → Apply Filters → Paginate → Return Results
```

**Steps**:
1. **Check Authorization**
   - Get user's subscription tier
   - If tier is FREE: Return upgrade prompt error
   - If tier is Light/Standard/Premium: Continue

2. **Query Games**
   - Query Games table by userId
   - Filter: status = "COMPLETED" only
   - Apply user-provided filters (theme, difficulty, date range)

3. **Sort Results**
   - Sort by: date (default), score, or completion time
   - Order: descending (default) or ascending

4. **Paginate**
   - Page size: 20 (default), max 100
   - Calculate offset: (page - 1) * pageSize
   - Return requested page + pagination metadata

5. **Return Results**
   - Return games array with pagination info

**Business Rules Applied**:
- BR-007: Game history access (paid only)
- BR-008: Pagination limits

---

### 4. Get User Statistics Workflow

```
User Request → Query Games → Calculate Stats → Cache Result → Return Stats
```

**Steps**:
1. **Check Cache**
   - Check if stats cached (5-minute TTL)
   - If cached: Return cached stats
   - If not cached: Continue

2. **Query Games**
   - Query all user's games from Games table
   - Filter: status = "COMPLETED"

3. **Calculate Statistics**
   - Total games: Count all games
   - Total completed: Count completed games
   - Average score: Mean of all scores
   - Best score: Max score
   - Average time: Mean completion time
   - Fastest time: Min completion time
   - Total attempts: Sum of all attempts
   - Average attempts: Mean attempts
   - Favorite theme: Mode of themeId
   - Favorite difficulty: Mode of difficulty
   - Current streak: Count consecutive days with games
   - Longest streak: Max consecutive days

4. **Cache Result**
   - Store in Lambda memory with 5-minute TTL
   - Key: userId

5. **Return Stats**
   - Return calculated statistics

**Business Rules Applied**:
- BR-009: Statistics calculation
- BR-010: Caching strategy

---

### 5. Check Rate Limit Workflow

```
User Request → Get Tier → Get Rate Limit → Calculate Remaining → Return Status
```

**Steps**:
1. **Get User Tier**
   - Query Subscriptions table for user's tier
   - Default to FREE if no subscription

2. **Get Rate Limit**
   - Query RateLimits table for userId
   - If no record: Create new record with count=0

3. **Calculate Remaining**
   - Tier limits: FREE=3, LIGHT=10, STANDARD=30, PREMIUM=100
   - Remaining = limit - used
   - Can play = remaining > 0

4. **Check Reset**
   - If current time >= resetAt: Reset count to 0

5. **Return Status**
   - Return: canPlay, tier, limit, used, remaining, resetAt

**Business Rules Applied**:
- BR-001: Rate limit enforcement
- BR-011: Rate limit reset timing

---

## Service Methods

### GameService

```typescript
class GameService {
  // Core operations
  async startGame(userId: string, input: StartGameInput): Promise<Game>
  async completeGame(userId: string, input: CompleteGameInput): Promise<GameCompletionResult>
  async getGame(userId: string, gameId: string): Promise<Game>
  async getGameHistory(userId: string, input: GameHistoryInput): Promise<GameHistoryResult>
  async getUserStatistics(userId: string): Promise<GameStatistics>
  async canStartGame(userId: string): Promise<RateLimitStatus>
  
  // Internal methods
  private async checkRateLimit(userId: string, tier: SubscriptionTier): Promise<void>
  private async validateTheme(themeId: string, difficulty: number): Promise<Theme>
  private async validateCompletion(game: Game, input: CompleteGameInput): Promise<void>
  private calculateScore(difficulty: number, completionTime: number, attempts: number): number
  private async updateAchievements(userId: string, game: Game): Promise<Achievement[]>
  private async notifyLeaderboard(game: Game): Promise<void>
  private async calculateStatistics(userId: string): Promise<GameStatistics>
}
```

### RateLimiter

```typescript
class RateLimiter {
  async checkLimit(userId: string, tier: SubscriptionTier): Promise<RateLimitStatus>
  async incrementUsage(userId: string): Promise<void>
  async resetIfExpired(userId: string): Promise<void>
  async resetOnTierUpgrade(userId: string, newTier: SubscriptionTier): Promise<void>
  private getTierLimit(tier: SubscriptionTier): number
  private getResetTime(): Date // Next midnight UTC
}
```

### ScoreCalculator

```typescript
class ScoreCalculator {
  calculate(difficulty: number, completionTime: number, attempts: number): number
  getMaxScore(difficulty: number): number
  getMinCompletionTime(difficulty: number): number
  validateCompletionTime(difficulty: number, completionTime: number): boolean
  validateAttempts(difficulty: number, attempts: number): boolean
}
```

### AchievementTracker

```typescript
class AchievementTracker {
  async checkAndUpdate(userId: string, game: Game): Promise<Achievement[]>
  private async checkFirstWin(userId: string): Promise<boolean>
  private async checkGamesCount(userId: string): Promise<number>
  private async checkSpeedDemon(game: Game): Promise<boolean>
  private async checkPerfectGame(game: Game): Promise<boolean>
  private async checkDifficultyMaster(userId: string): Promise<boolean>
  private async checkThemeExplorer(userId: string): Promise<boolean>
  private async checkStreak(userId: string): Promise<number>
}
```

---

## Data Transformations

### Score Calculation Formula

```
score = (1000 * difficulty) - completionTime - (attempts * 10)
score = max(0, score) // Ensure non-negative
```

**Examples**:
- Easy (1), 30s, 6 attempts: 1000 - 30 - 60 = 910
- Medium (2), 45s, 8 attempts: 2000 - 45 - 80 = 1875
- Hard (3), 60s, 10 attempts: 3000 - 60 - 100 = 2840
- Expert (4), 90s, 12 attempts: 4000 - 90 - 120 = 3790
- Master (5), 120s, 15 attempts: 5000 - 120 - 150 = 4730

### Rate Limit Reset Calculation

```
resetAt = startOfNextDay(UTC)
// Example: Current time = 2026-03-03T15:30:00Z
// resetAt = 2026-03-04T00:00:00Z
```

### Streak Calculation

```
currentStreak = countConsecutiveDaysWithGames(from: today, backwards: true)
longestStreak = maxConsecutiveDaysWithGames(allTime)
```

---

## Error Handling

### Validation Errors
- Invalid theme ID → 400 Bad Request
- Invalid difficulty → 400 Bad Request
- Rate limit exceeded → 429 Too Many Requests
- Paid feature required → 402 Payment Required

### Business Logic Errors
- Game not found → 404 Not Found
- Game already completed → 409 Conflict
- Completion time too fast → 400 Bad Request
- Completion time too slow → 400 Bad Request

### System Errors
- DynamoDB error → 500 Internal Server Error
- EventBridge error → Log and continue (don't fail request)
- Cache error → Log and recalculate (don't fail request)

---

## Performance Optimizations

1. **Theme Caching**: Cache theme data in Lambda memory (5-min TTL)
2. **Statistics Caching**: Cache calculated stats (5-min TTL)
3. **Batch Operations**: Use DynamoDB batch operations where possible
4. **Async Leaderboard**: Don't wait for leaderboard update
5. **Lazy Achievement Check**: Only check achievements on completion
6. **Connection Pooling**: Reuse DynamoDB client connections
