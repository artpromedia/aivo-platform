import { randomUUID } from 'node:crypto';

import { getProvider } from '../providers/index.js';
import type { AgentConfigRegistry } from '../registry/AgentConfigRegistry.js';
import { evaluateSafety, type SafetyResult, type SafetyStatus } from '../safety/SafetyAgent.js';
import { estimateCostUsd } from '../telemetry/cost.js';
import type { TelemetryStore } from '../telemetry/index.js';
import type { AgentType } from '../types/agentConfig.js';

export interface AiCallContext {
  tenantId: string;
  agentType: AgentType;
  userRole?: string | undefined;
  learnerId?: string | undefined;
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

// Unified AI call pipeline. Future extensions: support message arrays, tool calls, and streaming.
export async function runAiCall(
  registry: AgentConfigRegistry,
  context: AiCallContext,
  input: AiCallInput,
  telemetryStore?: TelemetryStore
): Promise<AiCallOutput> {
  const requestId =
    (context.metadata as { correlationId?: string } | undefined)?.correlationId ?? randomUUID();
  const startedAt = new Date();
  const rolloutKey = context.learnerId ?? context.tenantId ?? 'default-rollout-key';
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
    if (telemetryStore) {
      const elapsedMs = completedAt.getTime() - startedAt.getTime();
      const errorMessage = truncateErrorMessage(err);
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
