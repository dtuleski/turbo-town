/**
 * Calculation utilities for scores, rankings, and statistics
 */
export declare const scoreUtils: {
    /**
     * Calculate game score based on difficulty, completion time, and attempts
     * Formula: (Difficulty Multiplier × 10000) / (Time × Attempt Penalty)
     */
    calculateGameScore(difficulty: number, completionTime: number, attempts: number): number;
    /**
     * Calculate leaderboard rank based on score
     */
    calculateRank(score: number, existingScores: number[]): number;
    /**
     * Check if score qualifies for leaderboard
     */
    qualifiesForLeaderboard(score: number, minScore: number): boolean;
};
export declare const statsUtils: {
    /**
     * Calculate average of numbers
     */
    average(numbers: number[]): number;
    /**
     * Calculate median of numbers
     */
    median(numbers: number[]): number;
    /**
     * Calculate percentile
     */
    percentile(numbers: number[], p: number): number;
};
//# sourceMappingURL=calculations.d.ts.map