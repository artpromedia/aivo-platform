/**
 * Classroom Monitor Service
 *
 * Real-time aggregation and monitoring of student activity in a classroom with:
 * - Active student tracking
 * - Current activities and progress
 * - Focus state monitoring
 * - At-risk detection (struggling, disengaged, frustrated)
 * - Alert generation for teacher intervention
 * - FERPA-compliant real-time status only (no recording)
 */

import { nanoid } from 'nanoid';

import { logger } from '../logger.js';
import { getRedisClient } from '../redis/index.js';
import type { AlertRulesEngine } from '../engine/alert-rules.js';

/**
 * Student focus state
 */
export type FocusState =
  | 'focused' // Actively engaged, making progress
  | 'idle' // No activity for some time
  | 'struggling' // Multiple errors, slow progress
  | 'frustrated' // Repeated failures, quick navigation away
  | 'help_requested' // Student explicitly asked for help
  | 'off_task'; // Navigated away from learning activity

/**
 * Student activity status
 */
export interface StudentActivityStatus {
  studentId: string;
  studentName: string;
  currentActivity?: string;
  currentActivityType?: 'lesson' | 'assessment' | 'practice' | 'reading';
  progress: number; // 0-100
  focusState: FocusState;
  timeOnTask: number; // seconds
  lastInteraction: Date;
  errorCount: number;
  successRate: number; // 0-100
  idleTime: number; // seconds since last interaction
  isActive: boolean;
  metadata?: {
    currentSkill?: string;
    questionNumber?: number;
    totalQuestions?: number;
    attemptsOnCurrentQuestion?: number;
    deviceType?: string;
  };
}

/**
 * Classroom aggregate metrics
 */
export interface ClassroomMetrics {
  classroomId: string;
  totalStudents: number;
  activeStudents: number;
  averageProgress: number;
  focusDistribution: Record<FocusState, number>;
  atRiskCount: number;
  helpRequestedCount: number;
  lastUpdated: Date;
}

/**
 * Intervention record
 */
export interface InterventionRecord {
  id: string;
  classroomId: string;
  studentId: string;
  teacherId: string;
  type: 'encouragement' | 'help' | 'break_suggestion' | 'redirect' | 'chat' | 'custom';
  message?: string;
  timestamp: Date;
  triggeredByAlert?: string;
}

/**
 * Engagement pattern for heatmap
 */
export interface EngagementPattern {
  timestamp: Date;
  activeCount: number;
  focusedCount: number;
  strugglingCount: number;
  idleCount: number;
}

/**
 * Classroom metadata stored in Redis for authorization
 */
export interface ClassroomMetadata {
  classroomId: string;
  tenantId: string;
  teacherIds: string[];
  schoolId?: string;
  districtId?: string;
}

/**
 * Classroom Monitor Service
 */
export class ClassroomMonitorService {
  private readonly STUDENT_TTL = 3600; // 1 hour
  private readonly METRICS_TTL = 86400; // 24 hours
  private readonly PATTERN_RETENTION = 86400; // 24 hours
  private readonly INTERVENTION_TTL = 86400 * 7; // 7 days
  private readonly METADATA_TTL = 3600; // 1 hour

  constructor(private readonly alertRules: AlertRulesEngine) {}

  /**
   * Set classroom metadata for authorization
   * This should be called when a classroom session is started
   */
  async setClassroomMetadata(metadata: ClassroomMetadata): Promise<void> {
    const redis = getRedisClient();
    const key = this.getClassroomMetadataKey(metadata.classroomId);
    await redis.setex(key, this.METADATA_TTL, JSON.stringify(metadata));
  }

  /**
   * Get classroom metadata for authorization checks
   */
  async getClassroomMetadata(classroomId: string): Promise<ClassroomMetadata | null> {
    const redis = getRedisClient();
    const key = this.getClassroomMetadataKey(classroomId);
    const metadataStr = await redis.get(key);

    if (!metadataStr) {
      return null;
    }

    return JSON.parse(metadataStr) as ClassroomMetadata;
  }

  /**
   * Check if a teacher has access to a classroom
   * Used for authorization in monitor routes
   */
  async isTeacherOfClassroom(
    teacherId: string,
    classroomId: string,
    tenantId: string
  ): Promise<boolean> {
    const metadata = await this.getClassroomMetadata(classroomId);

    if (!metadata) {
      // Classroom not found in cache - could be inactive
      // In production, this would query the database
      return false;
    }

    // Verify tenant isolation
    if (metadata.tenantId !== tenantId) {
      return false;
    }

    // Check if teacher is assigned to this classroom
    return metadata.teacherIds.includes(teacherId);
  }

