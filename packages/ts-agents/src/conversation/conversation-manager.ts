/**
 * ConversationManager - High-level conversation management
 */

import { v4 as uuid } from 'uuid';
import type {
  Message,
  ConversationConfig,
  ConversationBranch,
  MessageRole,
} from '../core/types';
import { MessageHistory } from './message-history';
import { ContextWindowManager, SimpleTokenizer } from './context-window';

export class ConversationManager {
  private config: ConversationConfig;
  private history: MessageHistory;
  private contextManager: ContextWindowManager;
  private branches: Map<string, ConversationBranch> = new Map();
  private currentBranchId?: string;
  private summaryCache?: string;
  private lastSummaryIndex: number = 0;

  constructor(config: ConversationConfig) {
    this.config = config;
    this.history = new MessageHistory({
      maxMessages: config.maxHistoryLength,
    });
    this.contextManager = new ContextWindowManager({
      maxTokens: config.maxTokens,
      tokenizer: new SimpleTokenizer(),
    });
  }

  /**
   * Add a message to the conversation
   */
  async addMessage(message: Message): Promise<void> {
    this.history.addMessage(message);

    // Update current branch if active
    if (this.currentBranchId) {
      const branch = this.branches.get(this.currentBranchId);
      if (branch) {
        branch.messages.push(message);
      }
    }

    // Check if we need to summarize
    if (
      this.config.summarizeThreshold > 0 &&
      this.history.count() - this.lastSummaryIndex >= this.config.summarizeThreshold
    ) {
      await this.generateSummary();
    }
  }

