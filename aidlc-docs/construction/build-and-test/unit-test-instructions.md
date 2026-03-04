# Unit Test Execution Instructions

## Overview
Unit tests validate individual components in isolation. Each service has its own unit test suite.

## Test Coverage Goals
- **Shared Components**: 80%+ coverage
- **Auth Service**: 80%+ coverage (currently pending)
- **Game Service**: 80%+ coverage (currently pending)
- **Infrastructure**: Snapshot tests (currently pending)

---

## Run Unit Tests

### 1. Test Shared Components

```bash
cd packages/shared
npm test
```

**Expected Results**:
- All tests pass
- Coverage: 80%+ (types, schemas, utils)
- Test report: `coverage/lcov-report/index.html`

**Test Suites**:
- Error types and Result pattern
- Zod validation schemas
- Date/time utilities
- Formatting utilities
- Calculation utilities
- Rate limiting utilities
- Achievement utilities
- Pagination utilities

### 2. Test Auth Service (Pending)

```bash
cd services/auth
npm test
```

**Note**: Unit tests for Auth Service are pending implementation. When implemented, they will cover:
- GraphQL resolvers (auth.handler.ts)
- Business logic (auth.service.ts)
- Cognito client operations
- User repository operations
- Validation utilities
- Error mapping
- Token utilities

**Expected Coverage**: 80%+

### 3. Test Game Service (Pending)

```bash
cd services/game
npm test
```

**Note**: Unit tests for Game Service are pending implementation. When implemented, they will cover:
- GraphQL resolvers (game.handler.ts)
- Business logic (game.service.ts)
- Score calculation (score-calculator.service.ts)
- Rate limiting (rate-limiter.service.ts)
- Achievement tracking (achievement-tracker.service.ts)
- Event publishing (event-publisher.service.ts)
- All repositories (game, rate-limit, achievement, theme, subscription)
- Validation utilities
- Error mapping

**Expected Coverage**: 80%+

### 4. Test Infrastructure (Pending)

```bash
cd infrastructure
npm test
```

**Note**: CDK snapshot tests are pending implementation. When implemented, they will cover:
- Database Stack snapshot
- Cognito Stack snapshot
- EventBridge Stack snapshot
- Lambda Stack snapshot
- API Stack snapshot
- Monitoring Stack snapshot

---

## Run All Unit Tests

From workspace root:

```bash
npm run test:all
```

This runs unit tests for all units in sequence.

---

## Test with Coverage

### Generate Coverage Reports

```bash
# Shared Components
cd packages/shared
npm run test:coverage

# Auth Service (when tests are implemented)
cd services/auth
npm run test:coverage

# Game Service (when tests are implemented)
cd services/game
npm run test:coverage
```

### View Coverage Reports

Coverage reports are generated in HTML format:

```bash
# Shared Components
open packages/shared/coverage/lcov-report/index.html

# Auth Service
open services/auth/coverage/lcov-report/index.html

# Game Service
open services/game/coverage/lcov-report/index.html
```

---

## Test in Watch Mode (Development)

For active development, run tests in watch mode:

```bash
# Shared Components
cd packages/shared
npm run test:watch

# Auth Service
cd services/auth
npm run test:watch

# Game Service
cd services/game
npm run test:watch
```

Tests will automatically rerun when files change.

---

## Fix Failing Tests

If tests fail:

### 1. Review Test Output

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should validate email"
```

### 2. Debug Failing Tests

```bash
# Run tests with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Or use VS Code debugger with Jest extension
```

### 3. Common Test Failures

**Async Test Timeout**:
```typescript
// Increase timeout for slow tests
test('slow operation', async () => {
  // test code
}, 10000); // 10 second timeout
```

**Mock Not Working**:
```typescript
// Ensure mocks are cleared between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

**Environment Variables Missing**:
```typescript
// Set test environment variables
process.env.TEST_VAR = 'test-value';
```

---

## Test Structure

### Shared Components Tests

```
packages/shared/src/
├── types/
│   └── errors.test.ts          # Error types and Result pattern
├── schemas/
│   └── validation.test.ts      # Zod schema validation
└── utils/
    ├── date.test.ts            # Date utilities
    ├── formatting.test.ts      # Formatting utilities
    ├── calculations.test.ts    # Score calculations
    └── rate-limit.test.ts      # Rate limiting
```

### Service Tests (When Implemented)

```
services/auth/tests/
├── unit/
│   ├── handlers/
│   │   └── auth.handler.test.ts
│   ├── services/
│   │   └── auth.service.test.ts
│   ├── repositories/
│   │   ├── cognito.client.test.ts
│   │   └── user.repository.test.ts
│   └── utils/
│       ├── validation.test.ts
│       └── token.test.ts
├── integration/
└── e2e/
```

---

## Test Best Practices

### 1. AAA Pattern (Arrange-Act-Assert)

```typescript
test('should calculate score correctly', () => {
  // Arrange
  const input = { completionTime: 60, attempts: 5, difficulty: 'MEDIUM' };
  
  // Act
  const result = calculateScore(input);
  
  // Assert
  expect(result).toBe(850);
});
```

### 2. Test Isolation

```typescript
// Each test should be independent
beforeEach(() => {
  // Reset state before each test
  jest.clearAllMocks();
});
```

### 3. Descriptive Test Names

```typescript
// Good: Describes what is being tested and expected outcome
test('should return error when email is invalid', () => {});

// Bad: Vague test name
test('email test', () => {});
```

### 4. Test Edge Cases

```typescript
test('should handle empty input', () => {});
test('should handle null values', () => {});
test('should handle maximum values', () => {});
test('should handle special characters', () => {});
```

---

## Current Test Status

### ✅ Implemented
- **Shared Components**: Unit tests implemented with 80%+ coverage

### ⏳ Pending
- **Auth Service**: Unit tests pending (18 test files planned)
- **Game Service**: Unit tests pending (18 test files planned)
- **Infrastructure**: CDK snapshot tests pending (6 test files planned)

---

## Next Steps

1. ✅ Run Shared Components tests: `cd packages/shared && npm test`
2. ⏳ Implement Auth Service tests (post-MVP)
3. ⏳ Implement Game Service tests (post-MVP)
4. ⏳ Implement Infrastructure tests (post-MVP)
5. Run integration tests (see `integration-test-instructions.md`)

---

## Test Automation

For CI/CD pipelines:

```bash
# Run all tests with coverage
npm run test:all -- --coverage --ci

# Fail build if coverage below threshold
npm run test:all -- --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'
```

---

## Troubleshooting

### Tests Fail with "Cannot find module"

**Solution**:
```bash
# Rebuild dependencies
npm install
npm run build
```

### Tests Fail with "Timeout"

**Solution**:
```bash
# Increase Jest timeout
npm test -- --testTimeout=10000
```

### Coverage Not Generated

**Solution**:
```bash
# Ensure coverage script exists in package.json
npm run test:coverage

# Or run with coverage flag
npm test -- --coverage
```
