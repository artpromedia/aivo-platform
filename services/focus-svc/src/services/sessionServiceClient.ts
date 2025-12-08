import { config } from '../config.js';
import type { EmitEventRequest, EmitEventResponse, FocusEventType } from '../types/session.js';

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
   * Emit a focus-related event to a session.
   */
  async emitEvent(
    sessionId: string,
    eventType: FocusEventType,
    metadata?: Record<string, unknown>
  ): Promise<EmitEventResponse> {
    const payload: EmitEventRequest = {
      eventType,
      metadata,
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
   * Get recent events for a session (for focus analysis).
   */
  async getRecentEvents(
    sessionId: string,
    eventTypes?: string[],
    limit = 50
  ): Promise<{ events: EmitEventResponse[] }> {
    const params = new URLSearchParams();
    if (eventTypes?.length) {
      params.set('eventTypes', eventTypes.join(','));
    }
    params.set('limit', limit.toString());

    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/events?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': this.apiKey,
      } as HeadersInit,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Session Service error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<{ events: EmitEventResponse[] }>;
  }
}

// Singleton instance
export const sessionServiceClient = new SessionServiceClient();
