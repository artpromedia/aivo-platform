import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getLearnerAudit } from '../../../../lib/audit-api';
import { getAuthSession } from '../../../../lib/auth';

import { LearnerAuditTimeline } from './learner-audit-timeline';

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER SERVICE API
// ══════════════════════════════════════════════════════════════════════════════

interface LearnerDto {
  id: string;
  tenant_id: string;
  name: string;
  grade?: number;
}

const LEARNER_API_URL = process.env.LEARNER_API_URL || 'http://localhost:4001';

async function fetchLearnerName(learnerId: string, accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${LEARNER_API_URL}/api/learners/${learnerId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const learner = (await res.json()) as LearnerDto;
    return learner.name;
  } catch {
    return null;
  }
}

interface LearnerAuditPageProps {
  params: Promise<{
    learnerId: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Learner Audit Timeline | Aivo District Admin',
  description: 'View audit trail of AI-driven changes for a learner',
};

export default async function LearnerAuditPage({ params }: LearnerAuditPageProps) {
  const session = await getAuthSession();
  
  if (!session) {
    redirect('/login');
  }

  const { learnerId } = await params;

  if (!learnerId) {
    redirect('/learners');
  }

  // Fetch initial audit data and learner name in parallel
  let initialEvents: Awaited<ReturnType<typeof getLearnerAudit>>['events'] = [];
  let total = 0;
  let learnerName = 'Learner';

  try {
    // Fetch audit data and learner name in parallel for better performance
    const [auditData, fetchedLearnerName] = await Promise.all([
      getLearnerAudit(session, learnerId),
      fetchLearnerName(learnerId, session.accessToken),
    ]);

    initialEvents = auditData.events;
    total = auditData.total;

    // Use fetched learner name, fallback to truncated ID if not found
    learnerName = fetchedLearnerName ?? `Learner ${learnerId.slice(0, 8)}`;
  } catch {
    // Error handled by returning empty initial events
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <a href="/learners" className="text-sm text-gray-500 hover:text-gray-700">
                  Learners
                </a>
              </li>
              <li>
                <span className="text-gray-400">/</span>
              </li>
              <li>
                <a 
                  href={`/learners/${learnerId}`} 
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Profile
                </a>
              </li>
              <li>
                <span className="text-gray-400">/</span>
              </li>
              <li>
                <span className="text-sm font-medium text-gray-900">Audit Trail</span>
              </li>
            </ol>
          </nav>
          
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Learner Audit Timeline
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            View AI-driven changes to this learner&apos;s difficulty settings and learning plans.
            Each entry shows what changed, when, and why.
          </p>
        </div>

        <LearnerAuditTimeline 
          learnerId={learnerId}
          learnerName={learnerName}
          initialEvents={initialEvents}
          total={total}
          accessToken={session.accessToken}
        />
      </div>
    </main>
  );
}
