/**
 * Error class definitions for the memory game application
 */
export declare class AppError extends Error {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, any> | undefined;
    constructor(code: string, message: string, statusCode?: number, details?: Record<string, any> | undefined);
    toJSON(): {
        code: string;
        message: string;
        statusCode: number;
    };
    toLogFormat(): {
        code: string;
        message: string;
        statusCode: number;
        details: Record<string, any> | undefined;
        stack: string | undefined;
    };
}
export declare class AuthenticationError extends AppError {
    constructor(message: string, details?: Record<string, any>);
}
export declare class AuthorizationError extends AppError {
    constructor(message: string, details?: Record<string, any>);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, any>);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, details?: Record<string, any>);
}
export declare class RateLimitError extends AppError {
    constructor(message: string, details?: Record<string, any>);
}
export declare class PaymentError extends AppError {
    constructor(message: string, details?: Record<string, any>);
}
//# sourceMappingURL=errors.d.ts.map