'use client';

import { useRouter } from 'next/navigation';

import type { ProvisioningStatus } from '../SignUpWizard';

const STEP_LABELS: Record<string, string> = {
  VALIDATING_INPUT: 'Validating input',
  CREATING_TENANT: 'Creating your organization',
  PROVISIONING_DATABASE: 'Setting up database',
  SEEDING_DEFAULT_DATA: 'Loading default data',
  CREATING_ADMIN_USER: 'Creating admin account',
  SETTING_UP_BILLING: 'Configuring billing',
  CONFIGURING_INTEGRATIONS: 'Setting up integrations',
  SENDING_WELCOME_EMAIL: 'Sending welcome email',
  FINALIZING: 'Finalizing setup',
  COMPLETED: 'All done!',
};

interface ProvisioningStepProps {
  status: ProvisioningStatus | null;
  error: string | null;
  onRetry: () => void;
}

export function ProvisioningStep({ status, error, onRetry }: ProvisioningStepProps) {
  const router = useRouter();

  // Not yet started — show loading
  if (!status && !error) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Setting Up Your Account</h2>
        <p className="mt-2 text-sm text-gray-600">This will only take a moment...</p>
      </div>
    );
  }

  // Error state
  if (error && !status) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <span className="text-3xl">❌</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Setup Failed</h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <button
          onClick={onRetry}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isComplete = status?.status === 'COMPLETED';
  const isFailed = status?.status === 'FAILED';
  const progress = status?.progress ?? 0;

  return (
    <div className="py-8">
      {/* Status Header */}
      <div className="mb-8 text-center">
        {isComplete ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Your Account is Ready!</h2>
            <p className="mt-2 text-gray-600">
              Your 30-day free trial has started. Welcome to Aivo!
            </p>
          </>
        ) : isFailed ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Setup Encountered an Issue</h2>
            <p className="mt-2 text-sm text-red-600">
              {status?.failedReason ?? 'An unexpected error occurred during setup.'}
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Setting Up Your Account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Step {status?.currentStep ?? 0} of {status?.totalSteps ?? 10}
            </p>
          </>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isFailed ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Log */}
      {status?.stepLog && status.stepLog.length > 0 && (
        <div className="space-y-2">
          {status.stepLog.map((entry, index) => (
            <div
              key={`${entry.step}-${index}`}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm ${
                entry.status === 'completed'
                  ? 'bg-green-50 text-green-800'
                  : entry.status === 'failed'
                    ? 'bg-red-50 text-red-800'
                    : entry.status === 'in_progress'
                      ? 'bg-blue-50 text-blue-800'
                      : 'bg-gray-50 text-gray-500'
              }`}
            >
              <span className="flex-shrink-0">
                {entry.status === 'completed'
                  ? '✅'
                  : entry.status === 'failed'
                    ? '❌'
                    : entry.status === 'in_progress'
                      ? '⏳'
                      : '○'}
              </span>
              <span className="flex-1">
                {STEP_LABELS[entry.step] ?? entry.step}
              </span>
              {entry.error && (
                <span className="text-xs text-red-500" title={entry.error}>
                  Error
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex justify-center gap-4">
        {isComplete && (
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-green-600 px-8 py-3 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Go to Dashboard →
          </button>
        )}
        {isFailed && (
          <button
            onClick={onRetry}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Retry Setup
          </button>
        )}
      </div>
    </div>
  );
}
