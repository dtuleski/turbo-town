"use strict";
/**
 * Subscription pricing configurations (amounts in cents)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBSCRIPTION_PRICING = void 0;
const enums_1 = require("../types/enums");
exports.SUBSCRIPTION_PRICING = {
    [enums_1.SubscriptionTier.Light]: {
        monthly: 199, // $1.99
        annual: 1990, // $19.90 (17% discount)
    },
    [enums_1.SubscriptionTier.Standard]: {
        monthly: 599, // $5.99
        annual: 5990, // $59.90 (17% discount)
    },
    [enums_1.SubscriptionTier.Premium]: {
        monthly: 999, // $9.99
        annual: 9990, // $99.90 (17% discount)
    },
};
//# sourceMappingURL=pricing.js.map