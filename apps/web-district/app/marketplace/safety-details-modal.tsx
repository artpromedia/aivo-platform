'use client';

/**
 * Safety Details Modal
 *
 * Displays comprehensive safety information for a marketplace item.
 * Provides transparency to districts about data access, policy tags,
 * and safety review status.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  SafetyRatingBadge,
  DataAccessIndicator,
  PolicyTagBadge,
  safetyRatingConfig,
  dataAccessConfig,
  type SafetyRating,
  type DataAccessProfile,
} from './safety-badge';

interface SafetyDetailsData {
  versionId: string;
  itemTitle: string;
  vendorName: string;
  safetyRating: SafetyRating;
  dataAccessProfile: DataAccessProfile;
  safetyNotes: string | null;
  policyTags: string[];
  dataCategoriesAccessed: string[];
  lastReviewedAt: string | null;
  lastReviewedBy: string | null;
  automatedChecksPassed: boolean | null;
  explanations: {
    safetyRating: string;
    dataAccessProfile: string;
    policyTags: Record<string, string>;
    dataCategories: Record<string, string>;
  };
}

interface SafetyDetailsModalProps {
  /** Version ID to fetch details for */
  versionId: string;
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
}

export function SafetyDetailsModal({ versionId, isOpen, onClose }: SafetyDetailsModalProps) {
  const [data, setData] = useState<SafetyDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!versionId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/marketplace/safety/details/${versionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch safety details');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load safety details');
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    if (isOpen && versionId) {
      void fetchDetails();
    }
  }, [isOpen, versionId, fetchDetails]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-2xl rounded-lg bg-surface shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="safety-details-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h2 id="safety-details-title" className="text-lg font-semibold">
                  Safety Details
                </h2>
                {data && (
                  <p className="text-sm text-muted">{data.itemTitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-surface-muted transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-4">
            {loading && <LoadingSkeleton />}
            {error && <ErrorState message={error} onRetry={fetchDetails} />}
            {data && <SafetyDetailsContent data={data} />}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">
                Questions about safety? Contact your district administrator.
              </p>
              <button
                onClick={onClose}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SafetyDetailsContent({ data }: { data: SafetyDetailsData }) {
  const safetyConfig = safetyRatingConfig[data.safetyRating];
  const dataConfig = dataAccessConfig[data.dataAccessProfile];

  return (
    <div className="space-y-6">
      {/* Safety Rating Section */}
      <section>
        <h3 className="text-sm font-medium text-muted mb-3">Safety Rating</h3>
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${safetyConfig.bgColor}`}>
              <span className={safetyConfig.color}>{safetyConfig.icon}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${safetyConfig.color}`}>
                  {safetyConfig.label}
                </span>
                {data.automatedChecksPassed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Auto-checks passed
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">{data.explanations.safetyRating}</p>
              {data.lastReviewedAt && (
                <p className="mt-2 text-xs text-muted">
                  Last reviewed: {new Date(data.lastReviewedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Data Access Section */}
      <section>
        <h3 className="text-sm font-medium text-muted mb-3">Data Access Level</h3>
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${dataConfig.bgColor}`}>
              <span className={dataConfig.color}>{dataConfig.icon}</span>
            </div>
            <div className="flex-1">
              <span className={`font-semibold ${dataConfig.color}`}>
                {dataConfig.label}
              </span>
              <p className="mt-1 text-sm text-muted">{data.explanations.dataAccessProfile}</p>
            </div>
          </div>

          {/* Data Categories */}
          {data.dataCategoriesAccessed.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                Data Categories Accessed
              </h4>
              <ul className="space-y-2">
                {data.dataCategoriesAccessed.map((category) => (
                  <li key={category} className="flex items-start gap-2 text-sm">
                    <svg className="h-4 w-4 text-muted mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                      <span className="font-medium">{formatCategoryName(category)}</span>
                      {data.explanations.dataCategories[category] && (
                        <p className="text-xs text-muted">{data.explanations.dataCategories[category]}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Policy Tags Section */}
      {data.policyTags.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted mb-3">Policy Tags</h3>
          <div className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {data.policyTags.map((tag) => (
                <PolicyTagBadge key={tag} tag={tag} size="md" />
              ))}
            </div>
            <ul className="space-y-2 mt-4 pt-4 border-t border-border">
              {data.policyTags.map((tag) => (
                <li key={tag} className="flex items-start gap-2 text-sm">
                  <svg className="h-4 w-4 text-muted mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-muted">
                    {data.explanations.policyTags[tag] || formatTagName(tag)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Safety Notes */}
      {data.safetyNotes && (
        <section>
          <h3 className="text-sm font-medium text-muted mb-3">Safety Notes</h3>
          <div className="rounded-lg border border-border bg-surface-muted/50 p-4">
            <p className="text-sm whitespace-pre-wrap">{data.safetyNotes}</p>
          </div>
        </section>
      )}

      {/* Vendor Info */}
      <section>
        <h3 className="text-sm font-medium text-muted mb-3">Vendor</h3>
        <div className="rounded-lg border border-border p-4">
          <p className="font-medium">{data.vendorName}</p>
        </div>
      </section>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 rounded-lg bg-surface-muted" />
      <div className="h-32 rounded-lg bg-surface-muted" />
      <div className="h-20 rounded-lg bg-surface-muted" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <svg className="mx-auto h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="mt-2 text-red-600">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 text-sm text-red-500 underline hover:no-underline"
      >
        Try again
      </button>
    </div>
  );
}

// Helper functions
function formatCategoryName(category: string): string {
  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTagName(tag: string): string {
  return tag
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Hook to manage safety details modal state
 */
export function useSafetyDetailsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [versionId, setVersionId] = useState<string | null>(null);

  const open = useCallback((id: string) => {
    setVersionId(id);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Delay clearing versionId to prevent flash during close animation
    setTimeout(() => setVersionId(null), 300);
  }, []);

  return {
    isOpen,
    versionId,
    open,
    close,
  };
}
