/**
 * Student SEL Card Component
 *
 * Displays SEL status for an individual student.
 * Based on StudentSELDetailView from aivo-agentic-ai-platform.
 */

'use client';

import { cn } from '@/lib/utils';

export interface StudentSELData {
  studentId: string;
  studentName: string;
  avatar?: string;
  overallScore: number;
  trend: 'up' | 'down' | 'stable';
  domains: {
    id: string;
    name: string;
    score: number;
  }[];
  recentObservations: number;
  needsSupport: boolean;
  supportAreas: string[];
  lastCheckIn?: string;
}

interface StudentSELCardProps {
  student: StudentSELData;
  onViewDetails?: () => void;
  onRecordObservation?: () => void;
  compact?: boolean;
}

export function StudentSELCard({
  student,
  onViewDetails,
  onRecordObservation,
  compact = false,
}: StudentSELCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-error';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span className="text-success text-xs">↑</span>;
      case 'down':
        return <span className="text-error text-xs">↓</span>;
      default:
        return <span className="text-muted text-xs">→</span>;
    }
  };

  const initials = student.studentName
    .split(' ')
    .map((n) => n[0])
    .join('');

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm',
          student.needsSupport ? 'border-warning bg-warning/5' : 'border-border'
        )}
        onClick={onViewDetails}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-text truncate">{student.studentName}</p>
            {student.needsSupport && (
              <span className="text-warning text-xs">⚠️</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>{student.recentObservations} observations</span>
            {student.lastCheckIn && (
              <>
                <span>·</span>
                <span>Last: {formatRelativeTime(student.lastCheckIn)}</span>
              </>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1">
          <span className={cn('text-lg font-bold', getScoreColor(student.overallScore))}>
            {student.overallScore}
          </span>
          {getTrendIcon(student.trend)}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-surface p-4 transition-all',
        student.needsSupport ? 'border-warning' : 'border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium text-primary">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-text">{student.studentName}</p>
              {student.needsSupport && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                  Needs Support
                </span>
              )}
            </div>
            <p className="text-sm text-muted">
              {student.recentObservations} observations this week
            </p>
          </div>
        </div>

        {/* Overall Score */}
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <span className={cn('text-2xl font-bold', getScoreColor(student.overallScore))}>
              {student.overallScore}
            </span>
            {getTrendIcon(student.trend)}
          </div>
          <p className="text-xs text-muted">SEL Score</p>
        </div>
      </div>

      {/* Domain Bars */}
      <div className="space-y-2 mb-4">
        {student.domains.map((domain) => (
          <div key={domain.id} className="flex items-center gap-2">
            <span className="text-xs text-muted w-24 truncate">{domain.name.split(' ')[0]}</span>
            <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', getScoreBgColor(domain.score))}
                style={{ width: `${domain.score}%` }}
              />
            </div>
            <span className={cn('text-xs font-medium w-8 text-right', getScoreColor(domain.score))}>
              {domain.score}
            </span>
          </div>
        ))}
      </div>

      {/* Support Areas */}
      {student.needsSupport && student.supportAreas.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-warning/5 border border-warning/20">
          <p className="text-xs font-medium text-warning mb-2">Focus Areas:</p>
          <div className="flex flex-wrap gap-1">
            {student.supportAreas.map((area) => (
              <span
                key={area}
                className="text-xs px-2 py-1 rounded bg-warning/10 text-warning"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onRecordObservation && (
          <button
            onClick={onRecordObservation}
            className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-text hover:bg-surface-muted transition-colors"
          >
            📝 Record Observation
          </button>
        )}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="flex-1 py-2 rounded-lg bg-primary text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default StudentSELCard;
