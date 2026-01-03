export interface DLQServiceConfig {
    /** NATS server URLs */
    servers: string | string[];
    /** Connection name */
    name?: string;
    /** TLS enabled */
    tls?: boolean;
    /** Auth token */
    token?: string;
    /** Username */
    user?: string;
    /** Password */
    pass?: string;
    /** DLQ stream name (default: DLQ) */
    dlqStream?: string;
}
export interface DLQMessage {
    /** Sequence in DLQ stream */
    sequence: number;
    /** Original subject */
    originalSubject: string;
    /** DLQ subject */
    dlqSubject: string;
    /** Timestamp when moved to DLQ */
    failedAt: Date;
    /** Number of delivery attempts */
    attempts: number;
    /** Error message */
    errorMessage: string;
    /** Original event */
    originalEvent: Record<string, unknown>;
    /** Tenant ID from original event */
    tenantId?: string;
    /** Event type from original event */
    eventType?: string;
}
export interface DLQStats {
    /** Total messages in DLQ */
    totalMessages: number;
    /** Messages by original subject prefix */
    byStream: Record<string, number>;
    /** Messages by error type */
    byError: Record<string, number>;
    /** Oldest message timestamp */
    oldestMessage?: Date;
    /** Newest message timestamp */
    newestMessage?: Date;
}
export interface RetryResult {
    /** Number of messages retried */
    retried: number;
    /** Number of messages failed */
    failed: number;
    /** Error details for failures */
    errors: {
        sequence: number;
        error: string;
    }[];
}
export declare class DLQService {
    private readonly config;
    private nc;
    private js;
    private jsm;
    private readonly sc;
    private readonly dlqStream;
    constructor(config: DLQServiceConfig);
    connect(): Promise<void>;
    close(): Promise<void>;
    private parseMessageForStats;
    private updateStreamCount;
    private updateErrorCount;
    private updateTimestamps;
    private sampleMessagesForStats;
    getStats(): Promise<DLQStats>;
    listMessages(options?: {
        limit?: number;
        offset?: number;
        filterSubject?: string;
        filterTenantId?: string;
    }): Promise<DLQMessage[]>;
    getMessage(sequence: number): Promise<DLQMessage | null>;
    retryMessage(sequence: number): Promise<boolean>;
    private retrySequence;
    retryMessages(options?: {
        sequences?: number[];
        filterSubject?: string;
        maxMessages?: number;
    }): Promise<RetryResult>;
    deleteMessage(sequence: number): Promise<boolean>;
    purge(options?: {
        filterSubject?: string;
        olderThan?: Date;
    }): Promise<number>;
}
export declare function createDLQService(config: DLQServiceConfig): DLQService;
//# sourceMappingURL=dlq-service.d.ts.map