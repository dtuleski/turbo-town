# NFR Design Patterns - Shared Components

## Overview
This document defines design patterns for implementing non-functional requirements in the Shared Components library.

**Unit Type**: TypeScript Library
**Focus**: Code organization, performance optimization, security, and testing patterns

---

## Code Organization Patterns

### Module Structure Pattern
**Pattern**: Feature-based module organization with clear public/internal separation

**Structure**:
```
src/
├── index.ts                    # Public API exports only
├── types/                      # Type definitions
│   ├── index.ts               # Re-export all types
│   ├── entities.ts            # Domain entity types
│   ├── enums.ts               # Enum types
│   ├── errors.ts              # Error types
│   ├── results.ts             # Result type pattern
│   └── utilities.ts           # Utility types (Pagination, Filters)
├── schemas/                    # Zod validation schemas
│   ├── index.ts               # Re-export all schemas
│   ├── user.schema.ts
│   ├── game.schema.ts
│   ├── theme.schema.ts
│   └── subscription.schema.ts
├── utils/                      # Utility functions
│   ├── index.ts               # Re-export all utils
│   ├── validation.ts          # Validation utilities
│   ├── date.ts                # Date/time utilities
│   ├── formatting.ts          # Formatting utilities
│   ├── calculations.ts        # Calculation utilities
│   ├── strings.ts             # String utilities
│   ├── rate-limit.ts          # Rate limiting utilities
│   ├── achievements.ts        # Achievement utilities
│   └── pagination.ts          # Pagination utilities
├── constants/                  # Application constants
│   ├── index.ts               # Re-export all constants
│   ├── app.constants.ts       # Application constants
│   ├── rate-limits.ts         # Rate limit configurations
│   ├── pricing.ts             # Subscription pricing
│   ├── achievements.ts        # Achievement definitions
│   └── errors.ts              # Error codes
└── graphql/                    # GraphQL type definitions
    ├── index.ts               # Re-export all GraphQL types
    └── schema.graphql         # GraphQL schema definitions
```

**Rationale**:
- Clear separation of concerns
- Easy to navigate and find code
- Supports tree-shaking (import only what you need)
- Scales well as library grows

### Public API Export Pattern
**Pattern**: Barrel exports with explicit public API

**Implementation** (`src/index.ts`):
```typescript
// Types
export * from './types';

// Schemas
export * from './schemas';

// Utilities
export * from './utils';

// Constants
export * from './constants';

// GraphQL (optional, for services that need it)
export * from './graphql';
```

**Rationale**:
- Single import point for consumers
- Clear public API surface
- Easy to version and maintain
- Supports tree-shaking

### Internal vs External API Pattern
**Pattern**: Use TypeScript visibility modifiers and naming conventions

**Implementation**:
```typescript
// Public API - exported from index.ts
export function calculateGameScore(/* ... */): number { /* ... */ }

// Internal helper - not exported, prefixed with underscore
function _normalizeScore(score: number): number { /* ... */ }

// Internal type - not exported
interface InternalCalculationContext { /* ... */ }
```

**Rationale**:
- Clear distinction between public and internal APIs
- Prevents accidental usage of internal APIs
- Allows refactoring internal code without breaking changes

---

## Performance Optimization Patterns

### Schema Caching Pattern
**Pattern**: Cache compiled Zod schemas to avoid recompilation

**Implementation**:
```typescript
import { z } from 'zod';

// Cache for compiled schemas
const schemaCache = new Map<string, z.ZodSchema>();

export function getCachedSchema<T>(
  key: string,
  schemaFactory: () => z.ZodSchema<T>
): z.ZodSchema<T> {
  if (!schemaCache.has(key)) {
    schemaCache.set(key, schemaFactory());
  }
  return schemaCache.get(key) as z.ZodSchema<T>;
}

// Usage
const userSchema = getCachedSchema('user', () => z.object({
  email: z.string().email(),
  name: z.string().min(1)
}));
```

