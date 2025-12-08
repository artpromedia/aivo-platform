'use client';

import { Badge, Button, Card, GradeThemeProvider, Heading } from '@aivo/ui-web';
import type { GradeBand } from '@aivo/ui-web';
import { format } from 'date-fns';
import Link from 'next/link';
import React, { useMemo } from 'react';

import { AccessibilityControls } from '../../../../../../components/accessibility-controls';
import type { BaselineProfileView } from '../../../../../../lib/learner-insights';

function DomainBar({ domain, score, label }: { domain: string; score: number; label?: string }) {
  const pct = Math.round(score * 100);
  const tone: 'success' | 'warning' | 'info' =
    pct >= 75 ? 'success' : pct >= 50 ? 'info' : 'warning';

  return (
    <Card
      key={domain}
      title={`${domain} · ${pct}%`}
      subtitle={label ?? 'Baseline domain summary'}
      className="h-full"
    >
      <div className="space-y-2" aria-label={`${domain} mastery ${pct}%`}>
        <div
          className="relative h-3 w-full overflow-hidden rounded-full bg-surface-muted"
          role="presentation"
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm text-muted">
          {domain} mastery: {score.toFixed(2)} (
          {pct <= 40 ? 'needs support' : pct < 75 ? 'moderate' : 'strong'})
        </p>
      </div>
    </Card>
  );
}

function AttemptTimeline({ attempts }: { attempts: BaselineProfileView['attempts'] }) {
  return (
    <Card title="Attempt timeline" subtitle="Latest to earliest" className="h-full">
      <ol className="space-y-3" aria-label="Baseline attempt timeline">
        {attempts.map((attempt) => (
          <li key={attempt.attemptId} className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-text">Attempt {attempt.attemptNumber}</p>
              <p className="text-sm text-muted">
                {attempt.startedAt
                  ? format(new Date(attempt.startedAt), 'MMM d, yyyy p')
                  : 'Not started'}
              </p>
              {attempt.retestReason && (
                <p className="text-xs text-warning">Retest reason: {attempt.retestReason}</p>
              )}
            </div>
            <Badge tone={attempt.status === 'COMPLETED' ? 'success' : 'warning'}>
              {attempt.status}
            </Badge>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function BaselineInsightsClient({
  classroomId,
  learnerId,
  baseline,
  gradeBand,
}: {
  classroomId: string;
  learnerId: string;
  baseline: BaselineProfileView;
  gradeBand: GradeBand;
}) {
  const highestScore = useMemo(() => {
    return baseline.domainScores.reduce((max, d) => Math.max(max, d.score), 0);
  }, [baseline.domainScores]);

  const exportSummary = () => {
    const blob = new Blob([JSON.stringify(baseline, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `baseline-summary-${learnerId}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <GradeThemeProvider initialGrade={gradeBand}>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <Heading level={1}>Baseline results</Heading>
          <p className="text-sm text-muted">
            Classroom {classroomId} · Learner {baseline.learnerName ?? learnerId}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="info">Grade band: {gradeBand}</Badge>
            {baseline.grade && <Badge tone="neutral">Grade {baseline.grade}</Badge>}
            <Badge tone="success">Status: {baseline.status}</Badge>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <AccessibilityControls />
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/classrooms/${classroomId}/learners/${learnerId}/brain`}
              className="inline-flex"
              aria-label="View Virtual Brain"
            >
              <Button variant="secondary">View Virtual Brain</Button>
            </Link>
            <Button onClick={exportSummary}>Export Summary</Button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Heading level={2}>Per-domain summary</Heading>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {baseline.domainScores.map((domain) => (
                <DomainBar
                  key={domain.domain}
                  domain={domain.domain}
                  score={domain.score}
                  {...(domain.label ? { label: domain.label } : {})}
                />
              ))}
            </div>
            <p className="text-xs text-muted" aria-live="polite">
              Highest domain score: {(highestScore * 100).toFixed(0)}%
            </p>
          </div>

          <div className="space-y-3">
            <Heading level={2}>Timeline</Heading>
            <AttemptTimeline attempts={baseline.attempts} />
          </div>
        </section>
      </div>
    </GradeThemeProvider>
  );
}
