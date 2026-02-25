'use client';

import { useRouter } from 'next/navigation';

import type { SetupStepProps } from '../PostSignUpSetup';

interface LaunchStepProps extends SetupStepProps {
  allSetupComplete: boolean;
}

export function LaunchStep({ onBack, allSetupComplete }: LaunchStepProps) {
  const router = useRouter();

  return (
    <div className="py-6 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <span className="text-4xl">🚀</span>
      </div>

      <h2 className="text-2xl font-bold text-gray-900">You&apos;re All Set!</h2>
      <p className="mx-auto mt-3 max-w-md text-gray-600">
        {allSetupComplete
          ? 'Your district is fully configured and ready to go. Head to the dashboard to start exploring Aivo.'
          : 'Your district is ready! You can complete any remaining setup steps later from Settings.'}
      </p>

      {/* Quick Start Guide */}
      <div className="mx-auto mt-8 max-w-md text-left">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Here&apos;s what you can do next
        </h3>
        <ul className="space-y-3">
          <QuickAction
            icon="🏫"
            title="Add Schools"
            description="Set up individual schools to organize your district"
            href="/schools"
          />
          <QuickAction
            icon="📚"
            title="Explore Curriculum"
            description="Browse AI-powered curriculum aligned to your state standards"
            href="/curriculum"
          />
          <QuickAction
            icon="👨‍🏫"
            title="Manage Users"
            description="Add teachers, students, and other staff"
            href="/users"
          />
          <QuickAction
            icon="📊"
            title="View Analytics"
            description="Monitor usage and learning outcomes"
            href="/analytics"
          />
        </ul>
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center justify-center gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>
        )}
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-lg bg-green-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Go to Dashboard →
        </button>
      </div>

      {/* Trial info */}
      <div className="mx-auto mt-8 max-w-md rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-medium">🎁 Your 30-day free trial is active</p>
        <p className="mt-1 text-xs">
          Enjoy full access to all features. Upgrade anytime from Billing to continue after your trial.
        </p>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <li>
      <a
        href={href}
        className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-blue-300 hover:shadow-sm"
      >
        <span className="text-xl">{icon}</span>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </a>
    </li>
  );
}
