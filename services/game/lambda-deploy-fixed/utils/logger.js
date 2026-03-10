"use strict";
/**
 * Structured JSON logger for CloudWatch Logs
 * Provides correlation ID tracking and context enrichment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
class Logger {
    constructor() {
        this.context = {};
        this.logLevel = process.env.LOG_LEVEL || 'INFO';
    }
    /**
     * Set context that will be included in all subsequent logs
     */
    setContext(context) {
        this.context = { ...this.context, ...context };
    }
    /**
     * Clear all context
     */
    clearContext() {
        this.context = {};
    }
    /**
     * Log debug message
     */
    debug(message, meta) {
        if (this.shouldLog('DEBUG')) {
            this.log('DEBUG', message, meta);
        }
    }
    /**
     * Log info message
     */
    info(message, meta) {
        if (this.shouldLog('INFO')) {
            this.log('INFO', message, meta);
        }
    }
    /**
     * Log warning message
     */
    warn(message, meta) {
        if (this.shouldLog('WARN')) {
            this.log('WARN', message, meta);
        }
    }
    /**
     * Log error message
     */
    error(message, error, meta) {
        if (this.shouldLog('ERROR')) {
            this.log('ERROR', message, {
                ...meta,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
            });
        }
    }
    /**
     * Internal log method
     */
    log(level, message, meta) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...this.context,
            ...meta,
        };
        const output = JSON.stringify(logEntry);
        if (level === 'ERROR') {
            console.error(output);
        }
        else {
            console.log(output);
        }
    }
    /**
     * Check if log level should be logged
     */
    shouldLog(level) {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }
}
// Singleton instance
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map