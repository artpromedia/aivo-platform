/**
 * Timeline View Component
 * Sprint 1.7: Connect Web Parent Reports to Real APIs
 *
 * Interactive timeline showing student activity history.
 * Displays daily summaries with expandable activity details.
 */

'use client';

import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  PlayCircle,
  BookOpen,
  PenTool,
  Trophy,
  Star,
  Target,
  Filter,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useState, useMemo } from 'react';

import type { ActivityTimeline, TimelineActivity, DailySummary } from '@/lib/api/reports.api';

interface TimelineViewProps {
  timeline: ActivityTimeline;
  _onDateSelect?: (date: string) => void;
}

interface DayViewProps {
  summary: DailySummary;
  activities: TimelineActivity[];
  isExpanded: boolean;
  onToggle: () => void;
}

// Activity types from the API
type ActivityType = TimelineActivity['type'];

/**
 * Get icon for activity type
 */
function getActivityIcon(type: ActivityType) {
  switch (type) {
    case 'lesson':
      return <BookOpen className="w-4 h-4" />;
    case 'quiz':
      return <PenTool className="w-4 h-4" />;
    case 'practice':
      return <Target className="w-4 h-4" />;
    case 'achievement':
      return <Trophy className="w-4 h-4" />;
    case 'assignment':
      return <Star className="w-4 h-4" />;
    default:
      return <PlayCircle className="w-4 h-4" />;
  }
}

/**
 * Get color classes for activity type
 */
