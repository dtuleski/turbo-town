/**
 * Zod validation schema for Game entity
 */
import { z } from 'zod';
import { GameStatus } from '../types/enums';
export declare const gameSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    userId: z.ZodString;
    themeId: z.ZodString;
    difficulty: z.ZodEffects<z.ZodNumber, number, number>;
    status: z.ZodNativeEnum<typeof GameStatus>;
    startedAt: z.ZodOptional<z.ZodDate>;
    completedAt: z.ZodOptional<z.ZodDate>;
    completionTime: z.ZodOptional<z.ZodNumber>;
    attempts: z.ZodNumber;
    score: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    status: GameStatus;
    userId: string;
    themeId: string;
    difficulty: number;
    attempts: number;
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    startedAt?: Date | undefined;
    completedAt?: Date | undefined;
    completionTime?: number | undefined;
    score?: number | undefined;
}, {
    status: GameStatus;
    userId: string;
    themeId: string;
    difficulty: number;
    attempts: number;
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    startedAt?: Date | undefined;
    completedAt?: Date | undefined;
    completionTime?: number | undefined;
    score?: number | undefined;
}>;
export declare const gameCreateSchema: z.ZodObject<{
    userId: z.ZodString;
    themeId: z.ZodString;
    difficulty: z.ZodEffects<z.ZodNumber, number, number>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    themeId: string;
    difficulty: number;
}, {
    userId: string;
    themeId: string;
    difficulty: number;
}>;
export declare const gameCompleteSchema: z.ZodObject<{
    completionTime: z.ZodNumber;
    attempts: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    completionTime: number;
    attempts: number;
}, {
    completionTime: number;
    attempts: number;
}>;
export type GameInput = z.infer<typeof gameSchema>;
export type GameCreateInput = z.infer<typeof gameCreateSchema>;
export type GameCompleteInput = z.infer<typeof gameCompleteSchema>;
//# sourceMappingURL=game.schema.d.ts.map