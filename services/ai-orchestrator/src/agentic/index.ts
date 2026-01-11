/**
 * Agentic AI Module
 *
 * This module provides the core building blocks for truly agentic AI:
 *
 * - **Function Calling**: LLM-native tool use with OpenAI, Anthropic, and Gemini
 * - **ReAct Loop**: Multi-step reasoning with iterative tool execution
 * - **Memory Store**: Vector-based long-term memory with semantic search (RAG)
 * - **Multi-Agent Orchestration**: Supervisor pattern with agent collaboration
 * - **Autonomous Execution**: Decision execution with guardrails and approval workflows
 * - **Agentic Base Agent**: Unified base class combining all capabilities
 *
 * @module ai-orchestrator/agentic
 */

// Function Calling
export {
  // Types
  type OpenAIFunctionSchema,
  type OpenAIParameterSchema,
  type AnthropicToolSchema,
  type AnthropicParameterSchema,
  type ParsedFunctionCall,
  type FunctionCallResult,
  type FunctionCallingProvider,
  type FunctionCallingOptions,

  // Functions
  toolToOpenAISchema,
  toolToAnthropicSchema,
  toolsToSchemas,
  parseOpenAIFunctionCalls,
  parseAnthropicToolUse,
  parseFunctionCalls,
  buildOpenAIToolResultMessage,
  buildAnthropicToolResultMessage,
  buildToolResultMessages,
  buildFunctionCallingRequestOptions,

  // Constants
  DEFAULT_FUNCTION_CALLING_OPTIONS,
} from './function-calling.js';

// ReAct Loop
export {
  // Types
  type ReActConfig,
  type ReActStep,
  type ReActResult,
  type ReActTerminationReason,
  type ReActContext,

  // Classes
  ReActLoopExecutor,

  // Functions
  formatReActTrace,

  // Constants
  DEFAULT_REACT_CONFIG,
} from './react-loop.js';

// Memory Store
export {
  // Types
  type MemoryType,
  type MemoryEntry,
  type MemoryMetadata,
  type MemorySource,
  type MemoryQuery,
  type MemorySearchResult,
  type MemoryStoreConfig,
  type EmbeddingProvider,

  // Classes
  VectorMemoryStore,
  MockEmbeddingProvider,

  // Functions
  buildMemoryContext,

  // Constants
  DEFAULT_MEMORY_STORE_CONFIG,
} from './memory-store.js';

// Multi-Agent Orchestration
export {
  // Types
  type SpecialistAgentType,
  type AgentCapability,
  type AgentMessage,
  type AgentMessageType,
  type SharedAgentContext,
  type AgentTask,
  type AgentTaskResult,
  type AgentAction,
  type AgentRecommendation,
  type RoutingDecision,
  type MultiAgentConfig,
  type AgentHandler,
  type OrchestrateResult,

  // Classes
  SupervisorAgent,
  MultiAgentOrchestrator,

  // Functions
  createAgentMessage,

  // Constants
  AGENT_REGISTRY,
  DEFAULT_MULTI_AGENT_CONFIG,
} from './multi-agent-orchestrator.js';

// Autonomous Execution
export {
  // Types
  type AutonomyLevel,
  type DecisionRisk,
  type ActionCategory,
  type LearnerAutonomySettings,
  type AutonomousDecision,
  type DecisionExecutionResult,
  type DecisionStatus,
  type ActionExecutor,
  type AutonomousExecutorConfig,

  // Classes
  AutonomousExecutor,

  // Functions
  assessDecisionRisk,
  createDecision,

  // Constants
  DEFAULT_EXECUTOR_CONFIG,
  DEFAULT_AUTONOMY_SETTINGS,
} from './autonomous-executor.js';

// Agentic Base Agent
export {
  // Types
  type AgenticContext,
  type AgenticResponse,
  type AgentTool,
  type AgenticAgentConfig,

  // Classes
  AgenticBaseAgent,

  // Constants
  DEFAULT_AGENTIC_CONFIG,
} from './agentic-base-agent.js';
