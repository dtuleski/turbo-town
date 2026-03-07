import { Game, Achievement, GameStatus, AchievementType, SubscriptionTier } from '@memory-game/shared';

/**
 * GraphQL Input Types
 */

export interface StartGameInput {
  themeId: string;
  difficulty: number; // 1-5
}

export interface CompleteGameInput {
  gameId: string;
  completionTime: number; // seconds
  attempts: number;
}

export interface GameHistoryInput {
  page?: number;
  pageSize?: number;
  sortBy?: 'date' | 'score' | 'time';
  sortOrder?: 'asc' | 'desc';
  themeId?: string;
  difficulty?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Response Types
 */

export interface StartGameResponse {
  game: Game;
  canPlay: boolean;
  rateLimit: RateLimitInfo;
}

export interface CompleteGameResponse {
  game: Game;
  achievements: Achievement[];
}

export interface GameHistoryResponse {
  games: Game[];
  pagination: PaginationInfo;
}

export interface RateLimitInfo {
  tier: SubscriptionTier;
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date;
}

export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CanStartGameResponse {
  canPlay: boolean;
  rateLimit: RateLimitInfo;
  message?: string;
}

/**
 * Repository Interfaces
 */

export interface GameRepository {
  create(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game>;
  getById(gameId: string): Promise<Game | null>;
  update(gameId: string, updates: Partial<Game>): Promise<Game>;
  queryByUser(userId: string, options: QueryOptions): Promise<Game[]>;
  queryByStatus(status: GameStatus, options: QueryOptions): Promise<Game[]>;
  delete(gameId: string, userId: string): Promise<void>;
}

export interface RateLimitRepository {
  get(userId: string): Promise<RateLimit | null>;
  upsert(rateLimit: RateLimit): Promise<RateLimit>;
  increment(userId: string): Promise<RateLimit>;
  reset(userId: string, tier: SubscriptionTier): Promise<RateLimit>;
}

export interface AchievementRepository {
  create(achievement: Omit<Achievement, 'createdAt' | 'updatedAt'>): Promise<Achievement>;
  getByUser(userId: string): Promise<Achievement[]>;
  getByUserAndType(userId: string, type: AchievementType): Promise<Achievement | null>;
  update(userId: string, type: AchievementType, updates: Partial<Achievement>): Promise<Achievement>;
  unlock(userId: string, type: AchievementType): Promise<Achievement>;
}

export interface ThemeRepository {
  getById(themeId: string): Promise<Theme | null>;
  validateTheme(themeId: string): Promise<boolean>;
}

export interface SubscriptionRepository {
  getByUserId(userId: string): Promise<Subscription | null>;
  getTier(userId: string): Promise<SubscriptionTier>;
}

/**
 * Domain Types
 */

export interface RateLimit {
  userId: string;
  tier: SubscriptionTier;
  count: number;
  resetAt: Date;
  expiresAt: number; // TTL timestamp
  updatedAt: Date;
}

export interface Theme {
  id: string;
  name: string;
  category: string;
  pairs: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  userId: string;
  tier: SubscriptionTier;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueryOptions {
  limit?: number;
  lastEvaluatedKey?: Record<string, any>;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * Event Types
 */

export interface GameCompletedEvent {
  gameId: string;
  userId: string;
  userName: string;
  themeId: string;
  difficulty: number;
  score: number;
  completionTime: number;
  attempts: number;
  completedAt: Date;
}

/**
 * GraphQL Request Context
 */

export interface GraphQLContext {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
  userId: string;
}

/**
 * GraphQL Response
 */

export interface GraphQLResponse {
  data?: any;
  errors?: Array<{
    message: string;
    extensions?: Record<string, any>;
  }>;
}
