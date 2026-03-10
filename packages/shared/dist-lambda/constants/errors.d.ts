/**
 * Error code definitions
 */
export declare const ERROR_CODES: {
    readonly AUTH_INVALID_CREDENTIALS: "AUTH_001";
    readonly AUTH_EMAIL_NOT_VERIFIED: "AUTH_002";
    readonly AUTH_TOKEN_EXPIRED: "AUTH_003";
    readonly AUTH_TOKEN_INVALID: "AUTH_004";
    readonly AUTHZ_INSUFFICIENT_PERMISSIONS: "AUTHZ_001";
    readonly AUTHZ_TIER_REQUIRED: "AUTHZ_002";
    readonly VAL_INVALID_INPUT: "VAL_001";
    readonly VAL_MISSING_REQUIRED_FIELD: "VAL_002";
    readonly VAL_INVALID_FORMAT: "VAL_003";
    readonly RATE_LIMIT_EXCEEDED: "RATE_001";
    readonly RATE_DAILY_LIMIT_REACHED: "RATE_002";
    readonly PAY_PAYMENT_FAILED: "PAY_001";
    readonly PAY_SUBSCRIPTION_INACTIVE: "PAY_002";
    readonly PAY_INVALID_TIER: "PAY_003";
    readonly GAME_INVALID_DIFFICULTY: "GAME_001";
    readonly GAME_THEME_NOT_AVAILABLE: "GAME_002";
    readonly GAME_ALREADY_COMPLETED: "GAME_003";
    readonly NF_USER_NOT_FOUND: "NF_001";
    readonly NF_GAME_NOT_FOUND: "NF_002";
    readonly NF_THEME_NOT_FOUND: "NF_003";
    readonly NF_SUBSCRIPTION_NOT_FOUND: "NF_004";
    readonly SRV_INTERNAL_ERROR: "SRV_001";
    readonly SRV_SERVICE_UNAVAILABLE: "SRV_002";
};
//# sourceMappingURL=errors.d.ts.map