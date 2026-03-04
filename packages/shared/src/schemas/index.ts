/**
 * Schemas module barrel exports and validation utilities
 */

import { z } from 'zod';
import { ValidationError } from '../types/errors';
import { Result, success, failure } from '../types/results';

export * from './user.schema';
export * from './game.schema';
export * from './theme.schema';
export * from './subscription.schema';
export * from './leaderboard.schema';
export * from './achievement.schema';

// Schema cache for performance
const schemaCache = new Map<string, z.ZodSchema>();

export function getCachedSchema<T>(
  key: string,
  schemaFactory: () => z.ZodSchema<T>
): z.ZodSchema<T> {
  if (!schemaCache.has(key)) {
    schemaCache.set(key, schemaFactory());
  }
  return schemaCache.get(key) as z.ZodSchema<T>;
}

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): Result<T> {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return success(result.data);
    }
    return failure(
      new ValidationError('Validation failed', {
        errors: result.error.errors,
      })
    );
  } catch (error) {
    return failure(new ValidationError('Validation error', { error }));
  }
}
