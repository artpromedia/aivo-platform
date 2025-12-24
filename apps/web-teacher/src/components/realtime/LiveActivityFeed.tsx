/**
 * Live Activity Feed Component
 *
 * Displays real-time student activity including:
 * - Active sessions with progress
 * - Alerts requiring attention
 * - Recent activity timeline
 */

import React, { useRef } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Activity,
  Zap,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LiveSessionUpdate, LiveAlert } from '@/hooks/use-live-dashboard';

interface LiveActivityFeedProps {
  activeSessions: Map<string, LiveSessionUpdate>;
  recentUpdates: LiveSessionUpdate[];
  alerts: LiveAlert[];
  onAcknowledgeAlert?: (alertId: string) => void;
  onViewStudent?: (studentId: string) => void;
  className?: string;
}

/**
 * Format time distance (simplified)
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Get status icon
 */
function getStatusIcon(status: LiveSessionUpdate['status']) {
  switch (status) {
    case 'started':
      return <Play className="h-4 w-4 text-green-500" />;
    case 'progress':
      return <Activity className="h-4 w-4 text-blue-500" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'paused':
      return <Pause className="h-4 w-4 text-yellow-500" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

/**
 * Get alert icon
 */
function getAlertIcon(type: LiveAlert['type']) {
  switch (type) {
    case 'frustration':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'engagement':
      return <TrendingUp className="h-4 w-4 text-yellow-500" />;
    case 'milestone':
      return <Zap className="h-4 w-4 text-green-500" />;
    case 'help_needed':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

/**
 * Get alert border color
 */
function getAlertBorderColor(severity: LiveAlert['severity']) {
  switch (severity) {
    case 'critical':
      return 'border-l-red-500';
    case 'warning':
      return 'border-l-yellow-500';
    default:
      return 'border-l-blue-500';
  }
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Live Activity Feed Component
 */
export function LiveActivityFeed({
  activeSessions,
  recentUpdates,
  alerts,
  onAcknowledgeAlert,
  onViewStudent,
  className,
}: LiveActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Active Sessions */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <div className="relative">
              <Activity className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            </div>
            Active Sessions
          </h3>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
            {activeSessions.size} active
          </span>
        </div>

        {activeSessions.size === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No active sessions right now
          </p>
        ) : (
          <div className="max-h-[200px] overflow-y-auto space-y-2">
            {Array.from(activeSessions.values()).map((session) => (
              <div
                key={session.sessionId}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => onViewStudent?.(session.studentId)}
              >
                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                  {getInitials(session.studentName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session.studentName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {session.currentSkill || session.currentActivity || 'Working...'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium">{session.progress}%</p>
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${session.progress}%` }}
                      />
                    </div>
                  </div>
                  {getStatusIcon(session.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Alerts
            </h3>
            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
              {unacknowledgedAlerts.length} new
            </span>
          </div>

          <div className="space-y-2">
            {unacknowledgedAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border-l-4 bg-white',
                  getAlertBorderColor(alert.severity)
                )}
              >
                {getAlertIcon(alert.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{alert.studentName}</p>
                    <span className="text-xs border rounded px-1.5 py-0.5 text-gray-500">
                      {alert.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTimeAgo(alert.timestamp)}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    className="text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    onClick={() => onViewStudent?.(alert.studentId)}
                  >
                    View
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    onClick={() => onAcknowledgeAlert?.(alert.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold flex items-center gap-2 pb-2">
          <Clock className="h-4 w-4" />
          Recent Activity
        </h3>

        <div className="max-h-[300px] overflow-y-auto" ref={scrollRef}>
          <div className="space-y-1">
            {recentUpdates.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No recent activity
              </p>
            ) : (
              recentUpdates.map((update, index) => (
                <div
                  key={`${update.sessionId}-${index}`}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onViewStudent?.(update.studentId)}
                >
                  {getStatusIcon(update.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{update.studentName}</span>{' '}
                      {update.status === 'started' && 'started a session'}
                      {update.status === 'completed' && (
                        <>
                          completed with{' '}
                          <span className="font-medium text-green-600">
                            {update.score}%
                          </span>
                        </>
                      )}
                      {update.status === 'progress' && (
                        <>
                          progressed to{' '}
                          <span className="font-medium">{update.progress}%</span>
                        </>
                      )}
                      {update.status === 'paused' && 'paused their session'}
                    </p>
                    {update.currentSkill && (
                      <p className="text-xs text-gray-500 truncate">
                        {update.currentSkill}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatTimeAgo(update.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