function getActivityColors(type: ActivityType): { bg: string; text: string; border: string } {
  switch (type) {
    case 'lesson':
      return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
    case 'quiz':
      return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' };
    case 'practice':
      return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' };
    case 'achievement':
      return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
    case 'assignment':
      return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): { day: string; weekday: string; month: string } {
  const date = new Date(dateStr);
  return {
    day: date.getDate().toString(),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
  };
}

/**
 * Check if date is today
 */
function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Individual activity item
 */
function ActivityItem({ activity }: { activity: TimelineActivity }) {
  const colors = getActivityColors(activity.type);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg ${colors.bg} border ${colors.border}`}
    >
      <div className={`p-2 rounded-lg bg-white ${colors.text} shadow-sm`}>
        {getActivityIcon(activity.type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
            {activity.details && (
              <p className="text-xs text-gray-500 mt-0.5">{activity.details}</p>
            )}
          </div>
          {activity.score !== undefined && (
            <span
              className={`text-sm font-bold ${activity.score >= 70 ? 'text-green-600' : activity.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}
            >
              {activity.score}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          {activity.duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {activity.duration} min
            </span>
          )}
          {activity.subject && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {activity.subject}
            </span>
          )}
          <span className="text-gray-400">
            {new Date(activity.timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Day summary with expandable activities
 */
function DayView({ summary, activities, isExpanded, onToggle }: DayViewProps) {
  const dateInfo = formatDate(summary.date);
  const today = isToday(summary.date);

  return (
    <div
      className={`relative pl-16 pb-8 ${activities.length > 0 ? 'cursor-pointer' : ''}`}
      onClick={activities.length > 0 ? onToggle : undefined}
    >
      {/* Timeline line */}
      <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gray-100" />

      {/* Date marker */}
      <div
        className={`absolute left-0 w-14 text-center ${
          today
            ? 'bg-indigo-600 text-white rounded-lg py-1'
            : 'bg-white border border-gray-200 rounded-lg py-1'
        }`}
      >
        <p className={`text-xs ${today ? 'text-indigo-200' : 'text-gray-500'}`}>{dateInfo.weekday}</p>
        <p className={`text-lg font-bold ${today ? '' : 'text-gray-900'}`}>{dateInfo.day}</p>
        <p className={`text-xs ${today ? 'text-indigo-200' : 'text-gray-500'}`}>{dateInfo.month}</p>
      </div>

      {/* Day content */}
      <div className="ml-4">
        {/* Summary header */}
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
            isExpanded
              ? 'bg-indigo-50 border-indigo-200'
              : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-900">
                {summary.lessonsCompleted} lessons completed
              </span>
              {today && (
                <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Today</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {summary.totalTime} min
              </span>
              {summary.averageScore !== undefined && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Avg: {summary.averageScore}%
                </span>
              )}
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {summary.quizzesTaken} quizzes
              </span>
            </div>
          </div>

          {activities.length > 0 && (
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xs">{activities.length} activities</span>
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
          )}
        </div>

        {/* Expanded activities */}
        {isExpanded && activities.length > 0 && (
          <div className="mt-3 space-y-2" onClick={(e) => { e.stopPropagation(); }}>
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Activity type filter chips
 */
function ActivityFilters({
  selectedTypes,
  onToggle,
}: {
  selectedTypes: Set<ActivityType>;
  onToggle: (type: ActivityType) => void;
}) {
  const types: ActivityType[] = ['lesson', 'quiz', 'assignment', 'achievement', 'practice'];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="w-4 h-4 text-gray-400" />
      {types.map((type) => {
        const colors = getActivityColors(type);
        const isSelected = selectedTypes.has(type);
        return (
          <button
            key={type}
            onClick={() => { onToggle(type); }}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              isSelected
                ? `${colors.bg} ${colors.text} border ${colors.border}`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Main Timeline View Component
 */
export function TimelineView({ timeline }: TimelineViewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<ActivityType>>(
    new Set(['lesson', 'quiz', 'assignment', 'achievement', 'practice'] as ActivityType[])
  );
  const [currentWeek, setCurrentWeek] = useState(0);

  // Group activities by date
  const activitiesByDate = useMemo(() => {
    const grouped = new Map<string, TimelineActivity[]>();
    timeline.activities
      .filter((a) => selectedTypes.has(a.type))
      .forEach((activity) => {
        const date = activity.timestamp.split('T')[0];
        if (!grouped.has(date)) {
          grouped.set(date, []);
        }
        grouped.get(date)!.push(activity);
      });
    return grouped;
  }, [timeline.activities, selectedTypes]);

  // Paginate daily summaries (7 days per page)
  const paginatedSummaries = useMemo(() => {
    const sorted = [...timeline.dailySummary].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const start = currentWeek * 7;
    return sorted.slice(start, start + 7);
  }, [timeline.dailySummary, currentWeek]);

  const totalPages = Math.ceil(timeline.dailySummary.length / 7);

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const toggleType = (type: ActivityType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (!timeline.activities || timeline.activities.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No activity recorded</p>
        <p className="text-sm text-gray-400 mt-1">Activities will appear here as they happen</p>
      </div>
    );
  }

  // Calculate summary stats
  const totalTimeSpent = timeline.dailySummary.reduce((sum, d) => sum + d.totalTime, 0);
  const totalLessons = timeline.dailySummary.reduce((sum, d) => sum + d.lessonsCompleted, 0);
  const avgScores = timeline.dailySummary.filter(d => d.averageScore !== undefined);
  const averageScore = avgScores.length > 0
    ? Math.round(avgScores.reduce((sum, d) => sum + (d.averageScore || 0), 0) / avgScores.length)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Activity Timeline
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCurrentWeek((w) => Math.min(w + 1, totalPages - 1)); }}
              disabled={currentWeek >= totalPages - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500">
              Week {currentWeek + 1} of {totalPages}
            </span>
            <button
              onClick={() => { setCurrentWeek((w) => Math.max(w - 1, 0)); }}
              disabled={currentWeek <= 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <ActivityFilters selectedTypes={selectedTypes} onToggle={toggleType} />
      </div>

      {/* Timeline */}
      <div className="p-6">
        {paginatedSummaries.length > 0 ? (
          paginatedSummaries.map((summary) => (
            <DayView
              key={summary.date}
              summary={summary}
              activities={activitiesByDate.get(summary.date) || []}
              isExpanded={expandedDays.has(summary.date)}
              onToggle={() => { toggleDay(summary.date); }}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No activities for this period
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="p-6 bg-gray-50 border-t border-gray-100">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{timeline.totalActivities}</p>
            <p className="text-sm text-gray-500">Total Activities</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalLessons}</p>
            <p className="text-sm text-gray-500">Lessons</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(totalTimeSpent / 60)}h
            </p>
            <p className="text-sm text-gray-500">Time Spent</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{averageScore}%</p>
            <p className="text-sm text-gray-500">Avg Score</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact timeline for dashboard widgets
 */
export function CompactTimeline({ activities }: { activities: TimelineActivity[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        No recent activity
      </div>
    );
  }

  // Show only the most recent 5 activities
  const recentActivities = activities.slice(0, 5);

  return (
    <div className="space-y-3">
      {recentActivities.map((activity) => {
        const colors = getActivityColors(activity.type);
        return (
          <div key={activity.id} className="flex items-center gap-3">
            <div className={`p-1.5 rounded ${colors.bg} ${colors.text}`}>
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
              <p className="text-xs text-gray-500">
                {new Date(activity.timestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
            {activity.score !== undefined && (
              <span
                className={`text-sm font-medium ${
                  activity.score >= 70 ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {activity.score}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default TimelineView;
