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

export interface LanguageWordAdmin {
  wordId: string;
  category: string;
  difficulty: string;
  languageCode: string;
  imageUrl: string;
  distractorImages: string[];
  translations: Record<string, { word: string; pronunciation: string }>;
  createdAt: string;
  updatedAt: string;
}

export class LanguageRepository {
  private readonly wordsTableName: string;
  private readonly progressTableName: string;
  private readonly resultsTableName: string;

  constructor() {
    this.wordsTableName = process.env.LANGUAGE_WORDS_TABLE_NAME || 'memory-game-language-words-dev';
    this.progressTableName = process.env.LANGUAGE_PROGRESS_TABLE_NAME || 'memory-game-language-progress-dev';
    this.resultsTableName = process.env.LANGUAGE_RESULTS_TABLE_NAME || 'memory-game-language-results-dev';
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
      logger.info('Querying words from DynamoDB', {
        languageCode,
        category,
        difficulty,
        count,
        tableName: this.wordsTableName
      });

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
          ':languageCode': 'multi' // Look for multi-language entries
        },
      });

      const result = await docClient.send(command);
      const words = (result.Items || []) as any[];

      logger.info('DynamoDB scan result', {
        itemCount: words.length,
        scannedCount: result.ScannedCount,
        count: result.Count
      });

      if (words.length > 0) {
        logger.info('Sample item structure', {
          sampleItem: {
            wordId: words[0].wordId,
            category: words[0].category,
            difficulty: words[0].difficulty,
            languageCode: words[0].languageCode,
            hasTranslations: !!words[0].translations,
            translationKeys: words[0].translations ? Object.keys(words[0].translations) : [],
            hasRequestedLanguage: words[0].translations && words[0].translations[languageCode]
          }
        });
      }

      // Transform DynamoDB items to LanguageWord format
      const transformedWords: LanguageWord[] = words
        .filter(item => {
          const hasTranslations = item.translations && item.translations[languageCode];
          logger.info('Filtering item', {
            wordId: item.wordId,
            hasTranslations: !!hasTranslations,
            languageCode,
            availableLanguages: item.translations ? Object.keys(item.translations) : [],
            translationsStructure: item.translations
          });
          return hasTranslations;
        })
        .map(item => {
          const translation = item.translations[languageCode];
          const transformed = {
            id: item.wordId,
            word: translation?.word || item.word || 'Unknown',
            pronunciation: translation?.pronunciation || '',
            correctImageUrl: item.imageUrl,
            distractorImages: item.distractorImages || [],
            category: item.category
          };
          
          logger.info('Transformed word', {
            original: {
              wordId: item.wordId,
              translationWord: translation?.word,
              imageUrl: item.imageUrl,
              fullTranslation: translation
            },
            transformed: {
              id: transformed.id,
              word: transformed.word,
              correctImageUrl: transformed.correctImageUrl
            }
          });
          
          return transformed;
        });

      logger.info('Transformation complete', {
        originalCount: words.length,
        transformedCount: transformedWords.length,
        requestedCount: count
      });

      // Deduplicate by translated word (keep first occurrence)
      const seen = new Set<string>();
      const uniqueWords = transformedWords.filter(w => {
        const key = w.word.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Shuffle and return requested count
      const shuffled = uniqueWords.sort(() => Math.random() - 0.5);
      const finalResult = shuffled.slice(0, count);
      
      logger.info('Final result', {
        finalCount: finalResult.length,
        words: finalResult.map(w => ({ id: w.id, word: w.word }))
      });

      return finalResult;
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
   * Get all language words for admin management
   */
  async getAllLanguageWords(): Promise<LanguageWordAdmin[]> {
    try {
      logger.info('Getting all language words for admin');

      const command = new ScanCommand({
        TableName: this.wordsTableName
      });

      const result = await docClient.send(command);
      const items = result.Items || [];

      return items.map((item: any) => ({
        wordId: item.wordId,
        category: item.category,
        difficulty: item.difficulty,
        languageCode: item.languageCode,
        imageUrl: item.imageUrl,
        distractorImages: item.distractorImages || [],
        translations: item.translations || {},
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Failed to get all language words', error as Error);
      throw error;
    }
  }

  /**
   * Get a specific language word by ID for admin management
   */
  async getLanguageWordById(wordId: string): Promise<LanguageWordAdmin | null> {
    try {
      logger.info('Getting language word by ID', { wordId });

      const command = new GetCommand({
        TableName: this.wordsTableName,
        Key: { wordId }
      });

      const result = await docClient.send(command);
      
      if (!result.Item) {
        return null;
      }

      const item = result.Item;
      return {
        wordId: item.wordId,
        category: item.category,
        difficulty: item.difficulty,
        languageCode: item.languageCode,
        imageUrl: item.imageUrl,
        distractorImages: item.distractorImages || [],
        translations: item.translations || {},
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get language word by ID', error as Error, { wordId });
      throw error;
    }
  }

  /**
   * Create a new language word (admin only)
   */
  async createLanguageWord(input: {
    category: string;
    difficulty: string;
    languageCode: string;
    translations: Record<string, { word: string; pronunciation: string }>;
    imageUrl: string;
    distractorImages: string[];
  }): Promise<LanguageWordAdmin> {
    try {
      const wordId = `${input.category}_${input.translations.en?.word?.toLowerCase() || 'unknown'}_${Date.now()}`;
      const now = new Date().toISOString();

      const item = {
        wordId,
        category: input.category,
        difficulty: input.difficulty,
        languageCode: input.languageCode,
        translations: input.translations,
        imageUrl: input.imageUrl,
        distractorImages: input.distractorImages,
        createdAt: now,
        updatedAt: now,
      };

      await docClient.send(new PutCommand({
        TableName: this.wordsTableName,
        Item: item,
      }));

      logger.info('Created language word', { wordId, category: input.category });
      return item;
    } catch (error) {
      logger.error('Failed to create language word', error as Error);
      throw error;
    }
  }

  /**
   * Delete a language word (admin only)
   */
  async deleteLanguageWord(wordId: string): Promise<boolean> {
    try {
      logger.info('Deleting language word', { wordId });

      const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
      await docClient.send(new DeleteCommand({
        TableName: this.wordsTableName,
        Key: { wordId },
      }));

      logger.info('Deleted language word', { wordId });
      return true;
    } catch (error) {
      logger.error('Failed to delete language word', error as Error, { wordId });
      throw error;
    }
  }

  /**
   * Update a language word (admin only)
   */
  async updateLanguageWord(
    wordId: string,
    updates: {
      imageUrl?: string;
      distractorImages?: string[];
      translations?: Record<string, { word: string; pronunciation: string }>;
    }
  ): Promise<LanguageWordAdmin> {
    try {
      logger.info('Updating language word', { wordId, updates });

      // First get the current item
      const current = await this.getLanguageWordById(wordId);
      if (!current) {
        throw new Error(`Language word not found: ${wordId}`);
      }

      // Build update expression
      const updateExpressions: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};
      const expressionAttributeNames: Record<string, string> = {};

      if (updates.imageUrl !== undefined) {
        updateExpressions.push('#imageUrl = :imageUrl');
        expressionAttributeNames['#imageUrl'] = 'imageUrl';
        expressionAttributeValues[':imageUrl'] = updates.imageUrl;
      }

      if (updates.distractorImages !== undefined) {
        updateExpressions.push('#distractorImages = :distractorImages');
        expressionAttributeNames['#distractorImages'] = 'distractorImages';
        expressionAttributeValues[':distractorImages'] = updates.distractorImages;
      }

      if (updates.translations !== undefined) {
        updateExpressions.push('#translations = :translations');
        expressionAttributeNames['#translations'] = 'translations';
        expressionAttributeValues[':translations'] = updates.translations;
      }

      // Always update the updatedAt timestamp
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const command = new PutCommand({
        TableName: this.wordsTableName,
        Item: {
          ...current,
          ...updates,
          updatedAt: new Date().toISOString()
        }
      });

      await docClient.send(command);

      // Return the updated item
      const updated = await this.getLanguageWordById(wordId);
      if (!updated) {
        throw new Error('Failed to retrieve updated language word');
      }

      return updated;
    } catch (error) {
      logger.error('Failed to update language word', error as Error, { wordId });
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
            correctImageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face',
            distractorImages: [
              'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=face',
              'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&h=300&fit=crop&crop=face'
            ],
            category: 'animals'
          },
          {
            id: 'es_animal_cat',
            word: 'gato',
            pronunciation: '/ˈɡa.to/',
            correctImageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=face',
            distractorImages: [
              'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face',
              'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=300&h=300&fit=crop&crop=face'
            ],
            category: 'animals'
          },
          {
            id: 'es_animal_bird',
            word: 'pájaro',
            pronunciation: '/ˈpa.xa.ro/',
            correctImageUrl: 'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=300&h=300&fit=crop&crop=face',
            distractorImages: [
              'https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop&crop=face',
              'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop&crop=face'
            ],
            category: 'animals'
          }
        ],
        'food': [
          {
            id: 'es_food_apple',
            word: 'manzana',
            pronunciation: '/man.ˈsa.na/',
            correctImageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop&crop=center',
            distractorImages: [
              'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&h=300&fit=crop&crop=center',
              'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=300&h=300&fit=crop&crop=center'
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