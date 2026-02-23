declare module 'csv-stringify/sync' {
  export interface Options {
    header?: boolean;
    columns?: string[] | Record<string, string>[];
    delimiter?: string;
    quote?: string | boolean;
    quoted?: boolean;
    cast?: Record<string, (value: unknown) => string>;
    [key: string]: unknown;
  }
  export function stringify(
    records: ReadonlyArray<Record<string, unknown> | unknown[]>,
    options?: Options,
  ): string;
}
