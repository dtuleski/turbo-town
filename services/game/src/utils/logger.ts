/**
 * Structured JSON logger for CloudWatch Logs
 * Provides correlation ID tracking and context enrichment
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'INFO';
  }

  /**
   * Set context that will be included in all subsequent logs
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: LogContext): void {
    if (this.shouldLog('DEBUG')) {
      this.log('DEBUG', message, meta);
    }
  }

  /**
   * Log info message
   */
  info(message: string, meta?: LogContext): void {
    if (this.shouldLog('INFO')) {
      this.log('INFO', message, meta);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: LogContext): void {
    if (this.shouldLog('WARN')) {
      this.log('WARN', message, meta);
    }
  }

  /**
   * Log error message
   */
  error(message: string, error: Error, meta?: LogContext): void {
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
  private log(level: LogLevel, message: string, meta?: LogContext): void {
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
    } else {
      console.log(output);
    }
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }
}

// Singleton instance
export const logger = new Logger();
