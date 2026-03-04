# Business Logic Model - Shared Components

## Overview
This document defines utility functions, helpers, and business logic operations used across the application.

---

## Validation Utilities (Zod-based)

### Entity Validators
```typescript
import { z } from 'zod';

// Export all Zod schemas for runtime validation
export const validators = {
  user: userSchema,
  game: gameSchema,
  theme: themeSchema,
  subscription: subscriptionSchema,
  leaderboard: leaderboardSchema,
  achievement: achievementSchema
};

// Validation helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): Result<T> {
  try {
    const validated = schema.parse(data);
    return success(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(new ValidationError('Validation failed', {
        errors: error.errors
      }));
    }
    return failure(new AppError('VALIDATION_ERROR', 'Unknown validation error'));
  }
}
```

---

## Date/Time Utilities (date-fns)

### Date Formatting
```typescript
import { format, formatDistance, formatRelative } from 'date-fns';

export const dateUtils = {
  // Format date for display
  formatDate: (date: Date): string => format(date, 'MMM d, yyyy'),
  
  // Format date and time
  formatDateTime: (date: Date): string => format(date, 'MMM d, yyyy h:mm a'),
  
  // Format time only
  formatTime: (date: Date): string => format(date, 'h:mm a'),
  
  // Relative time (e.g., "2 hours ago")
  formatRelative: (date: Date): string => formatDistance(date, new Date(), { addSuffix: true }),
  
  // ISO string for API
  toISO: (date: Date): string => date.toISOString(),
  
  // Parse ISO string
  fromISO: (iso: string): Date => new Date(iso)
};
```

### Date Calculations
```typescript
import { addDays, addHours, addMonths, differenceInSeconds, startOfDay, endOfDay } from 'date-fns';

export const dateCalculations = {
  // Add time periods
  addDays: (date: Date, days: number): Date => addDays(date, days),
  addHours: (date: Date, hours: number): Date => addHours(date, hours),
  addMonths: (date: Date, months: number): Date => addMonths(date, months),
  
  // Calculate differences
  secondsBetween: (start: Date, end: Date): number => differenceInSeconds(end, start),
  
  // Day boundaries
  startOfDay: (date: Date): Date => startOfDay(date),
  endOfDay: (date: Date): Date => endOfDay(date),
  
  // Check if date is in past
  isPast: (date: Date): boolean => date < new Date(),
  
  // Check if date is in future
  isFuture: (date: Date): boolean => date > new Date()
};
```

---

## Formatting Utilities

### Currency Formatting
```typescript
export const currencyUtils = {
  // Format cents to currency string
  formatCents: (cents: number, currency: string = 'USD'): string => {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(dollars);
  },
  
  // Parse currency string to cents
  parseCurrency: (currencyString: string): number => {
    const cleaned = currencyString.replace(/[^0-9.]/g, '');
    return Math.round(parseFloat(cleaned) * 100);
  }
};
```

