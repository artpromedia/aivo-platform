/**
 * Alert Rules Engine
 *
 * Configurable alert rules for detecting at-risk students with:
 * - Idle time threshold detection
 * - Error rate monitoring
 * - Frustration signal detection
 * - Alert priority levels
 * - Alert aggregation to prevent spam
 */

import { nanoid } from 'nanoid';

import type { StudentActivityStatus } from '../services/classroom-monitor.service.js';

/**
 * Alert types
 */
export type AlertType =
  | 'idle' // Student inactive for too long
  | 'high_error_rate' // Too many errors
  | 'frustration' // Signs of frustration
  | 'help_requested' // Student asked for help
  | 'off_task' // Student navigated away
  | 'struggling' // Slow progress, repeated attempts
  | 'disengaged'; // Combination of signals indicating disengagement

/**
 * Alert priority levels
 */
export type AlertPriority = 'info' | 'warning' | 'urgent';

/**
 * Alert structure
 */
export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  studentId: string;
  studentName: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  acknowledged?: boolean;
  actionSuggestions?: string[];
}

/**
 * Alert rule configuration
 */
export interface AlertRuleConfig {
  enabled: boolean;
  idleTimeThreshold: number; // seconds
  highErrorRateThreshold: number; // percentage
  lowSuccessRateThreshold: number; // percentage
  frustrationAttemptThreshold: number; // attempts on same question
  aggregationWindow: number; // seconds - prevent duplicate alerts
}

/**
 * Default alert rule configuration
 */
const DEFAULT_CONFIG: AlertRuleConfig = {
  enabled: true,
  idleTimeThreshold: 300, // 5 minutes
  highErrorRateThreshold: 60, // 60% errors
  lowSuccessRateThreshold: 30, // 30% success rate
  frustrationAttemptThreshold: 5, // 5 attempts on same question
  aggregationWindow: 600, // 10 minutes
};

/**
 * Alert Rules Engine
 */
export class AlertRulesEngine {
  private config: AlertRuleConfig;
  private recentAlerts: Map<string, Map<AlertType, Date>> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(config?: Partial<AlertRuleConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Periodically clean up old alert records
    this.cleanupInterval = setInterval(() => {
      this.cleanupRecentAlerts();
    }, 60000); // Every minute
  }

  /**
   * Evaluate student status and generate alerts
   */
  async evaluateStudent(
    status: StudentActivityStatus,
    classroomId: string
  ): Promise<Alert[]> {
    if (!this.config.enabled) {
      return [];
    }

    const alerts: Alert[] = [];

    // Check idle time
    if (status.idleTime >= this.config.idleTimeThreshold && status.isActive) {
      const alert = this.createIdleAlert(status);
      if (this.shouldEmitAlert(status.studentId, alert.type)) {
        alerts.push(alert);
        this.recordAlert(status.studentId, alert.type);
      }
    }

    // Check high error rate
    if (status.errorCount > 0 && status.successRate < this.config.lowSuccessRateThreshold) {
      const alert = this.createHighErrorRateAlert(status);
      if (this.shouldEmitAlert(status.studentId, alert.type)) {
        alerts.push(alert);
        this.recordAlert(status.studentId, alert.type);
      }
    }

    // Check frustration signals
    if (
      status.metadata?.attemptsOnCurrentQuestion &&
      status.metadata.attemptsOnCurrentQuestion >= this.config.frustrationAttemptThreshold
    ) {
      const alert = this.createFrustrationAlert(status);
      if (this.shouldEmitAlert(status.studentId, alert.type)) {
        alerts.push(alert);
        this.recordAlert(status.studentId, alert.type);
      }
    }

    // Check help requested
    if (status.focusState === 'help_requested') {
      const alert = this.createHelpRequestedAlert(status);
      if (this.shouldEmitAlert(status.studentId, alert.type)) {
        alerts.push(alert);
        this.recordAlert(status.studentId, alert.type);
      }
    }

    // Check off-task
    if (status.focusState === 'off_task') {
      const alert = this.createOffTaskAlert(status);
      if (this.shouldEmitAlert(status.studentId, alert.type)) {
        alerts.push(alert);
        this.recordAlert(status.studentId, alert.type);
      }
    }

    // Check struggling
    if (status.focusState === 'struggling') {
      const alert = this.createStrugglingAlert(status);
      if (this.shouldEmitAlert(status.studentId, alert.type)) {
        alerts.push(alert);
        this.recordAlert(status.studentId, alert.type);
      }
    }

    // Check disengagement (composite signal)
    if (this.detectDisengagement(status)) {
      const alert = this.createDisengagementAlert(status);
      if (this.shouldEmitAlert(status.studentId, alert.type)) {
        alerts.push(alert);
        this.recordAlert(status.studentId, alert.type);
      }
    }

    return alerts;
  }

