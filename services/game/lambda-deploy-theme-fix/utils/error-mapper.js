"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = exports.ErrorMessages = void 0;
exports.mapDynamoDBError = mapDynamoDBError;
exports.mapEventBridgeError = mapEventBridgeError;
exports.sanitizeError = sanitizeError;
const shared_1 = require("@memory-game/shared");
const logger_1 = require("./logger");
/**
 * Map DynamoDB errors to domain errors
 */
function mapDynamoDBError(error) {
    const errorName = error.name;
    switch (errorName) {
        case 'ConditionalCheckFailedException':
            return new shared_1.AppError('CONFLICT', 'Resource already exists or condition not met', 409);
        case 'ResourceNotFoundException':
            return new shared_1.NotFoundError('Resource not found');
        case 'ProvisionedThroughputExceededException':
        case 'RequestLimitExceeded':
            return new shared_1.RateLimitError('Service temporarily unavailable. Please try again later');
        case 'ValidationException':
            return new shared_1.ValidationError('Invalid request data');
        case 'AccessDeniedException':
            return new shared_1.AuthorizationError('Access denied');
        default:
            logger_1.logger.error('Unmapped DynamoDB error', error);
            return new shared_1.AppError('INTERNAL_ERROR', 'Database error occurred', 500);
    }
}
/**
 * Map EventBridge errors to domain errors
 */
function mapEventBridgeError(error) {
    const errorName = error.name;
    switch (errorName) {
        case 'ResourceNotFoundException':
            return new shared_1.NotFoundError('Event bus not found');
        case 'LimitExceededException':
            return new shared_1.RateLimitError('Event publishing rate limit exceeded');
        case 'InternalException':
            return new shared_1.AppError('INTERNAL_ERROR', 'Event publishing failed', 500);
        default:
            logger_1.logger.error('Unmapped EventBridge error', error);
            return new shared_1.AppError('INTERNAL_ERROR', 'Event publishing error occurred', 500);
    }
}
/**
 * Sanitize error for client response
 * Only expose known domain errors, hide internal errors
 */
function sanitizeError(error) {
    // Known domain errors - safe to expose
    if (error instanceof shared_1.ValidationError ||
        error instanceof shared_1.NotFoundError ||
        error instanceof shared_1.AuthorizationError ||
        error instanceof shared_1.RateLimitError ||
        error instanceof shared_1.AppError) {
        return error;
    }
    // Unknown errors - log but don't expose details
    logger_1.logger.error('Unexpected error', error);
    return new shared_1.AppError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
}
/**
 * Create user-friendly error messages
 */
exports.ErrorMessages = {
    RATE_LIMIT_EXCEEDED: (resetAt) => `Rate limit exceeded. You can play again at ${resetAt instanceof Date ? resetAt.toISOString() : resetAt}`,
    INVALID_COMPLETION_TIME: (minTime, providedTime) => `Invalid completion time. Minimum time is ${minTime} seconds, but ${providedTime} seconds was provided`,
    INVALID_ATTEMPTS: (minAttempts, providedAttempts) => `Invalid attempts. Minimum attempts is ${minAttempts}, but ${providedAttempts} was provided`,
    GAME_NOT_FOUND: 'Game not found',
    GAME_NOT_OWNED: 'You do not have permission to access this game',
    GAME_ALREADY_COMPLETED: 'Game has already been completed',
    THEME_NOT_FOUND: 'Theme not found',
    THEME_NOT_PUBLISHED: 'Theme is not available',
    PAID_FEATURE_REQUIRED: (feature, requiredTiers) => `${feature} is available with ${requiredTiers.join(', ')} subscription`,
    SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
};
/**
 * Error codes for client handling
 */
exports.ErrorCodes = {
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INVALID_COMPLETION: 'INVALID_COMPLETION',
    INVALID_COMPLETION_TIME: 'INVALID_COMPLETION_TIME',
    INVALID_ATTEMPTS: 'INVALID_ATTEMPTS',
    GAME_NOT_FOUND: 'GAME_NOT_FOUND',
    GAME_NOT_OWNED: 'GAME_NOT_OWNED',
    GAME_ALREADY_COMPLETED: 'GAME_ALREADY_COMPLETED',
    THEME_NOT_FOUND: 'THEME_NOT_FOUND',
    THEME_NOT_PUBLISHED: 'THEME_NOT_PUBLISHED',
    PAID_FEATURE_REQUIRED: 'PAID_FEATURE_REQUIRED',
    SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    FORBIDDEN: 'FORBIDDEN',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
};
//# sourceMappingURL=error-mapper.js.map