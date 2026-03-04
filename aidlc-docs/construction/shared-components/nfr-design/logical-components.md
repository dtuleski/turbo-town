# Logical Components - Shared Components

## Overview
This document defines the logical module structure of the Shared Components library. Since this is a library (not a deployed service), there are no infrastructure components like queues, caches, or load balancers. Instead, this document describes the internal module organization and dependencies.

**Unit Type**: TypeScript Library
**Deployment**: NPM package within monorepo workspace
**Runtime**: No runtime infrastructure (consumed by other services)

---

## Module Architecture

### High-Level Module Structure
```
@memory-game/shared
├── Types Module
├── Schemas Module
├── Utils Module
├── Constants Module
└── GraphQL Module
```

### Module Dependency Graph
```
┌─────────────────────────────────────────────────────────────┐
│                     Public API (index.ts)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ exports
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Types   │  │ Schemas  │  │  Utils   │  │Constants │   │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       │             │              │              │          │
│       └─────────────┴──────────────┴──────────────┘          │
│                         │                                     │
│                         ▼                                     │
│                  ┌──────────┐                                │
│                  │ GraphQL  │                                │
│                  │  Module  │                                │
│                  └──────────┘                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Dependencies:
- Types Module: No dependencies (base layer)
- Schemas Module: Depends on Types Module
- Utils Module: Depends on Types, Schemas, Constants
- Constants Module: Depends on Types Module
- GraphQL Module: Depends on Types Module
```

---

## Module Definitions

### 1. Types Module
**Purpose**: Core type definitions for all domain entities and utilities

**Exports**:
- Entity types (User, Game, Theme, Subscription, etc.)
- Enum types (UserRole, SubscriptionTier, GameStatus, etc.)
- Error types (AppError, ValidationError, etc.)
- Result types (Result<T>, Success<T>, Failure)
- Utility types (Pagination, Filters, etc.)

**Dependencies**: None (base layer)

**Files**:
```
types/
├── index.ts              # Re-export all types
├── entities.ts           # Domain entity interfaces
├── enums.ts              # Enum definitions
├── errors.ts             # Error classes
├── results.ts            # Result type pattern
└── utilities.ts          # Utility types
```

**Key Types**:
- 10 core entity interfaces
- 11 enum types
- 6 error classes
- Result<T> discriminated union
- Pagination and filter types

---

### 2. Schemas Module
**Purpose**: Zod validation schemas for runtime validation

**Exports**:
- Entity schemas (userSchema, gameSchema, etc.)
- Validation utilities (validate function)
- Schema cache utilities

**Dependencies**: 
- Types Module (for type inference)
- Zod library (external)

**Files**:
```
schemas/
├── index.ts              # Re-export all schemas
├── user.schema.ts        # User validation schema
├── game.schema.ts        # Game validation schema
├── theme.schema.ts       # Theme validation schema
├── subscription.schema.ts # Subscription validation schema
├── leaderboard.schema.ts # Leaderboard validation schema
└── achievement.schema.ts # Achievement validation schema
```

**Key Schemas**:
- 10+ Zod schemas matching entity types
- Validation helper functions
- Schema caching utilities

---

### 3. Utils Module
**Purpose**: Utility functions for common operations

**Exports**:
- Validation utilities
- Date/time utilities
- Formatting utilities (currency, numbers, strings)
- Calculation utilities (score, statistics)
- String utilities (sanitization, slugification)
- Rate limiting utilities
- Achievement utilities
- Pagination utilities

**Dependencies**:
- Types Module (for type definitions)
- Schemas Module (for validation)
- Constants Module (for configuration)
- date-fns library (external)

**Files**:
```
utils/
├── index.ts              # Re-export all utilities
├── validation.ts         # Validation utilities
├── date.ts               # Date/time utilities
├── formatting.ts         # Formatting utilities
├── calculations.ts       # Calculation utilities
├── strings.ts            # String utilities
├── rate-limit.ts         # Rate limiting utilities
├── achievements.ts       # Achievement utilities
└── pagination.ts         # Pagination utilities
```

**Key Utilities**:
- 40+ utility functions
- Performance-optimized hot paths
- Comprehensive error handling

---

### 4. Constants Module
**Purpose**: Application-wide constants and configuration

**Exports**:
- Rate limit configurations
- Subscription pricing
- Achievement definitions
- Application constants (timeouts, limits)
- Error codes

**Dependencies**:
- Types Module (for type definitions)

**Files**:
```
constants/
├── index.ts              # Re-export all constants
├── app.constants.ts      # Application constants
├── rate-limits.ts        # Rate limit configurations
├── pricing.ts            # Subscription pricing
├── achievements.ts       # Achievement definitions
└── errors.ts             # Error codes
```

