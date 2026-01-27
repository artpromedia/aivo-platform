/**
 * ContextWindowManager - Manages context window for LLM requests
 */

import type { Message, ToolDefinition, ContextWindow, Memory } from '../core/types';

export interface ITokenizer {
  countTokens(text: string): number;
  truncate(text: string, maxTokens: number): string;
}

/**
 * Simple tokenizer implementation (character-based approximation)
 */
export class SimpleTokenizer implements ITokenizer {
  private charsPerToken: number;

  constructor(charsPerToken: number = 4) {
    this.charsPerToken = charsPerToken;
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / this.charsPerToken);
  }

  truncate(text: string, maxTokens: number): string {
    const maxChars = maxTokens * this.charsPerToken;
    if (text.length <= maxChars) {
      return text;
    }
    return text.slice(0, maxChars - 3) + '...';
  }
}

export interface ContextWindowConfig {
  maxTokens: number;
  tokenizer?: ITokenizer;
  systemPromptReserve?: number;
  toolDefinitionReserve?: number;
  memoryReserve?: number;
  responseReserve?: number;
}

export class ContextWindowManager {
  private maxTokens: number;
  private tokenizer: ITokenizer;
  private reserves: {
    systemPrompt: number;
    toolDefinitions: number;
    memory: number;
    response: number;
  };

  constructor(config: ContextWindowConfig) {
    this.maxTokens = config.maxTokens;
    this.tokenizer = config.tokenizer || new SimpleTokenizer();
    this.reserves = {
      systemPrompt: config.systemPromptReserve || 1000,
      toolDefinitions: config.toolDefinitionReserve || 500,
      memory: config.memoryReserve || 500,
      response: config.responseReserve || 1000,
    };
  }

  /**
   * Build a context window with all components
   */
  async buildContext(
    systemPrompt: string,
    memories: Memory[],
    history: Message[],
    tools: ToolDefinition[]
  ): Promise<ContextWindow> {
    let totalTokens = 0;

    // 1. System prompt (required)
    const truncatedSystemPrompt = this.tokenizer.truncate(
      systemPrompt,
      this.reserves.systemPrompt
    );
    const systemPromptTokens = this.tokenizer.countTokens(truncatedSystemPrompt);
    totalTokens += systemPromptTokens;

    // 2. Tool definitions
    const toolsJson = JSON.stringify(tools);
    const truncatedToolsJson = this.tokenizer.truncate(
      toolsJson,
      this.reserves.toolDefinitions
    );
    const toolsTokens = this.tokenizer.countTokens(truncatedToolsJson);
    totalTokens += toolsTokens;

    // 3. Reserve for response
    totalTokens += this.reserves.response;

    // 4. Available tokens for memories and history
    const availableTokens = this.maxTokens - totalTokens;
    const memoryTokens = Math.min(this.reserves.memory, availableTokens * 0.3);
    const historyTokens = availableTokens - memoryTokens;

    // 5. Build memory string
    let memoriesStr = '';
    let currentMemoryTokens = 0;
    for (const memory of memories) {
      const memoryStr = this.formatMemory(memory);
      const tokens = this.tokenizer.countTokens(memoryStr);
      if (currentMemoryTokens + tokens > memoryTokens) {
        break;
      }
      memoriesStr += memoryStr + '\n';
      currentMemoryTokens += tokens;
    }

    // 6. Truncate history to fit
    const truncatedHistory = await this.truncateToFit(history, historyTokens);
    const historyTokensUsed = this.countHistoryTokens(truncatedHistory);

    totalTokens = systemPromptTokens + toolsTokens + currentMemoryTokens + historyTokensUsed;

    return {
      systemPrompt: truncatedSystemPrompt,
      memories: memoriesStr.trim(),
      history: truncatedHistory,
      tools,
      totalTokens,
    };
  }

