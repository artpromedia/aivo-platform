/**
 * Logger for rate limiter
 *
 * Provides a pluggable logging interface
 */

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Type alias for backward compatibility */
export type RateLimiterLogger = Logger;

/**
 * Default console logger
 */
class ConsoleLogger implements Logger {
  private prefix = '[rate-limiter]';

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.debug(`${this.prefix} ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(`${this.prefix} ${message}`, meta ? JSON.stringify(meta) : '');
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`${this.prefix} ${message}`, meta ? JSON.stringify(meta) : '');
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`${this.prefix} ${message}`, meta ? JSON.stringify(meta) : '');
  }
}

let currentLogger: Logger = new ConsoleLogger();

/**
 * Get the current logger instance
 */
export const logger: Logger = {
  debug: (message, meta) => {
    currentLogger.debug(message, meta);
  },
  info: (message, meta) => {
    currentLogger.info(message, meta);
  },
  warn: (message, meta) => {
    currentLogger.warn(message, meta);
  },
  error: (message, meta) => {
    currentLogger.error(message, meta);
  },
};

/**
 * Set a custom logger implementation
 */
export function setLogger(customLogger: Logger): void {
  currentLogger = customLogger;
}

/** Alias for setLogger for backward compatibility */
export const setGlobalLogger = setLogger;

/**
 * A no-op logger that discards all log messages
 */
export const noopLogger: Logger = {
  debug: () => {
    /* intentionally empty */
  },

  info: () => {
    /* intentionally empty */
  },

  warn: () => {
    /* intentionally empty */
  },

  error: () => {
    /* intentionally empty */
  },
};

/**
 * Factory function to create a logger with a custom prefix
 */
export function createLogger(prefix = 'rate-limiter'): Logger {
  return {
    debug(message: string, meta?: Record<string, unknown>): void {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        console.debug(`[${prefix}] ${message}`, meta ? JSON.stringify(meta) : '');
      }
    },
    info(message: string, meta?: Record<string, unknown>): void {
      console.info(`[${prefix}] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn(message: string, meta?: Record<string, unknown>): void {
      console.warn(`[${prefix}] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    error(message: string, meta?: Record<string, unknown>): void {
      console.error(`[${prefix}] ${message}`, meta ? JSON.stringify(meta) : '');
    },
  };
}
