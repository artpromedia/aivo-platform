/**
 * Rate Limiter
 *
 * Token bucket rate limiter for LLM API calls.
 * Supports both token-based and request-based rate limiting.
 */

export interface RateLimiterConfig {
  tokensPerMinute: number;
  requestsPerMinute: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per ms
}

export class RateLimiter {
  private tokenBucket: TokenBucket;
  private requestBucket: TokenBucket;
  private queue: {
    tokens: number;
    resolve: () => void;
    reject: (error: Error) => void;
  }[] = [];
  private processing = false;

  constructor(config: RateLimiterConfig) {
    const now = Date.now();

    // Token bucket for API tokens
    this.tokenBucket = {
      tokens: config.tokensPerMinute,
      lastRefill: now,
      maxTokens: config.tokensPerMinute,
      refillRate: config.tokensPerMinute / 60000, // per ms
    };

    // Request bucket for API requests
    this.requestBucket = {
      tokens: config.requestsPerMinute,
      lastRefill: now,
      maxTokens: config.requestsPerMinute,
      refillRate: config.requestsPerMinute / 60000,
    };
  }

  /**
   * Acquire tokens from the rate limiter
   * @param estimatedTokens - Estimated number of tokens for the request
   */
  async acquire(estimatedTokens: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ tokens: estimatedTokens, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    this.processNextInQueue();
  }

  private processNextInQueue(): void {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    const request = this.queue[0]!;
    this.refillBuckets();

    // Check if we have capacity
    if (this.tokenBucket.tokens >= request.tokens && this.requestBucket.tokens >= 1) {
      // Consume tokens
      this.tokenBucket.tokens -= request.tokens;
      this.requestBucket.tokens -= 1;
      this.queue.shift();
      request.resolve();
      // Process next immediately
      setImmediate(() => {
        this.processNextInQueue();
      });
    } else {
      // Calculate wait time
      const tokenWait = this.calculateWaitTime(this.tokenBucket, request.tokens);
      const requestWait = this.calculateWaitTime(this.requestBucket, 1);
      const waitTime = Math.max(tokenWait, requestWait, 10);

      // Wait and retry
      setTimeout(() => {
        this.processNextInQueue();
      }, waitTime);
    }
  }

  private refillBuckets(): void {
    const now = Date.now();

    // Refill token bucket
    const tokenElapsed = now - this.tokenBucket.lastRefill;
    const tokensToAdd = tokenElapsed * this.tokenBucket.refillRate;
    this.tokenBucket.tokens = Math.min(
      this.tokenBucket.maxTokens,
      this.tokenBucket.tokens + tokensToAdd
    );
    this.tokenBucket.lastRefill = now;

    // Refill request bucket
    const requestElapsed = now - this.requestBucket.lastRefill;
    const requestsToAdd = requestElapsed * this.requestBucket.refillRate;
    this.requestBucket.tokens = Math.min(
      this.requestBucket.maxTokens,
      this.requestBucket.tokens + requestsToAdd
    );
    this.requestBucket.lastRefill = now;
  }

  private calculateWaitTime(bucket: TokenBucket, needed: number): number {
    if (bucket.tokens >= needed) {
      return 0;
    }
    const deficit = needed - bucket.tokens;
    return Math.ceil(deficit / bucket.refillRate);
  }

  /**
   * Get current rate limiter status
   */
  getStatus(): {
    availableTokens: number;
    availableRequests: number;
    queueLength: number;
  } {
    this.refillBuckets();
    return {
      availableTokens: Math.floor(this.tokenBucket.tokens),
      availableRequests: Math.floor(this.requestBucket.tokens),
      queueLength: this.queue.length,
    };
  }
}
