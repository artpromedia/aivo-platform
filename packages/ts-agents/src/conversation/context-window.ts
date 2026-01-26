/**
 * Context window management for optimal LLM context utilization
 */

import type { Message, Memory, Tool, ContextWindow, ToolDefinition } from '../core/types.js';
import { estimateMessagesTokens } from '../providers/model-adapter.js';

export interface ITokenizer {
  encode(text: string): number[];
  decode(tokens: number[]): string;
  count(text: string): number;
}

/**
 * Simple token estimator (default tokenizer)
 */
export class SimpleTokenizer implements ITokenizer {
  private readonly charsPerToken: number;

  constructor(charsPerToken: number = 4) {
    this.charsPerToken = charsPerToken;
  }

  encode(text: string): number[] {
    // Simple approximation - not actual tokenization
    const count = Math.ceil(text.length / this.charsPerToken);
    return Array.from({ length: count }, (_, i) => i);
  }

  decode(_tokens: number[]): string {
    // Cannot decode without actual token mapping
    throw new Error('SimpleTokenizer cannot decode');
  }

  count(text: string): number {
    return Math.ceil(text.length / this.charsPerToken);
  }
}

export interface ContextWindowConfig {
  /** Maximum tokens for the context window */
  maxTokens: number;
  /** Reserve tokens for the response */
  reserveForResponse?: number;
  /** Tokenizer to use */
  tokenizer?: ITokenizer;
  /** Priority order for context components */
  priorityOrder?: ('system' | 'tools' | 'memories' | 'history')[];
}

/**
 * Manages context window for optimal LLM context utilization
 */
export class ContextWindowManager {
  private readonly maxTokens: number;
  private readonly reserveForResponse: number;
  private readonly tokenizer: ITokenizer;
  private readonly priorityOrder: ('system' | 'tools' | 'memories' | 'history')[];

  constructor(config: ContextWindowConfig) {
    this.maxTokens = config.maxTokens;
    this.reserveForResponse = config.reserveForResponse ?? Math.floor(config.maxTokens * 0.2);
    this.tokenizer = config.tokenizer ?? new SimpleTokenizer();
    this.priorityOrder = config.priorityOrder ?? ['system', 'tools', 'memories', 'history'];
  }

  /**
   * Build an optimized context window
   */
  async buildContext(
    systemPrompt: string,
    memories: Memory[],
    history: Message[],
    tools: Tool[]
  ): Promise<ContextWindow> {
    const availableTokens = this.maxTokens - this.reserveForResponse;
    let usedTokens = 0;

    const result: ContextWindow = {
      systemPrompt: '',
      memories: '',
      history: [],
      tools: [],
      totalTokens: 0,
    };

    // Calculate token budgets based on priority
    const budgets = this.calculateBudgets(availableTokens);

    for (const component of this.priorityOrder) {
      const budget = budgets[component] ?? 0;

      switch (component) {
        case 'system': {
          const tokens = this.tokenizer.count(systemPrompt);
          if (tokens <= budget) {
            result.systemPrompt = systemPrompt;
            usedTokens += tokens;
          } else {
            // Truncate system prompt if needed
            result.systemPrompt = this.truncateText(systemPrompt, budget);
            usedTokens += budget;
          }
          break;
        }

        case 'tools': {
          const toolDefs = this.selectTools(tools, budget);
          result.tools = toolDefs;
          usedTokens += this.estimateToolsTokens(toolDefs);
          break;
        }

        case 'memories': {
          const memoryStr = this.formatMemories(memories, budget);
          result.memories = memoryStr;
          usedTokens += this.tokenizer.count(memoryStr);
          break;
        }

        case 'history': {
          const truncatedHistory = await this.truncateToFit(history, budget);
          result.history = truncatedHistory;
          usedTokens += estimateMessagesTokens(truncatedHistory);
          break;
        }
      }
    }

    result.totalTokens = usedTokens;
    return result;
  }

