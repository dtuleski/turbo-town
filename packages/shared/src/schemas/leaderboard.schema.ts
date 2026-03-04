/**
 * Zod validation schema for LeaderboardEntry entity
 */

import { z } from 'zod';
import { TimePeriod } from '../types/enums';

export const leaderboardEntrySchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  userName: z.string().min(1).max(100),
  themeId: z.string().uuid(),
  difficulty: z.number().int().min(12).max(48),
  timePeriod: z.nativeEnum(TimePeriod),
  score: z.number().positive(),
  rank: z.number().int().positive(),
  completionTime: z.number().positive(),
  attempts: z.number().int().positive(),
  achievedAt: z.date(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type LeaderboardEntryInput = z.infer<typeof leaderboardEntrySchema>;
