/**
 * Classroom Monitor Hook
 *
 * React hook for real-time classroom monitoring with:
 * - WebSocket connection to classroom monitor
 * - Student activity updates
 * - Alert notifications
 * - Classroom metrics streaming
 * - Automatic reconnection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './use-websocket';

/**
 * Focus state for students
 */
export type FocusState =
  | 'focused'
  | 'idle'
  | 'struggling'
  | 'frustrated'
  | 'help_requested'
  | 'off_task';

/**
 * Student activity status
 */
export interface StudentStatus {
  studentId: string;
  studentName: string;
  currentActivity?: string;
  currentActivityType?: 'lesson' | 'assessment' | 'practice' | 'reading';
  progress: number;
  focusState: FocusState;
  timeOnTask: number;
  lastInteraction: Date;
  errorCount: number;
  successRate: number;
  idleTime: number;
  isActive: boolean;
  metadata?: {
    currentSkill?: string;
    questionNumber?: number;
    totalQuestions?: number;
    attemptsOnCurrentQuestion?: number;
  };
}

/**
 * Classroom metrics
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
 * Alert
 */
export interface Alert {
  id: string;
  type: 'idle' | 'high_error_rate' | 'frustration' | 'help_requested' | 'off_task' | 'struggling' | 'disengaged';
  priority: 'info' | 'warning' | 'urgent';
  studentId: string;
  studentName: string;
  message: string;
  timestamp: Date;
  acknowledged?: boolean;
  actionSuggestions?: string[];
}

/**
 * Hook options
 */
export interface UseClassroomMonitorOptions {
  classroomId: string;
  autoConnect?: boolean;
}

/**
 * Hook return type
 */
