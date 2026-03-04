# Functional Design Plan - Game Service

## Overview
This plan outlines the functional design for the Game Service unit, which handles game logic, gameplay management, rate limiting, score calculation, and achievement tracking.

**Unit**: Game Service (Unit 4)
**Stories Implemented**: US-009 to US-015 (start game, play game, complete game, game history, statistics)
**Dependencies**: Shared Components, Infrastructure (DynamoDB), Authentication Service

---

## Unit Context

### User Stories Coverage
- **US-009**: Start New Game (select theme and difficulty)
- **US-010**: Play Game (card flipping, matching, timer, attempts)
- **US-011**: Complete Game (score calculation, achievement tracking)
- **US-012**: View Game History (paid users only)
- **US-013**: View User Statistics (games played, win rate, average score)
- **US-014**: Rate Limiting (tier-based: 3/24h free, 10/day light, 30/day standard, 100/day premium)
- **US-015**: Achievement Tracking (first win, speed demon, perfect game, etc.)

### Service Responsibilities
- Game creation with theme and difficulty selection
- Rate limit enforcement (tier-based)
- Game state management (in-progress, completed)
- Game completion validation
- Score calculation (time + attempts + difficulty)
- Achievement tracking and unlocking
- Game history logging (paid users only)
- Integration with Leaderboard Service for score updates

### DynamoDB Tables
- **Games**: Game records (id, userId, themeId, difficulty, status, startedAt, completedAt, completionTime, attempts, score)
- **RateLimits**: Rate limit tracking (userId, tier, count, resetAt)
- **Achievements**: User achievements (id, userId, achievementType, progress, completed, completedAt)
- **Themes**: Theme data (read-only, managed by CMS Service)
- **Subscriptions**: User subscription data (read-only, for tier validation)

---

## Design Questions

### 1. Game Creation and Initialization

**Q1.1**: When a user starts a new game, what validation should occur before creating the game record?
[Answer]: Validate: (1) User is authenticated, (2) Theme exists and is published, (3) Difficulty is valid (1-5), (4) User hasn't exceeded rate limit, (5) User's subscription tier is active

**Q1.2**: Should the game service validate that the selected theme exists and is published, or assume the frontend only shows valid themes?
[Answer]: Always validate server-side. Never trust client input. Check theme exists, is published, and has sufficient card pairs for the difficulty level.

**Q1.3**: What difficulty levels are supported, and how do they affect gameplay (number of card pairs)?
[Answer]: 5 difficulty levels: Easy (6 pairs/12 cards), Medium (8 pairs/16 cards), Hard (10 pairs/20 cards), Expert (12 pairs/24 cards), Master (15 pairs/30 cards)

**Q1.4**: Should the game service generate the card positions/shuffling, or is that handled client-side?
[Answer]: Client-side for performance. Game service only tracks game state (started, completed), not individual card flips. This reduces server load and latency.

---

### 2. Rate Limiting Logic

**Q2.1**: Rate limits are tier-based (3/24h free, 10/day light, 30/day standard, 100/day premium). Should the reset be:
- A) Rolling 24-hour window from first game
- B) Fixed daily reset at midnight UTC ✓
- C) Fixed daily reset at user's local timezone
[Answer]: B - Fixed daily reset at midnight UTC. Simpler to implement, easier to communicate, and prevents gaming the system with timezone changes.

**Q2.2**: When a user upgrades their subscription tier mid-day, should their rate limit:
- A) Reset immediately with new tier limits ✓
- B) Apply new limits at next reset period
- C) Carry over remaining games from old tier
[Answer]: A - Reset immediately with new tier limits. This provides instant gratification for upgrading and encourages conversions.

**Q2.3**: Should rate limit checks happen:
- A) Only when starting a new game (block at creation)
- B) Also when checking "canStartGame" query
- C) Both A and B ✓
[Answer]: C - Both. Check on startGame (enforce) and canStartGame (inform UI). This allows the frontend to disable the "Start Game" button proactively.

**Q2.4**: If a user is at their rate limit, should the error message tell them:
- A) Exactly when they can play again (timestamp) ✓
- B) How many hours until reset
- C) Just that they've reached their limit
[Answer]: A - Provide exact timestamp. Most user-friendly. Frontend can format it as "You can play again at 12:00 AM UTC" or "in 5 hours".

---

### 3. Game Completion and Validation

**Q3.1**: When a game is completed, what validation should occur to prevent cheating or invalid completions?
[Answer]: Validate: (1) Game exists and belongs to user, (2) Game status is "in-progress", (3) Completion time is reasonable (> min, < max), (4) Attempts count is reasonable (>= difficulty pairs), (5) Game was started before completed

**Q3.2**: Should there be a minimum completion time to prevent suspicious/bot activity?
[Answer]: Yes. Minimum time = difficulty * 2 seconds (e.g., Easy/6 pairs = 12 seconds minimum). Prevents instant completions that indicate cheating.

