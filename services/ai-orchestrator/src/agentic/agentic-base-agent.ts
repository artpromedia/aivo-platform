/**
 * Agentic Base Agent
 *
 * A fully-featured agentic base class that combines:
 * - LLM function calling for dynamic tool selection
 * - ReAct loop for multi-step reasoning
 * - Vector memory store for long-term recall (RAG)
 * - Autonomous decision execution with guardrails
 * - Multi-agent collaboration support
 *
 * This replaces the original BaseAgent for agents that need true agentic capabilities.
 *
 * @module ai-orchestrator/agentic/agentic-base-agent
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'node:crypto';

import type { PromptBuilder } from '../prompts/prompt-builder.js';
import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';
import type { SafetyFilter } from '../safety/safety-filter-v2.js';
import type { ToolExecutor, ToolDefinition, ExecutionContext } from '../execution/tool-executor.js';
import {
  type FunctionCallingOptions,
  type FunctionCallingProvider,
  DEFAULT_FUNCTION_CALLING_OPTIONS,
} from './function-calling.js';
import { ReActLoopExecutor, type ReActResult } from './react-loop.js';
import { VectorMemoryStore, buildMemoryContext, type MemoryType } from './memory-store.js';
import {
  AutonomousExecutor,
  createDecision,
  type DecisionExecutionResult,
  type ActionCategory,
} from './autonomous-executor.js';
import type { AgentHandler, AgentTask, AgentTaskResult, AgentRecommendation } from './multi-agent-orchestrator.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Extended context for agentic interactions
 */
export interface AgenticContext {
  tenantId: string;
  userId: string;
  learnerId?: string;
  sessionId: string;
  requestId: string;

  learnerProfile?: {
    gradeLevel: number;
    age: number;
    neurodiversityProfile?: {
      adhd?: boolean;
      dyslexia?: boolean;
      autism?: boolean;
    };
    accommodations?: string[];
    learningStyle?: string;
    currentGoals?: string[];
    hasIEP?: boolean;
    has504?: boolean;
  };

  sessionState?: {
    startTime: Date;
    currentActivity?: string;
    emotionalState?: string;
    focusLevel?: number;
    recentTopics: string[];
  };

  conversationHistory?: LLMMessage[];

  // Agentic-specific context
  agenticConfig?: {
    enableToolUse?: boolean;
    enableReActLoop?: boolean;
    enableMemory?: boolean;
    enableAutonomousActions?: boolean;
    maxReActIterations?: number;
    functionCallingProvider?: FunctionCallingProvider;
  };
}

/**
 * Response from an agentic agent
 */
export interface AgenticResponse {
  content: string;
  metadata: {
    model: string;
    provider: string;
    tokens: number;
    latencyMs: number;
    safetyFiltered: boolean;
    adaptationsApplied: string[];
    toolsUsed: string[];
    reactSteps: number;
    memoriesRecalled: number;
    autonomousActionsSubmitted: number;
  };
  recommendations?: AgentRecommendation[];
  autonomousDecisions?: DecisionExecutionResult[];
  reactTrace?: ReActResult;
}

/**
 * Tool for the agentic agent to use
 */
export interface AgentTool {
  definition: ToolDefinition;
  enabled: boolean;
}

/**
 * Configuration for the agentic base agent
 */
export interface AgenticAgentConfig {
  /** Whether to enable the ReAct reasoning loop */
  enableReActLoop: boolean;

  /** Maximum ReAct iterations */
  maxReActIterations: number;

  /** Whether to enable memory/RAG */
  enableMemory: boolean;

  /** Memory types to include in context */
  memoryTypes: MemoryType[];

  /** Maximum memories to recall */
  maxMemories: number;

  /** Whether to enable autonomous actions */
  enableAutonomousActions: boolean;

  /** Function calling configuration */
  functionCalling: FunctionCallingOptions;

  /** Provider for function calling format */
  provider: FunctionCallingProvider;

  /** Temperature for LLM calls */
  temperature: number;

  /** Max tokens for responses */
  maxTokens: number;
}

