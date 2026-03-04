# NFR Design Patterns - Game Service

## Architecture Pattern

**Pattern**: Serverless microservice with AWS Lambda + API Gateway + DynamoDB + EventBridge

**Rationale**: 
- Auto-scaling for variable load
- Pay-per-use cost model
- High availability built-in
- Minimal operational overhead

---

## Code Organization

```
services/game/
├── src/
│   ├── handlers/
│   │   └── game.handler.ts          # GraphQL resolvers
│   ├── services/
│   │   ├── game.service.ts          # Core business logic
│   │   ├── rate-limiter.service.ts  # Rate limiting logic
│   │   ├── score-calculator.service.ts  # Score calculation
│   │   └── achievement-tracker.service.ts  # Achievement tracking
│   ├── repositories/
│   │   ├── game.repository.ts       # Games table operations
│   │   ├── rate-limit.repository.ts # RateLimits table operations
│   │   ├── achievement.repository.ts # Achievements table operations
│   │   ├── theme.repository.ts      # Themes table (read-only)
│   │   └── subscription.repository.ts # Subscriptions table (read-only)
│   ├── utils/
│   │   ├── validation.ts            # Input validation
│   │   ├── error-mapper.ts          # Error mapping
│   │   ├── cache.ts                 # Caching utilities
│   │   ├── logger.ts                # Structured logging
│   │   └── metrics.ts               # CloudWatch metrics
│   ├── types/
│   │   └── index.ts                 # Service-specific types
│   └── index.ts                     # Lambda handler entry point
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── utils/
│   ├── integration/
│   │   └── game.integration.test.ts
│   └── e2e/
│       └── game.e2e.test.ts
├── scripts/
│   ├── build.sh
│   └── deploy.sh
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc.js
└── README.md
```

**Design Principles**:
- **Separation of Concerns**: Handlers → Services → Repositories
- **Single Responsibility**: Each service class has one purpose
- **Dependency Injection**: Services receive dependencies via constructor
- **Testability**: All dependencies mockable

---

## Performance Patterns

### 1. Connection Pooling
**Pattern**: Reuse AWS SDK client connections across Lambda invocations

```typescript
// Singleton pattern for DynamoDB client
const dynamoDBClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Reused across invocations
export class GameRepository {
  private docClient = docClient; // Shared instance
}
```

**Benefit**: Reduces connection overhead, improves latency

---

### 2. Lambda Warm-up
**Pattern**: Provisioned concurrency for production environment

```typescript
// CDK configuration
const gameFunction = new Function(this, 'GameFunction', {
  // ... other config
  reservedConcurrentExecutions: 100,
});

// Provisioned concurrency (production only)
if (env === 'production') {
  gameFunction.addAlias('live', {
    provisionedConcurrentExecutions: 10,
  });
}
```

**Benefit**: Eliminates cold starts for 10 concurrent users

---

### 3. Memory Caching
**Pattern**: Cache frequently accessed data in Lambda memory

```typescript
// Theme cache with TTL
class ThemeCache {
  private cache = new Map<string, { theme: Theme; expiresAt: number }>();
  private TTL = 5 * 60 * 1000; // 5 minutes

  async get(themeId: string): Promise<Theme | null> {
    const cached = this.cache.get(themeId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.theme;
    }
    return null;
  }

  set(themeId: string, theme: Theme): void {
    this.cache.set(themeId, {
      theme,
      expiresAt: Date.now() + this.TTL,
    });
  }
}

// Singleton instance (persists across invocations)
export const themeCache = new ThemeCache();
```

**Benefit**: Reduces DynamoDB reads, improves latency

---

### 4. Batch Operations
**Pattern**: Use DynamoDB batch operations where possible

```typescript
// Batch get achievements for user
async getAchievementsByUser(userId: string): Promise<Achievement[]> {
  const command = new QueryCommand({
    TableName: this.tableName,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  });
  
  const result = await this.docClient.send(command);
  return result.Items?.map(this.mapToAchievement) || [];
}
```

