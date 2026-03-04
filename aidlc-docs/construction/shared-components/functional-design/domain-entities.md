# Domain Entities - Shared Components

## Overview
This document defines all domain entities, their properties, relationships, and TypeScript type definitions for the memory game application.

---

## Core Entities

### User Entity
```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // Unique, validated email
  name: string;                  // Display name
  profilePictureUrl?: string;    // Optional profile picture
  role: UserRole;                // User, Admin, ContentManager
  tier: SubscriptionTier;        // Free, Light, Standard, Premium
  cognitoId: string;             // AWS Cognito user ID
  createdAt: Date;               // Account creation timestamp
  updatedAt: Date;               // Last update timestamp
  emailVerified: boolean;        // Email verification status
  lastLoginAt?: Date;            // Last login timestamp
}

enum UserRole {
  User = 'USER',
  Admin = 'ADMIN',
  ContentManager = 'CONTENT_MANAGER'
}

enum SubscriptionTier {
  Free = 'FREE',
  Light = 'LIGHT',
  Standard = 'STANDARD',
  Premium = 'PREMIUM'
}
```

### Game Entity
```typescript
interface Game {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  themeId: string;               // Foreign key to Theme
  difficulty: number;            // Number of pairs (12, 18, 24, 30, 36, 42, 48)
  status: GameStatus;            // InProgress, Completed, Abandoned
  startedAt: Date;               // Game start timestamp
  completedAt?: Date;            // Game completion timestamp
  completionTime?: number;       // Time in seconds
  attempts: number;              // Number of card flip attempts
  score?: number;                // Calculated score
  createdAt: Date;
  updatedAt: Date;
}

enum GameStatus {
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
  Abandoned = 'ABANDONED'
}
```

### Leaderboard Entity
```typescript
interface LeaderboardEntry {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  userName: string;              // Denormalized for performance
  themeId: string;               // Foreign key to Theme
  difficulty: number;            // Number of pairs
  timePeriod: TimePeriod;        // Daily, Weekly, Monthly, AllTime
  score: number;                 // Calculated score
  rank: number;                  // Position in leaderboard
  completionTime: number;        // Time in seconds
  attempts: number;              // Number of attempts
  achievedAt: Date;              // When score was achieved
  createdAt: Date;
  updatedAt: Date;
}

enum TimePeriod {
  Daily = 'DAILY',
  Weekly = 'WEEKLY',
  Monthly = 'MONTHLY',
  AllTime = 'ALL_TIME'
}
```

### Subscription Entity
```typescript
interface Subscription {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  tier: SubscriptionTier;        // Light, Standard, Premium
  status: SubscriptionStatus;    // Active, Cancelled, Expired, PastDue
  billingPeriod: BillingPeriod;  // Monthly, Annual
  stripeCustomerId: string;      // Stripe customer ID
  stripeSubscriptionId: string;  // Stripe subscription ID
  currentPeriodStart: Date;      // Current billing period start
  currentPeriodEnd: Date;        // Current billing period end
  cancelAt?: Date;               // Scheduled cancellation date
  cancelledAt?: Date;            // Actual cancellation date
  createdAt: Date;
  updatedAt: Date;
}

enum SubscriptionStatus {
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
  Expired = 'EXPIRED',
  PastDue = 'PAST_DUE'
}

enum BillingPeriod {
  Monthly = 'MONTHLY',
  Annual = 'ANNUAL'
}
```