**Key Constants**:
- RATE_LIMITS configuration
- SUBSCRIPTION_PRICING configuration
- ACHIEVEMENTS definitions
- APP_CONSTANTS (timeouts, limits)
- ERROR_CODES mapping

---

### 5. GraphQL Module
**Purpose**: GraphQL type definitions for API schema

**Exports**:
- GraphQL schema definitions
- Type definitions for GraphQL resolvers

**Dependencies**:
- Types Module (for type alignment)

**Files**:
```
graphql/
├── index.ts              # Re-export GraphQL types
└── schema.graphql        # GraphQL schema definitions
```

**Key Definitions**:
- GraphQL types matching TypeScript entities
- GraphQL enums matching TypeScript enums
- Query and mutation type definitions

---

## Module Interaction Patterns

### Type Safety Flow
```
1. Define TypeScript types (Types Module)
2. Create Zod schemas (Schemas Module)
3. Infer types from schemas for validation
4. Use types in utility functions (Utils Module)
5. Export GraphQL types (GraphQL Module)
```

### Validation Flow
```
1. Consumer calls utility function
2. Utility validates input using Zod schema
3. Schema validates against TypeScript types
4. Return Result<T> with success or error
```

### Dependency Flow
```
Types (base) → Schemas, Constants, GraphQL
Schemas → Utils
Constants → Utils
Utils → (consumed by services)
```

---

## Consumer Integration

### How Services Use Shared Components

**Backend Services**:
```typescript
import {
  // Types
  User, Game, Theme,
  // Schemas
  userSchema, gameSchema,
  // Utils
  validateUser, calculateGameScore, dateUtils,
  // Constants
  RATE_LIMITS, ERROR_CODES,
  // Errors
  ValidationError, NotFoundError
} from '@memory-game/shared';

// Validate user input
const result = validateUser(userData);
if (!result.success) {
  throw result.error;
}

// Use utility functions
const score = calculateGameScore(24, 120, 30);

// Check rate limits
const canPlay = rateLimitUtils.canStartGame(
  currentCount,
  user.tier,
  resetAt
);
```

**Frontend Applications**:
```typescript
import {
  // Types only (no validation on client)
  User, Game, Theme,
  SubscriptionTier, GameStatus,
  // Utils (client-safe only)
  dateUtils, currencyUtils, numberUtils,
  // Constants
  SUBSCRIPTION_PRICING, ACHIEVEMENTS
} from '@memory-game/shared';

// Use types for type safety
const user: User = { /* ... */ };

// Use formatting utilities
const formattedPrice = currencyUtils.formatCents(
  SUBSCRIPTION_PRICING.STANDARD.monthly
);

// Use date utilities
const formattedDate = dateUtils.formatDate(game.completedAt);
```

---

## Build and Distribution

### Build Configuration
```json
{
  "name": "@memory-game/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ]
}
```

### Build Output
```
dist/
├── index.js              # Compiled JavaScript
├── index.d.ts            # Type declarations
├── types/                # Compiled types module
├── schemas/              # Compiled schemas module
├── utils/                # Compiled utils module
├── constants/            # Compiled constants module
└── graphql/              # Compiled GraphQL module
```

### Tree-Shaking Support
- ES modules for optimal tree-shaking
- Consumers can import only what they need
- Reduces bundle size for frontend applications

---

## Performance Characteristics

### Bundle Size
- **Total**: ~100KB minified (estimated)
- **Types**: ~10KB (type definitions only)
- **Schemas**: ~20KB (Zod schemas)
- **Utils**: ~40KB (utility functions)
- **Constants**: ~10KB (configuration)
- **GraphQL**: ~20KB (schema definitions)

### Runtime Performance
- **Validation**: <1ms for simple schemas
- **Calculations**: <0.1ms for score calculation
- **Formatting**: <0.5ms for date/currency formatting
- **No runtime overhead**: Pure functions, no side effects

### Memory Footprint
- **Minimal**: No persistent state
- **Schema caching**: ~1MB for cached schemas
- **No memory leaks**: Immutable data structures

---

## Module Summary

| Module | Purpose | Dependencies | Exports |
|--------|---------|--------------|---------|
| Types | Core type definitions | None | 10 entities, 11 enums, 6 errors |
| Schemas | Runtime validation | Types, Zod | 10+ Zod schemas |
| Utils | Utility functions | Types, Schemas, Constants, date-fns | 40+ utilities |
| Constants | Configuration | Types | 5 constant groups |
| GraphQL | API schema | Types | GraphQL definitions |

**Total Exports**: 100+ types, functions, and constants
**Runtime Dependencies**: 2 (Zod, date-fns)
**Dev Dependencies**: ~15 (testing, linting, building)

All modules are designed for maximum reusability, type safety, and performance.
