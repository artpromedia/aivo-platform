/**
 * Fluent builder for creating Agent instances
 */

import { v4 as uuid } from 'uuid';
import type {
  AgentConfig,
  ModelConfig,
  StateConfig,
  MemoryConfig,
  Tool,
} from './types';
import { Agent, DefaultAgent, type AgentDependencies } from './agent';
import { StateManager } from '../state/state-manager';
import { MemoryStateStore } from '../state/memory-state-store';
import { RedisStateStore } from '../state/redis-state-store';
import { MemoryManager } from '../memory/memory-manager';
import { EpisodicMemory } from '../memory/episodic-memory';
import { WorkingMemory } from '../memory/working-memory';
import { LongTermMemory } from '../memory/long-term-memory';
import { ToolRegistry } from '../tools/tool-registry';
import { ToolExecutor } from '../tools/tool-executor';
import { ModelAdapter } from '../providers/model-adapter';
import { AnthropicAdapter } from '../providers/anthropic-adapter';
import { OpenAIAdapter } from '../providers/openai-adapter';
import { ConversationManager } from '../conversation/conversation-manager';
import type { IStateStore } from '../state/state-manager';

export interface AgentBuilderOptions {
  id?: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
  model?: ModelConfig;
  tools?: Tool[];
  maxIterations?: number;
  timeout?: number;
  stateConfig?: Partial<StateConfig>;
  memoryConfig?: Partial<MemoryConfig>;
}

export class AgentBuilder {
  private id: string;
  private name: string = 'Agent';
  private description: string = '';
  private systemPrompt: string = 'You are a helpful AI assistant.';
  private model: ModelConfig = {
    provider: 'anthropic',
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 4096,
  };
  private tools: Tool[] = [];
  private maxIterations: number = 10;
  private timeout: number = 300000; // 5 minutes
  private stateConfig: StateConfig = {
    store: 'memory',
    ttlSeconds: 3600,
    checkpointInterval: 5,
    maxCheckpoints: 10,
  };
  private memoryConfig: MemoryConfig = {
    episodic: { enabled: true, maxEpisodes: 100 },
    working: { capacity: 7 },
    longTerm: { enabled: false },
  };

  // Custom dependencies
  private customStateStore?: IStateStore;
  private customModelAdapter?: ModelAdapter;
  private redisClient?: unknown;
  private anthropicApiKey?: string;
  private openaiApiKey?: string;

  constructor(options?: AgentBuilderOptions) {
    this.id = options?.id || uuid();
    if (options?.name) this.name = options.name;
    if (options?.description) this.description = options.description;
    if (options?.systemPrompt) this.systemPrompt = options.systemPrompt;
    if (options?.model) this.model = { ...this.model, ...options.model };
    if (options?.tools) this.tools = options.tools;
    if (options?.maxIterations) this.maxIterations = options.maxIterations;
    if (options?.timeout) this.timeout = options.timeout;
    if (options?.stateConfig) {
      this.stateConfig = { ...this.stateConfig, ...options.stateConfig };
    }
    if (options?.memoryConfig) {
      this.memoryConfig = { ...this.memoryConfig, ...options.memoryConfig };
    }
  }

  /**
   * Set the agent ID
   */
  withId(id: string): this {
    this.id = id;
    return this;
  }

  /**
   * Set the agent name
   */
  withName(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * Set the agent description
   */
  withDescription(description: string): this {
    this.description = description;
    return this;
  }

  /**
   * Set the system prompt
   */
  withSystemPrompt(prompt: string): this {
    this.systemPrompt = prompt;
    return this;
  }

  /**
   * Set the model configuration
   */
  withModel(config: Partial<ModelConfig>): this {
    this.model = { ...this.model, ...config };
    return this;
  }

  /**
   * Add a single tool
   */
  withTool(tool: Tool): this {
    this.tools.push(tool);
    return this;
  }

  /**
   * Set all tools
   */
  withTools(tools: Tool[]): this {
    this.tools = tools;
    return this;
  }

  /**
   * Set maximum iterations
   */
  withMaxIterations(max: number): this {
    this.maxIterations = max;
    return this;
  }

  /**
   * Set timeout in milliseconds
   */
  withTimeout(timeout: number): this {
    this.timeout = timeout;
    return this;
  }

  /**
   * Set state configuration
   */
  withStateConfig(config: Partial<StateConfig>): this {
    this.stateConfig = { ...this.stateConfig, ...config };
    return this;
  }

  /**
   * Set memory configuration
   */
  withMemory(config: Partial<MemoryConfig>): this {
    this.memoryConfig = { ...this.memoryConfig, ...config };
    return this;
  }

  /**
   * Set a custom state store
   */
  withStateStore(store: IStateStore): this {
    this.customStateStore = store;
    return this;
  }

  /**
   * Set Redis client for state storage
   */
  withRedis(client: unknown): this {
    this.redisClient = client;
    this.stateConfig.store = 'redis';
    return this;
  }

  /**
   * Set a custom model adapter
   */
  withModelAdapter(adapter: ModelAdapter): this {
    this.customModelAdapter = adapter;
    return this;
  }

  /**
   * Set Anthropic API key
   */
  withAnthropicKey(apiKey: string): this {
    this.anthropicApiKey = apiKey;
    this.model.provider = 'anthropic';
    return this;
  }

  /**
   * Set OpenAI API key
   */
  withOpenAIKey(apiKey: string): this {
    this.openaiApiKey = apiKey;
    this.model.provider = 'openai';
    return this;
  }

  /**
   * Build the agent configuration
   */
  buildConfig(): AgentConfig {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      systemPrompt: this.systemPrompt,
      model: this.model,
      tools: this.tools,
      maxIterations: this.maxIterations,
      timeout: this.timeout,
      stateConfig: this.stateConfig,
      memoryConfig: this.memoryConfig,
    };
  }

