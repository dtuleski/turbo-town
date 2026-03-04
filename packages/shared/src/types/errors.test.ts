/**
 * Unit tests for error classes
 */

import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  PaymentError,
} from './errors';

describe('AppError', () => {
  it('should create error with code, message, and status code', () => {
    const error = new AppError('TEST_ERROR', 'Test error message', 500);
    
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test error message');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('AppError');
  });

  it('should include details when provided', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const error = new AppError('TEST_ERROR', 'Test error', 400, details);
    
    expect(error.details).toEqual(details);
  });

  it('should serialize to JSON without sensitive data', () => {
    const error = new AppError('TEST_ERROR', 'Test error', 500, { sensitive: 'data' });
    const json = error.toJSON();
    
    expect(json).toEqual({
      code: 'TEST_ERROR',
      message: 'Test error',
      statusCode: 500,
    });
    expect(json).not.toHaveProperty('details');
    expect(json).not.toHaveProperty('stack');
  });

  it('should include full details in log format', () => {
    const details = { field: 'email' };
    const error = new AppError('TEST_ERROR', 'Test error', 500, details);
    const logFormat = error.toLogFormat();
    
    expect(logFormat.code).toBe('TEST_ERROR');
    expect(logFormat.message).toBe('Test error');
    expect(logFormat.statusCode).toBe(500);
    expect(logFormat.details).toEqual(details);
    expect(logFormat.stack).toBeDefined();
  });
});

describe('AuthenticationError', () => {
  it('should create authentication error with 401 status', () => {
    const error = new AuthenticationError('Invalid credentials');
    
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.message).toBe('Invalid credentials');
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('AuthenticationError');
  });
});

describe('AuthorizationError', () => {
  it('should create authorization error with 403 status', () => {
    const error = new AuthorizationError('Insufficient permissions');
    
    expect(error.code).toBe('AUTHZ_ERROR');
    expect(error.message).toBe('Insufficient permissions');
    expect(error.statusCode).toBe(403);
    expect(error.name).toBe('AuthorizationError');
  });
});

describe('ValidationError', () => {
  it('should create validation error with 400 status', () => {
    const error = new ValidationError('Invalid input');
    
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });
});

describe('NotFoundError', () => {
  it('should create not found error with 404 status', () => {
    const error = new NotFoundError('User');
    
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('NotFoundError');
  });
});

describe('RateLimitError', () => {
  it('should create rate limit error with 429 status', () => {
    const error = new RateLimitError('Too many requests');
    
    expect(error.code).toBe('RATE_LIMIT_ERROR');
    expect(error.message).toBe('Too many requests');
    expect(error.statusCode).toBe(429);
    expect(error.name).toBe('RateLimitError');
  });
});

describe('PaymentError', () => {
  it('should create payment error with 402 status', () => {
    const error = new PaymentError('Payment failed');
    
    expect(error.code).toBe('PAYMENT_ERROR');
    expect(error.message).toBe('Payment failed');
    expect(error.statusCode).toBe(402);
    expect(error.name).toBe('PaymentError');
  });
});
