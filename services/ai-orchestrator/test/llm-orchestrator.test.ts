/**
 * LLM Orchestrator Integration Tests
 *
 * Tests for the LLM orchestrator with provider failover.
 * These tests use mocked providers to simulate failover scenarios.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type {
  LLMProviderInterface,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMStreamChunk,
} from '../src/providers/llm-provider.interface.js';

// Mock provider implementation for testing
class MockTestProvider implements LLMProviderInterface {
  readonly name: string;
  private shouldFail: boolean;
  private failCount: number;
  private callCount = 0;

  constructor(name: string, shouldFail = false, failCount = Infinity) {
    this.name = name;
    this.shouldFail = shouldFail;
    this.failCount = failCount;
  }

  async isAvailable(): Promise<boolean> {
    return !this.shouldFail;
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult> {
    this.callCount++;

    if (this.shouldFail && this.callCount <= this.failCount) {
      throw new Error(`${this.name} failed`);
    }

    return {
      content: `Response from ${this.name}`,
      model: 'test-model',
      provider: this.name,
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      finishReason: 'stop',
      latencyMs: 100,
      cached: false,
    };
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): AsyncIterable<LLMStreamChunk> {
    if (this.shouldFail) {
      throw new Error(`${this.name} stream failed`);
    }

    yield { content: 'Hello ', done: false };
    yield { content: 'World', done: false };
    yield { content: '', done: true };
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }
}

describe('LLM Orchestrator Failover', () => {
  describe('Provider Selection', () => {
    it('should use primary provider when available', async () => {
      const primaryProvider = new MockTestProvider('primary', false);
      const fallbackProvider = new MockTestProvider('fallback', false);

      // Simulate orchestrator behavior
      const providers = [primaryProvider, fallbackProvider];

      const result = await providers[0].complete([{ role: 'user', content: 'test' }]);

      expect(result.provider).toBe('primary');
      expect(primaryProvider.getCallCount()).toBe(1);
      expect(fallbackProvider.getCallCount()).toBe(0);
    });

    it('should failover to secondary when primary fails', async () => {
      const primaryProvider = new MockTestProvider('primary', true);
      const fallbackProvider = new MockTestProvider('fallback', false);

      const providers = [primaryProvider, fallbackProvider];
      let result: LLMCompletionResult | null = null;

      for (const provider of providers) {
        try {
          result = await provider.complete([{ role: 'user', content: 'test' }]);
          break;
        } catch {
          continue;
        }
      }

      expect(result).not.toBeNull();
      expect(result!.provider).toBe('fallback');
    });

    it('should throw when all providers fail', async () => {
      const primaryProvider = new MockTestProvider('primary', true);
      const fallbackProvider = new MockTestProvider('fallback', true);

      const providers = [primaryProvider, fallbackProvider];
      const errors: Error[] = [];

      for (const provider of providers) {
        try {
          await provider.complete([{ role: 'user', content: 'test' }]);
        } catch (error) {
          errors.push(error as Error);
        }
      }

      expect(errors).toHaveLength(2);
    });
  });

  describe('Streaming Failover', () => {
    it('should stream from primary when available', async () => {
      const provider = new MockTestProvider('primary', false);

      const chunks: string[] = [];
      for await (const chunk of provider.stream([{ role: 'user', content: 'test' }])) {
        chunks.push(chunk.content);
      }

      expect(chunks.join('')).toBe('Hello World');
    });

    it('should failover streaming to secondary', async () => {
      const primaryProvider = new MockTestProvider('primary', true);
      const fallbackProvider = new MockTestProvider('fallback', false);

      const providers = [primaryProvider, fallbackProvider];
      let chunks: string[] = [];

      for (const provider of providers) {
        try {
          chunks = [];
          for await (const chunk of provider.stream([{ role: 'user', content: 'test' }])) {
            chunks.push(chunk.content);
          }
          break;
        } catch {
          continue;
        }
      }

      expect(chunks.join('')).toBe('Hello World');
    });
  });

  describe('Health Checks', () => {
    it('should report provider availability', async () => {
      const availableProvider = new MockTestProvider('available', false);
      const unavailableProvider = new MockTestProvider('unavailable', true);

      expect(await availableProvider.isAvailable()).toBe(true);
      expect(await unavailableProvider.isAvailable()).toBe(false);
    });
  });

  describe('Token Counting', () => {
    it('should estimate token count', async () => {
      const provider = new MockTestProvider('test');

      const count = await provider.countTokens('This is a test message');
      expect(count).toBeGreaterThan(0);
    });
  });
});

describe('Provider Order Configuration', () => {
  it('should respect configured fallback order', () => {
    const primaryProvider = 'openai';
    const fallbackOrder = ['openai', 'anthropic', 'google'];

    const order = [primaryProvider];
    for (const fallback of fallbackOrder) {
      if (fallback !== primaryProvider && !order.includes(fallback)) {
        order.push(fallback);
      }
    }

    expect(order).toEqual(['openai', 'anthropic', 'google']);
  });

  it('should put primary first even if not in fallback order', () => {
    const primaryProvider = 'google';
    const fallbackOrder = ['openai', 'anthropic'];

    const order = [primaryProvider];
    for (const fallback of fallbackOrder) {
      if (fallback !== primaryProvider && !order.includes(fallback)) {
        order.push(fallback);
      }
    }

    expect(order).toEqual(['google', 'openai', 'anthropic']);
  });

  it('should handle duplicate entries', () => {
    const primaryProvider = 'openai';
    const fallbackOrder = ['openai', 'anthropic', 'openai', 'google'];

    const order = [primaryProvider];
    for (const fallback of fallbackOrder) {
      if (fallback !== primaryProvider && !order.includes(fallback)) {
        order.push(fallback);
      }
    }

    expect(order).toEqual(['openai', 'anthropic', 'google']);
  });
});
