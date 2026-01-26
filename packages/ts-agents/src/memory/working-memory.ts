/**
 * WorkingMemory - Short-term storage for current task context
 * Implements Miller's Law (7 ± 2 items)
 */

import { v4 as uuid } from 'uuid';
import type { MemoryItem } from '../core/types';

export interface WorkingMemoryConfig {
  capacity: number;
}

export class WorkingMemory {
  private items: MemoryItem[] = [];
  private capacity: number;
  private focusIndex: number = -1;

  constructor(capacity: number = 7) {
    this.capacity = capacity;
  }

  /**
   * Push an item to working memory
   * If at capacity, removes the oldest item
   */
  async push(item: Omit<MemoryItem, 'id'>): Promise<MemoryItem> {
    const newItem: MemoryItem = {
      id: uuid(),
      ...item,
    };

    this.items.push(newItem);

    // Enforce capacity limit (Miller's Law)
    while (this.items.length > this.capacity) {
      this.items.shift();
      // Adjust focus index if needed
      if (this.focusIndex > 0) {
        this.focusIndex--;
      }
    }

    return newItem;
  }

  /**
   * Pop the most recent item
   */
  async pop(): Promise<MemoryItem | undefined> {
    const item = this.items.pop();
    if (this.focusIndex >= this.items.length) {
      this.focusIndex = this.items.length - 1;
    }
    return item;
  }

  /**
   * Get an item by index
   */
  async get(index: number): Promise<MemoryItem | undefined> {
    if (index < 0 || index >= this.items.length) {
      return undefined;
    }
    return this.items[index];
  }

  /**
   * Get an item by ID
   */
  async getById(id: string): Promise<MemoryItem | undefined> {
    return this.items.find(item => item.id === id);
  }

  /**
   * Get all items
   */
  async getAll(): Promise<MemoryItem[]> {
    return [...this.items];
  }

  /**
   * Clear all items
   */
  async clear(): Promise<void> {
    this.items = [];
    this.focusIndex = -1;
  }

  /**
   * Get the current item count
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Check if working memory is full
   */
  isFull(): boolean {
    return this.items.length >= this.capacity;
  }

  /**
   * Check if working memory is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Set the focus to a specific item
   */
  setFocus(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.focusIndex = index;
    }
  }

  /**
   * Get the currently focused item
   */
  getFocused(): MemoryItem | undefined {
    if (this.focusIndex >= 0 && this.focusIndex < this.items.length) {
      return this.items[this.focusIndex];
    }
    return this.items[this.items.length - 1];
  }

  /**
   * Move focus to the next item
   */
  focusNext(): MemoryItem | undefined {
    if (this.focusIndex < this.items.length - 1) {
      this.focusIndex++;
    }
    return this.getFocused();
  }

  /**
   * Move focus to the previous item
   */
  focusPrevious(): MemoryItem | undefined {
    if (this.focusIndex > 0) {
      this.focusIndex--;
    }
    return this.getFocused();
  }

  /**
   * Remove an item by ID
   */
  async remove(id: string): Promise<boolean> {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      this.items.splice(index, 1);
      if (this.focusIndex >= this.items.length) {
        this.focusIndex = this.items.length - 1;
      }
      return true;
    }
    return false;
  }

  /**
   * Update an item by ID
   */
  async update(
    id: string,
    updates: Partial<Omit<MemoryItem, 'id'>>
  ): Promise<MemoryItem | undefined> {
    const item = this.items.find(i => i.id === id);
    if (item) {
      Object.assign(item, updates);
      return item;
    }
    return undefined;
  }

  /**
   * Search working memory
   */
  async search(query: string): Promise<MemoryItem[]> {
    const queryLower = query.toLowerCase();
    return this.items.filter(item => {
      const contentStr = JSON.stringify(item.content).toLowerCase();
      return contentStr.includes(queryLower);
    });
  }

  /**
   * Get the peek at the most recent item without removing
   */
  peek(): MemoryItem | undefined {
    return this.items[this.items.length - 1];
  }

  /**
   * Get the oldest item without removing
   */
  peekFirst(): MemoryItem | undefined {
    return this.items[0];
  }

  /**
   * Replace all items
   */
  replace(items: MemoryItem[]): void {
    this.items = items.slice(-this.capacity);
    this.focusIndex = this.items.length - 1;
  }

  /**
   * Get capacity
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Get remaining capacity
   */
  getRemainingCapacity(): number {
    return this.capacity - this.items.length;
  }

  /**
   * Serialize working memory
   */
  serialize(): string {
    return JSON.stringify({
      items: this.items,
      capacity: this.capacity,
      focusIndex: this.focusIndex,
    });
  }

  /**
   * Restore from serialized data
   */
  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.items = parsed.items.map((item: Record<string, unknown>) => ({
      ...item,
      timestamp: new Date(item.timestamp as string),
    }));
    this.capacity = parsed.capacity;
    this.focusIndex = parsed.focusIndex;
  }
}
