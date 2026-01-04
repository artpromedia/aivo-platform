/**
 * Student Activity Card Component
 *
 * Individual student card showing:
 * - Current activity and progress
 * - Focus state with color coding
 * - Time on task
 * - Quick action buttons
 */

'use client';

import * as React from 'react';
import {
  Clock,
  Activity,
  TrendingUp,
  MessageCircle,
  Coffee,
  AlertTriangle,
  Heart,
} from 'lucide-react';

import type { StudentStatus } from '@/hooks/useClassroomMonitor';
import { cn } from '@/lib/utils';

interface StudentActivityCardProps {
  student: StudentStatus;
  onClick?: () => void;
  onSendIntervention: (type: string, message?: string) => void;
  compact?: boolean;
  className?: string;
}

export function StudentActivityCard({
  student,
  onClick,
  onSendIntervention,
  compact = false,
  className,
}: StudentActivityCardProps) {
  const [showActions, setShowActions] = React.useState(false);

  // Get color based on focus state
  const getStatusColor = (state: StudentStatus['focusState']) => {
    switch (state) {
      case 'focused':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'idle':
        return 'bg-gray-50 border-gray-200 text-gray-700';
      case 'struggling':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'frustrated':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'help_requested':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'off_task':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  // Get status badge color
  const getBadgeColor = (state: StudentStatus['focusState']) => {
    switch (state) {
      case 'focused':
        return 'bg-green-500';
      case 'idle':
        return 'bg-gray-400';
      case 'struggling':
        return 'bg-yellow-500';
      case 'frustrated':
        return 'bg-orange-500';
      case 'help_requested':
        return 'bg-red-500 animate-pulse';
      case 'off_task':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) {
      return `${mins}m`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // Get status label
  const getStatusLabel = (state: StudentStatus['focusState']) => {
    switch (state) {
      case 'focused':
        return 'Focused';
      case 'idle':
        return 'Idle';
      case 'struggling':
        return 'Struggling';
      case 'frustrated':
        return 'Frustrated';
      case 'help_requested':
        return 'Help Needed';
      case 'off_task':
        return 'Off Task';
      default:
        return state;
    }
  };

  if (compact) {
    // Compact list view
    return (
      <div
        className={cn(
          'flex cursor-pointer items-center gap-4 rounded-lg border-2 p-4 transition-all hover:shadow-md',
          getStatusColor(student.focusState),
          className
        )}
        onClick={onClick}
      >
        {/* Status indicator */}
        <div className={cn('h-3 w-3 rounded-full', getBadgeColor(student.focusState))} />

        {/* Student info */}
        <div className="flex-1">
          <h3 className="font-medium">{student.studentName}</h3>
          <p className="text-sm opacity-75">{student.currentActivity || 'No activity'}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-white/50">
            <div
              className="h-full bg-current transition-all"
              style={{ width: `${student.progress}%` }}
            />
          </div>
          <span className="text-sm font-medium">{Math.round(student.progress)}%</span>
        </div>

        {/* Time on task */}
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-4 w-4" />
          <span>{formatTime(student.timeOnTask)}</span>
        </div>

        {/* Quick actions */}
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSendIntervention('encouragement');
            }}
            className="rounded p-2 hover:bg-white/50"
            title="Send encouragement"
          >
            <Heart className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSendIntervention('chat');
            }}
            className="rounded p-2 hover:bg-white/50"
            title="Start chat"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Grid card view
  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-lg',
        getStatusColor(student.focusState),
        className
      )}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Status badge */}
      <div className="absolute right-3 top-3">
        <div className={cn('h-3 w-3 rounded-full', getBadgeColor(student.focusState))} />
      </div>

      {/* Student name */}
      <h3 className="mb-3 pr-8 text-lg font-semibold">{student.studentName}</h3>

      {/* Status label */}
      <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-white/50 px-2.5 py-1 text-xs font-medium">
        <Activity className="h-3 w-3" />
        {getStatusLabel(student.focusState)}
      </div>

      {/* Current activity */}
      <div className="mb-3">
        <p className="text-sm font-medium opacity-75">
          {student.currentActivity || 'No current activity'}
        </p>
        {student.metadata?.currentSkill && (
          <p className="text-xs opacity-60">Skill: {student.metadata.currentSkill}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="opacity-75">Progress</span>
          <span className="font-medium">{Math.round(student.progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/50">
          <div
            className="h-full bg-current transition-all"
            style={{ width: `${student.progress}%` }}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatTime(student.timeOnTask)}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          <span>{Math.round(student.successRate)}% correct</span>
        </div>
      </div>

      {/* Metadata */}
      {student.metadata?.questionNumber && (
        <div className="mb-3 text-xs opacity-75">
          Question {student.metadata.questionNumber} / {student.metadata.totalQuestions || '?'}
          {student.metadata.attemptsOnCurrentQuestion && student.metadata.attemptsOnCurrentQuestion > 1 && (
            <span className="ml-1 text-orange-600">
              ({student.metadata.attemptsOnCurrentQuestion} attempts)
            </span>
          )}
        </div>
      )}

      {/* Warnings */}
      {student.idleTime > 180 && (
        <div className="mb-3 flex items-center gap-1 text-xs text-orange-600">
          <AlertTriangle className="h-3 w-3" />
          <span>Idle for {Math.floor(student.idleTime / 60)}m</span>
        </div>
      )}

      {/* Quick actions (shown on hover) */}
      {showActions && (
        <div className="absolute inset-x-0 bottom-0 flex gap-1 rounded-b-xl bg-gradient-to-t from-black/10 p-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSendIntervention('encouragement');
            }}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs font-medium shadow-sm hover:bg-gray-50"
            title="Send encouragement"
          >
            <Heart className="h-3 w-3" />
            Encourage
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSendIntervention('break_suggestion');
            }}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs font-medium shadow-sm hover:bg-gray-50"
            title="Suggest break"
          >
            <Coffee className="h-3 w-3" />
            Break
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSendIntervention('chat');
            }}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs font-medium shadow-sm hover:bg-gray-50"
            title="Start chat"
          >
            <MessageCircle className="h-3 w-3" />
            Chat
          </button>
        </div>
      )}
    </div>
  );
}
