import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  AppError,
} from '@memory-game/shared';

// Cognito error codes
const COGNITO_ERROR_CODES = {
  USER_NOT_FOUND: 'UserNotFoundException',
  USER_NOT_CONFIRMED: 'UserNotConfirmedException',
  INVALID_PASSWORD: 'InvalidPasswordException',
  NOT_AUTHORIZED: 'NotAuthorizedException',
  CODE_MISMATCH: 'CodeMismatchException',
  EXPIRED_CODE: 'ExpiredCodeException',
  USERNAME_EXISTS: 'UsernameExistsException',
  INVALID_PARAMETER: 'InvalidParameterException',
  TOO_MANY_REQUESTS: 'TooManyRequestsException',
  LIMIT_EXCEEDED: 'LimitExceededException',
  PASSWORD_RESET_REQUIRED: 'PasswordResetRequiredException',
  USER_LAMBDA_VALIDATION: 'UserLambdaValidationException',
} as const;

// DynamoDB error codes
const DYNAMODB_ERROR_CODES = {
  CONDITIONAL_CHECK_FAILED: 'ConditionalCheckFailedException',
  RESOURCE_NOT_FOUND: 'ResourceNotFoundException',
  PROVISIONED_THROUGHPUT_EXCEEDED: 'ProvisionedThroughputExceededException',
  VALIDATION_EXCEPTION: 'ValidationException',
} as const;

export function mapCognitoError(error: Error): Error {
  const errorName = error.name;
  const errorMessage = error.message;

  switch (errorName) {
    case COGNITO_ERROR_CODES.USER_NOT_FOUND:
      return new NotFoundError('User not found');

    case COGNITO_ERROR_CODES.USER_NOT_CONFIRMED:
      return new AuthenticationError('Email not verified. Please check your email for verification code.');

    case COGNITO_ERROR_CODES.INVALID_PASSWORD:
      return new ValidationError('Password does not meet requirements');

    case COGNITO_ERROR_CODES.NOT_AUTHORIZED:
      return new AuthenticationError('Invalid email or password');

    case COGNITO_ERROR_CODES.CODE_MISMATCH:
      return new ValidationError('Invalid verification code');

    case COGNITO_ERROR_CODES.EXPIRED_CODE:
      return new ValidationError('Verification code has expired. Please request a new one.');

    case COGNITO_ERROR_CODES.USERNAME_EXISTS:
      return new AppError('CONFLICT', 'An account with this email already exists', 409);

    case COGNITO_ERROR_CODES.INVALID_PARAMETER:
      return new ValidationError(errorMessage || 'Invalid input parameters');

    case COGNITO_ERROR_CODES.TOO_MANY_REQUESTS:
    case COGNITO_ERROR_CODES.LIMIT_EXCEEDED:
      return new RateLimitError('Too many requests. Please try again later.');

    case COGNITO_ERROR_CODES.PASSWORD_RESET_REQUIRED:
      return new AuthenticationError('Password reset required. Please reset your password.');

    case COGNITO_ERROR_CODES.USER_LAMBDA_VALIDATION:
      return new ValidationError('User validation failed');

    default:
      return new AppError('INTERNAL_ERROR', `Authentication service error: ${errorMessage}`, 500);
  }
}

export function mapDynamoDBError(error: Error): Error {
  const errorName = error.name;
  const errorMessage = error.message;

  switch (errorName) {
    case DYNAMODB_ERROR_CODES.CONDITIONAL_CHECK_FAILED:
      return new AppError('CONFLICT', 'Resource already exists or condition not met', 409);

    case DYNAMODB_ERROR_CODES.RESOURCE_NOT_FOUND:
      return new NotFoundError('Resource not found');

    case DYNAMODB_ERROR_CODES.PROVISIONED_THROUGHPUT_EXCEEDED:
      return new RateLimitError('Service temporarily unavailable. Please try again.');

    case DYNAMODB_ERROR_CODES.VALIDATION_EXCEPTION:
      return new ValidationError(errorMessage || 'Invalid data format');

    default:
      return new AppError('INTERNAL_ERROR', `Database error: ${errorMessage}`, 500);
  }
}

export function mapGenericError(error: Error): Error {
  // If already a domain error, return as-is
  if (
    error instanceof AuthenticationError ||
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof RateLimitError ||
    error instanceof AppError
  ) {
    return error;
  }

  // Check if it's a Cognito error
  if (error.name && Object.values(COGNITO_ERROR_CODES).includes(error.name as any)) {
    return mapCognitoError(error);
  }

  // Check if it's a DynamoDB error
  if (error.name && Object.values(DYNAMODB_ERROR_CODES).includes(error.name as any)) {
    return mapDynamoDBError(error);
  }

  // Default to internal error
  return new AppError('INTERNAL_ERROR', error.message || 'An unexpected error occurred', 500);
}

// User-friendly error messages
export function getUserFriendlyMessage(error: Error): string {
  if (error instanceof AuthenticationError) {
    return error.message;
  }

  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof NotFoundError) {
    return 'The requested resource was not found';
  }

  if (error instanceof AppError && error.statusCode === 409) {
    return error.message;
  }

  if (error instanceof RateLimitError) {
    return 'Too many requests. Please try again in a few minutes.';
  }

  if (error instanceof AppError && error.statusCode === 500) {
    return 'An unexpected error occurred. Please try again later.';
  }

  return 'An error occurred. Please try again.';
}
