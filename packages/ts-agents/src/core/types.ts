/**
 * Core types and interfaces for the agent infrastructure
 */

// ============================================================================
// Model Configuration
// ============================================================================

export type ModelProvider = 'openai' | 'anthropic' | 'azure' | 'custom';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  timeout?: number;
}

// ============================================================================
// Agent Status and State
// ============================================================================

export type AgentStatus =
  | 'idle'
  | 'running'
  | 'waiting_for_input'
  | 'executing_tool'
  | 'thinking'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Checkpoint {
  id: string;
  label?: string;
  state: AgentState;
  createdAt: Date;
}

export interface AgentState {
  sessionId: string;
  agentId: string;
  status: AgentStatus;
  currentStep: number;
  variables: Record<string, unknown>;
  conversationHistory: Message[];
  toolCallHistory: ToolCall[];
  checkpoints: Checkpoint[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

// ============================================================================
// Messages
// ============================================================================

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Tool Types
// ============================================================================

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  timestamp: Date;
  result?: ToolResult;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTimeMs: number;
}

export interface ToolContext {
  sessionId: string;
  userId: string;
  tenantId: string;
  agentId: string;
  metadata: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
  validate?: (params: Record<string, unknown>) => ValidationResult;
}

// ============================================================================
// Memory Types
// ============================================================================

export type MemoryType = 'episodic' | 'working' | 'long-term' | 'semantic';

export interface Memory {
  id: string;
  type: MemoryType;
  content: unknown;
  embedding?: number[];
  timestamp: Date;
  importance: number;
  accessCount: number;
  lastAccessed: Date;
  metadata: Record<string, unknown>;
}

export interface MemoryItem {
  id: string;
  content: unknown;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Episode {
  id: string;
  type: string;
  content: unknown;
  participants?: string[];
  context?: Record<string, unknown>;
  timestamp: Date;
  duration?: number;
  outcome?: string;
  metadata?: Record<string, unknown>;
}

export interface ForgetCriteria {
  olderThan?: Date;
  importanceBelow?: number;
  accessCountBelow?: number;
  types?: MemoryType[];
}

export interface RecallOptions {
  types?: MemoryType[];
  limit?: number;
  minImportance?: number;
  timeRange?: { start: Date; end: Date };
  includeSimilar?: boolean;
}

// ============================================================================
// State Configuration
// ============================================================================

export type StateStoreType = 'redis' | 'memory';

export interface StateConfig {
  store: StateStoreType;
  ttlSeconds: number;
  checkpointInterval: number;
  maxCheckpoints: number;
  encryptionKey?: string;
}

export interface MemoryConfig {
  episodic?: {
    enabled: boolean;
    maxEpisodes?: number;
    retentionDays?: number;
  };
  working?: {
    capacity?: number;
  };
  longTerm?: {
    enabled: boolean;
    vectorStore?: 'memory' | 'pgvector' | 'pinecone';
    embeddingModel?: string;
    maxMemories?: number;
  };
}

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: ModelConfig;
  tools: Tool[];
  maxIterations: number;
  timeout: number;
  stateConfig: StateConfig;
  memoryConfig: MemoryConfig;
}

export interface AgentContext {
  sessionId: string;
  userId: string;
  tenantId: string;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Agent Input/Output
// ============================================================================

export interface AgentInput {
  message: string;
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
}

export interface Attachment {
  type: 'image' | 'file' | 'url';
  name: string;
  url?: string;
  data?: string;
  mimeType?: string;
}

export interface AgentOutput {
  message: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
  usage?: TokenUsage;
  finishReason: FinishReason;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';

// ============================================================================
// Conversation Types
// ============================================================================

export interface ConversationConfig {
  maxHistoryLength?: number;
  maxTokens?: number;
  summarizeThreshold?: number;
  preserveSystemMessage?: boolean;
}

export interface ConversationBranch {
  id: string;
  label: string;
  parentBranchId?: string;
  messages: Message[];
  createdAt: Date;
}

export interface ContextWindow {
  systemPrompt: string;
  memories: string;
  history: Message[];
  tools: ToolDefinition[];
  totalTokens: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type AgentEventType =
  | 'agent:start'
  | 'agent:complete'
  | 'agent:error'
  | 'agent:iteration'
  | 'tool:call'
  | 'tool:result'
  | 'memory:store'
  | 'memory:retrieve'
  | 'state:save'
  | 'state:restore';

export interface AgentEvent {
  type: AgentEventType;
  timestamp: Date;
  sessionId: string;
  agentId: string;
  data?: unknown;
}

// ============================================================================
// Error Types
// ============================================================================

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = false,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class ToolExecutionError extends AgentError {
  constructor(toolName: string, message: string, details?: Record<string, unknown>) {
    super(`Tool '${toolName}' failed: ${message}`, 'TOOL_EXECUTION_ERROR', true, details);
    this.name = 'ToolExecutionError';
  }
}

export class StateError extends AgentError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'STATE_ERROR', false, details);
    this.name = 'StateError';
  }
}

export class MemoryError extends AgentError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'MEMORY_ERROR', true, details);
    this.name = 'MemoryError';
  }
}

export class ModelError extends AgentError {
  constructor(message: string, recoverable: boolean = true, details?: Record<string, unknown>) {
    super(message, 'MODEL_ERROR', recoverable, details);
    this.name = 'ModelError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface Disposable {
  dispose(): Promise<void>;
}
