/**
 * Priority Queue Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PriorityQueue } from '../priority-queue';
import { MemoryStore } from '../stores/memory-store';

describe('PriorityQueue', () => {
  let queue: PriorityQueue<{ userId: string; action: string }>;
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    queue = new PriorityQueue({
      name: 'test-queue',
      store,
      maxSize: 100,
      defaultTimeout: 60000,
    });
  });

  afterEach(async () => {
    queue.stopProcessing();
    await store.close();
  });

  describe('enqueue', () => {
    it('should add items to the queue', async () => {
      const result = await queue.enqueue({
        id: 'req-1',
        priority: 1,
        data: { userId: 'user-1', action: 'test' },
      });

      expect(result).toBe(true);
      expect(queue.size()).toBe(1);
    });

    it('should reject when queue is full', async () => {
      const smallQueue = new PriorityQueue<string>({
        name: 'small-queue',
        store,
        maxSize: 2,
      });

      await smallQueue.enqueue({ id: '1', priority: 1, data: 'a' });
      await smallQueue.enqueue({ id: '2', priority: 1, data: 'b' });

      const result = await smallQueue.enqueue({ id: '3', priority: 1, data: 'c' });

      expect(result).toBe(false);
      expect(smallQueue.size()).toBe(2);
    });

    it('should order by priority (highest first)', async () => {
      await queue.enqueue({ id: 'low', priority: 1, data: { userId: '1', action: 'low' } });
      await queue.enqueue({ id: 'high', priority: 10, data: { userId: '2', action: 'high' } });
      await queue.enqueue({ id: 'mid', priority: 5, data: { userId: '3', action: 'mid' } });

      const first = await queue.dequeue();
      const second = await queue.dequeue();
      const third = await queue.dequeue();

      expect(first?.id).toBe('high');
      expect(second?.id).toBe('mid');
      expect(third?.id).toBe('low');
    });
  });

  describe('dequeue', () => {
    it('should remove and return the highest priority item', async () => {
      await queue.enqueue({ id: 'req-1', priority: 5, data: { userId: '1', action: 'a' } });
      await queue.enqueue({ id: 'req-2', priority: 10, data: { userId: '2', action: 'b' } });

      const item = await queue.dequeue();

      expect(item?.id).toBe('req-2');
      expect(queue.size()).toBe(1);
    });

    it('should return undefined when empty', async () => {
      const item = await queue.dequeue();
      expect(item).toBeUndefined();
    });
  });

  describe('peek', () => {
    it('should return item without removing', async () => {
      await queue.enqueue({ id: 'req-1', priority: 1, data: { userId: '1', action: 'a' } });

      const item = queue.peek('req-1');

      expect(item?.id).toBe('req-1');
      expect(queue.size()).toBe(1);
    });

    it('should return undefined for non-existent item', () => {
      const item = queue.peek('non-existent');
      expect(item).toBeUndefined();
    });
  });

  describe('peekNext', () => {
    it('should return next item without removing', async () => {
      await queue.enqueue({ id: 'req-1', priority: 1, data: { userId: '1', action: 'a' } });
      await queue.enqueue({ id: 'req-2', priority: 10, data: { userId: '2', action: 'b' } });

      const item = queue.peekNext();

      expect(item?.id).toBe('req-2');
      expect(queue.size()).toBe(2);
    });
  });

  describe('remove', () => {
    it('should remove specific item by ID', async () => {
      await queue.enqueue({ id: 'req-1', priority: 1, data: { userId: '1', action: 'a' } });
      await queue.enqueue({ id: 'req-2', priority: 2, data: { userId: '2', action: 'b' } });

      const result = await queue.remove('req-1');

      expect(result).toBe(true);
      expect(queue.size()).toBe(1);
      expect(queue.peek('req-1')).toBeUndefined();
    });

    it('should return false for non-existent item', async () => {
      const result = await queue.remove('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all items', async () => {
      await queue.enqueue({ id: 'req-1', priority: 1, data: { userId: '1', action: 'a' } });
      await queue.enqueue({ id: 'req-2', priority: 2, data: { userId: '2', action: 'b' } });

      await queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe('size and isEmpty', () => {
    it('should report correct size', async () => {
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);

      await queue.enqueue({ id: 'req-1', priority: 1, data: { userId: '1', action: 'a' } });

      expect(queue.size()).toBe(1);
      expect(queue.isEmpty()).toBe(false);
    });

    it('should report isFull correctly', async () => {
      const smallQueue = new PriorityQueue<string>({
        name: 'small-queue',
        store,
        maxSize: 2,
      });

      expect(smallQueue.isFull()).toBe(false);

      await smallQueue.enqueue({ id: '1', priority: 1, data: 'a' });
      await smallQueue.enqueue({ id: '2', priority: 1, data: 'b' });

      expect(smallQueue.isFull()).toBe(true);
    });
  });

  describe('timeout handling', () => {
    it('should remove expired items on dequeue', async () => {
      await queue.enqueue({
        id: 'req-1',
        priority: 1,
        data: { userId: '1', action: 'a' },
        timeout: 1, // 1ms timeout
      });

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 10));

      const item = await queue.dequeue();
      expect(item).toBeUndefined();
    });
  });

  describe('processing', () => {
    it('should process items with provided processor', async () => {
      const processed: string[] = [];

      await queue.enqueue({ id: 'req-1', priority: 1, data: { userId: '1', action: 'a' } });
      await queue.enqueue({ id: 'req-2', priority: 2, data: { userId: '2', action: 'b' } });

      queue.startProcessing(async (item) => {
        processed.push(item.id);
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(processed).toContain('req-1');
      expect(processed).toContain('req-2');
      expect(queue.isEmpty()).toBe(true);
    });

    it('should stop processing when requested', async () => {
      await queue.enqueue({ id: 'req-1', priority: 1, data: { userId: '1', action: 'a' } });

      queue.startProcessing(async () => {
        // Slow processor
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      queue.stopProcessing();

      // Add more items after stopping
      await queue.enqueue({ id: 'req-2', priority: 1, data: { userId: '2', action: 'b' } });

      // Queue should not be empty since processing stopped
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(queue.size()).toBeGreaterThan(0);
    });
  });

  describe('stats', () => {
    it('should provide queue statistics', async () => {
      await queue.enqueue({ id: 'req-1', priority: 1, data: { userId: '1', action: 'a' } });
      await queue.enqueue({ id: 'req-2', priority: 1, data: { userId: '2', action: 'b' } });
      await queue.enqueue({ id: 'req-3', priority: 5, data: { userId: '3', action: 'c' } });

      const stats = queue.getStats();

      expect(stats.name).toBe('test-queue');
      expect(stats.size).toBe(3);
      expect(stats.maxSize).toBe(100);
      expect(stats.processing).toBe(false);
      expect(stats.priorityDistribution[1]).toBe(2);
      expect(stats.priorityDistribution[5]).toBe(1);
    });
  });
});
