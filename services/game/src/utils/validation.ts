import { z } from 'zod';
import { StartGameInput, CompleteGameInput, GameHistoryInput } from '../types';

/**
 * Validation schemas using Zod
 */

export const startGameInputSchema = z.object({
  themeId: z.string().min(1, 'Theme ID is required'),
  difficulty: z.number().int().min(1).max(5, 'Difficulty must be between 1 and 5'),
});

export const completeGameInputSchema = z.object({
  gameId: z.string().uuid('Game ID must be a valid UUID'),
  completionTime: z.number().positive('Completion time must be positive'),
  attempts: z.number().int().positive('Attempts must be a positive integer'),
});

export const gameHistoryInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['date', 'score', 'time']).optional().default('date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  themeId: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Validate StartGameInput
 */
export function validateStartGameInput(input: unknown): StartGameInput {
  return startGameInputSchema.parse(input);
}

/**
 * Validate CompleteGameInput
 */
export function validateCompleteGameInput(input: unknown): CompleteGameInput {
  return completeGameInputSchema.parse(input);
}

/**
 * Validate GameHistoryInput
 */
export function validateGameHistoryInput(input: unknown): GameHistoryInput {
  return gameHistoryInputSchema.parse(input);
}

/**
 * Sanitize string input (remove potentially dangerous characters)
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate completion time is within acceptable range for difficulty
 */
export function validateCompletionTime(
  completionTime: number,
  difficulty: number
): { valid: boolean; reason?: string } {
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
export function validateAttempts(
  attempts: number,
  difficulty: number
): { valid: boolean; reason?: string } {
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
function getPairsForDifficulty(difficulty: number): number {
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
