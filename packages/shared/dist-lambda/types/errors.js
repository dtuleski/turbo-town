"use strict";
/**
 * Error class definitions for the memory game application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentError = exports.RateLimitError = exports.NotFoundError = exports.ValidationError = exports.AuthorizationError = exports.AuthenticationError = exports.AppError = void 0;
class AppError extends Error {
    constructor(code, message, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
        this.details = details;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
        };
    }
    toLogFormat() {
        return {
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
            stack: this.stack,
        };
    }
}
exports.AppError = AppError;
class AuthenticationError extends AppError {
    constructor(message, details) {
        super('AUTH_ERROR', message, 401, details);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message, details) {
        super('AUTHZ_ERROR', message, 403, details);
    }
}
exports.AuthorizationError = AuthorizationError;
class ValidationError extends AppError {
    constructor(message, details) {
        super('VALIDATION_ERROR', message, 400, details);
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends AppError {
    constructor(resource, details) {
        super('NOT_FOUND', `${resource} not found`, 404, details);
    }
}
exports.NotFoundError = NotFoundError;
class RateLimitError extends AppError {
    constructor(message, details) {
        super('RATE_LIMIT_ERROR', message, 429, details);
    }
}
exports.RateLimitError = RateLimitError;
class PaymentError extends AppError {
    constructor(message, details) {
        super('PAYMENT_ERROR', message, 402, details);
    }
}
exports.PaymentError = PaymentError;
//# sourceMappingURL=errors.js.map