'use client';

import type { SignUpStepProps } from '../SignUpWizard';

const PLANS = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: '$0',
    period: '30 days',
    description: 'Full access for 30 days. No credit card required.',
    features: [
      'Up to 500 learners',
      'Up to 5 schools',
      '10 GB storage',
      'All AI models',
      'Email support',
    ],
    highlighted: true,
    badge: 'Recommended',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$2',
    period: 'per learner / month',
    description: 'For small districts getting started with AI learning.',
    features: [
      'Up to 2,000 learners',
      'Up to 10 schools',
      '50 GB storage',
      'Core AI models',
      'Email support',
    ],
    highlighted: false,
    badge: null,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$4',
    period: 'per learner / month',
    description: 'For growing districts needing advanced features.',
    features: [
      'Up to 25,000 learners',
      'Up to 100 schools',
      '500 GB storage',
      'All AI models',
      'Priority support',
      'Custom integrations',
      'Advanced analytics',
    ],
    highlighted: false,
    badge: 'Popular',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large districts with custom requirements.',
    features: [
      'Unlimited learners',
      'Unlimited schools',
      'Unlimited storage',
      'All AI models + custom',
      'Dedicated support',
      'Custom integrations',
      'White-label options',
      'SLA guarantee',
    ],
    highlighted: false,
    badge: null,
  },
] as const;

export function PlanSelectionStep({ formData, onUpdate, onNext, onBack }: SignUpStepProps) {
  const handleSelect = (planId: string) => {
    onUpdate({ planId });
  };

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Choose Your Plan</h2>
      <p className="mb-6 text-sm text-gray-600">
        Start with a free trial or pick the plan that fits your district. You can upgrade anytime.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const isSelected = formData.planId === plan.id;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => handleSelect(plan.id)}
              className={`relative flex flex-col rounded-xl border-2 p-5 text-left transition-all hover:shadow-md ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <span
                  className={`absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    plan.badge === 'Recommended'
                      ? 'bg-blue-600 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {plan.badge}
                </span>
              )}

              {/* Plan Header */}
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-gray-500">{plan.period}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-1.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Selection Indicator */}
              <div className="mt-4 flex items-center justify-center">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
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
          onClick={onNext}
          className="ml-auto rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
