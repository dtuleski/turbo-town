import { randomUUID } from 'crypto';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  correlationId?: string;
  userId?: string;
  email?: string;
  operation?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  getCorrelationId(): string {
    if (!this.context.correlationId) {
      this.context.correlationId = randomUUID();
    }
    return this.context.correlationId;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...meta,
    };

    const logString = JSON.stringify(logEntry);

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.ERROR:
        console.error(logString);
        break;
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      this.log(LogLevel.DEBUG, message, meta);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, {
      ...meta,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  // Security event logging
  logSecurityEvent(event: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, `SECURITY_EVENT: ${event}`, {
      ...meta,
      securityEvent: true,
    });
  }

  // Authentication event logging
  logAuthEvent(event: string, success: boolean, meta?: Record<string, unknown>): void {
    this.log(success ? LogLevel.INFO : LogLevel.WARN, `AUTH_EVENT: ${event}`, {
      ...meta,
      authEvent: true,
      success,
    });
  }
}

// Singleton instance
export const logger = new Logger();