### Theme Entity
```typescript
interface Theme {
  id: string;                    // UUID
  name: string;                  // Theme display name
  description: string;           // Theme description
  category: ThemeCategory;       // Shapes, Sports, F1
  status: ThemeStatus;           // Draft, Published, Disabled
  imageUrls: string[];           // Array of S3 URLs for card images
  pairs: ThemePair[];            // Array of matching pairs
  difficulty: number;            // Subjective difficulty rating (1-5)
  createdBy: string;             // User ID of creator
  publishedAt?: Date;            // Publication timestamp
  createdAt: Date;
  updatedAt: Date;
}

interface ThemePair {
  card1ImageUrl: string;         // First card image URL
  card2ImageUrl: string;         // Second card image URL
  card1AltText: string;          // Accessibility alt text
  card2AltText: string;          // Accessibility alt text
}

enum ThemeCategory {
  Shapes = 'SHAPES',
  F1Drivers = 'F1_DRIVERS',
  F1Tracks = 'F1_TRACKS',
  Soccer = 'SOCCER',
  Basketball = 'BASKETBALL',
  Baseball = 'BASEBALL'
}

enum ThemeStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  Disabled = 'DISABLED'
}
```

### Achievement Entity
```typescript
interface Achievement {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  achievementType: AchievementType;
  progress: number;              // Current progress (0-100)
  completed: boolean;            // Completion status
  completedAt?: Date;            // Completion timestamp
  createdAt: Date;
  updatedAt: Date;
}

enum AchievementType {
  FirstWin = 'FIRST_WIN',
  SpeedDemon = 'SPEED_DEMON',           // Complete game < 1 minute
  PerfectMemory = 'PERFECT_MEMORY',     // No mistakes
  ThemeMaster = 'THEME_MASTER',         // Complete all themes
  DifficultyChampion = 'DIFFICULTY_CHAMPION', // Complete 48 pairs
  TenGames = 'TEN_GAMES',               // Play 10 games
  FiftyGames = 'FIFTY_GAMES',           // Play 50 games
  HundredGames = 'HUNDRED_GAMES'        // Play 100 games
}
```

---

## Supporting Entities

### RateLimit Entity
```typescript
interface RateLimit {
  userId: string;                // Primary key
  tier: SubscriptionTier;        // Current tier
  count: number;                 // Games played in current period
  resetAt: Date;                 // When counter resets
  updatedAt: Date;
}
```

### Invoice Entity
```typescript
interface Invoice {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  subscriptionId: string;        // Foreign key to Subscription
  stripeInvoiceId: string;       // Stripe invoice ID
  amount: number;                // Amount in cents
  currency: string;              // Currency code (USD)
  status: InvoiceStatus;         // Paid, Pending, Failed
  paidAt?: Date;                 // Payment timestamp
  createdAt: Date;
}

enum InvoiceStatus {
  Paid = 'PAID',
  Pending = 'PENDING',
  Failed = 'FAILED'
}
```

### UserSettings Entity
```typescript
interface UserSettings {
  userId: string;                // Primary key
  soundEffectsEnabled: boolean;  // Sound effects toggle
  musicEnabled: boolean;         // Background music toggle
  soundVolume: number;           // Volume level (0-100)
  musicVolume: number;           // Volume level (0-100)
  notificationsEnabled: boolean; // Notifications toggle
  language: string;              // Language code (en, es, etc.)
  theme: UITheme;                // Light, Dark
  autoProgressDifficulty: boolean; // Auto difficulty progression
  createdAt: Date;
  updatedAt: Date;
}

enum UITheme {
  Light = 'LIGHT',
  Dark = 'DARK'
}
```

---

## GraphQL Type Definitions

