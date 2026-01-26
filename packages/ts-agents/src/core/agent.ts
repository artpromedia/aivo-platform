/**
 * Base Agent class for building AI agents with state persistence and memory
 */

import { v4 as uuid } from 'uuid';
import type {
  AgentConfig,
  AgentContext,
  AgentInput,
  AgentOutput,
  AgentState,
  AgentEventHandler,
  AgentEvent,
  AgentEventType,
  Memory,
  MemoryType,
  Tool,
  ToolResult,
  Message,
  ToolCall,
  AgentInputSchema,
  AgentContextSchema,
} from './types';
import type { StateManager } from '../state/state-manager';
import type { MemoryManager } from '../memory/memory-manager';
import type { ToolRegistry } from '../tools/tool-registry';
import type { ToolExecutor } from '../tools/tool-executor';
import type { ModelAdapter } from '../providers/model-adapter';
import type { ConversationManager } from '../conversation/conversation-manager';

export interface AgentDependencies {
  stateManager: StateManager;
  memoryManager: MemoryManager;
  toolRegistry: ToolRegistry;
  toolExecutor: ToolExecutor;
  modelAdapter: ModelAdapter;
  conversationManager: ConversationManager;
}

export abstract class Agent {
  protected config: AgentConfig;
  protected stateManager: StateManager;
  protected memoryManager: MemoryManager;
  protected toolRegistry: ToolRegistry;
  protected toolExecutor: ToolExecutor;
  protected modelAdapter: ModelAdapter;
  protected conversationManager: ConversationManager;
  protected eventHandlers: Map<AgentEventType, AgentEventHandler[]> = new Map();
  protected currentContext: AgentContext | null = null;

  constructor(config: AgentConfig, dependencies: AgentDependencies) {
    this.config = config;
    this.stateManager = dependencies.stateManager;
    this.memoryManager = dependencies.memoryManager;
    this.toolRegistry = dependencies.toolRegistry;
    this.toolExecutor = dependencies.toolExecutor;
    this.modelAdapter = dependencies.modelAdapter;
    this.conversationManager = dependencies.conversationManager;

    // Register tools from config
    for (const tool of config.tools) {
      this.toolRegistry.register(tool);
    }
  }

  /**
   * Main execution loop for the agent
   */
  async run(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    // Validate input and context
    const validatedInput = AgentInputSchema.parse(input);
    const validatedContext = AgentContextSchema.parse(context);

    this.currentContext = validatedContext;

    // Initialize or restore state
    let state = await this.stateManager.get(validatedContext.sessionId);
    if (!state) {
      state = await this.stateManager.initialize(
        validatedContext.sessionId,
        this.config.id
      );
    }

    await this.emitEvent('agent:start', { input: validatedInput, state });

    try {
      // Lifecycle hook
      await this.onStart(validatedContext);

      // Update state to running
      await this.stateManager.update(validatedContext.sessionId, {
        status: 'running',
      });

      // Add user message to conversation
      const userMessage: Message = {
        id: uuid(),
        role: 'user',
        content: validatedInput.message,
        timestamp: new Date(),
        metadata: validatedInput.metadata,
      };
      await this.conversationManager.addMessage(userMessage);

      // Recall relevant memories
      const memories = await this.memoryManager.recall(validatedInput.message, {
        limit: 10,
      });
      const memoryContext = await this.memoryManager.getRelevantContext(
        validatedInput.message,
        this.config.model.maxTokens ? this.config.model.maxTokens / 4 : 1000
      );

      // Main agent loop
      let iterations = 0;
      let output: AgentOutput | null = null;
      const startTime = Date.now();

      while (iterations < this.config.maxIterations) {
        // Check timeout
        if (Date.now() - startTime > this.config.timeout) {
          output = {
            message: 'Agent execution timed out',
            finishReason: 'timeout',
          };
          break;
        }

        iterations++;
        await this.emitEvent('agent:iteration', { iteration: iterations });

        // Get conversation history
        const history = await this.conversationManager.getHistory();

        // Generate response from model
        const response = await this.modelAdapter.generate({
          systemPrompt: this.buildSystemPrompt(memoryContext),
          messages: history,
          tools: this.toolRegistry.getToolDefinitions(),
          config: this.config.model,
        });

        // Process tool calls if any
        if (response.toolCalls && response.toolCalls.length > 0) {
          await this.stateManager.update(validatedContext.sessionId, {
            status: 'waiting_for_tool',
          });

          // Execute tools
          const toolResults = await this.executeToolCalls(
            response.toolCalls,
            validatedContext
          );

          // Add assistant message with tool calls
          const assistantMessage: Message = {
            id: uuid(),
            role: 'assistant',
            content: response.message || '',
            toolCalls: response.toolCalls,
            timestamp: new Date(),
          };
          await this.conversationManager.addMessage(assistantMessage);

          // Add tool results as messages
          for (let i = 0; i < response.toolCalls.length; i++) {
            const toolMessage: Message = {
              id: uuid(),
              role: 'tool',
              content: JSON.stringify(toolResults[i]),
              name: response.toolCalls[i].name,
              toolCallId: response.toolCalls[i].id,
              timestamp: new Date(),
            };
            await this.conversationManager.addMessage(toolMessage);
          }

          // Continue loop to get final response
          continue;
        }

        // No tool calls, we have a final response
        output = {
          message: response.message || '',
          toolCalls: response.toolCalls,
          metadata: response.metadata,
          usage: response.usage,
          finishReason: 'complete',
        };

        // Add assistant message
        const assistantMessage: Message = {
          id: uuid(),
          role: 'assistant',
          content: output.message,
          timestamp: new Date(),
        };
        await this.conversationManager.addMessage(assistantMessage);

        break;
      }

      // Check if we hit max iterations
      if (!output) {
        output = {
          message: 'Agent reached maximum iterations without completing',
          finishReason: 'max_iterations',
        };
      }

      // Update state to completed
      await this.stateManager.update(validatedContext.sessionId, {
        status: 'completed',
        currentStep: iterations,
      });

      // Store interaction as episodic memory
      await this.remember(
        `interaction:${Date.now()}`,
        {
          input: validatedInput,
          output,
          iterations,
        },
        'episodic'
      );

      // Save state
      await this.saveState();

      // Lifecycle hook
      await this.onComplete(output);
      await this.emitEvent('agent:complete', { output, iterations });

      return output;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Update state to error
      await this.stateManager.update(validatedContext.sessionId, {
        status: 'error',
      });

      // Lifecycle hook
      await this.onError(err);
      await this.emitEvent('agent:error', { error: err.message });

      return {
        message: `Agent error: ${err.message}`,
        finishReason: 'error',
      };
    } finally {
      this.currentContext = null;
    }
  }

