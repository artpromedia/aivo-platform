/**
 * Base Agent class implementation
 */

import type {
  AgentConfig,
  AgentContext,
  AgentInput,
  AgentOutput,
  AgentState,
  Memory,
  MemoryType,
  Tool,
  ToolCall,
  ToolResult,
  Message,
} from './types.js';
import { AgentError } from './types.js';
import { StateManager, createStateManager } from '../state/state-manager.js';
import { MemoryManager, createMemoryManager } from '../memory/memory-manager.js';
import { ToolRegistry, createToolRegistry } from '../tools/tool-registry.js';
import { ToolExecutor, createToolExecutor } from '../tools/tool-executor.js';
import { ConversationManager, createConversationManager } from '../conversation/conversation-manager.js';
import { adapterRegistry, type IModelAdapter } from '../providers/model-adapter.js';
import type { RedisClient } from '../state/redis-state-store.js';

export interface AgentOptions {
  /** Redis client for state persistence */
  redisClient?: RedisClient;
  /** Custom state manager */
  stateManager?: StateManager;
  /** Custom memory manager */
  memoryManager?: MemoryManager;
  /** Custom tool registry */
  toolRegistry?: ToolRegistry;
  /** Custom model adapter */
  modelAdapter?: IModelAdapter;
}

/**
 * Base agent class that provides core agent functionality
 */
export abstract class Agent {
  protected readonly config: AgentConfig;
  protected readonly stateManager: StateManager;
  protected readonly memoryManager: MemoryManager;
  protected readonly toolRegistry: ToolRegistry;
  protected readonly toolExecutor: ToolExecutor;
  protected readonly modelAdapter: IModelAdapter;
  protected conversationManager: ConversationManager | null = null;

  constructor(config: AgentConfig, options?: AgentOptions) {
    this.config = config;

    // Initialize state manager
    this.stateManager = options?.stateManager ?? createStateManager(
      config.stateConfig,
      options?.redisClient
    );

    // Initialize memory manager
    this.memoryManager = options?.memoryManager ?? createMemoryManager(config.memoryConfig);

    // Initialize tool registry
    this.toolRegistry = options?.toolRegistry ?? createToolRegistry(config.tools);

    // Initialize tool executor
    this.toolExecutor = createToolExecutor(this.toolRegistry);

    // Initialize model adapter
    this.modelAdapter = options?.modelAdapter ?? adapterRegistry.getAdapter(config.model);
  }

  /**
   * Main execution loop for the agent
   */
  async run(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    // Initialize or restore state
    const state = await this.stateManager.getOrCreate(context.sessionId, this.config.id);

    // Initialize conversation manager
    this.conversationManager = createConversationManager({
      systemPrompt: this.config.systemPrompt,
      maxHistoryLength: 100,
      maxTokens: this.config.model.maxTokens ?? 4096,
    });

    // Restore conversation if exists
    if (state.conversationHistory.length > 0) {
      for (const msg of state.conversationHistory) {
        await this.conversationManager.addMessage(msg);
      }
    }

    try {
      // Lifecycle hook: onStart
      await this.onStart(context);
      await this.stateManager.setStatus(context.sessionId, 'running');

      // Add user input to conversation
      await this.conversationManager.addUserMessage(input.message, input.metadata);

      // Main execution loop
      let iterations = 0;
      let output: AgentOutput | null = null;

      while (iterations < this.config.maxIterations) {
        iterations++;
        await this.stateManager.incrementStep(context.sessionId);

        // Get relevant context from memory
        const memoryContext = await this.memoryManager.getRelevantContext(
          input.message,
          1000 // tokens for memory context
        );

        // Build messages for the model
        const messages = await this.conversationManager.getConversation();

        // If we have memory context, inject it
        if (memoryContext) {
          const systemMsg = messages.find(m => m.role === 'system');
          if (systemMsg) {
            systemMsg.content = `${systemMsg.content}\n\nRelevant context:\n${memoryContext}`;
          }
        }

        // Call the model
        await this.stateManager.setStatus(context.sessionId, 'thinking');
        const response = await this.modelAdapter.complete({
          messages,
          tools: this.toolRegistry.getToolDefinitions(),
          toolChoice: 'auto',
          temperature: this.config.model.temperature,
          maxTokens: this.config.model.maxTokens,
        });

        // Handle tool calls
        if (response.toolCalls && response.toolCalls.length > 0) {
          await this.stateManager.setStatus(context.sessionId, 'executing_tool');

          // Add assistant message with tool calls
          await this.conversationManager.addAssistantMessage(response.content, {
            toolCalls: response.toolCalls,
          });

          // Execute tools
          for (const toolCall of response.toolCalls) {
            await this.onToolCall(toolCall.name, toolCall.arguments);

            const result = await this.executeTool(
              toolCall.name,
              toolCall.arguments,
              {
                sessionId: context.sessionId,
                userId: context.userId,
                tenantId: context.tenantId,
                agentId: this.config.id,
                metadata: context.metadata,
              }
            );

            // Record tool call in state
            await this.stateManager.addToolCall(context.sessionId, {
              ...toolCall,
              result,
            });

            // Add tool result to conversation
            await this.conversationManager.addToolResult(
              toolCall.id,
              result.success ? JSON.stringify(result.data) : (result.error ?? 'Unknown error'),
              toolCall.name
            );
          }

          // Continue loop to process tool results
          continue;
        }

        // No tool calls - this is the final response
        await this.conversationManager.addAssistantMessage(response.content);

        output = {
          message: response.content,
          toolCalls: response.toolCalls,
          metadata: {
            iterations,
            sessionId: context.sessionId,
          },
          usage: response.usage,
          finishReason: response.finishReason,
        };

        break;
      }

      // Check if we hit max iterations
      if (!output) {
        output = {
          message: 'Maximum iterations reached',
          finishReason: 'length',
          metadata: { iterations, sessionId: context.sessionId },
        };
      }

      // Save conversation to state
      await this.saveState(context.sessionId);

      // Lifecycle hook: onComplete
      await this.stateManager.setStatus(context.sessionId, 'completed');
      await this.onComplete(output);

      return output;
    } catch (error) {
      await this.stateManager.setStatus(context.sessionId, 'failed');
      const err = error instanceof Error ? error : new Error(String(error));
      await this.onError(err);
      throw error;
    }
  }