**Benefit**: Reduces number of DynamoDB requests

---

## Security Patterns

### 1. Input Validation
**Pattern**: Validate all inputs with Zod schemas

```typescript
import { z } from 'zod';

const startGameInputSchema = z.object({
  themeId: z.string().uuid(),
  difficulty: z.number().int().min(1).max(5),
});

export function validateStartGameInput(input: unknown) {
  return startGameInputSchema.parse(input);
}
```

**Benefit**: Type-safe validation, prevents injection attacks

---

### 2. Authorization
**Pattern**: Verify user owns resource before allowing access

```typescript
async getGame(userId: string, gameId: string): Promise<Game> {
  const game = await this.gameRepository.getById(gameId);
  
  if (!game) {
    throw new NotFoundError('Game not found');
  }
  
  if (game.userId !== userId) {
    throw new ForbiddenError('Access denied');
  }
  
  return game;
}
```

**Benefit**: Prevents unauthorized access to user data

---

### 3. Error Sanitization
**Pattern**: Never expose internal errors to client

```typescript
export function sanitizeError(error: Error): Error {
  // Known domain errors - safe to expose
  if (error instanceof ValidationError ||
      error instanceof NotFoundError ||
      error instanceof RateLimitError) {
    return error;
  }
  
  // Unknown errors - log but don't expose
  logger.error('Unexpected error', error);
  return new InternalError('An unexpected error occurred');
}
```

**Benefit**: Prevents information leakage

---

### 4. Rate Limiting
**Pattern**: Enforce rate limits at application level

```typescript
async checkRateLimit(userId: string, tier: SubscriptionTier): Promise<void> {
  const limit = this.getTierLimit(tier);
  const rateLimit = await this.rateLimitRepository.get(userId);
  
  if (!rateLimit || rateLimit.resetAt < new Date()) {
    // Create or reset
    await this.rateLimitRepository.upsert({
      userId,
      tier,
      count: 0,
      resetAt: this.getNextMidnightUTC(),
    });
    return;
  }
  
  if (rateLimit.count >= limit) {
    throw new RateLimitError(
      `Rate limit exceeded. You can play again at ${rateLimit.resetAt.toISOString()}`
    );
  }
}
```

**Benefit**: Protects system from abuse, enforces business rules

---

## Error Handling Patterns

### 1. Result Type Pattern
**Pattern**: Use Result<T, Error> for explicit error handling

```typescript
import { Result, Ok, Err } from '@memory-game/shared';

async startGame(
  userId: string,
  input: StartGameInput
): Promise<Result<Game, Error>> {
  try {
    // Validate and create game
    const game = await this.createGame(userId, input);
    return Ok(game);
  } catch (error) {
    return Err(mapGenericError(error as Error));
  }
}
```

**Benefit**: Explicit error handling, type-safe

---

### 2. Error Mapping
**Pattern**: Map infrastructure errors to domain errors

```typescript
export function mapDynamoDBError(error: Error): Error {
  switch (error.name) {
    case 'ConditionalCheckFailedException':
      return new ConflictError('Resource already exists');
    case 'ResourceNotFoundException':
      return new NotFoundError('Resource not found');
    case 'ProvisionedThroughputExceededException':
      return new RateLimitError('Service temporarily unavailable');
    default:
      return new InternalError('Database error');
  }
}
```

**Benefit**: Consistent error handling across service

---

### 3. Retry Logic
**Pattern**: Retry transient errors with exponential backoff

```typescript
async withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Only retry transient errors
      if (!this.isTransientError(error)) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 100;
      await this.sleep(delay);
    }
  }
  
  throw lastError!;
}
```

**Benefit**: Handles transient failures gracefully

---

## Testing Patterns

### 1. Unit Testing
**Pattern**: Mock all external dependencies

