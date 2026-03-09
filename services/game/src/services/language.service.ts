import { v4 as uuidv4 } from 'uuid';
import { LanguageRepository } from '../repositories/language.repository';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

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

export class LanguageService {
  private languageRepository: LanguageRepository;

  constructor() {
    this.languageRepository = new LanguageRepository();
  }

  /**
   * Get words for a language learning game
   */
  async getWords(
    languageCode: string,
    category: string,
    difficulty: string,
    count: number
  ): Promise<LanguageWord[]> {
    try {
      // Get words from repository
      const words = await this.languageRepository.getWordsByCategory(
        languageCode,
        category,
        difficulty,
        count
      );

      if (words.length === 0) {
        logger.warn('No words found for criteria', {
          languageCode,
          category,
          difficulty,
          count
        });
        
        // Return fallback words if no specific words found
        return this.getFallbackWords(languageCode, category, count);
      }

      return words;
    } catch (error) {
      logger.error('Failed to get words', error as Error, {
        languageCode,
        category,
        difficulty,
        count
      });
      throw error;
    }
  }

  /**
   * Save a language game result
   */
  async saveGameResult(
    userId: string,
    gameData: {
      languageCode: string;
      score: number;
      correctAnswers: number;
      totalQuestions: number;
      difficulty: string;
      category: string;
      timeSpent: number;
      xpGained: number;
    }
  ): Promise<LanguageGameResult> {
    try {
      const gameId = uuidv4();
      const result: LanguageGameResult = {
        gameId,
        ...gameData
      };

      await this.languageRepository.saveGameResult(userId, result);

      logger.info('Language game result saved', {
        userId,
        gameId,
        languageCode: gameData.languageCode,
        score: gameData.score
      });

      return result;
    } catch (error) {
      logger.error('Failed to save game result', error as Error, {
        userId,
        gameData
      });
      throw error;
    }
  }

  /**
   * Update user's language learning progress
   */
  async updateUserProgress(
    userId: string,
    languageCode: string,
    xpGained: number,
    wordsLearned: number
  ): Promise<void> {
    try {
      // Get current progress
      const currentProgress = await this.languageRepository.getUserProgress(
        userId,
        languageCode
      );

      const newXp = (currentProgress?.xp || 0) + xpGained;
      const newLevel = Math.floor(newXp / 100) + 1;
      const totalWordsLearned = (currentProgress?.wordsLearned || 0) + wordsLearned;

      // Calculate accuracy (simplified - in real implementation, track more detailed stats)
      const accuracy = currentProgress?.accuracy || 0.8;

      const updatedProgress: LanguageProgress = {
        languageCode,
        xp: newXp,
        level: newLevel,
        wordsLearned: totalWordsLearned,
        accuracy,
        lastPlayed: new Date().toISOString()
      };

      await this.languageRepository.updateUserProgress(userId, updatedProgress);

      logger.info('User language progress updated', {
        userId,
        languageCode,
        newXp,
        newLevel,
        totalWordsLearned
      });
    } catch (error) {
      logger.error('Failed to update user progress', error as Error, {
        userId,
        languageCode,
        xpGained,
        wordsLearned
      });
      throw error;
    }
  }

  /**
   * Get user's progress for all languages
   */
  async getUserProgress(userId: string): Promise<LanguageProgress[]> {
    try {
      const progress = await this.languageRepository.getAllUserProgress(userId);
      return progress;
    } catch (error) {
      logger.error('Failed to get user progress', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get user's progress for a specific language
   */
  async getUserProgressByLanguage(
    userId: string,
    languageCode: string
  ): Promise<LanguageProgress | null> {
    try {
      const progress = await this.languageRepository.getUserProgress(
        userId,
        languageCode
      );
      return progress;
    } catch (error) {
      logger.error('Failed to get user progress by language', error as Error, {
        userId,
        languageCode
      });
      throw error;
    }
  }

  /**
   * Get fallback words when no specific words are found
   */
  private getFallbackWords(
    languageCode: string,
    category: string,
    count: number
  ): LanguageWord[] {
    // Basic fallback words for common categories
    const fallbackData: Record<string, Record<string, LanguageWord[]>> = {
      'es': {
        'animals': [
          {
            id: 'es_animal_dog',
            word: 'perro',
            pronunciation: '/ˈpe.ro/',
            correctImageUrl: 'https://images.dashden.app/animals/dog.jpg',
            distractorImages: [
              'https://images.dashden.app/animals/cat.jpg',
              'https://images.dashden.app/animals/rabbit.jpg'
            ],
            category: 'animals'
          },
          {
            id: 'es_animal_cat',
            word: 'gato',
            pronunciation: '/ˈɡa.to/',
            correctImageUrl: 'https://images.dashden.app/animals/cat.jpg',
            distractorImages: [
              'https://images.dashden.app/animals/dog.jpg',
              'https://images.dashden.app/animals/bird.jpg'
            ],
            category: 'animals'
          }
        ]
      }
    };

    const words = fallbackData[languageCode]?.[category] || [];
    return words.slice(0, count);
  }
}