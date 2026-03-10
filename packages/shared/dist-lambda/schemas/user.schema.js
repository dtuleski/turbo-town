"use strict";
/**
 * Zod validation schema for User entity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.userUpdateSchema = exports.userCreateSchema = exports.userSchema = exports.passwordSchema = exports.emailSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../types/enums");
exports.emailSchema = zod_1.z.string().email().max(255);
exports.passwordSchema = zod_1.z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number');
exports.userSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    email: exports.emailSchema,
    name: zod_1.z.string().min(1).max(100),
    profilePictureUrl: zod_1.z.string().url().optional(),
    role: zod_1.z.nativeEnum(enums_1.UserRole),
    tier: zod_1.z.nativeEnum(enums_1.SubscriptionTier),
    cognitoId: zod_1.z.string().min(1).optional(),
    emailVerified: zod_1.z.boolean().optional(),
    lastLoginAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.userCreateSchema = zod_1.z.object({
    email: exports.emailSchema,
    name: zod_1.z.string().min(1).max(100),
    password: exports.passwordSchema,
});
exports.userUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    profilePictureUrl: zod_1.z.string().url().optional(),
});
//# sourceMappingURL=user.schema.js.map