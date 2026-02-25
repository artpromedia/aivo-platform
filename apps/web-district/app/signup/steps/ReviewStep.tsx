'use client';

import type { SignUpStepProps } from '../SignUpWizard';

const PLAN_LABELS: Record<string, string> = {
  trial: 'Free Trial (30 days)',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const ORG_TYPE_LABELS: Record<string, string> = {
  K12_DISTRICT: 'K-12 School District',
  CHARTER_NETWORK: 'Charter School Network',
  PRIVATE_SCHOOL: 'Private School / Academy',
  HIGHER_ED: 'Higher Education',
  OTHER: 'Other Organization',
};

const SIZE_LABELS: Record<string, string> = {
  SMALL: 'Small (< 1,000 students)',
  MEDIUM: 'Medium (1,000 - 10,000)',
  LARGE: 'Large (10,000 - 50,000)',
  ENTERPRISE: 'Enterprise (50,000+)',
};

interface ReviewStepProps extends SignUpStepProps {
  onSubmit: () => void;
  submitting: boolean;
}

export function ReviewStep({ formData, onBack, onSubmit, submitting }: ReviewStepProps) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Review &amp; Create Account</h2>
      <p className="mb-6 text-sm text-gray-600">
        Please review your information before creating your account.
      </p>

      <div className="space-y-6">
        {/* Organization Section */}
        <ReviewSection title="Organization">
          <ReviewField label="Name" value={formData.organizationName} />
          <ReviewField label="Type" value={ORG_TYPE_LABELS[formData.organizationType] ?? formData.organizationType} />
          <ReviewField label="Size" value={SIZE_LABELS[formData.districtSize] ?? formData.districtSize} />
          <ReviewField label="State" value={formData.stateCode} />
          <ReviewField label="ZIP Code" value={formData.zipCode} />
        </ReviewSection>

        {/* Admin Account Section */}
        <ReviewSection title="Admin Account">
          <ReviewField label="Name" value={formData.adminName} />
          <ReviewField label="Email" value={formData.adminEmail} />
          {formData.adminPhone && <ReviewField label="Phone" value={formData.adminPhone} />}
          <ReviewField label="Password" value="••••••••" />
        </ReviewSection>

        {/* Plan Section */}
        <ReviewSection title="Selected Plan">
          <ReviewField label="Plan" value={PLAN_LABELS[formData.planId] ?? formData.planId} />
        </ReviewSection>

        {/* Terms */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
          By creating an account, you agree to the{' '}
          <a href="/privacy-policy" className="text-blue-600 underline hover:no-underline" target="_blank">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 underline hover:no-underline" target="_blank">
            Terms of Service
          </a>
          . Your 30-day free trial will begin immediately. No credit card is required.
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            ← Back
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="ml-auto rounded-lg bg-green-600 px-8 py-2.5 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Creating Account...' : 'Create Account & Start Trial'}
        </button>
      </div>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
