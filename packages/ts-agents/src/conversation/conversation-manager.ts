/**
 * Conversation manager for handling multi-turn conversations
 */

import type { Message, ConversationConfig, ConversationBranch } from '../core/types.js';
import {
  MessageHistory,
  createUserMessage,
  createAssistantMessage,
  createToolMessage,
  createSystemMessage,
} from './message-history.js';
import { ContextWindowManager, createContextWindowManager } from './context-window.js';

export interface ConversationManagerOptions extends ConversationConfig {
  /** Initial system prompt */
  systemPrompt?: string;
  /** Enable conversation branching */
  enableBranching?: boolean;
}

/**
 * Manages conversation state and history
 */
export class ConversationManager {
  private readonly history: MessageHistory;
  private readonly contextManager: ContextWindowManager;
  private readonly config: ConversationManagerOptions;
  private readonly branches: Map<string, ConversationBranch> = new Map();
  private currentBranchId: string | null = null;

  constructor(config: ConversationManagerOptions) {
    this.config = config;
    this.history = new MessageHistory({
      maxMessages: config.maxHistoryLength ?? 100,
    });
    this.contextManager = createContextWindowManager(config.maxTokens ?? 4096);

    if (config.systemPrompt) {
      this.history.setSystemMessage(config.systemPrompt);
    }
  }

  /**
   * Add a message to the conversation
   */
  async addMessage(message: Message): Promise<void> {
    this.history.add(message);
  }

  /**
   * Add a user message
   */
  async addUserMessage(content: string, metadata?: Record<string, unknown>): Promise<Message> {
    const message = createUserMessage(content, metadata);
    await this.addMessage(message);
    return message;
  }

  /**
   * Add an assistant message
   */
  async addAssistantMessage(
    content: string,
    options?: {
      toolCalls?: Message['toolCalls'];
      metadata?: Record<string, unknown>;
    }
  ): Promise<Message> {
    const message = createAssistantMessage(content, options);
    await this.addMessage(message);
    return message;
  }

  /**
   * Add a tool result message
   */
  async addToolResult(
    toolCallId: string,
    content: string,
    name?: string
  ): Promise<Message> {
    const message = createToolMessage(toolCallId, content, name);
    await this.addMessage(message);
    return message;
  }

  /**
   * Get the conversation history
   */
  async getHistory(limit?: number): Promise<Message[]> {
    if (limit) {
      return this.history.getLast(limit);
    }
    return this.history.getAll();
  }

  /**
   * Get the full conversation for model input
   */
  async getConversation(): Promise<Message[]> {
    return this.history.getAll();
  }

  /**
   * Get messages that fit within a token limit
   */
  async getContextWindow(maxTokens: number): Promise<Message[]> {
    const messages = this.history.getAll();
    return this.contextManager.truncateToFit(messages, maxTokens);
  }

  /**
   * Summarize the conversation history
   */
  async summarizeHistory(): Promise<string> {
    const messages = this.history.getConversation();

    if (messages.length === 0) {
      return 'No conversation history.';
    }

    // Create a simple summary
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    const topics: string[] = [];
    for (const msg of userMessages.slice(-5)) {
      // Extract first sentence or first 100 chars
      const topic = msg.content.split('.')[0]?.substring(0, 100) ?? msg.content.substring(0, 100);
      topics.push(topic);
    }

    return `Conversation summary:\n` +
      `- Total messages: ${messages.length}\n` +
      `- User messages: ${userMessages.length}\n` +
      `- Assistant messages: ${assistantMessages.length}\n` +
      `- Recent topics: ${topics.join('; ')}`;
  }

  /**
   * Update the system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.history.setSystemMessage(prompt);
  }

  /**
   * Get the current system prompt
   */
  getSystemPrompt(): string | undefined {
    return this.history.getSystemMessage()?.content;
  }

  /**
   * Get the last assistant message
   */
  getLastAssistantMessage(): Message | undefined {
    const messages = this.history.getByRole('assistant');
    return messages[messages.length - 1];
  }

  /**
   * Get the last user message
   */
  getLastUserMessage(): Message | undefined {
    const messages = this.history.getByRole('user');
    return messages[messages.length - 1];
  }

  /**
   * Clear the conversation (keep system message)
   */
  clear(): void {
    this.history.clearConversation();
  }

  /**
   * Create a conversation branch
   */
  async branch(label: string): Promise<ConversationBranch> {
    if (!this.config.enableBranching) {
      throw new Error('Conversation branching is not enabled');
    }

    const branchId = this.generateBranchId();
    const branch: ConversationBranch = {
      id: branchId,
      label,
      parentBranchId: this.currentBranchId ?? undefined,
      messages: [...this.history.getAll()],
      createdAt: new Date(),
    };

    this.branches.set(branchId, branch);
    return branch;
  }

  /**
   * Switch to a branch
   */
  async switchBranch(branchId: string): Promise<void> {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    // Save current state to current branch if exists
    if (this.currentBranchId) {
      const currentBranch = this.branches.get(this.currentBranchId);
      if (currentBranch) {
        currentBranch.messages = [...this.history.getAll()];
      }
    }

    // Load branch state
    this.history.clear();
    for (const msg of branch.messages) {
      this.history.add(msg);
    }

    this.currentBranchId = branchId;
  }

  /**
   * Merge a branch back into main
   */
  async mergeBranch(branchId: string): Promise<void> {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    // For now, simple merge by appending branch messages
    // More sophisticated merge strategies could be implemented
    const mainMessages = this.history.getAll();
    const branchMessages = branch.messages.filter(m =>
      !mainMessages.some(main => main.id === m.id)
    );

    for (const msg of branchMessages) {
      this.history.add(msg);
    }

    this.branches.delete(branchId);
  }

  /**
   * List all branches
   */
  listBranches(): ConversationBranch[] {
    return Array.from(this.branches.values());
  }

  /**
   * Get conversation statistics
   */
  getStats(): {
    messageCount: number;
    userMessageCount: number;
    assistantMessageCount: number;
    toolMessageCount: number;
    estimatedTokens: number;
    branchCount: number;
  } {
    const messages = this.history.getAll();

    return {
      messageCount: messages.length,
      userMessageCount: messages.filter(m => m.role === 'user').length,
      assistantMessageCount: messages.filter(m => m.role === 'assistant').length,
      toolMessageCount: messages.filter(m => m.role === 'tool').length,
      estimatedTokens: this.contextManager.estimateTokens(messages),
      branchCount: this.branches.size,
    };
  }

  /**
   * Serialize the conversation for persistence
   */
  serialize(): string {
    return JSON.stringify({
      messages: this.history.getAll(),
      branches: Array.from(this.branches.entries()),
      currentBranchId: this.currentBranchId,
    });
  }

  /**
   * Deserialize a conversation
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data) as {
        messages: Message[];
        branches: Array<[string, ConversationBranch]>;
        currentBranchId: string | null;
      };

      this.history.clear();
      for (const msg of parsed.messages) {
        this.history.add({
          ...msg,
          timestamp: new Date(msg.timestamp),
        });
      }

      this.branches.clear();
      for (const [id, branch] of parsed.branches) {
        this.branches.set(id, {
          ...branch,
          createdAt: new Date(branch.createdAt),
          messages: branch.messages.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        });
      }

      this.currentBranchId = parsed.currentBranchId;
    } catch {
      // Reset on error
      this.history.clear();
      this.branches.clear();
      this.currentBranchId = null;
    }
  }

  private generateBranchId(): string {
    return `branch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Create a conversation manager
 */
export function createConversationManager(
  options: ConversationManagerOptions
): ConversationManager {
  return new ConversationManager(options);
}
