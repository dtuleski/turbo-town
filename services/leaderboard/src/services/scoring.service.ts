/**
 * Scoring Service
 * 
 * Calculates scores using game-specific formulas and validates results.
 * Formula: Final Score = Base Score × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
 */

import {
  GameType,
  Difficulty,
  ScoreBreakdown,
  ValidationResult,
  ScoringConfig,
  GameScoringConfig,
  CalculateScoreInput,
  PerformanceMetrics,
} from '../types';

export class ScoringService {
  private config: ScoringConfig;

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Calculate score for a completed game
   */
  calculateScore(input: CalculateScoreInput): ScoreBreakdown {
    const { gameType, difficulty, completionTime, performanceMetrics } = input;

    let breakdown: ScoreBreakdown;

    switch (gameType) {
      case GameType.MEMORY_MATCH:
        breakdown = this.calculateMemoryMatchScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.MATH_CHALLENGE:
        breakdown = this.calculateMathChallengeScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.WORD_PUZZLE:
        breakdown = this.calculateWordPuzzleScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.LANGUAGE_LEARNING:
        breakdown = this.calculateLanguageLearningScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.SUDOKU:
        breakdown = this.calculateSudokuScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.JIGSAW_PUZZLE:
        breakdown = this.calculateJigsawPuzzleScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.BUBBLE_POP:
        breakdown = this.calculateBubblePopScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.SEQUENCE_MEMORY:
        breakdown = this.calculateSequenceMemoryScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.CODE_A_BOT:
        breakdown = this.calculateCodeABotScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.GEO_QUIZ:
        breakdown = this.calculateGeoQuizScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.HISTORY_QUIZ:
        breakdown = this.calculateHistoryQuizScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.CIVICS_QUIZ:
        breakdown = this.calculateCivicsQuizScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.COLOR_BY_NUMBER:
        breakdown = this.calculateColorByNumberScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.HANGMAN:
        breakdown = this.calculateHangmanScore(difficulty, completionTime, performanceMetrics);
        break;
      case GameType.TIC_TAC_TOE:
        breakdown = this.calculateTicTacToeScore(difficulty, completionTime, performanceMetrics);
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
  private calculateMemoryMatchScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.memoryMatch;
    const { attempts = 0, pairs = 0 } = metrics;

    // Base score
    const baseScore = config.baseScore;

    // Difficulty multiplier
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;

    // Speed bonus: max(0.1, 1 + (60 - completionTime) / 60)
    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);

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
  private calculateMathChallengeScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.mathChallenge;
    const { correctAnswers = 0, totalQuestions = 1 } = metrics;

    // Base score (per correct answer)
    const baseScore = correctAnswers * config.baseScore;

    // Difficulty multiplier
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;

    // Speed bonus: max(0.1, 1 + (timeLimit - avgTimePerQuestion) / timeLimit)
    const avgTimePerQuestion = completionTime / totalQuestions;
    const timeLimit = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (timeLimit - avgTimePerQuestion) / timeLimit);

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
  private calculateWordPuzzleScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.wordPuzzle;
    const { wordsFound = 0, totalWords = 1 } = metrics;

    // Base score (per word found)
    const baseScore = wordsFound * config.baseScore;

    // Difficulty multiplier
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;

