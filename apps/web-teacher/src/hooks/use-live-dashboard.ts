/**
 * Live Dashboard Hook
 *
 * React hook for managing live dashboard updates with:
 * - Active session tracking
 * - Real-time analytics updates
 * - Alert management
 * - Query cache invalidation
 */

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './use-websocket';

export interface LiveSessionUpdate {
  sessionId: string;
  studentId: string;
  studentName: string;
  status: 'started' | 'progress' | 'completed' | 'paused';
  progress: number;
  currentActivity?: string;
  currentSkill?: string;
  score?: number;
  timestamp: Date;
}

export interface LiveAnalyticsUpdate {
  classId: string;
  metric: string;
  value: number;
  previousValue?: number;
  timestamp: Date;
}

export interface LiveAlert {
  id: string;
  type: 'engagement' | 'frustration' | 'milestone' | 'help_needed';
  severity: 'info' | 'warning' | 'critical';
  studentId: string;
  studentName: string;
  message: string;
  timestamp: Date;
  acknowledged?: boolean;
}

export interface UseLiveDashboardOptions {
  classId: string;
  enableAlerts?: boolean;
  enableSessionUpdates?: boolean;
  enableAnalytics?: boolean;
}

export interface UseLiveDashboardReturn {
  activeSessions: Map<string, LiveSessionUpdate>;
  recentUpdates: LiveSessionUpdate[];
  alerts: LiveAlert[];
  analyticsUpdates: LiveAnalyticsUpdate[];
  isSubscribed: boolean;
  acknowledgeAlert: (alertId: string) => void;
  clearAlerts: () => void;
}

const MAX_RECENT_UPDATES = 50;
const MAX_ALERTS = 20;

/**
 * Custom hook for live dashboard data
 */
export function useLiveDashboard(options: UseLiveDashboardOptions): UseLiveDashboardReturn {
  const {
    classId,
    enableAlerts = true,
    enableSessionUpdates = true,
    enableAnalytics = true,
  } = options;

  const { isConnected, emit, on, joinRoom, leaveRoom } = useWebSocket({
    autoConnect: false,
  });

  const [activeSessions, setActiveSessions] = useState<Map<string, LiveSessionUpdate>>(
    new Map()
  );
  const [recentUpdates, setRecentUpdates] = useState<LiveSessionUpdate[]>([]);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [analyticsUpdates, setAnalyticsUpdates] = useState<LiveAnalyticsUpdate[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Subscribe to class analytics room
  useEffect(() => {
    if (!isConnected || !classId) return;

    const subscribe = async () => {
      try {
        // Join the analytics room for this class
        await joinRoom(`analytics:${classId}`, 'analytics');

        // Subscribe to specific analytics metrics
        await emit('analytics:subscribe', {
          classId,
          metrics: ['mastery', 'engagement', 'activity'],
        });

        setIsSubscribed(true);
      } catch (error) {
        console.error('[LiveDashboard] Failed to subscribe:', error);
      }
    };

    subscribe();

    return () => {
      leaveRoom(`analytics:${classId}`);
      setIsSubscribed(false);
    };
  }, [isConnected, classId, joinRoom, leaveRoom, emit]);

  // Handle session updates
  useEffect(() => {
    if (!isConnected || !enableSessionUpdates) return;

    const handleSessionUpdate = (data: unknown, isComplete = false) => {
      const update = data as LiveSessionUpdate;
      update.timestamp = new Date(update.timestamp);

      // Update active sessions
      setActiveSessions((prev) => {
        const next = new Map(prev);
        if (update.status === 'completed' || isComplete) {
          next.delete(update.sessionId);
        } else {
          next.set(update.sessionId, update);
        }
        return next;
      });

      // Add to recent updates
      setRecentUpdates((prev) => {
        const next = [
          isComplete ? { ...update, status: 'completed' as const } : update,
          ...prev,
        ].slice(0, MAX_RECENT_UPDATES);
        return next;
      });
    };

    const unsubActivity = on('session:activity', (data) => handleSessionUpdate(data));
    const unsubProgress = on('session:progress', (data) => handleSessionUpdate(data));
    const unsubComplete = on('session:complete', (data) => handleSessionUpdate(data, true));

    return () => {
      unsubActivity();
      unsubProgress();
      unsubComplete();
    };
  }, [isConnected, enableSessionUpdates, on]);

  // Handle analytics updates
  useEffect(() => {
    if (!isConnected || !enableAnalytics) return;

    const unsub = on('analytics:update', (data: unknown) => {
      const update = data as LiveAnalyticsUpdate;
      update.timestamp = new Date(update.timestamp);

      setAnalyticsUpdates((prev) => [update, ...prev].slice(0, 100));
    });

    return unsub;
  }, [isConnected, enableAnalytics, on]);

  // Handle alerts
  useEffect(() => {
    if (!isConnected || !enableAlerts) return;

    const unsub = on('analytics:alert', (data: unknown) => {
      const alert = data as LiveAlert;
      alert.timestamp = new Date(alert.timestamp);
      alert.acknowledged = false;

      setAlerts((prev) => {
        // Prevent duplicates
        if (prev.some((a) => a.id === alert.id)) {
          return prev;
        }
        return [alert, ...prev].slice(0, MAX_ALERTS);
      });

      // Show browser notification for critical alerts
      if (
        alert.severity === 'critical' &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification(`Alert: ${alert.studentName}`, {
          body: alert.message,
          icon: '/favicon.ico',
        });
      }
    });

    return unsub;
  }, [isConnected, enableAlerts, on]);

  const acknowledgeAlert = useCallback(
    (alertId: string) => {
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      );

      // Notify server
      emit('alert:acknowledge', { alertId });
    },
    [emit]
  );

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    activeSessions,
    recentUpdates,
    alerts,
    analyticsUpdates,
    isSubscribed,
    acknowledgeAlert,
    clearAlerts,
  };
}
