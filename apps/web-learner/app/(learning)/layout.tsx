import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAuthSession } from '../../lib/auth';
import { evaluateOnboardingGuard } from '../../lib/onboarding-guard';
import { ConnectivityBanner } from '../../components/connectivity-banner';
import { LearnerSidebar } from '../../components/learner-sidebar';
import { LearnerTopbar } from '../../components/learner-topbar';

export default async function LearningLayout({ children }: { readonly children: ReactNode }) {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  // ── Onboarding / Baseline guard ─────────────────────
  const guard = await evaluateOnboardingGuard(session.userId);
  if (!guard.isReady && guard.redirectTo) {
    redirect(guard.redirectTo);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar — desktop only, hidden on mobile */}
      <LearnerSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar with search, streak, XP, notifications, profile */}
        <LearnerTopbar
          userName={session.name ?? undefined}
          streakDays={5}
          totalXp={1250}
        />

        {/* Connectivity banner — shown when offline / reconnected */}
        <ConnectivityBanner />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
