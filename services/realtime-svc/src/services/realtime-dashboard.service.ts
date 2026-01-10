/**
 * Real-time Dashboard Service
 *
 * Provides real-time analytics and monitoring dashboards via WebSocket.
 * Supports multiple dashboard types:
 * - Teacher classroom monitoring
 * - Parent learner activity view
 * - District-wide analytics
 * - Admin system health
 *
 * @module realtime-svc/services/realtime-dashboard
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { logger } from '../logger.js';
import { RedisKeys, getRedisClient } from '../redis/index.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface StudentActivityStatus {
  studentId: string;
  studentName: string;
  avatarUrl?: string;
  currentActivity: string;
  currentActivityType: ActivityType;
  contentId?: string;
  contentTitle?: string;
  progress: number; // 0-100
  focusState: FocusState;
  focusScore: number; // 0-100
  timeOnTask: number; // seconds
  lastInteraction: Date;
  errorCount: number;
  successRate: number; // 0-100
  idleTime: number; // seconds
  isActive: boolean;
  needsHelp: boolean;
  alerts: StudentAlert[];
}

export type FocusState = 'FOCUSED' | 'DISTRACTED' | 'DISENGAGED' | 'ON_BREAK' | 'AWAY';

export type ActivityType =
  | 'LEARNING'
  | 'ASSESSMENT'
  | 'HOMEWORK'
  | 'BREAK'
  | 'IDLE'
  | 'AI_TUTOR'
  | 'PRACTICE';

export interface StudentAlert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export type AlertType =
  | 'FOCUS_DROP'
  | 'EXTENDED_IDLE'
  | 'HELP_REQUESTED'
  | 'STRUGGLE_DETECTED'
  | 'BREAK_NEEDED'
  | 'TIME_LIMIT_APPROACHING'
  | 'ERROR_PATTERN'
  | 'ENGAGEMENT_DROP';

export interface ClassroomMetrics {
  classId: string;
  className: string;
  teacherId: string;
  activeStudents: number;
  totalStudents: number;
  averageProgress: number;
  averageFocusScore: number;
  focusDistribution: Record<FocusState, number>;
  atRiskCount: number;
  helpRequestedCount: number;
  topActivity: string;
  sessionStartedAt: Date;
  lastUpdated: Date;
}

export interface LearnerDashboardData {
  learnerId: string;
  learnerName: string;
  currentSession?: {
    activityType: ActivityType;
    contentTitle: string;
    progress: number;
    startedAt: Date;
    focusScore: number;
  };
  todayStats: {
    totalTimeMinutes: number;
    focusedTimeMinutes: number;
    lessonsCompleted: number;
    xpEarned: number;
    streak: number;
  };
  recentActivities: Array<{
    type: ActivityType;
    title: string;
    completedAt: Date;
    score?: number;
  }>;
  alerts: StudentAlert[];
}

export interface DistrictDashboardMetrics {
  tenantId: string;
  districtName: string;
  schools: Array<{
    schoolId: string;
    schoolName: string;
    activeStudents: number;
    totalStudents: number;
    averageFocusScore: number;
    atRiskCount: number;
  }>;
  aggregateMetrics: {
    totalActiveStudents: number;
    totalStudents: number;
    averageEngagement: number;
    alertsCount: number;
  };
  lastUpdated: Date;
}

export interface DashboardSubscription {
  id: string;
  userId: string;
  tenantId: string;
  dashboardType: DashboardType;
  targetId: string; // classId, learnerId, schoolId, etc.
  createdAt: Date;
  lastActivity: Date;
}

export type DashboardType = 'classroom' | 'learner' | 'school' | 'district' | 'system';

// ════════════════════════════════════════════════════════════════════════════════
// DASHBOARD EVENTS
// ════════════════════════════════════════════════════════════════════════════════

export interface DashboardEventPayload {
  dashboardType: DashboardType;
  targetId: string;
  tenantId: string;
  timestamp: Date;
}

export interface StudentActivityUpdate extends DashboardEventPayload {
  dashboardType: 'classroom';
  student: StudentActivityStatus;
}

export interface ClassroomMetricsUpdate extends DashboardEventPayload {
  dashboardType: 'classroom';
  metrics: ClassroomMetrics;
}

export interface LearnerUpdate extends DashboardEventPayload {
  dashboardType: 'learner';
  data: LearnerDashboardData;
}

export interface AlertEvent extends DashboardEventPayload {
  alert: StudentAlert;
  studentId: string;
  studentName: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// REAL-TIME DASHBOARD SERVICE
// ════════════════════════════════════════════════════════════════════════════════

export class RealtimeDashboardService extends EventEmitter {
  private redis: Redis;
  private subscriptions: Map<string, DashboardSubscription> = new Map();
  private metricsCache: Map<string, { data: unknown; timestamp: Date }> = new Map();
  private readonly cacheTtlMs = 5000; // 5 seconds cache
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    this.redis = getRedisClient();
  }

  /**
   * Start the dashboard service
   */
  async start(): Promise<void> {
    // Subscribe to Redis channels for real-time updates
    await this.subscribeToChannels();

    // Start periodic metrics aggregation
    this.startPeriodicUpdates();

    logger.info('Real-time Dashboard Service started');
  }

  /**
   * Stop the dashboard service
   */
  async stop(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.subscriptions.clear();
    this.metricsCache.clear();
    logger.info('Real-time Dashboard Service stopped');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTION MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to a dashboard
   */
  async subscribe(params: {
    userId: string;
    tenantId: string;
    dashboardType: DashboardType;
    targetId: string;
  }): Promise<DashboardSubscription> {
    const subscriptionId = `${params.dashboardType}:${params.targetId}:${params.userId}`;

    const subscription: DashboardSubscription = {
      id: subscriptionId,
      userId: params.userId,
      tenantId: params.tenantId,
      dashboardType: params.dashboardType,
      targetId: params.targetId,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Send initial data
    const initialData = await this.getDashboardData(
      params.dashboardType,
      params.targetId,
      params.tenantId
    );

    this.emit('subscription:created', { subscription, initialData });

    logger.info({
      userId: params.userId,
      dashboardType: params.dashboardType,
      targetId: params.targetId,
    }, 'Dashboard subscription created');

    return subscription;
  }

  /**
   * Unsubscribe from a dashboard
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      this.subscriptions.delete(subscriptionId);
      this.emit('subscription:removed', { subscription });
      return true;
    }
    return false;
  }

  /**
   * Get all active subscriptions for a target
   */
  getSubscriptionsForTarget(
    dashboardType: DashboardType,
    targetId: string
  ): DashboardSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      s => s.dashboardType === dashboardType && s.targetId === targetId
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // DATA RETRIEVAL
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Get current dashboard data
   */
  async getDashboardData(
    dashboardType: DashboardType,
    targetId: string,
    tenantId: string
  ): Promise<unknown> {
    const cacheKey = `${dashboardType}:${targetId}`;
    const cached = this.metricsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTtlMs) {
      return cached.data;
    }

    let data: unknown;

    switch (dashboardType) {
      case 'classroom':
        data = await this.getClassroomDashboard(targetId, tenantId);
        break;
      case 'learner':
        data = await this.getLearnerDashboard(targetId, tenantId);
        break;
      case 'school':
        data = await this.getSchoolDashboard(targetId, tenantId);
        break;
      case 'district':
        data = await this.getDistrictDashboard(tenantId);
        break;
      default:
        data = null;
    }

    if (data) {
      this.metricsCache.set(cacheKey, { data, timestamp: new Date() });
    }

    return data;
  }

  /**
   * Get classroom monitoring dashboard
   */
  async getClassroomDashboard(
    classId: string,
    tenantId: string
  ): Promise<{ metrics: ClassroomMetrics; students: StudentActivityStatus[] }> {
    // Get student activity data from Redis
    const studentKeys = await this.redis.keys(
      `${RedisKeys.prefix}:activity:${tenantId}:${classId}:*`
    );

    const students: StudentActivityStatus[] = [];
    let totalProgress = 0;
    let totalFocus = 0;
    let atRiskCount = 0;
    let helpRequestedCount = 0;
    const focusDistribution: Record<FocusState, number> = {
      FOCUSED: 0,
      DISTRACTED: 0,
      DISENGAGED: 0,
      ON_BREAK: 0,
      AWAY: 0,
    };

    if (studentKeys.length > 0) {
      const pipeline = this.redis.pipeline();
      for (const key of studentKeys) {
        pipeline.hgetall(key);
      }
      const results = await pipeline.exec();

      for (const [err, data] of results ?? []) {
        if (err || !data) continue;

        const studentData = data as Record<string, string>;
        const student = this.parseStudentActivity(studentData);
        students.push(student);

        totalProgress += student.progress;
        totalFocus += student.focusScore;
        focusDistribution[student.focusState]++;

        if (student.needsHelp) {
          helpRequestedCount++;
        }
        if (student.focusScore < 40 || student.errorCount > 5) {
          atRiskCount++;
        }
      }
    }

    const activeStudents = students.filter(s => s.isActive).length;
    const totalStudents = students.length;

    const metrics: ClassroomMetrics = {
      classId,
      className: await this.getClassName(classId, tenantId),
      teacherId: '', // Would be filled from class data
      activeStudents,
      totalStudents,
      averageProgress: totalStudents > 0 ? totalProgress / totalStudents : 0,
      averageFocusScore: totalStudents > 0 ? totalFocus / totalStudents : 0,
      focusDistribution,
      atRiskCount,
      helpRequestedCount,
      topActivity: this.getTopActivity(students),
      sessionStartedAt: new Date(), // Would be from session data
      lastUpdated: new Date(),
    };

    return { metrics, students };
  }

  /**
   * Get learner dashboard for parent view
   */
  async getLearnerDashboard(
    learnerId: string,
    tenantId: string
  ): Promise<LearnerDashboardData> {
    // Get current session from Redis
    const sessionKey = `${RedisKeys.prefix}:session:${tenantId}:${learnerId}`;
    const sessionData = await this.redis.hgetall(sessionKey);

    // Get today's stats from Redis
    const today = new Date().toISOString().split('T')[0];
    const statsKey = `${RedisKeys.prefix}:daily:${tenantId}:${learnerId}:${today}`;
    const statsData = await this.redis.hgetall(statsKey);

    // Get recent activities
    const activitiesKey = `${RedisKeys.prefix}:activities:${tenantId}:${learnerId}`;
    const recentActivities = await this.redis.lrange(activitiesKey, 0, 9);

    // Get active alerts
    const alertsKey = `${RedisKeys.prefix}:alerts:${tenantId}:${learnerId}`;
    const alertsData = await this.redis.lrange(alertsKey, 0, 4);

    return {
      learnerId,
      learnerName: sessionData?.learnerName ?? 'Unknown',
      currentSession: sessionData?.activityType ? {
        activityType: sessionData.activityType as ActivityType,
        contentTitle: sessionData.contentTitle ?? '',
        progress: parseInt(sessionData.progress ?? '0', 10),
        startedAt: new Date(sessionData.startedAt ?? Date.now()),
        focusScore: parseInt(sessionData.focusScore ?? '0', 10),
      } : undefined,
      todayStats: {
        totalTimeMinutes: parseInt(statsData?.totalTime ?? '0', 10),
        focusedTimeMinutes: parseInt(statsData?.focusedTime ?? '0', 10),
        lessonsCompleted: parseInt(statsData?.lessonsCompleted ?? '0', 10),
        xpEarned: parseInt(statsData?.xpEarned ?? '0', 10),
        streak: parseInt(statsData?.streak ?? '0', 10),
      },
      recentActivities: recentActivities.map(a => {
        const parsed = JSON.parse(a);
        return {
          type: parsed.type as ActivityType,
          title: parsed.title ?? '',
          completedAt: new Date(parsed.completedAt),
          score: parsed.score,
        };
      }),
      alerts: alertsData.map(a => JSON.parse(a) as StudentAlert),
    };
  }

  /**
   * Get school dashboard
   */
  async getSchoolDashboard(
    schoolId: string,
    tenantId: string
  ): Promise<{ schoolId: string; classes: ClassroomMetrics[] }> {
    // Get all classes for this school
    const classIds = await this.redis.smembers(
      `${RedisKeys.prefix}:school:${tenantId}:${schoolId}:classes`
    );

    const classes: ClassroomMetrics[] = [];

    for (const classId of classIds) {
      const { metrics } = await this.getClassroomDashboard(classId, tenantId);
      classes.push(metrics);
    }

    return { schoolId, classes };
  }

  /**
   * Get district-wide dashboard
   */
  async getDistrictDashboard(tenantId: string): Promise<DistrictDashboardMetrics> {
    // Get all schools for this district
    const schoolIds = await this.redis.smembers(
      `${RedisKeys.prefix}:district:${tenantId}:schools`
    );

    let totalActiveStudents = 0;
    let totalStudents = 0;
    let totalEngagement = 0;
    let totalAlerts = 0;

    const schools = await Promise.all(
      schoolIds.map(async schoolId => {
        const { classes } = await this.getSchoolDashboard(schoolId, tenantId);

        const activeStudents = classes.reduce((sum, c) => sum + c.activeStudents, 0);
        const students = classes.reduce((sum, c) => sum + c.totalStudents, 0);
        const avgFocus = students > 0
          ? classes.reduce((sum, c) => sum + c.averageFocusScore * c.totalStudents, 0) / students
          : 0;
        const atRisk = classes.reduce((sum, c) => sum + c.atRiskCount, 0);

        totalActiveStudents += activeStudents;
        totalStudents += students;
        totalEngagement += avgFocus * students;
        totalAlerts += atRisk;

        return {
          schoolId,
          schoolName: await this.getSchoolName(schoolId, tenantId),
          activeStudents,
          totalStudents: students,
          averageFocusScore: avgFocus,
          atRiskCount: atRisk,
        };
      })
    );

    return {
      tenantId,
      districtName: await this.getDistrictName(tenantId),
      schools,
      aggregateMetrics: {
        totalActiveStudents,
        totalStudents,
        averageEngagement: totalStudents > 0 ? totalEngagement / totalStudents : 0,
        alertsCount: totalAlerts,
      },
      lastUpdated: new Date(),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // EVENT INGESTION
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Process a student activity update
   */
  async processActivityUpdate(update: {
    tenantId: string;
    classId: string;
    studentId: string;
    studentName: string;
    activityType: ActivityType;
    contentId?: string;
    contentTitle?: string;
    progress: number;
    focusState: FocusState;
    focusScore: number;
    isActive: boolean;
    needsHelp: boolean;
    errorCount: number;
    successRate: number;
  }): Promise<void> {
    const activityKey = `${RedisKeys.prefix}:activity:${update.tenantId}:${update.classId}:${update.studentId}`;

    // Store in Redis
    await this.redis.hmset(activityKey, {
      studentId: update.studentId,
      studentName: update.studentName,
      activityType: update.activityType,
      contentId: update.contentId ?? '',
      contentTitle: update.contentTitle ?? '',
      progress: update.progress.toString(),
      focusState: update.focusState,
      focusScore: update.focusScore.toString(),
      isActive: update.isActive ? '1' : '0',
      needsHelp: update.needsHelp ? '1' : '0',
      errorCount: update.errorCount.toString(),
      successRate: update.successRate.toString(),
      lastInteraction: new Date().toISOString(),
    });

    // Set TTL for auto-cleanup
    await this.redis.expire(activityKey, 3600); // 1 hour

    // Build student status
    const student: StudentActivityStatus = {
      studentId: update.studentId,
      studentName: update.studentName,
      currentActivity: update.activityType,
      currentActivityType: update.activityType,
      contentId: update.contentId,
      contentTitle: update.contentTitle,
      progress: update.progress,
      focusState: update.focusState,
      focusScore: update.focusScore,
      timeOnTask: 0,
      lastInteraction: new Date(),
      errorCount: update.errorCount,
      successRate: update.successRate,
      idleTime: 0,
      isActive: update.isActive,
      needsHelp: update.needsHelp,
      alerts: [],
    };

    // Emit update to subscribed dashboards
    const updateEvent: StudentActivityUpdate = {
      dashboardType: 'classroom',
      targetId: update.classId,
      tenantId: update.tenantId,
      timestamp: new Date(),
      student,
    };

    this.emit('dashboard:update', updateEvent);

    // Check for alert conditions
    await this.checkAlertConditions(update, student);
  }

  /**
   * Process focus state change
   */
  async processFocusChange(event: {
    tenantId: string;
    classId: string;
    studentId: string;
    previousState: FocusState;
    newState: FocusState;
    focusScore: number;
    timestamp: Date;
  }): Promise<void> {
    // Update student activity
    const activityKey = `${RedisKeys.prefix}:activity:${event.tenantId}:${event.classId}:${event.studentId}`;

    await this.redis.hmset(activityKey, {
      focusState: event.newState,
      focusScore: event.focusScore.toString(),
      lastInteraction: event.timestamp.toISOString(),
    });

    // Check if alert should be triggered
    if (event.newState === 'DISTRACTED' || event.newState === 'DISENGAGED') {
      await this.createAlert({
        tenantId: event.tenantId,
        classId: event.classId,
        studentId: event.studentId,
        type: 'FOCUS_DROP',
        severity: event.newState === 'DISENGAGED' ? 'warning' : 'info',
        message: `Focus state changed from ${event.previousState} to ${event.newState}`,
      });
    }
  }

  /**
   * Create an alert
   */
  async createAlert(params: {
    tenantId: string;
    classId: string;
    studentId: string;
    type: AlertType;
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }): Promise<StudentAlert> {
    const alert: StudentAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      severity: params.severity,
      message: params.message,
      timestamp: new Date(),
      acknowledged: false,
    };

    // Store alert in Redis
    const alertsKey = `${RedisKeys.prefix}:alerts:${params.tenantId}:${params.studentId}`;
    await this.redis.lpush(alertsKey, JSON.stringify(alert));
    await this.redis.ltrim(alertsKey, 0, 49); // Keep last 50 alerts
    await this.redis.expire(alertsKey, 86400); // 24 hour TTL

    // Emit alert event
    this.emit('alert:created', {
      dashboardType: 'classroom' as DashboardType,
      targetId: params.classId,
      tenantId: params.tenantId,
      timestamp: new Date(),
      alert,
      studentId: params.studentId,
      studentName: '', // Would be fetched
    });

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    tenantId: string,
    studentId: string,
    alertId: string,
    userId: string
  ): Promise<boolean> {
    const alertsKey = `${RedisKeys.prefix}:alerts:${tenantId}:${studentId}`;
    const alerts = await this.redis.lrange(alertsKey, 0, -1);

    for (let i = 0; i < alerts.length; i++) {
      const alert = JSON.parse(alerts[i]) as StudentAlert;
      if (alert.id === alertId) {
        alert.acknowledged = true;
        alert.acknowledgedBy = userId;
        alert.acknowledgedAt = new Date();

        await this.redis.lset(alertsKey, i, JSON.stringify(alert));

        this.emit('alert:acknowledged', {
          alertId,
          studentId,
          tenantId,
          acknowledgedBy: userId,
        });

        return true;
      }
    }

    return false;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────────

  private async subscribeToChannels(): Promise<void> {
    // Subscribe to activity updates channel
    const subscriber = this.redis.duplicate();

    await subscriber.subscribe(
      RedisKeys.channels.activity,
      RedisKeys.channels.focus,
      RedisKeys.channels.alerts
    );

    subscriber.on('message', (channel: string, message: string) => {
      try {
        const data = JSON.parse(message);

        switch (channel) {
          case RedisKeys.channels.activity:
            this.processActivityUpdate(data);
            break;
          case RedisKeys.channels.focus:
            this.processFocusChange(data);
            break;
          case RedisKeys.channels.alerts:
            // Handle external alerts
            break;
        }
      } catch (error) {
        logger.error({ error, channel, message }, 'Failed to process channel message');
      }
    });
  }

  private startPeriodicUpdates(): void {
    // Aggregate and broadcast metrics every 5 seconds
    this.updateInterval = setInterval(async () => {
      const subscriptionsByTarget = new Map<string, DashboardSubscription[]>();

      for (const sub of this.subscriptions.values()) {
        const key = `${sub.dashboardType}:${sub.targetId}`;
        if (!subscriptionsByTarget.has(key)) {
          subscriptionsByTarget.set(key, []);
        }
        subscriptionsByTarget.get(key)!.push(sub);
      }

      // Update each active dashboard
      for (const [key, subs] of subscriptionsByTarget) {
        const [dashboardType, targetId] = key.split(':') as [DashboardType, string];
        const tenantId = subs[0]?.tenantId;

        if (!tenantId) continue;

        const data = await this.getDashboardData(dashboardType, targetId, tenantId);

        if (data && dashboardType === 'classroom') {
          const { metrics } = data as { metrics: ClassroomMetrics };
          const metricsUpdate: ClassroomMetricsUpdate = {
            dashboardType,
            targetId,
            tenantId,
            timestamp: new Date(),
            metrics,
          };
          this.emit('dashboard:metrics', metricsUpdate);
        }
      }
    }, 5000);
  }

  private parseStudentActivity(data: Record<string, string>): StudentActivityStatus {
    return {
      studentId: data.studentId ?? '',
      studentName: data.studentName ?? 'Unknown',
      currentActivity: data.activityType ?? 'IDLE',
      currentActivityType: (data.activityType as ActivityType) ?? 'IDLE',
      contentId: data.contentId || undefined,
      contentTitle: data.contentTitle || undefined,
      progress: parseInt(data.progress ?? '0', 10),
      focusState: (data.focusState as FocusState) ?? 'AWAY',
      focusScore: parseInt(data.focusScore ?? '0', 10),
      timeOnTask: 0,
      lastInteraction: new Date(data.lastInteraction ?? Date.now()),
      errorCount: parseInt(data.errorCount ?? '0', 10),
      successRate: parseInt(data.successRate ?? '0', 10),
      idleTime: 0,
      isActive: data.isActive === '1',
      needsHelp: data.needsHelp === '1',
      alerts: [],
    };
  }

  private getTopActivity(students: StudentActivityStatus[]): string {
    const activityCounts = new Map<string, number>();

    for (const student of students) {
      if (student.isActive) {
        const count = activityCounts.get(student.currentActivity) ?? 0;
        activityCounts.set(student.currentActivity, count + 1);
      }
    }

    let topActivity = 'IDLE';
    let maxCount = 0;

    for (const [activity, count] of activityCounts) {
      if (count > maxCount) {
        maxCount = count;
        topActivity = activity;
      }
    }

    return topActivity;
  }

  private async checkAlertConditions(
    update: { tenantId: string; classId: string; studentId: string },
    student: StudentActivityStatus
  ): Promise<void> {
    // Focus drop alert
    if (student.focusScore < 30 && student.isActive) {
      await this.createAlert({
        tenantId: update.tenantId,
        classId: update.classId,
        studentId: update.studentId,
        type: 'FOCUS_DROP',
        severity: student.focusScore < 20 ? 'warning' : 'info',
        message: `Focus score dropped to ${student.focusScore}%`,
      });
    }

    // Error pattern alert
    if (student.errorCount > 5 && student.successRate < 50) {
      await this.createAlert({
        tenantId: update.tenantId,
        classId: update.classId,
        studentId: update.studentId,
        type: 'STRUGGLE_DETECTED',
        severity: 'warning',
        message: `Student struggling with ${student.errorCount} errors and ${student.successRate}% success rate`,
      });
    }

    // Help requested
    if (student.needsHelp) {
      await this.createAlert({
        tenantId: update.tenantId,
        classId: update.classId,
        studentId: update.studentId,
        type: 'HELP_REQUESTED',
        severity: 'info',
        message: 'Student has requested help',
      });
    }
  }

  private async getClassName(_classId: string, _tenantId: string): Promise<string> {
    // Would fetch from database
    return 'Class';
  }

  private async getSchoolName(_schoolId: string, _tenantId: string): Promise<string> {
    // Would fetch from database
    return 'School';
  }

  private async getDistrictName(_tenantId: string): Promise<string> {
    // Would fetch from database
    return 'District';
  }
}

export default RealtimeDashboardService;