export const DEFAULT_AGENTIC_CONFIG: AgenticAgentConfig = {
  enableReActLoop: true,
  maxReActIterations: 5,
  enableMemory: true,
  memoryTypes: ['EPISODIC', 'SEMANTIC', 'PROCEDURAL'],
  maxMemories: 5,
  enableAutonomousActions: true,
  functionCalling: DEFAULT_FUNCTION_CALLING_OPTIONS,
  provider: 'openai',
  temperature: 0.7,
  maxTokens: 1000,
};

// ════════════════════════════════════════════════════════════════════════════════
// AGENTIC BASE AGENT
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Abstract base class for agentic AI agents
 */
export abstract class AgenticBaseAgent extends EventEmitter implements AgentHandler {
  protected readonly llm: LLMOrchestrator;
  protected readonly safetyFilter: SafetyFilter;
  protected readonly promptBuilder: PromptBuilder;
  protected readonly toolExecutor: ToolExecutor;
  protected readonly memoryStore?: VectorMemoryStore;
  protected readonly autonomousExecutor?: AutonomousExecutor;
  protected readonly config: AgenticAgentConfig;
  protected readonly tools: Map<string, AgentTool> = new Map();

  /** Unique identifier for this agent type */
  abstract readonly agentType: string;

  /** Display name for this agent */
  abstract readonly agentName: string;

  /** Description of what this agent does */
  abstract readonly description: string;

  /** System prompt for this agent */
  abstract readonly systemPrompt: string;

  /** Capabilities of this agent */
  abstract readonly capabilities: string[];

  constructor(
    llm: LLMOrchestrator,
    safetyFilter: SafetyFilter,
    promptBuilder: PromptBuilder,
    toolExecutor: ToolExecutor,
    memoryStore?: VectorMemoryStore,
    autonomousExecutor?: AutonomousExecutor,
    config: Partial<AgenticAgentConfig> = {}
  ) {
    super();
    this.llm = llm;
    this.safetyFilter = safetyFilter;
    this.promptBuilder = promptBuilder;
    this.toolExecutor = toolExecutor;
    this.memoryStore = memoryStore;
    this.autonomousExecutor = autonomousExecutor;
    this.config = { ...DEFAULT_AGENTIC_CONFIG, ...config };
  }

  /**
   * Register a tool for this agent to use
   */
  registerTool(tool: ToolDefinition, enabled: boolean = true): void {
    this.tools.set(tool.id, { definition: tool, enabled });
  }

  /**
   * Enable or disable a tool
   */
  setToolEnabled(toolId: string, enabled: boolean): void {
    const tool = this.tools.get(toolId);
    if (tool) {
      tool.enabled = enabled;
    }
  }

