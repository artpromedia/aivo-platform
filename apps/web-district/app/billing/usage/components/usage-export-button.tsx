'use client';

import { useCallback, useState } from 'react';

import { getUsageExportUrl } from '../../../../lib/billing-api';

interface UsageExportButtonProps {
  tenantId: string;
  from?: string;
  to?: string;
}

/**
 * Button that triggers a CSV download of usage data via the billing-svc export endpoint.
 * Hits the real backend at GET /api/v1/billing/metering/:tenantId/export.
 */
export function UsageExportButton({ tenantId, from, to }: UsageExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      const url = getUsageExportUrl(tenantId, from, to);
      // Trigger browser download by opening in a new tab / using anchor
      const link = document.createElement('a');
      link.href = url;
      link.download = `usage-export-${tenantId}.csv`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      // Short delay so the spinner stays visible briefly
      setTimeout(() => setLoading(false), 800);
    }
  }, [tenantId, from, to]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text shadow-soft transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            className="opacity-25"
          />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            className="opacity-75"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
      )}
      Export CSV
    </button>
  );
}
