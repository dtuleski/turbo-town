"use strict";
/**
 * Calculation utilities for scores, rankings, and statistics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsUtils = exports.scoreUtils = void 0;
exports.scoreUtils = {
    /**
     * Calculate game score based on difficulty, completion time, and attempts
     * Formula: (Difficulty Multiplier × 10000) / (Time × Attempt Penalty)
     */
    calculateGameScore(difficulty, completionTime, attempts) {
        const difficultyMultiplier = difficulty / 12;
        const attemptPenalty = attempts / difficulty;
        const score = (difficultyMultiplier * 10000) / (completionTime * attemptPenalty);
        return Math.max(1, Math.round(score * 100) / 100);
    },
    /**
     * Calculate leaderboard rank based on score
     */
    calculateRank(score, existingScores) {
        const sortedScores = [...existingScores, score].sort((a, b) => b - a);
        return sortedScores.indexOf(score) + 1;
    },
    /**
     * Check if score qualifies for leaderboard
     */
    qualifiesForLeaderboard(score, minScore) {
        return score >= minScore;
    },
};
exports.statsUtils = {
    /**
     * Calculate average of numbers
     */
    average(numbers) {
        if (numbers.length === 0)
            return 0;
        return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    },
    /**
     * Calculate median of numbers
     */
    median(numbers) {
        if (numbers.length === 0)
            return 0;
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    },
    /**
     * Calculate percentile
     */
    percentile(numbers, p) {
        if (numbers.length === 0)
            return 0;
        const sorted = [...numbers].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    },
};
//# sourceMappingURL=calculations.js.map