import { Achievement, AchievementType } from '@memory-game/shared';
import { AchievementRepository as IAchievementRepository } from '../types';
export declare class AchievementRepository implements IAchievementRepository {
    /**
     * Create achievement record
     */
    create(achievement: Omit<Achievement, 'createdAt' | 'updatedAt'>): Promise<Achievement>;
    /**
     * Get all achievements for user
     */
    getByUser(userId: string): Promise<Achievement[]>;
    /**
     * Get specific achievement for user
     */
    getByUserAndType(userId: string, type: AchievementType): Promise<Achievement | null>;
    /**
     * Update achievement progress
     */
    update(userId: string, type: AchievementType, updates: Partial<Achievement>): Promise<Achievement>;
    /**
     * Mark achievement as unlocked
     */
    unlock(userId: string, type: AchievementType): Promise<Achievement>;
}
//# sourceMappingURL=achievement.repository.d.ts.map