"use strict";
/**
 * Zod validation schema for LeaderboardEntry entity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboardEntrySchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../types/enums");
exports.leaderboardEntrySchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    userId: zod_1.z.string().uuid(),
    userName: zod_1.z.string().min(1).max(100),
    themeId: zod_1.z.string().uuid(),
    difficulty: zod_1.z.number().int().min(12).max(48),
    timePeriod: zod_1.z.nativeEnum(enums_1.TimePeriod),
    score: zod_1.z.number().positive(),
    rank: zod_1.z.number().int().positive(),
    completionTime: zod_1.z.number().positive(),
    attempts: zod_1.z.number().int().positive(),
    achievedAt: zod_1.z.date(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
//# sourceMappingURL=leaderboard.schema.js.map