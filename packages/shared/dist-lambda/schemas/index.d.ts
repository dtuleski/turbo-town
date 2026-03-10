/**
 * Schemas module barrel exports and validation utilities
 */
import { z } from 'zod';
import { Result } from '../types/results';
export * from './user.schema';
export * from './game.schema';
export * from './theme.schema';
export * from './subscription.schema';
export * from './leaderboard.schema';
export * from './achievement.schema';
export declare function getCachedSchema<T>(key: string, schemaFactory: () => z.ZodSchema<T>): z.ZodSchema<T>;
export declare function validate<T>(schema: z.ZodSchema<T>, data: unknown): Result<T>;
//# sourceMappingURL=index.d.ts.map