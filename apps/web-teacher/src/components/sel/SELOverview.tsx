/**
 * SEL Overview Component
 *
 * Displays Social-Emotional Learning metrics for a classroom.
 * Based on TeacherSELDashboard from aivo-agentic-ai-platform.
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface SELDomain {
  id: string;
  name: string;
  icon: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

export interface ClassSELMetrics {
  overallScore: number;
  domains: SELDomain[];
  studentsNeedingSupport: number;
  recentObservations: number;
  lastUpdated: string;
}

interface SELOverviewProps {
  metrics: ClassSELMetrics;
  onViewDetails?: () => void;
  onRecordObservation?: () => void;
}

const defaultDomains: SELDomain[] = [
  {
    id: 'self-awareness',
    name: 'Self-Awareness',
    icon: '🪞',
    score: 78,
    trend: 'up',
    description: 'Recognizing emotions and values',
  },
  {
    id: 'self-management',
    name: 'Self-Management',
    icon: '🎯',
    score: 72,
    trend: 'stable',
    description: 'Managing emotions and behaviors',
  },
  {
    id: 'social-awareness',
    name: 'Social Awareness',
    icon: '👥',
    score: 81,
    trend: 'up',
    description: 'Understanding others\' perspectives',
  },
  {
    id: 'relationship-skills',
    name: 'Relationship Skills',
    icon: '🤝',
    score: 75,
    trend: 'down',
    description: 'Building positive relationships',
  },
  {
    id: 'responsible-decision',
    name: 'Responsible Decision-Making',
    icon: '⚖️',
    score: 69,
    trend: 'stable',
    description: 'Making ethical choices',
  },
];

export function SELOverview({
  metrics = {
    overallScore: 75,
    domains: defaultDomains,
    studentsNeedingSupport: 4,
    recentObservations: 12,
    lastUpdated: new Date().toISOString(),
  },
  onViewDetails,
  onRecordObservation,
}: SELOverviewProps) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-success/10';
    if (score >= 60) return 'bg-warning/10';
    return 'bg-error/10';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span className="text-success">↑</span>;
      case 'down':
        return <span className="text-error">↓</span>;
      default:
        return <span className="text-muted">→</span>;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-xl">
            💜
          </div>
          <div>
            <h2 className="font-semibold text-text">Social-Emotional Learning</h2>
            <p className="text-sm text-muted">
              {metrics.recentObservations} observations this week
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {onRecordObservation && (
            <button
              onClick={onRecordObservation}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              + Record Observation
            </button>
          )}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="text-sm text-primary hover:underline"
            >
              View All →
            </button>
          )}
        </div>
      </div>

      {/* Overall Score */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Class SEL Score</p>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-3xl font-bold', getScoreColor(metrics.overallScore))}>
                {metrics.overallScore}
              </span>
              <span className="text-sm text-muted">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">Students needing support</p>
            <p className="text-2xl font-bold text-warning">{metrics.studentsNeedingSupport}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-surface-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              metrics.overallScore >= 80
                ? 'bg-success'
                : metrics.overallScore >= 60
                  ? 'bg-warning'
                  : 'bg-error'
            )}
            style={{ width: `${metrics.overallScore}%` }}
          />
        </div>
      </div>

      {/* Domain Grid */}
      <div className="p-4">
        <p className="text-sm font-medium text-muted mb-3">SEL Competencies</p>
        <div className="grid grid-cols-5 gap-2">
          {metrics.domains.map((domain) => (
            <button
              key={domain.id}
              onClick={() => setSelectedDomain(selectedDomain === domain.id ? null : domain.id)}
              className={cn(
                'flex flex-col items-center p-3 rounded-lg border transition-all text-center',
                selectedDomain === domain.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <span className="text-2xl mb-1">{domain.icon}</span>
              <span className={cn('text-lg font-bold', getScoreColor(domain.score))}>
                {domain.score}
              </span>
              <span className="text-xs text-muted truncate w-full">{domain.name.split(' ')[0]}</span>
              {getTrendIcon(domain.trend)}
            </button>
          ))}
        </div>

        {/* Selected Domain Detail */}
        {selectedDomain && (
          <div className="mt-4 p-3 rounded-lg bg-surface-muted">
            {(() => {
              const domain = metrics.domains.find((d) => d.id === selectedDomain);
              if (!domain) return null;
              return (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{domain.icon}</span>
                    <span className="font-medium text-text">{domain.name}</span>
                    <span className={cn('text-sm font-bold ml-auto', getScoreColor(domain.score))}>
                      {domain.score}/100
                    </span>
                    {getTrendIcon(domain.trend)}
                  </div>
                  <p className="text-sm text-muted">{domain.description}</p>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Quick Insights */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <QuickInsight
            icon="📊"
            label="Weekly Trend"
            value="+3%"
            positive
          />
          <QuickInsight
            icon="📝"
            label="Check-ins"
            value="89%"
            sublabel="completion"
          />
          <QuickInsight
            icon="🎯"
            label="Focus Area"
            value="Self-Mgmt"
            sublabel="this week"
          />
        </div>
      </div>
    </div>
  );
}

function QuickInsight({
  icon,
  label,
  value,
  sublabel,
  positive,
  negative,
}: {
  icon: string;
  label: string;
  value: string;
  sublabel?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-muted">
      <span className="text-lg">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p
          className={cn(
            'text-sm font-semibold',
            positive ? 'text-success' : negative ? 'text-error' : 'text-text'
          )}
        >
          {value}
        </p>
        {sublabel && <p className="text-xs text-muted">{sublabel}</p>}
      </div>
    </div>
  );
}

export default SELOverview;
