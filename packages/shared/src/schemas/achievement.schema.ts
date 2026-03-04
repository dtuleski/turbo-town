/**
 * Zod validation schema for Achievement entity
 */

import { z } from 'zod';
import { AchievementType } from '../types/enums';

export const achievementSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  achievementType: z.nativeEnum(AchievementType),
  progress: z.number().int().min(0).max(100),
  completed: z.boolean(),
  completedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type AchievementInput = z.infer<typeof achievementSchema>;
