'use client';

/**
 * Item Detail Content Component
 *
 * Displays marketplace item details with install actions.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  type MarketplaceItemDetail,
  getItemBySlug,
  getSubjectLabel,
  getGradeBandLabel,
  getItemTypeLabel,
  getSafetyCertLabel,
} from '../../../../lib/marketplace-api';
import { useAuth } from '../../../providers';

import { InstallModal } from './install-modal';

interface Props {
  slug: string;
}

export function ItemDetailContent({ slug }: Props) {
  const { tenantId } = useAuth();
  const [item, setItem] = useState<MarketplaceItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    async function loadItem() {
      setLoading(true);
      setError(null);
      try {
        const data = await getItemBySlug(slug);
        setItem(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load item');
      } finally {
        setLoading(false);
      }
    }
    void loadItem();
  }, [slug]);

  if (loading) {
    return <ItemDetailSkeleton />;
  }

  if (error || !item) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-medium text-red-600">Item not found</h2>
        <p className="mt-2 text-sm text-red-500">
          {error || 'The requested item could not be found.'}
        </p>
        <Link
          href="/marketplace"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/marketplace" className="text-muted hover:text-text">
          Marketplace
        </Link>
        <span className="text-muted">/</span>
        <span className="font-medium">{item.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Header */}
          <div className="flex items-start gap-4">
            {item.iconUrl ? (
              <img src={item.iconUrl} alt="" className="h-20 w-20 rounded-xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-surface-muted">
                <ItemTypeIcon type={item.itemType} />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {getItemTypeLabel(item.itemType)}
                </span>
                <SafetyBadge cert={item.safetyCert} />
              </div>
              <h1 className="mt-2 text-2xl font-semibold">{item.title}</h1>
              <p className="mt-1 text-sm text-muted">by {item.vendor.name}</p>
            </div>
          </div>

          {/* Screenshots */}
          {item.screenshots && item.screenshots.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted">Screenshots</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {item.screenshots.map((screenshot, i) => (
                  <img
                    key={i}
                    src={screenshot.url}
                    alt={screenshot.caption || `Screenshot ${i + 1}`}
                    className="h-48 w-auto rounded-lg border border-border object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-medium">Description</h2>
            <div className="mt-3 prose prose-sm max-w-none text-muted">
              {item.longDescription.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Subjects & Grades */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="text-sm font-medium text-muted">Subjects</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.subjects.map((subject) => (
                  <span
                    key={subject}
                    className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-sm"
                  >
                    {getSubjectLabel(subject)}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="text-sm font-medium text-muted">Grade Bands</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.gradeBands.map((grade) => (
                  <span
                    key={grade}
                    className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-sm"
                  >
                    {getGradeBandLabel(grade)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Safety & Data Usage */}
          <div className="grid gap-4 sm:grid-cols-2">
            {item.safetyInfo && (
              <div className="rounded-lg border border-border bg-surface p-4">
                <h3 className="text-sm font-medium text-muted">Safety & Compliance</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  <SafetyItem label="COPPA Compliant" value={item.safetyInfo.coppaCompliant} />
                  <SafetyItem label="FERPA Compliant" value={item.safetyInfo.ferpaCompliant} />
                  <li className="flex items-center justify-between">
                    <span className="text-muted">Accessibility</span>
                    <span>{item.safetyInfo.accessibilityLevel}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted">Content Rating</span>
                    <span>{item.safetyInfo.contentRating}</span>
                  </li>
                </ul>
              </div>
            )}

            {item.dataUsageSummary && (
              <div className="rounded-lg border border-border bg-surface p-4">
                <h3 className="text-sm font-medium text-muted">Data Usage</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  <SafetyItem label="Collects Data" value={item.dataUsageSummary.collectsData} />
                  <SafetyItem
                    label="Third-Party Sharing"
                    value={!item.dataUsageSummary.thirdPartySharing}
                    invertColor
                  />
                  <li className="flex items-center justify-between">
                    <span className="text-muted">Retention</span>
                    <span>{item.dataUsageSummary.retention}</span>
                  </li>
                  {item.dataUsageSummary.dataTypes.length > 0 && (
                    <li>
                      <span className="text-muted">Data Types:</span>
                      <span className="ml-1">{item.dataUsageSummary.dataTypes.join(', ')}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Install Card */}
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="text-center">
              {item.avgRating && (
                <div className="flex items-center justify-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`h-5 w-5 ${star <= Math.round(item.avgRating!) ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="font-medium">{item.avgRating.toFixed(1)}</span>
                  <span className="text-sm text-muted">({item.reviewCount} reviews)</span>
                </div>
              )}
              <p className="mt-2 text-sm text-muted">
                {item.totalInstalls.toLocaleString()} installations
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => {
                  setShowInstallModal(true);
                }}
                className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition hover:bg-primary/90"
              >
                Install for District
              </button>
              <p className="text-center text-xs text-muted">
                Teachers will see this in their library after installation
              </p>
            </div>

            {item.latestVersion && (
              <div className="mt-6 border-t border-border pt-4">
                <p className="text-xs text-muted">Latest Version</p>
                <p className="font-medium">{item.latestVersion.version}</p>
                {item.latestVersion.publishedAt && (
                  <p className="text-xs text-muted">
                    Released {new Date(item.latestVersion.publishedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Vendor Info */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="text-sm font-medium text-muted">Published by</h3>
            <div className="mt-2 flex items-center gap-3">
              {item.vendor.logoUrl ? (
                <img
                  src={item.vendor.logoUrl}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-lg font-medium">
                  {item.vendor.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-medium">{item.vendor.name}</p>
                <p className="text-xs text-muted">
                  {item.vendor.type === 'AIVO' ? 'Aivo Official' : 'Third-Party Vendor'}
                </p>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          {item.ratingDistribution && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="text-sm font-medium text-muted">Rating Distribution</h3>
              <div className="mt-3 space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = item.ratingDistribution[rating] || 0;
                  const percentage = item.reviewCount > 0 ? (count / item.reviewCount) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-2 text-sm">
                      <span className="w-3">{rating}</span>
                      <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Install Modal */}
      {showInstallModal && tenantId && (
        <InstallModal
          item={item}
          tenantId={tenantId}
          onClose={() => {
            setShowInstallModal(false);
          }}
        />
      )}
    </div>
  );
}

function ItemTypeIcon({ type }: { type: string }) {
  if (type === 'CONTENT_PACK') {
    return (
      <svg className="h-10 w-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    );
  }
  return (
    <svg className="h-10 w-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
      />
    </svg>
  );
}

function SafetyBadge({ cert }: { cert: string }) {
  if (cert === 'AIVO_CERTIFIED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Aivo Certified
      </span>
    );
  }
  if (cert === 'VENDOR_ATTESTED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Vendor Attested
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      {getSafetyCertLabel(cert)}
    </span>
  );
}

function SafetyItem({
  label,
  value,
  invertColor = false,
}: {
  label: string;
  value: boolean;
  invertColor?: boolean;
}) {
  const isGood = invertColor ? !value : value;
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      {isGood ? (
        <span className="flex items-center gap-1 text-green-600">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Yes
        </span>
      ) : (
        <span className="flex items-center gap-1 text-red-600">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          No
        </span>
      )}
    </li>
  );
}

function ItemDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-surface-muted" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-64 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-surface-muted" />
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    </div>
  );
}
