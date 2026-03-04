# Game Service

Memory Game gameplay service handling game lifecycle, rate limiting, achievements, and statistics.

## Overview

The Game Service is a serverless microservice built with AWS Lambda, DynamoDB, and EventBridge. It manages:
- Game creation and completion
- Tier-based rate limiting (FREE: 3, LIGHT: 10, STANDARD: 30, PREMIUM: 100 games/day)
- Score calculation (deterministic formula)
- Achievement tracking (9 achievement types)
- Game history and statistics
- Async leaderboard integration via EventBridge

## Architecture

```
API Gateway → Lambda → Game Service
                ├── Repositories (DynamoDB)
                ├── Services (Business Logic)
                └── Event Publisher (EventBridge)
```

## Tech Stack

- **Runtime**: Node.js 20.x, TypeScript
- **Framework**: AWS Lambda
- **Database**: DynamoDB (Games, RateLimits, Achievements tables)
- **Messaging**: EventBridge (GameCompleted events)
- **Validation**: Zod
- **Testing**: Jest
- **Monitoring**: CloudWatch Logs, Metrics, X-Ray

## Setup

### Prerequisites
- Node.js 20.x
- AWS CLI configured
- DynamoDB tables created (see Infrastructure)

### Installation

```bash
cd services/game
npm install
```

### Environment Variables

Create `.env` file:

```bash
GAMES_TABLE_NAME=Games-dev
RATE_LIMITS_TABLE_NAME=RateLimits-dev
ACHIEVEMENTS_TABLE_NAME=Achievements-dev
THEMES_TABLE_NAME=Themes-dev
SUBSCRIPTIONS_TABLE_NAME=Subscriptions-dev
EVENT_BUS_NAME=MemoryGame-dev
AWS_REGION=us-east-1
LOG_LEVEL=INFO
NODE_ENV=development
```

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Type Checking

```bash
npm run typecheck
```

## API

### GraphQL Operations

#### Mutations

**startGame**
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

**completeGame**
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

#### Queries

**getGame**
```graphql
query GetGame($gameId: ID!) {
  getGame(gameId: $gameId) {
    id
    userId
    themeId
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

**getGameHistory** (Paid users only)
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

**getUserStatistics**
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

**canStartGame**
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

## Business Rules

### Rate Limiting
- **FREE**: 3 games/day
- **LIGHT**: 10 games/day
- **STANDARD**: 30 games/day
- **PREMIUM**: 100 games/day
- Resets at midnight UTC

### Score Calculation
```
score = (BASE_SCORE + timeBonus - attemptsPenalty) × difficultyMultiplier

Where:
- BASE_SCORE = 1000
- timeBonus = ((maxTime - actualTime) / maxTime) × 500
- attemptsPenalty = (minAttempts / actualAttempts) × 300
- difficultyMultiplier = 1 + (difficulty × 0.5)
```

### Achievements
1. **FIRST_WIN**: Complete first game
2. **GAMES_10**: Complete 10 games
3. **GAMES_50**: Complete 50 games
4. **GAMES_100**: Complete 100 games
5. **SPEED_DEMON**: Complete game in < 30 seconds
6. **PERFECT_GAME**: Complete with minimum attempts
7. **DIFFICULTY_MASTER**: Complete all 5 difficulty levels
8. **THEME_EXPLORER**: Play 10 different themes
9. **STREAK_7**: Play 7 consecutive days

## Events

### GameCompleted Event
Published to EventBridge after game completion:

```json
{
  "Source": "game-service",
  "DetailType": "GameCompleted",
  "Detail": {
    "gameId": "uuid",
    "userId": "uuid",
    "userName": "string",
    "themeId": "uuid",
    "difficulty": 1-5,
    "score": 1000,
    "completionTime": 45,
    "attempts": 12,
    "completedAt": "2026-03-03T12:00:00Z"
  }
}
```

Consumed by: Leaderboard Service

## Deployment

### Build Package

```bash
npm run build
cd dist
npm install --production
zip -r ../game-service.zip .
```

### Deploy to Lambda

```bash
aws lambda update-function-code \
  --function-name game-service-dev \
  --zip-file fileb://game-service.zip
```

### Deploy with CDK

```bash
cd ../../infrastructure
cdk deploy GameServiceStack-dev
```

## Monitoring

### CloudWatch Metrics
- `GamesStarted` (by difficulty, tier)
- `GamesCompleted` (by difficulty, tier)
- `GameScore` (by difficulty)
- `RateLimitExceeded` (by tier)
- `AchievementUnlocked` (by type)

### CloudWatch Logs
- Log Group: `/aws/lambda/game-service-{env}`
- Format: Structured JSON
- Retention: 30 days (dev), 90 days (prod)

### X-Ray Tracing
- Sampling: 10% (prod), 100% (dev)
- Traces: Lambda execution, DynamoDB operations, EventBridge publish

## Troubleshooting

### Rate Limit Issues
Check RateLimits table for user's current count and resetAt timestamp.

### Score Calculation Issues
Verify completion time and attempts are within valid ranges for difficulty level.

### Achievement Not Unlocking
Check Achievements table for user's progress. Verify game history meets achievement criteria.

### Event Publishing Failures
Check CloudWatch Logs for EventBridge errors. Events are fire-and-forget and won't block game completion.

## Contributing

1. Create feature branch
2. Write tests (maintain 80%+ coverage)
3. Run linting and type checking
4. Submit PR with description

## License

MIT