**Rationale**:
- Zod schema compilation can be expensive
- Caching avoids repeated compilation
- Significant performance improvement for hot paths

### Lazy Loading Pattern
**Pattern**: Lazy-load heavy utilities only when needed

**Implementation**:
```typescript
// Heavy utility that's rarely used
let _heavyUtility: typeof import('./heavy-utility') | null = null;

export async function getHeavyUtility() {
  if (!_heavyUtility) {
    _heavyUtility = await import('./heavy-utility');
  }
  return _heavyUtility;
}
```

**Rationale**:
- Reduces initial bundle size
- Improves startup time
- Only loads code when actually needed

### Memoization Pattern
**Pattern**: Memoize expensive calculations

**Implementation**:
```typescript
// Simple memoization for pure functions
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Usage for expensive calculations
export const calculateComplexStatistics = memoize(
  (data: number[]): Statistics => {
    // Expensive calculation
    return { /* ... */ };
  }
);
```

**Rationale**:
- Avoids redundant calculations
- Improves performance for repeated calls
- Transparent to consumers

### Hot Path Optimization Pattern
**Pattern**: Optimize critical paths identified in NFR requirements

**Critical Paths**:
1. **Validation** - Used on every API request
2. **Score Calculation** - Real-time during gameplay
3. **Rate Limit Checks** - Every game start

**Implementation**:
```typescript
// Optimized validation with early returns
export function validateUser(data: unknown): Result<User> {
  // Fast path: check required fields first
  if (!data || typeof data !== 'object') {
    return failure(new ValidationError('Invalid input'));
  }
  
  // Use safeParse for better performance
  const result = userSchema.safeParse(data);
  
  if (result.success) {
    return success(result.data);
  }
  
  return failure(new ValidationError('Validation failed', {
    errors: result.error.errors
  }));
}

// Optimized score calculation with minimal operations
export function calculateGameScore(
  difficulty: number,
  completionTime: number,
  attempts: number
): number {
  // Pre-calculate constants
  const difficultyMultiplier = difficulty * 0.08333; // difficulty / 12
  const attemptPenalty = attempts / difficulty;
  
  // Single calculation
  const score = (difficultyMultiplier * 10000) / (completionTime * attemptPenalty);
  
  // Fast rounding
  return Math.max(1, Math.round(score * 100) / 100);
}
```

**Rationale**:
- Focuses optimization effort on critical paths
- Measurable performance improvements
- Maintains code readability

---

## Security Patterns

### Input Sanitization Pattern
**Pattern**: Sanitize all user inputs before processing

**Implementation**:
```typescript
export const stringUtils = {
  // Remove dangerous HTML
  sanitizeHTML: (html: string): string => {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  },
  
  // Sanitize for safe URL usage
  sanitizeURL: (url: string): string => {
    // Remove dangerous protocols
    if (url.match(/^(javascript|data|vbscript):/i)) {
      return '';
    }
    return url;
  },
  
  // Escape HTML entities
  escapeHTML: (text: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return text.replace(/[&<>"'/]/g, (char) => map[char]);
  }
};
```

**Rationale**:
- Prevents XSS attacks
- Prevents script injection
- Defense in depth

### Secure Error Handling Pattern
**Pattern**: Don't leak sensitive information in error messages

**Implementation**:
```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
  
  // Safe serialization for client
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode
      // Deliberately exclude details and stack trace
    };
  }
  
  // Full details for logging (server-side only)
  toLogFormat() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack
    };
  }
}
```

**Rationale**:
- Prevents information disclosure
- Separates client-facing and internal error details
- Maintains security while enabling debugging

### Dependency Security Pattern
**Pattern**: Regular security scanning and updates

**Implementation** (package.json scripts):
```json
{
  "scripts": {
    "security:audit": "npm audit",
    "security:fix": "npm audit fix",
    "security:check": "npm audit --audit-level=moderate"
  }
}
```

**CI/CD Integration**:
- Run `npm audit` on every build
- Fail build on high/critical vulnerabilities
- Enable Dependabot for automated updates
- Review and approve dependency updates

