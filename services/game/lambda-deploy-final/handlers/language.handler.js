"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageHandler = void 0;
const language_service_1 = require("../services/language.service");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
class LanguageHandler {
    constructor() {
        this.languageService = new language_service_1.LanguageService();
    }
    /**
     * Get words for language learning game
     */
    async getLanguageWords(_, args, context) {
        try {
            const { languageCode, category, difficulty, count } = args;
            const { userId } = context;
            // Validate inputs
            if (!languageCode || !category || !difficulty || !count) {
                throw new errors_1.ValidationError('Missing required parameters');
            }
            if (count < 1 || count > 50) {
                throw new errors_1.ValidationError('Count must be between 1 and 50');
            }
            logger_1.logger.info('Getting language words', {
                userId,
                languageCode,
                category,
                difficulty,
                count
            });
            const words = await this.languageService.getWords(languageCode, category, difficulty, count);
            return words;
        }
        catch (error) {
            logger_1.logger.error('Failed to get language words', error, {
                args,
                userId: context.userId
            });
            throw error;
        }
    }
    /**
     * Save language game result
     */
    async saveLanguageGameResult(_, args, context) {
        try {
            const { input } = args;
            const { userId, username } = context;
            // Validate inputs
            if (!input.languageCode || input.score < 0 || input.correctAnswers < 0) {
                throw new errors_1.ValidationError('Invalid game result data');
            }
            logger_1.logger.info('Saving language game result', {
                userId,
                username,
                languageCode: input.languageCode,
                score: input.score
            });
            const result = await this.languageService.saveGameResult(userId, input);
            // Update user's language progress
            await this.languageService.updateUserProgress(userId, input.languageCode, input.xpGained, input.correctAnswers);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Failed to save language game result', error, {
                args,
                userId: context.userId
            });
            throw error;
        }
    }
    /**
     * Get user's language learning progress
     */
    async getUserLanguageProgress(_, __, context) {
        try {
            const { userId } = context;
            logger_1.logger.info('Getting user language progress', { userId });
            const progress = await this.languageService.getUserProgress(userId);
            return progress;
        }
        catch (error) {
            logger_1.logger.error('Failed to get user language progress', error, {
                userId: context.userId
            });
            throw error;
        }
    }
    /**
     * Get user's progress for a specific language
     */
    async getLanguageProgressByCode(_, args, context) {
        try {
            const { languageCode } = args;
            const { userId } = context;
            if (!languageCode) {
                throw new errors_1.ValidationError('Language code is required');
            }
            logger_1.logger.info('Getting language progress by code', {
                userId,
                languageCode
            });
            const progress = await this.languageService.getUserProgressByLanguage(userId, languageCode);
            return progress;
        }
        catch (error) {
            logger_1.logger.error('Failed to get language progress by code', error, {
                args,
                userId: context.userId
            });
            throw error;
        }
    }
}
exports.LanguageHandler = LanguageHandler;
//# sourceMappingURL=language.handler.js.map