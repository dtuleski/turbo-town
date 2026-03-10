"use strict";
/**
 * Rate limit configurations by subscription tier
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMITS = void 0;
const enums_1 = require("../types/enums");
exports.RATE_LIMITS = {
    [enums_1.SubscriptionTier.Free]: {
        gamesPerPeriod: 3,
        periodHours: 24,
        maxPairs: 12,
    },
    [enums_1.SubscriptionTier.Light]: {
        gamesPerPeriod: 10,
        periodHours: 24,
        maxPairs: 24,
    },
    [enums_1.SubscriptionTier.Standard]: {
        gamesPerPeriod: 30,
        periodHours: 24,
        maxPairs: 36,
    },
    [enums_1.SubscriptionTier.Premium]: {
        gamesPerPeriod: 100,
        periodHours: 24,
        maxPairs: 48,
    },
};
//# sourceMappingURL=rate-limits.js.map