**Rationale**:
- Proactive vulnerability detection
- Automated security updates
- Continuous security monitoring

---

## Testing Patterns

### Unit Testing Pattern
**Pattern**: Comprehensive unit tests with AAA (Arrange-Act-Assert) structure

**Implementation**:
```typescript
describe('calculateGameScore', () => {
  it('should calculate score correctly for standard game', () => {
    // Arrange
    const difficulty = 24;
    const completionTime = 120;
    const attempts = 30;
    
    // Act
    const score = calculateGameScore(difficulty, completionTime, attempts);
    
    // Assert
    expect(score).toBeCloseTo(166.67, 2);
  });
  
  it('should return minimum score of 1', () => {
    // Arrange
    const difficulty = 12;
    const completionTime = 1000;
    const attempts = 100;
    
    // Act
    const score = calculateGameScore(difficulty, completionTime, attempts);
    
    // Assert
    expect(score).toBe(1);
  });
  
  it('should handle edge case: zero attempts', () => {
    // Arrange
    const difficulty = 24;
    const completionTime = 60;
    const attempts = 0;
    
    // Act & Assert
    expect(() => calculateGameScore(difficulty, completionTime, attempts))
      .toThrow();
  });
});
```

**Rationale**:
- Clear test structure
- Easy to understand and maintain
- Comprehensive coverage of happy path and edge cases

### Test Organization Pattern
**Pattern**: Co-locate tests with source files

**Structure**:
```
src/
├── utils/
│   ├── calculations.ts
│   ├── calculations.test.ts
│   ├── validation.ts
│   └── validation.test.ts
```

**Rationale**:
- Easy to find related tests
- Encourages writing tests
- Clear ownership

### Mocking Pattern
**Pattern**: Mock external dependencies, not internal functions

**Implementation**:
```typescript
// Mock external dependency (date-fns)
jest.mock('date-fns', () => ({
  format: jest.fn((date) => '2024-01-01'),
  addDays: jest.fn((date, days) => new Date('2024-01-08'))
}));

describe('dateUtils', () => {
  it('should format date using date-fns', () => {
    const result = dateUtils.formatDate(new Date());
    expect(result).toBe('2024-01-01');
  });
});
```

**Rationale**:
- Tests remain isolated
- Fast test execution
- Predictable test results

### Fixture Pattern
**Pattern**: Reusable test data fixtures

**Implementation**:
```typescript
// test/fixtures/user.fixtures.ts
export const validUser = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER' as const,
  tier: 'FREE' as const
};

export const invalidUser = {
  email: 'invalid-email',
  name: '',
  role: 'INVALID' as const
};

// Usage in tests
import { validUser, invalidUser } from '../fixtures/user.fixtures';

describe('userSchema', () => {
  it('should validate valid user', () => {
    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid user', () => {
    const result = userSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });
});
```

**Rationale**:
- Consistent test data
- Reduces duplication
- Easy to maintain

---

## Pattern Summary

| Category | Pattern | Purpose |
|----------|---------|---------|
| Code Organization | Feature-based modules | Clear structure, tree-shaking |
| Code Organization | Barrel exports | Single import point |
| Code Organization | Internal/external separation | API clarity |
| Performance | Schema caching | Avoid recompilation |
| Performance | Lazy loading | Reduce bundle size |
| Performance | Memoization | Cache expensive calculations |
| Performance | Hot path optimization | Optimize critical paths |
| Security | Input sanitization | Prevent XSS/injection |
| Security | Secure error handling | Prevent information disclosure |
| Security | Dependency scanning | Proactive vulnerability detection |
| Testing | AAA unit tests | Clear test structure |
| Testing | Co-located tests | Easy to find and maintain |
| Testing | Mock external deps | Fast, isolated tests |
| Testing | Reusable fixtures | Consistent test data |

All patterns are designed to implement the NFR requirements while maintaining code quality and developer experience.
