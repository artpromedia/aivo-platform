'use client';

import { useState } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// CHANGELOG DATA
// ══════════════════════════════════════════════════════════════════════════════

interface ChangelogEntry {
  version: string;
  date: string;
  status: 'current' | 'supported' | 'deprecated' | 'sunset';
  sections: {
    type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
    items: string[];
  }[];
}

const changelogs: ChangelogEntry[] = [
  {
    version: 'v1',
    date: '2025-07-01',
    status: 'current',
    sections: [
      {
        type: 'added',
        items: [
          'Learner Progress API — GET /public/v1/learners/:learnerId/progress',
          'Session Data API — GET /public/v1/learners/:learnerId/sessions',
          'External Learning Events API — POST /public/v1/events/external-learning',
          'API Key authentication via X-Api-Key header',
          'Per-tenant data access controls',
          'Usage logging for all public API calls',
          'API versioning headers (API-Version, API-Current-Version)',
          'Rate limiting per API key (per-minute and per-day)',
        ],
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  current: { bg: 'bg-green-100', text: 'text-green-800', label: 'Current' },
  supported: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Supported' },
  deprecated: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Deprecated' },
  sunset: { bg: 'bg-red-100', text: 'text-red-800', label: 'Sunset' },
};

const sectionLabels: Record<string, { label: string; color: string }> = {
  added: { label: 'Added', color: 'text-green-700' },
  changed: { label: 'Changed', color: 'text-blue-700' },
  deprecated: { label: 'Deprecated', color: 'text-yellow-700' },
  removed: { label: 'Removed', color: 'text-red-700' },
  fixed: { label: 'Fixed', color: 'text-purple-700' },
  security: { label: 'Security', color: 'text-orange-700' },
};

function StatusBadge({ status }: { status: string }) {
  const { bg, text, label } = statusColors[status] ?? statusColors.current;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function ChangelogPage() {
  const [filter, setFilter] = useState<string>('all');

  const filtered =
    filter === 'all' ? changelogs : changelogs.filter((c) => c.status === filter);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">API Changelog</h1>
      <p className="text-gray-600 mb-8">
        Track every addition, change, and deprecation across AIVO API versions.
        See the{' '}
        <a href="/docs/versioning" className="text-portal-primary hover:underline">
          Versioning Policy
        </a>{' '}
        for lifecycle details.
      </p>

      {/* Filters */}
      <div className="flex gap-2 mb-8">
        {['all', 'current', 'supported', 'deprecated', 'sunset'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              filter === s
                ? 'bg-portal-primary text-white border-portal-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            {s === 'all' ? 'All Versions' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {filtered.map((entry) => (
          <article
            key={entry.version}
            className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                API {entry.version.toUpperCase()}
              </h2>
              <StatusBadge status={entry.status} />
              <span className="text-sm text-gray-500">{entry.date}</span>
            </div>

            {entry.sections.map((section) => {
              const { label, color } = sectionLabels[section.type] ?? sectionLabels.added;
              return (
                <div key={section.type} className="mb-4 last:mb-0">
                  <h3 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${color}`}>
                    {label}
                  </h3>
                  <ul className="space-y-1.5">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </article>
        ))}

        {filtered.length === 0 && (
          <p className="text-gray-500 text-center py-12">
            No changelog entries match the selected filter.
          </p>
        )}
      </div>
    </div>
  );
}
