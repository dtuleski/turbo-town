import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  RateLimitError,
  AppError,
} from '@memory-game/shared';
import { logger } from './logger';

/**
 * Map DynamoDB errors to domain errors
 */
export function mapDynamoDBError(error: Error): Error {
  const errorName = error.name;

  switch (errorName) {
    case 'ConditionalCheckFailedException':
      return new AppError('CONFLICT', 'Resource already exists or condition not met', 409);

    case 'ResourceNotFoundException':
      return new NotFoundError('Resource not found');

    case 'ProvisionedThroughputExceededException':
    case 'RequestLimitExceeded':
      return new RateLimitError('Service temporarily unavailable. Please try again later');

    case 'ValidationException':
      return new ValidationError('Invalid request data');

    case 'AccessDeniedException':
      return new AuthorizationError('Access denied');

    default:
      logger.error('Unmapped DynamoDB error', error);
      return new AppError('INTERNAL_ERROR', 'Database error occurred', 500);
  }
}

/**
 * Map EventBridge errors to domain errors
 */
export function mapEventBridgeError(error: Error): Error {
  const errorName = error.name;

  switch (errorName) {
    case 'ResourceNotFoundException':
      return new NotFoundError('Event bus not found');

    case 'LimitExceededException':
      return new RateLimitError('Event publishing rate limit exceeded');

    case 'InternalException':
      return new AppError('INTERNAL_ERROR', 'Event publishing failed', 500);

    default:
      logger.error('Unmapped EventBridge error', error);
      return new AppError('INTERNAL_ERROR', 'Event publishing error occurred', 500);
  }
}

/**
 * Sanitize error for client response
 * Only expose known domain errors, hide internal errors
 */
export function sanitizeError(error: Error): Error {
  // Known domain errors - safe to expose
  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof AuthorizationError ||
    error instanceof RateLimitError ||
    error instanceof AppError
  ) {
    return error;
  }

  // Unknown errors - log but don't expose details
  logger.error('Unexpected error', error);
  return new AppError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
}

/**
 * Create user-friendly error messages
 */
export const ErrorMessages = {
  RATE_LIMIT_EXCEEDED: (resetAt: Date): string =>
    `Rate limit exceeded. You can play again at ${resetAt.toISOString()}`,

  INVALID_COMPLETION_TIME: (minTime: number, providedTime: number): string =>
    `Invalid completion time. Minimum time is ${minTime} seconds, but ${providedTime} seconds was provided`,

  INVALID_ATTEMPTS: (minAttempts: number, providedAttempts: number): string =>
    `Invalid attempts. Minimum attempts is ${minAttempts}, but ${providedAttempts} was provided`,

  GAME_NOT_FOUND: 'Game not found',

  GAME_NOT_OWNED: 'You do not have permission to access this game',

  GAME_ALREADY_COMPLETED: 'Game has already been completed',

  THEME_NOT_FOUND: 'Theme not found',

  THEME_NOT_PUBLISHED: 'Theme is not available',

  PAID_FEATURE_REQUIRED: (feature: string, requiredTiers: string[]): string =>
    `${feature} is available with ${requiredTiers.join(', ')} subscription`,

  SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
};

/**
 * Error codes for client handling
 */
export const ErrorCodes = {
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
