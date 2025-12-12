/**
 * Marketplace Installations Page - District Admin
 *
 * Manage all marketplace installations for the district.
 */

import { Suspense } from 'react';

import { InstallationsFilters } from './filters';
import { InstallationsList } from './list';

export const metadata = {
  title: 'Installations | Marketplace | Aivo District Admin',
  description: 'Manage marketplace installations for your district',
};

export default function InstallationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Marketplace Installations</h1>
          <p className="mt-1 text-sm text-muted">
            Manage content packs and tools installed for your district
          </p>
        </div>
      </div>

      <InstallationsFilters />

      <Suspense fallback={<InstallationsSkeleton />}>
        <InstallationsList />
      </Suspense>
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
