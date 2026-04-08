/**
 * Structured JSON logger for CloudWatch Logs
 * Provides correlation ID tracking and context enrichment
 */
interface LogContext {
    [key: string]: unknown;
}
declare class Logger {
    private context;
    private logLevel;
    constructor();
    /**
     * Set context that will be included in all subsequent logs
     */
    setContext(context: LogContext): void;
    /**
     * Clear all context
     */
    clearContext(): void;
    /**
     * Log debug message
     */
    debug(message: string, meta?: LogContext): void;
    /**
     * Log info message
     */
    info(message: string, meta?: LogContext): void;
    /**
     * Log warning message
     */
    warn(message: string, meta?: LogContext): void;
    /**
     * Log error message
     */
    error(message: string, error: Error, meta?: LogContext): void;
    /**
     * Internal log method
     */
    private log;
    /**
     * Check if log level should be logged
     */
    private shouldLog;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map