import { Achievement } from '@memory-game/shared';
import { AchievementRepository } from '../repositories/achievement.repository';
import { GameRepository } from '../repositories/game.repository';
/**
 * Achievement Tracker Service
 * Tracks and unlocks achievements based on game completion
 */
export declare class AchievementTrackerService {
    private achievementRepository;
    private gameRepository;
    constructor(achievementRepository: AchievementRepository, gameRepository: GameRepository);
    /**
     * Track achievements after game completion
     * Returns newly unlocked achievements
     */
    trackCompletion(userId: string, gameId: string, difficulty: number, completionTime: number, attempts: number, themeId: string): Promise<Achievement[]>;
    /**
     * Check FIRST_WIN achievement
     */
    private checkFirstWin;
    /**
     * Check GAMES_10, GAMES_50, GAMES_100 milestones
     */
    private checkGamesMilestones;
    /**
     * Check SPEED_DEMON achievement (< 30 seconds)
     */
    private checkSpeedDemon;
    /**
     * Check PERFECT_GAME achievement (minimum attempts)
     */
    private checkPerfectGame;
    /**
     * Check DIFFICULTY_MASTER achievement (all 5 difficulties)
     */
    private checkDifficultyMaster;
    /**
     * Check THEME_EXPLORER achievement (10 different themes)
     */
    private checkThemeExplorer;
    /**
     * Check STREAK_7 achievement (7 consecutive days)
     */
    private checkStreak;
    /**
     * Unlock achievement
     */
    private unlockAchievement;
    /**
     * Calculate current streak (consecutive days with games)
     */
    private calculateStreak;
    /**
     * Get minimum attempts for difficulty
     */
    private getMinAttempts;
}
//# sourceMappingURL=achievement-tracker.service.d.ts.map