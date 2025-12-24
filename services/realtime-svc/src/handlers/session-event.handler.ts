/**
 * Session Event Handler
 *
 * Handles session events from external services and broadcasts
 * them to connected clients for real-time dashboard updates.
 */

import { RedisKeys } from '../redis/index.js';
import { MessageBrokerService } from '../services/message-broker.service.js';
import { WebSocketGateway } from '../gateway/websocket.gateway.js';
import { WSEventType, LiveSessionUpdate } from '../types.js';

interface SessionEvent {
  type: 'update' | 'activity' | 'progress' | 'complete';
  sessionId: string;
  studentId: string;
  studentName?: string;
  classId: string;
  data: {
    status?: string;
    progress?: number;
    currentActivity?: string;
    currentSkill?: string;
    score?: number;
  };
  timestamp: string;
}

/**
 * Session Event Handler
 */
export class SessionEventHandler {
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly messageBroker: MessageBrokerService,
    private readonly gateway: WebSocketGateway
  ) {}

  /**
   * Initialize the handler
   */
  initialize(): void {
    this.unsubscribe = this.messageBroker.subscribe(
      RedisKeys.channels.session,
      (message) => this.handleSessionEvent(message as SessionEvent)
    );

    console.log('[SessionEventHandler] Initialized');
  }

  /**
   * Handle incoming session events
   */
  private handleSessionEvent(event: SessionEvent): void {
    const { type, sessionId, studentId, studentName, classId, data, timestamp } = event;

    const update: LiveSessionUpdate = {
      sessionId,
      studentId,
      studentName: studentName || 'Unknown Student',
      status: this.mapStatus(type, data.status),
      progress: data.progress || 0,
      currentActivity: data.currentActivity,
      currentSkill: data.currentSkill,
      score: data.score,
      timestamp: new Date(timestamp),
    };

    // Determine the event type to emit
    let eventType: WSEventType;
    switch (type) {
      case 'activity':
        eventType = WSEventType.SESSION_ACTIVITY;
        break;
      case 'progress':
        eventType = WSEventType.SESSION_PROGRESS;
        break;
      case 'complete':
        eventType = WSEventType.SESSION_COMPLETE;
        break;
      default:
        eventType = WSEventType.SESSION_UPDATE;
    }

    // Broadcast to the analytics room for this class
    const analyticsRoom = `analytics:${classId}`;
    this.gateway.broadcastToRoom(analyticsRoom, eventType, update);

    console.log(`[SessionEventHandler] Broadcasted ${type} event for session ${sessionId}`);
  }

  /**
   * Map event type and status to session status
   */
  private mapStatus(
    type: string,
    status?: string
  ): 'started' | 'progress' | 'completed' | 'paused' {
    if (type === 'complete') {
      return 'completed';
    }

    switch (status) {
      case 'active':
        return 'started';
      case 'paused':
        return 'paused';
      case 'completed':
        return 'completed';
      default:
        return 'progress';
    }
  }

  /**
   * Shutdown the handler
   */
  shutdown(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    console.log('[SessionEventHandler] Shutdown');
  }
}