  /**
   * Update student activity status
   */
  async updateStudentStatus(
    classroomId: string,
    status: StudentActivityStatus
  ): Promise<void> {
    const redis = getRedisClient();
    const key = this.getStudentKey(classroomId, status.studentId);

    // Store student status
    await redis.setex(key, this.STUDENT_TTL, JSON.stringify(status));

    // Add to active students set
    if (status.isActive) {
      await redis.sadd(this.getActiveStudentsKey(classroomId), status.studentId);
      await redis.expire(this.getActiveStudentsKey(classroomId), this.STUDENT_TTL);
    } else {
      await redis.srem(this.getActiveStudentsKey(classroomId), status.studentId);
    }

    // Update classroom metrics
    await this.updateClassroomMetrics(classroomId);

    // Check alert rules
    const alerts = await this.alertRules.evaluateStudent(status, classroomId);
    for (const alert of alerts) {
      await this.storeAlert(classroomId, alert);
    }

    // Record engagement pattern
    await this.recordEngagementPattern(classroomId);

    logger.info({ studentId: status.studentId, classroomId }, 'Updated student status');
  }

  /**
   * Get current classroom state
   */
  async getClassroomState(classroomId: string): Promise<{
    metrics: ClassroomMetrics;
    students: StudentActivityStatus[];
    tenantId: string | null;
  } | null> {
    const redis = getRedisClient();

    // Get classroom metadata for tenantId
    const metadata = await this.getClassroomMetadata(classroomId);

    // Get active students
    const activeStudentIds = await redis.smembers(this.getActiveStudentsKey(classroomId));

    // Get status for each student
    const students: StudentActivityStatus[] = [];
    for (const studentId of activeStudentIds) {
      const statusStr = await redis.get(this.getStudentKey(classroomId, studentId));
      if (statusStr) {
        const status = JSON.parse(statusStr) as StudentActivityStatus;
        status.lastInteraction = new Date(status.lastInteraction);
        students.push(status);
      }
    }

    // Get metrics
    const metricsStr = await redis.get(this.getMetricsKey(classroomId));
    let metrics: ClassroomMetrics;
    if (metricsStr) {
      metrics = JSON.parse(metricsStr);
      metrics.lastUpdated = new Date(metrics.lastUpdated);
    } else {
      metrics = await this.calculateMetrics(classroomId, students);
    }

    return {
      metrics,
      students,
      tenantId: metadata?.tenantId ?? null,
    };
  }

  /**
   * Get detailed student list with status
   */
  async getStudentList(classroomId: string): Promise<StudentActivityStatus[]> {
    const { students } = await this.getClassroomState(classroomId);
    return students;
  }

  /**
   * Get individual student detail
   */
  async getStudentDetail(
    classroomId: string,
    studentId: string
  ): Promise<StudentActivityStatus | null> {
    const redis = getRedisClient();
    const statusStr = await redis.get(this.getStudentKey(classroomId, studentId));

    if (!statusStr) {
      return null;
    }

    const status = JSON.parse(statusStr) as StudentActivityStatus;
    status.lastInteraction = new Date(status.lastInteraction);
    return status;
  }

  /**
   * Get active alerts for classroom
   */
  async getActiveAlerts(classroomId: string): Promise<unknown[]> {
    const redis = getRedisClient();
    const alertsStr = await redis.lrange(this.getAlertsKey(classroomId), 0, 49);

    return alertsStr.map((str) => {
      const alert = JSON.parse(str);
      alert.timestamp = new Date(alert.timestamp);
      return alert;
    });
  }

  /**
   * Log teacher intervention
   */
  async logIntervention(intervention: InterventionRecord): Promise<string> {
    const redis = getRedisClient();
    const interventionId = intervention.id || nanoid(12);

    const record: InterventionRecord = {
      ...intervention,
      id: interventionId,
      timestamp: new Date(),
    };

    const key = this.getInterventionKey(intervention.classroomId);
    await redis.lpush(key, JSON.stringify(record));
    await redis.ltrim(key, 0, 99); // Keep last 100
    await redis.expire(key, this.INTERVENTION_TTL);

    logger.info({ interventionId, classroomId: intervention.classroomId }, 'Intervention logged');
    return interventionId;
  }

  /**
   * Get engagement patterns for heatmap
   */
  async getEngagementPatterns(
    classroomId: string,
    since?: Date
  ): Promise<EngagementPattern[]> {
    const redis = getRedisClient();
    const key = this.getPatternsKey(classroomId);

    const patternsStr = await redis.lrange(key, 0, -1);
    let patterns = patternsStr.map((str) => {
      const pattern = JSON.parse(str) as EngagementPattern;
      pattern.timestamp = new Date(pattern.timestamp);
      return pattern;
    });

    // Filter by time if specified
    if (since) {
      patterns = patterns.filter((p) => p.timestamp >= since);
    }

    // Sort by timestamp
    patterns.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return patterns;
  }

  /**
   * Mark student as needing attention
   */
  async markNeedsAttention(
    classroomId: string,
    studentId: string,
    reason: string
  ): Promise<void> {
    const redis = getRedisClient();
    const key = this.getNeedsAttentionKey(classroomId);

    await redis.hset(
      key,
      studentId,
      JSON.stringify({
        reason,
        timestamp: new Date().toISOString(),
      })
    );
    await redis.expire(key, this.STUDENT_TTL);
  }

