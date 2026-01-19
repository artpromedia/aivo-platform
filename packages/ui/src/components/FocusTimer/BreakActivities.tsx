'use client';

import { cn } from '../../utils';
import type { BreakActivitiesProps, BreakActivity } from './types';

const BREAK_ACTIVITIES: BreakActivity[] = [
  {
    id: 'breathing',
    type: 'breathing',
    emoji: '🎈',
    title: 'Balloon Breath',
    description: 'Deep breathing exercise to relax',
  },
  {
    id: 'stretch',
    type: 'movement',
    emoji: '🧘',
    title: 'Quick Stretch',
    description: 'Stretch your arms and legs',
  },
  {
    id: 'mindful',
    type: 'mindful',
    emoji: '🌟',
    title: 'Mindful Moment',
    description: 'Close your eyes and relax',
  },
  {
    id: 'movement',
    type: 'movement',
    emoji: '💃',
    title: 'Dance Break',
    description: 'Get moving and shake it out!',
  },
];

/**
 * BreakActivities Component
 *
 * Displays break activity options after a focus session completes.
 */
export function BreakActivities({
  onSelect,
  onSkip,
  className,
}: BreakActivitiesProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-teal-50 p-6',
        className
      )}
    >
      <div className="mb-4 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          🎉
        </div>
        <h3 className="text-xl font-bold text-green-800">
          Great focus session!
        </h3>
        <p className="mt-1 text-sm text-green-700">
          Time for a break! Choose an activity:
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {BREAK_ACTIVITIES.map((activity) => (
          <button
            key={activity.id}
            onClick={() => onSelect(activity.type)}
            className="rounded-xl bg-white p-4 text-left shadow-sm transition hover:shadow-md hover:ring-2 hover:ring-green-300"
          >
            <div className="mb-2 text-2xl">{activity.emoji}</div>
            <div className="font-medium text-slate-900">{activity.title}</div>
            <div className="text-xs text-slate-500">{activity.description}</div>
          </button>
        ))}
      </div>

      <button
        onClick={onSkip}
        className="mt-4 w-full rounded-lg py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        Skip break →
      </button>
    </div>
  );
}
