/**
 * Message history management
 */

import type { Message, MessageRole } from '../core/types.js';

export interface MessageHistoryOptions {
  /** Maximum number of messages to keep */
  maxMessages?: number;
  /** Include system messages in count */
  countSystemMessages?: boolean;
  /** Preserve first N messages */
  preserveFirst?: number;
  /** Preserve last N messages */
  preserveLast?: number;
}

/**
 * Manages message history with automatic truncation
 */
export class MessageHistory {
  private messages: Message[] = [];
  private readonly options: MessageHistoryOptions;

  constructor(options?: MessageHistoryOptions) {
    this.options = {
      maxMessages: options?.maxMessages ?? 100,
      countSystemMessages: options?.countSystemMessages ?? false,
      preserveFirst: options?.preserveFirst ?? 1,
      preserveLast: options?.preserveLast ?? 10,
    };
  }

  /**
   * Add a message to the history
   */
  add(message: Message): void {
    this.messages.push(message);
    this.truncateIfNeeded();
  }

  /**
   * Add multiple messages
   */
  addAll(messages: Message[]): void {
    this.messages.push(...messages);
    this.truncateIfNeeded();
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
  getLast(count: number): Message[] {
    return this.messages.slice(-count);
  }

  /**
   * Get messages by role
   */
  getByRole(role: MessageRole): Message[] {
    return this.messages.filter(m => m.role === role);
  }

  /**
   * Get the system message (first system message)
   */
  getSystemMessage(): Message | undefined {
    return this.messages.find(m => m.role === 'system');
  }

  /**
   * Get non-system messages
   */
  getConversation(): Message[] {
    return this.messages.filter(m => m.role !== 'system');
  }

  /**
   * Get the most recent message
   */
  getLatest(): Message | undefined {
    return this.messages[this.messages.length - 1];
  }

  /**
   * Get message count
   */
  size(): number {
    return this.messages.length;
  }

  /**
   * Check if history is empty
   */
  isEmpty(): boolean {
    return this.messages.length === 0;
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Clear all except system messages
   */
  clearConversation(): void {
    this.messages = this.messages.filter(m => m.role === 'system');
  }

  /**
   * Replace the system message
   */
  setSystemMessage(content: string): void {
    const systemMessage: Message = {
      id: this.generateId(),
      role: 'system',
      content,
      timestamp: new Date(),
    };

    // Remove existing system messages
    this.messages = this.messages.filter(m => m.role !== 'system');

    // Add new system message at the beginning
    this.messages.unshift(systemMessage);
  }

  /**
   * Find a message by ID
   */
  findById(id: string): Message | undefined {
    return this.messages.find(m => m.id === id);
  }

  /**
   * Remove a message by ID
   */
  removeById(id: string): boolean {
    const index = this.messages.findIndex(m => m.id === id);
    if (index === -1) return false;
    this.messages.splice(index, 1);
    return true;
  }

  /**
   * Update a message
   */
  updateMessage(id: string, updates: Partial<Message>): boolean {
    const message = this.findById(id);
    if (!message) return false;

    Object.assign(message, updates);
    return true;
  }

  /**
   * Clone the history
   */
  clone(): MessageHistory {
    const clone = new MessageHistory(this.options);
    clone.messages = this.messages.map(m => ({ ...m }));
    return clone;
  }

  /**
   * Serialize to JSON
   */
  serialize(): string {
    return JSON.stringify(this.messages);
  }

  /**
   * Deserialize from JSON
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data) as Message[];
      this.messages = parsed.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    } catch {
      this.messages = [];
    }
  }

  private truncateIfNeeded(): void {
    const maxMessages = this.options.maxMessages ?? 100;
    const countSystem = this.options.countSystemMessages ?? false;

    let messagesToCount = countSystem
      ? this.messages
      : this.messages.filter(m => m.role !== 'system');

    if (messagesToCount.length <= maxMessages) {
      return;
    }

    const preserveFirst = this.options.preserveFirst ?? 1;
    const preserveLast = this.options.preserveLast ?? 10;

    // Separate system and non-system messages
    const systemMessages = this.messages.filter(m => m.role === 'system');
    const nonSystemMessages = this.messages.filter(m => m.role !== 'system');

    // Calculate how many to keep
    const toRemove = nonSystemMessages.length - (maxMessages - systemMessages.length);

    if (toRemove <= 0) {
      return;
    }

    // Keep first N and last M, remove from the middle
    const keepFromStart = Math.min(preserveFirst, nonSystemMessages.length);
    const keepFromEnd = Math.min(preserveLast, nonSystemMessages.length - keepFromStart);

    const firstPart = nonSystemMessages.slice(0, keepFromStart);
    const lastPart = nonSystemMessages.slice(-keepFromEnd);

    // Reconstruct messages: system + first + last
    this.messages = [...systemMessages, ...firstPart, ...lastPart];
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Create a user message
 */
export function createUserMessage(content: string, metadata?: Record<string, unknown>): Message {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    role: 'user',
    content,
    timestamp: new Date(),
    metadata,
  };
}

/**
 * Create an assistant message
 */
export function createAssistantMessage(
  content: string,
  options?: {
    toolCalls?: Message['toolCalls'];
    metadata?: Record<string, unknown>;
  }
): Message {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    role: 'assistant',
    content,
    toolCalls: options?.toolCalls,
    timestamp: new Date(),
    metadata: options?.metadata,
  };
}

/**
 * Create a tool result message
 */
export function createToolMessage(
  toolCallId: string,
  content: string,
  name?: string
): Message {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    role: 'tool',
    content,
    name,
    toolCallId,
    timestamp: new Date(),
  };
}

/**
 * Create a system message
 */
export function createSystemMessage(content: string): Message {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    role: 'system',
    content,
    timestamp: new Date(),
  };
}
