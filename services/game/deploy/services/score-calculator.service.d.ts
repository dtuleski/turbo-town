/**
 * Score Calculator Service
 * Implements deterministic score calculation formula
 * Formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
 * (Matches leaderboard service scoring)
 */
export declare class ScoreCalculatorService {
    private readonly BASE_SCORE;
    private readonly MAX_TIME;
    /**
     * Calculate score for completed game
     * Formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
     */
    calculateScore(difficulty: number, completionTime: number, attempts: number): number;
    /**
     * Get difficulty multiplier
     */
    private getDifficultyMultiplier;
    /**
     * Get number of pairs for difficulty level
     */
    private getPairsForDifficulty;
}
//# sourceMappingURL=score-calculator.service.d.ts.map