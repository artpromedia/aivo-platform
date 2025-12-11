import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requirePlatformAdmin } from '../../../lib/auth';
import {
  formatReviewDate,
  getModelCard,
  parseBestFor,
  parseNotAppropriateFor,
  parseSafetyMeasures,
  PROVIDER_DISPLAY,
  type ModelCard,
} from '../../../lib/model-cards-api';

// Mock data for development
const MOCK_MODEL: ModelCard = {
  id: '1',
  modelKey: 'AIVO_TUTOR_V1',
  provider: 'OPENAI',
  displayName: 'Aivo Tutor',
  description:
    'An AI-powered tutoring assistant designed to help K-12 learners understand concepts through guided questions and scaffolded explanations.',
  intendedUseCases: `Best for:
• Providing step-by-step explanations of concepts
• Answering curriculum-aligned questions
• Offering hints and guided practice
• Explaining mistakes in a supportive way
• Adapting language to different grade levels`,
  limitations: `Not appropriate for:
• Medical, legal, or professional advice
• Grading or formal assessment decisions
• Replacing teacher judgment on student progress
• Handling sensitive student disclosures
• Making placement or intervention recommendations

Important: AI tutoring is a supplement to, not a replacement for, human instruction.`,
  safetyConsiderations: `Safety measures in place:
• Content filtered for age-appropriateness
• Guardrails prevent discussion of harmful topics
• Responses audited for bias and accuracy
• Human review of flagged interactions
• Automatic escalation for concerning content

Disclaimer: This is not a diagnostic tool and should not be used as a substitute for clinical evaluation.`,
  inputTypes: 'Text (student questions, responses, homework problems)',
  outputTypes: 'Text (explanations, hints, feedback, encouragement)',
  dataSourcesSummary:
    'Trained on curated educational content aligned with Common Core and state standards.',
  lastReviewedAt: '2024-12-01T00:00:00Z',
  lastReviewedBy: null,
  metadataJson: { version: '1.0', baseModel: 'gpt-4o-mini', features: ['tutoring', 'homework_help'] },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-12-01T00:00:00Z',
};

interface PageProps {
  params: { modelKey: string };
}

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `${params.modelKey} Model Card | Aivo Platform Admin`,
    description: 'AI model capabilities, limitations, and safety documentation',
  };
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, variant = 'default' }: { items: string[]; variant?: 'default' | 'warning' }) {
  const iconClass = variant === 'warning' ? 'text-amber-500' : 'text-emerald-500';
  const icon =
    variant === 'warning' ? (
      <svg className={`h-4 w-4 ${iconClass} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ) : (
      <svg className={`h-4 w-4 ${iconClass} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );

  return (
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
          {icon}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ModelDetailPage({ params }: PageProps) {
  const auth = await requirePlatformAdmin();
  if (auth === 'forbidden') {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold text-red-600">Access Denied</h1>
        <p className="text-slate-600 mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  let modelCard: ModelCard;

  try {
    const result = await getModelCard(params.modelKey, auth.accessToken);
    modelCard = result.modelCard;
  } catch {
    // Use mock data in development, or show not found
    if (params.modelKey === 'AIVO_TUTOR_V1') {
      modelCard = MOCK_MODEL;
    } else {
      notFound();
    }
  }

  const provider = PROVIDER_DISPLAY[modelCard.provider];
  const bestFor = parseBestFor(modelCard.intendedUseCases);
  const notAppropriateFor = parseNotAppropriateFor(modelCard.limitations);
  const { measures: safetyMeasures, disclaimer } = parseSafetyMeasures(modelCard.safetyConsiderations);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500">
        <Link href="/models" className="hover:text-slate-700">
          AI Models
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">{modelCard.displayName}</span>
      </nav>

      {/* Review Banner */}
      <div className="bg-slate-100 rounded-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm text-slate-600">
            Last reviewed on <strong>{formatReviewDate(modelCard.lastReviewedAt)}</strong>
          </span>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${provider.colorClass}`}>
          {provider.name}
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{modelCard.displayName}</h1>
        <p className="text-slate-600 mt-2">{modelCard.description}</p>
        <div className="mt-2 text-xs text-slate-400 font-mono">{modelCard.modelKey}</div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Intended Uses */}
        <Section
          title="Intended Uses"
          icon={
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        >
          <p className="text-sm text-slate-600 mb-4">This model is designed and appropriate for:</p>
          <BulletList items={bestFor} />
        </Section>

        {/* Limitations */}
        <Section
          title="Limitations"
          icon={
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          }
        >
          <p className="text-sm text-slate-600 mb-4">This model should not be used for:</p>
          <BulletList items={notAppropriateFor} variant="warning" />
        </Section>
      </div>

      {/* Safety & Mitigations */}
      <Section
        title="Safety & Mitigations"
        icon={
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        }
      >
        <p className="text-sm text-slate-600 mb-4">Measures implemented to ensure safe operation:</p>
        <BulletList items={safetyMeasures} />
        {disclaimer && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg
                className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-amber-800">Important Disclaimer</h4>
                <p className="text-sm text-amber-700 mt-1">{disclaimer}</p>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* Input/Output Types */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Input Types"
          icon={
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          }
        >
          <p className="text-sm text-slate-700">{modelCard.inputTypes}</p>
        </Section>

        <Section
          title="Output Types"
          icon={
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          }
        >
          <p className="text-sm text-slate-700">{modelCard.outputTypes}</p>
        </Section>
      </div>

      {/* Data Sources */}
      <Section
        title="Training Data Summary"
        icon={
          <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
        }
      >
        <p className="text-sm text-slate-700">{modelCard.dataSourcesSummary}</p>
      </Section>

      {/* Technical Metadata */}
      {modelCard.metadataJson && Object.keys(modelCard.metadataJson).length > 0 && (
        <Section
          title="Technical Details"
          icon={
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modelCard.metadataJson.version && (
              <div>
                <dt className="text-xs text-slate-500 uppercase tracking-wide">Version</dt>
                <dd className="text-sm text-slate-900 font-mono mt-1">{modelCard.metadataJson.version}</dd>
              </div>
            )}
            {modelCard.metadataJson.baseModel && (
              <div>
                <dt className="text-xs text-slate-500 uppercase tracking-wide">Base Model</dt>
                <dd className="text-sm text-slate-900 font-mono mt-1">{modelCard.metadataJson.baseModel}</dd>
              </div>
            )}
            {modelCard.metadataJson.context_window && (
              <div>
                <dt className="text-xs text-slate-500 uppercase tracking-wide">Context Window</dt>
                <dd className="text-sm text-slate-900 font-mono mt-1">
                  {modelCard.metadataJson.context_window.toLocaleString()} tokens
                </dd>
              </div>
            )}
            {modelCard.metadataJson.features && (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-xs text-slate-500 uppercase tracking-wide">Features</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {modelCard.metadataJson.features.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                    >
                      {f}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Back Link */}
      <div className="pt-4">
        <Link href="/models" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          ← Back to AI Models
        </Link>
      </div>
    </div>
  );
}
