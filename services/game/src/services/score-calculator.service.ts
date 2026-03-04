/**
 * Score Calculator Service
 * Implements deterministic score calculation formula
 */

export class ScoreCalculatorService {
  private readonly BASE_SCORE = 1000;
  private readonly TIME_BONUS_WEIGHT = 500;
  private readonly ATTEMPTS_PENALTY_WEIGHT = 300;

  /**
   * Calculate score for completed game
   * Formula: BASE_SCORE + timeBonus - attemptsPenalty × difficultyMultiplier
   */
  calculateScore(difficulty: number, completionTime: number, attempts: number): number {
    const maxTime = this.getMaxTime(difficulty);
    const minAttempts = this.getMinAttempts(difficulty);

    // Time bonus: faster completion = higher bonus
    const timeBonus = ((maxTime - completionTime) / maxTime) * this.TIME_BONUS_WEIGHT;

    // Attempts penalty: more attempts = higher penalty
    const attemptsPenalty = (minAttempts / attempts) * this.ATTEMPTS_PENALTY_WEIGHT;

    // Difficulty multiplier
    const difficultyMultiplier = 1 + difficulty * 0.5;

    // Calculate final score
    const rawScore = (this.BASE_SCORE + timeBonus - attemptsPenalty) * difficultyMultiplier;

    // Round to nearest integer, minimum 0
    return Math.max(0, Math.round(rawScore));
  }

  /**
   * Get maximum time for difficulty level (in seconds)
   */
  getMaxTime(difficulty: number): number {
    // Max time increases with difficulty
    switch (difficulty) {
      case 1:
        return 120; // 2 minutes
      case 2:
        return 180; // 3 minutes
      case 3:
        return 240; // 4 minutes
      case 4:
        return 300; // 5 minutes
      case 5:
        return 360; // 6 minutes
      default:
        return 180;
    }
  }

  /**
   * Get minimum attempts for difficulty level (perfect game)
   */
  getMinAttempts(difficulty: number): number {
    // Minimum attempts = number of pairs
    return this.getPairsForDifficulty(difficulty);
  }

  /**
   * Get number of pairs for difficulty level
   */
  private getPairsForDifficulty(difficulty: number): number {
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
