// =============================================================================
// @aivo/events - Base Consumer
// =============================================================================
//
// Abstract base class for NATS JetStream consumers.
// Provides connection management, message processing, and error handling.
import { connect, StringCodec, AckPolicy, DeliverPolicy, ReplayPolicy } from 'nats';
// -----------------------------------------------------------------------------
// Base Consumer Class
// -----------------------------------------------------------------------------
export class BaseConsumer {
    connectionConfig;
    consumerOptions;
    nc = null;
    js = null;
    jsm = null;
    sc = StringCodec();
    isRunning = false;
    abortController = null;
    constructor(connectionConfig, consumerOptions) {
        this.connectionConfig = connectionConfig;
        this.consumerOptions = consumerOptions;
    }
    // ---------------------------------------------------------------------------
    // Connection Management
    // ---------------------------------------------------------------------------
    async connect() {
        if (this.nc && !this.nc.isClosed()) {
            return;
        }
        const servers = Array.isArray(this.connectionConfig.servers)
            ? this.connectionConfig.servers
            : this.connectionConfig.servers.split(',').map((s) => s.trim());
        const opts = {
            servers,
            name: this.connectionConfig.name ?? `${this.consumerOptions.durableName}-consumer`,
            maxReconnectAttempts: this.connectionConfig.maxReconnectAttempts ?? -1,
        };
        if (this.connectionConfig.tls) {
            opts.tls = {};
        }
        if (this.connectionConfig.token) {
            opts.token = this.connectionConfig.token;
        }
        if (this.connectionConfig.user) {
            opts.user = this.connectionConfig.user;
        }
        if (this.connectionConfig.pass) {
            opts.pass = this.connectionConfig.pass;
        }
        this.nc = await connect(opts);
        this.js = this.nc.jetstream();
        this.jsm = await this.nc.jetstreamManager();
        // Ensure consumer exists
        await this.ensureConsumer();
    }
    async ensureConsumer() {
        if (!this.jsm) {
            throw new Error('JetStream manager not initialized');
        }
        const config = {
            durable_name: this.consumerOptions.durableName,
            ack_policy: AckPolicy.Explicit,
            ack_wait: (this.consumerOptions.ackWaitMs ?? 30000) * 1_000_000, // nanoseconds
            max_deliver: this.consumerOptions.maxDeliveries ?? 5,
            replay_policy: ReplayPolicy.Instant,
        };
        if (this.consumerOptions.filterSubject) {
            config.filter_subject = this.consumerOptions.filterSubject;
        }
        switch (this.consumerOptions.deliverPolicy) {
            case 'new':
                config.deliver_policy = DeliverPolicy.New;
                break;
            case 'last':
                config.deliver_policy = DeliverPolicy.Last;
                break;
            default:
                config.deliver_policy = DeliverPolicy.All;
        }
        try {
            return await this.jsm.consumers.add(this.consumerOptions.stream, config);
        }
        catch (err) {
            // Consumer might already exist - check if it's an expected error
            if (err instanceof Error && err.message.includes('consumer name already in use')) {
                return await this.jsm.consumers.info(this.consumerOptions.stream, this.consumerOptions.durableName);
            }
            // Re-throw unexpected errors
            throw err;
        }
    }
    async close() {
        this.isRunning = false;
        this.abortController?.abort();
        if (this.nc) {
            await this.nc.drain();
            await this.nc.close();
            this.nc = null;
            this.js = null;
            this.jsm = null;
        }
    }
    // ---------------------------------------------------------------------------
    // Message Processing
    // ---------------------------------------------------------------------------
    /**
     * Start consuming messages.
     */
    async start() {
        if (this.isRunning) {
            return;
        }
        await this.connect();
        if (!this.js) {
            throw new Error('JetStream client not initialized');
        }
        this.isRunning = true;
        this.abortController = new AbortController();
        const consumer = await this.js.consumers.get(this.consumerOptions.stream, this.consumerOptions.durableName);
        const messages = await consumer.consume({
            max_messages: this.consumerOptions.maxConcurrent ?? 100,
            // expires: 30000,
        });
        console.log(`[Consumer:${this.consumerOptions.durableName}] Started consuming from ${this.consumerOptions.stream}`);
        try {
            for await (const msg of messages) {
                if (!this.isRunning) {
                    break;
                }
                await this.processMessage(msg);
            }
        }
        catch (err) {
            if (this.isRunning) {
                console.error(`[Consumer:${this.consumerOptions.durableName}] Error:`, err);
                throw err;
            }
        }
    }
    /**
     * Stop consuming messages.
     */
    stop() {
        this.isRunning = false;
        this.abortController?.abort();
    }
    async processMessage(msg) {
        const startTime = Date.now();
        try {
            const data = this.sc.decode(msg.data);
            const event = JSON.parse(data);
            const processed = {
                event,
                subject: msg.subject,
                sequence: msg.seq,
                deliveryCount: msg.info.deliveryCount,
                timestamp: new Date(),
            };
            await this.handleMessage(processed);
            msg.ack();
            const latency = Date.now() - startTime;
            if (latency > 1000) {
                console.warn(`[Consumer:${this.consumerOptions.durableName}] Slow message processing: ${latency}ms`);
            }
        }
        catch (err) {
            console.error(`[Consumer:${this.consumerOptions.durableName}] Failed to process message:`, err);
            // Check if max deliveries reached
            if (msg.info.deliveryCount >= (this.consumerOptions.maxDeliveries ?? 5)) {
                // This will be the last delivery - move to DLQ
                await this.handleDeadLetter(msg, err);
                msg.ack(); // Ack to prevent further redelivery
            }
            else {
                // NAK for redelivery with backoff
                msg.nak(this.calculateBackoff(msg.info.deliveryCount));
            }
        }
    }
    calculateBackoff(deliveryCount) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        return Math.min(1000 * Math.pow(2, deliveryCount - 1), 16000);
    }
    async handleDeadLetter(msg, _error) {
        console.error(`[Consumer:${this.consumerOptions.durableName}] Message moved to DLQ after ${msg.info.deliveryCount} attempts`);
        // Subclasses can override to publish to DLQ stream
    }
    // ---------------------------------------------------------------------------
    // Status
    // ---------------------------------------------------------------------------
    async getStatus() {
        if (!this.jsm) {
            return {
                isRunning: this.isRunning,
                pending: 0,
                delivered: 0,
                ackPending: 0,
                redelivered: 0,
            };
        }
        try {
            const info = await this.jsm.consumers.info(this.consumerOptions.stream, this.consumerOptions.durableName);
            return {
                isRunning: this.isRunning,
                pending: info.num_pending,
                delivered: info.delivered.consumer_seq,
                ackPending: info.num_ack_pending,
                redelivered: info.num_redelivered,
            };
        }
        catch {
            return {
                isRunning: this.isRunning,
                pending: 0,
                delivered: 0,
                ackPending: 0,
                redelivered: 0,
            };
        }
    }
}
//# sourceMappingURL=base-consumer.js.map