/**
 * Unit tests for Result type pattern
 */

import { success, failure, Result } from './results';
import { AppError, ValidationError } from './errors';

describe('Result Type Pattern', () => {
  describe('success', () => {
    it('should create success result with data', () => {
      const result = success({ id: '123', name: 'Test' });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: '123', name: 'Test' });
      }
    });

    it('should work with primitive types', () => {
      const stringResult = success('test string');
      const numberResult = success(42);
      const booleanResult = success(true);
      
      expect(stringResult.success).toBe(true);
      expect(numberResult.success).toBe(true);
      expect(booleanResult.success).toBe(true);
    });
  });

  describe('failure', () => {
    it('should create failure result with error', () => {
      const error = new ValidationError('Invalid input');
      const result = failure(error);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('type discrimination', () => {
    it('should allow type-safe access to data on success', () => {
      const result: Result<string> = success('test');
      
      if (result.success) {
        const data: string = result.data;
        expect(data).toBe('test');
      }
    });

    it('should allow type-safe access to error on failure', () => {
      const error = new AppError('TEST', 'Test error');
      const result: Result<string> = failure(error);
      
      if (!result.success) {
        const err: AppError = result.error;
        expect(err.code).toBe('TEST');
      }
    });
  });

  describe('practical usage', () => {
    function divide(a: number, b: number): Result<number> {
      if (b === 0) {
        return failure(new ValidationError('Division by zero'));
      }
      return success(a / b);
    }

    it('should handle successful operation', () => {
      const result = divide(10, 2);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(5);
      }
    });

    it('should handle failed operation', () => {
      const result = divide(10, 0);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Division by zero');
      }
    });
  });
});