  /**
   * Clear attention flag for student
   */
  async clearNeedsAttention(classroomId: string, studentId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.hdel(this.getNeedsAttentionKey(classroomId), studentId);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(classroomId: string, alertId: string): Promise<void> {
    const redis = getRedisClient();
    const key = this.getAcknowledgedAlertsKey(classroomId);

    await redis.sadd(key, alertId);
    await redis.expire(key, this.STUDENT_TTL);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Update classroom metrics
   */
  private async updateClassroomMetrics(classroomId: string): Promise<void> {
    const redis = getRedisClient();
    const activeStudentIds = await redis.smembers(this.getActiveStudentsKey(classroomId));

    const students: StudentActivityStatus[] = [];
    for (const studentId of activeStudentIds) {
      const statusStr = await redis.get(this.getStudentKey(classroomId, studentId));
      if (statusStr) {
        students.push(JSON.parse(statusStr));
      }
    }

    const metrics = await this.calculateMetrics(classroomId, students);

    // Store metrics
    await redis.setex(this.getMetricsKey(classroomId), this.METRICS_TTL, JSON.stringify(metrics));
  }

  /**
   * Calculate classroom metrics from student statuses
   */
  private async calculateMetrics(
    classroomId: string,
    students: StudentActivityStatus[]
  ): Promise<ClassroomMetrics> {
    const focusDistribution: Record<FocusState, number> = {
      focused: 0,
      idle: 0,
      struggling: 0,
      frustrated: 0,
      help_requested: 0,
      off_task: 0,
    };

    let totalProgress = 0;
    let atRiskCount = 0;
    let helpRequestedCount = 0;

    for (const student of students) {
      focusDistribution[student.focusState]++;
      totalProgress += student.progress;

      if (
        student.focusState === 'struggling' ||
        student.focusState === 'frustrated' ||
        student.focusState === 'off_task'
      ) {
        atRiskCount++;
      }

      if (student.focusState === 'help_requested') {
        helpRequestedCount++;
      }
    }

    return {
      classroomId,
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.isActive).length,
      averageProgress: students.length > 0 ? totalProgress / students.length : 0,
      focusDistribution,
      atRiskCount,
      helpRequestedCount,
      lastUpdated: new Date(),
    };
  }

  /**
   * Store an alert
   */
  private async storeAlert(classroomId: string, alert: unknown): Promise<void> {
    const redis = getRedisClient();
    const key = this.getAlertsKey(classroomId);

    await redis.lpush(key, JSON.stringify(alert));
    await redis.ltrim(key, 0, 49); // Keep last 50
    await redis.expire(key, this.STUDENT_TTL);
  }

  /**
   * Record engagement pattern for heatmap
   */
  private async recordEngagementPattern(classroomId: string): Promise<void> {
    const redis = getRedisClient();
    const activeStudentIds = await redis.smembers(this.getActiveStudentsKey(classroomId));

    let focusedCount = 0;
    let strugglingCount = 0;
    let idleCount = 0;

    for (const studentId of activeStudentIds) {
      const statusStr = await redis.get(this.getStudentKey(classroomId, studentId));
      if (statusStr) {
        const status = JSON.parse(statusStr) as StudentActivityStatus;
        if (status.focusState === 'focused') focusedCount++;
        if (status.focusState === 'struggling' || status.focusState === 'frustrated')
          strugglingCount++;
        if (status.focusState === 'idle') idleCount++;
      }
    }

    const pattern: EngagementPattern = {
      timestamp: new Date(),
      activeCount: activeStudentIds.length,
      focusedCount,
      strugglingCount,
      idleCount,
    };

    const key = this.getPatternsKey(classroomId);
    await redis.lpush(key, JSON.stringify(pattern));
    await redis.ltrim(key, 0, 287); // Keep ~24 hours at 5-min intervals
    await redis.expire(key, this.PATTERN_RETENTION);
  }

  // Key generators
  private getClassroomMetadataKey(classroomId: string): string {
    return `classroom:${classroomId}:metadata`;
  }

  private getStudentKey(classroomId: string, studentId: string): string {
    return `classroom:${classroomId}:student:${studentId}:status`;
  }

  private getActiveStudentsKey(classroomId: string): string {
    return `classroom:${classroomId}:active_students`;
  }

  private getMetricsKey(classroomId: string): string {
    return `classroom:${classroomId}:metrics`;
  }

  private getAlertsKey(classroomId: string): string {
    return `classroom:${classroomId}:alerts`;
  }

  private getInterventionKey(classroomId: string): string {
    return `classroom:${classroomId}:interventions`;
  }

  private getPatternsKey(classroomId: string): string {
    return `classroom:${classroomId}:patterns`;
  }

  private getNeedsAttentionKey(classroomId: string): string {
    return `classroom:${classroomId}:needs_attention`;
  }

  private getAcknowledgedAlertsKey(classroomId: string): string {
    return `classroom:${classroomId}:acknowledged_alerts`;
  }
}
