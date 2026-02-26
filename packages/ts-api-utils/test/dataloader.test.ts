import { describe, it, expect, beforeEach } from 'vitest';

import { MapCache, LRUCache, TTLCache } from '../src/dataloader.js';

// ── MapCache tests ──────────────────────────────────────────────

describe('MapCache', () => {
  let cache: MapCache<string, string>;

  beforeEach(() => {
    cache = new MapCache();
  });

  it('stores and retrieves a value', () => {
    const promise = Promise.resolve('hello');
    cache.set('key1', promise);
    expect(cache.get('key1')).toBe(promise);
  });

  it('returns undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('deletes a key', () => {
    cache.set('k', Promise.resolve('v'));
    cache.delete('k');
    expect(cache.get('k')).toBeUndefined();
  });

  it('clears all entries', () => {
    cache.set('a', Promise.resolve('1'));
    cache.set('b', Promise.resolve('2'));
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});

// ── LRUCache tests ──────────────────────────────────────────────

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache<string, number>(10);
    const p = Promise.resolve(42);
    cache.set('x', p);
    expect(cache.get('x')).toBe(p);
  });

  it('evicts oldest entry when at capacity', () => {
    const cache = new LRUCache<string, number>(2);
    cache.set('a', Promise.resolve(1));
    cache.set('b', Promise.resolve(2));
    cache.set('c', Promise.resolve(3)); // should evict 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeDefined();
    expect(cache.get('c')).toBeDefined();
  });

  it('accessing a key moves it to most-recently-used', () => {
    const cache = new LRUCache<string, number>(2);
    cache.set('a', Promise.resolve(1));
    cache.set('b', Promise.resolve(2));
    cache.get('a'); // touch 'a' so 'b' becomes least-recently-used
    cache.set('c', Promise.resolve(3)); // should evict 'b', not 'a'
    expect(cache.get('a')).toBeDefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('updates existing key position on set', () => {
    const cache = new LRUCache<string, number>(2);
    cache.set('a', Promise.resolve(1));
    cache.set('b', Promise.resolve(2));
    cache.set('a', Promise.resolve(10)); // update 'a'
    cache.set('c', Promise.resolve(3)); // should evict 'b'
    expect(cache.get('a')).toBeDefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('defaults to maxSize 1000', () => {
    const cache = new LRUCache<string, number>();
    // Just ensure it doesn't throw with many entries
    for (let i = 0; i < 50; i++) {
      cache.set(`k${i}`, Promise.resolve(i));
    }
    expect(cache.get('k0')).toBeDefined();
  });

  it('clears all entries', () => {
    const cache = new LRUCache<string, number>(5);
    cache.set('a', Promise.resolve(1));
    cache.set('b', Promise.resolve(2));
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('deletes a specific key', () => {
    const cache = new LRUCache<string, number>(5);
    cache.set('a', Promise.resolve(1));
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
  });
});

// ── TTLCache tests ──────────────────────────────────────────────

describe('TTLCache', () => {
  it('stores and retrieves within TTL', () => {
    const cache = new TTLCache<string, string>(60_000);
    const p = Promise.resolve('val');
    cache.set('key', p);
    expect(cache.get('key')).toBe(p);
  });

  it('returns undefined for expired entries', () => {
    // TTL of 0ms means immediate expiry
    const cache = new TTLCache<string, string>(0);
    cache.set('key', Promise.resolve('val'));
    // Expired since TTL is 0
    expect(cache.get('key')).toBeUndefined();
  });

  it('returns undefined for missing keys', () => {
    const cache = new TTLCache<string, string>(60_000);
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('deletes a specific key', () => {
    const cache = new TTLCache<string, string>(60_000);
    cache.set('a', Promise.resolve('1'));
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
  });

  it('clears all entries', () => {
    const cache = new TTLCache<string, string>(60_000);
    cache.set('a', Promise.resolve('1'));
    cache.set('b', Promise.resolve('2'));
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('defaults to 60s TTL', () => {
    const cache = new TTLCache<string, number>();
    cache.set('k', Promise.resolve(42));
    expect(cache.get('k')).toBeDefined();
  });
});
