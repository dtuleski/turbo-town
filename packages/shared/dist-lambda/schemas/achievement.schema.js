"use strict";
/**
 * Zod validation schema for Achievement entity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.achievementSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../types/enums");
exports.achievementSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    userId: zod_1.z.string().uuid(),
    achievementType: zod_1.z.nativeEnum(enums_1.AchievementType),
    progress: zod_1.z.number().int().min(0).max(100),
    completed: zod_1.z.boolean(),
    completedAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
//# sourceMappingURL=achievement.schema.js.map