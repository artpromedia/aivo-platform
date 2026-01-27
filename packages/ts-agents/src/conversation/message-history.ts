/**
 * MessageHistory - Manages conversation message history
 */

import { v4 as uuid } from 'uuid';
import type { Message, MessageRole } from '../core/types';

export interface MessageHistoryConfig {
  maxMessages: number;
  maxTokensPerMessage?: number;
}

export class MessageHistory {
  private messages: Message[] = [];
  private config: Required<MessageHistoryConfig>;

  constructor(config?: Partial<MessageHistoryConfig>) {
    this.config = {
      maxMessages: 100,
      maxTokensPerMessage: 10000,
      ...config,
    };
  }

  /**
   * Add a message to history
   */
  add(
    role: MessageRole,
    content: string,
    options?: {
      name?: string;
      toolCallId?: string;
      toolCalls?: Message['toolCalls'];
      metadata?: Record<string, unknown>;
    }
  ): Message {
    const message: Message = {
      id: uuid(),
      role,
      content,
      name: options?.name,
      toolCallId: options?.toolCallId,
      toolCalls: options?.toolCalls,
      timestamp: new Date(),
      metadata: options?.metadata,
    };

    this.messages.push(message);

    // Enforce max messages limit
    while (this.messages.length > this.config.maxMessages) {
      this.messages.shift();
    }

    return message;
  }

  /**
   * Add a pre-formed message
   */
  addMessage(message: Message): void {
    this.messages.push(message);

    while (this.messages.length > this.config.maxMessages) {
      this.messages.shift();
    }
  }

  /**
   * Get all messages
   */
  getAll(): Message[] {
    return [...this.messages];
  }

  /**
   * Get the last N messages
   */
  getLast(n: number): Message[] {
    return this.messages.slice(-n);
  }

  /**
   * Get messages by role
   */
  getByRole(role: MessageRole): Message[] {
    return this.messages.filter(m => m.role === role);
  }

  /**
   * Get a message by ID
   */
  getById(id: string): Message | undefined {
    return this.messages.find(m => m.id === id);
  }

  /**
   * Get message count
   */
  count(): number {
    return this.messages.length;
  }

  /**
   * Get the last message
   */
  getLastMessage(): Message | undefined {
    return this.messages[this.messages.length - 1];
  }

  /**
   * Get the last message by role
   */
  getLastByRole(role: MessageRole): Message | undefined {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i];
      if (message && message.role === role) {
        return message;
      }
    }
    return undefined;
  }

  /**
   * Find messages containing text
   */
  search(query: string): Message[] {
    const queryLower = query.toLowerCase();
    return this.messages.filter(m =>
      m.content.toLowerCase().includes(queryLower)
    );
  }

  /**
   * Get messages in a time range
   */
  getInTimeRange(start: Date, end: Date): Message[] {
    return this.messages.filter(m => {
      const timestamp = new Date(m.timestamp);
      return timestamp >= start && timestamp <= end;
    });
  }

  /**
   * Remove a message by ID
   */
  remove(id: string): boolean {
    const index = this.messages.findIndex(m => m.id === id);
    if (index !== -1) {
      this.messages.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Update a message
   */
  update(id: string, updates: Partial<Message>): Message | undefined {
    const message = this.messages.find(m => m.id === id);
    if (message) {
      Object.assign(message, updates);
      return message;
    }
    return undefined;
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Truncate to N messages
   */
  truncate(n: number): void {
    if (this.messages.length > n) {
      this.messages = this.messages.slice(-n);
    }
  }

  /**
   * Remove messages before a certain date
   */
  pruneOlderThan(date: Date): number {
    const originalLength = this.messages.length;
    this.messages = this.messages.filter(m => new Date(m.timestamp) >= date);
    return originalLength - this.messages.length;
  }

  /**
   * Get conversation as a single string
   */
  toString(): string {
    return this.messages
      .map(m => `[${m.role}]: ${m.content}`)
      .join('\n');
  }

  /**
   * Export messages
   */
  export(): Message[] {
    return JSON.parse(JSON.stringify(this.messages));
  }

  /**
   * Import messages
   */
  import(messages: Message[]): void {
    this.messages = messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  }

  /**
   * Get alternating messages (user/assistant pairs)
   */
  getAlternating(): Message[] {
    const result: Message[] = [];
    let expectingUser = true;

    for (const message of this.messages) {
      if (message.role === 'system') {
        result.push(message);
        continue;
      }

      if (expectingUser && message.role === 'user') {
        result.push(message);
        expectingUser = false;
      } else if (!expectingUser && message.role === 'assistant') {
        result.push(message);
        expectingUser = true;
      } else if (message.role === 'tool') {
        // Tool messages follow their assistant message
        result.push(message);
      }
    }

    return result;
  }

  /**
   * Estimate total tokens in history
   */
  estimateTokens(): number {
    let total = 0;
    for (const message of this.messages) {
      // Rough estimate: ~4 characters per token
      total += Math.ceil(message.content.length / 4);
      total += 4; // Overhead for role, formatting
    }
    return total;
  }
}
