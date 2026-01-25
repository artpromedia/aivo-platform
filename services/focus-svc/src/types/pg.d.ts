/**
 * Type declarations for the pg module
 *
 * This provides minimal type declarations for the pg (node-postgres) module
 * since it's used only for type annotations (type-only import).
 * The actual pg module is not a direct dependency - Pool instances are
 * passed in from external services.
 */

declare module 'pg' {
  import { EventEmitter } from 'events';

  export interface PoolConfig {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    connectionString?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    ssl?: boolean | object;
  }

  export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number | null;
    command: string;
    fields: FieldDef[];
  }

  export interface FieldDef {
    name: string;
    tableID: number;
    columnID: number;
    dataTypeID: number;
    dataTypeModifier: number;
    format: string;
  }

  export interface PoolClient {
    query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
    release(err?: Error | boolean): void;
  }

  export class Pool extends EventEmitter {
    constructor(config?: PoolConfig);
    connect(): Promise<PoolClient>;
    query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
    end(): Promise<void>;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  }

  export class Client extends EventEmitter {
    constructor(config?: PoolConfig);
    connect(): Promise<void>;
    query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
    end(): Promise<void>;
  }
}
