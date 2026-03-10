/**
 * Zod validation schema for Achievement entity
 */
import { z } from 'zod';
import { AchievementType } from '../types/enums';
export declare const achievementSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    userId: z.ZodString;
    achievementType: z.ZodNativeEnum<typeof AchievementType>;
    progress: z.ZodNumber;
    completed: z.ZodBoolean;
    completedAt: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    achievementType: AchievementType;
    progress: number;
    completed: boolean;
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    completedAt?: Date | undefined;
}, {
    userId: string;
    achievementType: AchievementType;
    progress: number;
    completed: boolean;
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    completedAt?: Date | undefined;
}>;
export type AchievementInput = z.infer<typeof achievementSchema>;
//# sourceMappingURL=achievement.schema.d.ts.map