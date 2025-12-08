import { config } from '../config.js';
import type {
  AiOrchestratorRequest,
  AiOrchestratorResponse,
  HomeworkHelperRequest,
  StepFeedbackRequest,
  StepFeedbackResponse,
} from '../types/aiContract.js';

/**
 * Client for communicating with the AI Orchestrator service.
 */
export class AiOrchestratorClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = config.aiOrchestratorUrl;
    this.apiKey = config.aiOrchestratorApiKey;
  }

  /**
   * Generate scaffolding steps for a homework problem.
   */
  async generateScaffolding(
    tenantId: string,
    request: HomeworkHelperRequest,
    metadata?: { correlationId?: string; learnerId?: string; sessionId?: string }
  ): Promise<AiOrchestratorResponse> {
    const payload: AiOrchestratorRequest = {
      tenantId,
      agentType: 'HOMEWORK_HELPER',
      payload: request,
      metadata,
    };

    const response = await fetch(`${this.baseUrl}/internal/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': this.apiKey,
      } as HeadersInit,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI Orchestrator error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<AiOrchestratorResponse>;
  }

  /**
   * Generate feedback for a learner's step response.
   */
  async generateFeedback(
    tenantId: string,
    request: StepFeedbackRequest,
    metadata?: { correlationId?: string; learnerId?: string; sessionId?: string }
  ): Promise<{ content: StepFeedbackResponse; tokensUsed: number }> {
    const payload = {
      tenantId,
      agentType: 'HOMEWORK_HELPER',
      payload: {
        ...request,
        mode: 'feedback', // Signal to agent this is a feedback request
      },
      metadata,
    };

    const response = await fetch(`${this.baseUrl}/internal/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': this.apiKey,
      } as HeadersInit,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI Orchestrator error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<{ content: StepFeedbackResponse; tokensUsed: number }>;
  }
}

// Singleton instance
export const aiOrchestratorClient = new AiOrchestratorClient();
