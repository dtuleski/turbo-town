/**
 * Custom error classes for the game service
 */
export declare class ValidationError extends Error {
    constructor(message: string);
}
export declare class NotFoundError extends Error {
    constructor(message: string);
}
export declare class AuthorizationError extends Error {
    constructor(message: string);
}
export declare class ConflictError extends Error {
    constructor(message: string);
}
export declare class InternalError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map