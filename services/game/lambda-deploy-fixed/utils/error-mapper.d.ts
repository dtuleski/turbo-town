/**
 * Map DynamoDB errors to domain errors
 */
export declare function mapDynamoDBError(error: Error): Error;
/**
 * Map EventBridge errors to domain errors
 */
export declare function mapEventBridgeError(error: Error): Error;
/**
 * Sanitize error for client response
 * Only expose known domain errors, hide internal errors
 */
export declare function sanitizeError(error: Error): Error;
/**
 * Create user-friendly error messages
 */
export declare const ErrorMessages: {
    RATE_LIMIT_EXCEEDED: (resetAt: Date | string) => string;
    INVALID_COMPLETION_TIME: (minTime: number, providedTime: number) => string;
    INVALID_ATTEMPTS: (minAttempts: number, providedAttempts: number) => string;
    GAME_NOT_FOUND: string;
    GAME_NOT_OWNED: string;
    GAME_ALREADY_COMPLETED: string;
    THEME_NOT_FOUND: string;
    THEME_NOT_PUBLISHED: string;
    PAID_FEATURE_REQUIRED: (feature: string, requiredTiers: string[]) => string;
    SUBSCRIPTION_NOT_FOUND: string;
};
/**
 * Error codes for client handling
 */
export declare const ErrorCodes: {
    RATE_LIMIT_EXCEEDED: string;
    INVALID_COMPLETION: string;
    INVALID_COMPLETION_TIME: string;
    INVALID_ATTEMPTS: string;
    GAME_NOT_FOUND: string;
    GAME_NOT_OWNED: string;
    GAME_ALREADY_COMPLETED: string;
    THEME_NOT_FOUND: string;
    THEME_NOT_PUBLISHED: string;
    PAID_FEATURE_REQUIRED: string;
    SUBSCRIPTION_NOT_FOUND: string;
    VALIDATION_ERROR: string;
    NOT_FOUND: string;
    FORBIDDEN: string;
    INTERNAL_ERROR: string;
};
//# sourceMappingURL=error-mapper.d.ts.map