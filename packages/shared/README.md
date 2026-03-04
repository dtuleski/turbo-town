# @memory-game/shared

Shared types, schemas, utilities, and constants for the memory game application.

## Overview

This package provides the foundational building blocks used across all backend services and frontend applications in the memory game monorepo.

## Features

- **TypeScript Types**: Comprehensive type definitions for all domain entities
- **Zod Schemas**: Runtime validation schemas with type inference
- **Utility Functions**: Common operations for validation, calculations, formatting
- **Constants**: Application-wide configuration and business rules
- **GraphQL Types**: GraphQL schema definitions

## Installation

```bash
npm install @memory-game/shared
```

## Usage

### Types

```typescript
import { User, Game, Theme, SubscriptionTier } from '@memory-game/shared';

const user: User = {
  id: '123',
  email: 'user@example.com',
  name: 'John Doe',
  role: UserRole.User,
  tier: SubscriptionTier.Free,
  // ...
};
```

### Validation

```typescript
import { userSchema, validate } from '@memory-game/shared';

const result = validate(userSchema, userData);
if (result.success) {
  console.log('Valid user:', result.data);
} else {
  console.error('Validation error:', result.error);
}
```

### Utilities

```typescript
import { scoreUtils, dateUtils, currencyUtils } from '@memory-game/shared';

// Calculate game score
const score = scoreUtils.calculateGameScore(24, 120, 30);

// Format date
const formatted = dateUtils.formatDate(new Date());

// Format currency
const price = currencyUtils.formatCents(599); // "$5.99"
```

### Constants

```typescript
import { RATE_LIMITS, SUBSCRIPTION_PRICING, ACHIEVEMENTS } from '@memory-game/shared';

// Check rate limits
const limit = RATE_LIMITS[user.tier];
console.log(`Games per day: ${limit.gamesPerPeriod}`);

// Get pricing
const price = SUBSCRIPTION_PRICING.STANDARD.monthly;
console.log(`Monthly price: ${price} cents`);
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
npm run test:coverage
```

### Lint

```bash
npm run lint
npm run lint:fix
```

### Format

```bash
npm run format
npm run format:check
```

## Architecture

The library is organized into feature-based modules:

- `types/` - TypeScript type definitions
- `schemas/` - Zod validation schemas
- `utils/` - Utility functions
- `constants/` - Application constants
- `graphql/` - GraphQL schema definitions

## Dependencies

- **zod**: Runtime schema validation
- **date-fns**: Date/time utilities

## License

MIT
