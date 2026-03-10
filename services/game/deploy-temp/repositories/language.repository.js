"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageRepository = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamodb_1 = require("../utils/dynamodb");
const logger_1 = require("../utils/logger");
class LanguageRepository {
    constructor() {
        this.wordsTableName = process.env.LANGUAGE_WORDS_TABLE_NAME || 'memory-game-language-words-dev';
        this.progressTableName = process.env.LANGUAGE_PROGRESS_TABLE_NAME || 'memory-game-language-progress-dev';
        this.resultsTableName = process.env.LANGUAGE_RESULTS_TABLE_NAME || 'memory-game-language-results-dev';
    }
    /**
     * Get words by category and difficulty
     */
    async getWordsByCategory(languageCode, category, difficulty, count) {
        try {
            logger_1.logger.info('Querying words from DynamoDB', {
                languageCode,
                category,
                difficulty,
                count,
                tableName: this.wordsTableName
            });
            const command = new lib_dynamodb_1.ScanCommand({
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
                Limit: count * 2 // Get more than needed to allow for shuffling
            });
            const result = await dynamodb_1.docClient.send(command);
            const words = (result.Items || []);
            logger_1.logger.info('DynamoDB scan result', {
                itemCount: words.length,
                scannedCount: result.ScannedCount,
                count: result.Count
            });
            if (words.length > 0) {
                logger_1.logger.info('Sample item structure', {
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
            const transformedWords = words
                .filter(item => {
                const hasTranslations = item.translations && item.translations[languageCode];
                logger_1.logger.info('Filtering item', {
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
                logger_1.logger.info('Transformed word', {
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
            logger_1.logger.info('Transformation complete', {
                originalCount: words.length,
                transformedCount: transformedWords.length,
                requestedCount: count
            });
            // Shuffle and return requested count
            const shuffled = transformedWords.sort(() => Math.random() - 0.5);
            const finalResult = shuffled.slice(0, count);
            logger_1.logger.info('Final result', {
                finalCount: finalResult.length,
                words: finalResult.map(w => ({ id: w.id, word: w.word }))
            });
            return finalResult;
        }
        catch (error) {
            logger_1.logger.error('Failed to get words by category', error, {
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
    async saveGameResult(userId, result) {
        try {
            const command = new lib_dynamodb_1.PutCommand({
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
            await dynamodb_1.docClient.send(command);
        }
        catch (error) {
            logger_1.logger.error('Failed to save game result', error, {
                userId,
                gameId: result.gameId
            });
            throw error;
        }
    }
    /**
     * Get user's progress for a specific language
     */
    async getUserProgress(userId, languageCode) {
        try {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.progressTableName,
                Key: {
                    userId,
                    languageCode
                }
            });
            const result = await dynamodb_1.docClient.send(command);
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get user progress', error, {
                userId,
                languageCode
            });
            return null;
        }
    }
    /**
     * Get all user's language progress
     */
    async getAllUserProgress(userId) {
        try {
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: this.progressTableName,
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId
                }
            });
            const result = await dynamodb_1.docClient.send(command);
            const items = result.Items || [];
            return items.map((item) => ({
                languageCode: item.languageCode,
                xp: item.xp || 0,
                level: item.level || 1,
                wordsLearned: item.wordsLearned || 0,
                accuracy: item.accuracy || 0,
                lastPlayed: item.lastPlayed || new Date().toISOString()
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to get all user progress', error, { userId });
            return [];
        }
    }
    /**
     * Update user's language progress
     */
    async updateUserProgress(userId, progress) {
        try {
            const command = new lib_dynamodb_1.PutCommand({
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
            await dynamodb_1.docClient.send(command);
        }
        catch (error) {
            logger_1.logger.error('Failed to update user progress', error, {
                userId,
                languageCode: progress.languageCode
            });
            throw error;
        }
    }
    /**
     * Fallback words when database is not available
     */
    getFallbackWords(languageCode, category, count) {
        const fallbackWords = {
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
exports.LanguageRepository = LanguageRepository;
//# sourceMappingURL=language.repository.js.map