import { Achievement, AchievementType } from '@memory-game/shared';
import { AchievementRepository } from '../repositories/achievement.repository';
import { GameRepository } from '../repositories/game.repository';
import { logger } from '../utils/logger';
import { metricsPublisher } from '../utils/metrics';

/**
 * Achievement Tracker Service
 * Tracks and unlocks achievements based on game completion
 */

export class AchievementTrackerService {
  constructor(
    private achievementRepository: AchievementRepository,
    private gameRepository: GameRepository
  ) {}

  /**
   * Track achievements after game completion
   * Returns newly unlocked achievements
   */
  async trackCompletion(
    userId: string,
    gameId: string,
    difficulty: number,
    completionTime: number,
    attempts: number,
    themeId: string
  ): Promise<Achievement[]> {
    const unlockedAchievements: Achievement[] = [];

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

      logger.info('Achievement tracking complete', {
        userId,
        gameId,
        unlockedCount: unlockedAchievements.length,
        unlockedTypes: unlockedAchievements.map((a) => a.achievementType),
      });

      return unlockedAchievements;
    } catch (error) {
      logger.error('Achievement tracking failed', error as Error, { userId, gameId });
      // Don't throw - achievements are non-critical
      return [];
    }
  }

  /**
   * Check FIRST_WIN achievement
   */
  private async checkFirstWin(
    achievementMap: Map<AchievementType, Achievement>,
    completedCount: number
  ): Promise<Achievement | null> {
    if (completedCount !== 1) return null;

    const existing = achievementMap.get(AchievementType.FirstWin);
    if (existing?.completed) return null;

    return this.unlockAchievement(
      existing?.userId || '',
      AchievementType.FirstWin,
      1,
      1,
      existing
    );
  }

  /**
   * Check GAMES_10, GAMES_50, GAMES_100 milestones
   */
  private async checkGamesMilestones(
    achievementMap: Map<AchievementType, Achievement>,
    completedCount: number
  ): Promise<Achievement | null> {
    const milestones = [
      { type: AchievementType.TenGames, target: 10 },
      { type: AchievementType.FiftyGames, target: 50 },
      { type: AchievementType.HundredGames, target: 100 },
    ];

    for (const { type, target } of milestones) {
      const existing = achievementMap.get(type);
      if (existing?.completed) continue;

      if (completedCount >= target) {
        return this.unlockAchievement(
          existing?.userId || '',
          type,
          completedCount,
          target,
          existing
        );
      } else if (existing) {
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
  private async checkSpeedDemon(
    achievementMap: Map<AchievementType, Achievement>,
    completionTime: number
  ): Promise<Achievement | null> {
    if (completionTime >= 30) return null;

    const existing = achievementMap.get(AchievementType.SpeedDemon);
    if (existing?.completed) return null;

    return this.unlockAchievement(
      existing?.userId || '',
      AchievementType.SpeedDemon,
      1,
      1,
      existing
    );
  }

  /**
   * Check PERFECT_GAME achievement (minimum attempts)
   */
  private async checkPerfectGame(
    achievementMap: Map<AchievementType, Achievement>,
    difficulty: number,
    attempts: number
  ): Promise<Achievement | null> {
    const minAttempts = this.getMinAttempts(difficulty);
    if (attempts !== minAttempts) return null;

    const existing = achievementMap.get(AchievementType.PerfectMemory);
    if (existing?.completed) return null;

    return this.unlockAchievement(
      existing?.userId || '',
      AchievementType.PerfectMemory,
      1,
      1,
      existing
    );
  }

  /**
   * Check DIFFICULTY_MASTER achievement (all 5 difficulties)
   */
  private async checkDifficultyMaster(
    achievementMap: Map<AchievementType, Achievement>,
    completedGames: any[]
  ): Promise<Achievement | null> {
    const existing = achievementMap.get(AchievementType.DifficultyChampion);
    if (existing?.completed) return null;

    const difficulties = new Set(completedGames.map((g) => g.difficulty));
    const progress = difficulties.size;

    if (progress >= 5) {
      return this.unlockAchievement(
        existing?.userId || '',
        AchievementType.DifficultyChampion,
        5,
        5,
        existing
      );
    } else if (existing) {
      await this.achievementRepository.update(existing.userId, AchievementType.DifficultyChampion, {
        progress,
      });
    }

    return null;
  }

  /**
   * Check THEME_EXPLORER achievement (10 different themes)
   */
  private async checkThemeExplorer(
    achievementMap: Map<AchievementType, Achievement>,
    completedGames: any[],
    currentThemeId: string
  ): Promise<Achievement | null> {
    const existing = achievementMap.get(AchievementType.ThemeMaster);
    if (existing?.completed) return null;

    const themes = new Set(completedGames.map((g) => g.themeId));
    themes.add(currentThemeId);
    const progress = themes.size;

    if (progress >= 10) {
      return this.unlockAchievement(
        existing?.userId || '',
        AchievementType.ThemeMaster,
        10,
        10,
        existing
      );
    } else if (existing) {
      await this.achievementRepository.update(existing.userId, AchievementType.ThemeMaster, {
        progress,
      });
    }

    return null;
  }

  /**
   * Check STREAK_7 achievement (7 consecutive days)
   */
  private async checkStreak(
    achievementMap: Map<AchievementType, Achievement>,
    completedGames: any[]
  ): Promise<Achievement | null> {
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
  private async unlockAchievement(
    userId: string,
    type: AchievementType,
    progress: number,
    target: number,
    existing?: Achievement
  ): Promise<Achievement> {
    let achievement: Achievement;

    if (existing) {
      achievement = await this.achievementRepository.unlock(userId, type);
    } else {
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
    await metricsPublisher.publishAchievementUnlocked(type);

    logger.info('Achievement unlocked', { userId, type, progress, target });

    return achievement;
  }

  /**
   * Calculate current streak (consecutive days with games)
   */
  private calculateStreak(completedGames: any[]): number {
    if (completedGames.length === 0) return 0;

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

      const daysDiff = Math.floor(
        (currentDate.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        streak++;
        currentDate = gameDate;
      } else if (daysDiff > 1) {
        break;
      }
    }

    return streak;
  }

  /**
   * Get minimum attempts for difficulty
   */
  private getMinAttempts(difficulty: number): number {
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
