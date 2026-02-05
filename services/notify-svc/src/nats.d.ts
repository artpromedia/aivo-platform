declare module 'nats' {
  export interface NatsConnection {
    jetstream(): JetStreamClient;
    close(): Promise<void>;
    subscribe(subject: string, options?: SubscriptionOptions): Subscription;
  }

  export interface JetStreamClient {
    subscribe(subject: string, options?: unknown): Promise<JetStreamSubscription>;
  }

  export interface JetStreamSubscription {
    [Symbol.asyncIterator](): AsyncIterator<JsMsg>;
  }

  export interface JsMsg {
    data: Uint8Array;
    ack(): void;
    nak(delay?: number): void;
    subject: string;
  }

  export interface Subscription {
    unsubscribe(): void;
    drain(): Promise<void>;
    [Symbol.asyncIterator](): AsyncIterator<Msg>;
  }

  export interface Msg {
    data: Uint8Array;
    subject: string;
    reply?: string;
  }

  export interface SubscriptionOptions {
    queue?: string;
  }

  export function connect(opts?: unknown): Promise<NatsConnection>;

  export class StringCodec {
    encode(data: string): Uint8Array;
    decode(data: Uint8Array): string;
  }

  export function StringCodec(): {
    encode: (data: string) => Uint8Array;
    decode: (data: Uint8Array) => string;
  };
}
