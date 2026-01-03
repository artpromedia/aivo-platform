import type { BaseEvent } from '../schemas/index.js';
export interface ReplayServiceConfig {
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
}
export interface ReplayOptions {
    /** Stream to replay from */
    stream: string;
    /** Filter by subject (optional) */
    filterSubject?: string;
    /** Start sequence (optional, defaults to first) */
    startSequence?: number;
    /** Start time (optional) */
    startTime?: Date;
    /** End sequence (optional) */
    endSequence?: number;
    /** End time (optional) */
    endTime?: Date;
    /** Filter by tenant ID (optional) */
    tenantId?: string;
    /** Filter by event type (optional) */
    eventType?: string;
    /** Maximum events to replay */
    maxEvents?: number;
    /** Replay speed multiplier (1 = real-time, 0 = instant) */
    speedMultiplier?: number;
}
export interface ReplayResult {
    /** Number of events replayed */
    eventsReplayed: number;
    /** First sequence replayed */
    firstSequence: number;
    /** Last sequence replayed */
    lastSequence: number;
    /** Replay duration in ms */
    durationMs: number;
    /** Errors encountered */
    errors: {
        sequence: number;
        error: string;
    }[];
}
export interface StreamInfo {
    name: string;
    subjects: string[];
    messages: number;
    bytes: number;
    firstSeq: number;
    lastSeq: number;
    firstTime?: Date;
    lastTime?: Date;
}
export interface MessageInfo {
    sequence: number;
    subject: string;
    timestamp: Date;
    event: BaseEvent;
}
export declare class EventReplayService {
    private readonly config;
    private nc;
    private js;
    private jsm;
    private readonly sc;
    constructor(config: ReplayServiceConfig);
    connect(): Promise<void>;
    close(): Promise<void>;
    listStreams(): Promise<StreamInfo[]>;
    getStreamInfo(streamName: string): Promise<StreamInfo | null>;
    getMessage(stream: string, sequence: number): Promise<MessageInfo | null>;
    getMessages(stream: string, startSeq: number, count: number): Promise<MessageInfo[]>;
    private buildReplayConsumerConfig;
    private shouldStopReplay;
    private shouldSkipEvent;
    private applySpeedMultiplier;
    replay(options: ReplayOptions, handler: (event: BaseEvent, sequence: number) => Promise<void>): Promise<ReplayResult>;
    private sleep;
    republish(options: ReplayOptions, targetSubject: string): Promise<ReplayResult>;
}
export declare function createEventReplayService(config: ReplayServiceConfig): EventReplayService;
//# sourceMappingURL=replay-service.d.ts.map