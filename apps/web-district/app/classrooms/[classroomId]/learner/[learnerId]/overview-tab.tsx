'use client';

import { Card, Badge, Heading, Button } from '@aivo/ui-web';
import Link from 'next/link';

import { useLearnerProfile } from './context';

/**
 * Overview Tab
 *
 * Displays:
 * - Learner info card
 * - Baseline summary with domain scores
 * - Virtual Brain summary with strengths/focus areas
 * - CTAs to full baseline and virtual brain pages
 */
export function OverviewTab() {
  const { learner, baseline, virtualBrain, goals, classroomId } = useLearnerProfile();

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickStatCard
          label="Active Goals"
          value={String(activeGoals.length)}
          description="Goals in progress"
        />
        <QuickStatCard
          label="Grade Level"
          value={learner.grade ? `Grade ${learner.grade}` : 'N/A'}
          description="Current enrollment"
        />
        <QuickStatCard
          label="Baseline Status"
          value={baseline?.status ?? 'Not started'}
          description="Assessment progress"
        />
      </div>

      {/* Baseline Summary */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <Heading level={2}>Baseline Assessment</Heading>
          <Link href={`/learners/${learner.id}/baseline`}>
            <Button variant="secondary">
              View Details
            </Button>
          </Link>
        </div>

        {baseline ? (
          <Card>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {baseline.domainScores.map((ds) => (
                  <DomainScoreCard
                    key={ds.domain}
                    domain={ds.domain}
                    score={ds.score}
                    {...(ds.label ? { label: ds.label } : {})}
                  />
                ))}
              </div>

              {baseline.attempts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted">
                    Last assessment:{' '}
                    {(() => {
                      const lastAttempt = baseline.attempts[baseline.attempts.length - 1];
                      return lastAttempt?.completedAt
                        ? new Date(lastAttempt.completedAt).toLocaleDateString()
                        : 'In progress';
                    })()}
                  </p>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="p-6 text-center">
              <p className="text-muted mb-4">No baseline assessment data available yet.</p>
              <Link href={`/learners/${learner.id}/baseline`}>
                <Button variant="primary">Start Baseline Assessment</Button>
              </Link>
            </div>
          </Card>
        )}
      </section>

      {/* Virtual Brain Summary */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <Heading level={2}>Virtual Brain</Heading>
          <Link href={`/learners/${learner.id}/brain`}>
            <Button variant="secondary">
              View Details
            </Button>
          </Link>
        </div>

        {virtualBrain ? (
          <Card>
            <div className="p-4">
              {virtualBrain.summary?.byDomain ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {Object.entries(virtualBrain.summary.byDomain).map(([domain, data]) => (
                    <div key={domain} className="flex flex-col">
                      <span className="text-sm font-medium text-muted">{domain}</span>
                      <span className="text-lg font-semibold">
                        {Math.round(data.avgMastery * 100)}%
                      </span>
                      <span className="text-xs text-muted">{data.count} skills</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Top Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted">Strengths</h4>
                  <div className="flex flex-col gap-2">
                    {virtualBrain.skillStates
                      .filter((s) => s.masteryLevel >= 0.7)
                      .slice(0, 3)
                      .map((skill) => (
                        <SkillBadge
                          key={skill.id}
                          name={skill.displayName}
                          mastery={skill.masteryLevel}
                          tone="success"
                        />
                      ))}
                    {virtualBrain.skillStates.filter((s) => s.masteryLevel >= 0.7).length ===
                      0 && <p className="text-sm text-muted">No mastered skills yet</p>}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted">Focus Areas</h4>
                  <div className="flex flex-col gap-2">
                    {virtualBrain.skillStates
                      .filter((s) => s.masteryLevel < 0.5)
                      .slice(0, 3)
                      .map((skill) => (
                        <SkillBadge
                          key={skill.id}
                          name={skill.displayName}
                          mastery={skill.masteryLevel}
                          tone="warning"
                        />
                      ))}
                    {virtualBrain.skillStates.filter((s) => s.masteryLevel < 0.5).length ===
                      0 && <p className="text-sm text-muted">No focus areas identified</p>}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="p-6 text-center">
              <p className="text-muted mb-4">No Virtual Brain data available yet.</p>
              <p className="text-sm text-muted">
                Complete the baseline assessment to initialize the learner&apos;s Virtual Brain.
              </p>
            </div>
          </Card>
        )}
      </section>

      {/* Active Goals Preview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <Heading level={2}>Active Goals</Heading>
          <Link href={`/classrooms/${classroomId}/learner/${learner.id}/goals`}>
            <Button variant="secondary">
              View All Goals
            </Button>
          </Link>
        </div>

        {activeGoals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGoals.slice(0, 4).map((goal) => (
              <Card key={goal.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm line-clamp-2">{goal.title}</h4>
                    <Badge tone="info">
                      {goal.domain}
                    </Badge>
                  </div>
                  {goal.description && (
                    <p className="text-sm text-muted line-clamp-2 mb-2">{goal.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <ProgressBar value={((goal.progressRating ?? 0) / 4) * 100} />
                    <span className="text-xs text-muted whitespace-nowrap">
                      {goal.objectives?.filter((o) => o.status === 'MET').length ?? 0}/
                      {goal.objectives?.length ?? 0} objectives
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="p-6 text-center">
              <p className="text-muted mb-4">No active goals yet.</p>
              <Link href={`/classrooms/${classroomId}/learner/${learner.id}/goals`}>
                <Button variant="primary">Create First Goal</Button>
              </Link>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function QuickStatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <div className="p-4">
        <p className="text-sm text-muted mb-1">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </Card>
  );
}

function DomainScoreCard({
  domain,
  score,
  label,
}: {
  domain: string;
  score: number;
  label?: string;
}) {
  const percentage = Math.round(score * 100);
  const tone = percentage >= 70 ? 'success' : percentage >= 50 ? 'warning' : 'error';

  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-sm font-medium">{domain}</span>
      <div className="relative w-14 h-14 my-2">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-border"
          />
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${percentage * 1.5} 150`}
            className={
              tone === 'success'
                ? 'text-green-500'
                : tone === 'warning'
                ? 'text-yellow-500'
                : 'text-red-500'
            }
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
          {percentage}%
        </span>
      </div>
      {label && <span className="text-xs text-muted line-clamp-1">{label}</span>}
    </div>
  );
}

function SkillBadge({
  name,
  mastery,
  tone,
}: {
  name: string;
  mastery: number;
  tone: 'success' | 'warning';
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-surface">
      <span className="text-sm truncate">{name}</span>
      <Badge tone={tone}>
        {Math.round(mastery * 100)}%
      </Badge>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
