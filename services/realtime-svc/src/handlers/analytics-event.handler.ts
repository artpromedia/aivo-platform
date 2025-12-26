/**
 * Analytics Event Handler
 *
 * Handles analytics events and alerts from external services
 * and broadcasts them to connected teacher dashboards.
 */

import type { WebSocketGateway } from '../gateway/websocket.gateway.js';
import { RedisKeys } from '../redis/index.js';
import type { MessageBrokerService } from '../services/message-broker.service.js';
import {
  WSEventType,
  type LiveAnalyticsUpdate,
  type LiveAlert,
  type AlertType,
  type AlertSeverity,
} from '../types.js';

interface AnalyticsEvent {
  type: 'update' | 'alert';
  classId: string;
  metric?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface AlertEvent {
  id: string;
  type: string;
  severity: string;
  studentId: string;
  studentName: string;
  classId: string;
  message: string;
  timestamp: string;
}

/**
 * Analytics Event Handler
 */
export class AnalyticsEventHandler {
  private unsubscribeAnalytics: (() => void) | null = null;
  private unsubscribeAlerts: (() => void) | null = null;

  constructor(
    private readonly messageBroker: MessageBrokerService,
    private readonly gateway: WebSocketGateway
  ) {}

  /**
   * Initialize the handler
   */
  initialize(): void {
    // Subscribe to analytics channel
    this.unsubscribeAnalytics = this.messageBroker.subscribe(
      RedisKeys.channels.analytics,
      (message) => {
        this.handleAnalyticsEvent(message as AnalyticsEvent);
      }
    );

    // Subscribe to alerts channel
    this.unsubscribeAlerts = this.messageBroker.subscribe(RedisKeys.channels.alerts, (message) => {
      this.handleAlertEvent(message as AlertEvent);
    });

    console.log('[AnalyticsEventHandler] Initialized');
  }

  /**
   * Handle incoming analytics events
   */
  private handleAnalyticsEvent(event: AnalyticsEvent): void {
    const { type, classId, metric, data, timestamp } = event;

    if (type === 'update' && metric) {
      const update: LiveAnalyticsUpdate = {
        classId,
        metric,
        value: data.value as number,
        previousValue: data.previousValue as number | undefined,
        timestamp: new Date(timestamp),
      };

      // Broadcast to the analytics room for this class
      const analyticsRoom = `analytics:${classId}`;
      this.gateway.broadcastToRoom(analyticsRoom, WSEventType.ANALYTICS_UPDATE, update);

      console.log(`[AnalyticsEventHandler] Broadcasted ${metric} update for class ${classId}`);
    }
  }

  /**
   * Handle incoming alert events
   */
  private handleAlertEvent(event: AlertEvent): void {
    // Skip acknowledgment events
    if ((event as unknown as { type: string }).type === 'acknowledge') {
      return;
    }

    const alert: LiveAlert = {
      id: event.id,
      type: this.mapAlertType(event.type),
      severity: this.mapAlertSeverity(event.severity),
      studentId: event.studentId,
      studentName: event.studentName,
      message: event.message,
      timestamp: new Date(event.timestamp),
      acknowledged: false,
    };

    // Broadcast to the analytics room for this class
    const analyticsRoom = `analytics:${event.classId}`;
    this.gateway.broadcastToRoom(analyticsRoom, WSEventType.ANALYTICS_ALERT, alert);

    console.log(
      `[AnalyticsEventHandler] Broadcasted ${event.type} alert for student ${event.studentId}`
    );
  }

  /**
   * Map string to AlertType
   */
  private mapAlertType(type: string): AlertType {
    switch (type) {
      case 'engagement':
        return 'engagement';
      case 'frustration':
        return 'frustration';
      case 'milestone':
        return 'milestone';
      case 'help_needed':
        return 'help_needed';
      default:
        return 'engagement';
    }
  }

  /**
   * Map string to AlertSeverity
   */
  private mapAlertSeverity(severity: string): AlertSeverity {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Shutdown the handler
   */
  shutdown(): void {
    if (this.unsubscribeAnalytics) {
      this.unsubscribeAnalytics();
      this.unsubscribeAnalytics = null;
    }

    if (this.unsubscribeAlerts) {
      this.unsubscribeAlerts();
      this.unsubscribeAlerts = null;
    }

    console.log('[AnalyticsEventHandler] Shutdown');
  }
}
