'use client';

import Link from 'next/link';

/**
 * Header for the Usage Metering Dashboard page with breadcrumb navigation.
 */
export function UsageDashboardHeader() {
  return (
    <div className="space-y-2">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/billing" className="hover:text-text transition-colors">
              Billing
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-text" aria-current="page">
            Usage Metering
          </li>
        </ol>
      </nav>

      {/* Title + description */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Usage Metering</h1>
          <p className="mt-1 text-sm text-muted">
            Monitor resource consumption across your district — seats, AI interactions,
            API calls, storage, assessments, and reports.
          </p>
        </div>
      </div>
    </div>
  );
}
