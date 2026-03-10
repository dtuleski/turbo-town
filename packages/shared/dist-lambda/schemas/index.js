"use strict";
/**
 * Schemas module barrel exports and validation utilities
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedSchema = getCachedSchema;
exports.validate = validate;
const errors_1 = require("../types/errors");
const results_1 = require("../types/results");
__exportStar(require("./user.schema"), exports);
__exportStar(require("./game.schema"), exports);
__exportStar(require("./theme.schema"), exports);
__exportStar(require("./subscription.schema"), exports);
__exportStar(require("./leaderboard.schema"), exports);
__exportStar(require("./achievement.schema"), exports);
// Schema cache for performance
const schemaCache = new Map();
function getCachedSchema(key, schemaFactory) {
    if (!schemaCache.has(key)) {
        schemaCache.set(key, schemaFactory());
    }
    return schemaCache.get(key);
}
function validate(schema, data) {
    try {
        const result = schema.safeParse(data);
        if (result.success) {
            return (0, results_1.success)(result.data);
        }
        return (0, results_1.failure)(new errors_1.ValidationError('Validation failed', {
            errors: result.error.errors,
        }));
    }
    catch (error) {
        return (0, results_1.failure)(new errors_1.ValidationError('Validation error', { error }));
    }
}
//# sourceMappingURL=index.js.map