### Number Formatting
```typescript
export const numberUtils = {
  // Format number with commas
  formatNumber: (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  },
  
  // Format percentage
  formatPercentage: (value: number, total: number): string => {
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(1)}%`;
  },
  
  // Format decimal
  formatDecimal: (num: number, decimals: number = 2): string => {
    return num.toFixed(decimals);
  }
};
```

---

## Calculation Utilities

### Score Calculation
```typescript
export const scoreUtils = {
  // Calculate game score
  calculateGameScore: (
    difficulty: number,
    completionTime: number,
    attempts: number
  ): number => {
    const difficultyMultiplier = difficulty / 12;
    const attemptPenalty = attempts / difficulty;
    const score = (difficultyMultiplier * 10000) / (completionTime * attemptPenalty);
    return Math.max(1, Math.round(score * 100) / 100);
  },
  
  // Calculate leaderboard rank
  calculateRank: (score: number, existingScores: number[]): number => {
    const sortedScores = [...existingScores, score].sort((a, b) => b - a);
    return sortedScores.indexOf(score) + 1;
  },
  
  // Check if score qualifies for leaderboard
  qualifiesForLeaderboard: (score: number, minScore: number): boolean => {
    return score >= minScore;
  }
};
```

### Statistics Calculation
```typescript
export const statsUtils = {
  // Calculate average
  average: (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  },
  
  // Calculate median
  median: (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  },
  
  // Calculate percentile
  percentile: (numbers: number[], p: number): number => {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
};
```

---

## String Utilities

### Sanitization
```typescript
export const stringUtils = {
  // Sanitize HTML (remove script tags, etc.)
  sanitizeHTML: (html: string): string => {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '');
  },
  
  // Slugify string (for URLs)
  slugify: (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
  
  // Truncate string
  truncate: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  },
  
  // Capitalize first letter
  capitalize: (text: string): string => {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
};
```

---

## Rate Limiting Utilities

### Rate Limit Checks
```typescript
export const rateLimitUtils = {
  // Check if user can start game
  canStartGame: (
    currentCount: number,
    tier: SubscriptionTier,
    resetAt: Date
  ): Result<boolean> => {
    const limit = RATE_LIMITS[tier];
    
    // Check if reset time has passed
    if (new Date() >= resetAt) {
      return success(true);
    }
    
    // Check if under limit
    if (currentCount < limit.gamesPerPeriod) {
      return success(true);
    }
    
    return failure(new RateLimitError(
      `Daily limit of ${limit.gamesPerPeriod} games reached`,
      { resetAt, currentCount, limit: limit.gamesPerPeriod }
    ));
  },
  
  // Get games remaining
  getGamesRemaining: (
    currentCount: number,
    tier: SubscriptionTier
  ): number => {
    const limit = RATE_LIMITS[tier];
    return Math.max(0, limit.gamesPerPeriod - currentCount);
  },
  
  // Calculate reset time
  calculateResetTime: (tier: SubscriptionTier): Date => {
    const limit = RATE_LIMITS[tier];
    return dateCalculations.addHours(new Date(), limit.periodHours);
  }
};
```

---

## Achievement Utilities

### Achievement Progress
```typescript
export const achievementUtils = {
  // Check if achievement is completed
  checkAchievement: (
    type: AchievementType,
    userStats: {
      gamesPlayed: number;
      fastestTime: number;
      perfectGames: number;
      themesCompleted: number;
      maxDifficulty: number;
    }
  ): boolean => {
    switch (type) {
      case AchievementType.FirstWin:
        return userStats.gamesPlayed >= 1;
      case AchievementType.SpeedDemon:
        return userStats.fastestTime < 60;
      case AchievementType.PerfectMemory:
        return userStats.perfectGames >= 1;
      case AchievementType.ThemeMaster:
        return userStats.themesCompleted >= 6; // All themes
      case AchievementType.DifficultyChampion:
        return userStats.maxDifficulty >= 48;
      case AchievementType.TenGames:
        return userStats.gamesPlayed >= 10;
      case AchievementType.FiftyGames:
        return userStats.gamesPlayed >= 50;
      case AchievementType.HundredGames:
        return userStats.gamesPlayed >= 100;
      default:
        return false;
    }
  },
  
  // Calculate achievement progress
  calculateProgress: (
    type: AchievementType,
    userStats: {
      gamesPlayed: number;
      fastestTime: number;
      perfectGames: number;
      themesCompleted: number;
      maxDifficulty: number;
    }
  ): number => {
    switch (type) {
      case AchievementType.TenGames:
        return Math.min(100, (userStats.gamesPlayed / 10) * 100);
      case AchievementType.FiftyGames:
        return Math.min(100, (userStats.gamesPlayed / 50) * 100);
      case AchievementType.HundredGames:
        return Math.min(100, (userStats.gamesPlayed / 100) * 100);
      case AchievementType.ThemeMaster:
        return Math.min(100, (userStats.themesCompleted / 6) * 100);
      default:
        return achievementUtils.checkAchievement(type, userStats) ? 100 : 0;
    }
  }
};
```

---

## Pagination Utilities

### Pagination Helpers
```typescript
export const paginationUtils = {
  // Calculate pagination metadata
  calculatePagination: (
    total: number,
    page: number,
    limit: number
  ): {
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } => {
    const totalPages = Math.ceil(total / limit);
    return {
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  },
  
  // Calculate offset for database queries
  calculateOffset: (page: number, limit: number): number => {
    return (page - 1) * limit;
  },
  
  // Validate pagination input
  validatePagination: (page: number, limit: number): Result<void> => {
    if (page < 1) {
      return failure(new ValidationError('Page must be >= 1'));
    }
    if (limit < 1 || limit > APP_CONSTANTS.MAX_PAGE_SIZE) {
      return failure(new ValidationError(
        `Limit must be between 1 and ${APP_CONSTANTS.MAX_PAGE_SIZE}`
      ));
    }
    return success(undefined);
  }
};
```

---

## Utility Summary

**Validation**: Zod-based validation with Result type pattern

**Date/Time**: date-fns utilities for formatting and calculations

**Formatting**: Currency, number, and string formatting

**Calculations**: Score, statistics, and ranking calculations

**String**: Sanitization, slugification, truncation

**Rate Limiting**: Game limit checks and reset calculations

**Achievements**: Progress tracking and completion checks

**Pagination**: Metadata calculation and validation

All utilities are pure functions with comprehensive type safety and error handling.
