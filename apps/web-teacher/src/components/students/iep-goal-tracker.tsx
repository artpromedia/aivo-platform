/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unused-vars */
/**
 * IEP Goal Tracker Component
 *
 * Track IEP goal progress with visual indicators
 */

'use client';

import * as React from 'react';

import type { IEPGoal, IEPProgressEntry, AddIEPProgressDto } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDate, getRelativeTime } from '@/lib/utils/date-utils';

interface IEPGoalTrackerProps {
  goals: IEPGoal[];
  onAddProgress?: (goalId: string, progress: AddIEPProgressDto) => Promise<void>;
  onViewDetails?: (goal: IEPGoal) => void;
  className?: string;
}

export function IEPGoalTracker({
  goals,
  onAddProgress,
  onViewDetails,
  className,
}: IEPGoalTrackerProps) {
  if (goals.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center">
        <span className="text-4xl">🎯</span>
        <p className="mt-2 text-gray-500">No IEP goals found</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {goals.map((goal) => (
        <IEPGoalCard
          key={goal.id}
          goal={goal}
          onAddProgress={onAddProgress}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}

interface IEPGoalCardProps {
  goal: IEPGoal;
  onAddProgress?: (goalId: string, progress: AddIEPProgressDto) => Promise<void>;
  onViewDetails?: (goal: IEPGoal) => void;
}

function IEPGoalCard({ goal, onAddProgress, onViewDetails }: IEPGoalCardProps) {
  const [showAddProgress, setShowAddProgress] = React.useState(false);
  const progressPercent = Math.min(100, (goal.currentProgress / goal.targetValue) * 100);
  const isOnTrack = goal.status === 'on-track';
  const isMastered = goal.status === 'mastered';

  return (
    <div className="rounded-xl border bg-white p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={goal.status} />
            <span className="text-sm text-gray-500">{goal.category}</span>
          </div>
          <h3 className="mt-1 font-medium text-gray-900">{goal.title}</h3>
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{goal.description}</p>
        </div>
        {onViewDetails && (
          <button
            onClick={() => {
              onViewDetails(goal);
            }}
            className="ml-3 text-sm text-primary-600 hover:underline"
          >
            Details
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium">
            {goal.currentProgress} / {goal.targetValue} {goal.unit}
          </span>
        </div>
        <div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn(
              'h-full transition-all',
              isMastered ? 'bg-green-500' : isOnTrack ? 'bg-primary-500' : 'bg-orange-500'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>Baseline: {goal.baseline}</span>
          <span>{progressPercent.toFixed(0)}%</span>
        </div>
      </div>

      {/* Mini Trend Chart */}
      {goal.progressHistory && goal.progressHistory.length > 1 && (
        <div className="mt-3">
          <MiniSparkline data={goal.progressHistory.map((p) => p.value)} />
        </div>
      )}

      {/* Timeline */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>Start: {formatDate(goal.startDate)}</span>
        <span>Target: {formatDate(goal.targetDate)}</span>
      </div>

      {/* Last Update */}
      {goal.progressHistory && goal.progressHistory.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Last update: {getRelativeTime(goal.progressHistory[goal.progressHistory.length - 1].date)}
        </div>
      )}

      {/* Add Progress */}
      {onAddProgress && (
        <div className="mt-3 border-t pt-3">
          {showAddProgress ? (
            <AddProgressForm
              goalId={goal.id}
              unit={goal.unit}
              onSubmit={async (progress) => {
                await onAddProgress(goal.id, progress);
                setShowAddProgress(false);
              }}
              onCancel={() => {
                setShowAddProgress(false);
              }}
            />
          ) : (
            <button
              onClick={() => {
                setShowAddProgress(true);
              }}
              className="w-full rounded-lg border border-dashed py-2 text-sm text-gray-500 hover:border-primary-500 hover:text-primary-600"
            >
              + Record Progress
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: IEPGoal['status'] }) {
  const styles = {
    'not-started': 'bg-gray-100 text-gray-600',
    'in-progress': 'bg-blue-100 text-blue-700',
    'on-track': 'bg-green-100 text-green-700',
    'at-risk': 'bg-orange-100 text-orange-700',
    mastered: 'bg-purple-100 text-purple-700',
    discontinued: 'bg-gray-100 text-gray-500',
  };

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', styles[status])}>
      {status.replace('-', ' ')}
    </span>
  );
}

function MiniSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 24;
  const width = 100;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="text-primary-500">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="3"
        fill="currentColor"
      />
    </svg>
  );
}

interface AddProgressFormProps {
  goalId: string;
  unit: string;
  onSubmit: (progress: AddIEPProgressDto) => Promise<void>;
  onCancel: () => void;
}

function AddProgressForm({ goalId, unit, onSubmit, onCancel }: AddProgressFormProps) {
  const [value, setValue] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) return;

    setLoading(true);
    try {
      await onSubmit({
        goalId,
        value: parseFloat(value),
        notes,
        date: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          placeholder="Value"
          className="w-24 rounded border px-2 py-1 text-sm"
          required
        />
        <span className="flex items-center text-sm text-gray-500">{unit}</span>
      </div>
      <input
        type="text"
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
        }}
        placeholder="Notes (optional)"
        className="w-full rounded border px-2 py-1 text-sm"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-2 py-1 text-sm hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !value}
          className="rounded bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
