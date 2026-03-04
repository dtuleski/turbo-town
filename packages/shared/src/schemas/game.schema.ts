/**
 * Zod validation schema for Game entity
 */

import { z } from 'zod';
import { GameStatus } from '../types/enums';

const validDifficulties = [12, 18, 24, 30, 36, 42, 48];

export const gameSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  themeId: z.string().uuid(),
  difficulty: z
    .number()
    .int()
    .refine((val) => validDifficulties.includes(val), {
      message: 'Difficulty must be 12, 18, 24, 30, 36, 42, or 48',
    }),
  status: z.nativeEnum(GameStatus),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  completionTime: z.number().positive().optional(),
  attempts: z.number().int().nonnegative(),
  score: z.number().positive().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const gameCreateSchema = z.object({
  userId: z.string().uuid(),
  themeId: z.string().uuid(),
  difficulty: z
    .number()
    .int()
    .refine((val) => validDifficulties.includes(val), {
      message: 'Difficulty must be 12, 18, 24, 30, 36, 42, or 48',
    }),
});

export const gameCompleteSchema = z.object({
  completionTime: z.number().positive(),
  attempts: z.number().int().positive(),
});

export type GameInput = z.infer<typeof gameSchema>;
export type GameCreateInput = z.infer<typeof gameCreateSchema>;
export type GameCompleteInput = z.infer<typeof gameCompleteSchema>;
