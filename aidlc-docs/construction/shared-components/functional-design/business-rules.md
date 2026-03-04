# Business Rules - Shared Components

## Overview
This document defines business rules, validation logic, constraints, and calculations for the memory game application.

---

## Validation Rules (Zod Schemas)

### User Validation
```typescript
import { z } from 'zod';

const emailSchema = z.string().email().max(255);
const passwordSchema = z.string().min(8).max(128)
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number');

const userSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(100),
  profilePictureUrl: z.string().url().optional(),
  role: z.enum(['USER', 'ADMIN', 'CONTENT_MANAGER']),
  tier: z.enum(['FREE', 'LIGHT', 'STANDARD', 'PREMIUM'])
});
```

### Game Validation
```typescript
const gameSchema = z.object({
  themeId: z.string().uuid(),
  difficulty: z.number().int().min(12).max(48).refine(
    (val) => [12, 18, 24, 30, 36, 42, 48].includes(val),
    'Difficulty must be 12, 18, 24, 30, 36, 42, or 48'
  ),
  completionTime: z.number().positive().optional(),
  attempts: z.number().int().nonnegative()
});
```

---

## Business Constraints

### Rate Limits by Tier
```typescript
const RATE_LIMITS = {
  FREE: {
    gamesPerPeriod: 3,
    periodHours: 24,
    maxPairs: 12
  },
  LIGHT: {
    gamesPerPeriod: 10,
    periodHours: 24,
    maxPairs: 24
  },
  STANDARD: {
    gamesPerPeriod: 30,
    periodHours: 24,
    maxPairs: 36
  },
  PREMIUM: {
    gamesPerPeriod: 100,
    periodHours: 24,
    maxPairs: 48
  }
} as const;
```

### Subscription Pricing
```typescript
const SUBSCRIPTION_PRICING = {
  LIGHT: {
    monthly: 199,  // $1.99 in cents
    annual: 1990   // $19.90 in cents (17% discount)
  },
  STANDARD: {
    monthly: 599,  // $5.99 in cents
    annual: 5990   // $59.90 in cents (17% discount)
  },
  PREMIUM: {
    monthly: 999,  // $9.99 in cents
    annual: 9990   // $99.90 in cents (17% discount)
  }
} as const;
```

---

## Calculation Formulas

### Score Calculation
```typescript
/**
 * Calculate game score based on difficulty, time, and attempts
 * Formula: (Difficulty Multiplier × 10000) / (Time × Attempt Penalty)
 */
function calculateScore(
  difficulty: number,
  completionTime: number,
  attempts: number
): number {
  const difficultyMultiplier = difficulty / 12; // 12 pairs = 1.0, 48 pairs = 4.0
  const attemptPenalty = attempts / difficulty; // Ratio of attempts to pairs
  
  const score = (difficultyMultiplier * 10000) / (completionTime * attemptPenalty);
  
  return Math.max(1, Math.round(score * 100) / 100); // Minimum 1 point, 2 decimals
}
```

### Leaderboard Ranking
```typescript
/**
 * Determine leaderboard rank based on score
 * Higher score = better rank (lower number)
 */
function calculateRank(score: number, existingScores: number[]): number {
  const sortedScores = [...existingScores, score].sort((a, b) => b - a);
  return sortedScores.indexOf(score) + 1;
}
```

---

## State Transition Rules

### Game Status Transitions
```
IN_PROGRESS → COMPLETED (when all pairs matched)
IN_PROGRESS → ABANDONED (when user exits)
COMPLETED → (terminal state)
ABANDONED → (terminal state)
```

### Subscription Status Transitions
```
ACTIVE → CANCELLED (user cancels, continues until period end)
ACTIVE → PAST_DUE (payment fails)
ACTIVE → EXPIRED (period ends without renewal)
CANCELLED → ACTIVE (user reactivates before period end)
PAST_DUE → ACTIVE (payment succeeds)
PAST_DUE → EXPIRED (payment fails after retries)
EXPIRED → ACTIVE (user resubscribes)
```

### Theme Status Transitions
```
DRAFT → PUBLISHED (content manager publishes)
DRAFT → (can be deleted)
PUBLISHED → DISABLED (admin disables)
DISABLED → PUBLISHED (admin re-enables)
```

---