```typescript
describe('GameService', () => {
  let gameService: GameService;
  let mockGameRepository: jest.Mocked<GameRepository>;
  let mockRateLimiter: jest.Mocked<RateLimiter>;
  
  beforeEach(() => {
    mockGameRepository = {
      create: jest.fn(),
      getById: jest.fn(),
      // ... other methods
    } as any;
    
    mockRateLimiter = {
      checkLimit: jest.fn(),
      incrementUsage: jest.fn(),
    } as any;
    
    gameService = new GameService(
      mockGameRepository,
      mockRateLimiter,
      // ... other dependencies
    );
  });
  
  it('should create game when rate limit not exceeded', async () => {
    mockRateLimiter.checkLimit.mockResolvedValue(undefined);
    mockGameRepository.create.mockResolvedValue(mockGame);
    
    const result = await gameService.startGame(userId, input);
    
    expect(result).toEqual(mockGame);
    expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(userId, tier);
  });
});
```

**Benefit**: Fast, isolated, deterministic tests

---

### 2. Integration Testing
**Pattern**: Test with LocalStack for DynamoDB

```typescript
describe('GameService Integration', () => {
  let dynamoDBClient: DynamoDBClient;
  let gameRepository: GameRepository;
  
  beforeAll(async () => {
    // Connect to LocalStack
    dynamoDBClient = new DynamoDBClient({
      endpoint: 'http://localhost:4566',
      region: 'us-east-1',
    });
    
    // Create test tables
    await createTestTables(dynamoDBClient);
    
    gameRepository = new GameRepository(dynamoDBClient);
  });
  
  it('should persist game to DynamoDB', async () => {
    const game = await gameRepository.create(mockGameData);
    const retrieved = await gameRepository.getById(game.id);
    
    expect(retrieved).toEqual(game);
  });
});
```

**Benefit**: Tests real database interactions

---

### 3. E2E Testing
**Pattern**: Test against dev environment

