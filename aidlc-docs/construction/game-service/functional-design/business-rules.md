# Business Rules - Game Service

## BR-001: Rate Limit Enforcement

**Rule**: Users can only start a limited number of games per day based on their subscription tier.

**Tier Limits**:
- FREE: 3 games per 24 hours
- LIGHT: 10 games per day
- STANDARD: 30 games per day
- PREMIUM: 100 games per day

**Reset Timing**: Fixed daily reset at midnight UTC

**Enforcement Points**:
- `startGame` mutation (blocking)
- `canStartGame` query (informational)

**Tier Upgrade Behavior**: Immediate reset with new tier limits

**Abandoned Games**: Count toward rate limit until expired

---

## BR-002: Theme Validation

**Rule**: Games can only be started with valid, published themes that have sufficient card pairs.

**Validation Criteria**:
- Theme must exist in Themes table
- Theme status must be "PUBLISHED"
- Theme must have >= required pairs for difficulty

**Required Pairs by Difficulty**:
- Easy (1): 6 pairs minimum
- Medium (2): 8 pairs minimum
- Hard (3): 10 pairs minimum
- Expert (4): 12 pairs minimum
- Master (5): 15 pairs minimum

**Error Handling**: Return 400 Bad Request with specific error message

---

## BR-003: Difficulty Validation

**Rule**: Difficulty must be an integer between 1 and 5.

**Difficulty Levels**:
1. Easy: 6 pairs (12 cards)
2. Medium: 8 pairs (16 cards)
3. Hard: 10 pairs (20 cards)
4. Expert: 12 pairs (24 cards)
5. Master: 15 pairs (30 cards)

**Validation**: Reject any value outside 1-5 range

---

## BR-004: Completion Validation

**Rule**: Game completions must meet minimum and maximum time requirements to prevent cheating.

**Minimum Completion Time**:
```
minTime = difficulty * 2 seconds
```
- Easy: 12 seconds
- Medium: 16 seconds
- Hard: 20 seconds
- Expert: 24 seconds
- Master: 30 seconds

**Maximum Completion Time**: 1 hour (3600 seconds)

**Attempts Validation**:
```
minAttempts = difficulty pairs
```
- Easy: >= 6 attempts
- Medium: >= 8 attempts
- Hard: >= 10 attempts
- Expert: >= 12 attempts
- Master: >= 15 attempts

**Additional Checks**:
- Game must exist and belong to user
- Game status must be "IN_PROGRESS"
- Game cannot be completed twice
- startedAt must be before completedAt

---

## BR-005: Score Calculation

**Rule**: Score is calculated deterministically based on difficulty, completion time, and attempts.

**Formula**:
```
score = (1000 * difficulty) - completionTime - (attempts * 10)
score = max(0, score)
```

**Scoring Direction**: Higher score is better

**Maximum Scores**:
- Easy: 1000 (theoretical max)
- Medium: 1600
- Hard: 2000
- Expert: 2400
- Master: 3000

**Minimum Score**: 0 (cannot go negative)

**Determinism**: Same inputs always produce same score (no randomness)

---

## BR-006: Achievement Tracking

**Rule**: Achievements are tracked and unlocked based on gameplay milestones.

**Achievement Types**:

1. **FIRST_WIN**: Complete first game
   - Condition: totalCompletedGames == 1
   - Progress: Binary (0/1)

2. **GAMES_10**: Complete 10 games
   - Condition: totalCompletedGames >= 10
   - Progress: Incremental (X/10)

3. **GAMES_50**: Complete 50 games
   - Condition: totalCompletedGames >= 50
   - Progress: Incremental (X/50)

4. **GAMES_100**: Complete 100 games
   - Condition: totalCompletedGames >= 100
   - Progress: Incremental (X/100)

5. **SPEED_DEMON**: Complete game in < 30 seconds
   - Condition: completionTime < 30
   - Progress: Binary (0/1)

6. **PERFECT_GAME**: Complete with minimum attempts
   - Condition: attempts == difficulty pairs
   - Progress: Binary (0/1)

7. **DIFFICULTY_MASTER**: Complete all 5 difficulty levels
   - Condition: Completed at least one game at each difficulty
   - Progress: Incremental (X/5)

8. **THEME_EXPLORER**: Play 10 different themes
   - Condition: Unique themes played >= 10
   - Progress: Incremental (X/10)

9. **STREAK_7**: Play games 7 consecutive days
   - Condition: Games on 7 consecutive days
   - Progress: Incremental (X/7)

**Update Timing**: Synchronous during game completion

**Multiple Unlocks**: All applicable achievements unlocked in single game

---

## BR-007: Game History Access

**Rule**: Game history is only available to paid users (Light, Standard, Premium tiers).

