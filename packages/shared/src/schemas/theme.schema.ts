/**
 * Zod validation schema for Theme entity
 */

import { z } from 'zod';
import { ThemeCategory, ThemeStatus } from '../types/enums';

export const themePairSchema = z.object({
  card1ImageUrl: z.string().url(),
  card2ImageUrl: z.string().url(),
  card1AltText: z.string().min(1).max(200),
  card2AltText: z.string().min(1).max(200),
});

export const themeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.nativeEnum(ThemeCategory),
  status: z.nativeEnum(ThemeStatus),
  imageUrls: z.array(z.string().url()).min(1),
  pairs: z.array(themePairSchema).min(12).max(48),
  difficulty: z.number().int().min(1).max(5),
  createdBy: z.string().uuid(),
  publishedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const themeCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.nativeEnum(ThemeCategory),
  pairs: z.array(themePairSchema).min(12).max(48),
  difficulty: z.number().int().min(1).max(5),
});

export const themeUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  status: z.nativeEnum(ThemeStatus).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

export type ThemeInput = z.infer<typeof themeSchema>;
export type ThemeCreateInput = z.infer<typeof themeCreateSchema>;
export type ThemeUpdateInput = z.infer<typeof themeUpdateSchema>;
