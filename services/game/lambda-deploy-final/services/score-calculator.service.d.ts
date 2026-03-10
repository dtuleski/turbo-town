/**
 * Score Calculator Service
 * Implements deterministic score calculation formula
 */
export declare class ScoreCalculatorService {
    private readonly BASE_SCORE;
    private readonly TIME_BONUS_WEIGHT;
    private readonly ATTEMPTS_PENALTY_WEIGHT;
    /**
     * Calculate score for completed game
     * Formula: BASE_SCORE + timeBonus - attemptsPenalty × difficultyMultiplier
     */
    calculateScore(difficulty: number, completionTime: number, attempts: number): number;
    /**
     * Get maximum time for difficulty level (in seconds)
     */
    getMaxTime(difficulty: number): number;
    /**
     * Get minimum attempts for difficulty level (perfect game)
     */
    getMinAttempts(difficulty: number): number;
    /**
     * Get number of pairs for difficulty level
     */
    private getPairsForDifficulty;
}
//# sourceMappingURL=score-calculator.service.d.ts.map