'use client';

import { useState } from 'react';
import { type ClassroomFocusPatterns } from '@/lib/classroom-analytics';

interface FocusTabProps {
  data: ClassroomFocusPatterns;
}

export function FocusTab({ data }: FocusTabProps) {
  const [view, setView] = useState<'overview' | 'learners'>('overview');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Avg Breaks/Session"
          value={data.avgBreaksPerSession.toFixed(1)}
          subtitle="across all learners"
          icon="☕"
        />
        <SummaryCard
          title="Sessions w/ Focus Loss"
          value={data.sessionsWithFocusLoss}
          subtitle={`of ${data.totalSessions} total sessions`}
          icon="🎯"
          color={data.sessionsWithFocusLoss > data.totalSessions * 0.5 ? 'orange' : 'green'}
        />
        <SummaryCard
          title="Total Sessions"
          value={data.totalSessions}
          subtitle="this period"
          icon="📊"
        />
        <SummaryCard
          title="Total Learners"
          value={data.learnerMetrics.length}
          subtitle="with focus data"
          icon="👥"
        />
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'overview'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => setView('overview')}
        >
          Overview Charts
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'learners'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => setView('learners')}
        >
          By Learner
        </button>
      </div>

      {view === 'overview' ? (
        <OverviewCharts data={data} />
      ) : (
        <LearnerFocusTable learners={data.learnerMetrics} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW CHARTS
// ══════════════════════════════════════════════════════════════════════════════

function OverviewCharts({ data }: { data: ClassroomFocusPatterns }) {
  // Transform time-based patterns for charts
  const timeData = data.patternsByTime.map((pattern) => ({
    hour: pattern.hour,
    label: `${pattern.hour}:00`,
    avgBreaks: pattern.avgBreaks,
    focusLossCount: pattern.focusLossCount,
    sessionsCount: pattern.sessionsCount,
  }));

  const maxBreaks = Math.max(...timeData.map((d) => d.avgBreaks), 1);
  const maxFocusLoss = Math.max(...timeData.map((d) => d.focusLossCount), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Focus Breaks by Time of Day */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Avg Focus Breaks by Time of Day</h3>
        <div className="space-y-3">
          {timeData.map((d) => (
            <div key={d.hour} className="flex items-center gap-3">
              <span className="w-14 text-sm text-gray-500">{d.label}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all"
                  style={{ width: `${(d.avgBreaks / maxBreaks) * 100}%` }}
                />
              </div>
              <span className="w-12 text-sm text-gray-600 text-right">{d.avgBreaks.toFixed(1)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-gray-400">
          Focus breaks are healthy self-regulation moments
        </div>
      </div>

      {/* Focus Loss Events by Time of Day */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Focus Loss Events by Time of Day</h3>
        <div className="space-y-3">
          {timeData.map((d) => (
            <div key={d.hour} className="flex items-center gap-3">
              <span className="w-14 text-sm text-gray-500">{d.label}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full transition-all"
                  style={{ width: `${(d.focusLossCount / maxFocusLoss) * 100}%` }}
                />
              </div>
              <span className="w-12 text-sm text-gray-600 text-right">{d.focusLossCount}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-gray-400">
          Events where learner needed system-prompted focus recovery
        </div>
      </div>

      {/* Insights Panel */}
      <div className="lg:col-span-2 bg-blue-50 rounded-lg border border-blue-100 p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">📊 Classroom Insights</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          {generateInsights(data).map((insight, i) => (
            <li key={i}>• {insight}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function generateInsights(data: ClassroomFocusPatterns): string[] {
  const insights: string[] = [];

  // Analyze focus loss rate
  const focusLossRate = data.sessionsWithFocusLoss / Math.max(data.totalSessions, 1);
  if (focusLossRate < 0.3) {
    insights.push('Strong focus retention - most sessions complete without significant focus loss events');
  } else if (focusLossRate > 0.6) {
    insights.push('Higher than average focus loss events - consider reviewing session length or difficulty');
  }

  // Find peak focus break time
  const timePatterns = data.patternsByTime;
  if (timePatterns.length > 0) {
    const peakTime = timePatterns.reduce((a, b) => (a.avgBreaks > b.avgBreaks ? a : b));
    insights.push(`Most focus breaks taken around ${peakTime.hour}:00 (${peakTime.avgBreaks.toFixed(1)} avg)`);
  }

  // Avg breaks insight
  if (data.avgBreaksPerSession < 1) {
    insights.push('Learners are taking few focus breaks - encourage healthy self-regulation pauses');
  } else if (data.avgBreaksPerSession > 3) {
    insights.push('Higher focus break usage may indicate challenging content or learner fatigue');
  }

  return insights.length > 0 ? insights : ['Collecting more data for insights...'];
}

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER TABLE
// ══════════════════════════════════════════════════════════════════════════════

function LearnerFocusTable({ learners }: { learners: ClassroomFocusPatterns['learnerMetrics'] }) {
  const [sortBy, setSortBy] = useState<'name' | 'breaks' | 'loss'>('loss');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const sorted = [...learners].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'name':
        cmp = (a.learnerName ?? '').localeCompare(b.learnerName ?? '');
        break;
      case 'breaks':
        cmp = a.avgBreaksPerSession - b.avgBreaksPerSession;
        break;
      case 'loss':
        cmp = a.sessionsWithFocusLoss - b.sessionsWithFocusLoss;
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader label="Learner" field="name" current={sortBy} dir={sortDir} onSort={handleSort} />
            <SortableHeader label="Avg Breaks/Session" field="breaks" current={sortBy} dir={sortDir} onSort={handleSort} />
            <SortableHeader label="Focus Loss Events" field="loss" current={sortBy} dir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Total Sessions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sorted.map((learner) => (
            <tr key={learner.learnerId} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {learner.learnerName ?? learner.learnerId}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{learner.avgBreaksPerSession.toFixed(1)}</span>
                  <FocusBreakIndicator value={learner.avgBreaksPerSession} />
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{learner.sessionsWithFocusLoss}</span>
                  {learner.sessionsWithFocusLoss > 5 && (
                    <span className="w-2 h-2 rounded-full bg-orange-400" title="Higher than average" />
                  )}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {learner.totalSessions}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color?: 'green' | 'orange';
}) {
  const colorClass = color === 'orange' ? 'text-orange-600' : color === 'green' ? 'text-green-600' : 'text-gray-900';

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">{title}</div>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
    </div>
  );
}

function SortableHeader({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: 'name' | 'breaks' | 'loss';
  current: string;
  dir: 'asc' | 'desc';
  onSort: (field: 'name' | 'breaks' | 'loss') => void;
}) {
  const isActive = field === current;

  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && <span className="text-gray-400">{dir === 'asc' ? '↑' : '↓'}</span>}
      </div>
    </th>
  );
}

function FocusBreakIndicator({ value }: { value: number }) {
  // Visual indicator: 1-2 is healthy, <1 might need encouragement, >3 might indicate fatigue
  if (value < 1) {
    return <span className="text-xs text-blue-500" title="Low - encourage breaks">↓</span>;
  }
  if (value > 3) {
    return <span className="text-xs text-orange-500" title="High - may indicate fatigue">↑</span>;
  }
  return <span className="text-xs text-green-500" title="Healthy range">✓</span>;
}
