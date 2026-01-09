/**
 * Production-Safe Logger
 *
 * Provides structured logging that is environment-aware.
 * Replaces raw console.log statements with proper logging levels
 * and ensures sensitive data is not leaked in production.
 *
 * CRITICAL: Addresses HIGH-003 - Remove console.log statements from production
 *
 * Usage:
 * ```typescript
 * import { createLogger } from '@aivo/ts-api-utils/logger';
 *
 * const logger = createLogger('my-service');
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to process request', { error: err.message });
 * logger.debug('Debug info', { data }); // Only in development
 * ```
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: LogContext;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
}

export interface LoggerConfig {
  /** Service name for log entries */
  service: string;
  /** Minimum log level to output */
  level?: LogLevel;
  /** Whether to output as JSON (for production log aggregation) */
  json?: boolean;
  /** Whether to include timestamps */
  timestamps?: boolean;
  /** Redact sensitive fields from context */
  redactFields?: string[];
  /** Custom log transport (for testing or custom outputs) */
  transport?: (entry: LogEntry) => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

// Default sensitive fields to redact
const DEFAULT_REDACT_FIELDS = [
  'password',
  'passwordHash',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'authorization',
  'cookie',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'cardNumber',
  'cvv',
  'pin',
];

// Environment detection
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test' || !!process.env.VITEST || !!process.env.JEST_WORKER_ID;

// Get default log level from environment
function getDefaultLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && LOG_LEVEL_ORDER[envLevel] !== undefined) {
    return envLevel;
  }
  // Default: info in production, debug in development, warn in test
  if (IS_TEST) return 'warn';
  if (IS_PRODUCTION) return 'info';
  return 'debug';
}

// ══════════════════════════════════════════════════════════════════════════════
// REDACTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Redact sensitive fields from an object
 */
function redactSensitiveData(
  data: unknown,
  fieldsToRedact: string[],
  depth = 0
): unknown {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH]';

  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, fieldsToRedact, depth + 1));
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const shouldRedact = fieldsToRedact.some(
        (field) => lowerKey.includes(field.toLowerCase())
      );
      if (shouldRedact) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactSensitiveData(value, fieldsToRedact, depth + 1);
      }
    }
    return result;
  }

  return data;
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMATTERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Format log entry as JSON string
 */
function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Format log entry for human-readable console output
 */
