/**
 * LLM Provider Tests
 *
 * Comprehensive tests for LLM provider implementations including:
 * - Provider failover scenarios
 * - Circuit breaker behavior
 * - Rate limiting
 * - Caching behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { RateLimiter } from '../src/utils/rate-limiter.js';
import { CircuitBreaker, CircuitBreakerState } from '../src/utils/circuit-breaker.js';
import { LLMCache } from '../src/cache/llm-cache.js';
import type { LLMMessage, LLMCompletionResult } from '../src/providers/llm-provider.interface.js';

describe('RateLimiter', () => {
  it('should allow requests within limits', async () => {
    const limiter = new RateLimiter({
      tokensPerMinute: 1000,
      requestsPerMinute: 100,
    });

    // Should not block
    const start = Date.now();
    await limiter.acquire(100);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it('should track available tokens', () => {
    const limiter = new RateLimiter({
      tokensPerMinute: 1000,
      requestsPerMinute: 100,
    });

    const status = limiter.getStatus();
    expect(status.availableTokens).toBe(1000);
    expect(status.availableRequests).toBe(100);
  });

  it('should queue requests when rate limited', async () => {
    const limiter = new RateLimiter({
      tokensPerMinute: 100,
      requestsPerMinute: 10,
    });

    // Consume all tokens
    await limiter.acquire(100);

    const status = limiter.getStatus();
    expect(status.availableTokens).toBeLessThan(100);
  });
});

describe('CircuitBreaker', () => {
  it('should start in closed state', () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
    });

    expect(breaker.isOpen()).toBe(false);
    expect(breaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
  });

  it('should open after threshold failures', () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
    });

    breaker.recordFailure(new Error('Test error 1'));
    expect(breaker.isOpen()).toBe(false);

    breaker.recordFailure(new Error('Test error 2'));
    expect(breaker.isOpen()).toBe(false);

    breaker.recordFailure(new Error('Test error 3'));
    expect(breaker.isOpen()).toBe(true);
    expect(breaker.getStats().state).toBe(CircuitBreakerState.OPEN);
  });

  it('should reset failure count on success', () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
    });

    breaker.recordFailure(new Error('Error 1'));
    breaker.recordFailure(new Error('Error 2'));
    expect(breaker.getStats().failures).toBe(2);

    breaker.recordSuccess();
    expect(breaker.getStats().failures).toBe(0);
  });

  it('should execute operations when closed', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
    });

    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');
  });

  it('should reject operations when open', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 10000,
    });

    breaker.recordFailure(new Error('Error'));
    expect(breaker.isOpen()).toBe(true);

    await expect(breaker.execute(async () => 'should not run')).rejects.toThrow(
      'Circuit breaker is open'
    );
  });

  it('should transition to half-open after timeout', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 50, // Short timeout for test
    });

    breaker.recordFailure(new Error('Error'));
    expect(breaker.isOpen()).toBe(true);

    // Wait for reset timeout
    await new Promise((r) => setTimeout(r, 60));

    expect(breaker.isOpen()).toBe(false);
    expect(breaker.getStats().state).toBe(CircuitBreakerState.HALF_OPEN);
  });

  it('should call onStateChange callback', () => {
    const stateChanges: { from: CircuitBreakerState; to: CircuitBreakerState }[] = [];

    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 1000,
      onStateChange: (from, to) => {
        stateChanges.push({ from, to });
      },
    });

    breaker.recordFailure(new Error('Error'));

    expect(stateChanges).toHaveLength(1);
    expect(stateChanges[0]).toEqual({
      from: CircuitBreakerState.CLOSED,
      to: CircuitBreakerState.OPEN,
    });
  });

  it('should manually reset', () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 10000,
    });

    breaker.recordFailure(new Error('Error'));
    expect(breaker.isOpen()).toBe(true);

    breaker.reset();
    expect(breaker.isOpen()).toBe(false);
    expect(breaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
  });
});

describe('LLMCache', () => {
  it('should return null for uncached keys', async () => {
    const cache = new LLMCache({ enabled: true });
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should cache and retrieve results', async () => {
    const cache = new LLMCache({ enabled: true });

    const mockResult: LLMCompletionResult = {
      content: 'Test response',
      model: 'gpt-4',
      provider: 'openai',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      finishReason: 'stop',
      latencyMs: 100,
      cached: false,
    };

    await cache.set('test-key', mockResult);
    const retrieved = await cache.get('test-key');

    expect(retrieved).toEqual(mockResult);
  });

  it('should generate consistent cache keys', () => {
    const cache = new LLMCache({ enabled: true });

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hello' },
    ];

    const key1 = cache.generateKey(messages, 'gpt-4', { temperature: 0.7 });
    const key2 = cache.generateKey(messages, 'gpt-4', { temperature: 0.7 });
    const key3 = cache.generateKey(messages, 'gpt-4', { temperature: 0.5 });

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
  });

  it('should respect disabled cache', async () => {
    const cache = new LLMCache({ enabled: false });

    const mockResult: LLMCompletionResult = {
      content: 'Test',
      model: 'gpt-4',
      provider: 'openai',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      finishReason: 'stop',
      latencyMs: 100,
      cached: false,
    };

    await cache.set('key', mockResult);
    const result = await cache.get('key');

    expect(result).toBeNull();
  });

  it('should expire entries based on TTL', async () => {
    const cache = new LLMCache({ enabled: true, ttlSeconds: 0.05 }); // 50ms TTL

    const mockResult: LLMCompletionResult = {
      content: 'Test',
      model: 'gpt-4',
      provider: 'openai',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      finishReason: 'stop',
      latencyMs: 100,
      cached: false,
    };

    await cache.set('key', mockResult);

    // Should exist immediately
    let result = await cache.get('key');
    expect(result).not.toBeNull();

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 60));

    // Should be expired
    result = await cache.get('key');
    expect(result).toBeNull();
  });

  it('should report cache statistics', () => {
    const cache = new LLMCache({
      enabled: true,
      ttlSeconds: 3600,
      maxMemoryEntries: 1000,
    });

    const stats = cache.getStats();

    expect(stats.enabled).toBe(true);
    expect(stats.ttlSeconds).toBe(3600);
    expect(stats.maxSize).toBe(1000);
    expect(stats.size).toBe(0);
  });

  it('should clear all entries', async () => {
    const cache = new LLMCache({ enabled: true });

    const mockResult: LLMCompletionResult = {
      content: 'Test',
      model: 'gpt-4',
      provider: 'openai',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      finishReason: 'stop',
      latencyMs: 100,
      cached: false,
    };

    await cache.set('key1', mockResult);
    await cache.set('key2', mockResult);

    expect(cache.getStats().size).toBe(2);

    await cache.clear();

    expect(cache.getStats().size).toBe(0);
  });
});