export interface UseClassroomMonitorReturn {
  students: Map<string, StudentStatus>;
  metrics: ClassroomMetrics | null;
  alerts: Alert[];
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  sendIntervention: (studentId: string, type: string, message?: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3003';

/**
 * Classroom Monitor Hook
 */
export function useClassroomMonitor(
  options: UseClassroomMonitorOptions
): UseClassroomMonitorReturn {
  const { classroomId, autoConnect = true } = options;

  const { isConnected, emit, on, joinRoom, leaveRoom } = useWebSocket({
    autoConnect,
  });

  const [students, setStudents] = useState<Map<string, StudentStatus>>(new Map());
  const [metrics, setMetrics] = useState<ClassroomMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const hasJoinedRoom = useRef(false);

  /**
   * Fetch initial classroom state
   */
  const fetchInitialState = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/monitor/classroom/${classroomId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch classroom state');
      }

      const result = await response.json();
      const { metrics: metricsData, students: studentsData } = result.data;

      // Update metrics
      setMetrics({
        ...metricsData,
        lastUpdated: new Date(metricsData.lastUpdated),
      });

      // Update students
      const studentMap = new Map<string, StudentStatus>();
      for (const student of studentsData) {
        studentMap.set(student.studentId, {
          ...student,
          lastInteraction: new Date(student.lastInteraction),
        });
      }
      setStudents(studentMap);

      // Fetch alerts
      const alertsResponse = await fetch(`${API_URL}/monitor/classroom/${classroomId}/alerts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (alertsResponse.ok) {
        const alertsResult = await alertsResponse.json();
        setAlerts(
          alertsResult.data.map((alert: Alert) => ({
            ...alert,
            timestamp: new Date(alert.timestamp),
          }))
        );
      }
    } catch (err) {
      console.error('[ClassroomMonitor] Error fetching initial state:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [classroomId]);

  /**
   * Join monitor room on connection
   */
  useEffect(() => {
    if (!isConnected || !classroomId || hasJoinedRoom.current) return;

    const joinMonitorRoom = async () => {
      try {
        await joinRoom(`monitor:${classroomId}`, 'analytics');
        hasJoinedRoom.current = true;

        // Fetch initial state
        await fetchInitialState();
      } catch (err) {
        console.error('[ClassroomMonitor] Failed to join monitor room:', err);
        setError(err as Error);
      }
    };

    joinMonitorRoom();

    return () => {
      if (hasJoinedRoom.current) {
        leaveRoom(`monitor:${classroomId}`);
        hasJoinedRoom.current = false;
      }
    };
  }, [isConnected, classroomId, joinRoom, leaveRoom, fetchInitialState]);

  /**
   * Listen for student updates
   */
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = on('monitor:student_update', (data: unknown) => {
      const update = data as {
        studentId: string;
        studentName: string;
        focusState: FocusState;
        progress: number;
        currentActivity?: string;
        timestamp: string;
      };

      setStudents((prev) => {
        const next = new Map(prev);
        const existing = next.get(update.studentId);

        if (existing) {
          next.set(update.studentId, {
            ...existing,
            focusState: update.focusState,
            progress: update.progress,
            currentActivity: update.currentActivity,
            lastInteraction: new Date(update.timestamp),
          });
        }

        return next;
      });
    });

    return unsubscribe;
  }, [isConnected, on]);

  /**
   * Listen for metrics updates
   */
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = on('monitor:metrics_update', (data: unknown) => {
      const update = data as { metrics: ClassroomMetrics };
      setMetrics({
        ...update.metrics,
        lastUpdated: new Date(update.metrics.lastUpdated),
      });
    });

    return unsubscribe;
  }, [isConnected, on]);

  /**
   * Listen for alerts
   */
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = on('monitor:alert', (data: unknown) => {
      const update = data as { alert: Alert };
      const alert = {
        ...update.alert,
        timestamp: new Date(update.alert.timestamp),
      };

      setAlerts((prev) => {
        // Prevent duplicates
        if (prev.some((a) => a.id === alert.id)) {
          return prev;
        }
        return [alert, ...prev].slice(0, 50); // Keep last 50
      });

      // Show browser notification for urgent alerts
      if (
        alert.priority === 'urgent' &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification(`Alert: ${alert.studentName}`, {
          body: alert.message,
          icon: '/favicon.ico',
        });
      }
    });

    return unsubscribe;
  }, [isConnected, on]);

  /**
   * Listen for alert acknowledgments
   */
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = on('monitor:alert_acknowledged', (data: unknown) => {
      const update = data as { alertId: string };

      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === update.alertId ? { ...alert, acknowledged: true } : alert
        )
      );
    });

    return unsubscribe;
  }, [isConnected, on]);

  /**
   * Acknowledge an alert
   */
  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      try {
        // Update locally
        setAlerts((prev) =>
          prev.map((alert) => (alert.id === alertId ? { ...alert, acknowledged: true } : alert))
        );

        // Notify server via WebSocket
        await emit('alert:acknowledge', { alertId });
      } catch (err) {
        console.error('[ClassroomMonitor] Failed to acknowledge alert:', err);
      }
    },
    [emit]
  );

  /**
   * Send intervention
   */
  const sendIntervention = useCallback(
    async (studentId: string, type: string, message?: string) => {
      try {
        const token = localStorage.getItem('auth_token');
        const teacherId = 'current-teacher-id'; // TODO: Get from auth context

        const response = await fetch(`${API_URL}/monitor/classroom/${classroomId}/intervention`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            studentId,
            teacherId,
            type,
            message,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send intervention');
        }

        console.log('[ClassroomMonitor] Intervention sent:', { studentId, type });
      } catch (err) {
        console.error('[ClassroomMonitor] Failed to send intervention:', err);
        throw err;
      }
    },
    [classroomId]
  );

  /**
   * Refresh data
   */
  const refreshData = useCallback(async () => {
    await fetchInitialState();
  }, [fetchInitialState]);

  return {
    students,
    metrics,
    alerts,
    isConnected,
    isLoading,
    error,
    acknowledgeAlert,
    sendIntervention,
    refreshData,
  };
}
