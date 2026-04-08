"use strict";
/**
 * Score Calculator Service
 * Implements deterministic score calculation formula
 * Formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
 * (Matches leaderboard service scoring)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreCalculatorService = void 0;
class ScoreCalculatorService {
    constructor() {
        this.BASE_SCORE = 1000;
        this.MAX_TIME = 60; // seconds
    }
    /**
     * Calculate score for completed game
     * Formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
     */
    calculateScore(difficulty, completionTime, attempts) {
        const pairs = this.getPairsForDifficulty(difficulty);
        const minAttempts = pairs * 2; // Perfect game = 2 attempts per pair
        // Base score
        const baseScore = this.BASE_SCORE;
        // Difficulty multiplier (1.0 for easy, 1.5 for medium, 2.0 for hard)
        const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);
        // Speed bonus: max(0, 1 + (60 - completionTime) / 60)
        const speedBonus = Math.max(0, 1 + (this.MAX_TIME - completionTime) / this.MAX_TIME);
        // Accuracy bonus: 1 + (1 - (attempts - minAttempts) / minAttempts) × 0.5
        const accuracyRatio = Math.max(0, 1 - (attempts - minAttempts) / minAttempts);
        const accuracyBonus = 1 + accuracyRatio * 0.5;
        // Calculate final score
        let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
        // Handle NaN and ensure non-negative
        if (isNaN(finalScore) || !isFinite(finalScore)) {
            finalScore = 0;
        }
        // Round to nearest integer, minimum 0
        return Math.max(0, Math.round(finalScore));
    }
    /**
     * Get difficulty multiplier
     */
    getDifficultyMultiplier(difficulty) {
        if (difficulty <= 3) {
            return 1.0; // EASY
        }
        else if (difficulty <= 5) {
            return 1.5; // MEDIUM
        }
        else {
            return 2.0; // HARD
        }
    }
    /**
     * Get number of pairs for difficulty level
     */
    getPairsForDifficulty(difficulty) {
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
exports.ScoreCalculatorService = ScoreCalculatorService;
//# sourceMappingURL=score-calculator.service.js.map