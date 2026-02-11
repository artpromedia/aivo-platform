'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MarketplaceApp {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  itemType: string;
  vendor?: { name: string; type: string };
  subjects: string[];
  gradeBands: string[];
  isActive: boolean;
  pricingModel: string;
  priceCents: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function MarketplaceAppDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const [app, setApp] = useState<MarketplaceApp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApp() {
      try {
        const res = await fetch(`/api/billing/marketplace/items/${appId}`);
        if (!res.ok) throw new Error(`Failed to fetch marketplace item: ${res.status}`);
        const data = (await res.json()) as { data: MarketplaceApp };
        setApp(data.data ?? data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load marketplace item');
      } finally {
        setIsLoading(false);
      }
    }
    void fetchApp();
  }, [appId]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500">
        <Link href="/marketplace" className="hover:text-slate-700">
          Marketplace
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">{app?.title ?? appId}</span>
      </nav>

      <h1 className="text-2xl font-semibold">{app?.title ?? 'Marketplace Item'}</h1>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="h-20 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {app && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Item ID" value={app.id} />
              <Field label="Slug" value={app.slug} />
              <Field label="Type" value={app.itemType} />
              <Field label="Status" value={app.isActive ? 'Active' : 'Inactive'} />
              <Field label="Vendor" value={app.vendor?.name ?? '—'} />
              <Field label="Pricing" value={formatPrice(app.pricingModel, app.priceCents)} />
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold">Description</h2>
            <p className="text-sm text-slate-600">{app.shortDescription}</p>
            {app.longDescription && (
              <p className="mt-4 text-sm text-slate-700">{app.longDescription}</p>
            )}
          </div>

          {(app.subjects.length > 0 || app.gradeBands.length > 0) && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">Classification</h2>
              <div className="space-y-3">
                {app.subjects.length > 0 && (
                  <div>
                    <span className="text-xs uppercase tracking-wide text-slate-500">Subjects</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {app.subjects.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {app.gradeBands.length > 0 && (
                  <div>
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      Grade Bands
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {app.gradeBands.map((g) => (
                        <span
                          key={g}
                          className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!isLoading && !error && !app && (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          Marketplace item not found.
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function formatPrice(model: string, cents: number | null): string {
  if (model === 'FREE' || cents == null) return 'Free';
  return `$${(cents / 100).toFixed(2)} (${model})`;
}
