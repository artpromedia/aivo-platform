import 'fastify';

declare module 'fastify' {
  interface FastifyBaseLogger {
    info(msg: string, ...args: unknown[]): void;
    info(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    warn(msg: string, ...args: unknown[]): void;
    warn(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    error(msg: string, ...args: unknown[]): void;
    error(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    debug(msg: string, ...args: unknown[]): void;
    debug(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    fatal(msg: string, ...args: unknown[]): void;
    fatal(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    trace(msg: string, ...args: unknown[]): void;
    trace(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    child(bindings: Record<string, unknown>): FastifyBaseLogger;
  }

  interface FastifyContextConfig {
    rawBody?: boolean;
  }
}