**Q3.3**: Should there be a maximum completion time after which the game is considered abandoned?
[Answer]: Yes. Maximum 1 hour. After 1 hour, game auto-expires to "abandoned" status. Doesn't count toward stats but does count toward rate limit.

**Q3.4**: Can a user complete the same game multiple times, or is completion final?
[Answer]: Completion is final. Once completed, game status changes to "completed" and cannot be replayed. User must start a new game.

---

### 4. Score Calculation

**Q4.1**: The score formula is "time + attempts + difficulty". What are the exact weights/multipliers for each factor?
[Answer]: Score = (1000 * difficulty) - (completionTime in seconds) - (attempts * 10). Higher score is better. Fast completion + few attempts + high difficulty = high score.

**Q4.2**: Should faster completion times result in higher or lower scores? (Is lower score better like golf, or higher score better?)
[Answer]: Higher score is better (like most games). Faster time = higher score. Formula subtracts time, so less time = higher score.

**Q4.3**: How should difficulty affect the score calculation? (e.g., difficulty 1 = 1x multiplier, difficulty 5 = 5x multiplier?)
[Answer]: Difficulty is a multiplier: base score = 1000 * difficulty. Easy (1) = 1000 max, Master (5) = 5000 max. Encourages playing harder difficulties.

**Q4.4**: Should there be a maximum score cap, or can scores be unbounded?
[Answer]: Theoretical max per difficulty: Easy=1000, Medium=1600, Hard=2000, Expert=2400, Master=3000. Minimum score is 0 (can't go negative).

**Q4.5**: Should the score calculation be deterministic (same inputs always produce same score), or include any randomness?
[Answer]: Fully deterministic. Same time + attempts + difficulty always produces same score. Critical for fairness and leaderboard integrity. 

---

### 5. Achievement Tracking

**Q5.1**: What achievements should be tracked by the Game Service? (e.g., first win, 10 wins, speed demon, perfect game, etc.)
[Answer]: Track: FIRST_WIN, GAMES_10, GAMES_50, GAMES_100, SPEED_DEMON (< 30 sec), PERFECT_GAME (minimum attempts), DIFFICULTY_MASTER (complete all difficulties), THEME_EXPLORER (play 10 themes), STREAK_7 (7 days in a row)

**Q5.2**: Should achievements be checked and updated:
- A) Synchronously during game completion (user waits) ✓
- B) Asynchronously after game completion (background process)
- C) On-demand when user views achievements
[Answer]: A - Synchronous. Achievement unlocks are exciting moments. User should see "Achievement Unlocked!" immediately. Keep logic fast (< 50ms).

**Q5.3**: If a user unlocks multiple achievements in one game, should they all be recorded, or just the highest priority one?
[Answer]: Record all achievements unlocked. User should see all unlocks (e.g., "First Win" + "Speed Demon" if both conditions met). More rewarding.

**Q5.4**: Should achievement progress be tracked incrementally (e.g., "50% to 10 wins"), or just binary completed/not completed?
[Answer]: Track progress incrementally. Store progress field (e.g., 5/10 games). Allows UI to show progress bars. More engaging for users. 

---

### 6. Game History

**Q6.1**: Game history is only available to paid users (Light, Standard, Premium tiers). Should free users:
- A) See a message that history is a paid feature ✓
- B) See their most recent game only
- C) See no history at all (empty state)
[Answer]: A - Show upgrade prompt. "Game history is available with Light, Standard, or Premium subscription." Encourages conversion.

**Q6.2**: How many games should be stored in history per user?
- A) Unlimited (all games forever) ✓
- B) Limited by tier (e.g., Light: 50, Standard: 200, Premium: unlimited)
- C) Fixed limit for all paid users (e.g., last 100 games)
[Answer]: A - Unlimited for all paid tiers. Storage is cheap. Simplifies logic. Can add tier-based limits later if needed.

**Q6.3**: Should game history include incomplete/abandoned games, or only completed games?
[Answer]: Only completed games. Abandoned games clutter history and aren't meaningful. Keep history clean and focused on achievements.

**Q6.4**: What sorting/filtering options should be available for game history?
[Answer]: Sort by: date (newest first default), score (highest first), completion time (fastest first). Filter by: theme, difficulty, date range. Pagination: 20 games per page. 

---

### 7. User Statistics

**Q7.1**: What statistics should be calculated and displayed? (e.g., total games, win rate, average score, best score, average time, etc.)
[Answer]: Track: totalGames, totalCompletedGames, averageScore, bestScore, averageCompletionTime, fastestCompletionTime, totalAttempts, averageAttempts, favoriteTheme, favoriteDifficulty, currentStreak, longestStreak

**Q7.2**: Should statistics be:
- A) Calculated on-demand from game records (query aggregation) ✓
- B) Pre-calculated and stored (updated on each game completion)
- C) Cached with periodic refresh
[Answer]: A - On-demand with caching. Calculate from Games table with 5-minute cache. Simpler than maintaining separate stats table. Can optimize later if needed.

**Q7.3**: Should statistics be available to all users, or only paid users?
[Answer]: Available to all users (including free tier). Basic stats encourage engagement. Can add "advanced stats" as paid feature later.

