/**
 * Core types for the @aivo/ts-agents package
 */

import { z } from 'zod';

// ============================================================================
// Agent Configuration Types
// ============================================================================

export interface ModelConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface StateConfig {
  store: 'redis' | 'memory';
  ttlSeconds: number;
  checkpointInterval: number;
  maxCheckpoints: number;
  encryptionKey?: string;
}

export interface MemoryConfig {
  episodic?: {
    enabled: boolean;
    maxEpisodes: number;
  };
  working?: {
    capacity: number;
  };
  longTerm?: {
    enabled: boolean;
    vectorStore?: 'memory' | 'pgvector' | 'redis';
    embeddingModel?: string;
  };
}

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

// ============================================================================
// Agent Context Types
// ============================================================================

export interface AgentContext {
  sessionId: string;
  userId: string;
  tenantId: string;
  metadata: Record<string, unknown>;
  traceId?: string;
  parentSpanId?: string;
}

// ============================================================================
// Agent Input/Output Types
// ============================================================================

export interface AgentInput {
  message: string;
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
}

export interface Attachment {
  type: 'image' | 'file' | 'audio';
  url?: string;
  base64?: string;
  mimeType: string;
  name?: string;
}

export interface AgentOutput {
  message: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
  usage?: TokenUsage;
  finishReason: FinishReason;
}

export type FinishReason = 'complete' | 'max_iterations' | 'timeout' | 'error' | 'stopped';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ============================================================================
// Agent Status Types
// ============================================================================

export type AgentStatus =
  | 'idle'
  | 'running'
  | 'waiting_for_tool'
  | 'waiting_for_user'
  | 'completed'
  | 'error'
  | 'paused';

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
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
  description?: string;
  additionalProperties?: boolean;
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

export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: unknown, context: ToolContext) => Promise<ToolResult>;
  validate?: (params: unknown) => ValidationResult;
}

export interface ToolContext {
  sessionId: string;
  userId: string;
  tenantId: string;
  agentId: string;
  metadata: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  timestamp: Date;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTimeMs: number;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
}

// ============================================================================
// State Types
// ============================================================================

export interface Checkpoint {
  id: string;
  sessionId: string;
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
  participants: string[];
  timestamp: Date;
  duration?: number;
  outcome?: string;
  metadata: Record<string, unknown>;
}

export interface RecallOptions {
  type?: MemoryType;
  limit?: number;
  minImportance?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface ForgetCriteria {
  olderThan?: Date;
  maxImportance?: number;
  maxAccessCount?: number;
  type?: MemoryType;
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface ConversationConfig {
  maxHistoryLength: number;
  maxTokens: number;
  summarizeThreshold: number;
}

export interface ConversationBranch {
  id: string;
  parentId?: string;
  label: string;
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
  | 'tool:start'
  | 'tool:complete'
  | 'tool:error'
  | 'memory:store'
  | 'memory:recall'
  | 'state:save'
  | 'state:restore';

export interface AgentEvent {
  type: AgentEventType;
  timestamp: Date;
  agentId: string;
  sessionId: string;
  data: Record<string, unknown>;
}

export type AgentEventHandler = (event: AgentEvent) => void | Promise<void>;

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const ModelConfigSchema = z.object({
  provider: z.enum(['anthropic', 'openai']),
  model: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  stopSequences: z.array(z.string()).optional(),
});

export const StateConfigSchema = z.object({
  store: z.enum(['redis', 'memory']),
  ttlSeconds: z.number().positive(),
  checkpointInterval: z.number().nonnegative(),
  maxCheckpoints: z.number().positive(),
  encryptionKey: z.string().optional(),
});

export const MemoryConfigSchema = z.object({
  episodic: z.object({
    enabled: z.boolean(),
    maxEpisodes: z.number().positive(),
  }).optional(),
  working: z.object({
    capacity: z.number().positive(),
  }).optional(),
  longTerm: z.object({
    enabled: z.boolean(),
    vectorStore: z.enum(['memory', 'pgvector', 'redis']).optional(),
    embeddingModel: z.string().optional(),
  }).optional(),
});

export const AgentInputSchema = z.object({
  message: z.string().min(1),
  attachments: z.array(z.object({
    type: z.enum(['image', 'file', 'audio']),
    url: z.string().url().optional(),
    base64: z.string().optional(),
    mimeType: z.string(),
    name: z.string().optional(),
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const AgentContextSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  metadata: z.record(z.unknown()),
  traceId: z.string().optional(),
  parentSpanId: z.string().optional(),
});
