import { z } from 'zod';
import { StartGameInput, CompleteGameInput, GameHistoryInput } from '../types';
/**
 * Validation schemas using Zod
 */
export declare const startGameInputSchema: z.ZodObject<{
    themeId: z.ZodString;
    difficulty: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    themeId: string;
    difficulty: number;
}, {
    themeId: string;
    difficulty: number;
}>;
export declare const completeGameInputSchema: z.ZodObject<{
    gameId: z.ZodString;
    completionTime: z.ZodNumber;
    attempts: z.ZodNumber;
    correctAnswers: z.ZodOptional<z.ZodNumber>;
    totalQuestions: z.ZodOptional<z.ZodNumber>;
    wordsFound: z.ZodOptional<z.ZodNumber>;
    totalWords: z.ZodOptional<z.ZodNumber>;
    hintsUsed: z.ZodOptional<z.ZodNumber>;
    pauseCount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    completionTime: number;
    attempts: number;
    gameId: string;
    correctAnswers?: number | undefined;
    totalQuestions?: number | undefined;
    wordsFound?: number | undefined;
    totalWords?: number | undefined;
    hintsUsed?: number | undefined;
    pauseCount?: number | undefined;
}, {
    completionTime: number;
    attempts: number;
    gameId: string;
    correctAnswers?: number | undefined;
    totalQuestions?: number | undefined;
    wordsFound?: number | undefined;
    totalWords?: number | undefined;
    hintsUsed?: number | undefined;
    pauseCount?: number | undefined;
}>;
export declare const gameHistoryInputSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["date", "score", "time"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    themeId: z.ZodOptional<z.ZodString>;
    difficulty: z.ZodOptional<z.ZodNumber>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sortOrder: "asc" | "desc";
    page: number;
    pageSize: number;
    sortBy: "date" | "score" | "time";
    themeId?: string | undefined;
    difficulty?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    themeId?: string | undefined;
    difficulty?: number | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    sortBy?: "date" | "score" | "time" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
/**
 * Validate StartGameInput
 */
export declare function validateStartGameInput(input: unknown): StartGameInput;
/**
 * Validate CompleteGameInput
 */
export declare function validateCompleteGameInput(input: unknown): CompleteGameInput;
/**
 * Validate GameHistoryInput
 */
export declare function validateGameHistoryInput(input: unknown): GameHistoryInput;
/**
 * Sanitize string input (remove potentially dangerous characters)
 */
export declare function sanitizeString(input: string): string;
/**
 * Validate completion time is within acceptable range for difficulty
 */
export declare function validateCompletionTime(completionTime: number, difficulty: number): {
    valid: boolean;
    reason?: string;
};
/**
 * Validate attempts is within acceptable range for difficulty
 */
export declare function validateAttempts(attempts: number, difficulty: number): {
    valid: boolean;
    reason?: string;
};
//# sourceMappingURL=validation.d.ts.map