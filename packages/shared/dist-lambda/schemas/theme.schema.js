"use strict";
/**
 * Zod validation schema for Theme entity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.themeUpdateSchema = exports.themeCreateSchema = exports.themeSchema = exports.themePairSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../types/enums");
exports.themePairSchema = zod_1.z.object({
    card1ImageUrl: zod_1.z.string().url(),
    card2ImageUrl: zod_1.z.string().url(),
    card1AltText: zod_1.z.string().min(1).max(200),
    card2AltText: zod_1.z.string().min(1).max(200),
});
exports.themeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().min(1).max(500),
    category: zod_1.z.nativeEnum(enums_1.ThemeCategory),
    status: zod_1.z.nativeEnum(enums_1.ThemeStatus),
    imageUrls: zod_1.z.array(zod_1.z.string().url()).min(1),
    pairs: zod_1.z.array(exports.themePairSchema).min(12).max(48),
    difficulty: zod_1.z.number().int().min(1).max(5),
    createdBy: zod_1.z.string().uuid(),
    publishedAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.themeCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().min(1).max(500),
    category: zod_1.z.nativeEnum(enums_1.ThemeCategory),
    pairs: zod_1.z.array(exports.themePairSchema).min(12).max(48),
    difficulty: zod_1.z.number().int().min(1).max(5),
});
exports.themeUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().min(1).max(500).optional(),
    status: zod_1.z.nativeEnum(enums_1.ThemeStatus).optional(),
    difficulty: zod_1.z.number().int().min(1).max(5).optional(),
});
//# sourceMappingURL=theme.schema.js.map