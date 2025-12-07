import Link from 'next/link';

import { requireAuth } from '../../lib/auth';

const consentSvcUrl = process.env.CONSENT_SVC_URL ?? 'http://localhost:4004';
const privacyPolicyUrl = process.env.PRIVACY_POLICY_URL ?? '/privacy-policy';

interface Aggregate {
  type: string;
  status: string;
  count: number;
}

async function fetchConsentAggregates(bearer: string): Promise<Aggregate[]> {
  if (process.env.PRIVACY_AGGREGATES_MOCK === 'true') {
    return [
      { type: 'BASELINE_ASSESSMENT', status: 'GRANTED', count: 1240 },
      { type: 'BASELINE_ASSESSMENT', status: 'PENDING', count: 86 },
      { type: 'AI_TUTOR', status: 'GRANTED', count: 910 },
      { type: 'AI_TUTOR', status: 'REVOKED', count: 48 },
    ];
  }

  try {
    const res = await fetch(`${consentSvcUrl}/privacy/consent-aggregates`, {
      headers: {
        authorization: `Bearer ${bearer}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { aggregates?: Aggregate[] };
    return json.aggregates ?? [];
  } catch (err) {
    return [];
  }
}

function groupByType(aggregates: Aggregate[]) {
  const map = new Map<string, Aggregate[]>();
  for (const row of aggregates) {
    const list = map.get(row.type) ?? [];
    list.push(row);
    map.set(row.type, list);
  }
  return Array.from(map.entries());
}

export default async function PrivacyPage() {
  const auth = await requireAuth();
  const aggregates = await fetchConsentAggregates(auth.accessToken);
  const grouped = groupByType(aggregates);

  const retentionPolicies = [
    {
      resource: 'EVENT',
      retentionDays: 30,
      note: 'Hard delete after 30 days (see retention-svc).',
    },
    {
      resource: 'HOMEWORK_UPLOAD',
      retentionDays: 90,
      note: 'Files nulled, record retained for audit.',
    },
    {
      resource: 'AI_INCIDENT',
      retentionDays: 60,
      note: 'Pending switch to anonymization (see retention runbook).',
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Privacy</p>
          <h1 className="text-2xl font-semibold">Privacy & Consent</h1>
          <p className="text-sm text-slate-600">
            Surface retention defaults and learner consent coverage for your district.
          </p>
        </div>
        <Link
          href={privacyPolicyUrl}
          className="rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
        >
          View privacy policy
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Retention</p>
              <h2 className="text-lg font-semibold">Default data handling</h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Read-only
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {retentionPolicies.map((policy) => (
              <div
                key={policy.resource}
                className="flex items-center justify-between rounded border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{policy.resource}</p>
                  <p className="text-xs text-slate-600">{policy.note}</p>
                </div>
                <div className="text-sm font-mono text-slate-800">{policy.retentionDays} days</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Consents</p>
              <h2 className="text-lg font-semibold">Aggregate status</h2>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Live (best effort)
            </span>
          </div>
          {grouped.length === 0 && (
            <p className="mt-4 text-sm text-slate-600">
              No data yet. Connect consent-svc or enable mock data.
            </p>
          )}
          <div className="mt-4 grid gap-3">
            {grouped.map(([type, rows]) => (
              <div key={type} className="rounded border px-3 py-2">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                  <span>{type.replace('_', ' ')}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700 md:grid-cols-3">
                  {rows.map((row) => (
                    <div
                      key={`${type}-${row.status}`}
                      className="flex items-center justify-between rounded bg-slate-50 px-2 py-1"
                    >
                      <span className="font-medium">{row.status}</span>
                      <span className="font-mono">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Parent-facing consent experience</h3>
        <p className="text-sm text-slate-600">
          Mobile apps should call{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.8em]">
            /privacy/consent-config
          </code>{' '}
          to drive UI — no hard-coded consent lists. Each entry returns required/optional flags,
          descriptions, and a link to the live privacy policy page.
        </p>
      </div>
    </section>
  );
}
