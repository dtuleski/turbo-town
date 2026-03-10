/**
 * Zod validation schema for LeaderboardEntry entity
 */
import { z } from 'zod';
import { TimePeriod } from '../types/enums';
export declare const leaderboardEntrySchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    userId: z.ZodString;
    userName: z.ZodString;
    themeId: z.ZodString;
    difficulty: z.ZodNumber;
    timePeriod: z.ZodNativeEnum<typeof TimePeriod>;
    score: z.ZodNumber;
    rank: z.ZodNumber;
    completionTime: z.ZodNumber;
    attempts: z.ZodNumber;
    achievedAt: z.ZodDate;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    themeId: string;
    difficulty: number;
    completionTime: number;
    attempts: number;
    score: number;
    userName: string;
    timePeriod: TimePeriod;
    rank: number;
    achievedAt: Date;
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}, {
    userId: string;
    themeId: string;
    difficulty: number;
    completionTime: number;
    attempts: number;
    score: number;
    userName: string;
    timePeriod: TimePeriod;
    rank: number;
    achievedAt: Date;
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}>;
export type LeaderboardEntryInput = z.infer<typeof leaderboardEntrySchema>;
//# sourceMappingURL=leaderboard.schema.d.ts.map