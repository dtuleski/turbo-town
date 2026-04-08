"use strict";
/**
 * Scoring Service
 *
 * Calculates scores using game-specific formulas and validates results.
 * Formula: Final Score = Base Score × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringService = void 0;
const types_1 = require("../types");
class ScoringService {
    constructor() {
        this.config = this.loadConfiguration();
    }
    /**
     * Calculate score for a completed game
     */
    calculateScore(input) {
        const { gameType, difficulty, completionTime, performanceMetrics } = input;
        let breakdown;
        switch (gameType) {
            case types_1.GameType.MEMORY_MATCH:
                breakdown = this.calculateMemoryMatchScore(difficulty, completionTime, performanceMetrics);
                break;
            case types_1.GameType.MATH_CHALLENGE:
                breakdown = this.calculateMathChallengeScore(difficulty, completionTime, performanceMetrics);
                break;
            case types_1.GameType.WORD_PUZZLE:
                breakdown = this.calculateWordPuzzleScore(difficulty, completionTime, performanceMetrics);
                break;
            case types_1.GameType.LANGUAGE_LEARNING:
                breakdown = this.calculateLanguageLearningScore(difficulty, completionTime, performanceMetrics);
                break;
            default:
                throw new Error(`Unknown game type: ${gameType}`);
        }
        return breakdown;
    }
    /**
     * Calculate Memory Match score
     * Formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
     */
    calculateMemoryMatchScore(difficulty, completionTime, metrics) {
        const config = this.config.memoryMatch;
        const { attempts = 0, pairs = 0 } = metrics;
        // Base score
        const baseScore = config.baseScore;
        // Difficulty multiplier
        const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;
        // Speed bonus: max(0, 1 + (60 - completionTime) / 60)
        const maxTime = config.speedBonusParams.maxTime;
        const speedBonus = Math.max(0, 1 + (maxTime - completionTime) / maxTime);
        // Accuracy bonus: 1 + (1 - attempts / (pairs × 2)) × 0.5
        const minAttempts = pairs * 2;
        const accuracyRatio = Math.max(0, 1 - (attempts - minAttempts) / minAttempts);
        const accuracyBonus = 1 + accuracyRatio * 0.5;
        // Calculate accuracy percentage
        const accuracy = Math.max(0, 1 - (attempts - minAttempts) / minAttempts);
        // Final score (handle NaN and ensure non-negative)
        let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
        if (isNaN(finalScore) || !isFinite(finalScore)) {
            finalScore = 0;
        }
        finalScore = Math.max(0, Math.round(finalScore));
        return {
            baseScore,
            difficultyMultiplier,
            speedBonus,
            accuracyBonus,
            finalScore,
            difficulty,
            completionTime,
            accuracy: Math.max(0, Math.min(1, accuracy)),
        };
    }
    /**
     * Calculate Math Challenge score
     * Formula: (correctAnswers × 100) × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
     */
    calculateMathChallengeScore(difficulty, completionTime, metrics) {
        const config = this.config.mathChallenge;
        const { correctAnswers = 0, totalQuestions = 1 } = metrics;
        // Base score (per correct answer)
        const baseScore = correctAnswers * config.baseScore;
        // Difficulty multiplier
        const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;
        // Speed bonus: max(0, 1 + (timeLimit - avgTimePerQuestion) / timeLimit)
        const avgTimePerQuestion = completionTime / totalQuestions;
        const timeLimit = config.speedBonusParams.maxTime;
        const speedBonus = Math.max(0, 1 + (timeLimit - avgTimePerQuestion) / timeLimit);
        // Accuracy bonus: correctAnswers / totalQuestions
        const accuracyBonus = correctAnswers / totalQuestions;
        const accuracy = accuracyBonus;
        // Final score (handle NaN and ensure non-negative)
        let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
        if (isNaN(finalScore) || !isFinite(finalScore)) {
            finalScore = 0;
        }
        finalScore = Math.max(0, Math.round(finalScore));
        return {
            baseScore,
            difficultyMultiplier,
            speedBonus,
            accuracyBonus,
            finalScore,
            difficulty,
            completionTime,
            accuracy,
        };
    }
    /**
     * Calculate Word Puzzle score
     * Formula: (wordsFound × 50) × Difficulty Multiplier × Speed Bonus × Completion Bonus
     */
    calculateWordPuzzleScore(difficulty, completionTime, metrics) {
        const config = this.config.wordPuzzle;
        const { wordsFound = 0, totalWords = 1 } = metrics;
        // Base score (per word found)
        const baseScore = wordsFound * config.baseScore;
        // Difficulty multiplier
        const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;
        // Speed bonus: max(0, 1 + (180 - completionTime) / 180)
        const maxTime = config.speedBonusParams.maxTime;
        const speedBonus = Math.max(0, 1 + (maxTime - completionTime) / maxTime);
        // Completion bonus: 1 + (wordsFound / totalWords) × 0.5
        const completionBonus = 1 + (wordsFound / totalWords) * 0.5;
        const accuracy = wordsFound / totalWords;
        // Final score (handle NaN and ensure non-negative)
        let finalScore = baseScore * difficultyMultiplier * speedBonus * completionBonus;
        if (isNaN(finalScore) || !isFinite(finalScore)) {
            finalScore = 0;
        }
        finalScore = Math.max(0, Math.round(finalScore));
        return {
            baseScore,
            difficultyMultiplier,
            speedBonus,
            accuracyBonus: completionBonus,
            finalScore,
            difficulty,
            completionTime,
            accuracy,
        };
    }
    /**
     * Calculate Language Learning score
     * Formula: (correctMatches × 100) × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
     */
    calculateLanguageLearningScore(difficulty, completionTime, metrics) {
        const config = this.config.languageLearning;
        const { correctMatches = 0, totalAttempts = 1 } = metrics;
        // Base score (per correct match)
        const baseScore = correctMatches * config.baseScore;
        // Difficulty multiplier
        const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;
        // Speed bonus: max(0, 1 + (30 - avgTimePerMatch) / 30)
        const avgTimePerMatch = completionTime / totalAttempts;
        const maxTime = config.speedBonusParams.maxTime;
        const speedBonus = Math.max(0, 1 + (maxTime - avgTimePerMatch) / maxTime);
        // Accuracy bonus: correctMatches / totalAttempts
        const accuracyBonus = correctMatches / totalAttempts;
        const accuracy = accuracyBonus;
        // Final score (handle NaN and ensure non-negative)
        let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
        if (isNaN(finalScore) || !isFinite(finalScore)) {
            finalScore = 0;
        }
        finalScore = Math.max(0, Math.round(finalScore));
        return {
            baseScore,
            difficultyMultiplier,
            speedBonus,
            accuracyBonus,
            finalScore,
            difficulty,
            completionTime,
            accuracy,
        };
    }
    /**
     * Validate score against expected ranges
     */
    validateScore(gameType, score, completionTime, accuracy) {
        const errors = [];
        // Get game config
        let config;
        switch (gameType) {
            case types_1.GameType.MEMORY_MATCH:
                config = this.config.memoryMatch;
                break;
            case types_1.GameType.MATH_CHALLENGE:
                config = this.config.mathChallenge;
                break;
            case types_1.GameType.WORD_PUZZLE:
                config = this.config.wordPuzzle;
                break;
            case types_1.GameType.LANGUAGE_LEARNING:
                config = this.config.languageLearning;
                break;
            default:
                errors.push(`Unknown game type: ${gameType}`);
                return { valid: false, errors };
        }
        const rules = config.validationRules;
        // Validate completion time
        if (completionTime < rules.minCompletionTime) {
            errors.push(`Completion time ${completionTime}s is below minimum ${rules.minCompletionTime}s`);
        }
        if (completionTime > rules.maxCompletionTime) {
            errors.push(`Completion time ${completionTime}s exceeds maximum ${rules.maxCompletionTime}s`);
        }
        // Validate accuracy
        if (accuracy < 0 || accuracy > 1) {
            errors.push(`Accuracy ${accuracy} must be between 0 and 1`);
        }
        // Validate score range
        if (score < rules.minScore) {
            errors.push(`Score ${score} is below minimum ${rules.minScore}`);
        }
        if (score > rules.maxScore) {
            errors.push(`Score ${score} exceeds maximum ${rules.maxScore}`);
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Load scoring configuration from embedded config
     */
    loadConfiguration() {
        // Embedded configuration - no file I/O needed
        return {
            memoryMatch: {
                baseScore: 1000,
                difficultyMultipliers: {
                    [types_1.Difficulty.EASY]: 1.0,
                    [types_1.Difficulty.MEDIUM]: 1.5,
                    [types_1.Difficulty.HARD]: 2.0,
                },
                speedBonusParams: {
                    maxTime: 60,
                    formula: 'max(0, 1 + (maxTime - completionTime) / maxTime)',
                },
                accuracyBonusParams: {
                    formula: '1 + (1 - attempts / (pairs * 2)) * 0.5',
                },
                validationRules: {
                    minCompletionTime: 5,
                    maxCompletionTime: 300,
                    minScore: 0,
                    maxScore: 6000,
                },
            },
            mathChallenge: {
                baseScore: 100,
                difficultyMultipliers: {
                    [types_1.Difficulty.EASY]: 1.0,
                    [types_1.Difficulty.MEDIUM]: 1.5,
                    [types_1.Difficulty.HARD]: 2.0,
                },
                speedBonusParams: {
                    maxTime: 10,
                    formula: 'max(0, 1 + (timeLimit - avgTimePerQuestion) / timeLimit)',
                },
                accuracyBonusParams: {
                    formula: 'correctAnswers / totalQuestions',
                },
                validationRules: {
                    minCompletionTime: 10,
                    maxCompletionTime: 600,
                    minScore: 0,
                    maxScore: 10000,
                },
            },
            wordPuzzle: {
                baseScore: 50,
                difficultyMultipliers: {
                    [types_1.Difficulty.EASY]: 1.0,
                    [types_1.Difficulty.MEDIUM]: 1.5,
                    [types_1.Difficulty.HARD]: 2.0,
                },
                speedBonusParams: {
                    maxTime: 180,
                    formula: 'max(0, 1 + (maxTime - completionTime) / maxTime)',
                },
                accuracyBonusParams: {
                    formula: '1 + (wordsFound / totalWords) * 0.5',
                },
                validationRules: {
                    minCompletionTime: 15,
                    maxCompletionTime: 600,
                    minScore: 0,
                    maxScore: 6000,
                },
            },
            languageLearning: {
                baseScore: 100,
                difficultyMultipliers: {
                    [types_1.Difficulty.EASY]: 1.0,
                    [types_1.Difficulty.MEDIUM]: 1.5,
                    [types_1.Difficulty.HARD]: 2.0,
                },
                speedBonusParams: {
                    maxTime: 30,
                    formula: 'max(0, 1 + (maxTime - avgTimePerMatch) / maxTime)',
                },
                accuracyBonusParams: {
                    formula: 'correctMatches / totalAttempts',
                },
                validationRules: {
                    minCompletionTime: 10,
                    maxCompletionTime: 300,
                    minScore: 0,
                    maxScore: 8000,
                },
            },
        };
    }
    /**
     * Format configuration as human-readable text
     */
    formatConfiguration() {
        const lines = [];
        lines.push('=== Scoring Configuration ===\n');
        const games = [
            { key: 'memoryMatch', name: 'Memory Match' },
            { key: 'mathChallenge', name: 'Math Challenge' },
            { key: 'wordPuzzle', name: 'Word Puzzle' },
            { key: 'languageLearning', name: 'Language Learning' },
        ];
        for (const game of games) {
            const config = this.config[game.key];
            lines.push(`\n${game.name}:`);
            lines.push(`  Base Score: ${config.baseScore}`);
            lines.push(`  Difficulty Multipliers:`);
            for (const [difficulty, multiplier] of Object.entries(config.difficultyMultipliers)) {
                lines.push(`    ${difficulty}: ${multiplier}x`);
            }
            lines.push(`  Speed Bonus: ${config.speedBonusParams.formula}`);
            lines.push(`    Max Time: ${config.speedBonusParams.maxTime}s`);
            lines.push(`  Accuracy Bonus: ${config.accuracyBonusParams.formula}`);
            lines.push(`  Validation Rules:`);
            lines.push(`    Completion Time: ${config.validationRules.minCompletionTime}s - ${config.validationRules.maxCompletionTime}s`);
            lines.push(`    Score Range: ${config.validationRules.minScore} - ${config.validationRules.maxScore}`);
        }
        return lines.join('\n');
    }
}
exports.ScoringService = ScoringService;
//# sourceMappingURL=scoring.service.js.map