  /**
   * Get all enabled tools
   */
  protected getEnabledTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
      .filter(t => t.enabled)
      .map(t => t.definition);
  }

  /**
   * Main entry point for agent interactions
   */
  async respond(userMessage: string, context: AgenticContext): Promise<AgenticResponse> {
    const startTime = Date.now();
    const requestId = context.requestId || randomUUID();

    this.emit('agent:request_started', { agentType: this.agentType, requestId });

    try {
      // 1. Safety pre-check
      const safetyCheck = await this.safetyFilter.checkInput(userMessage, {
        tenantId: context.tenantId,
        userId: context.userId,
      });

      if (!safetyCheck.safe) {
        return this.createSafeResponse(safetyCheck.reason ?? 'unknown', context, startTime);
      }

      // 2. Build memory context if enabled
      let memoryContext = '';
      let memoriesRecalled = 0;

      if (this.config.enableMemory && this.memoryStore && context.learnerId) {
        const memoryResult = await buildMemoryContext(
          this.memoryStore,
          context.tenantId,
          context.learnerId,
          userMessage,
          {
            maxMemories: this.config.maxMemories,
            includeTypes: this.config.memoryTypes,
          }
        );
        memoryContext = memoryResult;
        // Track recalled memories count for metrics
        const _memoriesRecalled = (memoryResult.match(/^-/gm) || []).length;
        void _memoriesRecalled; // For future use in analytics
      }

      // 3. Determine execution path
      let response: AgenticResponse;

      if (this.config.enableReActLoop && this.getEnabledTools().length > 0) {
        // Use ReAct loop for tool-using interactions
        response = await this.executeWithReActLoop(
          userMessage,
          context,
          memoryContext,
          startTime
        );
      } else {
        // Use simple completion for non-tool interactions
        response = await this.executeSimpleCompletion(
          userMessage,
          context,
          memoryContext,
          startTime
        );
      }

      // 4. Store interaction in memory
      if (this.config.enableMemory && this.memoryStore && context.learnerId) {
        await this.storeInteractionMemory(userMessage, response.content, context);
      }

      // 5. Process any autonomous actions
      if (this.config.enableAutonomousActions && response.recommendations?.length) {
        const decisions = await this.processRecommendations(response.recommendations, context);
        response.autonomousDecisions = decisions;
        response.metadata.autonomousActionsSubmitted = decisions.length;
      }

      // 6. Safety post-check
      const outputCheck = await this.safetyFilter.checkOutput(response.content, {
        tenantId: context.tenantId,
        userId: context.userId,
      });

      if (!outputCheck.safe) {
        response.content = outputCheck.sanitized ?? this.getFallbackResponse();
        response.metadata.safetyFiltered = true;
      }

      // 7. Record metrics
      recordHistogram(`agent.${this.agentType}.latency`, response.metadata.latencyMs);
      incrementCounter(`agent.${this.agentType}.requests`);

      this.emit('agent:request_completed', {
        agentType: this.agentType,
        requestId,
        success: true,
        latencyMs: response.metadata.latencyMs,
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.emit('agent:request_error', {
        agentType: this.agentType,
        requestId,
        error: errorMessage,
      });

      incrementCounter(`agent.${this.agentType}.errors`);

      return {
        content: this.getErrorResponse(),
        metadata: {
          model: 'error',
          provider: 'internal',
          tokens: 0,
          latencyMs: Date.now() - startTime,
          safetyFiltered: false,
          adaptationsApplied: [],
          toolsUsed: [],
          reactSteps: 0,
          memoriesRecalled: 0,
          autonomousActionsSubmitted: 0,
        },
      };
    }
  }

  /**
   * Execute task (implements AgentHandler interface for multi-agent orchestration)
   */
  async execute(task: AgentTask): Promise<Omit<AgentTaskResult, 'taskId' | 'agentType' | 'durationMs'>> {
    const context: AgenticContext = {
      tenantId: task.context.tenantId,
      userId: task.context.userId,
      learnerId: task.context.learnerId,
      sessionId: task.context.sessionId,
      requestId: randomUUID(),
      learnerProfile: task.context.learnerProfile,
      sessionState: task.context.sessionState,
    };

    const response = await this.respond(task.input, context);

    return {
      success: true,
      output: response.content,
      recommendations: response.recommendations,
      tokensUsed: response.metadata.tokens,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // EXECUTION METHODS
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Execute using ReAct loop with tools
   */
  protected async executeWithReActLoop(
    userMessage: string,
    context: AgenticContext,
    memoryContext: string,
    startTime: number
  ): Promise<AgenticResponse> {
    const reactExecutor = new ReActLoopExecutor(
      this.llm,
      this.toolExecutor,
      {
        maxIterations: this.config.maxReActIterations,
        provider: this.config.provider,
        functionCalling: this.config.functionCalling,
      }
    );

    // Build execution context
    const execContext = this.buildExecutionContext(context);

    const result = await reactExecutor.execute({
      ...execContext,
      task: userMessage,
      conversationHistory: this.buildConversationHistory(context, memoryContext),
      tools: this.getEnabledTools(),
      scratchpad: new Map(),
    });

    // Extract tools used
    const toolsUsed = result.steps
      .filter(s => s.action)
      .map(s => s.action!.tool);

    // Extract recommendations from steps
    const recommendations = this.extractRecommendationsFromSteps(result, context);

    return {
      content: result.finalAnswer ?? this.getFallbackResponse(),
      metadata: {
        model: this.config.provider,
        provider: this.config.provider,
        tokens: result.totalTokensUsed,
        latencyMs: Date.now() - startTime,
        safetyFiltered: false,
        adaptationsApplied: this.getAdaptations(context),
        toolsUsed: Array.from(new Set(toolsUsed)),
        reactSteps: result.totalIterations,
        memoriesRecalled: (memoryContext.match(/^-/gm) || []).length,
        autonomousActionsSubmitted: 0,
      },
      recommendations,
      reactTrace: result,
    };
  }

  /**
   * Execute simple completion without ReAct loop
   */
  protected async executeSimpleCompletion(
    userMessage: string,
    context: AgenticContext,
    memoryContext: string,
    startTime: number
  ): Promise<AgenticResponse> {
    const messages = this.buildConversationHistory(context, memoryContext);
    messages.push({ role: 'user', content: userMessage });

    const result = await this.llm.complete(messages, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      metadata: {
        tenantId: context.tenantId,
        userId: context.userId,
        agentType: this.agentType,
        sessionId: context.sessionId,
      },
    });

    return {
      content: result.content,
      metadata: {
        model: result.model,
        provider: result.provider,
        tokens: result.usage.totalTokens,
        latencyMs: Date.now() - startTime,
        safetyFiltered: false,
        adaptationsApplied: this.getAdaptations(context),
        toolsUsed: [],
        reactSteps: 0,
        memoriesRecalled: (memoryContext.match(/^-/gm) || []).length,
        autonomousActionsSubmitted: 0,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Build the conversation history with system prompt and memory
   */
  protected buildConversationHistory(
    context: AgenticContext,
    memoryContext: string
  ): LLMMessage[] {
    const adaptations = this.getAdaptations(context);

    // Build system prompt with adaptations
    let systemPrompt = this.promptBuilder.build(this.systemPrompt, {
      gradeLevel: context.learnerProfile?.gradeLevel,
      age: context.learnerProfile?.age,
      neurodiversityProfile: context.learnerProfile?.neurodiversityProfile,
      accommodations: context.learnerProfile?.accommodations,
      adaptations,
    });

    // Add memory context if available
    if (memoryContext) {
      systemPrompt += `\n\n${memoryContext}`;
    }

    // Add tool descriptions if using tools
    if (this.config.enableReActLoop && this.getEnabledTools().length > 0) {
      systemPrompt += '\n\n## Available Tools\n';
      for (const tool of this.getEnabledTools()) {
        systemPrompt += `- ${tool.name}: ${tool.description}\n`;
      }
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    if (context.conversationHistory) {
      messages.push(...context.conversationHistory);
    }

    return messages;
  }

  /**
   * Build execution context for tools
   */
  protected buildExecutionContext(context: AgenticContext): ExecutionContext {
    return {
      tenantId: context.tenantId,
      userId: context.userId,
      userRole: 'LEARNER',
      learnerId: context.learnerId,
      sessionId: context.sessionId,
      agentId: this.agentType,
      autonomyLevel: 'SUPERVISED',
      consents: ['DATA_PROCESSING', 'AI_PERSONALIZATION'],
      requestId: context.requestId,
    };
  }

  /**
   * Extract recommendations from ReAct steps
   */
  protected extractRecommendationsFromSteps(
    result: ReActResult,
    _context: AgenticContext
  ): AgentRecommendation[] {
    const recommendations: AgentRecommendation[] = [];

    // Look for recommendation patterns in tool results
    for (const step of result.steps) {
      if (step.observation?.includes('recommend')) {
        recommendations.push({
          id: randomUUID(),
          agentType: this.agentType as any,
          type: 'TOOL_RECOMMENDATION',
          description: step.observation,
          confidence: 0.8,
          priority: 1,
          rationale: step.thought ?? 'Based on tool execution',
        });
      }
    }

    return recommendations;
  }

  /**
   * Process recommendations and submit autonomous decisions
   */
  protected async processRecommendations(
    recommendations: AgentRecommendation[],
    context: AgenticContext
  ): Promise<DecisionExecutionResult[]> {
    if (!this.autonomousExecutor || !context.learnerId) {
      return [];
    }

    const results: DecisionExecutionResult[] = [];

    for (const rec of recommendations) {
      if (rec.confidence < 0.7) continue;

      const decision = createDecision({
        tenantId: context.tenantId,
        learnerId: context.learnerId,
        agentType: this.agentType,
        category: this.mapRecommendationToCategory(rec.type),
        action: {
          type: rec.type,
          parameters: { recommendationId: rec.id },
          description: rec.description,
        },
        rationale: rec.rationale,
        expectedOutcome: rec.description,
        context: {
          sessionId: context.sessionId,
          currentActivity: context.sessionState?.currentActivity,
          triggerEvent: 'AGENT_RECOMMENDATION',
        },
        riskContext: {
          hasIEP: context.learnerProfile?.hasIEP,
          has504: context.learnerProfile?.has504,
          emotionalState: context.sessionState?.emotionalState,
        },
      });

      const result = await this.autonomousExecutor.submitDecision(decision);
      results.push(result);
    }

    return results;
  }

  /**
   * Map recommendation type to action category
   */
  protected mapRecommendationToCategory(type: string): ActionCategory {
    const mapping: Record<string, ActionCategory> = {
      CONTENT_RECOMMENDATION: 'CONTENT_SELECTION',
      DIFFICULTY_CHANGE: 'DIFFICULTY_ADJUSTMENT',
      INTERVENTION: 'INTERVENTION',
      ASSESSMENT: 'ASSESSMENT',
    };
    return mapping[type] ?? 'CONTENT_SELECTION';
  }

  /**
   * Store interaction in memory
   */
  protected async storeInteractionMemory(
    userMessage: string,
    response: string,
    context: AgenticContext
  ): Promise<void> {
    if (!this.memoryStore || !context.learnerId) return;

    // Store as episodic memory
    await this.memoryStore.store({
      tenantId: context.tenantId,
      learnerId: context.learnerId,
      type: 'EPISODIC',
      content: `User: ${userMessage}\nAssistant: ${response.slice(0, 500)}`,
      metadata: {
        source: 'CONVERSATION',
        sessionId: context.sessionId,
        agentType: this.agentType,
        topic: context.sessionState?.recentTopics?.[0],
        emotionalContext: context.sessionState?.emotionalState,
        tags: [],
      },
    });
  }

  /**
   * Get adaptations based on learner profile
   */
  protected getAdaptations(context: AgenticContext): string[] {
    const adaptations: string[] = [];
    const profile = context.learnerProfile;

    if (!profile) return adaptations;

    // Grade-appropriate language
    if (profile.gradeLevel <= 2) {
      adaptations.push('use_simple_words', 'short_sentences');
    } else if (profile.gradeLevel <= 5) {
      adaptations.push('use_clear_language');
    }

    // Neurodiversity adaptations
    if (profile.neurodiversityProfile?.adhd) {
      adaptations.push('chunked_information', 'bullet_points', 'engagement_hooks');
    }
    if (profile.neurodiversityProfile?.dyslexia) {
      adaptations.push('avoid_complex_words', 'short_paragraphs');
    }
    if (profile.neurodiversityProfile?.autism) {
      adaptations.push('literal_language', 'avoid_idioms', 'explicit_instructions');
    }

    // Accommodation-based adaptations
    if (profile.accommodations?.includes('extended_time')) {
      adaptations.push('patient_pacing');
    }
    if (profile.accommodations?.includes('text_to_speech')) {
      adaptations.push('clear_pronunciation_friendly');
    }

    return adaptations;
  }

  /**
   * Get fallback response when output is blocked or unavailable
   */
  protected getFallbackResponse(): string {
    return "I'm sorry, I couldn't provide a helpful response. Let's try a different approach!";
  }

  /**
   * Get error response for unhandled errors
   */
  protected getErrorResponse(): string {
    return "I'm having some trouble right now. Could you try asking that again?";
  }

  /**
   * Create a safe response when input is blocked
   */
  protected createSafeResponse(
    reason: string,
    context: AgenticContext,
    startTime: number
  ): AgenticResponse {
    const safeResponses: Record<string, string> = {
      inappropriate_content: "Let's focus on our learning! What would you like to work on?",
      personal_information: "I noticed you might be sharing personal information. Let's keep our conversation about learning!",
      off_topic: "That's an interesting topic, but let's get back to our lesson. What can I help you with?",
      harmful_content: "I'm here to help you learn! What subject would you like to explore?",
    };

    return {
      content: safeResponses[reason] ?? this.getFallbackResponse(),
      metadata: {
        model: 'safety-filter',
        provider: 'internal',
        tokens: 0,
        latencyMs: Date.now() - startTime,
        safetyFiltered: true,
        adaptationsApplied: [],
        toolsUsed: [],
        reactSteps: 0,
        memoriesRecalled: 0,
        autonomousActionsSubmitted: 0,
      },
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default AgenticBaseAgent;
