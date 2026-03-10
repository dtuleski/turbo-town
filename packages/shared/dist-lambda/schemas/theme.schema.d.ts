/**
 * Zod validation schema for Theme entity
 */
import { z } from 'zod';
import { ThemeCategory, ThemeStatus } from '../types/enums';
export declare const themePairSchema: z.ZodObject<{
    card1ImageUrl: z.ZodString;
    card2ImageUrl: z.ZodString;
    card1AltText: z.ZodString;
    card2AltText: z.ZodString;
}, "strip", z.ZodTypeAny, {
    card1ImageUrl: string;
    card2ImageUrl: string;
    card1AltText: string;
    card2AltText: string;
}, {
    card1ImageUrl: string;
    card2ImageUrl: string;
    card1AltText: string;
    card2AltText: string;
}>;
export declare const themeSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodString;
    category: z.ZodNativeEnum<typeof ThemeCategory>;
    status: z.ZodNativeEnum<typeof ThemeStatus>;
    imageUrls: z.ZodArray<z.ZodString, "many">;
    pairs: z.ZodArray<z.ZodObject<{
        card1ImageUrl: z.ZodString;
        card2ImageUrl: z.ZodString;
        card1AltText: z.ZodString;
        card2AltText: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        card1ImageUrl: string;
        card2ImageUrl: string;
        card1AltText: string;
        card2AltText: string;
    }, {
        card1ImageUrl: string;
        card2ImageUrl: string;
        card1AltText: string;
        card2AltText: string;
    }>, "many">;
    difficulty: z.ZodNumber;
    createdBy: z.ZodString;
    publishedAt: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    name: string;
    status: ThemeStatus;
    difficulty: number;
    description: string;
    category: ThemeCategory;
    imageUrls: string[];
    pairs: {
        card1ImageUrl: string;
        card2ImageUrl: string;
        card1AltText: string;
        card2AltText: string;
    }[];
    createdBy: string;
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    publishedAt?: Date | undefined;
}, {
    name: string;
    status: ThemeStatus;
    difficulty: number;
    description: string;
    category: ThemeCategory;
    imageUrls: string[];
    pairs: {
        card1ImageUrl: string;
        card2ImageUrl: string;
        card1AltText: string;
        card2AltText: string;
    }[];
    createdBy: string;
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    publishedAt?: Date | undefined;
}>;
export declare const themeCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    category: z.ZodNativeEnum<typeof ThemeCategory>;
    pairs: z.ZodArray<z.ZodObject<{
        card1ImageUrl: z.ZodString;
        card2ImageUrl: z.ZodString;
        card1AltText: z.ZodString;
        card2AltText: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        card1ImageUrl: string;
        card2ImageUrl: string;
        card1AltText: string;
        card2AltText: string;
    }, {
        card1ImageUrl: string;
        card2ImageUrl: string;
        card1AltText: string;
        card2AltText: string;
    }>, "many">;
    difficulty: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    difficulty: number;
    description: string;
    category: ThemeCategory;
    pairs: {
        card1ImageUrl: string;
        card2ImageUrl: string;
        card1AltText: string;
        card2AltText: string;
    }[];
}, {
    name: string;
    difficulty: number;
    description: string;
    category: ThemeCategory;
    pairs: {
        card1ImageUrl: string;
        card2ImageUrl: string;
        card1AltText: string;
        card2AltText: string;
    }[];
}>;
export declare const themeUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof ThemeStatus>>;
    difficulty: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    status?: ThemeStatus | undefined;
    difficulty?: number | undefined;
    description?: string | undefined;
}, {
    name?: string | undefined;
    status?: ThemeStatus | undefined;
    difficulty?: number | undefined;
    description?: string | undefined;
}>;
export type ThemeInput = z.infer<typeof themeSchema>;
export type ThemeCreateInput = z.infer<typeof themeCreateSchema>;
export type ThemeUpdateInput = z.infer<typeof themeUpdateSchema>;
//# sourceMappingURL=theme.schema.d.ts.map