"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameHistoryInputSchema = exports.completeGameInputSchema = exports.startGameInputSchema = void 0;
exports.validateStartGameInput = validateStartGameInput;
exports.validateCompleteGameInput = validateCompleteGameInput;
exports.validateGameHistoryInput = validateGameHistoryInput;
exports.sanitizeString = sanitizeString;
exports.validateCompletionTime = validateCompletionTime;
exports.validateAttempts = validateAttempts;
const zod_1 = require("zod");
/**
 * Validation schemas using Zod
 */
exports.startGameInputSchema = zod_1.z.object({
    themeId: zod_1.z.string().min(1, 'Theme ID is required'),
    difficulty: zod_1.z.number().int().min(1).max(5, 'Difficulty must be between 1 and 5'),
});
exports.completeGameInputSchema = zod_1.z.object({
    gameId: zod_1.z.string().uuid('Game ID must be a valid UUID'),
    completionTime: zod_1.z.number().positive('Completion time must be positive'),
    attempts: zod_1.z.number().int().positive('Attempts must be a positive integer'),
    // Optional performance metrics for different game types
    correctAnswers: zod_1.z.number().int().nonnegative().optional(),
    totalQuestions: zod_1.z.number().int().positive().optional(),
    wordsFound: zod_1.z.number().int().nonnegative().optional(),
    totalWords: zod_1.z.number().int().positive().optional(),
    hintsUsed: zod_1.z.number().int().nonnegative().optional(),
    pauseCount: zod_1.z.number().int().nonnegative().optional(),
});
exports.gameHistoryInputSchema = zod_1.z.object({
    page: zod_1.z.number().int().positive().optional().default(1),
    pageSize: zod_1.z.number().int().min(1).max(100).optional().default(20),
    sortBy: zod_1.z.enum(['date', 'score', 'time']).optional().default('date'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    themeId: zod_1.z.string().optional(),
    difficulty: zod_1.z.number().int().min(1).max(5).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});
/**
 * Validate StartGameInput
 */
function validateStartGameInput(input) {
    return exports.startGameInputSchema.parse(input);
}
/**
 * Validate CompleteGameInput
 */
function validateCompleteGameInput(input) {
    return exports.completeGameInputSchema.parse(input);
}
/**
 * Validate GameHistoryInput
 */
function validateGameHistoryInput(input) {
    return exports.gameHistoryInputSchema.parse(input);
}
/**
 * Sanitize string input (remove potentially dangerous characters)
 */
function sanitizeString(input) {
    return input.trim().replace(/[<>]/g, '');
}
/**
 * Validate completion time is within acceptable range for difficulty
 */
function validateCompletionTime(completionTime, difficulty) {
    const minTime = difficulty * 2; // Minimum 2 seconds per difficulty level
    const maxTime = 3600; // Maximum 1 hour
    if (completionTime < minTime) {
        return {
            valid: false,
            reason: `Completion time too fast. Minimum time for difficulty ${difficulty} is ${minTime} seconds`,
        };
    }
    if (completionTime > maxTime) {
        return {
            valid: false,
            reason: `Completion time too slow. Maximum time is ${maxTime} seconds (1 hour)`,
        };
    }
    return { valid: true };
}
/**
 * Validate attempts is within acceptable range for difficulty
 */
function validateAttempts(attempts, difficulty) {
    const pairs = getPairsForDifficulty(difficulty);
    const minAttempts = pairs; // Perfect game
    if (attempts < minAttempts) {
        return {
            valid: false,
            reason: `Attempts too low. Minimum attempts for difficulty ${difficulty} is ${minAttempts}`,
        };
    }
    return { valid: true };
}
/**
 * Get number of pairs for difficulty level
 */
function getPairsForDifficulty(difficulty) {
    switch (difficulty) {
        case 1:
            return 6;
        case 2:
            return 12;
        case 3:
            return 18;
        case 4:
            return 24;
        case 5:
            return 30;
        default:
            return 12;
    }
}
//# sourceMappingURL=validation.js.map