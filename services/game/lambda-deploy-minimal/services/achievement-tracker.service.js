"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AchievementTrackerService = void 0;
const shared_1 = require("@memory-game/shared");
const logger_1 = require("../utils/logger");
const metrics_1 = require("../utils/metrics");
/**
 * Achievement Tracker Service
 * Tracks and unlocks achievements based on game completion
 */
class AchievementTrackerService {
    constructor(achievementRepository, gameRepository) {
        this.achievementRepository = achievementRepository;
        this.gameRepository = gameRepository;
    }
    /**
     * Track achievements after game completion
     * Returns newly unlocked achievements
     */
    async trackCompletion(userId, gameId, difficulty, completionTime, attempts, themeId) {
        const unlockedAchievements = [];
        try {
            // Get all user achievements
            const achievements = await this.achievementRepository.getByUser(userId);
            const achievementMap = new Map(achievements.map((a) => [a.achievementType, a]));
            // Get user's game history for streak and count calculations
            const games = await this.gameRepository.queryByUser(userId, { limit: 1000 });
            const completedGames = games.filter((g) => g.status === 'COMPLETED');
            // Check each achievement type
            const checks = [
                () => this.checkFirstWin(achievementMap, completedGames.length),
                () => this.checkGamesMilestones(achievementMap, completedGames.length),
                () => this.checkSpeedDemon(achievementMap, completionTime),
                () => this.checkPerfectGame(achievementMap, difficulty, attempts),
                () => this.checkDifficultyMaster(achievementMap, completedGames),
                () => this.checkThemeExplorer(achievementMap, completedGames, themeId),
                () => this.checkStreak(achievementMap, completedGames),
            ];
            for (const check of checks) {
                const result = await check();
                if (result) {
                    unlockedAchievements.push(result);
                }
            }
            logger_1.logger.info('Achievement tracking complete', {
                userId,
                gameId,
                unlockedCount: unlockedAchievements.length,
                unlockedTypes: unlockedAchievements.map((a) => a.achievementType),
            });
            return unlockedAchievements;
        }
        catch (error) {
            logger_1.logger.error('Achievement tracking failed', error, { userId, gameId });
            // Don't throw - achievements are non-critical
            return [];
        }
    }
    /**
     * Check FIRST_WIN achievement
     */
    async checkFirstWin(achievementMap, completedCount) {
        if (completedCount !== 1)
            return null;
        const existing = achievementMap.get(shared_1.AchievementType.FirstWin);
        if (existing?.completed)
            return null;
        return this.unlockAchievement(existing?.userId || '', shared_1.AchievementType.FirstWin, 1, 1, existing);
    }
    /**
     * Check GAMES_10, GAMES_50, GAMES_100 milestones
     */
    async checkGamesMilestones(achievementMap, completedCount) {
        const milestones = [
            { type: shared_1.AchievementType.TenGames, target: 10 },
            { type: shared_1.AchievementType.FiftyGames, target: 50 },
            { type: shared_1.AchievementType.HundredGames, target: 100 },
        ];
        for (const { type, target } of milestones) {
            const existing = achievementMap.get(type);
            if (existing?.completed)
                continue;
            if (completedCount >= target) {
                return this.unlockAchievement(existing?.userId || '', type, completedCount, target, existing);
            }
            else if (existing) {
                // Update progress
                await this.achievementRepository.update(existing.userId, type, {
                    progress: completedCount,
                });
            }
        }
        return null;
    }
    /**
     * Check SPEED_DEMON achievement (< 30 seconds)
     */
    async checkSpeedDemon(achievementMap, completionTime) {
        if (completionTime >= 30)
            return null;
        const existing = achievementMap.get(shared_1.AchievementType.SpeedDemon);
        if (existing?.completed)
            return null;
        return this.unlockAchievement(existing?.userId || '', shared_1.AchievementType.SpeedDemon, 1, 1, existing);
    }
    /**
     * Check PERFECT_GAME achievement (minimum attempts)
     */
    async checkPerfectGame(achievementMap, difficulty, attempts) {
        const minAttempts = this.getMinAttempts(difficulty);
        if (attempts !== minAttempts)
            return null;
        const existing = achievementMap.get(shared_1.AchievementType.PerfectMemory);
        if (existing?.completed)
            return null;
        return this.unlockAchievement(existing?.userId || '', shared_1.AchievementType.PerfectMemory, 1, 1, existing);
    }
    /**
     * Check DIFFICULTY_MASTER achievement (all 5 difficulties)
     */
    async checkDifficultyMaster(achievementMap, completedGames) {
        const existing = achievementMap.get(shared_1.AchievementType.DifficultyChampion);
        if (existing?.completed)
            return null;
        const difficulties = new Set(completedGames.map((g) => g.difficulty));
        const progress = difficulties.size;
        if (progress >= 5) {
            return this.unlockAchievement(existing?.userId || '', shared_1.AchievementType.DifficultyChampion, 5, 5, existing);
        }
        else if (existing) {
            await this.achievementRepository.update(existing.userId, shared_1.AchievementType.DifficultyChampion, {
                progress,
            });
        }
        return null;
    }
    /**
     * Check THEME_EXPLORER achievement (10 different themes)
     */
    async checkThemeExplorer(achievementMap, completedGames, currentThemeId) {
        const existing = achievementMap.get(shared_1.AchievementType.ThemeMaster);
        if (existing?.completed)
            return null;
        const themes = new Set(completedGames.map((g) => g.themeId));
        themes.add(currentThemeId);
        const progress = themes.size;
        if (progress >= 10) {
            return this.unlockAchievement(existing?.userId || '', shared_1.AchievementType.ThemeMaster, 10, 10, existing);
        }
        else if (existing) {
            await this.achievementRepository.update(existing.userId, shared_1.AchievementType.ThemeMaster, {
                progress,
            });
        }
        return null;
    }
    /**
     * Check STREAK_7 achievement (7 consecutive days)
     */
    async checkStreak(achievementMap, completedGames) {
        // TODO: Add STREAK_7 to AchievementType enum
        // const existing = achievementMap.get(AchievementType.STREAK_7);
        // if (existing?.completed) return null;
        // const streak = this.calculateStreak(completedGames);
        // if (streak >= 7) {
        //   return this.unlockAchievement(existing?.userId || '', AchievementType.STREAK_7, 7, 7, existing);
        // } else if (existing) {
        //   await this.achievementRepository.update(existing.userId, AchievementType.STREAK_7, {
        //     progress: streak,
        //   });
        // }
        return null;
    }
    /**
     * Unlock achievement
     */
    async unlockAchievement(userId, type, progress, target, existing) {
        let achievement;
        if (existing) {
            achievement = await this.achievementRepository.unlock(userId, type);
        }
        else {
            achievement = await this.achievementRepository.create({
                id: `${userId}#${type}`,
                userId,
                achievementType: type,
                completed: true,
                progress: target,
                completedAt: new Date(),
            });
        }
        // Publish metric
        await metrics_1.metricsPublisher.publishAchievementUnlocked(type);
        logger_1.logger.info('Achievement unlocked', { userId, type, progress, target });
        return achievement;
    }
    /**
     * Calculate current streak (consecutive days with games)
     */
    calculateStreak(completedGames) {
        if (completedGames.length === 0)
            return 0;
        // Sort by completion date descending
        const sorted = completedGames
            .map((g) => new Date(g.completedAt))
            .sort((a, b) => b.getTime() - a.getTime());
        let streak = 1;
        let currentDate = new Date(sorted[0]);
        currentDate.setUTCHours(0, 0, 0, 0);
        for (let i = 1; i < sorted.length; i++) {
            const gameDate = new Date(sorted[i]);
            gameDate.setUTCHours(0, 0, 0, 0);
            const daysDiff = Math.floor((currentDate.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff === 1) {
                streak++;
                currentDate = gameDate;
            }
            else if (daysDiff > 1) {
                break;
            }
        }
        return streak;
    }
    /**
     * Get minimum attempts for difficulty
     */
    getMinAttempts(difficulty) {
        switch (difficulty) {
            case 1:
                return 6;
            case 2:
                return 12;
            case 3:
                return 18;
            case 4:
                return 24;
            case 5:
                return 30;
            default:
                return 12;
        }
    }
}
exports.AchievementTrackerService = AchievementTrackerService;
//# sourceMappingURL=achievement-tracker.service.js.map