  /**
   * Save current state
   */
  async saveState(sessionId?: string): Promise<void> {
    if (!sessionId || !this.conversationManager) return;

    const conversation = await this.conversationManager.getConversation();
    await this.stateManager.update(sessionId, {
      conversationHistory: conversation,
    });
  }

  /**
   * Restore state from a previous session
   */
  async restoreState(sessionId: string): Promise<void> {
    const state = await this.stateManager.get(sessionId);
    if (!state) {
      throw new AgentError(`No state found for session: ${sessionId}`, 'STATE_NOT_FOUND');
    }

    // Restore conversation
    this.conversationManager = createConversationManager({
      systemPrompt: this.config.systemPrompt,
      maxHistoryLength: 100,
      maxTokens: this.config.model.maxTokens ?? 4096,
    });

    for (const msg of state.conversationHistory) {
      await this.conversationManager.addMessage(msg);
    }
  }

  /**
   * Remember information
   */
  async remember(key: string, value: unknown, type: MemoryType): Promise<void> {
    await this.memoryManager.remember(value, type, { key });
  }

  /**
   * Recall information
   */
  async recall(query: string, type?: MemoryType): Promise<Memory[]> {
    return this.memoryManager.recall(query, { types: type ? [type] : undefined });
  }

  /**
   * Execute a tool
   */
  async executeTool(
    toolName: string,
    params: Record<string, unknown>,
    context: {
      sessionId: string;
      userId: string;
      tenantId: string;
      agentId: string;
      metadata: Record<string, unknown>;
    }
  ): Promise<ToolResult> {
    return this.toolExecutor.execute(toolName, params, context);
  }

  /**
   * Get the agent's configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Get the agent's ID
   */
  get id(): string {
    return this.config.id;
  }

  /**
   * Get the agent's name
   */
  get name(): string {
    return this.config.name;
  }

  // Lifecycle hooks - can be overridden by subclasses

  /**
   * Called when the agent starts running
   */
  protected async onStart(_context: AgentContext): Promise<void> {
    // Override in subclass
  }

  /**
   * Called when the agent completes successfully
   */
  protected async onComplete(_output: AgentOutput): Promise<void> {
    // Override in subclass
  }

  /**
   * Called when an error occurs
   */
  protected async onError(_error: Error): Promise<void> {
    // Override in subclass
  }

  /**
   * Called before a tool is executed
   */
  protected async onToolCall(_tool: string, _params: Record<string, unknown>): Promise<void> {
    // Override in subclass
  }
}

/**
 * Simple agent implementation for basic use cases
 */
export class SimpleAgent extends Agent {
  constructor(config: AgentConfig, options?: AgentOptions) {
    super(config, options);
  }
}
