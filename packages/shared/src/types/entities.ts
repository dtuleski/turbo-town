/**
 * Domain entity type definitions for the memory game application
 */

import {
  UserRole,
  SubscriptionTier,
  GameStatus,
  TimePeriod,
  SubscriptionStatus,
  BillingPeriod,
  ThemeCategory,
  ThemeStatus,
  AchievementType,
  InvoiceStatus,
  UITheme,
} from './enums';

export interface User {
  id: string;
  email: string;
  name: string;
  profilePictureUrl?: string;
  role: UserRole;
  tier: SubscriptionTier;
  cognitoId: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  lastLoginAt?: Date;
}

export interface Game {
  id: string;
  userId: string;
  themeId: string;
  difficulty: number;
  status: GameStatus;
  startedAt: Date;
  completedAt?: Date;
  completionTime?: number;
  attempts: number;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string;
  themeId: string;
  difficulty: number;
  timePeriod: TimePeriod;
  score: number;
  rank: number;
  completionTime: number;
  attempts: number;
  achievedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThemePair {
  card1ImageUrl: string;
  card2ImageUrl: string;
  card1AltText: string;
  card2AltText: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  category: ThemeCategory;
  status: ThemeStatus;
  imageUrls: string[];
  pairs: ThemePair[];
  difficulty: number;
  createdBy: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Achievement {
  id: string;
  userId: string;
  achievementType: AchievementType;
  progress: number;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimit {
  userId: string;
  tier: SubscriptionTier;
  count: number;
  resetAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  paidAt?: Date;
  createdAt: Date;
}

export interface UserSettings {
  userId: string;
  soundEffectsEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  notificationsEnabled: boolean;
  language: string;
  theme: UITheme;
  autoProgressDifficulty: boolean;
  createdAt: Date;
  updatedAt: Date;
}
