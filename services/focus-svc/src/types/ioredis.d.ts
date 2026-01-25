/**
 * Type declarations for ioredis module
 *
 * This provides minimal type declarations for ioredis
 * since it's used for Redis caching in screen time enforcement.
 */

declare module 'ioredis' {
  import { EventEmitter } from 'events';

  export interface RedisOptions {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    maxRetriesPerRequest?: number | null;
    enableReadyCheck?: boolean;
    lazyConnect?: boolean;
    connectTimeout?: number;
    retryStrategy?: (times: number) => number | void | null;
    tls?: object;
    family?: 4 | 6;
  }

  export interface Pipeline {
    get(key: string): Pipeline;
    set(key: string, value: string, ...args: any[]): Pipeline;
    del(...keys: string[]): Pipeline;
    expire(key: string, seconds: number): Pipeline;
    hget(key: string, field: string): Pipeline;
    hset(key: string, ...args: any[]): Pipeline;
    hdel(key: string, ...fields: string[]): Pipeline;
    hgetall(key: string): Pipeline;
    exec(): Promise<[Error | null, any][]>;
  }

  export default class Redis extends EventEmitter {
    constructor(options?: RedisOptions);
    constructor(port: number, host?: string, options?: RedisOptions);
    constructor(url: string, options?: RedisOptions);

    // Basic operations
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: any[]): Promise<'OK'>;
    setex(key: string, seconds: number, value: string): Promise<'OK'>;
    del(...keys: string[]): Promise<number>;
    exists(...keys: string[]): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
    pttl(key: string): Promise<number>;
    keys(pattern: string): Promise<string[]>;

    // Hash operations
    hget(key: string, field: string): Promise<string | null>;
    hset(key: string, ...args: any[]): Promise<number>;
    hmset(key: string, ...args: any[]): Promise<'OK'>;
    hdel(key: string, ...fields: string[]): Promise<number>;
    hgetall(key: string): Promise<Record<string, string>>;
    hincrby(key: string, field: string, increment: number): Promise<number>;
    hincrbyfloat(key: string, field: string, increment: number): Promise<string>;

    // List operations
    lpush(key: string, ...elements: any[]): Promise<number>;
    rpush(key: string, ...elements: any[]): Promise<number>;
    lpop(key: string): Promise<string | null>;
    rpop(key: string): Promise<string | null>;
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    llen(key: string): Promise<number>;
    ltrim(key: string, start: number, stop: number): Promise<'OK'>;

    // Set operations
    sadd(key: string, ...members: any[]): Promise<number>;
    srem(key: string, ...members: any[]): Promise<number>;
    smembers(key: string): Promise<string[]>;
    sismember(key: string, member: string): Promise<number>;

    // Sorted set operations
    zadd(key: string, ...args: any[]): Promise<number>;
    zrem(key: string, ...members: any[]): Promise<number>;
    zrange(key: string, start: number, stop: number, withScores?: 'WITHSCORES'): Promise<string[]>;
    zrangebyscore(key: string, min: number | string, max: number | string, ...args: any[]): Promise<string[]>;
    zscore(key: string, member: string): Promise<string | null>;
    zincrby(key: string, increment: number, member: string): Promise<string>;

    // Transaction/Pipeline
    pipeline(): Pipeline;
    multi(): Pipeline;

    // Pub/Sub
    publish(channel: string, message: string): Promise<number>;
    subscribe(...channels: string[]): Promise<number>;
    unsubscribe(...channels: string[]): Promise<number>;

    // Connection
    connect(): Promise<void>;
    disconnect(): void;
    quit(): Promise<'OK'>;

    // Status
    status: string;
  }
}
