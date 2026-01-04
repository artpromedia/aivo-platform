/**
 * Classroom Monitor Handler
 *
 * WebSocket event handler for classroom monitoring with:
 * - Subscribe to classroom monitoring
 * - Student status updates (from learner apps)
 * - Alert notifications to teachers
 * - Real-time classroom metrics streaming
 */

import type { WebSocketGateway } from '../gateway/websocket.gateway.js';
import { RedisKeys } from '../redis/index.js';
import type { ClassroomMonitorService } from '../services/classroom-monitor.service.js';
import type { MessageBrokerService } from '../services/message-broker.service.js';

/**
 * Student activity update event (from learner app)
 */
interface StudentActivityEvent {
  type: 'activity_update';
  classroomId: string;
  studentId: string;
  studentName: string;
  currentActivity?: string;
  currentActivityType?: 'lesson' | 'assessment' | 'practice' | 'reading';
  progress: number;
  focusState: 'focused' | 'idle' | 'struggling' | 'frustrated' | 'help_requested' | 'off_task';
  timeOnTask: number;
  errorCount: number;
  successRate: number;
  idleTime: number;
  metadata?: {
    currentSkill?: string;
    questionNumber?: number;
    totalQuestions?: number;
    attemptsOnCurrentQuestion?: number;
    deviceType?: string;
  };
  timestamp: string;
}

/**
 * Classroom monitoring subscription payload
 */
export interface MonitorSubscribePayload {
  classroomId: string;
}

/**
 * Classroom Monitor Handler
 */
export class ClassroomMonitorHandler {
  private unsubscribeActivity: (() => void) | null = null;

  constructor(
    private readonly monitorService: ClassroomMonitorService,
    private readonly messageBroker: MessageBrokerService,
    private readonly gateway: WebSocketGateway
  ) {}

  /**
   * Initialize the handler
   */
  initialize(): void {
    // Subscribe to student activity updates from Redis
    this.unsubscribeActivity = this.messageBroker.subscribe(
      RedisKeys.channels.session,
      (message) => {
        this.handleStudentActivity(message as StudentActivityEvent);
      }
    );

    console.log('[ClassroomMonitorHandler] Initialized');
  }

  /**
   * Handle student activity update
   */
  private async handleStudentActivity(event: StudentActivityEvent): Promise<void> {
    if (event.type !== 'activity_update') {
      return;
    }

    const { classroomId, timestamp, ...statusData } = event;

    // Update student status in monitor service
    await this.monitorService.updateStudentStatus(classroomId, {
      ...statusData,
      lastInteraction: new Date(timestamp),
      isActive: true,
    });

    // Get updated classroom state
    const { metrics, students } = await this.monitorService.getClassroomState(classroomId);

    // Get active alerts
    const alerts = await this.monitorService.getActiveAlerts(classroomId);

    // Broadcast to monitor room
    const monitorRoom = `monitor:${classroomId}`;

    // Send student status update
    this.gateway.broadcastToRoom(monitorRoom, 'monitor:student_update', {
      studentId: statusData.studentId,
      studentName: statusData.studentName,
      focusState: statusData.focusState,
      progress: statusData.progress,
      currentActivity: statusData.currentActivity,
      timestamp: new Date().toISOString(),
    });

    // Send updated metrics
    this.gateway.broadcastToRoom(monitorRoom, 'monitor:metrics_update', {
      classroomId,
      metrics,
      timestamp: new Date().toISOString(),
    });

    // Send new alerts if any
    if (alerts.length > 0) {
      const latestAlert = alerts[0]; // Most recent
      this.gateway.broadcastToRoom(monitorRoom, 'monitor:alert', {
        classroomId,
        alert: latestAlert,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `[ClassroomMonitorHandler] Processed activity update for student ${statusData.studentId}`
    );
  }

  /**
   * Handle teacher subscribing to classroom monitoring
   */
  async handleMonitorSubscribe(
    teacherId: string,
    payload: MonitorSubscribePayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { classroomId } = payload;

      // Get current classroom state
      const { metrics, students } = await this.monitorService.getClassroomState(classroomId);
      const alerts = await this.monitorService.getActiveAlerts(classroomId);

      console.log(`[ClassroomMonitorHandler] Teacher ${teacherId} subscribed to ${classroomId}`);

      // Return initial state
      return {
        success: true,
        // Note: The actual data will be sent separately through WebSocket events
        // This is just an acknowledgment
      };
    } catch (error) {
      console.error('[ClassroomMonitorHandler] Subscribe error:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Handle alert acknowledgment
   */
  async handleAlertAcknowledge(
    teacherId: string,
    classroomId: string,
    alertId: string
  ): Promise<{ success: boolean }> {
    try {
      await this.monitorService.acknowledgeAlert(classroomId, alertId);

      // Broadcast acknowledgment to other teachers in the monitor room
      const monitorRoom = `monitor:${classroomId}`;
      this.gateway.broadcastToRoom(monitorRoom, 'monitor:alert_acknowledged', {
        classroomId,
        alertId,
        acknowledgedBy: teacherId,
        timestamp: new Date().toISOString(),
      });

      console.log(`[ClassroomMonitorHandler] Alert ${alertId} acknowledged by ${teacherId}`);
      return { success: true };
    } catch (error) {
      console.error('[ClassroomMonitorHandler] Alert acknowledge error:', error);
      return { success: false };
    }
  }

  /**
   * Shutdown the handler
   */
  shutdown(): void {
    if (this.unsubscribeActivity) {
      this.unsubscribeActivity();
      this.unsubscribeActivity = null;
    }

    console.log('[ClassroomMonitorHandler] Shutdown');
  }
}