  /**
   * Add a user message
   */
  async addUserMessage(
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<Message> {
    const message: Message = {
      id: uuid(),
      role: 'user',
      content,
      timestamp: new Date(),
      metadata,
    };
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
    const message: Message = {
      id: uuid(),
      role: 'assistant',
      content,
      toolCalls: options?.toolCalls,
      timestamp: new Date(),
      metadata: options?.metadata,
    };
    await this.addMessage(message);
    return message;
  }

  /**
   * Add a tool result message
   */
  async addToolMessage(
    content: string,
    toolCallId: string,
    name: string
  ): Promise<Message> {
    const message: Message = {
      id: uuid(),
      role: 'tool',
      content,
      toolCallId,
      name,
      timestamp: new Date(),
    };
    await this.addMessage(message);
    return message;
  }

  /**
   * Add a system message
   */
  async addSystemMessage(
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<Message> {
    const message: Message = {
      id: uuid(),
      role: 'system',
      content,
      timestamp: new Date(),
      metadata,
    };
    await this.addMessage(message);
    return message;
  }

  /**
   * Get conversation history
   */
  async getHistory(limit?: number): Promise<Message[]> {
    if (limit) {
      return this.history.getLast(limit);
    }
    return this.history.getAll();
  }

  /**
   * Get history formatted for context window
   */
  async getContextWindow(maxTokens: number): Promise<Message[]> {
    const messages = this.history.getAll();
    return this.contextManager.truncateToFit(messages, maxTokens);
  }

  /**
   * Generate a summary of the conversation history
   */
  async summarizeHistory(): Promise<string> {
    if (
      this.summaryCache &&
      this.history.count() - this.lastSummaryIndex < this.config.summarizeThreshold
    ) {
      return this.summaryCache;
    }

    return this.generateSummary();
  }

  /**
   * Generate a new summary
   */
  private async generateSummary(): Promise<string> {
    const messages = this.history.getAll();

    if (messages.length === 0) {
      return 'No conversation history.';
    }

    // Simple summarization - extract key points
    const summaryParts: string[] = [];

    // Count messages by role
    const roleCounts: Record<MessageRole, number> = {
      system: 0,
      user: 0,
      assistant: 0,
      tool: 0,
    };

    for (const msg of messages) {
      roleCounts[msg.role]++;
    }

    summaryParts.push(
      `Conversation with ${roleCounts.user} user messages and ${roleCounts.assistant} assistant responses.`
    );

    // Extract key user questions
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      const firstQuestion = userMessages[0].content.slice(0, 100);
      summaryParts.push(`Started with: "${firstQuestion}..."`);

      if (userMessages.length > 1) {
        const lastQuestion = userMessages[userMessages.length - 1].content.slice(0, 100);
        summaryParts.push(`Most recent query: "${lastQuestion}..."`);
      }
    }

    // Note tool usage
    if (roleCounts.tool > 0) {
      const toolMessages = messages.filter(m => m.role === 'tool');
      const toolNames = [...new Set(toolMessages.map(m => m.name).filter(Boolean))];
      summaryParts.push(`Tools used: ${toolNames.join(', ')}`);
    }

    this.summaryCache = summaryParts.join(' ');
    this.lastSummaryIndex = messages.length;

    return this.summaryCache;
  }

  /**
   * Create a conversation branch
   */
  async branch(label: string): Promise<ConversationBranch> {
    const branch: ConversationBranch = {
      id: uuid(),
      parentId: this.currentBranchId,
      label,
      messages: [],
      createdAt: new Date(),
    };

    this.branches.set(branch.id, branch);

    return branch;
  }

  /**
   * Switch to a branch
   */
  switchBranch(branchId: string): boolean {
    if (!this.branches.has(branchId)) {
      return false;
    }

    this.currentBranchId = branchId;
    return true;
  }

  /**
   * Merge a branch back to main conversation
   */
  async mergeBranch(branchId: string): Promise<void> {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    // Add branch messages to main history
    for (const message of branch.messages) {
      await this.addMessage({
        ...message,
        metadata: {
          ...message.metadata,
          mergedFromBranch: branchId,
        },
      });
    }

    // Delete the branch
    this.branches.delete(branchId);

    // Clear current branch if it was the merged one
    if (this.currentBranchId === branchId) {
      this.currentBranchId = undefined;
    }
  }

  /**
   * Delete a branch
   */
  deleteBranch(branchId: string): boolean {
    if (this.currentBranchId === branchId) {
      this.currentBranchId = undefined;
    }
    return this.branches.delete(branchId);
  }

  /**
   * Get all branches
   */
  getBranches(): ConversationBranch[] {
    return Array.from(this.branches.values());
  }

  /**
   * Get current branch
   */
  getCurrentBranch(): ConversationBranch | undefined {
    if (!this.currentBranchId) {
      return undefined;
    }
    return this.branches.get(this.currentBranchId);
  }

  /**
   * Search conversation history
   */
  search(query: string): Message[] {
    return this.history.search(query);
  }

  /**
   * Get the last N turns (user-assistant pairs)
   */
  getLastTurns(n: number): Message[] {
    const messages = this.history.getAll();
    const turns: Message[] = [];
    let turnCount = 0;

    for (let i = messages.length - 1; i >= 0 && turnCount < n; i--) {
      const msg = messages[i];
      turns.unshift(msg);

      if (msg.role === 'user') {
        turnCount++;
      }
    }

    return turns;
  }

  /**
   * Clear conversation history
   */
  clear(): void {
    this.history.clear();
    this.branches.clear();
    this.currentBranchId = undefined;
    this.summaryCache = undefined;
    this.lastSummaryIndex = 0;
  }

  /**
   * Export conversation
   */
  export(): {
    messages: Message[];
    branches: ConversationBranch[];
    summary?: string;
  } {
    return {
      messages: this.history.export(),
      branches: Array.from(this.branches.values()),
      summary: this.summaryCache,
    };
  }

  /**
   * Import conversation
   */
  import(data: {
    messages: Message[];
    branches?: ConversationBranch[];
    summary?: string;
  }): void {
    this.history.import(data.messages);

    if (data.branches) {
      this.branches.clear();
      for (const branch of data.branches) {
        this.branches.set(branch.id, branch);
      }
    }

    this.summaryCache = data.summary;
    this.lastSummaryIndex = data.messages.length;
  }

  /**
   * Get conversation statistics
   */
  getStats(): {
    messageCount: number;
    branchCount: number;
    estimatedTokens: number;
    maxTokens: number;
    byRole: Record<MessageRole, number>;
  } {
    const messages = this.history.getAll();
    const byRole: Record<MessageRole, number> = {
      system: 0,
      user: 0,
      assistant: 0,
      tool: 0,
    };

    for (const msg of messages) {
      byRole[msg.role]++;
    }

    return {
      messageCount: messages.length,
      branchCount: this.branches.size,
      estimatedTokens: this.history.estimateTokens(),
      maxTokens: this.config.maxTokens,
      byRole,
    };
  }

  /**
   * Get the internal history object
   */
  getHistoryManager(): MessageHistory {
    return this.history;
  }

  /**
   * Get the context window manager
   */
  getContextManager(): ContextWindowManager {
    return this.contextManager;
  }
}