```typescript
describe('Game Service E2E', () => {
  const apiUrl = process.env.API_URL;
  const authToken = await getTestUserToken();
  
  it('should complete full game flow', async () => {
    // Start game
    const startResponse = await fetch(`${apiUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: START_GAME_MUTATION,
        variables: { input: { themeId, difficulty: 1 } },
      }),
    });
    
    const { data: { startGame: game } } = await startResponse.json();
    expect(game.status).toBe('IN_PROGRESS');
    
    // Complete game
    const completeResponse = await fetch(`${apiUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: COMPLETE_GAME_MUTATION,
        variables: {
          input: {
            gameId: game.id,
            completionTime: 30,
            attempts: 6,
          },
        },
      }),
    });
    
    const { data: { completeGame: completed } } = await completeResponse.json();
    expect(completed.status).toBe('COMPLETED');
    expect(completed.score).toBeGreaterThan(0);
  });
});
```

**Benefit**: Validates end-to-end functionality

---

## Monitoring Patterns

### 1. Structured Logging
**Pattern**: JSON logs with correlation IDs

```typescript
class Logger {
  private context: Record<string, unknown> = {};
  
  setContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }
  
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      ...this.context,
      ...meta,
    }));
  }
  
  error(message: string, error: Error, meta?: Record<string, unknown>): void {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...this.context,
      ...meta,
    }));
  }
}

export const logger = new Logger();
```

**Benefit**: Searchable, parseable logs in CloudWatch

---

### 2. Custom Metrics
**Pattern**: Publish business metrics to CloudWatch

```typescript
class MetricsPublisher {
  async publishGameStarted(difficulty: number): Promise<void> {
    await cloudwatch.putMetricData({
      Namespace: 'MemoryGame/GameService',
      MetricData: [{
        MetricName: 'GamesStarted',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Difficulty', Value: difficulty.toString() },
        ],
      }],
    });
  }
  
  async publishGameCompleted(score: number, difficulty: number): Promise<void> {
    await cloudwatch.putMetricData({
      Namespace: 'MemoryGame/GameService',
      MetricData: [
        {
          MetricName: 'GamesCompleted',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Difficulty', Value: difficulty.toString() },
          ],
        },
        {
          MetricName: 'GameScore',
          Value: score,
          Unit: 'None',
          Dimensions: [
            { Name: 'Difficulty', Value: difficulty.toString() },
          ],
        },
      ],
    });
  }
}
```

**Benefit**: Business insights, alerting on anomalies

---

### 3. X-Ray Tracing
**Pattern**: Trace requests across services

```typescript
import { captureAWSv3Client } from 'aws-xray-sdk-core';

// Wrap DynamoDB client with X-Ray
const dynamoDBClient = captureAWSv3Client(new DynamoDBClient({}));

// Automatic tracing of DynamoDB operations
const result = await docClient.send(new GetCommand({
  TableName: 'Games',
  Key: { id: gameId },
}));
```

**Benefit**: Performance bottleneck identification

---

## Async Patterns

### 1. Event-Driven Architecture
**Pattern**: Publish events to EventBridge for async processing

```typescript
async notifyLeaderboard(game: Game): Promise<void> {
  try {
    await eventBridge.putEvents({
      Entries: [{
        Source: 'game-service',
        DetailType: 'GameCompleted',
        Detail: JSON.stringify({
          gameId: game.id,
          userId: game.userId,
          themeId: game.themeId,
          difficulty: game.difficulty,
          score: game.score,
          completionTime: game.completionTime,
          attempts: game.attempts,
          completedAt: game.completedAt,
        }),
      }],
    });
  } catch (error) {
    // Log but don't fail request
    logger.error('Failed to publish GameCompleted event', error as Error);
  }
}
```

**Benefit**: Decoupled services, non-blocking operations

---

### 2. Fire-and-Forget
**Pattern**: Don't wait for non-critical operations

```typescript
async completeGame(userId: string, input: CompleteGameInput): Promise<Game> {
  // Critical path - must succeed
  const game = await this.gameRepository.update(gameId, {
    status: 'COMPLETED',
    completedAt: new Date(),
    completionTime: input.completionTime,
    attempts: input.attempts,
    score: this.calculateScore(game.difficulty, input.completionTime, input.attempts),
  });
  
  // Non-critical - fire and forget
  this.notifyLeaderboard(game).catch(error => {
    logger.error('Leaderboard notification failed', error);
  });
  
  return game;
}
```

**Benefit**: Faster response times, better user experience

---

## Caching Patterns

### 1. In-Memory Cache
**Pattern**: Cache in Lambda memory with TTL

```typescript
class Cache<T> {
  private data = new Map<string, { value: T; expiresAt: number }>();
  
  constructor(private ttlMs: number) {}
  
  get(key: string): T | null {
    const cached = this.data.get(key);
    if (!cached) return null;
    
    if (cached.expiresAt < Date.now()) {
      this.data.delete(key);
      return null;
    }
    
    return cached.value;
  }
  
  set(key: string, value: T): void {
    this.data.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}

// Theme cache (5-minute TTL)
export const themeCache = new Cache<Theme>(5 * 60 * 1000);
```

**Benefit**: Free caching, reduces DynamoDB reads

---

## Summary

The Game Service follows established serverless patterns with:
- **Layered Architecture**: Handlers → Services → Repositories
- **Performance**: Connection pooling, caching, batch operations
- **Security**: Input validation, authorization, error sanitization
- **Reliability**: Retry logic, error handling, graceful degradation
- **Testing**: Unit, integration, E2E with high coverage
- **Monitoring**: Structured logging, custom metrics, X-Ray tracing
- **Async**: Event-driven, fire-and-forget for non-critical operations

All patterns are production-ready and aligned with Auth Service implementation.
