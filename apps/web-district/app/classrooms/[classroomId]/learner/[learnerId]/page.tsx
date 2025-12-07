'use client';

import { GradeThemeProvider } from '@aivo/ui-web';
import type { GradeBand } from '@aivo/ui-web';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { gradeToBand } from '../../../../../lib/grade-band.js';

interface LearnerDto {
  id: string;
  tenant_id: string;
  name: string;
  grade?: number;
  progress?: number;
}

async function fetchLearner(learnerId: string): Promise<LearnerDto> {
  const res = await fetch(`/api/learners/${learnerId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load learner');
  const data = (await res.json()) as unknown;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid learner payload');
  }
  return data as LearnerDto;
}

export default function LearnerProfilePage() {
  const params = useParams<{ learnerId: string; classroomId: string }>();
  const [learner, setLearner] = useState<LearnerDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchLearner(params.learnerId);
        setLearner(data);
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        console.warn('Falling back to default theme because learner fetch failed', error);
        setError('Unable to load learner');
      }
    };
    void load();
  }, [params.learnerId]);

  const band: GradeBand = useMemo(() => {
    const derived = gradeToBand(learner?.grade);
    if (learner?.grade == null) {
      console.warn('Missing grade; defaulting to G6_8 theme');
    }
    return derived;
  }, [learner]);

  return (
    <GradeThemeProvider initialGrade={band}>
      <main className="flex flex-col gap-4">
        <header className="flex flex-col gap-2">
          <p className="text-sm text-text-muted">Classroom {params.classroomId}</p>
          <h1 className="text-3xl font-bold">{learner?.name ?? 'Loading learner...'}</h1>
          {learner?.grade && <p className="text-lg">Grade {learner.grade}</p>}
        </header>

        {error && <div className="rounded-md bg-error text-white p-3">{error}</div>}

        {learner ? (
          <section className="rounded-xl bg-surface p-4 shadow-sm">
            <p className="text-sm text-text-muted">ID: {learner.id}</p>
            <p className="text-sm text-text-muted">Tenant: {learner.tenant_id}</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {band} theme
              </span>
              <span className="text-sm text-text-muted">
                Progress: {(learner.progress ?? 0) * 100}%
              </span>
            </div>
          </section>
        ) : (
          <p>Loading learner profile...</p>
        )}
      </main>
    </GradeThemeProvider>
  );
}
