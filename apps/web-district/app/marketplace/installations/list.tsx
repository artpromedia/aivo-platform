'use client';

/**
 * Installations List Component
 *
 * Displays all marketplace installations with management actions.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  type MarketplaceInstallation,
  listInstallations,
  disableInstallation,
  enableInstallation,
  getItemTypeLabel,
  getInstallationStatusLabel,
  getInstallationStatusColor,
} from '../../../lib/marketplace-api';
import { useAuth } from '../../providers';

export function InstallationsList() {
  const { tenantId } = useAuth();
  const searchParams = useSearchParams();
  const [installations, setInstallations] = useState<MarketplaceInstallation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!tenantId) return;

    async function loadInstallations() {
      setLoading(true);
      setError(null);
      try {
        const status = searchParams.get('status') as MarketplaceInstallation['status'] | undefined;
        const result = await listInstallations(tenantId, {
          status: status || undefined,
          limit: 50,
        });
        setInstallations(result.data);
        setTotal(result.pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load installations');
      } finally {
        setLoading(false);
      }
    }
    void loadInstallations();
  }, [tenantId, searchParams]);

  async function handleToggleStatus(installation: MarketplaceInstallation) {
    if (!tenantId) return;

    try {
      if (installation.status === 'ACTIVE') {
        await disableInstallation(tenantId, installation.id);
        setInstallations((prev) =>
          prev.map((i) => (i.id === installation.id ? { ...i, status: 'DISABLED' } : i))
        );
      } else if (installation.status === 'DISABLED') {
        await enableInstallation(tenantId, installation.id);
        setInstallations((prev) =>
          prev.map((i) => (i.id === installation.id ? { ...i, status: 'ACTIVE' } : i))
        );
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  }

  if (loading) {
    return <InstallationsSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (installations.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-surface-muted p-4">
          <svg
            className="h-full w-full text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium">No installations yet</h3>
        <p className="mt-1 text-sm text-muted">
          Browse the marketplace to install content packs and tools for your district.
        </p>
        <Link
          href="/marketplace"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted">
        {total} installation{total !== 1 ? 's' : ''}
      </div>

      <div className="space-y-3">
        {installations.map((installation) => (
          <InstallationCard
            key={installation.id}
            installation={installation}
            onToggleStatus={() => handleToggleStatus(installation)}
          />
        ))}
      </div>
    </div>
  );
}

function InstallationCard({
  installation,
  onToggleStatus,
}: {
  installation: MarketplaceInstallation;
  onToggleStatus: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const statusColor = getInstallationStatusColor(installation.status);
  const statusStyles: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    gray: 'bg-gray-100 text-gray-600',
    red: 'bg-red-100 text-red-700',
  };

  const scopeLabel = installation.classroomId
    ? 'Classroom'
    : installation.schoolId
      ? 'School'
      : 'District-wide';

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
      {/* Icon */}
      {installation.marketplaceItem.iconUrl ? (
        <img
          src={installation.marketplaceItem.iconUrl}
          alt=""
          className="h-12 w-12 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-muted">
          <svg className="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/marketplace/items/${installation.marketplaceItem.slug}`}
            className="font-medium hover:text-primary hover:underline"
          >
            {installation.marketplaceItem.title}
          </Link>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[statusColor]}`}
          >
            {getInstallationStatusLabel(installation.status)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted">
          <span>{installation.marketplaceItem.vendor.name}</span>
          <span>•</span>
          <span>{getItemTypeLabel(installation.marketplaceItem.itemType)}</span>
          <span>•</span>
          <span>{scopeLabel}</span>
          <span>•</span>
          <span>v{installation.version.version}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="relative">
        <button
          onClick={() => {
            setShowMenu(!showMenu);
          }}
          className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-text"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => {
                setShowMenu(false);
              }}
            />
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-border bg-surface py-1 shadow-lg">
              <Link
                href={`/marketplace/items/${installation.marketplaceItem.slug}`}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-surface-muted"
                onClick={() => {
                  setShowMenu(false);
                }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View Details
              </Link>

              {installation.status === 'PENDING_APPROVAL' && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    // TODO: Implement approve action
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-surface-muted"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Approve
                </button>
              )}

              {(installation.status === 'ACTIVE' || installation.status === 'DISABLED') && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onToggleStatus();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-surface-muted"
                >
                  {installation.status === 'ACTIVE' ? (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Disable
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Enable
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  setShowMenu(false);
                  // TODO: Implement revoke action with confirmation
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-surface-muted"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Revoke
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InstallationsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-surface" />
      ))}
    </div>
  );
}
