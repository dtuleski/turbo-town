/**
 * Unit tests for ScoringService
 */

import { ScoringService } from '../src/services/scoring.service';
import { GameType, Difficulty } from '../src/types';

describe('ScoringService', () => {
  let scoringService: ScoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  describe('Memory Match Scoring', () => {
    it('should calculate score for perfect Memory Match game (EASY)', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.EASY,
        completionTime: 30,
        performanceMetrics: {
          attempts: 8,
          pairs: 4,
        },
      });

      expect(result.baseScore).toBe(1000);
      expect(result.difficultyMultiplier).toBe(1.0);
      expect(result.speedBonus).toBeCloseTo(1.5, 2); // 1 + (60-30)/60 = 1.5
      expect(result.accuracyBonus).toBe(1.5); // Perfect accuracy: 1 + (1 - 0) * 0.5 = 1.5
      expect(result.finalScore).toBeGreaterThan(0);
    });

    it('should calculate score for Memory Match game (MEDIUM)', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.MEDIUM,
        completionTime: 45,
        performanceMetrics: {
          attempts: 15,
          pairs: 6,
        },
      });

      expect(result.baseScore).toBe(1000);
      expect(result.difficultyMultiplier).toBe(1.5);
      expect(result.speedBonus).toBeCloseTo(1.25, 2); // 1 + (60-45)/60 = 1.25
      expect(result.finalScore).toBeGreaterThan(0);
    });

    it('should calculate score for Memory Match game (HARD)', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.HARD,
        completionTime: 60,
        performanceMetrics: {
          attempts: 20,
          pairs: 8,
        },
      });

      expect(result.baseScore).toBe(1000);
      expect(result.difficultyMultiplier).toBe(2.0);
      expect(result.speedBonus).toBe(1.0); // At target time
      expect(result.finalScore).toBeGreaterThan(0);
    });

    it('should apply zero speed bonus for slow Memory Match completion', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.EASY,
        completionTime: 120,
        performanceMetrics: {
          attempts: 8,
          pairs: 4,
        },
      });

      expect(result.speedBonus).toBeCloseTo(0, 1);
    });
  });

  describe('Math Challenge Scoring', () => {
    it('should calculate score for perfect Math Challenge game (EASY)', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.MATH_CHALLENGE,
        difficulty: Difficulty.EASY,
        completionTime: 50,
        performanceMetrics: {
          correctAnswers: 10,
          totalQuestions: 10,
        },
      });

      expect(result.baseScore).toBe(1000); // 10 * 100
      expect(result.difficultyMultiplier).toBe(1.0);
      expect(result.accuracyBonus).toBe(1.0); // 10/10 = 1.0
      expect(result.finalScore).toBeGreaterThan(0);
    });

    it('should calculate score for Math Challenge game (MEDIUM)', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.MATH_CHALLENGE,
        difficulty: Difficulty.MEDIUM,
        completionTime: 70,
        performanceMetrics: {
          correctAnswers: 8,
          totalQuestions: 10,
        },
      });

      expect(result.baseScore).toBe(800); // 8 * 100
      expect(result.difficultyMultiplier).toBe(1.5);
      expect(result.accuracyBonus).toBe(0.8); // 8/10 = 0.8
      expect(result.finalScore).toBeGreaterThan(0);
    });

    it('should calculate score for Math Challenge game (HARD)', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.MATH_CHALLENGE,
        difficulty: Difficulty.HARD,
        completionTime: 100,
        performanceMetrics: {
          correctAnswers: 8,
          totalQuestions: 10,
        },
      });

      expect(result.baseScore).toBe(800); // 8 * 100
      expect(result.difficultyMultiplier).toBe(2.0);
      expect(result.finalScore).toBeGreaterThan(0);
    });

    it('should handle zero correct answers', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.MATH_CHALLENGE,
        difficulty: Difficulty.EASY,
        completionTime: 50,
        performanceMetrics: {
          correctAnswers: 0,
          totalQuestions: 10,
        },
      });

      expect(result.baseScore).toBe(0);
      expect(result.accuracyBonus).toBe(0);
      expect(result.finalScore).toBe(0);
    });
  });

  describe('Word Puzzle Scoring', () => {
    it('should calculate score for Word Puzzle game (EASY)', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.WORD_PUZZLE,
        difficulty: Difficulty.EASY,
        completionTime: 120,
        performanceMetrics: {
          wordsFound: 15,
          totalWords: 20,
        },
      });

      expect(result.baseScore).toBe(750); // 15 * 50
      expect(result.difficultyMultiplier).toBe(1.0);
      expect(result.speedBonus).toBeCloseTo(1.33, 2); // 1 + (180-120)/180
      expect(result.finalScore).toBeGreaterThan(0);
    });

    it('should calculate score for Word Puzzle game (MEDIUM)', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.WORD_PUZZLE,
        difficulty: Difficulty.MEDIUM,
        completionTime: 150,
        performanceMetrics: {
          wordsFound: 18,
          totalWords: 20,
        },
      });

      expect(result.baseScore).toBe(900); // 18 * 50
      expect(result.difficultyMultiplier).toBe(1.5);
      expect(result.finalScore).toBeGreaterThan(0);
    });

    it('should calculate score for Word Puzzle game (HARD)', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.WORD_PUZZLE,
        difficulty: Difficulty.HARD,
        completionTime: 180,
        performanceMetrics: {
          wordsFound: 20,
          totalWords: 20,
        },
      });

      expect(result.baseScore).toBe(1000); // 20 * 50
      expect(result.difficultyMultiplier).toBe(2.0);
      expect(result.speedBonus).toBe(1.0); // At target time
      expect(result.finalScore).toBeGreaterThan(0);
    });

    it('should apply minimal speed bonus for slow Word Puzzle completion', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.WORD_PUZZLE,
        difficulty: Difficulty.EASY,
        completionTime: 300,
        performanceMetrics: {
          wordsFound: 10,
          totalWords: 20,
        },
      });

      // Speed bonus should be close to 0 but may not be exactly 0
      // Formula: max(0, 1 + (180-300)/180) = max(0, 1 - 0.667) = max(0, 0.333) = 0.333
      expect(result.speedBonus).toBeGreaterThanOrEqual(0);
      expect(result.speedBonus).toBeLessThan(0.5);
    });
  });

  describe('Language Learning Scoring', () => {
    it('should calculate score for Language Learning game (BEGINNER)', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.LANGUAGE_LEARNING,
        difficulty: Difficulty.BEGINNER,
        completionTime: 200,
        performanceMetrics: {
          correctMatches: 9,
          totalAttempts: 10,
        },
      });

      expect(result.baseScore).toBe(900); // 9 * 100
      expect(result.difficultyMultiplier).toBe(1.0);
      expect(result.accuracyBonus).toBe(0.9); // 9/10 = 0.9
      expect(result.finalScore).toBeGreaterThan(0);
    });

    it('should calculate score for Language Learning game (INTERMEDIATE)', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.LANGUAGE_LEARNING,
        difficulty: Difficulty.INTERMEDIATE,
        completionTime: 250,
        performanceMetrics: {
          correctMatches: 8,
          totalAttempts: 10,
        },
      });

      expect(result.baseScore).toBe(800); // 8 * 100
      expect(result.difficultyMultiplier).toBe(1.5);
      expect(result.accuracyBonus).toBe(0.8); // 8/10 = 0.8
      expect(result.finalScore).toBeGreaterThan(0);
    });

    it('should calculate score for Language Learning game (ADVANCED)', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.LANGUAGE_LEARNING,
        difficulty: Difficulty.ADVANCED,
        completionTime: 300,
        performanceMetrics: {
          correctMatches: 10,
          totalAttempts: 10,
        },
      });

      expect(result.baseScore).toBe(1000); // 10 * 100
      expect(result.difficultyMultiplier).toBe(2.0);
      expect(result.accuracyBonus).toBe(1.0); // 10/10 = 1.0
      expect(result.finalScore).toBeGreaterThan(0);
    });
  });

  describe('Score Validation', () => {
    it('should validate valid Memory Match score', () => {
      const result = scoringService.validateScore(
        GameType.MEMORY_MATCH,
        1500,
        45,
        0.85
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject score below minimum completion time', () => {
      const result = scoringService.validateScore(
        GameType.MEMORY_MATCH,
        1500,
        2, // Below 5 seconds minimum
        0.85
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('below minimum'))).toBe(true);
    });

    it('should reject score above maximum completion time', () => {
      const result = scoringService.validateScore(
        GameType.MEMORY_MATCH,
        1500,
        400, // Above 300 seconds maximum
        0.85
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });

    it('should reject invalid accuracy value', () => {
      const result = scoringService.validateScore(
        GameType.MEMORY_MATCH,
        1500,
        45,
        1.5 // Above 1.0
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must be between 0 and 1'))).toBe(true);
    });

    it('should reject score above maximum', () => {
      const result = scoringService.validateScore(
        GameType.MEMORY_MATCH,
        7000, // Above 6000 maximum
        45,
        0.85
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });

    it('should validate Math Challenge score ranges', () => {
      const result = scoringService.validateScore(
        GameType.MATH_CHALLENGE,
        5000,
        100,
        0.8
      );

      expect(result.valid).toBe(true);
    });

    it('should validate Word Puzzle score ranges', () => {
      const result = scoringService.validateScore(
        GameType.WORD_PUZZLE,
        3000,
        150,
        0.75
      );

      expect(result.valid).toBe(true);
    });

    it('should validate Language Learning score ranges', () => {
      const result = scoringService.validateScore(
        GameType.LANGUAGE_LEARNING,
        4000,
        200,
        0.9
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('Configuration Loading', () => {
    it('should load configuration successfully', () => {
      const config = scoringService.loadConfiguration();

      expect(config).toBeDefined();
      expect(config.memoryMatch).toBeDefined();
      expect(config.mathChallenge).toBeDefined();
      expect(config.wordPuzzle).toBeDefined();
      expect(config.languageLearning).toBeDefined();
    });

    it('should have correct base scores', () => {
      const config = scoringService.loadConfiguration();

      expect(config.memoryMatch.baseScore).toBe(1000);
      expect(config.mathChallenge.baseScore).toBe(100);
      expect(config.wordPuzzle.baseScore).toBe(50);
      expect(config.languageLearning.baseScore).toBe(100);
    });

    it('should have correct difficulty multipliers', () => {
      const config = scoringService.loadConfiguration();

      expect(config.memoryMatch.difficultyMultipliers.EASY).toBe(1.0);
      expect(config.memoryMatch.difficultyMultipliers.MEDIUM).toBe(1.5);
      expect(config.memoryMatch.difficultyMultipliers.HARD).toBe(2.0);
    });
  });

  describe('Configuration Formatting', () => {
    it('should format configuration as readable text', () => {
      const formatted = scoringService.formatConfiguration();

      expect(formatted).toContain('Memory Match');
      expect(formatted).toContain('Math Challenge');
      expect(formatted).toContain('Word Puzzle');
      expect(formatted).toContain('Language Learning');
      expect(formatted).toContain('Base Score');
      expect(formatted).toContain('Difficulty Multipliers');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum values', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.EASY,
        completionTime: 5,
        performanceMetrics: {
          attempts: 8,
          pairs: 4,
        },
      });

      expect(result.finalScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle maximum values', () => {
      const result = scoringService.calculateScore({
        gameType: GameType.MEMORY_MATCH,
        difficulty: Difficulty.HARD,
        completionTime: 300,
        performanceMetrics: {
          attempts: 100,
          pairs: 8,
        },
      });

      expect(result.finalScore).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for unknown game type', () => {
      expect(() => {
        scoringService.calculateScore({
          gameType: 'UNKNOWN' as GameType,
          difficulty: Difficulty.EASY,
          completionTime: 30,
          performanceMetrics: {},
        });
      }).toThrow('Unknown game type');
    });
  });
});