  /**
   * Build the system prompt with memory context
   */
  protected buildSystemPrompt(memoryContext: string): string {
    let prompt = this.config.systemPrompt;

    if (memoryContext) {
      prompt += `\n\n## Relevant Context from Memory\n${memoryContext}`;
    }

    return prompt;
  }

  /**
   * Execute tool calls in sequence or parallel
   */
  protected async executeToolCalls(
    toolCalls: ToolCall[],
    context: AgentContext
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      await this.onToolCall(toolCall.name, toolCall.arguments);
      await this.emitEvent('tool:start', { tool: toolCall.name, params: toolCall.arguments });

      try {
        const result = await this.executeTool(toolCall.name, toolCall.arguments);
        results.push(result);

        await this.emitEvent('tool:complete', {
          tool: toolCall.name,
          result,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const errorResult: ToolResult = {
          success: false,
          error: err.message,
          executionTimeMs: 0,
        };
        results.push(errorResult);

        await this.emitEvent('tool:error', {
          tool: toolCall.name,
          error: err.message,
        });
      }
    }

    return results;
  }

  /**
   * Save current state
   */
  async saveState(): Promise<void> {
    if (!this.currentContext) {
      throw new Error('No active context to save state for');
    }

    const history = await this.conversationManager.getHistory();
    await this.stateManager.update(this.currentContext.sessionId, {
      conversationHistory: history,
      updatedAt: new Date(),
    });

    await this.emitEvent('state:save', {
      sessionId: this.currentContext.sessionId,
    });
  }

  /**
   * Restore state from a session
   */
  async restoreState(sessionId: string): Promise<void> {
    const state = await this.stateManager.get(sessionId);
    if (!state) {
      throw new Error(`No state found for session: ${sessionId}`);
    }

    // Restore conversation history
    for (const message of state.conversationHistory) {
      await this.conversationManager.addMessage(message);
    }

    await this.emitEvent('state:restore', { sessionId, state });
  }

  /**
   * Store a memory
   */
  async remember(key: string, value: unknown, type: MemoryType): Promise<void> {
    await this.memoryManager.remember(value, type, { key });
    await this.emitEvent('memory:store', { key, type });
  }

  /**
   * Recall memories
   */
  async recall(query: string, type?: MemoryType): Promise<Memory[]> {
    const memories = await this.memoryManager.recall(query, { type });
    await this.emitEvent('memory:recall', { query, type, count: memories.length });
    return memories;
  }

  /**
   * Execute a single tool
   */
  async executeTool(toolName: string, params: unknown): Promise<ToolResult> {
    if (!this.currentContext) {
      throw new Error('No active context for tool execution');
    }

    return this.toolExecutor.execute(toolName, params, {
      sessionId: this.currentContext.sessionId,
      userId: this.currentContext.userId,
      tenantId: this.currentContext.tenantId,
      agentId: this.config.id,
      metadata: this.currentContext.metadata,
    });
  }

  /**
   * Register an event handler
   */
  on(eventType: AgentEventType, handler: AgentEventHandler): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  /**
   * Remove an event handler
   */
  off(eventType: AgentEventType, handler: AgentEventHandler): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit an event
   */
  protected async emitEvent(
    type: AgentEventType,
    data: Record<string, unknown>
  ): Promise<void> {
    const event: AgentEvent = {
      type,
      timestamp: new Date(),
      agentId: this.config.id,
      sessionId: this.currentContext?.sessionId || '',
      data,
    };

    const handlers = this.eventHandlers.get(type) || [];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Get agent ID
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.config.name;
  }

  // ============================================================================
  // Lifecycle Hooks - Override in subclasses
  // ============================================================================

  /**
   * Called when agent starts processing
   */
  protected async onStart(_context: AgentContext): Promise<void> {
    // Override in subclass
  }

  /**
   * Called when agent completes successfully
   */
  protected async onComplete(_output: AgentOutput): Promise<void> {
    // Override in subclass
  }

  /**
   * Called when agent encounters an error
   */
  protected async onError(_error: Error): Promise<void> {
    // Override in subclass
  }

  /**
   * Called before a tool is executed
   */
  protected async onToolCall(_tool: string, _params: unknown): Promise<void> {
    // Override in subclass
  }
}

/**
 * Default agent implementation for general use
 */
export class DefaultAgent extends Agent {
  constructor(config: AgentConfig, dependencies: AgentDependencies) {
    super(config, dependencies);
  }
}
