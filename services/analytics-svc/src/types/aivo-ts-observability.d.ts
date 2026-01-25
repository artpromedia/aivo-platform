/**
 * Type declarations for @aivo/ts-observability
 *
 * Stub module providing types for observability utilities.
 * This allows the service to compile without the actual package installed.
 */

declare module '@aivo/ts-observability' {
  export interface LoggerContext {
    [key: string]: unknown;
  }

  export interface Logger {
    info(message: string, context?: LoggerContext): void;
    info(context: LoggerContext, message: string): void;
    warn(message: string, context?: LoggerContext): void;
    warn(context: LoggerContext, message: string): void;
    error(message: string, context?: LoggerContext): void;
    error(context: LoggerContext, message: string): void;
    debug(message: string, context?: LoggerContext): void;
    debug(context: LoggerContext, message: string): void;
  }

  export interface HistogramLabels {
    [key: string]: string;
  }

  export interface Histogram {
    observe(labels: HistogramLabels, value: number): void;
  }

  export interface Metrics {
    increment(name: string, value?: number): void;
    histogram(name: string, value: number): void;
    database: {
      queryDuration: Histogram;
    };
  }

  export const logger: Logger;
  export const metrics: Metrics;
}
