/**
 * Scoring Service
 *
 * Calculates scores using game-specific formulas and validates results.
 * Formula: Final Score = Base Score × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
 */
import { GameType, ScoreBreakdown, ValidationResult, ScoringConfig, CalculateScoreInput } from '../types';
export declare class ScoringService {
    private config;
    constructor();
    /**
     * Calculate score for a completed game
     */
    calculateScore(input: CalculateScoreInput): ScoreBreakdown;
    /**
     * Calculate Memory Match score
     * Formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
     */
    private calculateMemoryMatchScore;
    /**
     * Calculate Math Challenge score
     * Formula: (correctAnswers × 100) × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
     */
    private calculateMathChallengeScore;
    /**
     * Calculate Word Puzzle score
     * Formula: (wordsFound × 50) × Difficulty Multiplier × Speed Bonus × Completion Bonus
     */
    private calculateWordPuzzleScore;
    /**
     * Calculate Language Learning score
     * Formula: (correctMatches × 100) × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
     */
    private calculateLanguageLearningScore;
    /**
     * Validate score against expected ranges
     */
    validateScore(gameType: GameType, score: number, completionTime: number, accuracy: number): ValidationResult;
    /**
     * Load scoring configuration from embedded config
     */
    loadConfiguration(): ScoringConfig;
    /**
     * Format configuration as human-readable text
     */
    formatConfiguration(): string;
}
//# sourceMappingURL=scoring.service.d.ts.map