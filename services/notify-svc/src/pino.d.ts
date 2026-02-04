declare module 'pino' {
  export interface LoggerOptions {
    name?: string;
    level?: string;
    transport?: {
      target: string;
      options?: Record<string, unknown>;
    };
  }

  export interface Logger {
    info(obj: Record<string, unknown>, msg?: string): void;
    info(msg: string): void;
    error(obj: Record<string, unknown>, msg?: string): void;
    error(msg: string): void;
    warn(obj: Record<string, unknown>, msg?: string): void;
    warn(msg: string): void;
    debug(obj: Record<string, unknown>, msg?: string): void;
    debug(msg: string): void;
    fatal(obj: Record<string, unknown>, msg?: string): void;
    fatal(msg: string): void;
    child(bindings: Record<string, unknown>): Logger;
  }

  function pino(options?: LoggerOptions): Logger;
  export = pino;
}
