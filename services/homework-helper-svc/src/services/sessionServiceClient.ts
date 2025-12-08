import { config } from '../config.js';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  EmitEventRequest,
  EmitEventResponse,
  EndSessionRequest,
  EndSessionResponse,
  HomeworkEventType,
} from '../types/session.js';

/**
 * Client for communicating with the Session Service.
 */
export class SessionServiceClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = config.sessionSvcUrl;
    this.apiKey = config.sessionSvcApiKey;
  }

  /**
   * Create a new homework session.
   */
  async createSession(
    tenantId: string,
    learnerId: string,
    origin: 'HOMEWORK_HELPER' | 'MOBILE_LEARNER' | 'WEB_LEARNER' = 'HOMEWORK_HELPER',
    metadata?: Record<string, unknown>
  ): Promise<CreateSessionResponse> {
    const payload: CreateSessionRequest = {
      tenantId,
      learnerId,
      sessionType: 'HOMEWORK',
      origin,
      metadataJson: metadata,
    };

    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': this.apiKey,
      } as HeadersInit,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Session Service error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<CreateSessionResponse>;
  }

  /**
   * Emit an event to an existing session.
   */
  async emitEvent(
    sessionId: string,
    eventType: HomeworkEventType,
    payloadJson?: Record<string, unknown>
  ): Promise<EmitEventResponse> {
    const payload: EmitEventRequest = {
      sessionId,
      eventType,
      payloadJson,
    };

    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': this.apiKey,
      } as HeadersInit,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Session Service error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<EmitEventResponse>;
  }

  /**
   * End a session with optional summary.
   */
  async endSession(
    sessionId: string,
    summary?: Record<string, unknown>
  ): Promise<EndSessionResponse> {
    const payload: EndSessionRequest = {
      sessionId,
      summaryJson: summary,
    };

    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': this.apiKey,
      } as HeadersInit,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Session Service error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<EndSessionResponse>;
  }
}

// Singleton instance
export const sessionServiceClient = new SessionServiceClient();
