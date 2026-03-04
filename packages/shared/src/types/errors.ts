/**
 * Error class definitions for the memory game application
 */

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }

  toLogFormat() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack,
    };
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('AUTH_ERROR', message, 401, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('AUTHZ_ERROR', message, 403, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, details?: Record<string, any>) {
    super('NOT_FOUND', `${resource} not found`, 404, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('RATE_LIMIT_ERROR', message, 429, details);
  }
}

export class PaymentError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('PAYMENT_ERROR', message, 402, details);
  }
}
