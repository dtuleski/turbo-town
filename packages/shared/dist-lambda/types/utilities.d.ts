/**
 * Utility type definitions for the memory game application
 */
import { GameStatus, TimePeriod, ThemeCategory, ThemeStatus, UserRole, SubscriptionTier } from './enums';
export interface PaginationInput {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}
export interface GameFilters {
    userId?: string;
    themeId?: string;
    difficulty?: number;
    status?: GameStatus;
    startDate?: Date;
    endDate?: Date;
}
export interface LeaderboardFilters {
    themeId?: string;
    difficulty?: number;
    timePeriod: TimePeriod;
}
export interface ThemeFilters {
    category?: ThemeCategory;
    status?: ThemeStatus;
}
export interface UserFilters {
    role?: UserRole;
    tier?: SubscriptionTier;
    emailVerified?: boolean;
}
//# sourceMappingURL=utilities.d.ts.map