    // Speed bonus: max(0.1, 1 + (180 - completionTime) / 180)
    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);

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
  private calculateLanguageLearningScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.languageLearning;
    const { correctMatches = 0, totalAttempts = 1 } = metrics;

    // Base score (per correct match)
    const baseScore = correctMatches * config.baseScore;

    // Difficulty multiplier
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;

    // Speed bonus: max(0.1, 1 + (30 - avgTimePerMatch) / 30)
    const avgTimePerMatch = completionTime / totalAttempts;
    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - avgTimePerMatch) / maxTime);

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
   * Calculate Sudoku score
   * Based on completion time and mistakes (fewer mistakes = higher accuracy)
   */
  private calculateSudokuScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.sudoku;
    const { correctAnswers = 0, totalQuestions = 1 } = metrics;

    const baseScore = config.baseScore;
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;

    // Speed bonus based on completion time
    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);

    // Accuracy bonus: correctAnswers / totalQuestions (fewer mistakes = higher)
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const accuracyBonus = 1 + accuracy * 0.5;

    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) finalScore = 0;
    finalScore = Math.max(0, Math.round(finalScore));

    return { baseScore, difficultyMultiplier, speedBonus, accuracyBonus, finalScore, difficulty, completionTime, accuracy };
  }

  /**
   * Calculate Jigsaw Puzzle score
   * Based on completion time and number of moves (fewer moves = better)
   */
  private calculateJigsawPuzzleScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.jigsawPuzzle;
    const { correctAnswers = 0, totalQuestions = 1 } = metrics;

    const baseScore = config.baseScore;
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;

    // Speed bonus
    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);

    // Accuracy: correctAnswers/totalQuestions represents piece placement efficiency
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const accuracyBonus = 1 + accuracy * 0.5;

    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) finalScore = 0;
    finalScore = Math.max(0, Math.round(finalScore));

    return { baseScore, difficultyMultiplier, speedBonus, accuracyBonus, finalScore, difficulty, completionTime, accuracy };
  }

  /**
   * Calculate Bubble Pop Spelling score
   * Based on words completed, speed, and lives remaining
   */
  private calculateBubblePopScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.bubblePop;
    const { correctAnswers = 0, totalQuestions = 1 } = metrics;

    const baseScore = correctAnswers * config.baseScore;
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;

    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);

    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const accuracyBonus = 1 + accuracy * 0.5;

    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) finalScore = 0;
    finalScore = Math.max(0, Math.round(finalScore));

    return { baseScore, difficultyMultiplier, speedBonus, accuracyBonus, finalScore, difficulty, completionTime, accuracy };
  }

  /**
   * Calculate Sequence Memory score
   */
  private calculateSequenceMemoryScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.sequenceMemory;
    const { correctAnswers = 0, totalQuestions = 1 } = metrics;

    const baseScore = correctAnswers * config.baseScore;
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;

    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);

    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const accuracyBonus = 1 + accuracy * 0.5;

    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) finalScore = 0;
    finalScore = Math.max(0, Math.round(finalScore));

    return { baseScore, difficultyMultiplier, speedBonus, accuracyBonus, finalScore, difficulty, completionTime, accuracy };
  }

  /**
   * Calculate Code-a-Bot score
   */
  private calculateCodeABotScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.codeABot;
    const { correctAnswers = 0, totalQuestions = 1 } = metrics;

    const baseScore = correctAnswers * config.baseScore;
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;

    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);

    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const accuracyBonus = 1 + accuracy * 0.5;

    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) finalScore = 0;
    finalScore = Math.max(0, Math.round(finalScore));

    return { baseScore, difficultyMultiplier, speedBonus, accuracyBonus, finalScore, difficulty, completionTime, accuracy };
  }

  /**
   * Calculate Geo Quiz score
   */
  private calculateGeoQuizScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.geoQuiz;
    const { correctAnswers = 0, totalQuestions = 1 } = metrics;

    const baseScore = correctAnswers * config.baseScore;
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;

    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);

    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const accuracyBonus = 1 + accuracy * 0.5;

    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) finalScore = 0;
    finalScore = Math.max(0, Math.round(finalScore));

    return { baseScore, difficultyMultiplier, speedBonus, accuracyBonus, finalScore, difficulty, completionTime, accuracy };
  }

  /**
   * Calculate History Quiz score
   */
  private calculateHistoryQuizScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.historyQuiz;
    const { correctAnswers = 0, totalQuestions = 1 } = metrics;

    const baseScore = correctAnswers * config.baseScore;
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;

    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);

    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const accuracyBonus = 1 + accuracy * 0.5;

    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) finalScore = 0;
    finalScore = Math.max(0, Math.round(finalScore));

    return { baseScore, difficultyMultiplier, speedBonus, accuracyBonus, finalScore, difficulty, completionTime, accuracy };
  }

  /**
   * Calculate Civics Quiz score
   */
  private calculateCivicsQuizScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.civicsQuiz;
    const { correctAnswers = 0, totalQuestions = 1 } = metrics;
    const baseScore = correctAnswers * config.baseScore;
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;
    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const accuracyBonus = 1 + accuracy * 0.5;
    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) finalScore = 0;
    finalScore = Math.max(0, Math.round(finalScore));
    return { baseScore, difficultyMultiplier, speedBonus, accuracyBonus, finalScore, difficulty, completionTime, accuracy };
  }

  /**
   * Calculate Color by Number score
   */
  private calculateColorByNumberScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.colorByNumber;
    const { correctAnswers = 0, totalQuestions = 1 } = metrics;
    const baseScore = config.baseScore;
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;
    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const accuracyBonus = 1 + accuracy * 0.5;
    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) finalScore = 0;
    finalScore = Math.max(0, Math.round(finalScore));
    return { baseScore, difficultyMultiplier, speedBonus, accuracyBonus, finalScore, difficulty, completionTime, accuracy };
  }

  /**
   * Calculate Hangman score
   */
  private calculateHangmanScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.hangman;
    const { correctAnswers = 0, totalQuestions = 1 } = metrics;
    const baseScore = correctAnswers * config.baseScore;
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;
    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const accuracyBonus = 1 + accuracy * 0.5;
    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) finalScore = 0;
    finalScore = Math.max(0, Math.round(finalScore));
    return { baseScore, difficultyMultiplier, speedBonus, accuracyBonus, finalScore, difficulty, completionTime, accuracy };
  }

  /**
   * Calculate Tic Tac Toe score
   */
  private calculateTicTacToeScore(
    difficulty: Difficulty,
    completionTime: number,
    metrics: PerformanceMetrics
  ): ScoreBreakdown {
    const config = this.config.ticTacToe;
    const { correctAnswers = 0, totalQuestions = 1 } = metrics;
    const baseScore = correctAnswers * config.baseScore;
    const difficultyMultiplier = config.difficultyMultipliers[difficulty] || 1.0;
    const maxTime = config.speedBonusParams.maxTime;
    const speedBonus = Math.max(0.1, 1 + (maxTime - completionTime) / maxTime);
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const accuracyBonus = 1 + accuracy * 0.5;
    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) finalScore = 0;
    finalScore = Math.max(0, Math.round(finalScore));
    return { baseScore, difficultyMultiplier, speedBonus, accuracyBonus, finalScore, difficulty, completionTime, accuracy };
  }

  /**
   * Validate score against expected ranges
   */
  validateScore(
    gameType: GameType,
    score: number,
    completionTime: number,
    accuracy: number
  ): ValidationResult {
    const errors: string[] = [];

    // Get game config
    let config: GameScoringConfig;
    switch (gameType) {
      case GameType.MEMORY_MATCH:
        config = this.config.memoryMatch;
        break;
      case GameType.MATH_CHALLENGE:
        config = this.config.mathChallenge;
        break;
      case GameType.WORD_PUZZLE:
        config = this.config.wordPuzzle;
        break;
      case GameType.LANGUAGE_LEARNING:
        config = this.config.languageLearning;
        break;
      case GameType.SUDOKU:
        config = this.config.sudoku;
        break;
      case GameType.JIGSAW_PUZZLE:
        config = this.config.jigsawPuzzle;
        break;
      case GameType.BUBBLE_POP:
        config = this.config.bubblePop;
        break;
      case GameType.SEQUENCE_MEMORY:
        config = this.config.sequenceMemory;
        break;
      case GameType.CODE_A_BOT:
        config = this.config.codeABot;
        break;
      case GameType.GEO_QUIZ:
        config = this.config.geoQuiz;
        break;
      case GameType.HISTORY_QUIZ:
        config = this.config.historyQuiz;
        break;
      case GameType.CIVICS_QUIZ:
        config = this.config.civicsQuiz;
        break;
      case GameType.COLOR_BY_NUMBER:
        config = this.config.colorByNumber;
        break;
      case GameType.HANGMAN:
        config = this.config.hangman;
        break;
      case GameType.TIC_TAC_TOE:
        config = this.config.ticTacToe;
        break;
      default:
        errors.push(`Unknown game type: ${gameType}`);
        return { valid: false, errors };
    }

    const rules = config.validationRules;

    // Validate completion time
    if (completionTime < rules.minCompletionTime) {
      errors.push(
        `Completion time ${completionTime}s is below minimum ${rules.minCompletionTime}s`
      );
    }
    if (completionTime > rules.maxCompletionTime) {
      errors.push(
        `Completion time ${completionTime}s exceeds maximum ${rules.maxCompletionTime}s`
      );
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
  loadConfiguration(): ScoringConfig {
    // Embedded configuration - no file I/O needed
    return {
      memoryMatch: {
        baseScore: 1000,
        difficultyMultipliers: {
          [Difficulty.EASY]: 1.0,
          [Difficulty.MEDIUM]: 1.5,
          [Difficulty.HARD]: 2.0,
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
          maxScore: 10000,
        },
      },
      mathChallenge: {
        baseScore: 100,
        difficultyMultipliers: {
          [Difficulty.EASY]: 1.0,
          [Difficulty.MEDIUM]: 1.5,
          [Difficulty.HARD]: 2.0,
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
          [Difficulty.EASY]: 1.0,
          [Difficulty.MEDIUM]: 1.5,
          [Difficulty.HARD]: 2.0,
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
          maxScore: 10000,
        },
      },
      languageLearning: {
        baseScore: 100,
        difficultyMultipliers: {
          [Difficulty.EASY]: 1.0,
          [Difficulty.MEDIUM]: 1.5,
          [Difficulty.HARD]: 2.0,
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
      sudoku: {
        baseScore: 1000,
        difficultyMultipliers: {
          [Difficulty.EASY]: 1.0,
          [Difficulty.MEDIUM]: 1.5,
          [Difficulty.HARD]: 2.0,
        },
        speedBonusParams: {
          maxTime: 600,
          formula: 'max(0.1, 1 + (maxTime - completionTime) / maxTime)',
        },
        accuracyBonusParams: {
          formula: '1 + (correctAnswers / totalQuestions) * 0.5',
        },
        validationRules: {
          minCompletionTime: 30,
          maxCompletionTime: 3600,
          minScore: 0,
          maxScore: 8000,
        },
      },
      jigsawPuzzle: {
        baseScore: 800,
        difficultyMultipliers: {
          [Difficulty.EASY]: 1.0,
          [Difficulty.MEDIUM]: 1.5,
          [Difficulty.HARD]: 2.0,
        },
        speedBonusParams: {
          maxTime: 180,
          formula: 'max(0, 1 + (maxTime - completionTime) / maxTime)',
        },
        accuracyBonusParams: {
          formula: '1 + (correctAnswers / totalQuestions) * 0.5',
        },
        validationRules: {
          minCompletionTime: 10,
          maxCompletionTime: 1800,
          minScore: 0,
          maxScore: 10000,
        },
      },
      bubblePop: {
        baseScore: 200,
        difficultyMultipliers: {
          [Difficulty.EASY]: 1.0,
          [Difficulty.MEDIUM]: 1.5,
          [Difficulty.HARD]: 2.0,
        },
        speedBonusParams: {
          maxTime: 120,
          formula: 'max(0, 1 + (maxTime - completionTime) / maxTime)',
        },
        accuracyBonusParams: {
          formula: '1 + (wordsCompleted / totalWords) * 0.5',
        },
        validationRules: {
          minCompletionTime: 5,
          maxCompletionTime: 600,
          minScore: 0,
          maxScore: 10000,
        },
      },
      sequenceMemory: {
        baseScore: 200,
        difficultyMultipliers: {
          [Difficulty.EASY]: 1.0,
          [Difficulty.MEDIUM]: 1.5,
          [Difficulty.HARD]: 2.0,
        },
        speedBonusParams: {
          maxTime: 300,
          formula: 'max(0.1, 1 + (maxTime - completionTime) / maxTime)',
        },
        accuracyBonusParams: {
          formula: '1 + (roundsCompleted / totalRounds) * 0.5',
        },
        validationRules: {
          minCompletionTime: 5,
          maxCompletionTime: 1800,
          minScore: 0,
          maxScore: 10000,
        },
      },
      codeABot: {
        baseScore: 200,
        difficultyMultipliers: {
          [Difficulty.EASY]: 1.0,
          [Difficulty.MEDIUM]: 1.5,
          [Difficulty.HARD]: 2.0,
        },
        speedBonusParams: {
          maxTime: 600,
          formula: 'max(0.1, 1 + (maxTime - completionTime) / maxTime)',
        },
        accuracyBonusParams: {
          formula: '1 + (levelsCompleted / totalLevels) * 0.5',
        },
        validationRules: {
          minCompletionTime: 5,
          maxCompletionTime: 3600,
          minScore: 0,
          maxScore: 10000,
        },
      },
      geoQuiz: {
        baseScore: 150,
        difficultyMultipliers: {
          [Difficulty.EASY]: 1.0,
          [Difficulty.MEDIUM]: 1.5,
          [Difficulty.HARD]: 2.0,
        },
        speedBonusParams: {
          maxTime: 150,
          formula: 'max(0.1, 1 + (maxTime - completionTime) / maxTime)',
        },
        accuracyBonusParams: {
          formula: '1 + (correctAnswers / totalQuestions) * 0.5',
        },
        validationRules: {
          minCompletionTime: 5,
          maxCompletionTime: 600,
          minScore: 0,
          maxScore: 8000,
        },
      },
      historyQuiz: {
        baseScore: 150,
        difficultyMultipliers: { [Difficulty.EASY]: 1.0, [Difficulty.MEDIUM]: 1.5, [Difficulty.HARD]: 2.0 },
        speedBonusParams: { maxTime: 200, formula: 'max(0.1, 1 + (maxTime - completionTime) / maxTime)' },
        accuracyBonusParams: { formula: '1 + (correctAnswers / totalQuestions) * 0.5' },
        validationRules: { minCompletionTime: 5, maxCompletionTime: 600, minScore: 0, maxScore: 8000 },
      },
      civicsQuiz: {
        baseScore: 150,
        difficultyMultipliers: { [Difficulty.EASY]: 1.0, [Difficulty.MEDIUM]: 1.5, [Difficulty.HARD]: 2.0 },
        speedBonusParams: { maxTime: 200, formula: 'max(0.1, 1 + (maxTime - completionTime) / maxTime)' },
        accuracyBonusParams: { formula: '1 + (correctAnswers / totalQuestions) * 0.5' },
        validationRules: { minCompletionTime: 5, maxCompletionTime: 600, minScore: 0, maxScore: 8000 },
      },
      colorByNumber: {
        baseScore: 1000,
        difficultyMultipliers: { [Difficulty.EASY]: 1.0, [Difficulty.MEDIUM]: 1.5, [Difficulty.HARD]: 2.5 },
        speedBonusParams: { maxTime: 600, formula: 'max(0.1, 1 + (maxTime - completionTime) / maxTime)' },
        accuracyBonusParams: { formula: '1 + (correctAnswers / totalQuestions) * 0.5' },
        validationRules: { minCompletionTime: 10, maxCompletionTime: 7200, minScore: 0, maxScore: 10000 },
      },
      hangman: {
        baseScore: 200,
        difficultyMultipliers: { [Difficulty.EASY]: 1.0, [Difficulty.MEDIUM]: 1.5, [Difficulty.HARD]: 2.0 },
        speedBonusParams: { maxTime: 300, formula: 'max(0.1, 1 + (maxTime - completionTime) / maxTime)' },
        accuracyBonusParams: { formula: '1 + (correctAnswers / totalQuestions) * 0.5' },
        validationRules: { minCompletionTime: 5, maxCompletionTime: 600, minScore: 0, maxScore: 10000 },
      },
      ticTacToe: {
        baseScore: 200,
        difficultyMultipliers: { [Difficulty.EASY]: 1.0, [Difficulty.MEDIUM]: 1.5, [Difficulty.HARD]: 2.5 },
        speedBonusParams: { maxTime: 300, formula: 'max(0.1, 1 + (maxTime - completionTime) / maxTime)' },
        accuracyBonusParams: { formula: '1 + (wins / totalRounds) * 0.5' },
        validationRules: { minCompletionTime: 5, maxCompletionTime: 600, minScore: 0, maxScore: 8000 },
      },
    };
  }

  /**
   * Format configuration as human-readable text
   */
  formatConfiguration(): string {
    const lines: string[] = [];
    lines.push('=== Scoring Configuration ===\n');

    const games = [
      { key: 'memoryMatch', name: 'Memory Match' },
      { key: 'mathChallenge', name: 'Math Challenge' },
      { key: 'wordPuzzle', name: 'Word Puzzle' },
      { key: 'languageLearning', name: 'Language Learning' },
      { key: 'sudoku', name: 'Sudoku' },
      { key: 'jigsawPuzzle', name: 'Jigsaw Puzzle' },
      { key: 'bubblePop', name: 'Bubble Pop' },
      { key: 'sequenceMemory', name: 'Sequence Memory' },
      { key: 'codeABot', name: 'Code-a-Bot' },
      { key: 'geoQuiz', name: 'Geo Quiz' },
      { key: 'historyQuiz', name: 'History Quiz' },
      { key: 'civicsQuiz', name: 'Civics Quiz' },
      { key: 'colorByNumber', name: 'Color by Number' },
      { key: 'hangman', name: 'Hangman' },
      { key: 'ticTacToe', name: 'Tic Tac Toe' },
    ];

    for (const game of games) {
      const config = this.config[game.key as keyof ScoringConfig];
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
