/**
 * Classroom Heatmap Component
 *
 * Visual heatmap of classroom engagement over time:
 * - Timeline-based engagement visualization
 * - Pattern identification (e.g., class loses focus after 20 mins)
 * - Interactive tooltips
 * - Time range selection
 */

'use client';

import * as React from 'react';
import { TrendingDown, TrendingUp, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EngagementPattern {
  timestamp: Date;
  activeCount: number;
  focusedCount: number;
  strugglingCount: number;
  idleCount: number;
}

interface ClassroomHeatmapProps {
  classroomId: string;
  patterns: EngagementPattern[];
  className?: string;
}

export function ClassroomHeatmap({ classroomId, patterns, className }: ClassroomHeatmapProps) {
  const [timeRange, setTimeRange] = React.useState<'1h' | '3h' | '6h' | 'today'>('3h');
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  // Filter patterns by time range
  const filteredPatterns = React.useMemo(() => {
    const now = new Date();
    let cutoff: Date;

    switch (timeRange) {
      case '1h':
        cutoff = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '3h':
        cutoff = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        break;
      case '6h':
        cutoff = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case 'today':
        cutoff = new Date(now);
        cutoff.setHours(0, 0, 0, 0);
        break;
      default:
        cutoff = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    }

    return patterns.filter((p) => p.timestamp >= cutoff);
  }, [patterns, timeRange]);

  // Calculate engagement score (0-100)
  const getEngagementScore = (pattern: EngagementPattern): number => {
    if (pattern.activeCount === 0) return 0;

    const focusedRatio = pattern.focusedCount / pattern.activeCount;
    const strugglingRatio = pattern.strugglingCount / pattern.activeCount;
    const idleRatio = pattern.idleCount / pattern.activeCount;

    // Weighted score: focused is good, struggling is neutral, idle is bad
    return Math.round(focusedRatio * 100 - idleRatio * 50 - strugglingRatio * 25);
  };

  // Get color based on engagement score
  const getHeatColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-green-400';
    if (score >= 40) return 'bg-yellow-400';
    if (score >= 20) return 'bg-orange-400';
    return 'bg-red-400';
  };

  // Calculate insights
  const insights = React.useMemo(() => {
    if (filteredPatterns.length < 3) return null;

    const scores = filteredPatterns.map(getEngagementScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Find engagement drops
    const drops: Array<{ time: Date; drop: number }> = [];
    for (let i = 1; i < scores.length; i++) {
      const drop = scores[i - 1] - scores[i];
      if (drop >= 20) {
        drops.push({ time: filteredPatterns[i].timestamp, drop });
      }
    }

    // Find best time
    let bestScore = -1;
    let bestTime: Date | null = null;
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > bestScore) {
        bestScore = scores[i];
        bestTime = filteredPatterns[i].timestamp;
      }
    }

    return {
      avgScore: Math.round(avgScore),
      drops,
      bestTime,
      bestScore,
    };
  }, [filteredPatterns]);

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Format duration
  const formatDuration = (date: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m ago`;
  };

  if (filteredPatterns.length === 0) {
    return (
      <div className={cn('rounded-xl border bg-white p-6', className)}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Engagement Timeline</h3>
        <div className="py-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            No engagement data available for selected time range
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border bg-white p-6', className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Engagement Timeline</h3>

        {/* Time range selector */}
        <div className="flex rounded-lg border bg-gray-50">
          {(['1h', '3h', '6h', 'today'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1 text-sm',
                timeRange === range
                  ? 'bg-white font-medium text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {range === 'today' ? 'Today' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Insights */}
      {insights && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs text-blue-600">Average Engagement</p>
            <p className="text-2xl font-bold text-blue-900">{insights.avgScore}%</p>
          </div>

          {insights.bestTime && (
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-green-600">Peak Engagement</p>
              <p className="text-lg font-bold text-green-900">
                {formatTime(insights.bestTime)}
              </p>
              <p className="text-xs text-green-600">{insights.bestScore}%</p>
            </div>
          )}

          {insights.drops.length > 0 && (
            <div className="rounded-lg bg-orange-50 p-3">
              <p className="text-xs text-orange-600">Engagement Drops</p>
              <p className="text-2xl font-bold text-orange-900">{insights.drops.length}</p>
            </div>
          )}
        </div>
      )}

      {/* Heatmap */}
      <div className="relative mb-4">
        <div className="flex gap-1">
          {filteredPatterns.map((pattern, index) => {
            const score = getEngagementScore(pattern);
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={index}
                className="relative flex-1"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className={cn(
                    'h-24 cursor-pointer rounded-sm transition-all',
                    getHeatColor(score),
                    isHovered && 'ring-2 ring-gray-900'
                  )}
                  style={{
                    opacity: 0.4 + (score / 100) * 0.6,
                  }}
                />

                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg border bg-white p-3 shadow-lg">
                    <p className="mb-2 whitespace-nowrap text-xs font-medium text-gray-900">
                      {formatTime(pattern.timestamp)}
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-600">Active:</span>
                        <span className="font-medium">{pattern.activeCount}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-600">Focused:</span>
                        <span className="font-medium text-green-600">{pattern.focusedCount}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-600">Struggling:</span>
                        <span className="font-medium text-yellow-600">
                          {pattern.strugglingCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-600">Idle:</span>
                        <span className="font-medium text-gray-500">{pattern.idleCount}</span>
                      </div>
                      <div className="mt-2 border-t pt-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-gray-600">Score:</span>
                          <span className="font-bold">{score}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time labels */}
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>{formatTime(filteredPatterns[0].timestamp)}</span>
          <span>{formatTime(filteredPatterns[filteredPatterns.length - 1].timestamp)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-green-500" />
            <span className="text-gray-600">High (80%+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-yellow-400" />
            <span className="text-gray-600">Medium (40-80%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-red-400" />
            <span className="text-gray-600">Low (&lt;40%)</span>
          </div>
        </div>

        {/* Trend indicator */}
        {filteredPatterns.length >= 2 && (
          <div className="flex items-center gap-1 text-xs">
            {getEngagementScore(filteredPatterns[filteredPatterns.length - 1]) >
            getEngagementScore(filteredPatterns[0]) ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-600">Trending up</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-600">Trending down</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Engagement drop alerts */}
      {insights && insights.drops.length > 0 && (
        <div className="mt-4 rounded-lg bg-orange-50 p-3">
          <p className="mb-2 text-sm font-medium text-orange-900">Engagement Drops Detected</p>
          <ul className="space-y-1 text-xs text-orange-700">
            {insights.drops.slice(0, 3).map((drop, i) => (
              <li key={i}>
                {formatTime(drop.time)} - {Math.round(drop.drop)}% decrease ({formatDuration(drop.time)})
              </li>
            ))}
          </ul>
          {insights.drops.length > 3 && (
            <p className="mt-2 text-xs text-orange-600">+{insights.drops.length - 3} more</p>
          )}
        </div>
      )}
    </div>
  );
}
