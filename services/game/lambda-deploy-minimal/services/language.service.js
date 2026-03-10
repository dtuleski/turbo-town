"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageService = void 0;
const uuid_1 = require("uuid");
const language_repository_1 = require("../repositories/language.repository");
const logger_1 = require("../utils/logger");
class LanguageService {
    constructor() {
        this.languageRepository = new language_repository_1.LanguageRepository();
    }
    /**
     * Get words for a language learning game
     */
    async getWords(languageCode, category, difficulty, count) {
        try {
            // Get words from repository
            const words = await this.languageRepository.getWordsByCategory(languageCode, category, difficulty, count);
            if (words.length === 0) {
                logger_1.logger.warn('No words found for criteria', {
                    languageCode,
                    category,
                    difficulty,
                    count
                });
                // Return fallback words if no specific words found
                return this.getFallbackWords(languageCode, category, count);
            }
            return words;
        }
        catch (error) {
            logger_1.logger.error('Failed to get words', error, {
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
    async saveGameResult(userId, gameData) {
        try {
            const gameId = (0, uuid_1.v4)();
            const result = {
                gameId,
                ...gameData
            };
            await this.languageRepository.saveGameResult(userId, result);
            logger_1.logger.info('Language game result saved', {
                userId,
                gameId,
                languageCode: gameData.languageCode,
                score: gameData.score
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Failed to save game result', error, {
                userId,
                gameData
            });
            throw error;
        }
    }
    /**
     * Update user's language learning progress
     */
    async updateUserProgress(userId, languageCode, xpGained, wordsLearned) {
        try {
            // Get current progress
            const currentProgress = await this.languageRepository.getUserProgress(userId, languageCode);
            const newXp = (currentProgress?.xp || 0) + xpGained;
            const newLevel = Math.floor(newXp / 100) + 1;
            const totalWordsLearned = (currentProgress?.wordsLearned || 0) + wordsLearned;
            // Calculate accuracy (simplified - in real implementation, track more detailed stats)
            const accuracy = currentProgress?.accuracy || 0.8;
            const updatedProgress = {
                languageCode,
                xp: newXp,
                level: newLevel,
                wordsLearned: totalWordsLearned,
                accuracy,
                lastPlayed: new Date().toISOString()
            };
            await this.languageRepository.updateUserProgress(userId, updatedProgress);
            logger_1.logger.info('User language progress updated', {
                userId,
                languageCode,
                newXp,
                newLevel,
                totalWordsLearned
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to update user progress', error, {
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
    async getUserProgress(userId) {
        try {
            const progress = await this.languageRepository.getAllUserProgress(userId);
            return progress;
        }
        catch (error) {
            logger_1.logger.error('Failed to get user progress', error, { userId });
            throw error;
        }
    }
    /**
     * Get user's progress for a specific language
     */
    async getUserProgressByLanguage(userId, languageCode) {
        try {
            const progress = await this.languageRepository.getUserProgress(userId, languageCode);
            return progress;
        }
        catch (error) {
            logger_1.logger.error('Failed to get user progress by language', error, {
                userId,
                languageCode
            });
            throw error;
        }
    }
    /**
     * Get fallback words when no specific words are found
     */
    getFallbackWords(languageCode, category, count) {
        // Basic fallback words for common categories
        const fallbackData = {
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
exports.LanguageService = LanguageService;
//# sourceMappingURL=language.service.js.map