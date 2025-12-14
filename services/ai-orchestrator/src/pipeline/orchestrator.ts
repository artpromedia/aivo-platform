/**
 * AI Orchestration Pipeline
 *
 * Central entry point for ALL AI calls in the Aivo platform.
 * Implements an enterprise-grade, safety-first pipeline:
 *
 * 1. buildPromptContext - Gather learner/tenant context
 * 2. safetyPreFilter - Pre-process user input for safety
 * 3. selectProvider - Choose LLM provider/model
 * 4. invokeProvider - Make the actual LLM call with failover
 * 5. safetyPostFilter - Inspect/transform LLM output
 * 6. recordUsage - Log tokens & costs per tenant
 * 7. maybeLogIncident - Log any safety/quality incidents
 *
 * All agents (Baseline, Virtual Brain, Tutor, Focus, Homework Helper, Insights)
 * MUST call via orchestrateAiRequest().
 */

import { randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

import type { AiLoggingService, LogAiCallInput } from '../logging/index.js';
import type {
  ProviderRouter,
  getProviderRouter,
  type ProviderInvocationResult,
} from '../providers/providerRouter.js';
import type { AgentConfigRegistry } from '../registry/AgentConfigRegistry.js';
import { safetyPostFilter } from '../safety/postFilter.js';
import { safetyPreFilter } from '../safety/preFilter.js';
import { getSafeResponse } from '../safety/safetyResponses.js';
import type { TelemetryStore } from '../telemetry/index.js';
import type { AgentType, ProviderType } from '../types/agentConfig.js';
import type {
  AiRequest,
  AiResponse,
  IncidentInput,
  SafetyAction,
  AiAgentType,
  AiProvider,
} from '../types/aiRequest.js';

// ────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────────────────────────────────

export interface OrchestratorConfig {
  /** Whether to enable safety pre-filter */
  enablePreFilter: boolean;

  /** Whether to enable safety post-filter */
  enablePostFilter: boolean;

  /** Whether to log incidents automatically */
  enableIncidentLogging: boolean;

  /** Whether to log usage/telemetry */
  enableUsageLogging: boolean;

  /** Maximum prompt length (characters) */
  maxPromptLength: number;

  /** Request timeout (ms) */
  requestTimeoutMs: number;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  enablePreFilter: true,
  enablePostFilter: true,
  enableIncidentLogging: true,
  enableUsageLogging: true,
  maxPromptLength: 50000,
  requestTimeoutMs: 60000,
};

// ────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR DEPENDENCIES
// ────────────────────────────────────────────────────────────────────────────

export interface OrchestratorDependencies {
  providerRouter: ProviderRouter;
  configRegistry?: AgentConfigRegistry;
  telemetryStore?: TelemetryStore;
  loggingService?: AiLoggingService;
  usageTracker?: UsageTracker;
  pool?: Pool;
}

/**
 * Usage tracker interface for per-tenant token/cost tracking.
 */
export interface UsageTracker {
  recordUsage(record: UsageRecord): Promise<void>;
  getDailyUsage(tenantId: string, date: string): Promise<UsageRecord[]>;
}

export interface UsageRecord {
  tenantId: string;
  date: string;
  provider: AiProvider;
  model: string;
  agentType: AiAgentType;
  tokensInput: number;
  tokensOutput: number;
  estimatedCostCents: number;
  callCount: number;
}

// ────────────────────────────────────────────────────────────────────────────
// PROMPT CONTEXT
// ────────────────────────────────────────────────────────────────────────────

/**
 * Context gathered for building prompts.
 */
interface PromptContext {
  tenantId: string;
  learnerId?: string;
  agentType: AiAgentType;
  locale: string;
  gradeBand?: string;
  subject?: string;
  systemPrompt?: string;
  conversationHistory?: { role: string; content: string }[];
}

/**
 * Build context for prompt generation.
 * This gathers relevant tenant and learner information.
 */
function buildPromptContext(request: AiRequest): PromptContext {
  return {
    tenantId: request.tenantId,
    learnerId: request.learnerId,
    agentType: request.agentType,
    locale: request.locale,
    gradeBand: request.meta?.gradeBand,
    subject: request.meta?.subject,
    conversationHistory: request.meta?.conversationHistory?.map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
  };
}

/**
 * Render a prompt from context and user input.
 */
function renderPrompt(context: PromptContext, userInput: string): string {
  const parts: string[] = [];

  // Add system context based on agent type
  const systemPrompt = getSystemPromptForAgent(context.agentType, context);
  if (systemPrompt) {
    parts.push(systemPrompt);
  }

  // Add conversation history if available
  if (context.conversationHistory && context.conversationHistory.length > 0) {
    for (const turn of context.conversationHistory) {
      parts.push(`${turn.role}: ${turn.content}`);
    }
  }

  // Add current user input
  parts.push(`user: ${userInput}`);

  return parts.join('\n\n');
}

/**
 * Get system prompt for an agent type.
 */
function getSystemPromptForAgent(agentType: AiAgentType, context: PromptContext): string {
  const gradeBandContext = context.gradeBand ? ` for grade band ${context.gradeBand}` : '';
  const subjectContext = context.subject ? ` in ${context.subject}` : '';

  switch (agentType) {
    case 'HOMEWORK_HELPER':
      return `You are a helpful educational assistant${gradeBandContext}${subjectContext}. 
Your role is to guide students through problems step by step, helping them understand concepts.
CRITICAL RULES:
- NEVER give direct answers to homework problems
- Always ask guiding questions to help the student think through the problem
- Provide hints and scaffolding, not solutions
- Encourage the student to show their work
- Use age-appropriate language${gradeBandContext}
- If the student is stuck, break the problem into smaller steps`;

    case 'TUTOR':
      return `You are a patient, encouraging tutor${gradeBandContext}${subjectContext}.
Your goal is to help the student learn and understand concepts deeply.
Guidelines:
- Adapt your explanations to the student's level
- Use examples and analogies appropriate${gradeBandContext}
- Celebrate progress and effort
- Never make the student feel bad about mistakes
- If the student seems frustrated, offer encouragement`;

    case 'BASELINE':
      return `You are an assessment assistant helping evaluate student knowledge${gradeBandContext}${subjectContext}.
Generate clear, unambiguous questions appropriate for the grade level.
Ensure questions test understanding, not just memorization.`;

    case 'FOCUS':
      return `You are a supportive focus and mindfulness assistant for students${gradeBandContext}.
Help students with:
- Brief mindfulness exercises
- Focus techniques
- Managing distractions
- Taking productive breaks
Keep responses short and actionable. Never provide medical advice or diagnoses.`;

    case 'INSIGHTS':
      return `You are an educational analytics assistant.
Provide data-driven insights about learning patterns and progress.
Focus on actionable recommendations for educators.
Never make diagnostic claims about learning disabilities.`;

    default:
      return `You are a helpful educational assistant${gradeBandContext}${subjectContext}.
Provide accurate, age-appropriate, and helpful responses.
Never provide medical diagnoses or crisis counseling.`;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR FUNCTION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Main entry point for ALL AI calls.
 *
 * Every agent in the Aivo platform MUST use this function.
 * It ensures safety, logging, and proper multi-tenant handling.
 *
 * @param request - The AI request
 * @param deps - Dependencies (provider router, logging, etc.)
 * @param config - Orchestrator configuration
 * @returns AI response with safety actions and metadata
 */
export async function orchestrateAiRequest(
  request: AiRequest,
  deps: OrchestratorDependencies,
  config: Partial<OrchestratorConfig> = {}
): Promise<AiResponse> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const requestId = request.correlationId ?? randomUUID();
  const startTime = Date.now();

  const safetyActions: SafetyAction[] = [];
  const incidents: IncidentInput[] = [];

  // ─── Step 1: Build Prompt Context ────────────────────────────────────────
  const context = buildPromptContext(request);

  // ─── Step 2: Safety Pre-Filter ───────────────────────────────────────────
  let processedInput = request.input;
  let redactedInput: string | undefined;
  let wasBlockedByPreFilter = false;
  let preFilterSafeResponse: string | undefined;

  if (fullConfig.enablePreFilter) {
    const preFilterResult = safetyPreFilter(request);

    if (preFilterResult.action === 'BLOCK') {
      // Blocked by pre-filter - return safe response immediately
      wasBlockedByPreFilter = true;
      preFilterSafeResponse = preFilterResult.safeResponse;

      // Determine which safety action was applied
      const blockFlag = preFilterResult.flags[0];
      if (blockFlag) {
        const actionMap: Record<string, SafetyAction> = {
          SELF_HARM: 'BLOCKED_SELF_HARM',
          ABUSE_DETECTED: 'BLOCKED_ABUSE',
          VIOLENCE_DETECTED: 'BLOCKED_VIOLENCE',
          EXPLICIT_CONTENT: 'BLOCKED_EXPLICIT_CONTENT',
        };
        const action = actionMap[blockFlag.category] ?? 'BLOCKED_DISALLOWED_CONTENT';
        safetyActions.push(action);
      }

      // Log incident
      if (preFilterResult.incident) {
        incidents.push(preFilterResult.incident);
      }
    } else if (preFilterResult.action === 'REDACT') {
      // Input was redacted
      processedInput = preFilterResult.sanitizedInput;
      redactedInput = preFilterResult.sanitizedInput;
      safetyActions.push('REDACTED_PII');

      if (preFilterResult.incident) {
        incidents.push(preFilterResult.incident);
      }
    } else {
      // Allowed through
      processedInput = preFilterResult.sanitizedInput;

      // Check for low-severity flags that don't block
      if (preFilterResult.incident) {
        incidents.push(preFilterResult.incident);
      }
    }
  }

  // If blocked by pre-filter, return immediately with safe response
  if (wasBlockedByPreFilter) {
    const response: AiResponse = {
      output: preFilterSafeResponse ?? getSafeResponse('OTHER', request.locale),
      redactedInput: '[BLOCKED]',
      provider: 'MOCK',
      model: 'safety-filter',
      tokensInput: 0,
      tokensOutput: 0,
      costCents: 0,
      safetyActions,
      wasBlocked: true,
      failoverOccurred: false,
      requestId,
      latencyMs: Date.now() - startTime,
    };

    // Log incidents
    await logIncidents(incidents, deps, requestId);

    return response;
  }

  // ─── Step 3: Select Provider ─────────────────────────────────────────────
  const providerRouter = deps.providerRouter ?? getProviderRouter();
  const selection = providerRouter.selectProvider(request);

  // ─── Step 4: Render Prompt & Invoke Provider ─────────────────────────────
  const prompt = renderPrompt(context, processedInput);

  // Validate prompt length
  if (prompt.length > fullConfig.maxPromptLength) {
    throw new Error(
      `Prompt exceeds maximum length: ${prompt.length} > ${fullConfig.maxPromptLength}`
    );
  }

  let providerResult: ProviderInvocationResult;

  try {
    providerResult = await providerRouter.invokeWithFailover(request, prompt, {
      modelName: selection.model,
      metadata: {
        tenantId: request.tenantId,
        agentType: request.agentType,
        requestId,
      },
    });
  } catch (error) {
    // All providers failed
    const errorResponse: AiResponse = {
      output: "I'm sorry, I'm having trouble right now. Please try again in a moment.",
      provider: selection.provider,
      model: selection.model,
      tokensInput: 0,
      tokensOutput: 0,
      costCents: 0,
      safetyActions: [],
      wasBlocked: false,
      failoverOccurred: true,
      requestId,
      latencyMs: Date.now() - startTime,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };

    // Log AI failure incident
    incidents.push({
      tenantId: request.tenantId,
      learnerId: request.learnerId,
      userId: request.userId,
      agentType: request.agentType,
      severity: 'HIGH',
      category: 'AI_FAILURE',
      inputSummary: summarizeForLog(request.input, 100),
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: selection.provider,
        model: selection.model,
      },
    });

    await logIncidents(incidents, deps, requestId);

    return errorResponse;
  }

  if (!providerResult.success || !providerResult.response) {
    // Provider failed but didn't throw
    const errorResponse: AiResponse = {
      output: "I'm sorry, I'm having trouble right now. Please try again in a moment.",
      provider: providerResult.provider,
      model: providerResult.model,
      tokensInput: 0,
      tokensOutput: 0,
      costCents: 0,
      safetyActions: [],
      wasBlocked: false,
      failoverOccurred: providerResult.failoverOccurred,
      originalProvider: providerResult.originalProvider,
      requestId,
      latencyMs: providerResult.latencyMs,
      metadata: {
        error: providerResult.error?.message ?? 'Provider failed',
      },
    };

    return errorResponse;
  }

  // ─── Step 5: Safety Post-Filter ──────────────────────────────────────────
  let finalOutput = providerResult.response.content;
  let wasBlockedByPostFilter = false;

  if (fullConfig.enablePostFilter) {
    const postFilterResult = safetyPostFilter(request, providerResult.response.content);

    if (postFilterResult.action === 'BLOCK' || postFilterResult.action === 'TRANSFORM') {
      finalOutput = postFilterResult.finalOutput;
      safetyActions.push(...postFilterResult.safetyActions);
      incidents.push(...postFilterResult.incidents);

      if (postFilterResult.action === 'BLOCK') {
        wasBlockedByPostFilter = true;
      }
    }
  }

  // ─── Step 6: Calculate Usage & Cost ──────────────────────────────────────
  const tokensInput = providerResult.response.tokensPrompt ?? 0;
  const tokensOutput = providerResult.response.tokensCompletion ?? 0;
  const costCents = providerRouter.estimateCost(
    providerResult.provider,
    providerResult.model,
    tokensInput,
    tokensOutput
  );

  // Record usage if tracker is available
  if (deps.usageTracker && fullConfig.enableUsageLogging) {
    const today = new Date().toISOString().split('T')[0];
    await deps.usageTracker.recordUsage({
      tenantId: request.tenantId,
      date: today,
      provider: providerResult.provider,
      model: providerResult.model,
      agentType: request.agentType,
      tokensInput,
      tokensOutput,
      estimatedCostCents: costCents,
      callCount: 1,
    });
  }

  // ─── Step 7: Log Incidents ───────────────────────────────────────────────
  if (fullConfig.enableIncidentLogging && incidents.length > 0) {
    await logIncidents(incidents, deps, requestId);
  }

  // ─── Step 8: Log to Telemetry/Logging Service ────────────────────────────
  if (deps.loggingService && fullConfig.enableUsageLogging) {
    const logInput: LogAiCallInput = {
      tenantId: request.tenantId,
      agentType: request.agentType as AgentType,
      userId: request.userId,
      learnerId: request.learnerId,
      sessionId: request.sessionId,
      useCase: request.meta?.useCase,
      modelName: providerResult.model,
      provider: providerResult.provider,
      version: '1.0',
      requestId,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      latencyMs: Date.now() - startTime,
      inputTokens: tokensInput,
      outputTokens: tokensOutput,
      promptSummary: summarizeForLog(prompt, 200),
      responseSummary: summarizeForLog(finalOutput, 200),
      safetyLabel: getSafetyLabel(safetyActions),
      safetyMetadata: safetyActions.length > 0 ? { actions: safetyActions } : undefined,
      costCentsEstimate: costCents,
      status: 'SUCCESS',
    };

    // Fire and forget
    deps.loggingService.logAndEvaluateAsync(logInput);
  }

  // ─── Build & Return Response ─────────────────────────────────────────────
  const response: AiResponse = {
    output: finalOutput,
    redactedInput,
    provider: providerResult.provider,
    model: providerResult.model,
    tokensInput,
    tokensOutput,
    costCents,
    safetyActions,
    wasBlocked: wasBlockedByPreFilter || wasBlockedByPostFilter,
    failoverOccurred: providerResult.failoverOccurred,
    originalProvider: providerResult.originalProvider,
    requestId,
    latencyMs: Date.now() - startTime,
    metadata: {
      agentType: request.agentType,
      tenantId: request.tenantId,
    },
  };

  return response;
}

// ────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Log incidents to the logging service.
 */
async function logIncidents(
  incidents: IncidentInput[],
  deps: OrchestratorDependencies,
  _requestId: string
): Promise<void> {
  if (!deps.loggingService || incidents.length === 0) {
    return;
  }

  // For now, we log incidents through the standard logging flow
  // A dedicated incident service could be added later
  for (const incident of incidents) {
    console.log(
      JSON.stringify({
        event: 'ai_incident',
        ...incident,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

/**
 * Summarize text for logging (no PII).
 */
function summarizeForLog(text: string, maxLength: number): string {
  // Remove potential PII
  let summary = text;
  summary = summary.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, '[EMAIL]');
  summary = summary.replace(
    /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    '[PHONE]'
  );

  // Count lines and characters
  const lines = summary.split('\n').length;
  const length = summary.length;

  // Take first portion
  const preview = summary.slice(0, maxLength - 30);

  return `[${lines} lines, ${length} chars] ${preview}${length > maxLength - 30 ? '...' : ''}`;
}

/**
 * Get safety label from actions.
 */
function getSafetyLabel(actions: SafetyAction[]): 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' {
  if (actions.length === 0) {
    return 'SAFE';
  }

  const highSeverityActions: SafetyAction[] = [
    'BLOCKED_SELF_HARM',
    'BLOCKED_EXPLICIT_CONTENT',
    'BLOCKED_ABUSE',
    'BLOCKED_VIOLENCE',
  ];

  const mediumSeverityActions: SafetyAction[] = [
    'BLOCKED_HOMEWORK_ANSWER',
    'BLOCKED_DIAGNOSIS_ATTEMPT',
    'BLOCKED_MEDICAL_DIAGNOSIS',
    'MODIFIED_UNSAFE_RESPONSE',
  ];

  if (actions.some((a) => highSeverityActions.includes(a))) {
    return 'HIGH';
  }

  if (actions.some((a) => mediumSeverityActions.includes(a))) {
    return 'MEDIUM';
  }

  return 'LOW';
}

// ────────────────────────────────────────────────────────────────────────────
// CONVENIENCE FUNCTIONS FOR SPECIFIC AGENTS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Convenience function for Homework Helper calls.
 */
export async function orchestrateHomeworkHelper(
  tenantId: string,
  input: string,
  meta: {
    learnerId?: string;
    userId?: string;
    subject?: string;
    gradeBand?: 'K5' | 'G6_8' | 'G9_12';
    sessionId?: string;
    correlationId?: string;
  },
  deps: OrchestratorDependencies
): Promise<AiResponse> {
  const request: AiRequest = {
    tenantId,
    userId: meta.userId,
    learnerId: meta.learnerId,
    agentType: 'HOMEWORK_HELPER',
    locale: 'en-US',
    input,
    sessionId: meta.sessionId,
    correlationId: meta.correlationId,
    meta: {
      subject: meta.subject,
      gradeBand: meta.gradeBand,
      useCase: 'HOMEWORK_SCAFFOLDING',
    },
  };

  return orchestrateAiRequest(request, deps);
}

/**
 * Convenience function for Tutor calls.
 */
export async function orchestrateTutor(
  tenantId: string,
  input: string,
  meta: {
    learnerId?: string;
    userId?: string;
    subject?: string;
    gradeBand?: 'K5' | 'G6_8' | 'G9_12';
    sessionId?: string;
    correlationId?: string;
    conversationHistory?: { role: 'user' | 'assistant' | 'system'; content: string }[];
  },
  deps: OrchestratorDependencies
): Promise<AiResponse> {
  const request: AiRequest = {
    tenantId,
    userId: meta.userId,
    learnerId: meta.learnerId,
    agentType: 'TUTOR',
    locale: 'en-US',
    input,
    sessionId: meta.sessionId,
    correlationId: meta.correlationId,
    meta: {
      subject: meta.subject,
      gradeBand: meta.gradeBand,
      useCase: 'TUTORING_SESSION',
      conversationHistory: meta.conversationHistory,
    },
  };

  return orchestrateAiRequest(request, deps);
}

/**
 * Convenience function for Baseline assessment calls.
 */
export async function orchestrateBaseline(
  tenantId: string,
  input: string,
  meta: {
    learnerId?: string;
    subject?: string;
    gradeBand?: 'K5' | 'G6_8' | 'G9_12';
    correlationId?: string;
  },
  deps: OrchestratorDependencies
): Promise<AiResponse> {
  const request: AiRequest = {
    tenantId,
    learnerId: meta.learnerId,
    agentType: 'BASELINE',
    locale: 'en-US',
    input,
    correlationId: meta.correlationId,
    meta: {
      subject: meta.subject,
      gradeBand: meta.gradeBand,
      useCase: 'BASELINE_ASSESSMENT',
    },
  };

  return orchestrateAiRequest(request, deps);
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export {
  buildPromptContext,
  renderPrompt,
  getSystemPromptForAgent,
  summarizeForLog,
  getSafetyLabel,
};

export type { PromptContext, OrchestratorConfig, OrchestratorDependencies };