```graphql
type User {
  id: ID!
  email: String!
  name: String!
  profilePictureUrl: String
  role: UserRole!
  tier: SubscriptionTier!
  createdAt: DateTime!
  emailVerified: Boolean!
}

type Game {
  id: ID!
  userId: ID!
  user: User!
  themeId: ID!
  theme: Theme!
  difficulty: Int!
  status: GameStatus!
  startedAt: DateTime!
  completedAt: DateTime
  completionTime: Int
  attempts: Int!
  score: Float
}

type LeaderboardEntry {
  id: ID!
  userId: ID!
  userName: String!
  themeId: ID!
  difficulty: Int!
  timePeriod: TimePeriod!
  score: Float!
  rank: Int!
  completionTime: Int!
  attempts: Int!
  achievedAt: DateTime!
}

type Subscription {
  id: ID!
  userId: ID!
  tier: SubscriptionTier!
  status: SubscriptionStatus!
  billingPeriod: BillingPeriod!
  currentPeriodStart: DateTime!
  currentPeriodEnd: DateTime!
  cancelAt: DateTime
}

type Theme {
  id: ID!
  name: String!
  description: String!
  category: ThemeCategory!
  status: ThemeStatus!
  imageUrls: [String!]!
  pairs: [ThemePair!]!
  difficulty: Int!
  publishedAt: DateTime
}

type Achievement {
  id: ID!
  userId: ID!
  achievementType: AchievementType!
  progress: Int!
  completed: Boolean!
  completedAt: DateTime
}

# Enums
enum UserRole { USER ADMIN CONTENT_MANAGER }
enum SubscriptionTier { FREE LIGHT STANDARD PREMIUM }
enum GameStatus { IN_PROGRESS COMPLETED ABANDONED }
enum TimePeriod { DAILY WEEKLY MONTHLY ALL_TIME }
enum SubscriptionStatus { ACTIVE CANCELLED EXPIRED PAST_DUE }
enum BillingPeriod { MONTHLY ANNUAL }
enum ThemeCategory { SHAPES F1_DRIVERS F1_TRACKS SOCCER BASKETBALL BASEBALL }
enum ThemeStatus { DRAFT PUBLISHED DISABLED }
enum AchievementType { 
  FIRST_WIN SPEED_DEMON PERFECT_MEMORY THEME_MASTER 
  DIFFICULTY_CHAMPION TEN_GAMES FIFTY_GAMES HUNDRED_GAMES 
}
enum InvoiceStatus { PAID PENDING FAILED }
enum UITheme { LIGHT DARK }

# Scalar
scalar DateTime
```

---

## Error Types

### Error Classes
```typescript
// Base error class
class AppError extends Error {
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
}

// Domain-specific errors
class AuthenticationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('AUTH_ERROR', message, 401, details);
  }
}

class AuthorizationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('AUTHZ_ERROR', message, 403, details);
  }
}

class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, details?: Record<string, any>) {
    super('NOT_FOUND', `${resource} not found`, 404, details);
  }
}

class RateLimitError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('RATE_LIMIT_ERROR', message, 429, details);
  }
}

class PaymentError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('PAYMENT_ERROR', message, 402, details);
  }
}
```

### Result Types
```typescript
// Success result
interface Success<T> {
  success: true;
  data: T;
}

// Error result
interface Failure {
  success: false;
  error: AppError;
}

// Result type (discriminated union)
type Result<T> = Success<T> | Failure;

// Helper functions
function success<T>(data: T): Success<T> {
  return { success: true, data };
}

function failure(error: AppError): Failure {
  return { success: false, error };
}
```

---

## Utility Types

### Pagination
```typescript
interface PaginationInput {
  page: number;      // Page number (1-indexed)
  limit: number;     // Items per page
  sortBy?: string;   // Sort field
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

### Filters
```typescript
interface GameFilters {
  userId?: string;
  themeId?: string;
  difficulty?: number;
  status?: GameStatus;
  startDate?: Date;
  endDate?: Date;
}

interface LeaderboardFilters {
  themeId?: string;
  difficulty?: number;
  timePeriod: TimePeriod;
}

interface ThemeFilters {
  category?: ThemeCategory;
  status?: ThemeStatus;
}

interface UserFilters {
  role?: UserRole;
  tier?: SubscriptionTier;
  emailVerified?: boolean;
}
```

---

## Entity Summary

**Total Entities**: 10 core entities + 8 supporting types

**Core Entities**: User, Game, LeaderboardEntry, Subscription, Theme, Achievement, RateLimit, Invoice, UserSettings

**Enums**: 11 enum types for type safety

**Error Types**: 6 error classes + Result type pattern

**Utility Types**: Pagination, Filters, GraphQL types

All entities include proper TypeScript types, GraphQL definitions, and error handling patterns.