function formatPretty(entry: LogEntry): string {
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
    silent: '',
  };
  const reset = '\x1b[0m';
  const dim = '\x1b[2m';

  const color = levelColors[entry.level] || '';
  const levelStr = entry.level.toUpperCase().padEnd(5);
  const timeStr = entry.timestamp ? `${dim}${entry.timestamp}${reset} ` : '';
  const serviceStr = `${dim}[${entry.service}]${reset}`;
  const contextStr = entry.context
    ? ` ${dim}${JSON.stringify(entry.context)}${reset}`
    : '';

  return `${timeStr}${color}${levelStr}${reset} ${serviceStr} ${entry.message}${contextStr}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGGER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a production-safe logger instance
 */
export function createLogger(serviceOrConfig: string | LoggerConfig) {
  const config: LoggerConfig =
    typeof serviceOrConfig === 'string'
      ? { service: serviceOrConfig }
      : serviceOrConfig;

  const {
    service,
    level = getDefaultLogLevel(),
    json = IS_PRODUCTION,
    timestamps = true,
    redactFields = DEFAULT_REDACT_FIELDS,
    transport,
  } = config;

  const minLevel = LOG_LEVEL_ORDER[level];

  // State for request context
  let correlationId: string | undefined;
  let tenantId: string | undefined;
  let userId: string | undefined;

  /**
   * Check if a log level should be output
   */
  function shouldLog(logLevel: LogLevel): boolean {
    return LOG_LEVEL_ORDER[logLevel] >= minLevel;
  }

  /**
   * Output a log entry
   */
  function output(entry: LogEntry): void {
    // Use custom transport if provided
    if (transport) {
      transport(entry);
      return;
    }

    // Don't output in silent mode
    if (level === 'silent') return;

    const formatted = json ? formatJson(entry) : formatPretty(entry);

    // Use appropriate console method
    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  /**
   * Create a log entry
   */
  function createEntry(
    logLevel: LogLevel,
    message: string,
    context?: LogContext
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: timestamps ? new Date().toISOString() : '',
      level: logLevel,
      service,
      message,
    };

    if (context) {
      entry.context = redactSensitiveData(context, redactFields) as LogContext;
    }

    if (correlationId) entry.correlationId = correlationId;
    if (tenantId) entry.tenantId = tenantId;
    if (userId) entry.userId = userId;

    return entry;
  }

  /**
   * Log at a specific level
   */
  function log(logLevel: LogLevel, message: string, context?: LogContext): void {
    if (!shouldLog(logLevel)) return;
    const entry = createEntry(logLevel, message, context);
    output(entry);
  }

  return {
    /**
     * Log debug message (development only)
     */
    debug(message: string, context?: LogContext): void {
      log('debug', message, context);
    },

    /**
     * Log info message
     */
    info(message: string, context?: LogContext): void {
      log('info', message, context);
    },

    /**
     * Log warning message
     */
    warn(message: string, context?: LogContext): void {
      log('warn', message, context);
    },

    /**
     * Log error message
     */
    error(message: string, context?: LogContext): void {
      log('error', message, context);
    },

    /**
     * Set correlation ID for request tracing
     */
    setCorrelationId(id: string): void {
      correlationId = id;
    },

    /**
     * Set tenant ID for multi-tenant logging
     */
    setTenantId(id: string): void {
      tenantId = id;
    },

    /**
     * Set user ID for user context
     */
    setUserId(id: string): void {
      userId = id;
    },

    /**
     * Create a child logger with additional context
     */
    child(childContext: LogContext) {
      return createLogger({
        ...config,
        transport: (entry) => {
          output({
            ...entry,
            context: { ...childContext, ...entry.context },
          });
        },
      });
    },

    /**
     * Check if a level would be logged
     */
    isLevelEnabled(logLevel: LogLevel): boolean {
      return shouldLog(logLevel);
    },

    /**
     * Get current log level
     */
    get level(): LogLevel {
      return level;
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSOLE OVERRIDE (OPTIONAL)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Override console.log in production to route through the logger.
 * This is a gradual migration strategy - eventually all console.log
 * should be replaced with proper logger calls.
 *
 * @param logger - Logger instance to use for console output
 */
export function overrideConsoleInProduction(logger: ReturnType<typeof createLogger>): void {
  if (!IS_PRODUCTION) {
    return; // Only override in production
  }

  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  // Override console.log to go through logger (as info level)
  console.log = (...args: unknown[]) => {
    const message = args.map(String).join(' ');
    logger.info(message, { source: 'console.log' });
  };

  // Keep info, warn, error, debug as they map to proper levels
  console.info = (...args: unknown[]) => {
    const message = args.map(String).join(' ');
    logger.info(message);
  };

  console.warn = (...args: unknown[]) => {
    const message = args.map(String).join(' ');
    logger.warn(message);
  };

  console.error = (...args: unknown[]) => {
    const message = args.map(String).join(' ');
    logger.error(message);
  };

  console.debug = (...args: unknown[]) => {
    const message = args.map(String).join(' ');
    logger.debug(message);
  };

  logger.info('Console output redirected through structured logger', {
    event: 'console_override_enabled',
  });
}

/**
 * Disable console.log in production (strict mode).
 * All console.log calls will be silently ignored.
 */
export function disableConsoleLogInProduction(): void {
  if (!IS_PRODUCTION) {
    return;
  }

  // Replace console.log with no-op
  console.log = () => { /* no-op in production */ };

  // Keep warn and error for important messages
  // console.info is also disabled as it's often used like console.log
  console.info = () => { /* no-op in production */ };
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Default logger instance for quick usage
 */
export const logger = createLogger('aivo');

/**
 * Logger factory with common presets
 */
export const Logger = {
  create: createLogger,
  overrideConsole: overrideConsoleInProduction,
  disableConsoleLog: disableConsoleLogInProduction,
  default: logger,
  levels: LOG_LEVEL_ORDER,
  isProduction: IS_PRODUCTION,
  isTest: IS_TEST,
};
