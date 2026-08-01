export interface ScoreBreakdown {
  baseScore: number;
  difficultyMultiplier: number;
  speedBonus: number;
  accuracyBonus: number;
  finalScore: number;
  difficulty: string;
  completionTime: number;
  accuracy: number;
}

/**
 * Score Calculator Service
 * Implements deterministic score calculation formula
 * Formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
 * (Matches leaderboard service scoring)
 */

export class ScoreCalculatorService {
  private readonly BASE_SCORE = 1000;
  private readonly MAX_TIME = 600; // seconds (10 minutes — generous for longer games like Sudoku)
  private readonly MIN_SPEED_BONUS = 0.1; // floor so completing a game always gives some score

  /**
   * Calculate score for completed game
   * Formula: BaseScore × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
   */
  calculateScore(difficulty: number, completionTime: number, attempts: number, gameThemeId?: string): number {
    return this.calculateScoreBreakdown(difficulty, completionTime, attempts, undefined, gameThemeId).finalScore;
  }

  /**
   * Calculate full score breakdown for completed game
   */
  calculateScoreBreakdown(
    difficulty: number,
    completionTime: number,
    attempts: number,
    accuracyOverride?: number,
    gameThemeId?: string
  ): ScoreBreakdown {
    const pairs = this.getPairsForDifficulty(difficulty);
    const minAttempts = pairs * 2;

    // Premium games get higher base score to reach 8,000 max
    const PREMIUM_GAME_THEMES = ['SCRATCH_CODING', 'SPACE_ENTRY', 'BOND_AND_BURN', 'TRAFFIC_LAB', 'MINI_GOLF'];
    const isPremium = gameThemeId ? PREMIUM_GAME_THEMES.includes(gameThemeId) : false;
    let baseScore: number;
    if (gameThemeId === 'MINI_GOLF') {
      baseScore = 1800; // Produces Easy ~4000, Medium ~6000, Hard ~8000 for perfect games
    } else if (isPremium) {
      baseScore = 1700;
    } else if (difficulty >= 4) {
      baseScore = 1100; // Super Hard Memory Match: 1100 × 2.5 × 2.0 × 1.5 = 8,250 → capped to 8,000
    } else {
      baseScore = this.BASE_SCORE;
    }
    const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);
    
    // Time targets vary by game type
    // Bond & Burn: very tight targets since it's a fast-paced picking game
    // Other premium: moderate targets
    // Standard: generous 600s window
    let maxTime: number;
    let speedBonusCap = 2.0; // default cap
    if (gameThemeId === 'BOND_AND_BURN') {
      maxTime = difficulty >= 3 ? 30 : difficulty >= 2 ? 45 : 60;
      speedBonusCap = 1.3; // cap speed bonus for this fast game
    } else if (gameThemeId === 'TRAFFIC_LAB') {
      maxTime = difficulty >= 3 ? 120 : difficulty >= 2 ? 90 : 60;
      speedBonusCap = 1.3;
    } else if (gameThemeId === 'MINI_GOLF') {
      // Tight time targets: speed bonus varies significantly within realistic play range
      // Easy: 3 holes, expect 30-90s; Medium: 4 holes, expect 40-120s; Hard: 3 holes, expect 40-150s
      maxTime = difficulty >= 3 ? 60 : difficulty >= 2 ? 50 : 40;
      speedBonusCap = 1.5; // still capped but now much harder to max out
    } else if (isPremium) {
      maxTime = difficulty >= 3 ? 90 : difficulty >= 2 ? 120 : 180;
    } else {
      maxTime = this.MAX_TIME;
    }
    const speedBonus = Math.min(speedBonusCap, Math.max(this.MIN_SPEED_BONUS, 1 + (maxTime - completionTime) / maxTime));

    let accuracyRatio: number;
    if (accuracyOverride !== undefined) {
      accuracyRatio = accuracyOverride;
    } else {
      accuracyRatio = Math.max(0, 1 - (attempts - minAttempts) / minAttempts);
    }
    const accuracyBonus = 0.5 + accuracyRatio * 1.0;

    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) {
      finalScore = 0;
    }
    finalScore = Math.max(0, Math.round(finalScore));

    const diffLabel = difficulty <= 1 ? 'Easy' : difficulty <= 2 ? 'Medium' : 'Hard';

    return {
      baseScore,
      difficultyMultiplier,
      speedBonus,
      accuracyBonus,
      finalScore,
      difficulty: diffLabel,
      completionTime,
      accuracy: accuracyRatio,
    };
  }

  /**
   * Get difficulty multiplier
   * Maps: 1 = EASY (1.0x), 2 = MEDIUM (1.5x), 3 = HARD (2.0x), 4 = SUPER_HARD (2.5x)
   */
  private getDifficultyMultiplier(difficulty: number): number {
    if (difficulty <= 1) {
      return 1.0; // EASY
    } else if (difficulty <= 2) {
      return 1.5; // MEDIUM
    } else if (difficulty <= 3) {
      return 2.0; // HARD
    } else {
      return 2.5; // SUPER_HARD
    }
  }

  /**
   * Get number of pairs for difficulty level
   * Memory Match sends: EASY=1 (6 pairs), MEDIUM=2 (8 pairs), HARD=3 (10 pairs), SUPER_HARD=4 (15 pairs)
   */
  private getPairsForDifficulty(difficulty: number): number {
    switch (difficulty) {
      case 1:
        return 6;
      case 2:
        return 8;
      case 3:
        return 10;
      case 4:
        return 15;
      default:
        return 8;
    }
  }
}
