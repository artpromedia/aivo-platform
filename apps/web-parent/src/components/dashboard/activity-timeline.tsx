'use client';

import { useState } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import {
  BookOpen,
  Play,
  CheckCircle,
  Star,
  Trophy,
  Target,
  Clock,
  Filter,
  ChevronRight,
  Gamepad2,
  PenTool,
  GraduationCap,
} from 'lucide-react';

export type ActivityType =
  | 'lesson_started'
  | 'lesson_completed'
  | 'quiz_completed'
  | 'achievement_earned'
  | 'milestone_reached'
  | 'game_played'
  | 'practice_session'
  | 'assessment_completed';

export interface TimelineActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  subject?: string;
  subjectColor?: string;
  score?: number;
  duration?: number; // in minutes
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface ActivityTimelineProps {
  activities: TimelineActivity[];
  maxItems?: number;
  showFilters?: boolean;
  onActivityClick?: (activity: TimelineActivity) => void;
  onViewAll?: () => void;
}

const activityConfig: Record<ActivityType, { icon: typeof BookOpen; color: string; bgColor: string }> = {
  lesson_started: {
    icon: Play,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  lesson_completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  quiz_completed: {
    icon: Target,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  achievement_earned: {
    icon: Trophy,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  milestone_reached: {
    icon: Star,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  game_played: {
    icon: Gamepad2,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  practice_session: {
    icon: PenTool,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
  assessment_completed: {
    icon: GraduationCap,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
};

const subjectColors: Record<string, string> = {
  math: 'bg-blue-500',
  reading: 'bg-green-500',
  science: 'bg-purple-500',
  writing: 'bg-amber-500',
  'social studies': 'bg-rose-500',
  art: 'bg-pink-500',
  music: 'bg-indigo-500',
};

function getDateLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}

function groupActivitiesByDate(activities: TimelineActivity[]): Map<string, TimelineActivity[]> {
  const groups = new Map<string, TimelineActivity[]>();

  activities.forEach(activity => {
    const label = getDateLabel(activity.timestamp);
    const existing = groups.get(label) || [];
    groups.set(label, [...existing, activity]);
  });

  return groups;
}

export function ActivityTimeline({
  activities,
  maxItems = 15,
  showFilters = true,
  onActivityClick,
  onViewAll,
}: ActivityTimelineProps) {
  const [selectedFilter, setSelectedFilter] = useState<ActivityType | 'all'>('all');

  const filteredActivities = activities
    .filter(a => selectedFilter === 'all' || a.type === selectedFilter)
    .slice(0, maxItems);

  const groupedActivities = groupActivitiesByDate(filteredActivities);

  const filters: { value: ActivityType | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'lesson_completed', label: 'Lessons' },
    { value: 'quiz_completed', label: 'Quizzes' },
    { value: 'achievement_earned', label: 'Achievements' },
    { value: 'game_played', label: 'Games' },
  ];

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
        </div>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No learning activities yet.</p>
          <p className="text-sm text-gray-400 mt-1">Activities will appear here as your child learns.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
          <span className="text-sm text-gray-500">
            {activities.length} activities
          </span>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {filters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedFilter === filter.value
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        {Array.from(groupedActivities.entries()).map(([dateLabel, dayActivities]) => (
          <div key={dateLabel}>
            <h3 className="text-sm font-medium text-gray-500 mb-3">{dateLabel}</h3>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-4">
                {dayActivities.map((activity, index) => {
                  const config = activityConfig[activity.type];
                  const Icon = config.icon;
                  const subjectColor = activity.subject
                    ? subjectColors[activity.subject.toLowerCase()] || 'bg-gray-500'
                    : null;

                  return (
                    <div
                      key={activity.id}
                      className="relative flex gap-4 cursor-pointer group"
                      onClick={() => onActivityClick?.(activity)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onActivityClick?.(activity);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                    >
                      {/* Icon */}
                      <div
                        className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}
                      >
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 bg-gray-50 rounded-lg p-3 transition-colors group-hover:bg-gray-100">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {subjectColor && (
                                <span className={`w-2 h-2 rounded-full ${subjectColor}`} />
                              )}
                              <span className="text-xs text-gray-500 uppercase tracking-wide">
                                {activity.subject || activity.type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 text-sm">{activity.title}</h4>
                            <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs text-gray-400">
                              {format(new Date(activity.timestamp), 'h:mm a')}
                            </span>
                            {activity.score !== undefined && (
                              <div className="mt-1">
                                <span
                                  className={`text-sm font-semibold ${
                                    activity.score >= 80
                                      ? 'text-green-600'
                                      : activity.score >= 60
                                      ? 'text-amber-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {activity.score}%
                                </span>
                              </div>
                            )}
                            {activity.duration && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1 justify-end">
                                <Clock className="w-3 h-3" />
                                {activity.duration}m
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show more indicator */}
      {activities.length > maxItems && (
        <div className="mt-6 text-center">
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Show {activities.length - maxItems} more activities
          </button>
        </div>
      )}
    </div>
  );
}
