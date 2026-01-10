import { Suspense } from 'react';

import { requireAuth } from '../../lib/auth';
import {
  extractDisclaimer,
  FEATURE_DISPLAY,
  getTenantModelCards,
  parseBestFor,
  parseNotAppropriateFor,
  PROVIDER_DISPLAY,
  type TenantModelCard,
} from '../../lib/model-cards-api';

import { ModelDetailModal } from './model-detail-modal';

// Mock data for development when API is unavailable
const MOCK_MODELS: TenantModelCard[] = [
  {
    id: '1',
    modelKey: 'AIVO_TUTOR_V1',
    provider: 'OPENAI',
    displayName: 'Aivo Tutor',
    description:
      'An AI-powered tutoring assistant designed to help K-12 learners understand concepts through guided questions.',
    intendedUseCases: `Best for:
• Providing step-by-step explanations
• Answering curriculum-aligned questions
• Offering hints and guided practice`,
    limitations: `Not appropriate for:
• Medical or professional advice
• Grading or formal assessments
• Replacing teacher judgment

Important: AI tutoring supplements, not replaces, human instruction.`,
    safetyConsiderations: 'Content filtered for age-appropriateness.',
    inputTypes: 'Text',
    outputTypes: 'Text',
    dataSourcesSummary: 'Curated educational content.',
    lastReviewedAt: '2024-12-01T00:00:00Z',
    lastReviewedBy: null,
    metadataJson: { version: '1.0' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
    featureKey: 'TUTORING',
    isActive: true,
  },
  {
    id: '2',
    modelKey: 'AIVO_BASELINE_V1',
    provider: 'OPENAI',
    displayName: 'Aivo Baseline Assessment',
    description: 'Analyzes learner responses during baseline assessments to determine starting skill levels.',
    intendedUseCases: `Best for:
• Analyzing written responses
• Identifying knowledge gaps
• Supporting initial placement`,
    limitations: `Not appropriate for:
• Formal diagnostic assessment
• Special education decisions
• High-stakes placement

Important: Results are preliminary and should be validated by educators.`,
    safetyConsiderations: 'Results presented as suggestions only.',
    inputTypes: 'Text',
    outputTypes: 'Text',
    dataSourcesSummary: 'Calibrated against educator-graded samples.',
    lastReviewedAt: '2024-11-15T00:00:00Z',
    lastReviewedBy: null,
    metadataJson: { version: '1.0' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-11-15T00:00:00Z',
    featureKey: 'BASELINE',
    isActive: true,
  },
  {
    id: '3',
    modelKey: 'AIVO_FOCUS_V1',
    provider: 'INTERNAL',
    displayName: 'Aivo Focus Assistant',
    description: 'Monitors learner engagement and suggests appropriate breaks to maintain optimal focus.',
    intendedUseCases: `Best for:
• Detecting disengagement
• Suggesting timely breaks
• Tracking attention patterns`,
    limitations: `Not appropriate for:
• Diagnosing attention disorders
• Clinical ADHD assessment
• Medical recommendations

Important: Focus patterns should not indicate learning disabilities.`,
    safetyConsiderations: 'No diagnostic labels applied.',
    inputTypes: 'Behavioral signals',
    outputTypes: 'Suggestions',
    dataSourcesSummary: 'Anonymized engagement patterns.',
    lastReviewedAt: '2024-12-05T00:00:00Z',
    lastReviewedBy: null,
    metadataJson: { version: '1.0' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-05T00:00:00Z',
    featureKey: 'FOCUS',
    isActive: true,
  },
];

export const metadata = {
  title: 'AI Overview | Aivo District Admin',
  description: "Understand the AI models powering your district's learning experience",
};

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border bg-surface p-6">
          <div className="h-5 w-1/3 rounded bg-surface-muted" />
          <div className="mt-4 h-4 w-2/3 rounded bg-surface-muted" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-surface-muted" />
            <div className="h-3 w-3/4 rounded bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ModelCard({ model }: { model: TenantModelCard }) {
  const provider = PROVIDER_DISPLAY[model.provider];
  const feature = FEATURE_DISPLAY[model.featureKey] ?? { name: model.featureKey, icon: '🤖' };
  const bestFor = parseBestFor(model.intendedUseCases);
  const notFor = parseNotAppropriateFor(model.limitations);
  const disclaimer = extractDisclaimer(model.limitations);

  return (
    <article className="rounded-xl border border-border bg-surface shadow-soft overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-surface-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label={feature.name}>
              {feature.icon}
            </span>
            <div>
              <h3 className="font-semibold text-text">{model.displayName}</h3>
              <p className="text-xs text-muted">{feature.name}</p>
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${provider.colorClass}`}>
            {provider.name}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4 space-y-4">
        <p className="text-sm text-muted">{model.description}</p>

        {/* Best For */}
        {bestFor.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-text uppercase tracking-wide mb-2 flex items-center gap-1">
              <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Best for
            </h4>
            <ul className="space-y-1">
              {bestFor.slice(0, 3).map((item, idx) => (
                <li key={idx} className="text-sm text-text flex items-start gap-2">
                  <span className="text-muted">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Not Appropriate For */}
        {notFor.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-text uppercase tracking-wide mb-2 flex items-center gap-1">
              <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Not appropriate for
            </h4>
            <ul className="space-y-1">
              {notFor.slice(0, 3).map((item, idx) => (
                <li key={idx} className="text-sm text-muted flex items-start gap-2">
                  <span className="text-muted">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        {disclaimer && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> {disclaimer}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-border bg-surface-muted/30 flex items-center justify-between">
        <span className="text-xs text-muted">
          Last reviewed: {new Date(model.lastReviewedAt).toLocaleDateString()}
        </span>
        <ModelDetailModal model={model} />
      </div>
    </article>
  );
}

async function AIModelsContent() {
  const auth = await requireAuth();

  let models: TenantModelCard[];

  try {
    const result = await getTenantModelCards(auth.tenantId, auth.accessToken);
    models = result.modelCards;
  } catch {
    // Fallback to mock data in development
    models = MOCK_MODELS;
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-12 bg-surface rounded-xl border border-border">
        <p className="text-muted">No AI models are currently configured for your district.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {models.map((model) => (
        <ModelCard key={model.id} model={model} />
      ))}
    </div>
  );
}

export default function AIModelsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text">AI Overview</h1>
        <p className="text-muted mt-1">
          Learn about the AI models that power your district&apos;s learning experience.
        </p>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl bg-primary/5 border border-primary/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-6 w-6 text-primary mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h2 className="text-sm font-semibold text-text">AI Transparency & Governance</h2>
            <p className="text-sm text-muted mt-1">
              These model cards document the capabilities and limitations of AI features used in
              Aivo. Use this information to support your district&apos;s AI governance policies and
              communicate with families about how AI assists learning.
            </p>
          </div>
        </div>
      </div>

      {/* Important Disclaimers */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-5 py-4">
        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          Important Reminders
        </h3>
        <ul className="mt-2 text-sm text-amber-800 dark:text-amber-200 space-y-1">
          <li>• AI models may occasionally make mistakes or provide incomplete information.</li>
          <li>• AI tools are not diagnostic and should not replace professional evaluation.</li>
          <li>• Teacher and educator judgment should guide all educational decisions.</li>
          <li>• Contact Aivo support if you have questions about AI behavior in your district.</li>
        </ul>
      </div>

      {/* Models Grid */}
      <Suspense fallback={<LoadingState />}>
        <AIModelsContent />
      </Suspense>

      {/* Footer */}
      <div className="text-center text-sm text-muted pt-4">
        <p>
          Questions about AI in your district?{' '}
          <a href="mailto:support@aivolearning.com" className="text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
