'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface Vendor {
  id: string;
  slug: string;
  name: string;
  type: 'AIVO' | 'THIRD_PARTY';
  logoUrl: string | null;
  description: string | null;
  websiteUrl: string | null;
  isVerified: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_MARKETPLACE_API_URL || 'http://localhost:4070/api/v1';

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  AIVO: { label: 'AIVO', className: 'bg-blue-100 text-blue-700' },
  THIRD_PARTY: { label: 'Partner', className: 'bg-purple-100 text-purple-700' },
};

// ============================================================================
// Component
// ============================================================================

export default function MarketplaceVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (typeFilter) {
        params.set('type', typeFilter);
      }

      const qs = params.toString();
      const url = `${API_BASE}/vendors${qs ? `?${qs}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch vendors: ${res.status}`);
      const json = (await res.json()) as { data: Vendor[] };

      setVendors(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/marketplace" className="hover:text-slate-900">
          Marketplace
        </Link>
        <span>/</span>
        <span className="text-slate-900">Vendors</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace Vendors</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage vendor accounts and review their status
          </p>
        </div>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="AIVO">AIVO</option>
          <option value="THIRD_PARTY">Partners</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={() => {
              setError(null);
            }}
            className="ml-4 text-red-900 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Vendor cards */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading vendors...</div>
      ) : vendors.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          No vendors found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => {
            const badge = TYPE_BADGE[vendor.type] ?? {
              label: vendor.type,
              className: 'bg-gray-100 text-gray-700',
            };
            return (
              <div
                key={vendor.id}
                className="flex flex-col rounded-lg border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {vendor.logoUrl ? (
                      <Image
                        src={vendor.logoUrl}
                        alt={vendor.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-400">
                        {vendor.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-slate-900">{vendor.name}</h3>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        {vendor.isVerified && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {vendor.description && (
                  <p className="mt-3 flex-1 text-sm text-slate-500 line-clamp-2">
                    {vendor.description}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <Link
                    href={`/marketplace/vendors/${vendor.slug}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    View Details →
                  </Link>
                  {vendor.websiteUrl && (
                    <a
                      href={vendor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Website ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
