/**
 * Zod validation schema for User entity
 */

import { z } from 'zod';
import { UserRole, SubscriptionTier } from '../types/enums';

export const emailSchema = z.string().email().max(255);

export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number');

export const userSchema = z.object({
  id: z.string().uuid().optional(),
  email: emailSchema,
  name: z.string().min(1).max(100),
  profilePictureUrl: z.string().url().optional(),
  role: z.nativeEnum(UserRole),
  tier: z.nativeEnum(SubscriptionTier),
  cognitoId: z.string().min(1).optional(),
  emailVerified: z.boolean().optional(),
  lastLoginAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const userCreateSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(100),
  password: passwordSchema,
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  profilePictureUrl: z.string().url().optional(),
});

export type UserInput = z.infer<typeof userSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
