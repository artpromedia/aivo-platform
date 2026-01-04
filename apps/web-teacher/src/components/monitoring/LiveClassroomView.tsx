/**
 * Live Classroom View Component
 *
 * Real-time grid/list view of all students with:
 * - Color-coded status indicators
 * - Student activity cards
 * - Alert banner
 * - Quick actions
 */

'use client';

import * as React from 'react';
import { AlertCircle, RefreshCw, Users, TrendingUp } from 'lucide-react';

import type { StudentStatus, Alert, ClassroomMetrics } from '@/hooks/useClassroomMonitor';
import { cn } from '@/lib/utils';

import { StudentActivityCard } from './StudentActivityCard';

interface LiveClassroomViewProps {
  students: Map<string, StudentStatus>;
  metrics: ClassroomMetrics | null;
  alerts: Alert[];
  isConnected: boolean;
  isLoading: boolean;
  onStudentClick?: (studentId: string) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onSendIntervention: (studentId: string, type: string, message?: string) => void;
  onRefresh: () => void;
  className?: string;
}

export function LiveClassroomView({
  students,
  metrics,
  alerts,
  isConnected,
  isLoading,
  onStudentClick,
  onAcknowledgeAlert,
  onSendIntervention,
  onRefresh,
  className,
}: LiveClassroomViewProps) {
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = React.useState<string | null>(null);

  // Get unacknowledged urgent alerts
  const urgentAlerts = alerts.filter((a) => a.priority === 'urgent' && !a.acknowledged);

  // Filter students
  const filteredStudents = React.useMemo(() => {
    const studentsArray = Array.from(students.values());

    if (!filterStatus) {
      return studentsArray;
    }

    return studentsArray.filter((s) => s.focusState === filterStatus);
  }, [students, filterStatus]);

  // Sort by priority: help requested, struggling, frustrated, focused, idle
  const sortedStudents = React.useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      const priority: Record<string, number> = {
        help_requested: 0,
        frustrated: 1,
        struggling: 2,
        off_task: 3,
        idle: 4,
        focused: 5,
      };
      return priority[a.focusState] - priority[b.focusState];
    });
  }, [filteredStudents]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header with connection status and metrics */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Live Classroom</h2>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            <span className="text-sm text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick metrics */}
          {metrics && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{metrics.activeStudents}</span>
                <span className="text-gray-500">/ {metrics.totalStudents} active</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{Math.round(metrics.averageProgress)}%</span>
                <span className="text-gray-500">avg progress</span>
              </div>
            </>
          )}

          {/* View mode toggle */}
          <div className="flex rounded-lg border bg-white">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-3 py-1.5 text-sm',
                viewMode === 'grid'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 text-sm',
                viewMode === 'list'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              List
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="rounded-lg border bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Urgent alerts banner */}
      {urgentAlerts.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">
                {urgentAlerts.length} Student{urgentAlerts.length > 1 ? 's' : ''} Need Attention
              </h3>
              <div className="mt-2 space-y-2">
                {urgentAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium text-red-800">{alert.studentName}:</span>{' '}
                      <span className="text-red-700">{alert.message}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onStudentClick?.(alert.studentId)}
                        className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                      >
                        View
                      </button>
                      <button
                        onClick={() => onAcknowledgeAlert(alert.id)}
                        className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-100"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
                {urgentAlerts.length > 3 && (
                  <p className="text-sm text-red-700">
                    +{urgentAlerts.length - 3} more alerts
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterStatus(null)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm',
            filterStatus === null
              ? 'bg-gray-900 text-white'
              : 'border bg-white text-gray-600 hover:bg-gray-50'
          )}
        >
          All ({students.size})
        </button>
        {metrics && (
          <>
            <button
              onClick={() => setFilterStatus('focused')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm',
                filterStatus === 'focused'
                  ? 'bg-green-600 text-white'
                  : 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
              )}
            >
              Focused ({metrics.focusDistribution.focused || 0})
            </button>
            <button
              onClick={() => setFilterStatus('struggling')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm',
                filterStatus === 'struggling'
                  ? 'bg-yellow-600 text-white'
                  : 'border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              )}
            >
              Struggling ({metrics.focusDistribution.struggling || 0})
            </button>
            <button
              onClick={() => setFilterStatus('help_requested')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm',
                filterStatus === 'help_requested'
                  ? 'bg-red-600 text-white'
                  : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
              )}
            >
              Help Needed ({metrics.focusDistribution.help_requested || 0})
            </button>
            <button
              onClick={() => setFilterStatus('idle')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm',
                filterStatus === 'idle'
                  ? 'bg-gray-600 text-white'
                  : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              )}
            >
              Idle ({metrics.focusDistribution.idle || 0})
            </button>
          </>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sortedStudents.length === 0 && (
        <div className="rounded-xl border bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No active students</h3>
          <p className="mt-2 text-sm text-gray-500">
            Students will appear here when they start learning activities
          </p>
        </div>
      )}

      {/* Student grid/list */}
      {!isLoading && sortedStudents.length > 0 && (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'flex flex-col gap-3'
          )}
        >
          {sortedStudents.map((student) => (
            <StudentActivityCard
              key={student.studentId}
              student={student}
              onClick={() => onStudentClick?.(student.studentId)}
              onSendIntervention={(type, message) =>
                onSendIntervention(student.studentId, type, message)
              }
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
