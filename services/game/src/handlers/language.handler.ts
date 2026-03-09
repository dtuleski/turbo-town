import { LanguageService } from '../services/language.service';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface LanguageWord {
  id: string;
  word: string;
  pronunciation: string;
  correctImageUrl: string;
  distractorImages: string[];
  category: string;
}

export interface LanguageGameResult {
  gameId: string;
  languageCode: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  difficulty: string;
  category: string;
  timeSpent: number;
  xpGained: number;
}

export interface LanguageProgress {
  languageCode: string;
  xp: number;
  level: number;
  wordsLearned: number;
  accuracy: number;
  lastPlayed: string;
}

export class LanguageHandler {
  private languageService: LanguageService;

  constructor() {
    this.languageService = new LanguageService();
  }

  /**
   * Get words for language learning game
   */
  async getLanguageWords(
    _: any,
    args: {
      languageCode: string;
      category: string;
      difficulty: string;
      count: number;
    },
    context: { userId: string }
  ): Promise<LanguageWord[]> {
    try {
      const { languageCode, category, difficulty, count } = args;
      const { userId } = context;

      // Validate inputs
      if (!languageCode || !category || !difficulty || !count) {
        throw new ValidationError('Missing required parameters');
      }

      if (count < 1 || count > 50) {
        throw new ValidationError('Count must be between 1 and 50');
      }

      logger.info('Getting language words', {
        userId,
        languageCode,
        category,
        difficulty,
        count
      });

      const words = await this.languageService.getWords(
        languageCode,
        category,
        difficulty,
        count
      );

      return words;
    } catch (error) {
      logger.error('Failed to get language words', error as Error, {
        args,
        userId: context.userId
      });
      throw error;
    }
  }

  /**
   * Save language game result
   */
  async saveLanguageGameResult(
    _: any,
    args: {
      input: {
        languageCode: string;
        score: number;
        correctAnswers: number;
        totalQuestions: number;
        difficulty: string;
        category: string;
        timeSpent: number;
        xpGained: number;
      };
    },
    context: { userId: string; username: string }
  ): Promise<LanguageGameResult> {
    try {
      const { input } = args;
      const { userId, username } = context;

      // Validate inputs
      if (!input.languageCode || input.score < 0 || input.correctAnswers < 0) {
        throw new ValidationError('Invalid game result data');
      }

      logger.info('Saving language game result', {
        userId,
        username,
        languageCode: input.languageCode,
        score: input.score
      });

      const result = await this.languageService.saveGameResult(userId, input);

      // Update user's language progress
      await this.languageService.updateUserProgress(
        userId,
        input.languageCode,
        input.xpGained,
        input.correctAnswers
      );

      return result;
    } catch (error) {
      logger.error('Failed to save language game result', error as Error, {
        args,
        userId: context.userId
      });
      throw error;
    }
  }

  /**
   * Get user's language learning progress
   */
  async getUserLanguageProgress(
    _: any,
    __: any,
    context: { userId: string }
  ): Promise<LanguageProgress[]> {
    try {
      const { userId } = context;

      logger.info('Getting user language progress', { userId });

      const progress = await this.languageService.getUserProgress(userId);

      return progress;
    } catch (error) {
      logger.error('Failed to get user language progress', error as Error, {
        userId: context.userId
      });
      throw error;
    }
  }

  /**
   * Get user's progress for a specific language
   */
  async getLanguageProgressByCode(
    _: any,
    args: { languageCode: string },
    context: { userId: string }
  ): Promise<LanguageProgress | null> {
    try {
      const { languageCode } = args;
      const { userId } = context;

      if (!languageCode) {
        throw new ValidationError('Language code is required');
      }

      logger.info('Getting language progress by code', {
        userId,
        languageCode
      });

      const progress = await this.languageService.getUserProgressByLanguage(
        userId,
        languageCode
      );

      return progress;
    } catch (error) {
      logger.error('Failed to get language progress by code', error as Error, {
        args,
        userId: context.userId
      });
      throw error;
    }
  }
}