/**
 * Zod validation schema for User entity
 */
import { z } from 'zod';
import { UserRole, SubscriptionTier } from '../types/enums';
export declare const emailSchema: z.ZodString;
export declare const passwordSchema: z.ZodString;
export declare const userSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
    name: z.ZodString;
    profilePictureUrl: z.ZodOptional<z.ZodString>;
    role: z.ZodNativeEnum<typeof UserRole>;
    tier: z.ZodNativeEnum<typeof SubscriptionTier>;
    cognitoId: z.ZodOptional<z.ZodString>;
    emailVerified: z.ZodOptional<z.ZodBoolean>;
    lastLoginAt: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    role: UserRole;
    tier: SubscriptionTier;
    id?: string | undefined;
    profilePictureUrl?: string | undefined;
    cognitoId?: string | undefined;
    emailVerified?: boolean | undefined;
    lastLoginAt?: Date | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}, {
    email: string;
    name: string;
    role: UserRole;
    tier: SubscriptionTier;
    id?: string | undefined;
    profilePictureUrl?: string | undefined;
    cognitoId?: string | undefined;
    emailVerified?: boolean | undefined;
    lastLoginAt?: Date | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}>;
export declare const userCreateSchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    password: string;
}, {
    email: string;
    name: string;
    password: string;
}>;
export declare const userUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    profilePictureUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    profilePictureUrl?: string | undefined;
}, {
    name?: string | undefined;
    profilePictureUrl?: string | undefined;
}>;
export type UserInput = z.infer<typeof userSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
//# sourceMappingURL=user.schema.d.ts.map