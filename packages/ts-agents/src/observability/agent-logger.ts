/**
 * Agent-specific logging utilities
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  agentId?: string;
  sessionId?: string;
  context?: Record<string, unknown>;
}

export interface IAgentLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): IAgentLogger;
}

export interface AgentLoggerConfig {
  /** Minimum log level to output */
  level?: LogLevel;
  /** Include timestamps */
  timestamps?: boolean;
  /** Pretty print output */
  pretty?: boolean;
  /** Custom log handler */
  handler?: (entry: LogEntry) => void;
  /** Default context */
  defaultContext?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Agent logger implementation
 */
export class AgentLogger implements IAgentLogger {
  private readonly config: AgentLoggerConfig;
  private readonly bindings: Record<string, unknown>;

  constructor(config?: AgentLoggerConfig, bindings?: Record<string, unknown>) {
    this.config = {
      level: config?.level ?? 'info',
      timestamps: config?.timestamps ?? true,
      pretty: config?.pretty ?? false,
      handler: config?.handler,
      defaultContext: config?.defaultContext ?? {},
    };
    this.bindings = bindings ?? {};
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const errorContext = error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          ...context,
        }
      : context;

    this.log('error', message, errorContext);
  }

  child(bindings: Record<string, unknown>): AgentLogger {
    return new AgentLogger(this.config, { ...this.bindings, ...bindings });
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level ?? 'info']) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      ...this.bindings,
      context: {
        ...this.config.defaultContext,
        ...context,
      },
    };

    if (this.config.handler) {
      this.config.handler(entry);
      return;
    }

    this.output(entry);
  }

  private output(entry: LogEntry): void {
    const { level, message, timestamp, context, ...rest } = entry;

    if (this.config.pretty) {
      const time = this.config.timestamps
        ? `[${timestamp.toISOString()}] `
        : '';
      const ctx = Object.keys({ ...context, ...rest }).length > 0
        ? ` ${JSON.stringify({ ...context, ...rest })}`
        : '';

      const output = `${time}${level.toUpperCase().padEnd(5)} ${message}${ctx}`;

      switch (level) {
        case 'debug':
          console.debug(output);
          break;
        case 'info':
          console.info(output);
          break;
        case 'warn':
          console.warn(output);
          break;
        case 'error':
          console.error(output);
          break;
      }
    } else {
      const logData = {
        level,
        msg: message,
        time: timestamp.toISOString(),
        ...rest,
        ...context,
      };

      console.log(JSON.stringify(logData));
    }
  }
}

/**
 * Create a logger for an agent
 */
export function createAgentLogger(
  agentId: string,
  sessionId?: string,
  config?: AgentLoggerConfig
): AgentLogger {
  return new AgentLogger(config, { agentId, sessionId });
}

/**
 * No-op logger for testing or when logging is disabled
 */
export class NullLogger implements IAgentLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
  child(): NullLogger {
    return this;
  }
}

/**
 * Buffered logger that stores logs in memory
 */
export class BufferedLogger implements IAgentLogger {
  private readonly buffer: LogEntry[] = [];
  private readonly maxSize: number;
  private readonly bindings: Record<string, unknown>;

  constructor(maxSize: number = 1000, bindings?: Record<string, unknown>) {
    this.maxSize = maxSize;
    this.bindings = bindings ?? {};
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.add('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.add('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.add('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const errorContext = error
      ? { error: { name: error.name, message: error.message }, ...context }
      : context;
    this.add('error', message, errorContext);
  }

  child(bindings: Record<string, unknown>): BufferedLogger {
    return new BufferedLogger(this.maxSize, { ...this.bindings, ...bindings });
  }

  /**
   * Get all buffered log entries
   */
  getEntries(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer.length = 0;
  }

  /**
   * Get entries by level
   */
  getByLevel(level: LogLevel): LogEntry[] {
    return this.buffer.filter(e => e.level === level);
  }

  /**
   * Flush to another logger
   */
  flushTo(logger: IAgentLogger): void {
    for (const entry of this.buffer) {
      switch (entry.level) {
        case 'debug':
          logger.debug(entry.message, entry.context);
          break;
        case 'info':
          logger.info(entry.message, entry.context);
          break;
        case 'warn':
          logger.warn(entry.message, entry.context);
          break;
        case 'error':
          logger.error(entry.message, undefined, entry.context);
          break;
      }
    }
    this.clear();
  }

  private add(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }

    this.buffer.push({
      level,
      message,
      timestamp: new Date(),
      ...this.bindings,
      context,
    });
  }
}
