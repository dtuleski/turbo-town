import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../utils/dynamodb';
import { logger } from '../utils/logger';

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

export class LanguageRepository {
  private readonly wordsTableName: string;
  private readonly progressTableName: string;
  private readonly resultsTableName: string;

  constructor() {
    this.wordsTableName = process.env.LANGUAGE_WORDS_TABLE_NAME || 'language-words-dev';
    this.progressTableName = process.env.LANGUAGE_PROGRESS_TABLE_NAME || 'language-progress-dev';
    this.resultsTableName = process.env.LANGUAGE_RESULTS_TABLE_NAME || 'language-results-dev';
  }

  /**
   * Get words by category and difficulty
   */
  async getWordsByCategory(
    languageCode: string,
    category: string,
    difficulty: string,
    count: number
  ): Promise<LanguageWord[]> {
    try {
      const command = new ScanCommand({
        TableName: this.wordsTableName,
        FilterExpression: '#category = :category AND #difficulty = :difficulty AND #languageCode = :languageCode',
        ExpressionAttributeNames: {
          '#category': 'category',
          '#difficulty': 'difficulty',
          '#languageCode': 'languageCode'
        },
        ExpressionAttributeValues: {
          ':category': category,
          ':difficulty': difficulty,
          ':languageCode': languageCode
        },
        Limit: count * 2 // Get more than needed to allow for shuffling
      });

      const result = await docClient.send(command);
      const words = (result.Items || []) as any[];

      // Transform DynamoDB items to LanguageWord format
      const transformedWords: LanguageWord[] = words.map(item => ({
        id: item.wordId,
        word: item.translations[languageCode]?.word || item.word,
        pronunciation: item.translations[languageCode]?.pronunciation || '',
        correctImageUrl: item.imageUrl,
        distractorImages: item.distractorImages || [],
        category: item.category
      }));

      // Shuffle and return requested count
      const shuffled = transformedWords.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    } catch (error) {
      logger.error('Failed to get words by category', error as Error, {
        languageCode,
        category,
        difficulty,
        count
      });
      
      // Return fallback words if database query fails
      return this.getFallbackWords(languageCode, category, count);
    }
  }

  /**
   * Save language game result
   */
  async saveGameResult(userId: string, result: LanguageGameResult): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.resultsTableName,
        Item: {
          userId,
          gameId: result.gameId,
          languageCode: result.languageCode,
          score: result.score,
          correctAnswers: result.correctAnswers,
          totalQuestions: result.totalQuestions,
          difficulty: result.difficulty,
          category: result.category,
          timeSpent: result.timeSpent,
          xpGained: result.xpGained,
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      });

      await docClient.send(command);
    } catch (error) {
      logger.error('Failed to save game result', error as Error, {
        userId,
        gameId: result.gameId
      });
      throw error;
    }
  }

  /**
   * Get user's progress for a specific language
   */
  async getUserProgress(userId: string, languageCode: string): Promise<LanguageProgress | null> {
    try {
      const command = new GetCommand({
        TableName: this.progressTableName,
        Key: {
          userId,
          languageCode
        }
      });

      const result = await docClient.send(command);
      
      if (!result.Item) {
        return null;
      }

      return {
        languageCode: result.Item.languageCode,
        xp: result.Item.xp || 0,
        level: result.Item.level || 1,
        wordsLearned: result.Item.wordsLearned || 0,
        accuracy: result.Item.accuracy || 0,
        lastPlayed: result.Item.lastPlayed || new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get user progress', error as Error, {
        userId,
        languageCode
      });
      return null;
    }
  }

  /**
   * Get all user's language progress
   */
  async getAllUserProgress(userId: string): Promise<LanguageProgress[]> {
    try {
      const command = new QueryCommand({
        TableName: this.progressTableName,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });

      const result = await docClient.send(command);
      const items = result.Items || [];

      return items.map((item: any) => ({
        languageCode: item.languageCode,
        xp: item.xp || 0,
        level: item.level || 1,
        wordsLearned: item.wordsLearned || 0,
        accuracy: item.accuracy || 0,
        lastPlayed: item.lastPlayed || new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Failed to get all user progress', error as Error, { userId });
      return [];
    }
  }

  /**
   * Update user's language progress
   */
  async updateUserProgress(userId: string, progress: LanguageProgress): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.progressTableName,
        Item: {
          userId,
          languageCode: progress.languageCode,
          xp: progress.xp,
          level: progress.level,
          wordsLearned: progress.wordsLearned,
          accuracy: progress.accuracy,
          lastPlayed: progress.lastPlayed,
          updatedAt: new Date().toISOString()
        }
      });

      await docClient.send(command);
    } catch (error) {
      logger.error('Failed to update user progress', error as Error, {
        userId,
        languageCode: progress.languageCode
      });
      throw error;
    }
  }

  /**
   * Fallback words when database is not available
   */
  private getFallbackWords(languageCode: string, category: string, count: number): LanguageWord[] {
    const fallbackWords: Record<string, Record<string, LanguageWord[]>> = {
      'es': {
        'animals': [
          {
            id: 'es_animal_dog',
            word: 'perro',
            pronunciation: '/ˈpe.ro/',
            correctImageUrl: 'https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=🐕',
            distractorImages: [
              'https://via.placeholder.com/300x300/EF4444/FFFFFF?text=🐱',
              'https://via.placeholder.com/300x300/10B981/FFFFFF?text=🐰'
            ],
            category: 'animals'
          },
          {
            id: 'es_animal_cat',
            word: 'gato',
            pronunciation: '/ˈɡa.to/',
            correctImageUrl: 'https://via.placeholder.com/300x300/EF4444/FFFFFF?text=🐱',
            distractorImages: [
              'https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=🐕',
              'https://via.placeholder.com/300x300/F59E0B/FFFFFF?text=🐦'
            ],
            category: 'animals'
          },
          {
            id: 'es_animal_bird',
            word: 'pájaro',
            pronunciation: '/ˈpa.xa.ro/',
            correctImageUrl: 'https://via.placeholder.com/300x300/F59E0B/FFFFFF?text=🐦',
            distractorImages: [
              'https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=🐕',
              'https://via.placeholder.com/300x300/EF4444/FFFFFF?text=🐱'
            ],
            category: 'animals'
          }
        ],
        'food': [
          {
            id: 'es_food_apple',
            word: 'manzana',
            pronunciation: '/man.ˈsa.na/',
            correctImageUrl: 'https://via.placeholder.com/300x300/EF4444/FFFFFF?text=🍎',
            distractorImages: [
              'https://via.placeholder.com/300x300/F59E0B/FFFFFF?text=🍌',
              'https://via.placeholder.com/300x300/8B5CF6/FFFFFF?text=🍇'
            ],
            category: 'food'
          }
        ]
      }
    };

    const words = fallbackWords[languageCode]?.[category] || [];
    return words.slice(0, count);
  }
}