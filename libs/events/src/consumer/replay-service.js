// =============================================================================
// @aivo/events - Event Replay Service
// =============================================================================
//
// Internal API for replaying events from JetStream streams.
// Used for debugging, backfilling, and recovery.
import { connect, StringCodec, DeliverPolicy, AckPolicy } from 'nats';
// -----------------------------------------------------------------------------
// Event Replay Service
// -----------------------------------------------------------------------------
export class EventReplayService {
    config;
    nc = null;
    js = null;
    jsm = null;
    sc = StringCodec();
    constructor(config) {
        this.config = config;
    }
    async connect() {
        if (this.nc && !this.nc.isClosed()) {
            return;
        }
        const servers = Array.isArray(this.config.servers)
            ? this.config.servers
            : this.config.servers.split(',').map((s) => s.trim());
        const opts = {
            servers,
            name: this.config.name ?? 'event-replay-service',
        };
        if (this.config.tls) {
            opts.tls = {};
        }
        if (this.config.token) {
            opts.token = this.config.token;
        }
        if (this.config.user) {
            opts.user = this.config.user;
        }
        if (this.config.pass) {
            opts.pass = this.config.pass;
        }
        this.nc = await connect(opts);
        this.js = this.nc.jetstream();
        this.jsm = await this.nc.jetstreamManager();
    }
    async close() {
        if (this.nc) {
            await this.nc.drain();
            await this.nc.close();
            this.nc = null;
            this.js = null;
            this.jsm = null;
        }
    }
    // ---------------------------------------------------------------------------
    // Stream Info
    // ---------------------------------------------------------------------------
    async listStreams() {
        await this.connect();
        const streams = [];
        const lister = this.jsm.streams.list();
        for await (const si of lister) {
            const info = {
                name: si.config.name,
                subjects: si.config.subjects ?? [],
                messages: si.state.messages,
                bytes: si.state.bytes,
                firstSeq: si.state.first_seq,
                lastSeq: si.state.last_seq,
            };
            if (si.state.first_ts) {
                info.firstTime = new Date(si.state.first_ts);
            }
            if (si.state.last_ts) {
                info.lastTime = new Date(si.state.last_ts);
            }
            streams.push(info);
        }
        return streams;
    }
    async getStreamInfo(streamName) {
        await this.connect();
        try {
            const si = await this.jsm.streams.info(streamName);
            const info = {
                name: si.config.name,
                subjects: si.config.subjects ?? [],
                messages: si.state.messages,
                bytes: si.state.bytes,
                firstSeq: si.state.first_seq,
                lastSeq: si.state.last_seq,
            };
            if (si.state.first_ts) {
                info.firstTime = new Date(si.state.first_ts);
            }
            if (si.state.last_ts) {
                info.lastTime = new Date(si.state.last_ts);
            }
            return info;
        }
        catch {
            return null;
        }
    }
    // ---------------------------------------------------------------------------
    // Message Retrieval
    // ---------------------------------------------------------------------------
    async getMessage(stream, sequence) {
        await this.connect();
        try {
            const sm = await this.jsm.streams.getMessage(stream, { seq: sequence });
            const data = this.sc.decode(sm.data);
            const event = JSON.parse(data);
            return {
                sequence: sm.seq,
                subject: sm.subject,
                timestamp: new Date(sm.time),
                event,
            };
        }
        catch {
            return null;
        }
    }
    async getMessages(stream, startSeq, count) {
        await this.connect();
        const messages = [];
        // Create ephemeral consumer starting at sequence
        const consumerConfig = {
            ack_policy: AckPolicy.None,
            deliver_policy: DeliverPolicy.StartSequence,
            opt_start_seq: startSeq,
            max_deliver: 1,
            inactive_threshold: 10_000_000_000, // 10 seconds in nanoseconds
        };
        const consumer = await this.jsm.consumers.add(stream, consumerConfig);
        const sub = await this.js.consumers.get(stream, consumer.name);
        try {
            const iter = await sub.consume({ max_messages: count });
            for await (const msg of iter) {
                const data = this.sc.decode(msg.data);
                const event = JSON.parse(data);
                messages.push({
                    sequence: msg.seq,
                    subject: msg.subject,
                    timestamp: new Date(msg.info.timestampNanos / 1_000_000),
                    event,
                });
                if (messages.length >= count) {
                    break;
                }
            }
        }
        finally {
            await this.jsm.consumers.delete(stream, consumer.name);
        }
        return messages;
    }
    // ---------------------------------------------------------------------------
    // Event Replay
    // ---------------------------------------------------------------------------
    buildReplayConsumerConfig(options) {
        const config = {
            ack_policy: AckPolicy.None,
            max_deliver: 1,
            inactive_threshold: 30_000_000_000, // 30 seconds
        };
        if (options.filterSubject) {
            config.filter_subject = options.filterSubject;
        }
        if (options.startSequence) {
            config.deliver_policy = DeliverPolicy.StartSequence;
            config.opt_start_seq = options.startSequence;
        }
        else if (options.startTime) {
            config.deliver_policy = DeliverPolicy.StartTime;
            config.opt_start_time = options.startTime.toISOString();
        }
        else {
            config.deliver_policy = DeliverPolicy.All;
        }
        return config;
    }
    shouldStopReplay(msg, options, eventsReplayed) {
        if (options.endSequence && msg.seq > options.endSequence) {
            return true;
        }
        const msgTime = new Date(msg.info.timestampNanos / 1_000_000);
        if (options.endTime && msgTime > options.endTime) {
            return true;
        }
        const maxEvents = options.maxEvents ?? Infinity;
        return eventsReplayed >= maxEvents;
    }
    shouldSkipEvent(event, options) {
        if (options.tenantId && event.tenantId !== options.tenantId) {
            return true;
        }
        if (options.eventType && event.eventType !== options.eventType) {
            return true;
        }
        return false;
    }
    async applySpeedMultiplier(msgTime, prevTimestamp, speedMultiplier) {
        if (speedMultiplier && speedMultiplier > 0 && prevTimestamp) {
            const delay = (msgTime.getTime() - prevTimestamp) / speedMultiplier;
            if (delay > 0 && delay < 60000) {
                await this.sleep(delay);
            }
        }
    }
    async replay(options, handler) {
        await this.connect();
        const startTime = Date.now();
        const errors = [];
        let eventsReplayed = 0;
        let firstSequence = 0;
        let lastSequence = 0;
        const consumerConfig = this.buildReplayConsumerConfig(options);
        const consumer = await this.jsm.consumers.add(options.stream, consumerConfig);
        const sub = await this.js.consumers.get(options.stream, consumer.name);
        try {
            const maxEvents = options.maxEvents ?? Infinity;
            const iter = await sub.consume({ max_messages: Math.min(maxEvents, 10000) });
            let prevTimestamp;
            for await (const msg of iter) {
                if (this.shouldStopReplay(msg, options, eventsReplayed)) {
                    break;
                }
                try {
                    const data = this.sc.decode(msg.data);
                    const event = JSON.parse(data);
                    if (this.shouldSkipEvent(event, options)) {
                        continue;
                    }
                    const msgTime = new Date(msg.info.timestampNanos / 1_000_000);
                    await this.applySpeedMultiplier(msgTime, prevTimestamp, options.speedMultiplier);
                    prevTimestamp = msgTime.getTime();
                    await handler(event, msg.seq);
                    if (firstSequence === 0) {
                        firstSequence = msg.seq;
                    }
                    lastSequence = msg.seq;
                    eventsReplayed++;
                }
                catch (err) {
                    errors.push({
                        sequence: msg.seq,
                        error: err instanceof Error ? err.message : String(err),
                    });
                }
            }
        }
        finally {
            await this.jsm.consumers.delete(options.stream, consumer.name);
        }
        return {
            eventsReplayed,
            firstSequence,
            lastSequence,
            durationMs: Date.now() - startTime,
            errors,
        };
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    // ---------------------------------------------------------------------------
    // Republish (for backfilling new consumers)
    // ---------------------------------------------------------------------------
    async republish(options, targetSubject) {
        return this.replay(options, async (event, _sequence) => {
            if (!this.js) {
                throw new Error('JetStream not connected');
            }
            const data = this.sc.encode(JSON.stringify(event));
            await this.js.publish(targetSubject, data);
        });
    }
}
// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------
export function createEventReplayService(config) {
    return new EventReplayService(config);
}
//# sourceMappingURL=replay-service.js.map