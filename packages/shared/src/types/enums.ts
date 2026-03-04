/**
 * Enum type definitions for the memory game application
 */

export enum UserRole {
  User = 'USER',
  Admin = 'ADMIN',
  ContentManager = 'CONTENT_MANAGER',
}

export enum SubscriptionTier {
  Free = 'FREE',
  Light = 'LIGHT',
  Standard = 'STANDARD',
  Premium = 'PREMIUM',
}

export enum GameStatus {
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
  Abandoned = 'ABANDONED',
}

export enum TimePeriod {
  Daily = 'DAILY',
  Weekly = 'WEEKLY',
  Monthly = 'MONTHLY',
  AllTime = 'ALL_TIME',
}

export enum SubscriptionStatus {
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
  Expired = 'EXPIRED',
  PastDue = 'PAST_DUE',
}

export enum BillingPeriod {
  Monthly = 'MONTHLY',
  Annual = 'ANNUAL',
}

export enum ThemeCategory {
  Shapes = 'SHAPES',
  F1Drivers = 'F1_DRIVERS',
  F1Tracks = 'F1_TRACKS',
  Soccer = 'SOCCER',
  Basketball = 'BASKETBALL',
  Baseball = 'BASEBALL',
}

export enum ThemeStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  Disabled = 'DISABLED',
}

export enum AchievementType {
  FirstWin = 'FIRST_WIN',
  SpeedDemon = 'SPEED_DEMON',
  PerfectMemory = 'PERFECT_MEMORY',
  ThemeMaster = 'THEME_MASTER',
  DifficultyChampion = 'DIFFICULTY_CHAMPION',
  TenGames = 'TEN_GAMES',
  FiftyGames = 'FIFTY_GAMES',
  HundredGames = 'HUNDRED_GAMES',
}

export enum InvoiceStatus {
  Paid = 'PAID',
  Pending = 'PENDING',
  Failed = 'FAILED',
}

export enum UITheme {
  Light = 'LIGHT',
  Dark = 'DARK',
}
