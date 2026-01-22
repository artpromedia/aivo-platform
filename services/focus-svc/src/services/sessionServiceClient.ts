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
   * Supports two calling conventions:
   * 1. emitEvent(sessionId, eventType, metadata)
   * 2. emitEvent({ sessionId, eventType, payload })
   */
  async emitEvent(
    sessionIdOrParams: string | { sessionId: string; eventType: FocusEventType; payload?: Record<string, unknown> },
    eventType?: FocusEventType,
    metadata?: Record<string, unknown>
  ): Promise<EmitEventResponse> {
    let sid: string;
    let evtType: FocusEventType;
    let evtMetadata: Record<string, unknown> | undefined;

    if (typeof sessionIdOrParams === 'object') {
      // Object-based calling convention
      sid = sessionIdOrParams.sessionId;
      evtType = sessionIdOrParams.eventType;
      evtMetadata = sessionIdOrParams.payload;
    } else {
      // Traditional calling convention
      sid = sessionIdOrParams;
      evtType = eventType!;
      evtMetadata = metadata;
    }

    const payload: EmitEventRequest = {
      eventType: evtType,
      metadata: evtMetadata,
    };

    const response = await fetch(`${this.baseUrl}/sessions/${sid}/events`, {
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

  /**
   * Get events for a learner with filtering.
   */
  async getEvents(params: {
    learnerId: string;
    eventType?: string;
    limit?: number;
    sinceDate?: string;
  }): Promise<Array<{ payload: Record<string, unknown>; timestamp: string }>> {
    const queryParams = new URLSearchParams();
    queryParams.set('learnerId', params.learnerId);
    if (params.eventType) queryParams.set('eventType', params.eventType);
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.sinceDate) queryParams.set('since', params.sinceDate);

    const response = await fetch(`${this.baseUrl}/events?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': this.apiKey,
      } as HeadersInit,
    });

    if (!response.ok) {
      // Return empty array on error for graceful degradation
      return [];
    }

    const result = await response.json() as { events?: Array<{ payload: Record<string, unknown>; timestamp: string }> };
    return result.events ?? [];
  }
}

// Singleton instance
export const sessionServiceClient = new SessionServiceClient();
