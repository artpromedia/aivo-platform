import Link from 'next/link';

import { requirePlatformAdmin } from '../../lib/auth';
import {
  formatReviewDate,
  listModelCards,
  parseBestFor,
  PROVIDER_DISPLAY,
  type ModelCardSummary,
} from '../../lib/model-cards-api';

// Mock data for development when API is unavailable
const MOCK_MODEL_CARDS: ModelCardSummary[] = [
  {
    id: '1',
    modelKey: 'AIVO_TUTOR_V1',
    provider: 'OPENAI',
    displayName: 'Aivo Tutor',
    description: 'AI-powered tutoring assistant for K-12 learners',
    intendedUseCases: 'Best for:\n• Providing step-by-step explanations\n• Answering curriculum-aligned questions',
    lastReviewedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: '2',
    modelKey: 'AIVO_BASELINE_V1',
    provider: 'OPENAI',
    displayName: 'Aivo Baseline Assessment',
    description: 'Analyzes learner responses during baseline assessments',
    intendedUseCases: 'Best for:\n• Analyzing written responses\n• Identifying knowledge gaps',
    lastReviewedAt: '2024-11-15T00:00:00Z',
  },
  {
    id: '3',
    modelKey: 'AIVO_FOCUS_V1',
    provider: 'INTERNAL',
    displayName: 'Aivo Focus Assistant',
    description: 'Rule-based system for engagement monitoring',
    intendedUseCases: 'Best for:\n• Detecting disengagement\n• Suggesting breaks',
    lastReviewedAt: '2024-12-05T00:00:00Z',
  },
];

export const metadata = {
  title: 'AI Models | Aivo Platform Admin',
  description: 'View AI model capabilities, limitations, and safety documentation',
};

function ModelTable({ models }: { models: ModelCardSummary[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Model</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Provider</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
              Primary Use Cases
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
              Last Reviewed
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {models.map((model) => {
            const provider = PROVIDER_DISPLAY[model.provider];
            const bestFor = parseBestFor(model.intendedUseCases);

            return (
              <tr key={model.id} className="hover:bg-slate-50">
                <td className="px-4 py-4">
                  <div>
                    <div className="font-medium text-slate-900">{model.displayName}</div>
                    <div className="text-xs text-slate-500 font-mono">{model.modelKey}</div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${provider.colorClass}`}>
                    {provider.name}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <ul className="text-sm text-slate-600 space-y-0.5">
                    {bestFor.slice(0, 2).map((item, idx) => (
                      <li key={idx} className="truncate max-w-xs">
                        • {item}
                      </li>
                    ))}
                    {bestFor.length > 2 && (
                      <li className="text-slate-400 text-xs">+{bestFor.length - 2} more</li>
                    )}
                  </ul>
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">
                  {formatReviewDate(model.lastReviewedAt)}
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/models/${model.modelKey}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View Details →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function ModelsPage() {
  const auth = await requirePlatformAdmin();
  if (auth === 'forbidden') {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold text-red-600">Access Denied</h1>
        <p className="text-slate-600 mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  let modelCards: ModelCardSummary[];

  try {
    const result = await listModelCards(auth.accessToken);
    modelCards = result.modelCards;
  } catch {
    // Fallback to mock data in development
    modelCards = MOCK_MODEL_CARDS;
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">AI Models</h1>
          <p className="text-slate-600 mt-1">
            Model documentation including capabilities, limitations, and safety information.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0"
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
            <h3 className="text-sm font-medium text-indigo-900">AI Transparency Documentation</h3>
            <p className="text-sm text-indigo-700 mt-1">
              These model cards provide information about AI capabilities and limitations to support
              responsible AI governance. Click on any model to view full documentation.
            </p>
          </div>
        </div>
      </div>

      {/* Models Table */}
      {modelCards.length > 0 ? (
        <ModelTable models={modelCards} />
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-slate-600">No model cards found.</p>
        </div>
      )}

      {/* Footer Note */}
      <div className="text-sm text-slate-500 text-center">
        <p>
          Model cards are reviewed periodically to ensure accuracy. Last system review:{' '}
          <strong>December 2024</strong>
        </p>
      </div>
    </section>
  );
}