## Achievement Definitions
```typescript
const ACHIEVEMENTS = {
  FIRST_WIN: {
    name: 'First Victory',
    description: 'Complete your first game',
    requirement: 'Complete 1 game'
  },
  SPEED_DEMON: {
    name: 'Speed Demon',
    description: 'Complete a game in under 1 minute',
    requirement: 'Completion time < 60 seconds'
  },
  PERFECT_MEMORY: {
    name: 'Perfect Memory',
    description: 'Complete a game with no mistakes',
    requirement: 'Attempts = Pairs (no wrong matches)'
  },
  THEME_MASTER: {
    name: 'Theme Master',
    description: 'Complete all available themes',
    requirement: 'Complete at least one game in each theme'
  },
  DIFFICULTY_CHAMPION: {
    name: 'Difficulty Champion',
    description: 'Complete a 48-pair game',
    requirement: 'Complete game with difficulty = 48'
  },
  TEN_GAMES: {
    name: '10 Games Milestone',
    description: 'Play 10 games',
    requirement: 'Total games played >= 10'
  },
  FIFTY_GAMES: {
    name: '50 Games Milestone',
    description: 'Play 50 games',
    requirement: 'Total games played >= 50'
  },
  HUNDRED_GAMES: {
    name: '100 Games Milestone',
    description: 'Play 100 games',
    requirement: 'Total games played >= 100'
  }
} as const;
```

---

## Constants

### Application Constants
```typescript
export const APP_CONSTANTS = {
  // Timeouts
  SESSION_TIMEOUT_MINUTES: 30,
  TOKEN_EXPIRY_HOURS: 24,
  REFRESH_TOKEN_EXPIRY_DAYS: 30,
  
  // Limits
  MAX_PROFILE_PICTURE_SIZE_MB: 5,
  MAX_THEME_IMAGE_SIZE_MB: 2,
  MAX_LEADERBOARD_ENTRIES: 100,
  MAX_GAME_HISTORY_ENTRIES: 1000,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Game
  CARD_FLIP_ANIMATION_MS: 300,
  MISMATCH_DISPLAY_MS: 1000,
  
  // Rate Limiting
  API_RATE_LIMIT_PER_SECOND: 100,
  
  // Retry
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000
} as const;
```

### Error Codes
```typescript
export const ERROR_CODES = {
  // Authentication (AUTH_xxx)
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_002',
  AUTH_TOKEN_EXPIRED: 'AUTH_003',
  AUTH_TOKEN_INVALID: 'AUTH_004',
  
  // Authorization (AUTHZ_xxx)
  AUTHZ_INSUFFICIENT_PERMISSIONS: 'AUTHZ_001',
  AUTHZ_TIER_REQUIRED: 'AUTHZ_002',
  
  // Validation (VAL_xxx)
  VAL_INVALID_INPUT: 'VAL_001',
  VAL_MISSING_REQUIRED_FIELD: 'VAL_002',
  VAL_INVALID_FORMAT: 'VAL_003',
  
  // Rate Limiting (RATE_xxx)
  RATE_LIMIT_EXCEEDED: 'RATE_001',
  RATE_DAILY_LIMIT_REACHED: 'RATE_002',
  
  // Payment (PAY_xxx)
  PAY_PAYMENT_FAILED: 'PAY_001',
  PAY_SUBSCRIPTION_INACTIVE: 'PAY_002',
  PAY_INVALID_TIER: 'PAY_003',
  
  // Game (GAME_xxx)
  GAME_INVALID_DIFFICULTY: 'GAME_001',
  GAME_THEME_NOT_AVAILABLE: 'GAME_002',
  GAME_ALREADY_COMPLETED: 'GAME_003',
  
  // Not Found (NF_xxx)
  NF_USER_NOT_FOUND: 'NF_001',
  NF_GAME_NOT_FOUND: 'NF_002',
  NF_THEME_NOT_FOUND: 'NF_003',
  NF_SUBSCRIPTION_NOT_FOUND: 'NF_004',
  
  // Server (SRV_xxx)
  SRV_INTERNAL_ERROR: 'SRV_001',
  SRV_SERVICE_UNAVAILABLE: 'SRV_002'
} as const;
```

---

## Business Rule Summary

**Validation**: Zod schemas for all entities with comprehensive validation rules

**Constraints**: Rate limits, pricing, and tier restrictions clearly defined

**Calculations**: Score and ranking formulas documented

**State Transitions**: Valid state changes for games, subscriptions, and themes

**Achievements**: 8 achievement types with clear requirements

**Constants**: Application-wide constants for timeouts, limits, and error codes

All business rules are type-safe and centralized for consistency across the application.
