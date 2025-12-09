import { randomUUID } from 'node:crypto';

import type { AiLoggingService, LogAiCallInput, SafetyLabel } from '../logging/index.js';
import { getProvider } from '../providers/index.js';
import type { AgentConfigRegistry } from '../registry/AgentConfigRegistry.js';
import { evaluateSafety, type SafetyResult, type SafetyStatus } from '../safety/SafetyAgent.js';
import { estimateCostUsd } from '../telemetry/cost.js';
import type { TelemetryStore } from '../telemetry/index.js';
import type { AgentType, ProviderType } from '../types/agentConfig.js';

export interface AiCallContext {
  tenantId: string;
  agentType: AgentType;
  userRole?: string | undefined;
  userId?: string | undefined;
  learnerId?: string | undefined;
  sessionId?: string | undefined;
  useCase?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface AiCallInput {
  payload?: unknown;
  rawPrompt?: string;
  metadata?: Record<string, unknown>;
}

export interface AiCallOutput {
  content: string;
  tokensUsed: number;
  safetyStatus: SafetyStatus;
  safetyReason?: string | undefined;
  error?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface AiCallPipelineOptions {
  telemetryStore?: TelemetryStore;
  loggingService?: AiLoggingService;
}

// Unified AI call pipeline. Future extensions: support message arrays, tool calls, and streaming.
export async function runAiCall(
  registry: AgentConfigRegistry,
  context: AiCallContext,
  input: AiCallInput,
  telemetryStore?: TelemetryStore,
  loggingService?: AiLoggingService
): Promise<AiCallOutput> {
  const requestId =
    (context.metadata as { correlationId?: string } | undefined)?.correlationId ?? randomUUID();
  const startedAt = new Date();
  const rolloutKey = context.learnerId ?? context.tenantId;
  const config = await registry.getConfigForRollout(context.agentType, rolloutKey);
  const provider = getProvider(config.provider);

  const prompt =
    input.rawPrompt ??
    renderPrompt(config.promptTemplate, {
      payload: input.payload,
      tenantId: context.tenantId,
      agentType: context.agentType,
      learnerId: context.learnerId,
      userRole: context.userRole,
    });

  let providerResult;
  let safetyResult: SafetyResult;
  let completedAt: Date = new Date();
  try {
    providerResult = await provider.generateCompletion({
      prompt,
      promptTemplate: config.promptTemplate,
      modelName: config.modelName,
      hyperparameters: config.hyperparameters,
      metadata: {
        ...context.metadata,
        ...input.metadata,
        agentType: context.agentType,
        configVersion: config.version,
        configId: config.id,
      },
    });

    safetyResult = evaluateSafety(context, {
      content: providerResult.content,
    });
    completedAt = new Date();
  } catch (err: unknown) {
    completedAt = new Date();
    const elapsedMs = completedAt.getTime() - startedAt.getTime();
    const errorMessage = truncateErrorMessage(err);

    if (telemetryStore) {
      const logEntry = {
        id: randomUUID(),
        tenantId: context.tenantId,
        agentType: context.agentType,
        modelName: config.modelName,
        provider: config.provider,
        version: config.version,
        requestId,
        startedAt,
        completedAt,
        latencyMs: elapsedMs,
        tokensPrompt: 0,
        tokensCompletion: 0,
        estimatedCostUsd: 0,
        safetyStatus: 'NEEDS_REVIEW' as const,
        status: 'ERROR' as const,
        errorCode: err instanceof Error ? err.name : 'UnknownError',
        errorMessage,
      };
      void telemetryStore.record(logEntry).catch((logErr: unknown) => {
        console.error('Failed to record AI call telemetry (error path)', logErr);
      });
    }

    // Also log errors to the extended logging service for incident tracking
    if (loggingService) {
      const logInput: LogAiCallInput = {
        tenantId: context.tenantId,
        agentType: context.agentType,
        userId: context.userId,
        learnerId: context.learnerId,
        sessionId: context.sessionId,
        useCase: context.useCase,
        modelName: config.modelName,
        provider: config.provider,
        version: config.version,
        requestId,
        startedAt,
        completedAt,
        latencyMs: elapsedMs,
        inputTokens: 0,
        outputTokens: 0,
        safetyLabel: 'MEDIUM', // Errors get MEDIUM for review
        costCentsEstimate: 0,
        status: 'ERROR',
        errorCode: err instanceof Error ? err.name : 'UnknownError',
        errorMessage,
      };
      loggingService.logAndEvaluateAsync(logInput);
    }

    throw err;
  }

  const content = safetyResult.transformedContent ?? providerResult.content;
  const tokensPrompt = providerResult.tokensPrompt ?? providerResult.tokensUsed;
  const tokensCompletion = providerResult.tokensCompletion ?? 0;
  const tokensUsed = providerResult.tokensUsed;
  const latencyMs = completedAt.getTime() - startedAt.getTime();
  const estimatedCostUsd = estimateCostUsd(
    config.provider,
    config.modelName,
    tokensPrompt + tokensCompletion
  );

  if (telemetryStore) {
    const logEntry = {
      id: randomUUID(),
      tenantId: context.tenantId,
      agentType: context.agentType,
      modelName: config.modelName,
      provider: config.provider,
      version: config.version,
      requestId,
      startedAt,
      completedAt,
      latencyMs,
      tokensPrompt,
      tokensCompletion,
      estimatedCostUsd,
      safetyStatus: safetyResult.status,
      status: 'SUCCESS' as const,
      errorCode: undefined,
      errorMessage: undefined,
    };
    void telemetryStore.record(logEntry).catch((err: unknown) => {
      console.error('Failed to record AI call telemetry', err);
    });
  }

  // Log to ai_call_logs with extended fields and evaluate incident rules
  // This runs async (fire-and-forget) to not block the response
  if (loggingService) {
    const costCentsEstimate = Math.round(estimatedCostUsd * 100);
    const logInput: LogAiCallInput = {
      tenantId: context.tenantId,
      agentType: context.agentType,
      userId: context.userId,
      learnerId: context.learnerId,
      sessionId: context.sessionId,
      useCase: context.useCase,
      modelName: config.modelName,
      provider: config.provider,
      version: config.version,
      requestId,
      startedAt,
      completedAt,
      latencyMs,
      inputTokens: tokensPrompt,
      outputTokens: tokensCompletion,
      promptSummary: summarizePrompt(prompt),
      responseSummary: summarizeResponse(content),
      safetyLabel: safetyResult.label,
      safetyMetadata: safetyResult.reason ? { reason: safetyResult.reason } : undefined,
      costCentsEstimate,
      status: 'SUCCESS',
    };
    loggingService.logAndEvaluateAsync(logInput);
  }

  const output: AiCallOutput = {
    content,
    tokensUsed,
    safetyStatus: safetyResult.status,
    safetyReason: safetyResult.reason,
    metadata: {
      ...providerResult.metadata,
      configVersion: config.version,
      configId: config.id,
      tenantId: context.tenantId,
      agentType: context.agentType,
    },
  };

  logCall(context, output, providerResult.content);

  return output;
}

function renderPrompt(template: string, context: Record<string, unknown>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => {
    const value = context[key];
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  });
}

function logCall(context: AiCallContext, output: AiCallOutput, rawContent: string) {
  const preview = rawContent.slice(0, 120);
  console.log(
    JSON.stringify({
      event: 'ai_call',
      agentType: context.agentType,
      tenantId: context.tenantId,
      safetyStatus: output.safetyStatus,
      safetyReason: output.safetyReason,
      tokensUsed: output.tokensUsed,
      contentPreview: `${preview}${rawContent.length > preview.length ? '…' : ''}`,
    })
  );
}

function truncateErrorMessage(err: unknown, max = 256): string {
  const text = err instanceof Error ? err.message : String(err);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

/**
 * Summarize a prompt for logging. MUST NOT contain PII.
 * Returns a redacted structural summary of the prompt.
 */
function summarizePrompt(prompt: string, maxLength = 200): string {
  // Count lines and characters for structural summary
  const lines = prompt.split('\n').length;
  const length = prompt.length;

  // Extract first line as a preview (often contains the intent)
  const firstLine = prompt.split('\n')[0]?.slice(0, 80) ?? '';

  // Build a structural summary
  const summary = `[${lines} lines, ${length} chars] ${firstLine}`;

  return summary.length > maxLength ? summary.slice(0, maxLength - 3) + '...' : summary;
}

/**
 * Summarize a response for logging. MUST NOT contain PII.
 * Returns a redacted structural summary of the response.
 */
function summarizeResponse(response: string, maxLength = 200): string {
  const length = response.length;

  // Detect response type heuristically
  let responseType = 'text';
  if (response.trim().startsWith('{') || response.trim().startsWith('[')) {
    responseType = 'json';
  } else if (response.includes('```')) {
    responseType = 'code-block';
  } else if (response.split('\n').filter((l) => l.startsWith('-') || /^\d+\./.exec(l)).length > 2) {
    responseType = 'list';
  }

  // Build structural summary
  const preview = response.slice(0, 50).replace(/\n/g, ' ');
  const summary = `[${responseType}, ${length} chars] ${preview}`;

  return summary.length > maxLength ? summary.slice(0, maxLength - 3) + '...' : summary;
}