**Access Control**:
- FREE tier: Return upgrade prompt error
- LIGHT tier: Full access
- STANDARD tier: Full access
- PREMIUM tier: Full access

**History Content**:
- Only completed games (status = "COMPLETED")
- Abandoned games not included
- Unlimited storage for all paid tiers

**Error Message**: "Game history is available with Light, Standard, or Premium subscription"

---

## BR-008: Pagination Limits

**Rule**: Game history queries must be paginated to prevent performance issues.

**Limits**:
- Default page size: 20 games
- Maximum page size: 100 games
- Minimum page size: 1 game

**Sorting Options**:
- By date (newest first - default)
- By score (highest first)
- By completion time (fastest first)

**Filtering Options**:
- By theme ID
- By difficulty level
- By date range (startDate, endDate)

---

## BR-009: Statistics Calculation

**Rule**: User statistics are calculated from completed games only.

**Included Metrics**:
- Total games started (all statuses)
- Total completed games (status = "COMPLETED")
- Average score (mean of all scores)
- Best score (max score)
- Average completion time (mean time)
- Fastest completion time (min time)
- Total attempts (sum of all attempts)
- Average attempts (mean attempts)
- Favorite theme (mode of themeId)
- Favorite difficulty (mode of difficulty)
- Current streak (consecutive days with games)
- Longest streak (max consecutive days)

**Excluded**:
- Abandoned games (status = "ABANDONED")
- In-progress games (status = "IN_PROGRESS")

**Access**: Available to all users (including FREE tier)

---

## BR-010: Caching Strategy

**Rule**: Frequently accessed data is cached to improve performance.

**Theme Data Caching**:
- Cache location: Lambda memory
- TTL: 5 minutes
- Invalidation: Time-based only
- Rationale: Themes change infrequently

**Statistics Caching**:
- Cache location: Lambda memory
- TTL: 5 minutes
- Key: userId
- Invalidation: Time-based only
- Rationale: Stats don't need real-time accuracy

**No Caching**:
- User subscription tier (must be current)
- Rate limit data (must be accurate)
- Game records (source of truth)

---

## BR-011: Rate Limit Reset Timing

**Rule**: Rate limits reset at a fixed time each day.

**Reset Time**: Midnight UTC (00:00:00 UTC)

**Reset Behavior**:
- Count resets to 0
- resetAt updates to next midnight UTC
- Old RateLimit records deleted by DynamoDB TTL

**Timezone**: Always UTC (no user timezone consideration)

**Rationale**: Simpler implementation, prevents timezone gaming

---

## BR-012: Game Expiration

**Rule**: In-progress games automatically expire after 1 hour.

**Expiration Time**: 1 hour (3600 seconds) from startedAt

**Expiration Behavior**:
- Status changes to "ABANDONED"
- Does not count toward statistics
- Does count toward rate limit
- Cannot be completed after expiration

**Cleanup**: Background job runs hourly to mark expired games

---

## BR-013: Leaderboard Integration

**Rule**: Completed games are asynchronously reported to Leaderboard Service.

**Trigger**: Game completion (status = "COMPLETED")

**Delivery Method**: EventBridge event

**Event Payload**:
- gameId, userId, userName
- themeId, difficulty
- score, completionTime, attempts
- completedAt timestamp

**Failure Handling**:
- Game completion succeeds even if event fails
- Retry with exponential backoff (max 3 attempts)
- Log failures for manual reconciliation

**Rationale**: Leaderboard is eventually consistent, don't block user

---

## BR-014: Tier Upgrade Behavior

**Rule**: When a user upgrades their subscription tier, rate limits reset immediately.

**Reset Behavior**:
- Count resets to 0
- Limit updates to new tier limit
- resetAt remains at next midnight UTC
- User can immediately play with new limits

**Downgrade Behavior**:
- Current game can be completed
- New limits apply to next game
- No immediate reset

**Rationale**: Instant gratification encourages upgrades

---

## BR-015: Data Retention

**Rule**: Game records are retained indefinitely for all users.

**Retention Policy**:
- Completed games: Retained forever
- Abandoned games: Retained for 30 days, then deleted
- In-progress games: Expire to abandoned after 1 hour

**Rationale**:
- Storage is cheap
- Historical data valuable for analytics
- Simplifies implementation (no tier-based limits)

---

## Validation Summary

### Input Validation
- Theme ID: Valid UUID, exists, published
- Difficulty: Integer 1-5
- Completion time: >= min, <= max
- Attempts: >= difficulty pairs

### Authorization Validation
- User authenticated
- Game belongs to user
- Tier allows feature access

### Business Logic Validation
- Rate limit not exceeded
- Game in correct status
- Theme has sufficient pairs
- Completion timing reasonable

### Data Integrity Validation
- No duplicate completions
- Timestamps in correct order
- Score calculation correct
- Achievement progress accurate
