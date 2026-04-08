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
   * Formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
   */
  calculateScore(difficulty: number, completionTime: number, attempts: number): number {
    return this.calculateScoreBreakdown(difficulty, completionTime, attempts).finalScore;
  }

  /**
   * Calculate full score breakdown for completed game
   */
  calculateScoreBreakdown(
    difficulty: number,
    completionTime: number,
    attempts: number,
    accuracyOverride?: number
  ): ScoreBreakdown {
    const pairs = this.getPairsForDifficulty(difficulty);
    const minAttempts = pairs * 2;

    const baseScore = this.BASE_SCORE;
    const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);
    const speedBonus = Math.max(this.MIN_SPEED_BONUS, 1 + (this.MAX_TIME - completionTime) / this.MAX_TIME);

    let accuracyRatio: number;
    if (accuracyOverride !== undefined) {
      accuracyRatio = accuracyOverride;
    } else {
      accuracyRatio = Math.max(0, 1 - (attempts - minAttempts) / minAttempts);
    }
    const accuracyBonus = 1 + accuracyRatio * 0.5;

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
   * Maps: 1 = EASY (1.0x), 2 = MEDIUM (1.5x), 3+ = HARD (2.0x)
   */
  private getDifficultyMultiplier(difficulty: number): number {
    if (difficulty <= 1) {
      return 1.0; // EASY
    } else if (difficulty <= 2) {
      return 1.5; // MEDIUM
    } else {
      return 2.0; // HARD
    }
  }

  /**
   * Get number of pairs for difficulty level
   * Memory Match sends: EASY=1 (6 pairs), MEDIUM=2 (8 pairs), HARD=3 (10 pairs)
   */
  private getPairsForDifficulty(difficulty: number): number {
    switch (difficulty) {
      case 1:
        return 6;
      case 2:
        return 8;
      case 3:
        return 10;
      default:
        return 8;
    }
  }
}