  /**
   * Update alert rule configuration
   */
  updateConfig(config: Partial<AlertRuleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertRuleConfig {
    return { ...this.config };
  }

  /**
   * Shutdown the engine
   */
  shutdown(): void {
    clearInterval(this.cleanupInterval);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Create idle alert
   */
  private createIdleAlert(status: StudentActivityStatus): Alert {
    const minutes = Math.floor(status.idleTime / 60);
    return {
      id: nanoid(12),
      type: 'idle',
      priority: status.idleTime >= this.config.idleTimeThreshold * 2 ? 'urgent' : 'warning',
      studentId: status.studentId,
      studentName: status.studentName,
      message: `No activity for ${minutes} minutes`,
      details: {
        idleTime: status.idleTime,
        lastActivity: status.currentActivity,
      },
      timestamp: new Date(),
      actionSuggestions: [
        'Send encouragement message',
        'Check if student needs help',
        'Suggest a break',
      ],
    };
  }

  /**
   * Create high error rate alert
   */
  private createHighErrorRateAlert(status: StudentActivityStatus): Alert {
    return {
      id: nanoid(12),
      type: 'high_error_rate',
      priority: status.successRate < 20 ? 'urgent' : 'warning',
      studentId: status.studentId,
      studentName: status.studentName,
      message: `Low success rate: ${Math.round(status.successRate)}%`,
      details: {
        successRate: status.successRate,
        errorCount: status.errorCount,
        currentActivity: status.currentActivity,
        currentSkill: status.metadata?.currentSkill,
      },
      timestamp: new Date(),
      actionSuggestions: [
        'Provide additional scaffolding',
        'Review prerequisite concepts',
        'Start 1-on-1 session',
      ],
    };
  }

  /**
   * Create frustration alert
   */
  private createFrustrationAlert(status: StudentActivityStatus): Alert {
    const attempts = status.metadata?.attemptsOnCurrentQuestion || 0;
    return {
      id: nanoid(12),
      type: 'frustration',
      priority: 'urgent',
      studentId: status.studentId,
      studentName: status.studentName,
      message: `Stuck on same question (${attempts} attempts)`,
      details: {
        attempts,
        questionNumber: status.metadata?.questionNumber,
        currentSkill: status.metadata?.currentSkill,
      },
      timestamp: new Date(),
      actionSuggestions: [
        'Provide hint or worked example',
        'Suggest break and return later',
        'Assign simpler practice problems',
      ],
    };
  }

  /**
   * Create help requested alert
   */
  private createHelpRequestedAlert(status: StudentActivityStatus): Alert {
    return {
      id: nanoid(12),
      type: 'help_requested',
      priority: 'urgent',
      studentId: status.studentId,
      studentName: status.studentName,
      message: 'Student requested help',
      details: {
        currentActivity: status.currentActivity,
        currentSkill: status.metadata?.currentSkill,
        progress: status.progress,
      },
      timestamp: new Date(),
      actionSuggestions: ['Start chat session', 'Assign peer tutor', 'Schedule intervention'],
    };
  }

  /**
   * Create off-task alert
   */
  private createOffTaskAlert(status: StudentActivityStatus): Alert {
    return {
      id: nanoid(12),
      type: 'off_task',
      priority: 'warning',
      studentId: status.studentId,
      studentName: status.studentName,
      message: 'Student appears off-task',
      details: {
        lastActivity: status.currentActivity,
        timeOnTask: status.timeOnTask,
      },
      timestamp: new Date(),
      actionSuggestions: [
        'Send gentle reminder',
        'Check technical issues',
        'Review activity relevance',
      ],
    };
  }

  /**
   * Create struggling alert
   */
  private createStrugglingAlert(status: StudentActivityStatus): Alert {
    return {
      id: nanoid(12),
      type: 'struggling',
      priority: 'warning',
      studentId: status.studentId,
      studentName: status.studentName,
      message: 'Student is struggling with current activity',
      details: {
        successRate: status.successRate,
        errorCount: status.errorCount,
        currentActivity: status.currentActivity,
        currentSkill: status.metadata?.currentSkill,
      },
      timestamp: new Date(),
      actionSuggestions: [
        'Provide scaffolding',
        'Review concepts',
        'Assign prerequisite practice',
      ],
    };
  }

  /**
   * Create disengagement alert
   */
  private createDisengagementAlert(status: StudentActivityStatus): Alert {
    return {
      id: nanoid(12),
      type: 'disengaged',
      priority: 'urgent',
      studentId: status.studentId,
      studentName: status.studentName,
      message: 'Student showing signs of disengagement',
      details: {
        idleTime: status.idleTime,
        successRate: status.successRate,
        timeOnTask: status.timeOnTask,
        focusState: status.focusState,
      },
      timestamp: new Date(),
      actionSuggestions: [
        'Check in with student',
        'Modify activity difficulty',
        'Provide encouragement',
        'Consider break',
      ],
    };
  }

  /**
   * Detect disengagement based on multiple signals
   */
  private detectDisengagement(status: StudentActivityStatus): boolean {
    // Disengagement is indicated by combination of:
    // - Low success rate
    // - Some idle time (but not completely idle)
    // - Low time on task relative to progress
    return (
      status.successRate < 40 &&
      status.idleTime > 120 &&
      status.idleTime < this.config.idleTimeThreshold &&
      status.timeOnTask > 300 &&
      status.progress < 30
    );
  }

  /**
   * Check if alert should be emitted (aggregation)
   */
  private shouldEmitAlert(studentId: string, alertType: AlertType): boolean {
    const studentAlerts = this.recentAlerts.get(studentId);
    if (!studentAlerts) {
      return true;
    }

    const lastAlertTime = studentAlerts.get(alertType);
    if (!lastAlertTime) {
      return true;
    }

    const timeSinceLastAlert = (Date.now() - lastAlertTime.getTime()) / 1000;
    return timeSinceLastAlert >= this.config.aggregationWindow;
  }

  /**
   * Record that an alert was emitted
   */
  private recordAlert(studentId: string, alertType: AlertType): void {
    let studentAlerts = this.recentAlerts.get(studentId);
    if (!studentAlerts) {
      studentAlerts = new Map();
      this.recentAlerts.set(studentId, studentAlerts);
    }
    studentAlerts.set(alertType, new Date());
  }

  /**
   * Clean up old alert records
   */
  private cleanupRecentAlerts(): void {
    const cutoff = Date.now() - this.config.aggregationWindow * 1000;

    for (const [studentId, studentAlerts] of this.recentAlerts.entries()) {
      for (const [alertType, timestamp] of studentAlerts.entries()) {
        if (timestamp.getTime() < cutoff) {
          studentAlerts.delete(alertType);
        }
      }

      if (studentAlerts.size === 0) {
        this.recentAlerts.delete(studentId);
      }
    }
  }
}
