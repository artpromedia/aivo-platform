import type { NatsConnection, JetStreamClient, JetStreamManager, ConsumerInfo, JsMsg } from 'nats';
import type { BaseEvent } from '../schemas/index.js';
export interface ConsumerConnectionConfig {
    /** NATS server URLs */
    servers: string | string[];
    /** Connection name */
    name?: string;
    /** Max reconnect attempts */
    maxReconnectAttempts?: number;
    /** Enable TLS */
    tls?: boolean;
    /** Auth token */
    token?: string;
    /** Username */
    user?: string;
    /** Password */
    pass?: string;
}
export interface ConsumerOptions {
    /** Stream name to consume from */
    stream: string;
    /** Durable consumer name (for persistence) */
    durableName: string;
    /** Filter subject (optional) */
    filterSubject?: string;
    /** Max messages to process concurrently */
    maxConcurrent?: number;
    /** Ack wait time in ms */
    ackWaitMs?: number;
    /** Max delivery attempts before DLQ */
    maxDeliveries?: number;
    /** Start from beginning or new only */
    deliverPolicy?: 'all' | 'new' | 'last';
}
export interface ProcessedMessage<T = unknown> {
    event: T;
    subject: string;
    sequence: number;
    deliveryCount: number;
    timestamp: Date;
}
export type MessageHandler<T = unknown> = (message: ProcessedMessage<T>) => Promise<void>;
export declare abstract class BaseConsumer {
    protected readonly connectionConfig: ConsumerConnectionConfig;
    protected readonly consumerOptions: ConsumerOptions;
    protected nc: NatsConnection | null;
    protected js: JetStreamClient | null;
    protected jsm: JetStreamManager | null;
    protected sc: import("nats").Codec<string>;
    protected isRunning: boolean;
    protected abortController: AbortController | null;
    constructor(connectionConfig: ConsumerConnectionConfig, consumerOptions: ConsumerOptions);
    connect(): Promise<void>;
    protected ensureConsumer(): Promise<ConsumerInfo>;
    close(): Promise<void>;
    /**
     * Start consuming messages.
     */
    start(): Promise<void>;
    /**
     * Stop consuming messages.
     */
    stop(): void;
    protected processMessage(msg: JsMsg): Promise<void>;
    protected calculateBackoff(deliveryCount: number): number;
    protected handleDeadLetter(msg: JsMsg, _error: unknown): Promise<void>;
    /**
     * Override this method to handle messages.
     */
    protected abstract handleMessage(message: ProcessedMessage<BaseEvent>): Promise<void>;
    getStatus(): Promise<{
        isRunning: boolean;
        pending: number;
        delivered: number;
        ackPending: number;
        redelivered: number;
    }>;
}
//# sourceMappingURL=base-consumer.d.ts.map