  /**
   * Truncate message history to fit within token limit
   */
  async truncateToFit(messages: Message[], maxTokens: number): Promise<Message[]> {
    if (messages.length === 0) {
      return [];
    }

    // Separate system messages (always keep)
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');

    const systemTokens = estimateMessagesTokens(systemMessages);
    const availableForOther = maxTokens - systemTokens;

    if (availableForOther <= 0) {
      return systemMessages;
    }

    // Keep messages from the end (most recent)
    const result: Message[] = [];
    let currentTokens = 0;

    // Iterate from end to start
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const msg = otherMessages[i]!;
      const msgTokens = estimateMessagesTokens([msg]);

      if (currentTokens + msgTokens > availableForOther) {
        break;
      }

      result.unshift(msg);
      currentTokens += msgTokens;
    }

    return [...systemMessages, ...result];
  }

  /**
   * Estimate tokens for a message array
   */
  estimateTokens(messages: Message[]): number {
    return estimateMessagesTokens(messages);
  }

  /**
   * Get remaining tokens after accounting for current content
   */
  getRemainingTokens(currentTokens: number): number {
    return Math.max(0, this.maxTokens - this.reserveForResponse - currentTokens);
  }

  /**
   * Check if content fits within the context window
   */
  fits(content: string | Message[]): boolean {
    let tokens: number;

    if (typeof content === 'string') {
      tokens = this.tokenizer.count(content);
    } else {
      tokens = estimateMessagesTokens(content);
    }

    return tokens <= this.maxTokens - this.reserveForResponse;
  }

  private calculateBudgets(
    totalBudget: number
  ): Record<string, number> {
    // Default budget allocation percentages
    const allocations: Record<string, number> = {
      system: 0.15,
      tools: 0.15,
      memories: 0.20,
      history: 0.50,
    };

    const budgets: Record<string, number> = {};

    for (const component of this.priorityOrder) {
      const allocation = allocations[component] ?? 0.1;
      budgets[component] = Math.floor(totalBudget * allocation);
    }

    return budgets;
  }

  private selectTools(tools: Tool[], budget: number): ToolDefinition[] {
    const result: ToolDefinition[] = [];
    let usedTokens = 0;

    for (const tool of tools) {
      const def: ToolDefinition = {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      };

      const tokens = this.estimateToolTokens(def);

      if (usedTokens + tokens > budget) {
        break;
      }

      result.push(def);
      usedTokens += tokens;
    }

    return result;
  }

  private estimateToolTokens(tool: ToolDefinition): number {
    const nameTokens = this.tokenizer.count(tool.name);
    const descTokens = this.tokenizer.count(tool.description);
    const schemaTokens = this.tokenizer.count(JSON.stringify(tool.parameters));

    return nameTokens + descTokens + schemaTokens + 10; // Overhead
  }

  private estimateToolsTokens(tools: ToolDefinition[]): number {
    return tools.reduce((sum, tool) => sum + this.estimateToolTokens(tool), 0);
  }

  private formatMemories(memories: Memory[], budget: number): string {
    if (memories.length === 0) {
      return '';
    }

    const parts: string[] = [];
    let usedTokens = 0;

    for (const memory of memories) {
      const content = typeof memory.content === 'string'
        ? memory.content
        : JSON.stringify(memory.content);

      const formatted = `[${memory.type}] ${content}`;
      const tokens = this.tokenizer.count(formatted);

      if (usedTokens + tokens > budget) {
        break;
      }

      parts.push(formatted);
      usedTokens += tokens;
    }

    return parts.join('\n');
  }

  private truncateText(text: string, maxTokens: number): string {
    const tokens = this.tokenizer.count(text);

    if (tokens <= maxTokens) {
      return text;
    }

    // Estimate characters based on ratio
    const ratio = maxTokens / tokens;
    const maxChars = Math.floor(text.length * ratio) - 3; // Leave room for ellipsis

    return text.substring(0, maxChars) + '...';
  }
}

/**
 * Create a context window manager with common defaults
 */
export function createContextWindowManager(
  maxTokens: number,
  options?: Partial<ContextWindowConfig>
): ContextWindowManager {
  return new ContextWindowManager({
    maxTokens,
    ...options,
  });
}