  /**
   * Truncate message history to fit within token limit
   */
  async truncateToFit(messages: Message[], maxTokens: number): Promise<Message[]> {
    // Always keep system messages
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');

    let systemTokens = 0;
    for (const msg of systemMessages) {
      systemTokens += this.countMessageTokens(msg);
    }

    const availableTokens = maxTokens - systemTokens;
    if (availableTokens <= 0) {
      return systemMessages;
    }

    // Work backwards from most recent messages
    const result: Message[] = [];
    let currentTokens = 0;

    for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
      const msg = nonSystemMessages[i];
      if (!msg) continue;
      const msgTokens = this.countMessageTokens(msg);

      if (currentTokens + msgTokens > availableTokens) {
        break;
      }

      result.unshift(msg);
      currentTokens += msgTokens;
    }

    // Prepend system messages
    return [...systemMessages, ...result];
  }

  /**
   * Get available tokens for new content
   */
  getAvailableTokens(currentUsage: number): number {
    return this.maxTokens - currentUsage - this.reserves.response;
  }

  /**
   * Check if content fits within available tokens
   */
  fits(content: string, currentUsage: number): boolean {
    const contentTokens = this.tokenizer.countTokens(content);
    return contentTokens <= this.getAvailableTokens(currentUsage);
  }

  /**
   * Count tokens in a message
   */
  countMessageTokens(message: Message): number {
    let tokens = this.tokenizer.countTokens(message.content);
    tokens += 4; // Overhead for role, formatting

    if (message.name) {
      tokens += this.tokenizer.countTokens(message.name);
    }

    if (message.toolCalls) {
      tokens += this.tokenizer.countTokens(JSON.stringify(message.toolCalls));
    }

    return tokens;
  }

  /**
   * Count tokens in message history
   */
  countHistoryTokens(messages: Message[]): number {
    let total = 0;
    for (const msg of messages) {
      total += this.countMessageTokens(msg);
    }
    return total;
  }

  /**
   * Format memory for context
   */
  private formatMemory(memory: Memory): string {
    const timestamp = new Date(memory.timestamp).toISOString();
    const content = typeof memory.content === 'string'
      ? memory.content
      : JSON.stringify(memory.content);
    return `[${memory.type.toUpperCase()} - ${timestamp}] ${content}`;
  }

  /**
   * Optimize context by summarizing old messages
   */
  async optimizeContext(
    messages: Message[],
    summarizer: (messages: Message[]) => Promise<string>
  ): Promise<Message[]> {
    if (messages.length <= 10) {
      return messages;
    }

    // Keep recent messages as-is
    const recentMessages = messages.slice(-10);

    // Summarize older messages
    const olderMessages = messages.slice(0, -10);
    const summary = await summarizer(olderMessages);

    // Create a system message with the summary
    const summaryMessage: Message = {
      id: 'summary',
      role: 'system',
      content: `Previous conversation summary:\n${summary}`,
      timestamp: new Date(),
    };

    return [summaryMessage, ...recentMessages];
  }

  /**
   * Get context usage statistics
   */
  getUsageStats(context: ContextWindow): {
    totalTokens: number;
    maxTokens: number;
    utilization: number;
    breakdown: {
      systemPrompt: number;
      memories: number;
      history: number;
      tools: number;
      reserved: number;
    };
  } {
    const systemPromptTokens = this.tokenizer.countTokens(context.systemPrompt);
    const memoriesTokens = this.tokenizer.countTokens(context.memories);
    const historyTokens = this.countHistoryTokens(context.history);
    const toolsTokens = this.tokenizer.countTokens(JSON.stringify(context.tools));

    return {
      totalTokens: context.totalTokens,
      maxTokens: this.maxTokens,
      utilization: context.totalTokens / this.maxTokens,
      breakdown: {
        systemPrompt: systemPromptTokens,
        memories: memoriesTokens,
        history: historyTokens,
        tools: toolsTokens,
        reserved: this.reserves.response,
      },
    };
  }
}
