"use strict";
/**
 * Zod validation schema for Game entity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameCompleteSchema = exports.gameCreateSchema = exports.gameSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../types/enums");
const validDifficulties = [12, 18, 24, 30, 36, 42, 48];
exports.gameSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    userId: zod_1.z.string().uuid(),
    themeId: zod_1.z.string().uuid(),
    difficulty: zod_1.z
        .number()
        .int()
        .refine((val) => validDifficulties.includes(val), {
        message: 'Difficulty must be 12, 18, 24, 30, 36, 42, or 48',
    }),
    status: zod_1.z.nativeEnum(enums_1.GameStatus),
    startedAt: zod_1.z.date().optional(),
    completedAt: zod_1.z.date().optional(),
    completionTime: zod_1.z.number().positive().optional(),
    attempts: zod_1.z.number().int().nonnegative(),
    score: zod_1.z.number().positive().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.gameCreateSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    themeId: zod_1.z.string().uuid(),
    difficulty: zod_1.z
        .number()
        .int()
        .refine((val) => validDifficulties.includes(val), {
        message: 'Difficulty must be 12, 18, 24, 30, 36, 42, or 48',
    }),
});
exports.gameCompleteSchema = zod_1.z.object({
    completionTime: zod_1.z.number().positive(),
    attempts: zod_1.z.number().int().positive(),
});
//# sourceMappingURL=game.schema.js.map