  /**
   * Build the agent dependencies
   */
  buildDependencies(): AgentDependencies {
    // Create state store
    let stateStore: IStateStore;
    if (this.customStateStore) {
      stateStore = this.customStateStore;
    } else if (this.stateConfig.store === 'redis' && this.redisClient) {
      stateStore = new RedisStateStore(this.redisClient);
    } else {
      stateStore = new MemoryStateStore();
    }

    // Create state manager
    const stateManager = new StateManager(stateStore, this.stateConfig);

    // Create memory components
    const episodicMemory = new EpisodicMemory(
      this.memoryConfig.episodic?.maxEpisodes || 100
    );
    const workingMemory = new WorkingMemory(
      this.memoryConfig.working?.capacity || 7
    );
    const longTermMemory = new LongTermMemory({
      enabled: this.memoryConfig.longTerm?.enabled || false,
    });

    // Create memory manager
    const memoryManager = new MemoryManager(
      episodicMemory,
      workingMemory,
      longTermMemory,
      this.memoryConfig
    );

    // Create tool registry and executor
    const toolRegistry = new ToolRegistry();
    const toolExecutor = new ToolExecutor(toolRegistry);

    // Create model adapter
    let modelAdapter: ModelAdapter;
    if (this.customModelAdapter) {
      modelAdapter = this.customModelAdapter;
    } else if (this.model.provider === 'anthropic') {
      modelAdapter = new AnthropicAdapter(this.anthropicApiKey);
    } else {
      modelAdapter = new OpenAIAdapter(this.openaiApiKey);
    }

    // Create conversation manager
    const conversationManager = new ConversationManager({
      maxHistoryLength: 100,
      maxTokens: this.model.maxTokens || 4096,
      summarizeThreshold: 50,
    });

    return {
      stateManager,
      memoryManager,
      toolRegistry,
      toolExecutor,
      modelAdapter,
      conversationManager,
    };
  }

  /**
   * Build the agent instance
   */
  build(): Agent {
    const config = this.buildConfig();
    const dependencies = this.buildDependencies();
    return new DefaultAgent(config, dependencies);
  }

  /**
   * Build a custom agent class instance
   */
  buildAs<T extends Agent>(
    AgentClass: new (config: AgentConfig, dependencies: AgentDependencies) => T
  ): T {
    const config = this.buildConfig();
    const dependencies = this.buildDependencies();
    return new AgentClass(config, dependencies);
  }

  /**
   * Create a builder from an existing config
   */
  static fromConfig(config: AgentConfig): AgentBuilder {
    const builder = new AgentBuilder();
    builder.id = config.id;
    builder.name = config.name;
    builder.description = config.description;
    builder.systemPrompt = config.systemPrompt;
    builder.model = config.model;
    builder.tools = config.tools;
    builder.maxIterations = config.maxIterations;
    builder.timeout = config.timeout;
    builder.stateConfig = config.stateConfig;
    builder.memoryConfig = config.memoryConfig;
    return builder;
  }

  /**
   * Clone this builder
   */
  clone(): AgentBuilder {
    const builder = new AgentBuilder();
    builder.id = uuid(); // New ID for clone
    builder.name = this.name;
    builder.description = this.description;
    builder.systemPrompt = this.systemPrompt;
    builder.model = { ...this.model };
    builder.tools = [...this.tools];
    builder.maxIterations = this.maxIterations;
    builder.timeout = this.timeout;
    builder.stateConfig = { ...this.stateConfig };
    builder.memoryConfig = { ...this.memoryConfig };
    builder.customStateStore = this.customStateStore;
    builder.customModelAdapter = this.customModelAdapter;
    builder.redisClient = this.redisClient;
    builder.anthropicApiKey = this.anthropicApiKey;
    builder.openaiApiKey = this.openaiApiKey;
    return builder;
  }
}
