/**
 * Calculation utilities for scores, rankings, and statistics
 */

export const scoreUtils = {
  /**
   * Calculate game score based on difficulty, completion time, and attempts
   * Formula: (Difficulty Multiplier × 10000) / (Time × Attempt Penalty)
   */
  calculateGameScore(difficulty: number, completionTime: number, attempts: number): number {
    const difficultyMultiplier = difficulty / 12;
    const attemptPenalty = attempts / difficulty;
    const score = (difficultyMultiplier * 10000) / (completionTime * attemptPenalty);
    return Math.max(1, Math.round(score * 100) / 100);
  },

  /**
   * Calculate leaderboard rank based on score
   */
  calculateRank(score: number, existingScores: number[]): number {
    const sortedScores = [...existingScores, score].sort((a, b) => b - a);
    return sortedScores.indexOf(score) + 1;
  },

  /**
   * Check if score qualifies for leaderboard
   */
  qualifiesForLeaderboard(score: number, minScore: number): boolean {
    return score >= minScore;
  },
};

export const statsUtils = {
  /**
   * Calculate average of numbers
   */
  average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  },

  /**
   * Calculate median of numbers
   */
  median(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
  },

  /**
   * Calculate percentile
   */
  percentile(numbers: number[], p: number): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)]!;
  },
};
