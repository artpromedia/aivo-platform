import type { BaseEvent } from '../schemas/index.js';
export interface NatsTransportConfig {
    /** NATS server URLs (comma-separated or array) */
    servers: string | string[];
    /** Connection name for debugging */
    name?: string;
    /** Max reconnect attempts (-1 for infinite) */
    maxReconnectAttempts?: number;
    /** Reconnect time wait (ms) */
    reconnectTimeWait?: number;
    /** Connection timeout (ms) */
    timeout?: number;
    /** Enable TLS */
    tls?: boolean;
    /** Authentication token */
    token?: string;
    /** Username for auth */
    user?: string;
    /** Password for auth */
    pass?: string;
    /** Service name for event source */
    serviceName: string;
    /** Service version for event source */
    serviceVersion: string;
}
export interface PublishOptions {
    /** Correlation ID for request tracing */
    correlationId?: string;
    /** Causation ID linking to triggering event */
    causationId?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
    /** Message ID for deduplication */
    msgId?: string;
    /** Expected last message ID for ordering */
    expectedLastMsgId?: string;
}
export interface PublishResult {
    /** Whether publish was successful */
    success: boolean;
    /** Assigned event ID */
    eventId: string;
    /** Stream name */
    stream?: string;
    /** Sequence number in stream */
    sequence?: number;
    /** Error if failed */
    error?: Error;
    /** Number of retry attempts */
    attempts: number;
}
interface RetryConfig {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}
export declare class NatsTransport {
    private readonly config;
    private nc;
    private js;
    private jsm;
    private readonly sc;
    private isConnecting;
    private connectionPromise;
    private readonly retryConfig;
    constructor(config: NatsTransportConfig, retryConfig?: Partial<RetryConfig>);
    /**
     * Connect to NATS server.
     */
    connect(): Promise<void>;
    private doConnect;
    private setupEventHandlers;
    /**
     * Check if connected to NATS.
     */
    isConnected(): boolean;
    /**
     * Gracefully close connection.
     */
    close(): Promise<void>;
    /**
     * Publish an event to NATS JetStream.
     */
    publish<T extends BaseEvent>(event: Omit<T, 'eventId' | 'timestamp' | 'source'>, options?: PublishOptions): Promise<PublishResult>;
    private publishWithRetry;
    private doPublish;
    private isNonRetryableError;
    private publishToDLQ;
    private sleep;
    /**
     * Get stream info for an event type.
     */
    getStreamInfo(eventType: string): Promise<{
        name: string;
        messages: number;
        bytes: number;
        firstSeq: number;
        lastSeq: number;
    } | null>;
}
export {};
//# sourceMappingURL=nats-transport.d.ts.map