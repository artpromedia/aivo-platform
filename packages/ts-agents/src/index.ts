/**
 * @aivo/ts-agents - AI Agent Infrastructure Package
 *
 * A comprehensive framework for building AI agents with:
 * - State persistence (Redis/Memory)
 * - Episodic, working, and long-term memory
 * - Tool execution capabilities
 * - Conversation management
 * - Multi-provider LLM support (Anthropic, OpenAI)
 * - Observability (logging, metrics, tracing)
 * - Pre-built educational agents
 *
 * @example
 * ```typescript
 * import { AgentBuilder, RedisStateStore } from '@aivo/ts-agents';
 *
 * const agent = new AgentBuilder()
 *   .withName('Math Tutor')
 *   .withSystemPrompt('You are a patient math tutor...')
 *   .withModel({ provider: 'anthropic', model: 'claude-3-sonnet' })
 *   .withTools([calculatorTool])
 *   .withStateStore(new RedisStateStore(redisClient))
 *   .withMemory({
 *     episodic: { enabled: true, maxEpisodes: 100 },
 *     working: { capacity: 7 },
 *     longTerm: { enabled: true }
 *   })
 *   .build();
 *
 * const result = await agent.run(
 *   { message: "Help me understand quadratic equations" },
 *   { sessionId: 'session-123', userId: 'user-456', tenantId: 'tenant-789' }
 * );
 * ```
 */

// Core exports
export {
  // Types
  type AgentConfig,
  type AgentContext,
  type AgentInput,
  type AgentOutput,
  type AgentState,
  type AgentStatus,
  type AgentEvent,
  type AgentEventType,
  type AgentEventHandler,
  type ModelConfig,
  type StateConfig,
  type MemoryConfig,
  type Message,
  type MessageRole,
  type Tool,
  type ToolCall,
  type ToolResult,
  type ToolContext,
  type ToolDefinition,
  type ValidationResult,
  type JSONSchema,
  type JSONSchemaProperty,
  type Memory,
  type MemoryType,
  type MemoryItem,
  type Episode,
  type RecallOptions,
  type ForgetCriteria,
  type Checkpoint,
  type TokenUsage,
  type FinishReason,
  type Attachment,
  type ConversationConfig,
  type ConversationBranch,
  type ContextWindow,
  // Schemas
  ModelConfigSchema,
  StateConfigSchema,
  MemoryConfigSchema,
  AgentInputSchema,
  AgentContextSchema,
} from './core/types';

export { Agent, DefaultAgent, type AgentDependencies } from './core/agent';
export { AgentBuilder, type AgentBuilderOptions } from './core/agent-builder';
export {
  AgentRunner,
  type AgentRunnerConfig,
  type RunOptions,
  type AgentRun,
} from './core/agent-runner';
export {
  StateMachine,
  type StateMachineConfig,
  type StateTransition,
  type StateContext,
  type StateHistoryEntry,
  type StateChangeHandler,
} from './core/state-machine';

// State management exports
export {
  StateManager,
  type IStateStore,
} from './state/state-manager';
export {
  RedisStateStore,
  type RedisStoreOptions,
  type RedisClient,
  type RedisPipeline,
} from './state/redis-state-store';
export {
  MemoryStateStore,
  type MemoryStoreOptions,
} from './state/memory-state-store';
export {
  StateSerializer,
  type SerializerOptions,
} from './state/state-serializer';

// Memory exports
export { EpisodicMemory, type EpisodicMemoryConfig } from './memory/episodic-memory';
export { WorkingMemory, type WorkingMemoryConfig } from './memory/working-memory';
export { LongTermMemory, type LongTermMemoryConfig } from './memory/long-term-memory';
export {
  MemoryRetrieval,
  type RetrievalConfig,
  type RetrievalResult,
} from './memory/memory-retrieval';
export { MemoryManager } from './memory/memory-manager';

// Tool exports
export {
  type ExtendedTool,
  type ToolMetadata,
  type ToolExample,
  type ToolCategory,
  type ToolFactory,
  type ExecutorOptions,
  type BatchToolResult,
  defineTool,
  toolSuccess,
  toolError,
  validateParams,
} from './tools/tool-types';
export { ToolRegistry, type RegistryOptions } from './tools/tool-registry';
export { ToolExecutor } from './tools/tool-executor';

// Built-in tools
export {
  searchTool,
  createSearchTool,
  configureSearchData,
  type SearchParams,
  type SearchResult,
} from './tools/built-in/search.tool';
export {
  calculatorTool,
  createCalculatorTool,
  type CalculatorParams,
  type Operation,
} from './tools/built-in/calculator.tool';
export {
  curriculumLookupTool,
  createCurriculumLookupTool,
  configureCurriculumData,
  type CurriculumStandard,
  type CurriculumLookupParams,
} from './tools/built-in/curriculum-lookup.tool';

// Conversation exports
export { MessageHistory, type MessageHistoryConfig } from './conversation/message-history';
export {
  ContextWindowManager,
  SimpleTokenizer,
  type ITokenizer,
  type ContextWindowConfig,
} from './conversation/context-window';
export { ConversationManager } from './conversation/conversation-manager';

// Provider exports
export {
  ModelAdapter,
  MockModelAdapter,
  type GenerateRequest,
  type GenerateResponse,
  type StreamCallback,
  type StreamChunk,
} from './providers/model-adapter';
export { AnthropicAdapter } from './providers/anthropic-adapter';
export { OpenAIAdapter } from './providers/openai-adapter';

// Observability exports
export {
  AgentLogger,
  ConsoleTransport,
  JsonTransport,
  BufferTransport,
  defaultLogger,
  type LogLevel,
  type LogEntry,
  type LogTransport,
  type AgentLoggerConfig,
} from './observability/agent-logger';
export {
  AgentMetrics,
  type MetricValue,
  type MetricSnapshot,
  type AgentMetricsConfig,
} from './observability/agent-metrics';
export {
  TraceContext,
  ConsoleTraceExporter,
  BufferTraceExporter,
  type Span,
  type SpanLog,
  type TraceExporter,
  type TraceContextConfig,
} from './observability/trace-context';

// Educational agents exports
export {
  TutorAgent,
  type TutorAgentConfig,
  type StudentProfile,
} from './educational/tutor-agent';
export {
  AssessmentAgent,
  type AssessmentConfig,
  type Question,
  type Response,
  type AssessmentResult,
} from './educational/assessment-agent';
export {
  FeedbackAgent,
  type FeedbackConfig,
  type Goal,
  type Milestone,
  type ProgressEntry,
  type FeedbackReport,
} from './educational/feedback-agent';
