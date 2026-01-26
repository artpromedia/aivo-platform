/**
 * AI Orchestrator Client
 *
 * HTTP client for communicating with the AI Orchestrator service.
 * Provides a clean interface for making AI generation requests.
 */

import { getServiceUrl } from '@aivo/ts-api-utils/service-urls';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AICompletionRequest {
  messages: AIMessage[];
  options?: AICompletionOptions;
  context: AIRequestContext;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stream?: boolean;
  timeout?: number;
}

export interface AIRequestContext {
  tenantId: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  agentType?: string;
}

export interface AICompletionResponse {
  content: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  latencyMs: number;
  cached: boolean;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
}

export interface AIClientConfig {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// CLIENT CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class AIOrchestratorclient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(config?: AIClientConfig) {
    this.baseUrl = config?.baseUrl ?? getServiceUrl('aiOrchestrator');
    this.timeout = config?.timeout ?? 120000; // 2 minutes default
    this.maxRetries = config?.maxRetries ?? 3;
    this.retryDelay = config?.retryDelay ?? 1000;
  }

  /**
   * Make a completion request to the AI Orchestrator
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const url = `${this.baseUrl}/generation/complete`;

    const body = {
      messages: request.messages,
      options: {
        temperature: request.options?.temperature ?? 0.7,
        maxTokens: request.options?.maxTokens ?? 4000,
        model: request.options?.model,
      },
      metadata: {
        tenantId: request.context.tenantId,
        userId: request.context.userId,
        sessionId: request.context.sessionId,
        agentType: request.context.agentType ?? 'CONTENT_AUTHORING',
      },
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          request.options?.timeout ?? this.timeout
        );

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': request.context.tenantId,
            'x-user-id': request.context.userId ?? '',
            'x-correlation-id': request.context.correlationId ?? crypto.randomUUID(),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new AIClientError(
            `AI request failed: ${response.status} ${response.statusText}`,
            response.status,
            errorData
          );
        }

        const data = await response.json();
        return {
          content: data.content ?? data.result?.content ?? '',
          model: data.model ?? data.result?.model ?? 'unknown',
          provider: data.provider ?? data.result?.provider ?? 'unknown',
          usage: data.usage ?? data.result?.usage ?? {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
          finishReason: data.finishReason ?? 'stop',
          latencyMs: data.latencyMs ?? 0,
          cached: data.cached ?? false,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx)
        if (error instanceof AIClientError && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        // Don't retry on abort (timeout)
        if (lastError.name === 'AbortError') {
          throw new AIClientError('AI request timed out', 408, {});
        }

        // Wait before retry
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError ?? new Error('AI request failed after retries');
  }

  /**
   * Make a streaming completion request
   */
  async *stream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const url = `${this.baseUrl}/generation/stream`;

    const body = {
      messages: request.messages,
      options: {
        temperature: request.options?.temperature ?? 0.7,
        maxTokens: request.options?.maxTokens ?? 4000,
        model: request.options?.model,
        stream: true,
      },
      metadata: {
        tenantId: request.context.tenantId,
        userId: request.context.userId,
        sessionId: request.context.sessionId,
        agentType: request.context.agentType ?? 'CONTENT_AUTHORING',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': request.context.tenantId,
        'x-user-id': request.context.userId ?? '',
        'x-correlation-id': request.context.correlationId ?? crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AIClientError(
        `AI stream request failed: ${response.status}`,
        response.status,
        errorData
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          yield { content: '', done: true };
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }
            try {
              const parsed = JSON.parse(data);
              yield { content: parsed.content ?? parsed.delta ?? '', done: false };
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Generate a lesson using the AI Orchestrator's lesson generation endpoint
   */
  async generateLesson(request: {
    topic: string;
    subject: string;
    gradeLevel: string;
    standards?: string[];
    learningObjectives?: string[];
    includeActivities?: boolean;
    includeAssessment?: boolean;
    contentStyle?: string;
    difficultyLevel?: string;
    context: AIRequestContext;
  }): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}/generation/lessons`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': request.context.tenantId,
        'x-user-id': request.context.userId ?? '',
      },
      body: JSON.stringify({
        topic: request.topic,
        subject: request.subject,
        gradeLevel: request.gradeLevel,
        standards: request.standards,
        learningObjectives: request.learningObjectives,
        includeActivities: request.includeActivities,
        includeAssessment: request.includeAssessment,
        contentStyle: request.contentStyle,
        difficultyLevel: request.difficultyLevel,
        tenantId: request.context.tenantId,
        userId: request.context.userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AIClientError(
        `Lesson generation failed: ${response.status}`,
        response.status,
        errorData
      );
    }

    return response.json();
  }

  /**
   * Generate questions using the AI Orchestrator's question generation endpoint
   */
  async generateQuestions(request: {
    content: string;
    subject: string;
    gradeLevel: string;
    questionTypes: string[];
    count: number;
    difficulty?: string;
    bloomsLevels?: string[];
    context: AIRequestContext;
  }): Promise<Record<string, unknown>> {
    const url = `${this.baseUrl}/generation/questions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': request.context.tenantId,
        'x-user-id': request.context.userId ?? '',
      },
      body: JSON.stringify({
        content: request.content,
        subject: request.subject,
        gradeLevel: request.gradeLevel,
        questionTypes: request.questionTypes,
        count: request.count,
        difficulty: request.difficulty,
        bloomsLevels: request.bloomsLevels,
        tenantId: request.context.tenantId,
        userId: request.context.userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AIClientError(
        `Question generation failed: ${response.status}`,
        response.status,
        errorData
      );
    }

    return response.json();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class AIClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly data: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIClientError';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

let clientInstance: AIOrchestratorclient | null = null;

export function getAIClient(): AIOrchestratorclient {
  if (!clientInstance) {
    clientInstance = new AIOrchestratorclient();
  }
  return clientInstance;
}

export function createAIClient(config?: AIClientConfig): AIOrchestratorclient {
  return new AIOrchestratorclient(config);
}
