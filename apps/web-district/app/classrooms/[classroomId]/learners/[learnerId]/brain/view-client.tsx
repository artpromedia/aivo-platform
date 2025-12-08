'use client';

import { Badge, Button, Card, GradeThemeProvider, Heading } from '@aivo/ui-web';
import type { GradeBand } from '@aivo/ui-web';
import Link from 'next/link';
import React, { useMemo } from 'react';

import { AccessibilityControls } from '../../../../../../components/accessibility-controls';
import type { SkillStateView, VirtualBrainSummary } from '../../../../../../lib/learner-insights';
import { summarizeMastery } from '../../../../../../lib/learner-insights';

function MasteryPill({ level }: { level: number }) {
  const pct = Math.round(level * 100);
  const tone: 'success' | 'warning' | 'info' =
    pct >= 75 ? 'success' : pct >= 50 ? 'info' : 'warning';
  return <Badge tone={tone}>{pct}%</Badge>;
}

function SkillCard({ skill }: { skill: SkillStateView }) {
  const pct = Math.round(skill.masteryLevel * 100);
  const levelText = pct >= 75 ? 'strong' : pct >= 50 ? 'moderate' : 'needs support';

  return (
    <Card
      title={skill.displayName}
      subtitle={`${skill.domain} · ${skill.skillCode}`}
      className="h-full"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <MasteryPill level={skill.masteryLevel} />
          <span className="text-xs text-muted">{skill.practiceCount ?? 0} practices</span>
        </div>
        <div
          className="relative h-2 w-full overflow-hidden rounded-full bg-surface-muted"
          role="presentation"
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm text-muted" aria-label={`${skill.displayName} mastery ${pct}%`}>
          {skill.displayName} mastery: {skill.masteryLevel.toFixed(2)} ({levelText})
        </p>
      </div>
    </Card>
  );
}

function SkillList({
  title,
  skills,
  tone,
}: {
  title: string;
  skills: SkillStateView[];
  tone: 'success' | 'warning';
}) {
  return (
    <Card title={title} className="h-full">
      <ul className="space-y-2" aria-label={title}>
        {skills.map((skill) => (
          <li key={skill.id} className="flex items-center justify-between gap-2">
            <span className="font-medium text-text">{skill.displayName}</span>
            <Badge tone={tone}>{Math.round(skill.masteryLevel * 100)}%</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DomainSummarySection({
  byDomain,
}: {
  byDomain: Record<string, { count: number; avgMastery: number }> | undefined;
}) {
  if (!byDomain) return null;
  const entries = Object.entries(byDomain);
  if (entries.length === 0) return null;

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {entries.map(([domain, data]) => {
        const pct = Math.round(data.avgMastery * 100);
        const levelText = pct >= 75 ? 'strong' : pct >= 50 ? 'moderate' : 'needs support';
        return (
          <Card key={domain} title={domain} subtitle={`${data.count} skills`} className="h-full">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Avg mastery</span>
                <MasteryPill level={data.avgMastery} />
              </div>
              <p className="text-sm text-muted" aria-label={`${domain} average mastery ${pct}%`}>
                {domain} mastery: {data.avgMastery.toFixed(2)} ({levelText})
              </p>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

function SkillGraph({ skills }: { skills: SkillStateView[] }) {
  // Group skills by domain for a nested list representation
  const grouped = skills.reduce<Record<string, SkillStateView[]>>((acc, skill) => {
    const list = acc[skill.domain] ?? [];
    list.push(skill);
    acc[skill.domain] = list;
    return acc;
  }, {});

  return (
    <Card
      title="Skills by Domain"
      subtitle="Nested prerequisite view (simplified)"
      className="h-full"
    >
      <ul className="space-y-3" aria-label="Skills grouped by domain">
        {Object.entries(grouped).map(([domain, domainSkills]) => (
          <li key={domain}>
            <p className="font-semibold text-text">{domain}</p>
            <ul className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
              {domainSkills.map((skill) => (
                <li key={skill.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{skill.displayName}</span>
                  <MasteryPill level={skill.masteryLevel} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function VirtualBrainClient({
  classroomId,
  learnerId,
  brain,
  gradeBand,
}: {
  classroomId: string;
  learnerId: string;
  brain: VirtualBrainSummary;
  gradeBand: GradeBand;
}) {
  const { strengths, focusAreas } = useMemo(
    () => summarizeMastery(brain.skillStates),
    [brain.skillStates]
  );

  const exportBrain = () => {
    const blob = new Blob([JSON.stringify(brain, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `virtual-brain-${learnerId}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <GradeThemeProvider initialGrade={gradeBand}>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <Heading level={1}>Virtual Brain</Heading>
          <p className="text-sm text-muted">
            Classroom {classroomId} · Learner {learnerId}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="info">Grade band: {gradeBand}</Badge>
            <Badge tone="neutral">{brain.skillStates.length} skills tracked</Badge>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <AccessibilityControls />
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/classrooms/${classroomId}/learners/${learnerId}/baseline`}
              className="inline-flex"
              aria-label="View Baseline Results"
            >
              <Button variant="secondary">View Baseline</Button>
            </Link>
            <Button onClick={exportBrain}>Export Brain</Button>
          </div>
        </div>

        <section>
          <Heading level={2}>Domain Summary</Heading>
          <DomainSummarySection byDomain={brain.summary?.byDomain} />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Heading level={2}>Strengths (Top 3)</Heading>
            <SkillList title="Highest mastery skills" skills={strengths} tone="success" />
          </div>
          <div>
            <Heading level={2}>Focus Areas (Bottom 3)</Heading>
            <SkillList title="Skills needing support" skills={focusAreas} tone="warning" />
          </div>
        </section>

        <section>
          <Heading level={2}>All Skills</Heading>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {brain.skillStates.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </section>

        <section>
          <Heading level={2}>Skill Graph</Heading>
          <SkillGraph skills={brain.skillStates} />
        </section>
      </div>
    </GradeThemeProvider>
  );
}
