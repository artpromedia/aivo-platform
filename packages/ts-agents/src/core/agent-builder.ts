/**
 * Fluent builder for creating agents
 */

import type {
  AgentConfig,
  ModelConfig,
  StateConfig,
  MemoryConfig,
  Tool,
} from './types.js';
import { Agent, SimpleAgent, type AgentOptions } from './agent.js';
import type { IStateStore } from '../state/memory-state-store.js';
import type { RedisClient } from '../state/redis-state-store.js';
import type { IModelAdapter } from '../providers/model-adapter.js';

/**
 * Fluent builder for constructing Agent instances
 */
export class AgentBuilder<T extends Agent = SimpleAgent> {
  private id: string = '';
  private name: string = '';
  private description: string = '';
  private systemPrompt: string = '';
  private modelConfig: ModelConfig = {
    provider: 'openai',
    model: 'gpt-4',
  };
  private tools: Tool[] = [];
  private maxIterations: number = 10;
  private timeout: number = 60000;
  private stateConfig: StateConfig = {
    store: 'memory',
    ttlSeconds: 3600,
    checkpointInterval: 5,
    maxCheckpoints: 10,
  };
  private memoryConfig: MemoryConfig = {
    episodic: { enabled: true },
    working: { capacity: 7 },
    longTerm: { enabled: false },
  };
  private options: AgentOptions = {};
  private agentClass: new (config: AgentConfig, options?: AgentOptions) => T = SimpleAgent as unknown as new (config: AgentConfig, options?: AgentOptions) => T;

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
    // Auto-generate ID from name if not set
    if (!this.id) {
      this.id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
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
  withModel(config: ModelConfig | string): this {
    if (typeof config === 'string') {
      // Parse shorthand like "openai:gpt-4" or "anthropic:claude-3-sonnet"
      const [provider, model] = config.split(':');
      this.modelConfig = {
        provider: (provider as ModelConfig['provider']) ?? 'openai',
        model: model ?? config,
      };
    } else {
      this.modelConfig = config;
    }
    return this;
  }

  /**
   * Set the model provider
   */
  withProvider(provider: ModelConfig['provider']): this {
    this.modelConfig.provider = provider;
    return this;
  }

  /**
   * Set the temperature
   */
  withTemperature(temperature: number): this {
    this.modelConfig.temperature = temperature;
    return this;
  }

  /**
   * Set max tokens
   */
  withMaxTokens(maxTokens: number): this {
    this.modelConfig.maxTokens = maxTokens;
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
   * Add multiple tools
   */
  withTools(tools: Tool[]): this {
    this.tools.push(...tools);
    return this;
  }

  /**
   * Set max iterations
   */
  withMaxIterations(maxIterations: number): this {
    this.maxIterations = maxIterations;
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
   * Set state store type
   */
  withStateStore(store: 'redis' | 'memory' | IStateStore): this {
    if (typeof store === 'string') {
      this.stateConfig.store = store;
    } else {
      // Custom state store
      this.stateConfig.store = 'memory'; // Default, will be overridden
      this.options.stateManager = undefined; // Will use custom store
    }
    return this;
  }

  /**
   * Set Redis client for state persistence
   */
  withRedis(client: RedisClient): this {
    this.stateConfig.store = 'redis';
    this.options.redisClient = client;
    return this;
  }

  /**
   * Set state TTL in seconds
   */
  withStateTTL(ttlSeconds: number): this {
    this.stateConfig.ttlSeconds = ttlSeconds;
    return this;
  }

  /**
   * Set checkpoint configuration
   */
  withCheckpoints(interval: number, max?: number): this {
    this.stateConfig.checkpointInterval = interval;
    if (max !== undefined) {
      this.stateConfig.maxCheckpoints = max;
    }
    return this;
  }

  /**
   * Enable state encryption
   */
  withEncryption(key: string): this {
    this.stateConfig.encryptionKey = key;
    return this;
  }

  /**
   * Configure memory system
   */
  withMemory(config: MemoryConfig): this {
    this.memoryConfig = { ...this.memoryConfig, ...config };
    return this;
  }

  /**
   * Enable episodic memory
   */
  withEpisodicMemory(options?: { maxEpisodes?: number; retentionDays?: number }): this {
    this.memoryConfig.episodic = {
      enabled: true,
      ...options,
    };
    return this;
  }

  /**
   * Configure working memory
   */
  withWorkingMemory(capacity?: number): this {
    this.memoryConfig.working = {
      capacity: capacity ?? 7,
    };
    return this;
  }

  /**
   * Enable long-term memory
   */
  withLongTermMemory(options?: {
    vectorStore?: 'memory' | 'pgvector' | 'pinecone';
    embeddingModel?: string;
    maxMemories?: number;
  }): this {
    this.memoryConfig.longTerm = {
      enabled: true,
      ...options,
    };
    return this;
  }

  /**
   * Set a custom model adapter
   */
  withModelAdapter(adapter: IModelAdapter): this {
    this.options.modelAdapter = adapter;
    return this;
  }

  /**
   * Use a custom agent class
   */
  withClass<U extends Agent>(
    agentClass: new (config: AgentConfig, options?: AgentOptions) => U
  ): AgentBuilder<U> {
    const builder = this as unknown as AgentBuilder<U>;
    builder.agentClass = agentClass;
    return builder;
  }

  /**
   * Build and return the agent instance
   */
  build(): T {
    // Validate required fields
    if (!this.id) {
      throw new Error('Agent ID is required. Use withId() or withName()');
    }
    if (!this.name) {
      this.name = this.id;
    }
    if (!this.systemPrompt) {
      throw new Error('System prompt is required. Use withSystemPrompt()');
    }

    const config: AgentConfig = {
      id: this.id,
      name: this.name,
      description: this.description,
      systemPrompt: this.systemPrompt,
      model: this.modelConfig,
      tools: this.tools,
      maxIterations: this.maxIterations,
      timeout: this.timeout,
      stateConfig: this.stateConfig,
      memoryConfig: this.memoryConfig,
    };

    return new this.agentClass(config, this.options);
  }

  /**
   * Create a builder from an existing configuration
   */
  static fromConfig(config: AgentConfig): AgentBuilder {
    const builder = new AgentBuilder();
    builder.id = config.id;
    builder.name = config.name;
    builder.description = config.description;
    builder.systemPrompt = config.systemPrompt;
    builder.modelConfig = config.model;
    builder.tools = config.tools;
    builder.maxIterations = config.maxIterations;
    builder.timeout = config.timeout;
    builder.stateConfig = config.stateConfig;
    builder.memoryConfig = config.memoryConfig;
    return builder;
  }
}

/**
 * Create a new agent builder
 */
export function createAgentBuilder(): AgentBuilder {
  return new AgentBuilder();
}

/**
 * Quick helper to create a simple agent
 */
export function createAgent(config: {
  name: string;
  systemPrompt: string;
  model?: ModelConfig | string;
  tools?: Tool[];
  options?: AgentOptions;
}): SimpleAgent {
  let builder = new AgentBuilder()
    .withName(config.name)
    .withSystemPrompt(config.systemPrompt);

  if (config.model) {
    builder = builder.withModel(config.model);
  }

  if (config.tools) {
    builder = builder.withTools(config.tools);
  }

  const agent = builder.build();

  return agent;
}
