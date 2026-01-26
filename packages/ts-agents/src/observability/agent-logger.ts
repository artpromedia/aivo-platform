/**
 * AgentLogger - Structured logging for agent operations
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  agentId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  message: string;
  data?: Record<string, unknown>;
  error?: Error;
}

export interface LogTransport {
  log(entry: LogEntry): void;
}

export interface AgentLoggerConfig {
  level: LogLevel;
  transports: LogTransport[];
  defaultMetadata?: Record<string, unknown>;
}

/**
 * Console transport for development
 */
export class ConsoleTransport implements LogTransport {
  private colors = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m', // green
    warn: '\x1b[33m', // yellow
    error: '\x1b[31m', // red
    reset: '\x1b[0m',
  };

  log(entry: LogEntry): void {
    const color = this.colors[entry.level];
    const reset = this.colors.reset;
    const timestamp = entry.timestamp.toISOString();
    const prefix = entry.agentId ? `[${entry.agentId}]` : '';
    const sessionPrefix = entry.sessionId ? `[${entry.sessionId.slice(0, 8)}]` : '';

    let message = `${color}${timestamp} ${entry.level.toUpperCase().padEnd(5)}${reset} ${prefix}${sessionPrefix} ${entry.message}`;

    if (entry.data) {
      message += ` ${JSON.stringify(entry.data)}`;
    }

    if (entry.level === 'error') {
      console.error(message);
      if (entry.error?.stack) {
        console.error(entry.error.stack);
      }
    } else {
      console.log(message);
    }
  }
}

/**
 * JSON transport for structured logging
 */
export class JsonTransport implements LogTransport {
  private output: (json: string) => void;

  constructor(output?: (json: string) => void) {
    this.output = output || ((json) => console.log(json));
  }

  log(entry: LogEntry): void {
    const json = JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      agentId: entry.agentId,
      sessionId: entry.sessionId,
      traceId: entry.traceId,
      spanId: entry.spanId,
      message: entry.message,
      data: entry.data,
      error: entry.error
        ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack,
          }
        : undefined,
    });
    this.output(json);
  }
}

/**
 * Buffer transport for testing
 */
export class BufferTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  log(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  getEntries(): LogEntry[] {
    return [...this.buffer];
  }

  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.buffer.filter(e => e.level === level);
  }

  clear(): void {
    this.buffer = [];
  }
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class AgentLogger {
  private config: AgentLoggerConfig;
  private context: {
    agentId?: string;
    sessionId?: string;
    traceId?: string;
    spanId?: string;
  } = {};

  constructor(config?: Partial<AgentLoggerConfig>) {
    this.config = {
      level: 'info',
      transports: [new ConsoleTransport()],
      ...config,
    };
  }

  /**
   * Set context for all subsequent log entries
   */
  setContext(context: {
    agentId?: string;
    sessionId?: string;
    traceId?: string;
    spanId?: string;
  }): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Create a child logger with additional context
   */
  child(context: {
    agentId?: string;
    sessionId?: string;
    traceId?: string;
    spanId?: string;
  }): AgentLogger {
    const child = new AgentLogger(this.config);
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('error', message, data, error);
  }

  /**
   * Log agent start
   */
  logAgentStart(agentId: string, sessionId: string, input: unknown): void {
    this.info('Agent started', {
      agentId,
      sessionId,
      input: typeof input === 'object' ? input : { value: input },
    });
  }

  /**
   * Log agent completion
   */
  logAgentComplete(
    agentId: string,
    sessionId: string,
    output: unknown,
    durationMs: number
  ): void {
    this.info('Agent completed', {
      agentId,
      sessionId,
      output: typeof output === 'object' ? output : { value: output },
      durationMs,
    });
  }

  /**
   * Log agent error
   */
  logAgentError(
    agentId: string,
    sessionId: string,
    error: Error
  ): void {
    this.error('Agent error', error, { agentId, sessionId });
  }

  /**
   * Log tool execution
   */
  logToolExecution(
    toolName: string,
    params: unknown,
    result: unknown,
    durationMs: number
  ): void {
    this.debug('Tool executed', {
      toolName,
      params,
      success: (result as { success?: boolean })?.success ?? true,
      durationMs,
    });
  }

  /**
   * Log memory operation
   */
  logMemoryOperation(
    operation: 'store' | 'recall' | 'consolidate',
    type: string,
    details: Record<string, unknown>
  ): void {
    this.debug(`Memory ${operation}`, {
      memoryType: type,
      ...details,
    });
  }

  /**
   * Log state change
   */
  logStateChange(
    sessionId: string,
    fromState: string,
    toState: string,
    event: string
  ): void {
    this.debug('State changed', {
      sessionId,
      fromState,
      toState,
      event,
    });
  }

  /**
   * Core log method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data: { ...this.config.defaultMetadata, ...data },
      error,
      ...this.context,
    };

    for (const transport of this.config.transports) {
      try {
        transport.log(entry);
      } catch {
        // Ignore transport errors
      }
    }
  }
}

/**
 * Default logger instance
 */
export const defaultLogger = new AgentLogger();