**Q7.4**: Should statistics be broken down by theme, difficulty, or time period, or just overall totals?
[Answer]: Overall totals only for MVP. Breakdown by theme/difficulty/time period is "nice to have" - can add in future iteration. 

---

### 8. Integration with Leaderboard Service

**Q8.1**: When should the Game Service notify the Leaderboard Service of a completed game?
- A) Synchronously during game completion (user waits)
- B) Asynchronously after game completion (event-driven) ✓
- C) Leaderboard Service polls for new games
[Answer]: B - Asynchronous via EventBridge or SNS. Don't make user wait for leaderboard update. Game completion returns immediately.

**Q8.2**: If the Leaderboard Service update fails, should the game completion still succeed?
[Answer]: Yes. Game completion is the source of truth. Leaderboard is eventually consistent. Retry failed updates with exponential backoff.

**Q8.3**: What information should be sent to the Leaderboard Service? (score, time, attempts, theme, difficulty, etc.)
[Answer]: Send: gameId, userId, userName, themeId, difficulty, score, completionTime, attempts, completedAt. Leaderboard Service decides what to index. 

---

### 9. Error Handling and Edge Cases

**Q9.1**: If a user starts a game but never completes it, should it:
- A) Remain in "in-progress" state forever
- B) Auto-expire after a certain time (e.g., 24 hours) ✓
- C) Count against their rate limit until completed or expired ✓
[Answer]: B and C - Auto-expire after 1 hour to "abandoned" status. Counts toward rate limit (prevents abuse). Background job runs hourly to clean up.

**Q9.2**: If a user's subscription is downgraded mid-game, should they:
- A) Be allowed to complete the current game ✓
- B) Have the game invalidated
- C) Complete the game but not have it count toward history/stats
[Answer]: A - Allow completion. Don't punish user mid-game. New rate limits apply to next game. Fair and user-friendly.

**Q9.3**: What should happen if a user tries to complete a game that doesn't exist or belongs to another user?
[Answer]: Return 404 Not Found error. Log security event (potential attack). Don't reveal whether game exists or ownership issue (security). 

---

### 10. Performance and Caching

**Q10.1**: Should theme data be cached in the Game Service, or fetched from DynamoDB on every game creation?
[Answer]: Cache theme data in Lambda memory with 5-minute TTL. Themes change infrequently. Reduces DynamoDB reads and improves latency.

**Q10.2**: Should user subscription tier be cached, or fetched from DynamoDB on every rate limit check?
[Answer]: Fetch from DynamoDB on every check. Tier changes must be reflected immediately (especially upgrades). Can add caching later if performance issue.

**Q10.3**: What caching strategy should be used for rate limit data? (in-memory, Redis, DynamoDB with TTL, etc.)
[Answer]: DynamoDB with TTL. Store rate limit record with resetAt timestamp. DynamoDB TTL auto-deletes expired records. Simple and cost-effective. 

---

## Execution Steps

### Phase 1: Analyze Requirements
- [x] Review Game Service unit definition
- [x] Review user stories US-009 through US-015
- [x] Identify GraphQL operations needed
- [x] Identify data models and repositories
- [x] Generate design questions

### Phase 2: Collect Answers
- [x] Wait for user to answer all questions above
- [x] Analyze answers for ambiguities
- [x] Generate follow-up questions if needed
- [x] Confirm all design decisions are clear

### Phase 3: Define Business Logic Model
- [x] Game creation workflow
- [x] Rate limiting algorithm
- [x] Game completion workflow
- [x] Score calculation algorithm
- [x] Achievement tracking logic
- [x] Game history retrieval logic
- [x] Statistics calculation logic

### Phase 4: Define Business Rules
- [x] Rate limit rules by tier
- [x] Game validation rules
- [x] Score calculation rules
- [x] Achievement unlock rules
- [x] Game history access rules
- [x] Data retention rules

### Phase 5: Define Domain Entities
- [x] Game entity (with all states)
- [x] RateLimit entity
- [x] Achievement entity
- [x] GameStatistics entity (calculated)

### Phase 6: Define API Contracts
- [x] GraphQL mutations (startGame, completeGame)
- [x] GraphQL queries (getGame, getGameHistory, getUserStatistics, canStartGame)
- [x] Input types and validation
- [x] Response types

### Phase 7: Generate Artifacts
- [x] Create business-logic-model.md
- [x] Create business-rules.md
- [x] Create domain-entities.md
- [x] Create api-contracts.md

---

## Success Criteria
- [x] All design questions answered
- [x] All ambiguities resolved
- [x] Business logic model documented
- [x] Business rules defined
- [x] Domain entities specified
- [x] API contracts defined
- [x] All artifacts generated

---

## Notes
- Game Service is a core service with complex business logic
- Rate limiting is critical for tier-based monetization
- Score calculation must be fair and deterministic
- Achievement tracking adds engagement and retention
- Integration with Leaderboard Service is asynchronous
- Performance is critical (< 300ms game start, < 200ms completion)
